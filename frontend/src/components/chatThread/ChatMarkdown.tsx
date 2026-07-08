// 📁 frontend/src/components/chatThread/ChatMarkdown.tsx
// Wiederverwendbares Markdown-Rendering für Chat-Antworten.
// KOPIE aus pages/Chat.tsx (MarkdownContent + convertCourtDecisionLinks +
// convertLawReferencesToLinks) — Chat.tsx bleibt unverändert, damit die
// bestehende Chat-Seite null Risiko trägt. Abhängigkeiten (marked, dompurify)
// werden wie im Original dynamisch importiert (Bundle-Splitting).

import { useEffect, useState } from "react";

// ✅ HELPER: Convert court decision references to clickable links
function convertCourtDecisionLinks(text: string): string {
  // Pattern to match court decisions like:
  // - BGH, Az. VIII ZR 277/16
  // - BAG 2 AZR 424/19
  // - BGH VIII ZR 277/16
  // - Az. XII ZR 123/20
  // - OLG München, 7 U 1234/20

  const courts = 'BGH|BAG|BVerfG|BFH|BSG|BVerwG|OLG|LAG|LG|AG|ArbG';

  // Match: Court + optional comma + optional "Az." + case number
  // Case number format: Roman numeral or number + letters + number/year
  const caseNumberPattern = `(?:[IVX]+\\s+)?[A-Za-z]+\\s+\\d+\\/\\d{2,4}`;

  const courtDecisionRegex = new RegExp(
    `(${courts})(?:\\s+[A-Za-zäöüÄÖÜ]+)?[,\\s]+(?:Az\\.?\\s*)?(${caseNumberPattern})`,
    'gi'
  );

  // Also match standalone "Az. XII ZR 123/20" format
  const azOnlyRegex = new RegExp(
    `Az\\.?\\s*(${caseNumberPattern})`,
    'gi'
  );

  // Replace court decisions with links to OpenJur
  let result = text.replace(courtDecisionRegex, (match, _court, caseNum) => {
    const searchQuery = encodeURIComponent(caseNum.trim());
    const url = `https://openjur.de/suche/?q=${searchQuery}`;
    return `[${match}](${url})`;
  });

  // Replace standalone Az. references (that weren't already matched)
  result = result.replace(azOnlyRegex, (match, caseNum) => {
    // Skip if already a link
    if (result.includes(`[${match}]`)) return match;
    const searchQuery = encodeURIComponent(caseNum.trim());
    const url = `https://openjur.de/suche/?q=${searchQuery}`;
    return `[${match}](${url})`;
  });

  return result;
}

// ✅ HELPER: Convert law references to clickable links
function convertLawReferencesToLinks(text: string): string {
  // Map of German law abbreviations to their gesetze-im-internet.de paths
  const lawPaths: Record<string, string> = {
    'BGB': 'bgb',
    'HGB': 'hgb',
    'StGB': 'stgb',
    'StPO': 'stpo',
    'ZPO': 'zpo',
    'ArbGG': 'arbgg',
    'KSchG': 'kschg',
    'TzBfG': 'tzbfg',
    'MuSchG': 'muschg',
    'BetrVG': 'betrvg',
    'AGG': 'agg',
    'BDSG': 'bdsg',
    'UWG': 'uwg',
    'GmbHG': 'gmbhg',
    'AktG': 'aktg',
    'InsO': 'inso',
    'BauGB': 'baugb',
    'WEG': 'weg',
    'VVG': 'vvg',
    'VOB': 'vob',
    'UStG': 'ustg',
    'EStG': 'estg',
    'AO': 'ao',
    'GewO': 'gewo',
    'BUrlG': 'burlg',
    'ArbZG': 'arbzg',
    'NachwG': 'nachwg',
    'EFZG': 'efzg',
    'MiLoG': 'milog',
    'TVG': 'tvg',
  };

  // Build regex pattern from law abbreviations
  const lawPattern = Object.keys(lawPaths).join('|');

  // Regex to match § references: § 123 BGB, § 123a BGB, § 123 Abs. 1 BGB, etc.
  const paragraphRegex = new RegExp(
    `§\\s*(\\d+[a-z]?)\\s*(?:Abs\\.?\\s*\\d+\\s*)?(?:S\\.?\\s*\\d+\\s*)?(?:Nr\\.?\\s*\\d+\\s*)?(${lawPattern})`,
    'gi'
  );

  // Regex to match Art. references for GG: Art. 12 GG, Art. 12 Abs. 1 GG
  const articleRegex = /Art\.?\s*(\d+[a-z]?)\s*(?:Abs\.?\s*\d+\s*)?(GG)/gi;

  // Replace § references with markdown links
  let result = text.replace(paragraphRegex, (match, section, law) => {
    const lawPath = lawPaths[law.toUpperCase()];
    if (!lawPath) return match;

    const url = `https://www.gesetze-im-internet.de/${lawPath}/__${section.toLowerCase()}.html`;
    return `[${match}](${url})`;
  });

  // Replace Art. references for Grundgesetz
  result = result.replace(articleRegex, (match, article) => {
    const url = `https://www.gesetze-im-internet.de/gg/art_${article.toLowerCase()}.html`;
    return `[${match}](${url})`;
  });

  return result;
}

// ✅ MARKDOWN RENDERING with DOMPurify + marked + Law Links
export function ChatMarkdown({ content }: { content: string }) {
  const [sanitizedHtml, setSanitizedHtml] = useState("");

  useEffect(() => {
    async function renderMarkdown() {
      try {
        // Dynamic imports for better bundle splitting
        const { marked } = await import("marked");
        const DOMPurify = (await import("dompurify")).default;

        // Configure marked for better formatting
        marked.setOptions({
          breaks: true, // Convert \n to <br>
          gfm: true, // GitHub Flavored Markdown
        });

        // ✅ Convert legal references to clickable links BEFORE markdown parsing
        // 1. First convert court decisions (BGH VIII ZR 277/16 → link to OpenJur)
        const contentWithCourtLinks = convertCourtDecisionLinks(content);
        // 2. Then convert law references (§ 622 BGB → link to gesetze-im-internet.de)
        const contentWithAllLinks = convertLawReferencesToLinks(contentWithCourtLinks);

        const rawHtml = await marked.parse(contentWithAllLinks);
        let clean = DOMPurify.sanitize(rawHtml, {
          ALLOWED_TAGS: [
            "p",
            "br",
            "strong",
            "em",
            "u",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "ul",
            "ol",
            "li",
            "blockquote",
            "code",
            "pre",
            "a",
          ],
          ALLOWED_ATTR: ["href", "target", "rel"],
        });

        // ✅ Add target="_blank" to external links (gesetze-im-internet.de)
        clean = clean.replace(
          /<a href="(https:\/\/www\.gesetze-im-internet\.de[^"]+)">/g,
          '<a href="$1" target="_blank" rel="noopener noreferrer" class="law-link">'
        );

        setSanitizedHtml(clean);
      } catch (error) {
        console.error("Markdown rendering error:", error);
        setSanitizedHtml(content); // Fallback to plain text
      }
    }

    renderMarkdown();
  }, [content]);

  return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}
