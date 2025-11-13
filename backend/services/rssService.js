// 📁 backend/services/rssService.js
// RSS Feed Service - Aggregate Legal News from Multiple Sources

const Parser = require('rss-parser');
const parser = new Parser({
  timeout: 15000,
  customFields: {
    item: [
      ['description', 'summary'],
      ['content:encoded', 'fullContent'],
      ['dc:creator', 'author'],
      ['category', 'categories', { keepArray: true }]
    ]
  }
});

/**
 * Curated list of German legal RSS feeds
 * These are VERIFIED, working public RSS feeds as of 2025
 */
const LEGAL_RSS_FEEDS = {
  // Official German Federal Law Gazette (Bundesgesetzblatt)
  'bgbl-teil1': {
    url: 'https://www.recht.bund.de/rss/feeds/rss_bgbl-1.xml',
    name: 'Bundesgesetzblatt Teil I',
    category: 'bundesrecht',
    enabled: true
  },

  'bgbl-teil2': {
    url: 'https://www.recht.bund.de/rss/feeds/rss_bgbl-2.xml',
    name: 'Bundesgesetzblatt Teil II',
    category: 'bundesrecht',
    enabled: true
  },

  // German Parliament - Press Releases
  'bundestag-presse': {
    url: 'https://www.bundestag.de/static/appdata/includes/rss/pressemitteilungen.rss',
    name: 'Bundestag Pressemitteilungen',
    category: 'gesetzgebung',
    enabled: true
  },

  // German Parliament - Documents (Drucksachen)
  'bundestag-drucksachen': {
    url: 'https://www.bundestag.de/static/appdata/includes/rss/drucksachen.rss',
    name: 'Bundestag Drucksachen',
    category: 'gesetzgebung',
    enabled: true
  },

  // German Parliament - Legal Topics
  'bundestag-recht': {
    url: 'https://www.bundestag.de/static/appdata/includes/rss/recht.rss',
    name: 'Bundestag Rechtsthemen',
    category: 'gesetzgebung',
    enabled: true
  },

  // Legal Tribune Online - Main News Feed
  'lto-news': {
    url: 'https://www.lto.de/rss/nachrichten-rss/feed.xml',
    name: 'Legal Tribune Online',
    category: 'rechtsnews',
    enabled: true
  },

  // Legal Tribune Online - Background/Analysis
  'lto-hintergruende': {
    url: 'https://www.lto.de/rss/hintergruende-rss/feed.xml',
    name: 'LTO Hintergründe',
    category: 'rechtsnews',
    enabled: true
  },

  // Legal Tribune Online - Legal Profession
  'lto-anwaltsberuf': {
    url: 'https://www.lto.de/rss/anwaltsberuf-rss/feed.xml',
    name: 'LTO Anwaltsberuf',
    category: 'rechtsnews',
    enabled: true
  },

  // German Federal Ministries - Official Sources

  // German Federal Ministries (TODO: Find correct RSS URLs)
  // Currently disabled - URLs need to be verified

  'bmj-news': {
    url: 'https://www.bmj.de/rss', // TODO: Verify correct URL
    name: 'Bundesjustizministerium',
    category: 'bundesrecht',
    enabled: false
  },

  'bmf-news': {
    url: 'https://www.bundesfinanzministerium.de/rss', // TODO: Verify correct URL
    name: 'Bundesfinanzministerium',
    category: 'steuerrecht',
    enabled: false
  },

  'bmwk-news': {
    url: 'https://www.bmwk.de/rss', // TODO: Verify correct URL
    name: 'Bundeswirtschaftsministerium',
    category: 'wirtschaftsrecht',
    enabled: false
  },

  'bmas-news': {
    url: 'https://www.bmas.de/rss', // TODO: Verify correct URL
    name: 'Bundesarbeitsministerium',
    category: 'arbeitsrecht',
    enabled: false
  },

  'bmg-news': {
    url: 'https://www.bundesgesundheitsministerium.de/rss', // TODO: Verify correct URL
    name: 'Bundesgesundheitsministerium',
    category: 'gesundheitsrecht',
    enabled: false
  },

  'bmel-verbraucher': {
    url: 'https://www.bmel.de/rss', // TODO: Verify correct URL
    name: 'BMEL Verbraucherschutz',
    category: 'verbraucherrecht',
    enabled: false
  }
};

/**
 * Fetch and parse a single RSS feed
 * @param {string} feedId - Feed identifier
 * @param {Object} feedConfig - Feed configuration
 * @returns {Promise<Array>} Parsed feed items
 */
async function fetchFeed(feedId, feedConfig) {
  if (!feedConfig.enabled) {
    console.log(`⏭️  [RSS] Skipping disabled feed: ${feedConfig.name}`);
    return [];
  }

  try {
    console.log(`🔍 [RSS] Fetching ${feedConfig.name}...`);

    const feed = await parser.parseURL(feedConfig.url);

    const items = feed.items.map(item => ({
      source: 'rss',
      feedId,
      feedName: feedConfig.name,
      category: feedConfig.category,
      title: item.title || 'Untitled',
      link: item.link || null,
      date: item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : new Date()),
      summary: item.summary || item.contentSnippet || item.content || '',
      fullContent: item.fullContent || null,
      author: item.author || item.creator || null,
      categories: item.categories || [],
      guid: item.guid || item.link || `${feedId}-${Date.now()}`
    }));

    console.log(`✅ [RSS] ${feedConfig.name}: ${items.length} items`);
    return items;

  } catch (error) {
    console.error(`❌ [RSS] Failed to fetch ${feedConfig.name}:`, error.message);
    return [];
  }
}

/**
 * Fetch all enabled RSS feeds
 * @param {Object} options - Fetch options
 * @param {Array<string>} options.feeds - Specific feeds to fetch (optional, fetches all if not provided)
 * @param {number} options.maxAge - Maximum age in days (filter items older than this)
 * @returns {Promise<Array>} All feed items
 */
async function fetchAllFeeds({ feeds = null, maxAge = 30 } = {}) {
  try {
    console.log('📡 [RSS] Fetching legal RSS feeds...');

    const feedsToFetch = feeds
      ? feeds.filter(id => LEGAL_RSS_FEEDS[id]).map(id => [id, LEGAL_RSS_FEEDS[id]])
      : Object.entries(LEGAL_RSS_FEEDS);

    const results = await Promise.allSettled(
      feedsToFetch.map(([id, config]) => fetchFeed(id, config))
    );

    const allItems = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // Filter by age if specified
    if (maxAge) {
      const cutoffDate = new Date(Date.now() - maxAge * 86400000);
      const filteredItems = allItems.filter(item => item.date >= cutoffDate);
      console.log(`📊 [RSS] Total items: ${allItems.length}, After age filter (${maxAge}d): ${filteredItems.length}`);
      return filteredItems;
    }

    console.log(`📊 [RSS] Total items fetched: ${allItems.length}`);
    return allItems;

  } catch (error) {
    console.error('❌ [RSS] Failed to fetch feeds:', error);
    return [];
  }
}

/**
 * Search RSS items by keyword
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Matching items
 */
async function searchFeeds(query, options = {}) {
  const items = await fetchAllFeeds(options);

  const lowerQuery = query.toLowerCase();

  return items.filter(item =>
    item.title.toLowerCase().includes(lowerQuery) ||
    item.summary.toLowerCase().includes(lowerQuery) ||
    (item.fullContent && item.fullContent.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get feed statistics
 * @returns {Object} Feed statistics
 */
function getFeedStats() {
  const total = Object.keys(LEGAL_RSS_FEEDS).length;
  const enabled = Object.values(LEGAL_RSS_FEEDS).filter(f => f.enabled).length;
  const disabled = total - enabled;

  return {
    total,
    enabled,
    disabled,
    feeds: Object.entries(LEGAL_RSS_FEEDS).map(([id, config]) => ({
      id,
      name: config.name,
      category: config.category,
      enabled: config.enabled
    }))
  };
}

/**
 * Enable/disable a specific feed
 * @param {string} feedId - Feed identifier
 * @param {boolean} enabled - Enable or disable
 */
function toggleFeed(feedId, enabled) {
  if (LEGAL_RSS_FEEDS[feedId]) {
    LEGAL_RSS_FEEDS[feedId].enabled = enabled;
    console.log(`${enabled ? '✅' : '❌'} [RSS] Feed ${feedId} ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }
  return false;
}

/**
 * Normalize RSS items to match legal pulse format
 * @param {Array} items - RSS items
 * @returns {Array} Normalized items for legal pulse
 */
function normalizeForLegalPulse(items) {
  return items.map(item => ({
    source: 'rss',
    feedId: item.feedId,
    lawId: item.guid || `rss-${item.feedId}-${Date.now()}`,
    sectionId: item.guid,
    title: item.title,
    summary: item.summary.substring(0, 500),
    description: item.summary,
    url: item.link,
    area: item.category || 'allgemein',
    updatedAt: item.date,
    createdAt: new Date(),
    metadata: {
      feedName: item.feedName,
      author: item.author,
      categories: item.categories,
      fullContent: item.fullContent
    }
  }));
}

module.exports = {
  fetchFeed,
  fetchAllFeeds,
  searchFeeds,
  getFeedStats,
  toggleFeed,
  normalizeForLegalPulse,
  LEGAL_RSS_FEEDS
};
