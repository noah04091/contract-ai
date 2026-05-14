/**
 * Legal Lens — Gemeinsame Konstanten für Risk-Bewertung
 *
 * Wird von beiden Bewertungs-Systemen genutzt damit sie konsistent bewerten:
 * - assessRiskBatch (Listen-Bewertung, alle Klauseln auf einmal)
 * - analyzeClause (Detail-Bewertung pro Klausel)
 *
 * @version 1.0.0
 */

/**
 * Verbindliche Risk-Score-Skala (identisch zur UI in AnalysisPanel.tsx getRiskScoreInfo).
 * Wird in beide GPT-Prompts eingewoben damit GPT konsistent bewertet.
 */
const RISK_SCORE_SCALE_PROMPT_BLOCK = `
RISK-SCORE-SKALA (verbindlich, MUSS exakt eingehalten werden):
| Score    | riskLevel | Bedeutung                                          |
|----------|-----------|----------------------------------------------------|
| 0–19     | low       | Minimal — Unbedenklich, marktüblich oder vorteilhaft |
| 20–39    | low       | Niedrig — Akzeptabel, leicht unter Standard         |
| 40–59    | medium    | Mittel — Verhandeln empfohlen, Abweichung vom Standard |
| 60–79    | high      | Hoch — Aufmerksamkeit nötig, eindeutiger Nachteil   |
| 80–100   | high      | Kritisch — Dealbreaker, rechtlich heikel oder existenziell |

UNIVERSELLE HIGH-RISK INDIKATOREN
(juristisch fundiert, vertragstyp-unabhängig — gelten für JEDEN Vertrag:
Mietvertrag, Arbeitsvertrag, AGB, NDA, Factoring, Versicherung, etc.):

A) HAFTUNG & GARANTIE
   - A1: Verschuldensunabhängige Haftung oder Garantie für eine Partei → mindestens Score 70
   - A2: Pauschalierter Schadensersatz ohne Bezug zum tatsächlichen Schaden → mindestens Score 75

B) UNGLEICHGEWICHT
   - B1: Asymmetrie — eine Seite trägt deutlich überproportionale Pflichten oder Risiken → mindestens Score 65
   - B2: Verzicht auf gesetzliche Rechte (besonders der schwächeren Partei) → mindestens Score 70
   - B3: Beweislast-Umkehr zu Lasten des Schwächeren → mindestens Score 70

C) UNBEGRENZTE PFLICHTEN
   - C1: Pflichten oder Sanktionen ohne Höchstgrenze → mindestens Score 70
   - C2: Knebel-Wirkung — Bindung ohne realistische Ausstiegsmöglichkeit → mindestens Score 75

D) RECHTLICHE UNWIRKSAMKEIT
   - D1: Klausel ist nach §§ 305-310 BGB / DSGVO / TzBfG / BUrlG / VVG / etc. wahrscheinlich unwirksam → mindestens Score 75
   - D2: Klausel widerspricht zwingendem deutschen Recht oder höchstrichterlicher Rechtsprechung → mindestens Score 80

WICHTIG (Trust Layer — Begründungspflicht):
Wenn riskScore >= 60 (also "high"), MUSST du in "riskReason" konkret nennen, welcher Indikator (z.B. "A1: Garantie ohne Verschuldensprüfung" oder "B1: einseitige Pflichten zu Lasten des Auftraggebers") erfüllt ist. Ohne Indikator-Bezug nur Score < 60 vergeben.

WICHTIG (Skala-Konsistenz):
riskLevel MUSS exakt zum riskScore passen. Bei Score 65 → riskLevel "high". Bei Score 30 → "low". Bei Score 50 → "medium".
`;

/**
 * Perspektiven für Risk-Bewertung — identisch zu clauseAnalyzer.js this.perspectives
 * (Duplizierung bewusst zur Risiko-Minimierung — clauseAnalyzer bleibt unverändert)
 */
const PERSPECTIVES = {
  contractor: {
    name: 'Auftraggeber',
    description: 'Aus Sicht des Kunden/Auftraggebers',
    systemPrompt: `Du analysierst Vertragsklauseln AUS SICHT DES AUFTRAGGEBERS (der Kunde, der den Vertrag unterschreibt).

Deine Aufgabe:
- Erkläre die Klausel in einfacher Sprache
- Identifiziere RISIKEN und NACHTEILE für den Auftraggeber
- Zeige versteckte Kosten, eingeschränkte Rechte, unfaire Bedingungen auf
- Bewerte, ob die Klausel marktüblich ist
- Gib konkrete Handlungsempfehlungen

Sei KRITISCH und SCHÜTZEND gegenüber dem Auftraggeber.`
  },

  client: {
    name: 'Auftragnehmer',
    description: 'Aus Sicht des Dienstleisters/Anbieters',
    systemPrompt: `Du analysierst Vertragsklauseln AUS SICHT DES AUFTRAGNEHMERS (der Dienstleister/Anbieter).

Deine Aufgabe:
- Erkläre, warum diese Klausel für den Auftragnehmer vorteilhaft ist
- Zeige, welche Risiken der Auftragnehmer absichert
- Erkläre die geschäftliche Logik hinter der Klausel
- Bewerte, ob die Klausel angemessen ist

Sei VERSTÄNDNISVOLL für die Position des Auftragnehmers.`
  },

  neutral: {
    name: 'Marktüblich',
    description: 'Neutrale, branchenübliche Bewertung',
    systemPrompt: `Du analysierst Vertragsklauseln NEUTRAL und MARKTÜBLICH.

Deine Aufgabe:
- Vergleiche mit Branchenstandards und üblichen Praktiken
- Bewerte objektiv, ob die Klausel fair für BEIDE Seiten ist
- Zeige Abweichungen vom Marktstandard auf
- Gib eine ausgewogene Einschätzung

Sei OBJEKTIV und SACHLICH wie ein unabhängiger Gutachter.`
  },

  worstCase: {
    name: 'Worst-Case',
    description: 'Schlimmstmögliche Auslegung',
    systemPrompt: `Du analysierst Vertragsklauseln im WORST-CASE SZENARIO.

Deine Aufgabe:
- Zeige das SCHLIMMSTE, was passieren kann
- Wie könnte die Klausel GEGEN den Unterzeichner ausgelegt werden?
- Welche extremen Konsequenzen sind möglich?
- Welche Lücken könnten ausgenutzt werden?

Sei PESSIMISTISCH und zeige MAXIMALE RISIKEN auf - aber bleibe realistisch.`
  }
};

/**
 * Document-Type-spezifische Kontext-Prompts (deutsche Rechts-Referenzen)
 * Identisch zu clauseAnalyzer.js this.documentTypeContexts
 */
const DOCUMENT_TYPE_CONTEXTS = {
  datenschutz: {
    name: 'Datenschutzhinweise / Datenschutzerklärung',
    focusAreas: `
DOKUMENTTYP-FOKUS — DATENSCHUTZHINWEISE:
- DSGVO-Konformität: Art. 13/14 Informationspflichten vollständig erfüllt?
- Rechtsgrundlagen: Werden Art. 6 Abs. 1 lit. a-f DSGVO korrekt benannt?
- Betroffenenrechte: Auskunft (Art. 15), Löschung (Art. 17), Widerspruch (Art. 21) vollständig aufgelistet?
- Drittlandtransfer: Werden Daten in die USA/Drittländer übermittelt? Rechtsgrundlage (Art. 46/49)?
- Speicherdauer: Konkrete Fristen oder nur „so lange wie nötig"? Letzteres ist unzureichend.
- Auftragsverarbeiter: Sind Sub-Prozessoren benannt? Art. 28 DSGVO eingehalten?
- Cookies & Tracking: Einwilligung nach TTDSG § 25? Opt-In statt Opt-Out?
- Profiling & automatisierte Entscheidungen: Art. 22 DSGVO beachtet?
- Datenschutzbeauftragter: Kontaktdaten vorhanden (Art. 37-39)?
- Marktüblich: Konkrete Speicherfristen, granulare Cookie-Einwilligung, vollständige Rechtsgrundlagen-Auflistung`
  },
  agb: {
    name: 'Allgemeine Geschäftsbedingungen',
    focusAreas: `
DOKUMENTTYP-FOKUS — AGB:
- AGB-Kontrolle nach §§ 305-310 BGB: Enthält das Dokument überraschende Klauseln (§ 305c)?
- Haftungsausschlüsse: Nach § 309 Nr. 7 BGB nicht für Körperschäden/grobe Fahrlässigkeit ausschließbar
- Gewährleistung: Verjährungsfrist min. 1 Jahr (§ 309 Nr. 8 BGB), bei neu hergestellten Sachen 2 Jahre
- Kündigungsfristen: Mehr als 2 Jahre Erstlaufzeit? § 309 Nr. 9 BGB Grenze beachten
- Preisanpassungsklauseln: Transparent und nachvollziehbar? § 307 Abs. 1 S. 2 BGB
- Widerrufsrecht: Bei Verbraucherverträgen 14 Tage (§ 355 BGB), korrekte Widerrufsbelehrung?
- Gerichtsstandklausel: Bei B2C unzulässig (§ 38 ZPO)
- Schriftformklausel: Doppelte Schriftformklausel unwirksam in AGB
- Pauschalierter Schadensersatz: Muss dem typischen Schaden entsprechen (§ 309 Nr. 5 BGB)
- Marktüblich: Transparente Preise, 14-Tage Widerruf, keine Haftungsausschlüsse für Vorsatz/grobe Fahrlässigkeit`
  },
  nda: {
    name: 'Geheimhaltungsvereinbarung / NDA',
    focusAreas: `
DOKUMENTTYP-FOKUS — NDA/GEHEIMHALTUNGSVEREINBARUNG:
- Definition vertraulicher Informationen: Klar abgegrenzt oder zu weit gefasst?
- Ausnahmen: Öffentlich bekannte, eigenständig entwickelte, rechtlich offenzulegende Infos ausgenommen?
- Dauer: Wie lange gilt die Geheimhaltung? Unbefristet ist bei Geschäftsgeheimnissen üblich, bei allgemeinen Infos zu lang
- Rückgabepflicht: Müssen Unterlagen nach Vertragsende zurückgegeben/vernichtet werden?
- Vertragsstrafe: Höhe angemessen? Pro Verstoß oder pauschal?
- Beweislast: Wer muss Verstoß beweisen?
- Wettbewerbsverbot: Ist ein verstecktes Wettbewerbsverbot eingebaut?
- Beidseitig/Einseitig: Nur eine Partei verpflichtet oder beide?
- Mitarbeiter-Bindung: Müssen eigene Mitarbeiter separat verpflichtet werden?
- Marktüblich: 2-5 Jahre Laufzeit, beidseitig, klare Ausnahmen, angemessene Vertragsstrafe (10.000-50.000€)`
  },
  arbeitsvertrag: {
    name: 'Arbeitsvertrag',
    focusAreas: `
DOKUMENTTYP-FOKUS — ARBEITSVERTRAG:
- Vergütung: Gehalt, Boni, Sonderzahlungen klar geregelt? Freiwilligkeitsvorbehalt?
- Arbeitszeit: Überstundenregelung? „Mit dem Gehalt abgegolten" nur bis 20% über Normalarbeitszeit zulässig
- Befristung: Sachgrund oder sachgrundlos? Max. 2 Jahre ohne Sachgrund (§ 14 TzBfG)
- Kündigungsfristen: Gesetzlich gestaffelt (§ 622 BGB), günstigere Regelung für AN?
- Wettbewerbsverbot: Nachvertragliches Wettbewerbsverbot nur mit Karenzentschädigung (§ 74 HGB, min. 50%)
- Probezeit: Max. 6 Monate, 2 Wochen Kündigungsfrist (§ 622 Abs. 3 BGB)
- Urlaub: Min. 24 Werktage/20 Arbeitstage (BUrlG), Verfall nur mit Hinweispflicht
- Nebentätigkeit: Genehmigungspflicht zulässig, Pauschalverbot unwirksam
- Geheimhaltung: Angemessen oder zu weit (z.B. nach Vertragsende)?
- Marktüblich: 30 Tage Urlaub, 6 Monate Probezeit, 3 Monate Kündigungsfrist, Überstundenausgleich`
  },
  mietvertrag: {
    name: 'Mietvertrag',
    focusAreas: `
DOKUMENTTYP-FOKUS — MIETVERTRAG:
- Miethöhe & Nebenkosten: Kaltmiete + Nebenkostenvorauszahlung aufgeschlüsselt?
- Mieterhöhung: Staffelmiete, Indexmiete oder Vergleichsmiete? Kappungsgrenze beachtet?
- Kaution: Max. 3 Monatskaltmieten (§ 551 BGB), Ratenzahlung möglich?
- Schönheitsreparaturen: Starre Fristen unwirksam (BGH-Rechtsprechung)
- Kleinreparaturklausel: Einzelobergrenze (75-100€) + Jahreshöchstgrenze (6-8% der Jahresmiete)
- Untervermietung: Erlaubnispflicht, aber Anspruch bei berechtigtem Interesse (§ 553 BGB)
- Kündigungsfristen: Vermieter gestaffelt (3-9 Monate), Mieter immer 3 Monate
- Tierhaltung: Pauschales Verbot von Kleintieren unwirksam
- Betriebskostenabrechnung: Frist 12 Monate nach Abrechnungszeitraum
- Marktüblich: 3 Monatskaltmieten Kaution, NK-Vorauszahlung 2-3€/m², Staffel max. 10%/Jahr`
  },
  dienstleistung: {
    name: 'Dienstleistungsvertrag',
    focusAreas: `
DOKUMENTTYP-FOKUS — DIENSTLEISTUNGSVERTRAG:
- Leistungsbeschreibung: Konkret genug definiert oder zu vage?
- Vergütung: Festpreis, Stundenbasis oder Erfolgsbasis? Abrechnungsmodalitäten klar?
- Abnahme: Wie werden Leistungen abgenommen? Fristen für Mängelrüge?
- Haftung: Haftungsbeschränkung angemessen? Höhe der Haftungsobergrenze?
- Kündigung: Ordentliche + außerordentliche Kündigung geregelt?
- Subunternehmer: Dürfen Subunternehmer eingesetzt werden?
- Scheinselbständigkeit: Bei Freelancer-Verträgen — Eingliederung in Betrieb, Weisungsgebundenheit?
- Urheberrecht: Wem gehören die Arbeitsergebnisse?
- Marktüblich: Monatliche Abrechnung, 30 Tage Zahlungsziel, Haftung auf Auftragswert begrenzt`
  },
  general_document: {
    name: 'Allgemeines Rechtsdokument',
    focusAreas: `
ALLGEMEINE DOKUMENTPRÜFUNG:
- Rechtskonformität: Entspricht das Dokument dem geltenden deutschen Recht?
- Vollständigkeit: Sind alle wesentlichen Regelungen enthalten?
- Klarheit: Sind Formulierungen eindeutig und verständlich?
- Fairness: Sind Rechte und Pflichten ausgewogen verteilt?
- DSGVO: Datenschutzrelevante Aspekte berücksichtigt?
- Haftung: Haftungsregelungen angemessen?
- Fristen: Alle relevanten Fristen klar definiert?`
  }
};

/**
 * Branchen-Kontexte (kompakte Version für riskAssessor — nur die wichtigsten Marktstandards)
 * Wird zusammen mit DocumentType-Kontext eingewoben
 */
const INDUSTRY_CONTEXTS_COMPACT = {
  it_software: 'IT/Software: 99.5-99.9% Uptime, 24-48h Support-Reaktion, jährliche Preisanpassung max. 5%',
  construction: 'Bauwesen: 5% Sicherheitseinbehalt, Zahlungsziel 30 Tage, 4 Jahre Gewährleistung (VOB/B)',
  real_estate: 'Immobilien: 3 Monatskaltmieten Kaution, NK-Pauschale 2-3 €/m², Staffelmiete max. 10%/Jahr',
  consulting: 'Beratung: 150-300€/h Senior-Berater, Tagessätze 1.200-2.500€, NDA 2-5 Jahre',
  manufacturing: 'Produktion: 2-4 Wochen Lieferzeit, 0,5% Verzugspauschale/Tag max. 5%, 2 Jahre Gewährleistung',
  retail: 'Handel: 2% Skonto bei 14 Tagen, 30 Tage Zahlungsziel, 5-15% Jahresbonus ab Mindestumsatz',
  healthcare: 'Gesundheitswesen: 10 Jahre Aufbewahrungsfrist, Audit-Rechte quartalsweise, 24/7 Support bei kritischen Geräten',
  finance: 'Finanzwesen: Effektivzins 3-8%, max. 1% Vorfälligkeitsentschädigung, 3 Monate Kündigungsfrist',
  general: 'Allgemein: AGB-Konform, 14-Tage Widerruf, faire Haftungsbeschränkungen'
};

/**
 * Baut den kombinierten Kontext-Block für GPT-Prompt
 * @param {string} industry - Branche (Key aus INDUSTRY_CONTEXTS_COMPACT)
 * @param {string} documentType - DocType (Key aus DOCUMENT_TYPE_CONTEXTS)
 * @returns {string} Kombinierter Kontext für System-Prompt
 */
function buildContextBlock(industry = 'general', documentType = 'general_document') {
  const docContext = DOCUMENT_TYPE_CONTEXTS[documentType]?.focusAreas || DOCUMENT_TYPE_CONTEXTS.general_document.focusAreas;
  const industryHint = INDUSTRY_CONTEXTS_COMPACT[industry] || INDUSTRY_CONTEXTS_COMPACT.general;
  return `${docContext}\n\nBRANCHEN-KONTEXT (${industry}): ${industryHint}`;
}

/**
 * LEGAL SOURCES INSTRUCTION BLOCK (Phase 2 — Rechtsquellen-Sektion).
 *
 * Wird NUR in den Prompt eingefügt, wenn RAG-Kandidaten gefunden wurden.
 * Strikte Regel: GPT darf AUSSCHLIESSLICH aus der Kandidaten-Liste wählen,
 * niemals erfinden. Bei Unsicherheit: leere Liste zurückgeben.
 *
 * Post-Validation im Code filtert zusätzlich gegen Kandidaten-IDs.
 */
const LEGAL_SOURCES_INSTRUCTION_BLOCK = `
RECHTSQUELLEN-AUSWAHL (verbindlich, MUSS exakt eingehalten werden):

Du erhältst unten eine Liste von Kandidaten-Gesetzen und -Urteilen aus unserer
verifizierten Datenbank. Diese sind die EINZIGEN Quellen, die du zitieren darfst.

REGELN:
1. ERFINDE NIEMALS §§, Urteile, Aktenzeichen oder URLs. ABSOLUT VERBOTEN.
2. Wähle aus den Kandidaten NUR die WIRKLICH relevanten aus (max. 3 Gesetze, max. 2 Urteile).
3. Wenn KEIN Kandidat wirklich passend ist: gib "legalSources": null zurück. Lieber leer als irrelevant.
4. Für jede gewählte Quelle gib im JSON die EXAKTEN Werte aus der Kandidaten-Liste zurück
   (lawId, sectionId bei Gesetzen / caseNumber bei Urteilen).
5. Optional: ein kurzes "relevance_note" (1 Satz) pro Quelle, warum sie für diese Klausel relevant ist.
6. URLs musst du NICHT zurückgeben — die werden serverseitig aus der DB ergänzt.

JSON-FORMAT-ERWEITERUNG:
"legalSources": {
  "statutes": [
    { "code": "BGB", "section": "§ 305c", "relevance_note": "Schützt vor überraschenden AGB-Klauseln." }
  ],
  "caselaw": [
    { "caseNumber": "VIII ZR 230/22", "relevance_note": "BGH: pauschale Abtretungs-Pflichten unwirksam." }
  ]
}
ODER bei keinem passenden Kandidaten: "legalSources": null
`;

module.exports = {
  RISK_SCORE_SCALE_PROMPT_BLOCK,
  LEGAL_SOURCES_INSTRUCTION_BLOCK,
  PERSPECTIVES,
  DOCUMENT_TYPE_CONTEXTS,
  INDUSTRY_CONTEXTS_COMPACT,
  buildContextBlock
};
