// 📁 backend/scripts/lib/gesetzeImInternet.js
// Phase 2.5 — XML-Parser für gesetze-im-internet.de
//
// Lädt ZIP-Datei eines Gesetzes, entpackt XML, parst alle §§ heraus.
// Verwendet von backend/scripts/syncLegalLensSources.js.
//
// XML-Format (Beispiel BGB):
// <dokumente>
//   <norm>
//     <metadaten>
//       <jurabk>BGB</jurabk>
//       <enbez>§ 305c</enbez>
//       <titel format="XML">Überraschende und mehrdeutige Klauseln</titel>
//     </metadaten>
//     <textdaten>
//       <text>
//         <Content>
//           <P>(1) Bestimmungen in Allgemeinen Geschäftsbedingungen, die...</P>
//           <P>(2) Zweifel bei der Auslegung Allgemeiner Geschäftsbedingungen gehen...</P>
//         </Content>
//       </text>
//     </textdaten>
//   </norm>
//   ...
// </dokumente>

const https = require("https");
const AdmZip = require("adm-zip");
const xml2js = require("xml2js");

/**
 * Lädt eine ZIP-Datei von einer URL als Buffer.
 * Robust gegen Redirects (301/302).
 *
 * @param {string} url
 * @param {number} [maxRedirects=5]
 * @returns {Promise<Buffer>}
 */
function downloadZip(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const fetch = (currentUrl, remaining) => {
      if (remaining <= 0) return reject(new Error("Zu viele Redirects"));

      https.get(currentUrl, {
        headers: {
          "User-Agent": "ContractAI-LegalLens-Sync/1.0 (kontakt@contract-ai.de)"
        }
      }, (response) => {
        // Handle Redirects
        if ([301, 302, 307, 308].includes(response.statusCode)) {
          const location = response.headers.location;
          if (!location) return reject(new Error(`Redirect ohne Location: ${response.statusCode}`));
          // Relative URL? Mit Base zusammenführen
          const nextUrl = location.startsWith("http") ? location : new URL(location, currentUrl).toString();
          response.resume(); // discard body
          return fetch(nextUrl, remaining - 1);
        }

        if (response.statusCode !== 200) {
          return reject(new Error(`HTTP ${response.statusCode}: ${currentUrl}`));
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
        response.on("error", reject);
      }).on("error", reject);
    };

    fetch(url, maxRedirects);
  });
}

/**
 * Entpackt eine ZIP-Buffer, sucht die erste XML-Datei und gibt ihren Inhalt als String zurück.
 *
 * @param {Buffer} zipBuffer
 * @returns {string} XML-Content (UTF-8)
 */
function extractXmlFromZip(zipBuffer) {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  const xmlEntry = entries.find(e => e.entryName.toLowerCase().endsWith(".xml"));
  if (!xmlEntry) {
    throw new Error(`Keine .xml-Datei in ZIP gefunden. Inhalt: ${entries.map(e => e.entryName).join(", ")}`);
  }

  return xmlEntry.getData().toString("utf8");
}

/**
 * Sammelt alle Text-Knoten aus einem (möglicherweise verschachtelten) XML-Objekt.
 * gesetze-im-internet.de Textstrukturen sind verschachtelt mit <P>, <BR>, <DL>, etc.
 *
 * @param {*} node
 * @returns {string}
 */
function collectText(node) {
  if (node === null || node === undefined) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);

  if (Array.isArray(node)) {
    return node.map(collectText).filter(Boolean).join(" ");
  }

  if (typeof node === "object") {
    // xml2js liefert Text als "_" property bei Mixed-Content
    let result = "";

    if (node._) result += node._;

    // Andere Properties als Kinder behandeln (nicht $ = Attribute)
    for (const key of Object.keys(node)) {
      if (key === "_" || key === "$") continue;
      result += " " + collectText(node[key]);
    }

    return result;
  }

  return "";
}

/**
 * Normalisiert Text: mehrfache Whitespaces zu einzelnen, Trim.
 */
function normalizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generiert die offizielle URL eines §s bei gesetze-im-internet.de.
 *
 * Format: https://www.gesetze-im-internet.de/{baseSlug}/__{section}.html
 * z.B. § 305c BGB → https://www.gesetze-im-internet.de/bgb/__305c.html
 *      Art. 6 DSGVO → spezial-Handling, nicht über diese Funktion
 *
 * @param {string} baseUrl - z.B. "https://www.gesetze-im-internet.de/bgb/"
 * @param {string} enbez - z.B. "§ 305c", "§ 622a", "Art. 6"
 * @returns {string} URL
 */
function buildSourceUrl(baseUrl, enbez) {
  // Extrahiere die §-Nummer aus dem Bezeichner
  // "§ 305c" → "305c", "§ 622a" → "622a", "§ 1 BGB" → "1"
  const match = enbez.match(/§\s*(\S+)/);
  if (!match) return baseUrl;

  const sectionNumber = match[1].replace(/\.$/, ""); // ".305c" → "305c"
  return `${baseUrl}__${sectionNumber}.html`;
}

/**
 * Parst eine XML-String und extrahiert alle §§ als strukturierte Objekte.
 *
 * @param {string} xmlContent
 * @param {Object} sourceConfig - Aus legal-lens-sources-config.json (code, baseSourceUrl, primaryArea, secondaryAreas)
 * @returns {Promise<Array<{code, section, title, text, area, secondaryAreas, sourceUrl, sourceOrigin}>>}
 */
async function parseLawXml(xmlContent, sourceConfig) {
  const parser = new xml2js.Parser({
    explicitArray: false,
    mergeAttrs: false,
    trim: true,
    explicitCharkey: true,
    charkey: "_"
  });

  const result = await parser.parseStringPromise(xmlContent);

  // Root-Element: meist <dokumente>
  const root = result.dokumente || result;
  let norms = root.norm || [];
  if (!Array.isArray(norms)) norms = [norms];

  const sections = [];

  for (const norm of norms) {
    try {
      const metadaten = norm.metadaten;
      const textdaten = norm.textdaten;
      if (!metadaten) continue;

      // Bezeichner (z.B. "§ 305c") — required für eine echte §-Norm
      const enbez = normalizeText(collectText(metadaten.enbez));
      if (!enbez) continue;

      // Nur echte §§, keine "[X. Buch]" oder Abschnitt-Überschriften
      // Echte §§ beginnen mit "§" oder "Art."
      if (!enbez.match(/^(§|Art\.?)\s/i)) continue;

      // Titel der Norm (kann fehlen bei aufgehobenen §§)
      const titel = normalizeText(collectText(metadaten.titel)) || enbez;

      // Volltext aus <textdaten><text><Content>
      let fullText = "";
      if (textdaten) {
        fullText = normalizeText(collectText(textdaten));
      }

      // Skip: aufgehobene §§ (kein Text oder nur "(weggefallen)")
      if (!fullText || /^\(weggefallen\)$/i.test(fullText)) continue;
      // Skip: zu kurze Inhalte (vermutlich Überschriften ohne Inhalt)
      if (fullText.length < 30) continue;

      sections.push({
        code: sourceConfig.code,
        section: enbez,
        title: titel,
        text: fullText.substring(0, 8000), // OpenAI-Embedding-Limit
        area: sourceConfig.primaryArea,
        secondaryAreas: sourceConfig.secondaryAreas || [],
        sourceUrl: buildSourceUrl(sourceConfig.baseSourceUrl, enbez),
        sourceOrigin: "gesetze-im-internet.de",
        isActive: true
      });

    } catch (err) {
      // Skip einzelne fehlerhafte Norms, nicht den ganzen Sync abbrechen
      console.warn(`[Parser] Norm-Parse-Fehler: ${err.message}`);
    }
  }

  return sections;
}

/**
 * Hauptfunktion: Lädt ein Gesetz von gesetze-im-internet.de und gibt geparste §§ zurück.
 *
 * @param {Object} sourceConfig - Eintrag aus legal-lens-sources-config.json
 * @returns {Promise<Array>} Sections
 */
async function loadAndParseLaw(sourceConfig) {
  if (!sourceConfig.xmlUrl) {
    throw new Error(`Kein XML-URL für ${sourceConfig.code} — manueller Source nötig`);
  }

  console.log(`  [Download] ${sourceConfig.xmlUrl} ...`);
  const zipBuffer = await downloadZip(sourceConfig.xmlUrl);
  console.log(`  [Download] ${(zipBuffer.length / 1024).toFixed(0)} KB`);

  console.log(`  [Unzip] entpacke XML ...`);
  const xmlContent = extractXmlFromZip(zipBuffer);
  console.log(`  [Unzip] XML ${(xmlContent.length / 1024).toFixed(0)} KB`);

  console.log(`  [Parse] extrahiere §§ ...`);
  const sections = await parseLawXml(xmlContent, sourceConfig);
  console.log(`  [Parse] ${sections.length} §§ extrahiert`);

  return sections;
}

module.exports = {
  downloadZip,
  extractXmlFromZip,
  parseLawXml,
  loadAndParseLaw,
  buildSourceUrl,
  // Für Tests:
  _internal: { collectText, normalizeText }
};
