/**
 * Musterklauseln für die Klausel-Bibliothek
 * 50+ deutsche Rechtsklauseln für verschiedene Vertragstypen
 */

import type { TemplateClause } from '../types/clauseLibrary';

export const templateClauses: TemplateClause[] = [
  // =============================================
  // KÜNDIGUNG (8 Klauseln)
  // =============================================
  {
    id: 'termination-1',
    title: 'Ordentliche Kündigung (Arbeitsvertrag)',
    clauseText: 'Das Arbeitsverhältnis kann von beiden Vertragsparteien unter Einhaltung der gesetzlichen Kündigungsfristen gemäß § 622 BGB ordentlich gekündigt werden. Die Kündigung bedarf zu ihrer Wirksamkeit der Schriftform.',
    category: 'termination',
    riskLevel: 'neutral',
    usageContext: 'Standard-Kündigungsklausel für unbefristete Arbeitsverträge',
    industryTags: ['allgemein'],
    legalBasis: '§ 622 BGB',
    warnings: ['Die gesetzlichen Mindestfristen können nicht unterschritten werden'],
  },
  {
    id: 'termination-2',
    title: 'Verlängerte Kündigungsfrist (Arbeitnehmerfreundlich)',
    clauseText: 'Das Arbeitsverhältnis kann von beiden Seiten mit einer Frist von drei Monaten zum Monatsende gekündigt werden. Diese Kündigungsfrist gilt sowohl für den Arbeitgeber als auch für den Arbeitnehmer.',
    category: 'termination',
    riskLevel: 'arbeitnehmerfreundlich',
    usageContext: 'Für Positionen mit längerer Einarbeitung oder höherer Verantwortung',
    industryTags: ['allgemein', 'it', 'finanzen'],
    legalBasis: '§ 622 Abs. 5 BGB',
    variations: [
      {
        title: 'Mit Staffelung nach Betriebszugehörigkeit',
        text: 'Das Arbeitsverhältnis kann nach Ablauf der Probezeit mit einer Frist von einem Monat zum Monatsende gekündigt werden. Nach zwei Jahren Betriebszugehörigkeit erhöht sich die Kündigungsfrist auf zwei Monate, nach fünf Jahren auf drei Monate.',
        description: 'Progressive Staffelung je nach Dauer des Arbeitsverhältnisses',
      }
    ],
  },
  {
    id: 'termination-3',
    title: 'Außerordentliche Kündigung',
    clauseText: 'Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt. Ein wichtiger Grund liegt insbesondere vor bei groben Pflichtverletzungen, Straftaten gegen den Vertragspartner oder dessen Vermögen sowie bei Insolvenz einer Vertragspartei.',
    category: 'termination',
    riskLevel: 'neutral',
    usageContext: 'Klarstellung der fristlosen Kündigungsmöglichkeiten',
    industryTags: ['allgemein'],
    legalBasis: '§ 626 BGB',
  },
  {
    id: 'termination-4',
    title: 'Kündigung mit Abwicklungsklausel',
    clauseText: 'Im Falle einer Kündigung verpflichten sich beide Parteien, alle begonnenen Projekte nach Möglichkeit ordnungsgemäß zu beenden oder eine geordnete Übergabe sicherzustellen. Der Auftragnehmer hat Anspruch auf Vergütung der bis zur Kündigung erbrachten Leistungen.',
    category: 'termination',
    riskLevel: 'neutral',
    usageContext: 'Für Dienstleistungs- und Werkverträge',
    industryTags: ['dienstleistung', 'it', 'handwerk'],
  },
  {
    id: 'termination-5',
    title: 'Kündigung in der Probezeit',
    clauseText: 'Während der Probezeit kann das Arbeitsverhältnis von beiden Seiten mit einer Frist von zwei Wochen gekündigt werden. Die Probezeit beträgt sechs Monate.',
    category: 'termination',
    riskLevel: 'neutral',
    usageContext: 'Standard-Probezeitregelung',
    industryTags: ['allgemein'],
    legalBasis: '§ 622 Abs. 3 BGB',
  },
  {
    id: 'termination-6',
    title: 'Automatische Beendigung bei Befristung',
    clauseText: 'Das Vertragsverhältnis endet automatisch mit Ablauf der vereinbarten Vertragslaufzeit, ohne dass es einer gesonderten Kündigung bedarf. Eine ordentliche Kündigung vor Ablauf der Vertragslaufzeit ist ausgeschlossen.',
    category: 'termination',
    riskLevel: 'arbeitgeberfreundlich',
    usageContext: 'Für befristete Verträge ohne ordentliche Kündigungsmöglichkeit',
    industryTags: ['allgemein'],
    legalBasis: '§ 15 TzBfG',
    warnings: ['Bei Arbeitsverträgen sind die Befristungsregeln des TzBfG zu beachten'],
  },
  {
    id: 'termination-7',
    title: 'Kündigungsrecht bei Leistungsstörung',
    clauseText: 'Der Auftraggeber ist zur außerordentlichen Kündigung berechtigt, wenn der Auftragnehmer trotz schriftlicher Mahnung und angemessener Nachfristsetzung seine vertraglichen Pflichten nicht oder nicht vertragsgemäß erfüllt.',
    category: 'termination',
    riskLevel: 'arbeitgeberfreundlich',
    usageContext: 'Schutz bei mangelhafter Leistungserbringung',
    industryTags: ['dienstleistung', 'it', 'handwerk'],
  },
  {
    id: 'termination-8',
    title: 'Teilkündigung',
    clauseText: 'Der Auftraggeber ist berechtigt, einzelne Leistungsbestandteile oder Teilleistungen gesondert zu kündigen, sofern die verbleibenden Leistungen wirtschaftlich sinnvoll fortgeführt werden können. In diesem Fall erfolgt eine anteilige Vergütungsanpassung.',
    category: 'termination',
    riskLevel: 'arbeitgeberfreundlich',
    usageContext: 'Für modulare Verträge mit verschiedenen Leistungspaketen',
    industryTags: ['it', 'dienstleistung'],
  },

  // =============================================
  // HAFTUNG (7 Klauseln)
  // =============================================
  {
    id: 'liability-1',
    title: 'Haftungsbegrenzung auf grobe Fahrlässigkeit',
    clauseText: 'Die Haftung für leichte Fahrlässigkeit wird ausgeschlossen, soweit keine wesentlichen Vertragspflichten (Kardinalpflichten) verletzt werden. Im Falle der Verletzung wesentlicher Vertragspflichten ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt.',
    category: 'liability',
    riskLevel: 'arbeitgeberfreundlich',
    usageContext: 'Standard-Haftungsbegrenzung für Dienstleister',
    industryTags: ['dienstleistung', 'it'],
    legalBasis: '§§ 276, 278 BGB',
    warnings: ['Haftungsausschluss für Personenschäden ist unwirksam'],
  },
  {
    id: 'liability-2',
    title: 'Summenmäßige Haftungsbegrenzung',
    clauseText: 'Die Haftung des Auftragnehmers ist auf die Höhe des Auftragswertes begrenzt, maximal jedoch auf EUR 100.000,00 je Schadensfall. Diese Begrenzung gilt nicht für Vorsatz, grobe Fahrlässigkeit sowie für Schäden aus der Verletzung von Leben, Körper oder Gesundheit.',
    category: 'liability',
    riskLevel: 'arbeitgeberfreundlich',
    usageContext: 'Klare Risikobegrenzung bei größeren Projekten',
    industryTags: ['it', 'dienstleistung', 'handwerk'],
    variations: [
      {
        title: 'Mit prozentualem Cap',
        text: 'Die Haftung ist auf 50% des Auftragswertes begrenzt, maximal jedoch auf EUR 50.000,00 pro Kalenderjahr.',
        description: 'Alternative mit jährlichem Maximum',
      }
    ],
  },
  {
    id: 'liability-3',
    title: 'Haftung für Erfüllungsgehilfen',
    clauseText: 'Der Auftragnehmer haftet für das Verschulden seiner Erfüllungsgehilfen und Mitarbeiter wie für eigenes Verschulden. Der Auftragnehmer verpflichtet sich, bei der Auswahl und Überwachung seiner Erfüllungsgehilfen die verkehrsübliche Sorgfalt anzuwenden.',
    category: 'liability',
    riskLevel: 'neutral',
    usageContext: 'Klarstellung der Verantwortlichkeit für Subunternehmer',
    industryTags: ['allgemein'],
    legalBasis: '§ 278 BGB',
  },
  {
    id: 'liability-4',
    title: 'Freistellungsklausel',
    clauseText: 'Der Auftragnehmer stellt den Auftraggeber von allen Ansprüchen Dritter frei, die aus einer Verletzung gewerblicher Schutzrechte durch die vom Auftragnehmer erbrachten Leistungen resultieren. Die Freistellung umfasst auch die angemessenen Kosten der Rechtsverteidigung.',
    category: 'liability',
    riskLevel: 'arbeitnehmerfreundlich',
    usageContext: 'Schutz vor Ansprüchen wegen Schutzrechtsverletzungen',
    industryTags: ['it', 'produktion'],
  },
  {
    id: 'liability-5',
    title: 'Produkthaftung',
    clauseText: 'Die Haftung nach dem Produkthaftungsgesetz bleibt unberührt. Der Lieferant versichert, dass die gelieferten Produkte den geltenden Sicherheitsvorschriften entsprechen und frei von Konstruktions-, Produktions- und Instruktionsfehlern sind.',
    category: 'liability',
    riskLevel: 'neutral',
    usageContext: 'Bei Warenlieferungen und Produktverträgen',
    industryTags: ['handel', 'produktion'],
    legalBasis: 'ProdHaftG',
  },
  {
    id: 'liability-6',
    title: 'Haftung für mittelbare Schäden',
    clauseText: 'Die Haftung für mittelbare Schäden und Folgeschäden, insbesondere für entgangenen Gewinn, Produktionsausfall, Nutzungsausfall und Vermögensschäden, ist ausgeschlossen, soweit dies gesetzlich zulässig ist.',
    category: 'liability',
    riskLevel: 'arbeitgeberfreundlich',
    usageContext: 'Begrenzung auf direkte Schäden',
    industryTags: ['it', 'dienstleistung'],
    warnings: ['Wirksamkeit im B2C-Bereich eingeschränkt'],
  },
  {
    id: 'liability-7',
    title: 'Mitverschulden des Auftraggebers',
    clauseText: 'Der Auftraggeber hat ein Mitverschulden zu vertreten, soweit er seinen Mitwirkungspflichten nicht nachkommt oder unvollständige oder fehlerhafte Informationen zur Verfügung stellt. In diesem Fall ist die Haftung des Auftragnehmers entsprechend zu kürzen.',
    category: 'liability',
    riskLevel: 'arbeitgeberfreundlich',
    usageContext: 'Schutz bei mangelnder Mitwirkung des Kunden',
    industryTags: ['dienstleistung', 'it'],
    legalBasis: '§ 254 BGB',
  },

  // =============================================
  // ZAHLUNG (6 Klauseln)
  // =============================================
  {
    id: 'payment-1',
    title: 'Zahlungsziel 14 Tage netto',
    clauseText: 'Der Rechnungsbetrag ist innerhalb von 14 Tagen nach Rechnungsstellung ohne Abzug zur Zahlung fällig. Maßgeblich ist der Eingang der Zahlung auf dem Konto des Auftragnehmers.',
    category: 'payment',
    riskLevel: 'arbeitgeberfreundlich',
    usageContext: 'Kurzes Zahlungsziel für schnellen Geldeingang',
    industryTags: ['allgemein'],
  },
  {
    id: 'payment-2',
    title: 'Zahlungsziel mit Skonto',
    clauseText: 'Der Rechnungsbetrag ist innerhalb von 30 Tagen nach Rechnungsstellung netto fällig. Bei Zahlung innerhalb von 10 Tagen wird ein Skonto von 2% gewährt.',
    category: 'payment',
    riskLevel: 'neutral',
    usageContext: 'Anreiz für schnelle Zahlung',
    industryTags: ['handel', 'handwerk', 'produktion'],
    variations: [
      {
        title: 'Höheres Skonto',
        text: 'Bei Zahlung innerhalb von 7 Tagen wird ein Skonto von 3% gewährt. Zahlungsziel: 30 Tage netto.',
        description: 'Stärkerer Anreiz für sehr schnelle Zahlung',
      }
    ],
  },
  {
    id: 'payment-3',
    title: 'Verzugszinsen',
    clauseText: 'Kommt der Auftraggeber mit der Zahlung in Verzug, so ist der Auftragnehmer berechtigt, Verzugszinsen in Höhe von 9 Prozentpunkten über dem jeweiligen Basiszinssatz zu verlangen. Die Geltendmachung eines höheren Verzugsschadens bleibt vorbehalten.',
    category: 'payment',
    riskLevel: 'arbeitgeberfreundlich',
    usageContext: 'Standard-Verzugszinsenregelung für B2B',
    industryTags: ['allgemein'],
    legalBasis: '§ 288 Abs. 2 BGB',
  },
  {
    id: 'payment-4',
    title: 'Abschlagszahlungen',
    clauseText: 'Der Auftraggeber leistet Abschlagszahlungen nach folgendem Zahlungsplan: 30% bei Auftragserteilung, 40% nach Fertigstellung des ersten Meilensteins, 30% nach Abnahme. Die Schlussrechnung erfolgt nach vollständiger Leistungserbringung.',
    category: 'payment',
    riskLevel: 'arbeitgeberfreundlich',
    usageContext: 'Bei größeren Projekten zur Liquiditätssicherung',
    industryTags: ['it', 'handwerk', 'dienstleistung'],
  },
  {
    id: 'payment-5',
    title: 'Preisanpassungsklausel',
    clauseText: 'Bei Dauerschuldverhältnissen ist der Auftragnehmer berechtigt, die vereinbarten Vergütungen jeweils zum 1. Januar eines Jahres anzupassen, soweit sich die für die Preiskalkulation maßgeblichen Kosten (insbesondere Personal- und Sachkosten) verändert haben. Die Anpassung bedarf einer Ankündigung mit einer Frist von drei Monaten.',
    category: 'payment',
    riskLevel: 'arbeitgeberfreundlich',
    usageContext: 'Für langfristige Verträge mit Inflationsschutz',
    industryTags: ['dienstleistung', 'it'],
    warnings: ['Im B2C-Bereich sind strengere Anforderungen zu beachten'],
  },
  {
    id: 'payment-6',
    title: 'Aufrechnung und Zurückbehaltung',
    clauseText: 'Der Auftraggeber kann nur mit unbestrittenen oder rechtskräftig festgestellten Forderungen aufrechnen. Ein Zurückbehaltungsrecht kann der Auftraggeber nur geltend machen, wenn sein Gegenanspruch auf demselben Vertragsverhältnis beruht.',
    category: 'payment',
    riskLevel: 'arbeitgeberfreundlich',
    usageContext: 'Schutz des Zahlungsanspruchs',
    industryTags: ['allgemein'],
    legalBasis: '§§ 387 ff., 273 BGB',
  },

  // =============================================
  // GEHEIMHALTUNG (5 Klauseln)
  // =============================================
  {
    id: 'confidentiality-1',
    title: 'Standard-Vertraulichkeitsklausel',
    clauseText: 'Die Vertragsparteien verpflichten sich, alle im Rahmen dieser Vereinbarung erhaltenen vertraulichen Informationen streng geheim zu halten und nicht an Dritte weiterzugeben. Diese Verpflichtung gilt auch nach Beendigung des Vertragsverhältnisses fort.',
    category: 'confidentiality',
    riskLevel: 'neutral',
    usageContext: 'Basis-Geheimhaltungsklausel für alle Vertragstypen',
    industryTags: ['allgemein'],
  },
  {
    id: 'confidentiality-2',
    title: 'Definition vertraulicher Informationen',
    clauseText: 'Vertrauliche Informationen im Sinne dieser Vereinbarung sind sämtliche Informationen, die als "vertraulich" oder "geheim" gekennzeichnet sind oder deren Vertraulichkeit sich aus den Umständen ergibt, insbesondere Geschäfts- und Betriebsgeheimnisse, technische Daten, Kundendaten, Kalkulationen, Strategien und Know-how.',
    category: 'confidentiality',
    riskLevel: 'neutral',
    usageContext: 'Präzise Definition des Schutzbereichs',
    industryTags: ['allgemein', 'it'],
    legalBasis: 'GeschGehG',
  },
  {
    id: 'confidentiality-3',
    title: 'Erweiterte NDA mit Vertragsstrafe',
    clauseText: 'Bei schuldhafter Verletzung der Geheimhaltungspflichten ist eine Vertragsstrafe in Höhe von EUR 10.000,00 für jeden Fall der Zuwiderhandlung zu zahlen. Die Geltendmachung eines darüber hinausgehenden Schadens bleibt vorbehalten. Die Geheimhaltungspflicht gilt für einen Zeitraum von fünf Jahren nach Beendigung des Vertragsverhältnisses.',
    category: 'confidentiality',
    riskLevel: 'arbeitnehmerfreundlich',
    usageContext: 'Bei besonders sensiblen Informationen',
    industryTags: ['it', 'finanzen', 'gesundheit'],
    warnings: ['Höhe der Vertragsstrafe muss angemessen sein'],
  },
  {
    id: 'confidentiality-4',
    title: 'Rückgabepflicht vertraulicher Unterlagen',
    clauseText: 'Auf Verlangen oder bei Beendigung des Vertragsverhältnisses sind sämtliche vertraulichen Informationen, einschließlich aller Kopien und Aufzeichnungen, unverzüglich zurückzugeben oder nachweislich zu vernichten. Elektronische Kopien sind unwiderruflich zu löschen.',
    category: 'confidentiality',
    riskLevel: 'neutral',
    usageContext: 'Sicherstellung der Informationsrückgabe',
    industryTags: ['allgemein'],
  },
  {
    id: 'confidentiality-5',
    title: 'Ausnahmen von der Geheimhaltungspflicht',
    clauseText: 'Die Geheimhaltungspflicht gilt nicht für Informationen, die (a) zum Zeitpunkt der Offenlegung bereits öffentlich bekannt waren, (b) ohne Verschulden des Empfängers öffentlich bekannt werden, (c) dem Empfänger bereits vor der Offenlegung bekannt waren oder (d) aufgrund gesetzlicher Verpflichtung offengelegt werden müssen.',
    category: 'confidentiality',
    riskLevel: 'neutral',
    usageContext: 'Übliche Ausnahmetatbestände von der Geheimhaltung',
    industryTags: ['allgemein'],
  },

  // =============================================
  // DSGVO / DATENSCHUTZ (5 Klauseln)
  // =============================================
  {
    id: 'data_protection-1',
    title: 'Auftragsverarbeitung (AVV) Kurzfassung',
    clauseText: 'Soweit der Auftragnehmer personenbezogene Daten im Auftrag des Auftraggebers verarbeitet, erfolgt dies auf Grundlage einer gesondert abzuschließenden Vereinbarung zur Auftragsverarbeitung gemäß Art. 28 DSGVO. Der Auftragnehmer wird die Daten nur auf dokumentierte Weisung des Auftraggebers verarbeiten.',
    category: 'data_protection',
    riskLevel: 'neutral',
    usageContext: 'Verweis auf separate AVV',
    industryTags: ['it', 'dienstleistung'],
    legalBasis: 'Art. 28 DSGVO',
  },
  {
    id: 'data_protection-2',
    title: 'Technische und organisatorische Maßnahmen',
    clauseText: 'Der Auftragnehmer hat angemessene technische und organisatorische Maßnahmen getroffen, um ein dem Risiko angemessenes Schutzniveau zu gewährleisten. Die Maßnahmen umfassen insbesondere die Pseudonymisierung und Verschlüsselung personenbezogener Daten, die Fähigkeit, die Vertraulichkeit, Integrität und Verfügbarkeit der Systeme sicherzustellen, sowie regelmäßige Überprüfungen der Wirksamkeit.',
    category: 'data_protection',
    riskLevel: 'neutral',
    usageContext: 'Nachweis der DSGVO-Konformität',
    industryTags: ['it', 'gesundheit', 'finanzen'],
    legalBasis: 'Art. 32 DSGVO',
  },
  {
    id: 'data_protection-3',
    title: 'Löschpflicht nach Auftragsende',
    clauseText: 'Nach Abschluss der Verarbeitung wird der Auftragnehmer alle personenbezogenen Daten löschen, es sei denn, gesetzliche Aufbewahrungspflichten stehen dem entgegen. Die Löschung ist dem Auftraggeber schriftlich zu bestätigen.',
    category: 'data_protection',
    riskLevel: 'neutral',
    usageContext: 'Sicherstellung der Datenlöschung',
    industryTags: ['allgemein'],
    legalBasis: 'Art. 28 Abs. 3 lit. g DSGVO',
  },
  {
    id: 'data_protection-4',
    title: 'Unterauftragnehmer-Regelung',
    clauseText: 'Der Auftragnehmer darf Unterauftragnehmer nur mit vorheriger schriftlicher Genehmigung des Auftraggebers einsetzen. Der Auftragnehmer hat den Unterauftragnehmer denselben Datenschutzpflichten zu unterwerfen, die auch zwischen den Vertragsparteien vereinbart sind.',
    category: 'data_protection',
    riskLevel: 'arbeitnehmerfreundlich',
    usageContext: 'Kontrolle über Unterauftragnehmer',
    industryTags: ['it', 'dienstleistung'],
    legalBasis: 'Art. 28 Abs. 2 DSGVO',
  },
  {
    id: 'data_protection-5',
    title: 'Meldepflicht bei Datenpannen',
    clauseText: 'Der Auftragnehmer wird den Auftraggeber unverzüglich, spätestens jedoch innerhalb von 24 Stunden, über jede Verletzung des Schutzes personenbezogener Daten informieren. Die Meldung muss alle erforderlichen Informationen enthalten, damit der Auftraggeber seiner Meldepflicht gegenüber der Aufsichtsbehörde nachkommen kann.',
    category: 'data_protection',
    riskLevel: 'arbeitnehmerfreundlich',
    usageContext: 'Schnelle Reaktion bei Datenpannen',
    industryTags: ['it', 'gesundheit', 'finanzen'],
    legalBasis: 'Art. 33 DSGVO',
  },

  // =============================================
  // GEWÄHRLEISTUNG (5 Klauseln)
  // =============================================
  {
    id: 'warranty-1',
    title: 'Gewährleistung nach BGB',
    clauseText: 'Der Verkäufer gewährleistet, dass die gelieferte Ware zum Zeitpunkt des Gefahrübergangs frei von Sach- und Rechtsmängeln ist. Die Gewährleistungsfrist beträgt zwei Jahre ab Lieferung.',
    category: 'warranty',
    riskLevel: 'neutral',
    usageContext: 'Gesetzliche Gewährleistung für Kaufverträge',
    industryTags: ['handel', 'produktion'],
    legalBasis: '§§ 434 ff. BGB',
  },
  {
    id: 'warranty-2',
    title: 'Eingeschränkte Gewährleistung B2B',
    clauseText: 'Die Gewährleistungsfrist beträgt 12 Monate ab Lieferung. Die Gewährleistung ist ausgeschlossen bei üblichem Verschleiß sowie bei Schäden, die durch unsachgemäße Behandlung, fehlerhafte Wartung oder nicht autorisierte Eingriffe entstanden sind.',
    category: 'warranty',
    riskLevel: 'arbeitgeberfreundlich',
    usageContext: 'Reduzierte Gewährleistung im B2B-Bereich',
    industryTags: ['handel', 'produktion', 'handwerk'],
    warnings: ['Im B2C-Bereich sind 24 Monate Mindestgewährleistung vorgeschrieben'],
  },
  {
    id: 'warranty-3',
    title: 'Nacherfüllung als primäres Recht',
    clauseText: 'Bei Mängeln ist der Auftragnehmer zunächst zur Nacherfüllung berechtigt und verpflichtet. Der Auftragnehmer kann die Art der Nacherfüllung (Nachbesserung oder Ersatzlieferung) bestimmen. Dem Auftragnehmer sind mindestens zwei Nacherfüllungsversuche zu gestatten.',
    category: 'warranty',
    riskLevel: 'arbeitgeberfreundlich',
    usageContext: 'Vorrang der Nacherfüllung vor Rücktritt/Minderung',
    industryTags: ['handel', 'handwerk', 'produktion'],
    legalBasis: '§ 439 BGB',
  },
  {
    id: 'warranty-4',
    title: 'Mängelrüge bei Kaufleuten',
    clauseText: 'Bei beiderseitigen Handelsgeschäften hat der Käufer die Ware unverzüglich nach der Ablieferung zu untersuchen und erkennbare Mängel unverzüglich zu rügen. Versteckte Mängel sind unverzüglich nach ihrer Entdeckung zu rügen. Bei Versäumung der Rüge gilt die Ware als genehmigt.',
    category: 'warranty',
    riskLevel: 'arbeitgeberfreundlich',
    usageContext: 'Handelskauf zwischen Kaufleuten',
    industryTags: ['handel', 'produktion'],
    legalBasis: '§ 377 HGB',
  },
  {
    id: 'warranty-5',
    title: 'Funktionsgarantie für Software',
    clauseText: 'Der Anbieter gewährleistet, dass die Software die in der Spezifikation beschriebenen Funktionen erfüllt. Die Gewährleistung umfasst die Beseitigung von Programmfehlern (Bugs) durch Updates oder Patches. Nicht umfasst sind Fehler, die durch Veränderungen der Systemumgebung oder Eingriffe des Kunden verursacht wurden.',
    category: 'warranty',
    riskLevel: 'neutral',
    usageContext: 'Gewährleistung für Softwareprodukte',
    industryTags: ['it'],
  },

  // =============================================
  // VERTRAGSSTRAFE (4 Klauseln)
  // =============================================
  {
    id: 'penalty-1',
    title: 'Vertragsstrafe bei Terminüberschreitung',
    clauseText: 'Bei schuldhafter Überschreitung des vereinbarten Liefertermins ist der Auftragnehmer verpflichtet, eine Vertragsstrafe in Höhe von 0,5% des Auftragswertes pro angefangener Woche Verzug zu zahlen, maximal jedoch 5% des Auftragswertes.',
    category: 'penalty',
    riskLevel: 'arbeitnehmerfreundlich',
    usageContext: 'Absicherung bei zeitkritischen Projekten',
    industryTags: ['handwerk', 'it', 'produktion'],
    warnings: ['Die Vertragsstrafe muss in einem angemessenen Verhältnis zum Auftragswert stehen'],
  },
  {
    id: 'penalty-2',
    title: 'Vertragsstrafe bei Verstoß gegen Wettbewerbsverbot',
    clauseText: 'Bei Verstoß gegen das Wettbewerbsverbot ist eine Vertragsstrafe in Höhe von drei Bruttomonatsgehältern für jeden Fall der Zuwiderhandlung zu zahlen. Die Geltendmachung eines darüber hinausgehenden Schadens bleibt vorbehalten.',
    category: 'penalty',
    riskLevel: 'arbeitnehmerfreundlich',
    usageContext: 'Durchsetzung des Wettbewerbsverbots',
    industryTags: ['allgemein'],
    legalBasis: '§ 339 BGB',
  },
  {
    id: 'penalty-3',
    title: 'Vertragsstrafe bei Geheimhaltungsverletzung',
    clauseText: 'Bei vorsätzlicher oder grob fahrlässiger Verletzung der Geheimhaltungspflicht ist eine Vertragsstrafe in Höhe von EUR 25.000,00 für jeden Fall der Zuwiderhandlung verwirkt. Die Verpflichtung, weitergehenden Schadensersatz zu leisten, wird hierdurch nicht berührt.',
    category: 'penalty',
    riskLevel: 'arbeitnehmerfreundlich',
    usageContext: 'Schutz sensibler Geschäftsgeheimnisse',
    industryTags: ['it', 'finanzen'],
  },
  {
    id: 'penalty-4',
    title: 'Abmilderung der Vertragsstrafe',
    clauseText: 'Auf ausdrückliches Verlangen des Schuldners kann das Gericht eine verwirkte Strafe auf den angemessenen Betrag herabsetzen, wenn die verwirkte Strafe unverhältnismäßig hoch ist. Diese Regelung findet keine Anwendung auf Kaufleute.',
    category: 'penalty',
    riskLevel: 'neutral',
    usageContext: 'Hinweis auf richterliches Ermäßigungsrecht',
    industryTags: ['allgemein'],
    legalBasis: '§ 343 BGB',
  },

  // =============================================
  // FORCE MAJEURE (3 Klauseln)
  // =============================================
  {
    id: 'force_majeure-1',
    title: 'Standard Force Majeure Klausel',
    clauseText: 'Keine Vertragspartei haftet für die Nichterfüllung ihrer Pflichten, wenn und soweit die Erfüllung durch höhere Gewalt verhindert wird. Höhere Gewalt umfasst insbesondere Naturkatastrophen, Krieg, Terroranschläge, Epidemien, Streiks, behördliche Maßnahmen oder andere unvorhersehbare und unabwendbare Ereignisse.',
    category: 'force_majeure',
    riskLevel: 'neutral',
    usageContext: 'Basisregelung für unvorhersehbare Ereignisse',
    industryTags: ['allgemein'],
  },
  {
    id: 'force_majeure-2',
    title: 'Erweiterte Force Majeure mit Rücktrittsrecht',
    clauseText: 'Dauert der Fall der höheren Gewalt länger als drei Monate an, sind beide Parteien berechtigt, vom Vertrag zurückzutreten. Bereits erbrachte Leistungen sind nach den Regeln der Vorteilsausgleichung zu vergüten. Jede Partei trägt ihre eigenen Schäden.',
    category: 'force_majeure',
    riskLevel: 'neutral',
    usageContext: 'Bei längeren Verhinderungen',
    industryTags: ['allgemein', 'produktion', 'handel'],
  },
  {
    id: 'force_majeure-3',
    title: 'Informationspflicht bei höherer Gewalt',
    clauseText: 'Die von höherer Gewalt betroffene Partei ist verpflichtet, die andere Partei unverzüglich über den Eintritt des Ereignisses und seine voraussichtliche Dauer zu informieren. Sie hat alle zumutbaren Anstrengungen zu unternehmen, um die Auswirkungen des Ereignisses zu minimieren.',
    category: 'force_majeure',
    riskLevel: 'neutral',
    usageContext: 'Ergänzung zur Force Majeure Regelung',
    industryTags: ['allgemein'],
  },

  // =============================================
  // GERICHTSSTAND (3 Klauseln)
  // =============================================
  {
    id: 'jurisdiction-1',
    title: 'Ausschließlicher Gerichtsstand',
    clauseText: 'Für alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag ist ausschließlich das Gericht am Sitz des Auftragnehmers zuständig. Dies gilt auch für Klagen im Wechsel- und Scheckprozess.',
    category: 'jurisdiction',
    riskLevel: 'arbeitgeberfreundlich',
    usageContext: 'Festlegung des Gerichtsstands am eigenen Sitz',
    industryTags: ['allgemein'],
    legalBasis: '§ 38 ZPO',
    warnings: ['Gerichtsstandsvereinbarungen sind nur zwischen Kaufleuten oder bei entsprechender Vereinbarung zulässig'],
  },
  {
    id: 'jurisdiction-2',
    title: 'Deutsches Recht und Gerichtsstand',
    clauseText: 'Es gilt ausschließlich das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Gerichtsstand für alle Streitigkeiten aus diesem Vertrag ist München.',
    category: 'jurisdiction',
    riskLevel: 'neutral',
    usageContext: 'Bei internationalen Verträgen',
    industryTags: ['handel', 'it', 'dienstleistung'],
    legalBasis: 'Art. 3 Rom I-VO',
  },
  {
    id: 'jurisdiction-3',
    title: 'Schiedsklausel',
    clauseText: 'Alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag werden unter Ausschluss des ordentlichen Rechtswegs durch ein Schiedsgericht nach der Schiedsordnung der Deutschen Institution für Schiedsgerichtsbarkeit e.V. (DIS) endgültig entschieden. Schiedsort ist Frankfurt am Main.',
    category: 'jurisdiction',
    riskLevel: 'neutral',
    usageContext: 'Alternative zur ordentlichen Gerichtsbarkeit',
    industryTags: ['finanzen', 'handel'],
    warnings: ['Schiedsverfahren können teurer sein als ordentliche Gerichtsverfahren'],
  },

  // =============================================
  // WETTBEWERBSVERBOT (4 Klauseln)
  // =============================================
  {
    id: 'non_compete-1',
    title: 'Nachvertragliches Wettbewerbsverbot',
    clauseText: 'Der Arbeitnehmer verpflichtet sich, für die Dauer von einem Jahr nach Beendigung des Arbeitsverhältnisses keine Tätigkeit bei einem Wettbewerber aufzunehmen und keine eigene konkurrierende Tätigkeit auszuüben. Der Arbeitgeber zahlt für die Dauer des Verbots eine Karenzentschädigung in Höhe von mindestens 50% der zuletzt bezogenen vertragsgemäßen Leistungen.',
    category: 'non_compete',
    riskLevel: 'neutral',
    usageContext: 'Schutz vor Abwanderung zu Wettbewerbern',
    industryTags: ['allgemein'],
    legalBasis: '§§ 74 ff. HGB',
    warnings: ['Ohne Karenzentschädigung ist das Wettbewerbsverbot unwirksam'],
  },
  {
    id: 'non_compete-2',
    title: 'Kundenschutzklausel',
    clauseText: 'Der Auftragnehmer verpflichtet sich, während der Vertragslaufzeit und für einen Zeitraum von sechs Monaten danach keine direkten Geschäftsbeziehungen mit Kunden des Auftraggebers aufzunehmen, zu denen er im Rahmen dieses Vertrages Kontakt hatte.',
    category: 'non_compete',
    riskLevel: 'arbeitnehmerfreundlich',
    usageContext: 'Schutz vor Kundenabwerbung',
    industryTags: ['dienstleistung', 'it'],
  },
  {
    id: 'non_compete-3',
    title: 'Abwerbeverbot für Mitarbeiter',
    clauseText: 'Die Vertragsparteien verpflichten sich, während der Vertragslaufzeit und für einen Zeitraum von 12 Monaten nach Vertragsende keine Mitarbeiter der anderen Partei aktiv abzuwerben. Dies gilt nicht für Bewerbungen auf öffentliche Stellenausschreibungen.',
    category: 'non_compete',
    riskLevel: 'neutral',
    usageContext: 'Schutz vor gegenseitiger Mitarbeiterabwerbung',
    industryTags: ['it', 'dienstleistung'],
  },
  {
    id: 'non_compete-4',
    title: 'Räumlich begrenztes Wettbewerbsverbot',
    clauseText: 'Das Wettbewerbsverbot ist auf das Gebiet beschränkt, in dem der Arbeitnehmer während der letzten zwei Jahre vor Beendigung des Arbeitsverhältnisses tätig war. Das Wettbewerbsverbot erstreckt sich nicht auf eine Tätigkeit, die mit der bisherigen Tätigkeit nicht in Wettbewerb steht.',
    category: 'non_compete',
    riskLevel: 'arbeitnehmerfreundlich',
    usageContext: 'Angemessene räumliche Begrenzung',
    industryTags: ['allgemein'],
    legalBasis: '§ 74a HGB',
  },

  // =============================================
  // EIGENTUMSVORBEHALT (3 Klauseln)
  // =============================================
  {
    id: 'retention_of_title-1',
    title: 'Einfacher Eigentumsvorbehalt',
    clauseText: 'Die gelieferte Ware bleibt bis zur vollständigen Bezahlung des Kaufpreises Eigentum des Verkäufers. Bei Zahlungsverzug ist der Verkäufer berechtigt, die Herausgabe der Ware zu verlangen.',
    category: 'retention_of_title',
    riskLevel: 'arbeitgeberfreundlich',
    usageContext: 'Grundlegender Schutz bei Warenlieferungen',
    industryTags: ['handel', 'produktion'],
    legalBasis: '§ 449 BGB',
  },
  {
    id: 'retention_of_title-2',
    title: 'Verlängerter Eigentumsvorbehalt',
    clauseText: 'Der Käufer darf die Vorbehaltsware im ordnungsgemäßen Geschäftsgang weiterveräußern. Er tritt hiermit bereits jetzt alle Forderungen aus dem Weiterverkauf an den Verkäufer ab. Der Käufer bleibt zur Einziehung der Forderung ermächtigt. Der Verkäufer ist berechtigt, bei Zahlungsverzug die Einziehungsermächtigung zu widerrufen.',
    category: 'retention_of_title',
    riskLevel: 'arbeitgeberfreundlich',
    usageContext: 'Schutz auch bei Weiterverkauf durch den Käufer',
    industryTags: ['handel', 'produktion'],
  },
  {
    id: 'retention_of_title-3',
    title: 'Erweiterter Konzernvorbehalt',
    clauseText: 'Die gelieferte Ware bleibt bis zur vollständigen Bezahlung aller Forderungen aus der laufenden Geschäftsbeziehung zwischen dem Verkäufer und dem Käufer oder mit ihm verbundenen Unternehmen Eigentum des Verkäufers.',
    category: 'retention_of_title',
    riskLevel: 'arbeitgeberfreundlich',
    usageContext: 'Bei laufenden Geschäftsbeziehungen mit Konzernen',
    industryTags: ['handel', 'produktion'],
    warnings: ['Übersicherung kann zur Nichtigkeit führen'],
  },

  // =============================================
  // VERTRAGSÄNDERUNGEN (3 Klauseln)
  // =============================================
  {
    id: 'amendments-1',
    title: 'Schriftformklausel',
    clauseText: 'Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform. Dies gilt auch für die Aufhebung dieses Schriftformerfordernisses. Mündliche Nebenabreden bestehen nicht.',
    category: 'amendments',
    riskLevel: 'neutral',
    usageContext: 'Rechtssicherheit bei Vertragsänderungen',
    industryTags: ['allgemein'],
    legalBasis: '§ 126 BGB',
    warnings: ['Doppelte Schriftformklausel bietet keinen absoluten Schutz'],
  },
  {
    id: 'amendments-2',
    title: 'Elektronische Schriftform',
    clauseText: 'Soweit in diesem Vertrag Schriftform vorgesehen ist, genügt auch die Textform (E-Mail, Telefax). Dies gilt nicht für Kündigungen und die Aufhebung dieses Vertrages, die der Schriftform gemäß § 126 BGB bedürfen.',
    category: 'amendments',
    riskLevel: 'neutral',
    usageContext: 'Erleichterung der Kommunikation',
    industryTags: ['allgemein', 'it'],
    legalBasis: '§ 126b BGB',
  },
  {
    id: 'amendments-3',
    title: 'Change-Request-Verfahren',
    clauseText: 'Änderungen des Leistungsumfangs bedürfen eines schriftlichen Änderungsantrags (Change Request). Der Auftragnehmer wird die Auswirkungen auf Zeitplan und Vergütung innerhalb von 10 Arbeitstagen mitteilen. Die Änderung wird erst nach schriftlicher Bestätigung durch den Auftraggeber wirksam.',
    category: 'amendments',
    riskLevel: 'neutral',
    usageContext: 'Für IT-Projekte und agile Entwicklung',
    industryTags: ['it', 'dienstleistung'],
  },

  // =============================================
  // SALVATORISCHE KLAUSEL (3 Klauseln)
  // =============================================
  {
    id: 'severability-1',
    title: 'Standard Salvatorische Klausel',
    clauseText: 'Sollten einzelne Bestimmungen dieses Vertrages unwirksam oder undurchführbar sein oder werden, so berührt dies die Wirksamkeit der übrigen Bestimmungen nicht. Die Parteien verpflichten sich, die unwirksame Bestimmung durch eine wirksame Regelung zu ersetzen, die dem wirtschaftlichen Zweck der unwirksamen Bestimmung möglichst nahe kommt.',
    category: 'severability',
    riskLevel: 'neutral',
    usageContext: 'Standard-Absicherung gegen Teilnichtigkeit',
    industryTags: ['allgemein'],
    legalBasis: '§ 139 BGB',
  },
  {
    id: 'severability-2',
    title: 'Erweiterte Salvatorische Klausel',
    clauseText: 'Sollten einzelne Bestimmungen dieses Vertrages ganz oder teilweise unwirksam oder undurchführbar sein oder werden oder sollte sich eine Lücke in diesem Vertrag herausstellen, so wird hierdurch die Wirksamkeit der übrigen Bestimmungen nicht berührt. Anstelle der unwirksamen oder undurchführbaren Bestimmung oder zur Ausfüllung der Lücke gilt diejenige wirksame und durchführbare Regelung als vereinbart, die dem von den Parteien Gewollten wirtschaftlich am nächsten kommt.',
    category: 'severability',
    riskLevel: 'neutral',
    usageContext: 'Umfassende Absicherung inkl. Vertragslücken',
    industryTags: ['allgemein'],
  },
  {
    id: 'severability-3',
    title: 'Vollständigkeitsklausel',
    clauseText: 'Dieser Vertrag enthält alle Vereinbarungen der Parteien und ersetzt alle früheren schriftlichen und mündlichen Vereinbarungen. Es gibt keine Nebenabreden. Der Vertrag kann nur durch schriftliche Vereinbarung geändert werden.',
    category: 'severability',
    riskLevel: 'neutral',
    usageContext: 'Abgrenzung zu früheren Absprachen',
    industryTags: ['allgemein'],
  },
];

// Helper: Get clauses by category
export function getTemplateClausesByCategory(category: TemplateClause['category']): TemplateClause[] {
  return templateClauses.filter(c => c.category === category);
}

// Helper: Get clauses by industry
export function getTemplateClausesByIndustry(industry: TemplateClause['industryTags'][number]): TemplateClause[] {
  return templateClauses.filter(c => c.industryTags.includes(industry));
}

// Helper: Search clauses
export function searchTemplateClauses(query: string): TemplateClause[] {
  const lowerQuery = query.toLowerCase();
  return templateClauses.filter(c =>
    c.title.toLowerCase().includes(lowerQuery) ||
    c.clauseText.toLowerCase().includes(lowerQuery) ||
    c.usageContext.toLowerCase().includes(lowerQuery) ||
    c.legalBasis?.toLowerCase().includes(lowerQuery)
  );
}
