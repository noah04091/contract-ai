// 📝 Löschgründe (20.08.2026)
//
// Eine feste Liste statt reinem Freitext, damit die Antworten auswertbar bleiben.
// Die Auswahl orientiert sich an unseren eigenen Löschdaten: Von 93 gelöschten Konten
// waren die meisten Free-Konten am Tag der Registrierung nach ein bis zwei Analysen —
// deshalb stehen "nur einmal gebraucht" und "Analyse hat nicht geliefert" mit drin.
//
// EINE Quelle für drei Verbraucher: der Löschdialog holt die Liste über
// GET /api/auth/deletion-summary, die Route prüft den eingehenden Schlüssel dagegen,
// und das Admin-Dashboard beschriftet damit seine Auswertung.

const DELETION_REASONS = [
  { key: 'too_expensive',        label: 'Zu teuer' },
  { key: 'analysis_expectation', label: 'Die Analyse hat mir nicht gebracht, was ich erwartet habe' },
  { key: 'one_time_need',        label: 'Ich habe es nur einmal gebraucht' },
  { key: 'too_complicated',      label: 'Zu kompliziert zu bedienen' },
  { key: 'found_alternative',    label: 'Ich habe eine andere Lösung gefunden' },
  { key: 'privacy_concerns',     label: 'Bedenken beim Datenschutz' },
  { key: 'other',                label: 'Etwas anderes' },
];

const DELETION_REASON_KEYS = new Set(DELETION_REASONS.map(r => r.key));

// Kurzform für Tabellenspalten im Admin, wo der volle Satz zu breit wäre
const DELETION_REASON_SHORT = {
  too_expensive: 'Zu teuer',
  analysis_expectation: 'Analyse enttäuscht',
  one_time_need: 'Nur einmal gebraucht',
  too_complicated: 'Zu kompliziert',
  found_alternative: 'Alternative gefunden',
  privacy_concerns: 'Datenschutz',
  other: 'Sonstiges',
};

const REASON_TEXT_MAX_LENGTH = 500;

module.exports = {
  DELETION_REASONS,
  DELETION_REASON_KEYS,
  DELETION_REASON_SHORT,
  REASON_TEXT_MAX_LENGTH,
};
