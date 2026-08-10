// 📁 backend/utils/mailText.js
// Gemeinsame Text-Helfer für die Pulse-Mails (Betreff, Vorschauzeile, Anrede).
//
// WARUM ES DIESE DATEI GIBT (Befund 10.08.2026):
// Der Ein-/Mehrzahl-Fehler war systemisch: JEDE Pulse-Mail löste die Mehrzahl im
// sichtbaren Fließtext korrekt, ließ aber BETREFF und VORSCHAUZEILE roh stehen —
// die werden an anderer Stelle gebaut und wurden überall vergessen. Real verschickt:
// „1 Verträge seit über 14 Tagen nicht geprüft" (Staleness, 27.07. + 10.08.) und
// „1 Verträge überwacht" in der Vorschauzeile des Wach-Berichts (10.08., an Kunden).
// pulseV2Radar.js hatte den passenden Helfer bereits lokal — nur nicht exportiert,
// weshalb ihn keine andere Datei nutzen konnte. Genau das löst dieses Modul.
//
// Regel für neue Mail-Texte: Zahl + Substantiv NIE direkt interpolieren,
// sondern immer über plural() — auch (und gerade) in Betreff und Vorschauzeile.

/**
 * Deutsche Ein-/Mehrzahl. Signatur bewusst identisch zum bewährten lokalen
 * Helfer aus pulseV2Radar.js, damit der Umstieg dort ein reines Umbenennen ist.
 *
 * @param {number} n           Die Anzahl, die im Text steht.
 * @param {string} singular    Form für genau 1 (z. B. "Vertrag").
 * @param {string} pluralForm  Form für alles andere (z. B. "Verträge").
 * @returns {string}
 *
 * Hinweis: 0 nimmt bewusst die Mehrzahl ("0 Verträge") — das ist im Deutschen korrekt.
 */
function plural(n, singular, pluralForm) {
  return n === 1 ? singular : pluralForm;
}

/**
 * Anrede-Name aus einem users-Doc.
 *
 * Liefert den Namen mit großem Anfangsbuchstaben — oder null, wenn kein Name
 * hinterlegt ist. Bei null gehört in die Mail die neutrale Anrede "Hallo,"
 * (Muster aus pulseV2WeeklyReport.js), NICHT ein Füllwort wie "Nutzer".
 *
 * Grund für die Großschreibung (Befund 10.08.2026): 20 Nutzer haben einen klein
 * geschriebenen Vornamen in der DB; eine echte Kundin bekam „Hallo gülhan,".
 * Keine Pulse-Mail hat den Namen bisher großgeschrieben.
 *
 * Die Reihenfolge firstName → name entspricht dem bisherigen Verhalten und wird
 * bewusst NICHT verändert (kein Zerlegen von "Noah Liebold" in Vornamen o. Ä.).
 *
 * @param {{firstName?: string, name?: string}|null|undefined} user
 * @returns {string|null}
 */
function greetingName(user) {
  if (!user) return null;
  const raw = user.firstName || user.name || null;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return capitalizeFirst(trimmed);
}

/**
 * Ersten Buchstaben groß, Rest unangetastet.
 * "gülhan" → "Gülhan", "Noah" → "Noah", "van der Berg" → "Van der Berg".
 * Rest bewusst unverändert, damit Schreibweisen wie "McDonald" nicht zerstört werden.
 *
 * @param {string} s
 * @returns {string}
 */
function capitalizeFirst(s) {
  if (typeof s !== 'string' || !s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

module.exports = { plural, greetingName, capitalizeFirst };
