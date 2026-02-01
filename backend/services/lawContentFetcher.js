// backend/services/lawContentFetcher.js
// Fetches full text content from law change URLs (BGH, BAG, Bundesgesetzblatt, etc.)
// Graceful degradation: if scraping fails, RSS summaries remain intact

const axios = require("axios");
const cheerio = require("cheerio");

let instance = null;

class LawContentFetcher {
  constructor() {
    this.rateLimiter = { lastRequest: 0, minInterval: 500 }; // 2 req/sec max
    this.maxContentLength = 15000; // chars per law
    this.timeout = 10000; // 10s per request
    this.userAgent = "ContractAI-LegalMonitor/1.0 (Legal Compliance Check)";

    // Stats for logging
    this.stats = { fetched: 0, failed: 0, cached: 0 };
  }

  static getInstance() {
    if (!instance) instance = new LawContentFetcher();
    return instance;
  }

  /**
   * Rate-limited HTTP fetch
   */
  async rateLimitedFetch(url) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.rateLimiter.lastRequest;
    if (timeSinceLastRequest < this.rateLimiter.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimiter.minInterval - timeSinceLastRequest));
    }
    this.rateLimiter.lastRequest = Date.now();

    const response = await axios.get(url, {
      timeout: this.timeout,
      headers: {
        "User-Agent": this.userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.5"
      },
      maxRedirects: 3,
      validateStatus: (status) => status < 400
    });

    return response.data;
  }

  /**
   * Main entry: fetch content for a single law and store in DB
   */
  async fetchAndStore(lawItem, db) {
    const url = lawItem.url || lawItem.link;
    if (!url) return null;

    // Check if already fetched (cached in DB)
    const lawsCollection = db.collection("laws");
    const existing = await lawsCollection.findOne({
      $or: [
        { lawId: lawItem.lawId },
        { _id: lawItem._id }
      ]
    });

    if (existing && existing.fullContent && existing.fullContent.length > 100) {
      this.stats.cached++;
      return existing.fullContent;
    }

    try {
      const content = await this.fetchContent(url);

      if (content && content.length > 50) {
        // Store in DB
        const filter = lawItem._id
          ? { _id: lawItem._id }
          : { lawId: lawItem.lawId };

        await lawsCollection.updateOne(
          filter,
          { $set: { fullContent: content, fullContentFetchedAt: new Date() } }
        );

        this.stats.fetched++;
        return content;
      }

      return null;
    } catch (error) {
      this.stats.failed++;
      console.warn(`   [CONTENT-FETCH] Failed for ${url}: ${error.message}`);
      return null;
    }
  }

  /**
   * Batch fetch for all recent laws missing fullContent
   */
  async batchFetchForRecentLaws(db, daysBack = 7) {
    const lawsCollection = db.collection("laws");
    const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const lawsMissingContent = await lawsCollection.find({
      updatedAt: { $gte: cutoff },
      url: { $exists: true, $ne: null },
      $or: [
        { fullContent: { $exists: false } },
        { fullContent: null },
        { fullContent: "" }
      ]
    }).limit(50).toArray();

    console.log(`   [CONTENT-FETCH] ${lawsMissingContent.length} laws need content fetching`);

    let fetched = 0;
    for (const law of lawsMissingContent) {
      const content = await this.fetchAndStore(law, db);
      if (content) fetched++;
    }

    console.log(`   [CONTENT-FETCH] Fetched ${fetched}/${lawsMissingContent.length} law texts`);
    return { total: lawsMissingContent.length, fetched };
  }

  /**
   * Fetch and parse content from a URL with site-specific parsers
   */
  async fetchContent(url) {
    try {
      const html = await this.rateLimitedFetch(url);
      if (!html || typeof html !== "string") return null;

      const hostname = new URL(url).hostname;

      // Site-specific parsers
      if (hostname.includes("rechtsprechung-im-internet.de")) {
        return this.parseRechtsprechungImInternet(html);
      }
      if (hostname.includes("recht.bund.de")) {
        return this.parseRechtBundDe(html);
      }
      if (hostname.includes("lto.de")) {
        return this.parseLto(html);
      }
      if (hostname.includes("bundestag.de")) {
        return this.parseBundestag(html);
      }
      if (hostname.includes("beck.de") || hostname.includes("rsw.beck.de")) {
        return this.parseBeckAktuell(html);
      }
      if (hostname.includes("bmas.de") || hostname.includes("bmj.de") || hostname.includes("bmjv.de") || hostname.includes("bmi.bund.de")) {
        return this.parseMinisterium(html);
      }

      // Generic fallback
      return this.parseGeneric(html);
    } catch (error) {
      throw new Error(`Content fetch failed: ${error.message}`);
    }
  }

  /**
   * Parser: rechtsprechung-im-internet.de (BGH, BAG, BVerfG, BFH, BSG, BVerwG)
   * Full court decision texts
   */
  parseRechtsprechungImInternet(html) {
    const $ = cheerio.load(html);

    // Main content containers for court decisions
    let text = "";

    // Try various selectors used by the portal
    const selectors = [
      ".docLayoutText",
      ".rdContentWrapper",
      "#TextContainer",
      ".content-text",
      "article",
      ".juris-text",
      "main .content"
    ];

    for (const selector of selectors) {
      const el = $(selector);
      if (el.length && el.text().trim().length > 200) {
        text = el.text().trim();
        break;
      }
    }

    if (!text) {
      // Fallback: get all paragraphs from the main area
      const paragraphs = [];
      $("p").each((_, el) => {
        const pText = $(el).text().trim();
        if (pText.length > 30) paragraphs.push(pText);
      });
      text = paragraphs.join("\n\n");
    }

    return this.cleanAndTruncate(text);
  }

  /**
   * Parser: recht.bund.de (Bundesgesetzblatt)
   */
  parseRechtBundDe(html) {
    const $ = cheerio.load(html);

    let text = "";

    const selectors = [
      ".article-content",
      ".content-area",
      "#content",
      "main",
      ".publikation-content"
    ];

    for (const selector of selectors) {
      const el = $(selector);
      if (el.length && el.text().trim().length > 100) {
        text = el.text().trim();
        break;
      }
    }

    return this.cleanAndTruncate(text);
  }

  /**
   * Parser: lto.de (Legal Tribune Online articles)
   */
  parseLto(html) {
    const $ = cheerio.load(html);

    // LTO articles
    let text = $("article .article-text").text().trim();
    if (!text) text = $("article .entry-content").text().trim();
    if (!text) text = $(".article-body").text().trim();
    if (!text) text = $("article").text().trim();

    return this.cleanAndTruncate(text);
  }

  /**
   * Parser: bundestag.de (Drucksachen, Pressemitteilungen)
   */
  parseBundestag(html) {
    const $ = cheerio.load(html);

    let text = $(".bt-artikel__text").text().trim();
    if (!text) text = $(".bt-standard-content").text().trim();
    if (!text) text = $("article").text().trim();
    if (!text) text = $("main .content").text().trim();

    return this.cleanAndTruncate(text);
  }

  /**
   * Parser: beck.de / rsw.beck.de (beck-aktuell Rechtsnachrichten)
   */
  parseBeckAktuell(html) {
    const $ = cheerio.load(html);

    let text = $(".beck-article-body").text().trim();
    if (!text) text = $(".article-content").text().trim();
    if (!text) text = $("article .content").text().trim();

    return this.cleanAndTruncate(text);
  }

  /**
   * Parser: Bundesministerien (bmj, bmas, bmi)
   */
  parseMinisterium(html) {
    const $ = cheerio.load(html);

    let text = $(".c-article__body").text().trim();
    if (!text) text = $(".richtext").text().trim();
    if (!text) text = $(".article-content").text().trim();
    if (!text) text = $("main article").text().trim();
    if (!text) text = $("main .content").text().trim();

    return this.cleanAndTruncate(text);
  }

  /**
   * Generic fallback parser - extracts largest text block
   */
  parseGeneric(html) {
    const $ = cheerio.load(html);

    // Remove noise
    $("script, style, nav, header, footer, aside, .sidebar, .menu, .navigation, .cookie-banner, .ad, .advertisement").remove();

    // Try common content selectors
    const contentSelectors = ["article", "main", ".content", "#content", ".post-content", ".entry-content"];

    for (const selector of contentSelectors) {
      const el = $(selector);
      if (el.length && el.text().trim().length > 200) {
        return this.cleanAndTruncate(el.text().trim());
      }
    }

    // Last resort: get all paragraphs
    const paragraphs = [];
    $("p").each((_, el) => {
      const pText = $(el).text().trim();
      if (pText.length > 40) paragraphs.push(pText);
    });

    if (paragraphs.length > 0) {
      return this.cleanAndTruncate(paragraphs.join("\n\n"));
    }

    return null;
  }

  /**
   * Clean text and truncate to max length
   */
  cleanAndTruncate(text) {
    if (!text) return null;

    // Clean up whitespace
    let cleaned = text
      .replace(/\s+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Remove very short results
    if (cleaned.length < 50) return null;

    // Truncate
    if (cleaned.length > this.maxContentLength) {
      cleaned = cleaned.substring(0, this.maxContentLength) + "...";
    }

    return cleaned;
  }

  /**
   * Get fetch statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = { fetched: 0, failed: 0, cached: 0 };
  }
}

module.exports = LawContentFetcher;
module.exports.getInstance = () => LawContentFetcher.getInstance();
