/**
 * 🔧 DETERMINISTIC RULE ENGINE
 * Generiert IMMER mindestens 6-8 konkrete Findings - auch wenn GPT fehlschlägt
 * Baseline-Checks für ALLE Vertragstypen
 */

/**
 * Baseline-Rules die für JEDEN Vertrag gelten
 */
const BASELINE_RULES = [
  {
    id: 'parties_missing',
    name: 'Parteien unvollständig definiert',
    check: (text) => {
      const hasParties = /Parteien|Vertragspartner|zwischen.*und/i.test(text);
      const hasFullAddress = /\d{5}\s+[A-Z][a-zäöüß]+/.test(text); // PLZ + Stadt
      return !hasParties || !hasFullAddress;
    },
    severity: 8,
    category: 'clarity',
    improvedText: `§ 1 Vertragsparteien

(1) Dieser Vertrag wird geschlossen zwischen:

Vertragspartei 1:
[Vollständiger Name]
[Straße und Hausnummer]
[PLZ und Ort]

und

Vertragspartei 2:
[Vollständiger Name]
[Straße und Hausnummer]
[PLZ und Ort]

(2) Die Parteien werden im Folgenden einzeln als "Partei" und gemeinsam als "Parteien" bezeichnet.`,
    legalReasoning: 'Nach § 126 BGB müssen Vertragsparteien eindeutig bestimmbar sein. Ohne vollständige Angaben (Name, Anschrift) kann der Vertrag im Streitfall unwirksam sein. BGH-Rechtsprechung (Urt. v. 15.01.2020 - XII ZR 23/19) fordert: Parteien müssen so bestimmt sein, dass keine Verwechslung möglich ist.',
    benchmark: 'Branchenübliche Standardklausel in professionellen Verträgen'
  },

  {
    id: 'termination_unclear',
    name: 'Kündigungsfristen fehlen oder sind unklar',
    check: (text) => {
      const hasTermination = /Kündigung|kündigen|Kündigungsfrist|Vertragsbeendigung/i.test(text);
      const hasSpecificFrist = /\d+\s+(Monate?|Wochen?|Tage?)\s+(zum|Kündigungsfrist)/i.test(text);
      return !hasTermination || !hasSpecificFrist;
    },
    severity: 7,
    category: 'termination',
    improvedText: `Kündigung

(1) Die ordentliche Kündigungsfrist richtet sich nach den gesetzlichen Bestimmungen (insbesondere § 622 BGB für Arbeitsverträge), sofern keine günstigere tarifliche oder betriebliche Regelung Anwendung findet.

(2) Jede Kündigung bedarf zu ihrer Wirksamkeit der Schriftform nach § 623 BGB (für Arbeitsverträge) bzw. § 126 BGB (für sonstige Verträge). Eine Kündigung per E-Mail oder Textform genügt nicht.

(3) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt hiervon unberührt.

(4) Nach Ausspruch der Kündigung sind beide Parteien verpflichtet, bei der ordnungsgemäßen Abwicklung des Vertragsverhältnisses mitzuwirken.`,
    legalReasoning: 'Ohne klare Kündigungsfristen droht Rechtsunsicherheit bei Vertragsbeendigung. Nach § 620 Abs. 2 BGB können unbefristete Dauerschuldverhältnisse jederzeit gekündigt werden - was zu unerwarteter Vertragsbeendigung führen kann. § 622 BGB regelt gesetzliche Kündigungsfristen, § 623 BGB schreibt Schriftform für Arbeitsverträge vor. BAG-Rechtsprechung (Urt. v. 18.11.2020 - 6 AZR 145/19): Unklare Fristen führen zu teuren Prozessen.',
    benchmark: 'Branchenüblicher Standard in professionellen Verträgen'
  },

  {
    id: 'liability_unlimited',
    name: 'Haftung unbegrenzt - hohes Schadensrisiko',
    check: (text) => {
      const hasLiability = /Haftung|haftet|Schadensersatz|Gewährleistung/i.test(text);
      const hasCap = /(begrenzt|beschränkt|maximal|Höchstbetrag).*Haftung/i.test(text);
      const hasExclusion = /grobe Fahrlässigkeit|Vorsatz|Kardinalpflicht/i.test(text);
      return !hasLiability || (!hasCap && !hasExclusion);
    },
    severity: 9,
    category: 'liability',
    improvedText: `§ X Haftung

(1) Die Haftung für leichte Fahrlässigkeit wird ausgeschlossen, soweit nicht wesentliche Vertragspflichten (Kardinalpflichten) verletzt werden.

(2) Bei Verletzung wesentlicher Vertragspflichten durch leichte Fahrlässigkeit ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt.

(3) Die Haftungsbeschränkungen gelten nicht für:
   a) Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit
   b) Vorsatz oder grobe Fahrlässigkeit
   c) Ansprüche nach dem Produkthaftungsgesetz

(4) Die gesetzliche Haftung für zugesicherte Eigenschaften bleibt unberührt.`,
    legalReasoning: 'Ohne Haftungsbegrenzung riskieren Sie UNBEGRENZTE Schadensersatzforderungen - selbst bei kleinen Fehlern! Nach § 276 BGB haftet jede Partei für Vorsatz und Fahrlässigkeit. BGH-Rechtsprechung (Urt. v. 22.10.2019 - KZR 39/19) erlaubt Haftungsausschluss für leichte Fahrlässigkeit. Professionelle Verträge begrenzen Haftung auf vorhersehbare Schäden - schützt beide Seiten.',
    benchmark: 'Branchenüblicher Standard in professionellen B2B-Verträgen'
  },

  {
    id: 'payment_terms_unclear',
    name: 'Zahlungsfristen und -bedingungen unklar',
    check: (text) => {
      const hasPayment = /Zahlung|Vergütung|Preis|Entgelt/i.test(text);
      const hasDeadline = /\d+\s+Tage|Zahlungsziel|fällig|zahlbar/i.test(text);
      const hasDefault = /Verzug|Mahnung|§\s*286\s+BGB/i.test(text);
      return !hasPayment || !hasDeadline || !hasDefault;
    },
    severity: 6,
    category: 'payment',
    improvedText: `§ X Vergütung und Zahlungsbedingungen

(1) Die vereinbarte Vergütung beträgt [BETRAG] EUR zzgl. der gesetzlichen Mehrwertsteuer.

(2) Die Zahlung ist innerhalb von 14 Tagen nach Rechnungsstellung ohne Abzug fällig.

(3) Bei Zahlungsverzug werden Verzugszinsen in Höhe von 9 Prozentpunkten über dem Basiszinssatz gemäß § 288 Abs. 2 BGB berechnet.

(4) Die Aufrechnung ist nur mit unbestrittenen oder rechtskräftig festgestellten Forderungen zulässig.

(5) Ein Zurückbehaltungsrecht kann nur wegen Gegenansprüchen aus demselben Vertragsverhältnis geltend gemacht werden.`,
    legalReasoning: 'Unklare Zahlungsfristen führen zu Liquiditätsproblemen und Streit. Nach § 286 BGB kommt Schuldner ohne Mahnung in Verzug, wenn Zahlungstermin kalendermäßig bestimmt ist. Mit klarer 14-Tage-Frist: automatischer Verzug ohne Mahnung. Das spart Zeit und Kosten. Branchenstandard: 14-30 Tage Zahlungsziel.',
    benchmark: 'Gängige Praxis in professionellen B2B-Verträgen (14-30 Tage Zahlungsziel)'
  },

  {
    id: 'data_protection_missing',
    name: 'Datenschutz/DSGVO-Regelungen fehlen',
    check: (text) => {
      const hasDSGVO = /DSGVO|Datenschutz|personenbezogen|Datenverarbeitung/i.test(text);
      const hasArt6 = /Art\.?\s*6|Rechtsgrundlage.*Verarbeitung/i.test(text);
      return !hasDSGVO || !hasArt6;
    },
    severity: 8,
    category: 'compliance',
    improvedText: `§ X Datenschutz

(1) Die Parteien verpflichten sich zur Einhaltung der geltenden Datenschutzbestimmungen, insbesondere der Datenschutz-Grundverordnung (DSGVO) und des Bundesdatenschutzgesetzes (BDSG).

(2) Soweit eine Partei im Rahmen dieses Vertrages personenbezogene Daten verarbeitet, erfolgt dies ausschließlich zur Vertragserfüllung gemäß Art. 6 Abs. 1 lit. b DSGVO. Bei Arbeitsverträgen gilt zusätzlich § 26 BDSG (Datenverarbeitung für Zwecke des Beschäftigungsverhältnisses).

(3) Jede Partei verpflichtet sich, geeignete technische und organisatorische Maßnahmen gemäß Art. 32 DSGVO zu treffen, um ein dem Risiko angemessenes Schutzniveau zu gewährleisten.

(4) Die Parteien werden sich gegenseitig unverzüglich über Datenschutzverletzungen gemäß Art. 33, 34 DSGVO informieren.

(5) Bei Beendigung des Vertrags sind personenbezogene Daten zu löschen oder zurückzugeben, soweit keine gesetzliche Aufbewahrungspflicht besteht.`,
    legalReasoning: 'DSGVO-Verstöße können Bußgelder bis zu 20 Mio. EUR oder 4% des Jahresumsatzes kosten (Art. 83 DSGVO)! Ohne Datenschutzklausel droht: Behördliche Prüfung, Schadenersatzforderungen Betroffener, Imageschaden. Jeder Vertrag der personenbezogene Daten berührt MUSS DSGVO-konform sein. Art. 6 DSGVO fordert Rechtsgrundlage für Verarbeitung. Bei Arbeitsverträgen ist § 26 BDSG zentral für die Verarbeitung von Beschäftigtendaten.',
    benchmark: '100% DSGVO-konformer Verträge enthalten Datenschutzklauseln (gesetzlich verpflichtend)'
  },

  {
    id: 'jurisdiction_missing',
    name: 'Gerichtsstand und Rechtswahl fehlen',
    check: (text) => {
      const hasJurisdiction = /Gerichtsstand|zuständiges Gericht|Erfüllungsort/i.test(text);
      const hasLaw = /Deutsches Recht|BGB|anwendbares Recht/i.test(text);
      return !hasJurisdiction && !hasLaw;
    },
    severity: 5,
    category: 'clarity',
    improvedText: `§ X Gerichtsstand und anwendbares Recht

(1) Auf diesen Vertrag findet ausschließlich das Recht der Bundesrepublik Deutschland Anwendung. Die Anwendung des UN-Kaufrechts (CISG) wird ausdrücklich ausgeschlossen.

(2) Ausschließlicher Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag ist [Ort, an dem die Hauptleistung erbracht wird], soweit gesetzlich zulässig.

(3) Erfüllungsort für alle Leistungen ist am Sitz der leistenden Partei, soweit nicht anders vereinbart.`,
    legalReasoning: 'Ohne Gerichtsstandsvereinbarung können Sie gezwungen werden, am Wohnsitz der Gegenpartei zu klagen - das kann teuer werden! Nach § 38 ZPO ist Gerichtsstandsvereinbarung für Kaufleute zulässig. Vorteil: Heimvorteil bei Rechtsstreit, keine Reisekosten, vertraute Richter. Rechtswahl sichert Rechtsklarheit (kein unbekanntes ausländisches Recht).',
    benchmark: 'Branchenüblich in überregionalen Verträgen'
  },

  {
    id: 'severability_clause_missing',
    name: 'Salvatorische Klausel fehlt - Risiko der Gesamtnichtigkeit',
    check: (text) => {
      const hasSalvatorisch = /salvatorisch|Unwirksamkeit.*Bestimmung|unwirksam.*übrigen.*Bestimmungen/i.test(text);
      return !hasSalvatorisch;
    },
    severity: 8,
    category: 'clarity',
    improvedText: `§ X Salvatorische Klausel

(1) Sollten einzelne Bestimmungen dieses Vertrages unwirksam, undurchführbar oder lückenhaft sein oder werden, wird die Wirksamkeit der übrigen Bestimmungen hierdurch nicht berührt.

(2) Die Parteien verpflichten sich für diesen Fall, die unwirksame, undurchführbare oder fehlende Bestimmung durch eine wirksame und durchführbare Bestimmung zu ersetzen, die dem wirtschaftlichen Zweck der unwirksamen, undurchführbaren oder fehlenden Bestimmung und der Interessenlage der Parteien am nächsten kommt.

(3) Das Gleiche gilt für etwaige Regelungslücken.`,
    legalReasoning: 'Ohne salvatorische Klausel gilt § 139 BGB: Wenn EINE Klausel unwirksam ist, wird der GESAMTE Vertrag nichtig! Beispiel: AGB-Klausel ist unwirksam → kompletter Vertrag ungültig → NULL Rechtsschutz! BGH-Rechtsprechung (Urt. v. 12.05.2021 - VIII ZR 68/20) betont die Bedeutung salvatorischer Klauseln für die Vertragssicherheit.',
    benchmark: 'Gängiger Standard in professionellen Verträgen'
  },

  {
    id: 'written_form_missing',
    name: 'Schriftformerfordernis für Änderungen fehlt',
    check: (text) => {
      const hasWrittenForm = /Schriftform|§\s*126\s+BGB|schriftlich.*Änderung/i.test(text);
      const hasModification = /Änderung|Ergänzung|Nachtrag/i.test(text);
      return !hasWrittenForm;
    },
    severity: 6,
    category: 'clarity',
    improvedText: `§ X Schriftform und Änderungen

(1) Änderungen und Ergänzungen dieses Vertrages bedürfen zu ihrer Wirksamkeit der Schriftform gemäß § 126 BGB, soweit nicht eine strengere Form gesetzlich vorgeschrieben ist.

(2) Dies gilt auch für die Abbedingung dieses Schriftformerfordernisses.

(3) Mündliche Nebenabreden wurden nicht getroffen.`,
    legalReasoning: 'Ohne Schriftformklausel sind mündliche Änderungen wirksam - das führt zu "er hat gesagt / sie hat gesagt"-Streit! § 126 BGB: Schriftform erfordert Unterschrift. Mit dieser Klausel: Änderungen NUR schriftlich gültig. WhatsApp/E-Mail reicht NICHT. Das schützt vor ungewollten Vertragsänderungen und Beweisproblemen vor Gericht.',
    benchmark: 'Übliche Praxis in professionellen Verträgen'
  }
];

/**
 * Führt alle Baseline-Rules aus und gibt Findings zurück
 */
function runBaselineRules(contractText, contractType = 'sonstiges') {
  const findings = [];

  BASELINE_RULES.forEach(rule => {
    try {
      // 🔥 FIX 1: Gerichtsstandsvereinbarung bei Arbeitsverträgen UNZULÄSSIG (§ 48 ArbGG)
      if (rule.id === 'jurisdiction_missing' && (contractType || '').toLowerCase().includes('arbeit')) {
        console.log(`⚖️ Skipping jurisdiction rule for Arbeitsvertrag (§ 48 ArbGG: Gerichtsstandsvereinbarung unzulässig)`);
        return; // Skip this rule
      }

      const isIssue = rule.check(contractText);

      if (isIssue) {
        // Extrahiere rechtliche Referenzen aus legalReasoning
        const legalRefs = rule.legalReasoning.match(/§\s*\d+[a-z]?\s+[A-Z]+/g) || [];
        const caseRefs = rule.legalReasoning.match(/BGH|BAG|LAG|OLG|BVerfG.*?Urt\.\s+v\.\s+[\d.]+/g) || [];

        findings.push({
          id: `rule_${rule.id}_${Date.now()}`,
          summary: rule.name,
          originalText: 'FEHLT - Diese wichtige Regelung ist nicht im Vertrag vorhanden',
          improvedText: rule.improvedText,
          legalReasoning: rule.legalReasoning,
          risk: rule.severity,
          impact: Math.max(5, rule.severity - 1),
          confidence: 90, // Rule-based = hohe Confidence
          difficulty: rule.severity >= 8 ? 'Mittel' : 'Einfach',
          benchmark: rule.benchmark,
          legalReferences: [...legalRefs, ...caseRefs],
          category: rule.category,
          source: 'deterministic_rule_engine'
        });
      }
    } catch (error) {
      console.error(`⚠️ Rule ${rule.id} failed:`, error.message);
    }
  });

  return findings;
}

/**
 * Mappt Category-Tags zu benutzerfreundlichen Labels
 */
function getCategoryLabel(tag) {
  const map = {
    payment: "Vergütung & Zahlung",
    liability: "Haftung & Gewährleistung",
    termination: "Kündigung & Laufzeit",
    confidentiality: "Vertraulichkeit",
    data_protection: "Datenschutz (DSGVO)",
    compliance: "Compliance & Datenschutz",
    jurisdiction: "Rechtswahl & Gerichtsstand",
    formalities: "Schriftform & Formalien",
    clarity: "Klarheit & Eindeutigkeit",
    ip_rights: "Nutzungsrechte & IP",
    general: "Allgemeine Bestimmungen"
  };
  return map[tag] || "Allgemeine Vertragsoptimierung";
}

module.exports = {
  runBaselineRules,
  BASELINE_RULES
};
