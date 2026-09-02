// 📁 backend/utils/preisErkennung.js
//
// Preiserkennung für Better Contracts, ausgelagert aus routes/betterContracts.js
// (01.09.2026), damit sie testbar ist und damit zwei Fehler an der Wurzel
// verschwinden, die zuvor falsche Zahlen erzeugt haben:
//
//  1. DEUTSCHE TAUSENDERPUNKTE wurden als Dezimaltrenner gelesen.
//     parseFloat("4.452") ergibt 4.452 — aus 4.452 Euro wurde "4.45€/Monat".
//     Belegt am 17.08.2026 mit dem Text "Weiterbildung ab 4.452 €".
//
//  2. EINMALPREISE gab es als Kategorie nicht. Jedes Muster verlangte ein
//     Zeitwort ("pro Monat", "pro Jahr"), deshalb fiel eine Kursgebühr oder
//     Anschaffung komplett heraus — und alles, was durchkam, wurde pauschal
//     als "/Monat" ausgezeichnet, auch wenn es keiner war.
//
// Zusätzlich erkannt: "EUR"/"Euro" neben "€", und Beträge mit Tausenderpunkt
// UND Dezimalkomma ("4.452,00").
//
// Hinweis für spätere Änderungen: Die Muster werden aus Regex-LITERALEN
// zusammengesetzt, nicht aus Zeichenketten. In einer Zeichenkette müsste jeder
// Backslash verdoppelt werden, und genau daran ist die erste Fassung dieser
// Datei gescheitert ('\b' ist in einem String ein Backspace, keine Wortgrenze).

/**
 * Wandelt eine deutsche Zahlangabe in eine JavaScript-Zahl.
 *
 *   "4.452,00" -> 4452     "4.452" -> 4452     "1.234.567" -> 1234567
 *   "29,99"    -> 29.99    "4.45"  -> 4.45     "4452"      -> 4452
 *
 * Regel: Ein Komma ist immer der Dezimaltrenner, Punkte sind dann Tausender.
 * Ohne Komma gilt ein Punkt als Tausendertrenner, wenn jede Gruppe dahinter
 * genau drei Ziffern hat (deutsche Schreibweise), sonst als Dezimalpunkt.
 *
 * @param {string} roh
 * @returns {number|null} null, wenn sich keine Zahl ergibt
 */
function deutscheZahl(roh) {
  if (typeof roh !== 'string') return null;
  const t = roh.trim();
  if (!t) return null;

  let normalisiert;
  if (t.includes(',')) {
    normalisiert = t.replace(/\./g, '').replace(',', '.');
  } else if (t.includes('.')) {
    normalisiert = /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t;
  } else {
    normalisiert = t;
  }

  const n = parseFloat(normalisiert);
  return Number.isFinite(n) ? n : null;
}

/**
 * Formatiert einen Betrag deutsch, ohne Nachkommastellen bei glatten Beträgen.
 *   4452 -> "4.452 €"      29.99 -> "29,99 €"
 */
function formatiereEuro(n) {
  const glatt = Math.round(n * 100) % 100 === 0;
  return n.toLocaleString('de-DE', {
    minimumFractionDigits: glatt ? 0 : 2,
    maximumFractionDigits: 2
  }) + ' €';
}

// Bausteine als Regex-Literale (siehe Hinweis oben).
const WAEHRUNG = /(?:€|EUR\b|Euro\b)/;
const BETRAG = /(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?|\d+(?:\.\d{1,2})?)/;

/** Setzt Regex-Literale und Zeichenketten zu einem Muster zusammen. */
function bau(...teile) {
  return new RegExp(teile.map(t => (t instanceof RegExp ? t.source : t)).join(''), 'gi');
}

const MUSTER = {
  monatlich: [
    bau(BETRAG, /\s*/, WAEHRUNG, /\s*(?:\/\s*)?(?:pro\s+|je\s+|im\s+)?monat(?:lich)?/),
    bau(/monatlich(?:er)?\s+(?:ab\s+)?/, BETRAG, /\s*/, WAEHRUNG),
    bau(/mtl\.?\s*/, BETRAG, /\s*/, WAEHRUNG),
    // "12,90 EUR mtl." — Zeitangabe steht hinter dem Betrag
    bau(BETRAG, /\s*/, WAEHRUNG, /\s*(?:\/\s*)?mtl\b/),
    bau(/grundpreis:?\s*/, BETRAG, /\s*/, WAEHRUNG),
  ],
  jaehrlich: [
    bau(BETRAG, /\s*/, WAEHRUNG, /\s*(?:\/\s*)?(?:pro\s+|je\s+|im\s+)?jahr(?:lich)?/),
    bau(/(?:jä|ja|jae)hrlich(?:er)?\s+(?:ab\s+)?/, BETRAG, /\s*/, WAEHRUNG),
    bau(BETRAG, /\s*/, WAEHRUNG, /\s*p\.?\s*a\.?(?![a-z])/),
  ],
  einmalig: [
    bau(BETRAG, /\s*/, WAEHRUNG, /\s*(?:einmalig|einmalige?r?\s+(?:betrag|zahlung|gebühr))/),
    // Umlaut- und ue-Schreibweise, beides kommt im Netz vor
    bau(/(?:gesamtpreis|gesamtbetrag|kurs(?:gebühr|gebuehr|preis)|seminar(?:gebühr|gebuehr)|teilnahme(?:gebühr|gebuehr)|lehrgangs(?:gebühr|gebuehr)|anschaffungspreis|kaufpreis|einmalzahlung|rechnungsbetrag)\s*:?\s*(?:von\s+|ab\s+|beträgt\s+)?/, BETRAG, /\s*/, WAEHRUNG),
    bau(/(?:kostet|kosten|beträgt)\s+(?:nur\s+|ab\s+|insgesamt\s+)?/, BETRAG, /\s*/, WAEHRUNG, /(?!\s*(?:\/|pro\b|je\b|im\b|monat|jahr|mtl))/),
  ],
  // Betrag mit klarem Preis-Signalwort, aber OHNE erkennbare Periodizität.
  // Wird bewusst NICHT geraten: früher landete "ab 4.452 €" als "4,45 €/Monat"
  // in der Liste. Jetzt erscheint er ohne Einheit, was der Wahrheit entspricht.
  unbestimmt: [
    bau(/\bab\s+/, BETRAG, /\s*/, WAEHRUNG, /(?!\s*(?:\/|pro\b|je\b|im\b|monat|jahr|mtl|p\.\s*a))/),
    bau(/\bpreis\s*:?\s*(?:von\s+)?/, BETRAG, /\s*/, WAEHRUNG, /(?!\s*(?:\/|pro\b|je\b|im\b|monat|jahr|mtl|p\.\s*a))/),
    bau(/\bfür\s+(?:nur\s+)?/, BETRAG, /\s*/, WAEHRUNG, /(?!\s*(?:\/|pro\b|je\b|im\b|monat|jahr|mtl|p\.\s*a))/),
  ],
  ersparnis: [
    bau(/(?:sparen|spare|ersparnis|einsparen|einsparung|spart)\s+(?:sie\s+)?(?:bis\s+zu\s+)?/, BETRAG, /\s*/, WAEHRUNG),
    bau(/bis\s+zu\s+/, BETRAG, /\s*/, WAEHRUNG, /\s+(?:spare|ersparnis|günstiger|weniger)/),
    bau(/(?:bonus|prämie|wechselbonus|neukundenbonus|sofortbonus|cashback)\s*:?\s*(?:bis\s+zu\s+)?/, BETRAG, /\s*/, WAEHRUNG),
  ],
};

// Plausibilitätsgrenzen je Kategorie. Bewusst weiter als früher (dort galt
// pauschal "unter 500" für ALLES), aber pro Kategorie eng genug, um Unsinn
// auszuschließen. B2B-Monatsbeiträge liegen regelmäßig über 500 €.
const GRENZEN = {
  monatlich: { min: 0.5, max: 20000 },
  jaehrlich: { min: 5, max: 200000 },
  einmalig: { min: 5, max: 1000000 },
  unbestimmt: { min: 1, max: 1000000 },
  ersparnis: { min: 1, max: 100000 },
};

/**
 * Findet alle Beträge, die im Text als ERSPARNIS auftreten. Sie dürfen nirgends
 * als Preis erscheinen: "Sparen Sie bis zu 850 € im Jahr" ist kein Jahrespreis.
 * Genau diese Verwechslung sollte schon die alte Fassung vermeiden, konnte es
 * aber nicht, weil beide Kategorien unabhängig voneinander gesammelt wurden.
 */
function ersparnisBetraege(text) {
  const menge = new Set();
  for (const m of MUSTER.ersparnis) {
    for (const fund of text.matchAll(m)) {
      const w = deutscheZahl(fund[1]);
      if (w !== null) menge.add(w);
    }
  }
  return menge;
}

/**
 * Zieht Preise aus einem Fließtext.
 *
 * @param {string} text
 * @returns {{monatlich:number[], jaehrlich:number[], einmalig:number[], ersparnisse:number[], anzeige:string[]}}
 *   `anzeige` enthält fertig beschriftete Zeichenketten für die Oberfläche,
 *   die Zahlenlisten sind für Vergleich und Sortierung gedacht.
 */
function extrahierePreise(text) {
  const leer = { monatlich: [], jaehrlich: [], einmalig: [], unbestimmt: [], ersparnisse: [], anzeige: [] };
  if (!text || typeof text !== 'string') return leer;

  const treffer = { monatlich: [], jaehrlich: [], einmalig: [], unbestimmt: [], ersparnis: [] };
  const istErsparnis = ersparnisBetraege(text);

  for (const [kategorie, muster] of Object.entries(MUSTER)) {
    for (const m of muster) {
      for (const fund of text.matchAll(m)) {
        const wert = deutscheZahl(fund[1]);
        if (wert === null) continue;
        const g = GRENZEN[kategorie];
        if (wert < g.min || wert > g.max) continue;
        // Ersparnisse sind keine Preise
        if (kategorie !== 'ersparnis' && istErsparnis.has(wert)) continue;
        treffer[kategorie].push(wert);
      }
    }
  }

  // Ein Betrag mit erkannter Periodizität ist weder Einmalpreis noch unbestimmt.
  const laufend = new Set([...treffer.monatlich, ...treffer.jaehrlich]);
  treffer.einmalig = treffer.einmalig.filter(w => !laufend.has(w));
  const eingeordnet = new Set([...laufend, ...treffer.einmalig]);
  treffer.unbestimmt = treffer.unbestimmt.filter(w => !eingeordnet.has(w));

  const eindeutig = (arr) => [...new Set(arr)].sort((a, b) => a - b);
  const monatlich = eindeutig(treffer.monatlich);
  const jaehrlich = eindeutig(treffer.jaehrlich);
  const einmalig = eindeutig(treffer.einmalig);
  const unbestimmt = eindeutig(treffer.unbestimmt);
  const ersparnisse = eindeutig(treffer.ersparnis);

  const anzeige = [
    ...monatlich.map(n => `${formatiereEuro(n)}/Monat`),
    ...jaehrlich.map(n => `${formatiereEuro(n)}/Jahr`),
    ...einmalig.map(n => `${formatiereEuro(n)} einmalig`),
    ...unbestimmt.map(n => `ab ${formatiereEuro(n)}`),
  ].slice(0, 5);

  return { monatlich, jaehrlich, einmalig, unbestimmt, ersparnisse, anzeige };
}

module.exports = { deutscheZahl, formatiereEuro, extrahierePreise };
