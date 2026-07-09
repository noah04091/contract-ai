// 🛡️ Welle 3 (Vertrauens-Schicht, 08.07.2026) — Evidence-Verifikation für die
// Hauptanalyse. Pure Funktion, offline testbar.
//
// GRUNDSATZ: verifizieren + kennzeichnen, NIE löschen/abwerten. Ein criticalIssue
// mit wörtlich belegbarem `evidence`-Zitat bekommt evidenceVerified:true (→ UI
// zeigt „✓ Im Dokument belegt"); nicht belegbar → evidenceVerified:false (UI
// zeigt NICHTS — kein Grau-Meer); kein evidence geliefert → beide Felder weg.
// Der Fund selbst bleibt IMMER unverändert erhalten.
//
// Validator = DateHunt-Disziplin (normalize + evidenceMatchesText): strikt-
// wörtlicher Substring mit OCR-/Unicode-/Umlaut-Toleranz. Bewusst NICHT der
// Legal-Pulse-60%-Fuzzy — der ließe Paraphrasen als „belegt" durch und würde
// den Vertrauens-Zweck untergraben.

const { normalize, evidenceMatchesText, EVIDENCE_MIN_LEN, EVIDENCE_MAX_LEN } = require('../services/dateHuntService');

// Felder, in die GPT evidence-Keys erfahrungsgemäß „streut" (Schema-Leakage) —
// dort ungeprüft gespeicherte Roh-Zitate wären unsauber → deterministisch strippen.
const STRAY_EVIDENCE_FIELDS = ['recommendations', 'positiveAspects', 'suggestions'];

/**
 * Mutiert result IN-PLACE (muss VOR sanitizeAnalysisResult laufen — der cloned!).
 * @param {Object} result   Analyse-Ergebnis (criticalIssues[] wird annotiert)
 * @param {string} fullText Original-Volltext (NIE optimizedText — der ist gekürzt)
 * @returns {{checked:number, verified:number, failed:number, missing:number}} Statistik
 */
function verifyAnalysisEvidence(result, fullText) {
  const stats = { checked: 0, verified: 0, failed: 0, missing: 0 };
  if (!result || typeof result !== 'object') return stats;

  // Streunende evidence-Keys außerhalb criticalIssues entfernen (unverifiziert
  // gespeicherte Zitate vermeiden; Frontend nutzt sie dort ohnehin nicht).
  for (const field of STRAY_EVIDENCE_FIELDS) {
    const arr = result[field];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (item && typeof item === 'object' && 'evidence' in item) delete item.evidence;
      }
    }
  }

  const issues = result.criticalIssues;
  if (!Array.isArray(issues) || !fullText || typeof fullText !== 'string') return stats;

  const normText = normalize(fullText);
  for (const issue of issues) {
    if (!issue || typeof issue !== 'object') continue;
    const ev = typeof issue.evidence === 'string' ? issue.evidence.trim() : '';
    if (!ev) {
      // kein Beleg geliefert → Felder komplett weglassen (= „ohne Beleg", kein Badge)
      delete issue.evidence;
      delete issue.evidenceVerified;
      stats.missing++;
      continue;
    }
    stats.checked++;
    if (ev.length < EVIDENCE_MIN_LEN || ev.length > EVIDENCE_MAX_LEN) {
      issue.evidenceVerified = false;
      stats.failed++;
      continue;
    }
    const ok = evidenceMatchesText(normalize(ev), normText);
    issue.evidenceVerified = ok === true;
    if (issue.evidenceVerified) stats.verified++; else stats.failed++;
  }
  return stats;
}

module.exports = { verifyAnalysisEvidence, STRAY_EVIDENCE_FIELDS };
