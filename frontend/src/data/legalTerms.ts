/**
 * Rechtslexikon für die Klausel-Bibliothek
 * 100+ deutsche Rechtsbegriffe mit Erklärungen
 */

import type { LegalTerm } from '../types/clauseLibrary';

export const legalTerms: LegalTerm[] = [
  // =============================================
  // A
  // =============================================
  {
    id: 'abfindung',
    term: 'Abfindung',
    simpleExplanation: 'Eine einmalige Geldzahlung, die ein Arbeitnehmer bei Beendigung des Arbeitsverhältnisses erhält - quasi eine "Entschädigung" für den Jobverlust.',
    legalDefinition: 'Einmalzahlung des Arbeitgebers an den Arbeitnehmer als Ausgleich für den Verlust des Arbeitsplatzes, typischerweise bei einvernehmlicher Beendigung des Arbeitsverhältnisses oder Kündigung.',
    examples: ['Im Aufhebungsvertrag wurde eine Abfindung von 3 Bruttomonatsgehältern vereinbart', 'Nach 10 Jahren Betriebszugehörigkeit erhielt sie eine Abfindung von 25.000 Euro'],
    relatedTerms: ['aufhebungsvertrag', 'kuendigung', 'kuendigungsschutz'],
    legalArea: 'arbeitsrecht',
    legalBasis: '§§ 9, 10 KSchG',
    letterGroup: 'A',
  },
  {
    id: 'agb',
    term: 'AGB (Allgemeine Geschäftsbedingungen)',
    simpleExplanation: 'Das "Kleingedruckte" in Verträgen - vorformulierte Vertragsbedingungen, die für viele Verträge verwendet werden.',
    legalDefinition: 'Für eine Vielzahl von Verträgen vorformulierte Vertragsbedingungen, die eine Vertragspartei der anderen bei Abschluss eines Vertrags stellt.',
    examples: ['Die Online-Shop-AGB regelten das Widerrufsrecht', 'Die AGB des Mobilfunkanbieters enthielten eine Mindestvertragslaufzeit'],
    relatedTerms: ['inhaltskontrolle', 'vertragsfreiheit'],
    legalArea: 'vertragsrecht',
    legalBasis: '§§ 305-310 BGB',
    letterGroup: 'A',
  },
  {
    id: 'anfechtung',
    term: 'Anfechtung',
    simpleExplanation: 'Das "Rückgängigmachen" einer Willenserklärung, wenn man z.B. getäuscht wurde oder sich geirrt hat.',
    legalDefinition: 'Einseitige empfangsbedürftige Willenserklärung, durch die eine anfechtbare Willenserklärung rückwirkend vernichtet wird.',
    examples: ['Der Vertrag wurde wegen arglistiger Täuschung angefochten', 'Wegen eines Tippfehlers im Preis konnte der Händler den Kaufvertrag anfechten'],
    relatedTerms: ['willenserklarung', 'tauschung', 'irrtum'],
    legalArea: 'vertragsrecht',
    legalBasis: '§§ 119, 123, 142 BGB',
    letterGroup: 'A',
  },
  {
    id: 'aufhebungsvertrag',
    term: 'Aufhebungsvertrag',
    simpleExplanation: 'Eine einvernehmliche Vereinbarung zwischen Arbeitgeber und Arbeitnehmer, das Arbeitsverhältnis zu beenden - beide sind sich einig.',
    legalDefinition: 'Vertrag zwischen Arbeitgeber und Arbeitnehmer, durch den das Arbeitsverhältnis im gegenseitigen Einvernehmen beendet wird.',
    examples: ['Der Aufhebungsvertrag sah eine Abfindung und ein wohlwollendes Zeugnis vor', 'Sie entschied sich für den Aufhebungsvertrag statt der betriebsbedingten Kündigung'],
    relatedTerms: ['abfindung', 'kuendigung', 'sperrzeit'],
    legalArea: 'arbeitsrecht',
    legalBasis: '§ 623 BGB (Schriftform)',
    letterGroup: 'A',
  },
  {
    id: 'auftragsverarbeitung',
    term: 'Auftragsverarbeitung (AVV)',
    simpleExplanation: 'Wenn ein Unternehmen einen Dienstleister beauftragt, personenbezogene Daten zu verarbeiten - z.B. ein Cloud-Anbieter.',
    legalDefinition: 'Die Verarbeitung personenbezogener Daten durch einen Auftragsverarbeiter im Auftrag eines Verantwortlichen auf Grundlage eines Vertrags.',
    examples: ['Mit dem Cloud-Anbieter wurde ein AVV abgeschlossen', 'Der IT-Dienstleister verarbeitet Kundendaten als Auftragsverarbeiter'],
    relatedTerms: ['dsgvo', 'personenbezogene_daten', 'verantwortlicher'],
    legalArea: 'dsgvo',
    legalBasis: 'Art. 28 DSGVO',
    letterGroup: 'A',
  },

  // =============================================
  // B
  // =============================================
  {
    id: 'befristung',
    term: 'Befristung',
    simpleExplanation: 'Ein Arbeitsverhältnis mit festgelegtem Enddatum - der Vertrag endet automatisch, ohne dass jemand kündigen muss.',
    legalDefinition: 'Zeitliche Begrenzung eines Arbeitsverhältnisses, das durch Zeitablauf endet, ohne dass es einer Kündigung bedarf.',
    examples: ['Der befristete Vertrag endete nach 2 Jahren automatisch', 'Die Befristung war sachlich begründet wegen Elternzeitvertretung'],
    relatedTerms: ['arbeitsvertrag', 'kuendigung', 'probezeit'],
    legalArea: 'arbeitsrecht',
    legalBasis: 'TzBfG (Teilzeit- und Befristungsgesetz)',
    letterGroup: 'B',
  },
  {
    id: 'betriebsuebergang',
    term: 'Betriebsübergang',
    simpleExplanation: 'Wenn ein Unternehmen (oder Teile davon) verkauft wird und die Mitarbeiter automatisch zum neuen Eigentümer wechseln.',
    legalDefinition: 'Der Übergang eines Betriebs oder Betriebsteils auf einen anderen Inhaber durch Rechtsgeschäft unter Wahrung der Identität des Betriebs.',
    examples: ['Nach dem Betriebsübergang gingen alle Arbeitsverträge auf den Käufer über', 'Die Mitarbeiter mussten über den Betriebsübergang informiert werden'],
    relatedTerms: ['arbeitsvertrag', 'kuendigungsschutz'],
    legalArea: 'arbeitsrecht',
    legalBasis: '§ 613a BGB',
    letterGroup: 'B',
  },
  {
    id: 'buergschaft',
    term: 'Bürgschaft',
    simpleExplanation: 'Jemand (der Bürge) verspricht, für die Schulden eines anderen einzustehen - eine Art "Garantie" für einen Kredit.',
    legalDefinition: 'Einseitig verpflichtender Vertrag, durch den sich der Bürge gegenüber dem Gläubiger verpflichtet, für die Verbindlichkeit eines Dritten einzustehen.',
    examples: ['Die Eltern übernahmen eine Bürgschaft für den Studienkredit', 'Die Bank verlangte eine selbstschuldnerische Bürgschaft'],
    relatedTerms: ['darlehen', 'sicherheit', 'glaeubiger'],
    legalArea: 'vertragsrecht',
    legalBasis: '§§ 765-778 BGB',
    letterGroup: 'B',
  },

  // =============================================
  // D
  // =============================================
  {
    id: 'darlehen',
    term: 'Darlehen',
    simpleExplanation: 'Ein Kredit - jemand leiht Geld und muss es später (meist mit Zinsen) zurückzahlen.',
    legalDefinition: 'Vertrag, durch den der Darlehensgeber verpflichtet wird, dem Darlehensnehmer einen Geldbetrag zur Verfügung zu stellen, und der Darlehensnehmer verpflichtet wird, das Darlehen zurückzuzahlen.',
    examples: ['Sie nahm ein Darlehen über 50.000 Euro für den Hauskauf auf', 'Das zinsloses Darlehen musste in 36 Monatsraten zurückgezahlt werden'],
    relatedTerms: ['zinsen', 'sicherheit', 'buergschaft'],
    legalArea: 'vertragsrecht',
    legalBasis: '§§ 488-498 BGB',
    letterGroup: 'D',
  },
  {
    id: 'datenpanne',
    term: 'Datenpanne (Data Breach)',
    simpleExplanation: 'Wenn personenbezogene Daten in falsche Hände geraten - z.B. durch Hackerangriffe oder versehentliches Versenden.',
    legalDefinition: 'Verletzung des Schutzes personenbezogener Daten, die zur Vernichtung, zum Verlust, zur Veränderung oder zur unbefugten Offenlegung führt.',
    examples: ['Nach der Datenpanne musste die Behörde innerhalb von 72 Stunden informiert werden', 'Durch den Hackerangriff wurden Kundendaten gestohlen'],
    relatedTerms: ['dsgvo', 'personenbezogene_daten', 'meldepflicht'],
    legalArea: 'dsgvo',
    legalBasis: 'Art. 33, 34 DSGVO',
    letterGroup: 'D',
  },
  {
    id: 'dienstvertrag',
    term: 'Dienstvertrag',
    simpleExplanation: 'Ein Vertrag, bei dem man für seine Arbeitsleistung (nicht für ein bestimmtes Ergebnis) bezahlt wird - wie beim Arzt oder Anwalt.',
    legalDefinition: 'Vertrag, durch den sich der Dienstverpflichtete zur Leistung der versprochenen Dienste und der Dienstberechtigte zur Gewährung der vereinbarten Vergütung verpflichtet.',
    examples: ['Der Beratervertrag war ein typischer Dienstvertrag', 'Beim Dienstvertrag wird die Tätigkeit, nicht der Erfolg geschuldet'],
    relatedTerms: ['werkvertrag', 'arbeitsvertrag'],
    legalArea: 'vertragsrecht',
    legalBasis: '§§ 611-630 BGB',
    letterGroup: 'D',
  },
  {
    id: 'dsgvo',
    term: 'DSGVO (Datenschutz-Grundverordnung)',
    simpleExplanation: 'Das EU-weite Datenschutzgesetz, das regelt, wie Unternehmen mit personenbezogenen Daten umgehen müssen.',
    legalDefinition: 'Europäische Verordnung zum Schutz natürlicher Personen bei der Verarbeitung personenbezogener Daten und zum freien Datenverkehr.',
    examples: ['Die Website brauchte wegen der DSGVO ein Cookie-Banner', 'Das Unternehmen wurde wegen DSGVO-Verstößen abgemahnt'],
    relatedTerms: ['personenbezogene_daten', 'einwilligung', 'auftragsverarbeitung'],
    legalArea: 'dsgvo',
    legalBasis: 'Verordnung (EU) 2016/679',
    letterGroup: 'D',
  },

  // =============================================
  // E
  // =============================================
  {
    id: 'eigentumsvorbehalt',
    term: 'Eigentumsvorbehalt',
    simpleExplanation: 'Der Verkäufer bleibt Eigentümer der Ware, bis sie vollständig bezahlt ist - eine Absicherung gegen Nichtzahlung.',
    legalDefinition: 'Vereinbarung, dass das Eigentum an der verkauften Sache erst mit vollständiger Kaufpreiszahlung auf den Käufer übergeht.',
    examples: ['Durch den Eigentumsvorbehalt konnte der Lieferant die Ware zurückfordern', 'Im B2B-Bereich ist der verlängerte Eigentumsvorbehalt üblich'],
    relatedTerms: ['kaufvertrag', 'sicherheit'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 449 BGB',
    letterGroup: 'E',
  },
  {
    id: 'einwilligung',
    term: 'Einwilligung (Datenschutz)',
    simpleExplanation: 'Die Zustimmung einer Person, dass ihre Daten verarbeitet werden dürfen - muss freiwillig und informiert erfolgen.',
    legalDefinition: 'Jede freiwillig, für den bestimmten Fall, in informierter Weise und unmissverständlich abgegebene Willensbekundung zur Datenverarbeitung.',
    examples: ['Für den Newsletter war eine ausdrückliche Einwilligung erforderlich', 'Die Einwilligung kann jederzeit widerrufen werden'],
    relatedTerms: ['dsgvo', 'personenbezogene_daten', 'widerruf'],
    legalArea: 'dsgvo',
    legalBasis: 'Art. 6 Abs. 1 lit. a, Art. 7 DSGVO',
    letterGroup: 'E',
  },
  {
    id: 'erfuellungsgehilfe',
    term: 'Erfüllungsgehilfe',
    simpleExplanation: 'Jemand, der bei der Vertragserfüllung hilft - der Hauptvertragspartner haftet für dessen Fehler.',
    legalDefinition: 'Person, die mit Wissen und Wollen des Schuldners bei der Erfüllung einer diesem obliegenden Verbindlichkeit als dessen Hilfsperson tätig wird.',
    examples: ['Der Subunternehmer handelte als Erfüllungsgehilfe', 'Für Fehler des Erfüllungsgehilfen haftet der Auftragnehmer'],
    relatedTerms: ['haftung', 'verschulden'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 278 BGB',
    letterGroup: 'E',
  },

  // =============================================
  // F
  // =============================================
  {
    id: 'force_majeure',
    term: 'Force Majeure (Höhere Gewalt)',
    simpleExplanation: 'Unvorhersehbare äußere Ereignisse wie Naturkatastrophen oder Kriege, die niemand verhindern kann.',
    legalDefinition: 'Ein von außen kommendes, keinen betrieblichen Zusammenhang aufweisendes, auch durch äußerste vernünftigerweise zu erwartende Sorgfalt nicht abwendbares Ereignis.',
    examples: ['Wegen der Pandemie konnte er sich auf höhere Gewalt berufen', 'Der Vulkanausbruch verhinderte die Lieferung - ein Fall von Force Majeure'],
    relatedTerms: ['unmoglichkeit', 'verzug'],
    legalArea: 'vertragsrecht',
    letterGroup: 'F',
  },
  {
    id: 'fristlose_kuendigung',
    term: 'Fristlose Kündigung',
    simpleExplanation: 'Sofortige Beendigung des Vertrags ohne Einhaltung einer Kündigungsfrist - nur bei schweren Verstößen möglich.',
    legalDefinition: 'Außerordentliche Kündigung ohne Einhaltung einer Kündigungsfrist aus wichtigem Grund, wenn dem Kündigenden die Fortsetzung des Vertragsverhältnisses nicht zugemutet werden kann.',
    examples: ['Nach dem Diebstahl erfolgte die fristlose Kündigung', 'Für eine fristlose Kündigung muss ein wichtiger Grund vorliegen'],
    relatedTerms: ['kuendigung', 'wichtiger_grund'],
    legalArea: 'arbeitsrecht',
    legalBasis: '§ 626 BGB',
    letterGroup: 'F',
  },

  // =============================================
  // G
  // =============================================
  {
    id: 'gewaehrleistung',
    term: 'Gewährleistung',
    simpleExplanation: 'Die gesetzliche Pflicht des Verkäufers, für Mängel der Kaufsache einzustehen - 2 Jahre beim Neukauf.',
    legalDefinition: 'Gesetzliche Haftung des Verkäufers für Sach- und Rechtsmängel der Kaufsache, die zum Zeitpunkt des Gefahrübergangs vorlagen.',
    examples: ['Wegen des Defekts konnte sie Gewährleistungsrechte geltend machen', 'Die Gewährleistungsfrist beträgt beim Verbrauchsgüterkauf 2 Jahre'],
    relatedTerms: ['mangel', 'nacherfuellung', 'garantie'],
    legalArea: 'vertragsrecht',
    legalBasis: '§§ 434 ff. BGB',
    letterGroup: 'G',
  },
  {
    id: 'garantie',
    term: 'Garantie',
    simpleExplanation: 'Eine freiwillige Zusicherung des Herstellers oder Verkäufers - geht oft über die gesetzliche Gewährleistung hinaus.',
    legalDefinition: 'Freiwillige, über die gesetzliche Gewährleistung hinausgehende Verpflichtung des Garantiegebers für die Beschaffenheit oder Haltbarkeit einer Sache.',
    examples: ['Die Herstellergarantie betrug 5 Jahre', 'Die Garantie umfasste auch Verschleißteile'],
    relatedTerms: ['gewaehrleistung', 'mangel'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 443 BGB',
    letterGroup: 'G',
  },
  {
    id: 'geschaeftsgeheimnis',
    term: 'Geschäftsgeheimnis',
    simpleExplanation: 'Vertrauliche Unternehmensinformationen mit wirtschaftlichem Wert, die geheim gehalten werden sollen.',
    legalDefinition: 'Information, die geheim ist, wirtschaftlichen Wert hat und Gegenstand von angemessenen Geheimhaltungsmaßnahmen ist.',
    examples: ['Die Rezeptur war ein streng gehütetes Geschäftsgeheimnis', 'Kundenlisten können Geschäftsgeheimnisse sein'],
    relatedTerms: ['geheimhaltung', 'wettbewerbsverbot'],
    legalArea: 'handelsrecht',
    legalBasis: 'GeschGehG',
    letterGroup: 'G',
  },
  {
    id: 'glaeubiger',
    term: 'Gläubiger',
    simpleExplanation: 'Derjenige, dem etwas geschuldet wird - zum Beispiel der Verkäufer, dem der Kaufpreis zusteht.',
    legalDefinition: 'Derjenige, der aus einem Schuldverhältnis berechtigt ist, von dem Schuldner eine Leistung zu fordern.',
    examples: ['Die Bank war Gläubiger des Darlehens', 'Als Gläubiger konnte er die Zahlung einfordern'],
    relatedTerms: ['schuldner', 'forderung'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 241 BGB',
    letterGroup: 'G',
  },

  // =============================================
  // H
  // =============================================
  {
    id: 'haftung',
    term: 'Haftung',
    simpleExplanation: 'Die rechtliche Verantwortung für Schäden - wer einen Schaden verursacht, muss ihn ersetzen.',
    legalDefinition: 'Die rechtliche Verpflichtung zum Ersatz eines Schadens, der durch eigenes oder zurechenbares fremdes Verhalten entstanden ist.',
    examples: ['Die Haftung war auf grobe Fahrlässigkeit beschränkt', 'Er musste für den entstandenen Schaden haften'],
    relatedTerms: ['schadensersatz', 'verschulden', 'fahrlassigkeit'],
    legalArea: 'vertragsrecht',
    legalBasis: '§§ 276, 280 BGB',
    letterGroup: 'H',
  },
  {
    id: 'handelsregister',
    term: 'Handelsregister',
    simpleExplanation: 'Das öffentliche Verzeichnis, in dem alle Kaufleute und Handelsgesellschaften eingetragen sind.',
    legalDefinition: 'Öffentliches Register zur Eintragung kaufmännischer Tatsachen, das beim zuständigen Amtsgericht geführt wird.',
    examples: ['Die GmbH wurde ins Handelsregister eingetragen', 'Der Geschäftsführerwechsel muss zum Handelsregister angemeldet werden'],
    relatedTerms: ['kaufmann', 'gmbh', 'firma'],
    legalArea: 'handelsrecht',
    legalBasis: '§§ 8 ff. HGB',
    letterGroup: 'H',
  },

  // =============================================
  // I
  // =============================================
  {
    id: 'inhaltskontrolle',
    term: 'Inhaltskontrolle (AGB)',
    simpleExplanation: 'Gerichte prüfen, ob Klauseln in AGB den Vertragspartner unangemessen benachteiligen.',
    legalDefinition: 'Gerichtliche Überprüfung von AGB-Klauseln auf ihre Vereinbarkeit mit wesentlichen Grundgedanken der gesetzlichen Regelung.',
    examples: ['Die Klausel hielt der Inhaltskontrolle nicht stand', 'Unangemessene Benachteiligungen führen zur Unwirksamkeit'],
    relatedTerms: ['agb', 'vertragsfreiheit'],
    legalArea: 'vertragsrecht',
    legalBasis: '§§ 307-309 BGB',
    letterGroup: 'I',
  },
  {
    id: 'insolvenz',
    term: 'Insolvenz',
    simpleExplanation: 'Zahlungsunfähigkeit eines Unternehmens oder einer Person - die Schulden können nicht mehr bezahlt werden.',
    legalDefinition: 'Die Unfähigkeit eines Schuldners, seinen fälligen Zahlungsverpflichtungen nachzukommen (Zahlungsunfähigkeit) oder drohende Zahlungsunfähigkeit bzw. Überschuldung.',
    examples: ['Das Unternehmen musste Insolvenz anmelden', 'In der Insolvenz werden alle Gläubiger gleichbehandelt'],
    relatedTerms: ['glaeubiger', 'schuldner'],
    legalArea: 'handelsrecht',
    legalBasis: 'InsO',
    letterGroup: 'I',
  },
  {
    id: 'irrtum',
    term: 'Irrtum',
    simpleExplanation: 'Ein Fehler beim Vertragsabschluss - man dachte etwas anderes, als man erklärt hat.',
    legalDefinition: 'Das unbewusste Auseinanderfallen von Wille und Erklärung (Erklärungsirrtum) oder falsche Vorstellung über verkehrswesentliche Eigenschaften (Inhaltsirrtum).',
    examples: ['Der Tippfehler im Preis war ein Erklärungsirrtum', 'Wegen des Irrtums konnte der Vertrag angefochten werden'],
    relatedTerms: ['anfechtung', 'willenserklarung'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 119 BGB',
    letterGroup: 'I',
  },

  // =============================================
  // K
  // =============================================
  {
    id: 'kaufvertrag',
    term: 'Kaufvertrag',
    simpleExplanation: 'Der klassische Vertrag: Ware gegen Geld - Verkäufer übergibt die Sache, Käufer zahlt den Preis.',
    legalDefinition: 'Gegenseitiger Vertrag, durch den sich der Verkäufer zur Übergabe und Eigentumsverschaffung einer Sache und der Käufer zur Zahlung des Kaufpreises verpflichtet.',
    examples: ['Der Kaufvertrag über das Auto wurde schriftlich geschlossen', 'Online-Bestellungen sind Kaufverträge'],
    relatedTerms: ['gewaehrleistung', 'eigentumsvorbehalt', 'mangel'],
    legalArea: 'vertragsrecht',
    legalBasis: '§§ 433 ff. BGB',
    letterGroup: 'K',
  },
  {
    id: 'kaufmann',
    term: 'Kaufmann',
    simpleExplanation: 'Wer ein Handelsgewerbe betreibt und im Handelsregister eingetragen ist - für Kaufleute gelten besondere Regeln.',
    legalDefinition: 'Wer ein Handelsgewerbe betreibt. Für den Kaufmann gelten die Vorschriften des Handelsgesetzbuches.',
    examples: ['Als Kaufmann war er zur doppelten Buchführung verpflichtet', 'Kaufleute können Gerichtsstandsvereinbarungen treffen'],
    relatedTerms: ['handelsregister', 'hgb'],
    legalArea: 'handelsrecht',
    legalBasis: '§ 1 HGB',
    letterGroup: 'K',
  },
  {
    id: 'kaution',
    term: 'Kaution',
    simpleExplanation: 'Eine Sicherheitsleistung beim Mietvertrag - Geld, das der Mieter hinterlegt für eventuelle Schäden.',
    legalDefinition: 'Geldsumme, die der Mieter dem Vermieter als Sicherheit für seine Verpflichtungen aus dem Mietverhältnis leistet.',
    examples: ['Die Kaution betrug drei Monatsmieten', 'Nach dem Auszug wurde die Kaution zurückgezahlt'],
    relatedTerms: ['mietvertrag', 'sicherheit'],
    legalArea: 'mietrecht',
    legalBasis: '§ 551 BGB',
    letterGroup: 'K',
  },
  {
    id: 'kuendigung',
    term: 'Kündigung',
    simpleExplanation: 'Die einseitige Beendigung eines Vertrags - eine Partei erklärt, dass der Vertrag enden soll.',
    legalDefinition: 'Einseitige empfangsbedürftige Willenserklärung, durch die ein Dauerschuldverhältnis für die Zukunft beendet wird.',
    examples: ['Die Kündigung muss schriftlich erfolgen', 'Er kündigte den Arbeitsvertrag zum Monatsende'],
    relatedTerms: ['kuendigungsfrist', 'fristlose_kuendigung', 'aufhebungsvertrag'],
    legalArea: 'arbeitsrecht',
    legalBasis: '§ 620 BGB, § 622 BGB',
    letterGroup: 'K',
  },
  {
    id: 'kuendigungsfrist',
    term: 'Kündigungsfrist',
    simpleExplanation: 'Der Zeitraum zwischen Kündigung und tatsächlichem Vertragsende - oft abhängig von der Beschäftigungsdauer.',
    legalDefinition: 'Der Zeitraum, der zwischen dem Zugang der Kündigung und dem Ende des Vertragsverhältnisses liegen muss.',
    examples: ['Die gesetzliche Kündigungsfrist beträgt 4 Wochen', 'Nach 10 Jahren Betriebszugehörigkeit galt eine Frist von 4 Monaten'],
    relatedTerms: ['kuendigung', 'arbeitsvertrag'],
    legalArea: 'arbeitsrecht',
    legalBasis: '§ 622 BGB',
    letterGroup: 'K',
  },
  {
    id: 'kuendigungsschutz',
    term: 'Kündigungsschutz',
    simpleExplanation: 'Gesetzlicher Schutz vor willkürlichen Kündigungen - der Arbeitgeber braucht einen Grund.',
    legalDefinition: 'Gesetzlicher Schutz des Arbeitnehmers vor sozial ungerechtfertigten Kündigungen in Betrieben mit mehr als 10 Arbeitnehmern.',
    examples: ['Der Kündigungsschutz greift erst nach 6 Monaten', 'Die Kündigung war sozial ungerechtfertigt'],
    relatedTerms: ['kuendigung', 'sozialauswahl'],
    legalArea: 'arbeitsrecht',
    legalBasis: 'KSchG',
    letterGroup: 'K',
  },

  // =============================================
  // L
  // =============================================
  {
    id: 'lizenz',
    term: 'Lizenz',
    simpleExplanation: 'Die Erlaubnis, etwas zu nutzen, was jemand anderem gehört - z.B. Software oder Patente.',
    legalDefinition: 'Die vertragliche Einräumung des Rechts zur Nutzung von gewerblichen Schutzrechten oder Urheberrechten.',
    examples: ['Die Softwarelizenz erlaubte die Nutzung auf 5 Geräten', 'Für das Patent wurde eine exklusive Lizenz erteilt'],
    relatedTerms: ['urheberrecht', 'patent'],
    legalArea: 'vertragsrecht',
    letterGroup: 'L',
  },

  // =============================================
  // M
  // =============================================
  {
    id: 'mahnung',
    term: 'Mahnung',
    simpleExplanation: 'Die Aufforderung an den Schuldner, endlich zu zahlen - setzt oft den Verzug in Gang.',
    legalDefinition: 'Eine eindeutige und bestimmte Aufforderung des Gläubigers an den Schuldner, die geschuldete Leistung zu erbringen.',
    examples: ['Nach der zweiten Mahnung wurde ein Inkassobüro eingeschaltet', 'Die Mahnung setzte den Schuldner in Verzug'],
    relatedTerms: ['verzug', 'forderung', 'glaeubiger'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 286 BGB',
    letterGroup: 'M',
  },
  {
    id: 'mangel',
    term: 'Mangel',
    simpleExplanation: 'Wenn die Kaufsache nicht so ist, wie sie sein sollte - kaputt, falsch oder anders als vereinbart.',
    legalDefinition: 'Abweichung der tatsächlichen Beschaffenheit einer Sache von der vereinbarten oder üblicherweise zu erwartenden Beschaffenheit.',
    examples: ['Der Kratzer im Display war ein Sachmangel', 'Auch fehlende Funktionen können Mängel sein'],
    relatedTerms: ['gewaehrleistung', 'nacherfuellung'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 434 BGB',
    letterGroup: 'M',
  },
  {
    id: 'mietvertrag',
    term: 'Mietvertrag',
    simpleExplanation: 'Der Vertrag zwischen Vermieter und Mieter - man darf eine Sache (meist Wohnung) gegen Geld nutzen.',
    legalDefinition: 'Gegenseitiger Vertrag, durch den sich der Vermieter zur Überlassung des Gebrauchs einer Sache und der Mieter zur Zahlung der vereinbarten Miete verpflichtet.',
    examples: ['Der Mietvertrag wurde unbefristet geschlossen', 'Im Mietvertrag war eine Staffelmiete vereinbart'],
    relatedTerms: ['kaution', 'kuendigung', 'nebenkosten'],
    legalArea: 'mietrecht',
    legalBasis: '§§ 535 ff. BGB',
    letterGroup: 'M',
  },
  {
    id: 'minderung',
    term: 'Minderung',
    simpleExplanation: 'Die Herabsetzung des Kaufpreises, wenn die Sache einen Mangel hat.',
    legalDefinition: 'Das Gestaltungsrecht des Käufers bei einem Mangel der Kaufsache, den Kaufpreis entsprechend dem Wertverlust herabzusetzen.',
    examples: ['Wegen des Kratzers minderte er den Preis um 100 Euro', 'Die Minderung war verhältnismäßig zum Wertverlust'],
    relatedTerms: ['mangel', 'gewaehrleistung', 'ruecktritt'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 441 BGB',
    letterGroup: 'M',
  },

  // =============================================
  // N
  // =============================================
  {
    id: 'nacherfuellung',
    term: 'Nacherfüllung',
    simpleExplanation: 'Der Verkäufer muss den Mangel beseitigen - entweder reparieren oder eine mangelfreie Sache liefern.',
    legalDefinition: 'Das Recht des Käufers bei Mängeln, vom Verkäufer nach dessen Wahl Beseitigung des Mangels oder Lieferung einer mangelfreien Sache zu verlangen.',
    examples: ['Der Händler bot Nacherfüllung durch Reparatur an', 'Erst nach gescheiterter Nacherfüllung kann man zurücktreten'],
    relatedTerms: ['mangel', 'gewaehrleistung', 'ruecktritt'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 439 BGB',
    letterGroup: 'N',
  },
  {
    id: 'nebenkosten',
    term: 'Nebenkosten (Betriebskosten)',
    simpleExplanation: 'Die zusätzlichen Kosten zur Miete - Heizung, Wasser, Müllabfuhr und ähnliches.',
    legalDefinition: 'Die Kosten, die dem Eigentümer durch das Eigentum am Grundstück oder durch den bestimmungsgemäßen Gebrauch entstehen.',
    examples: ['Die Nebenkostenabrechnung kam im Juni', 'Heizkosten machten den größten Teil der Nebenkosten aus'],
    relatedTerms: ['mietvertrag', 'kaution'],
    legalArea: 'mietrecht',
    legalBasis: '§ 556 BGB, BetrKV',
    letterGroup: 'N',
  },

  // =============================================
  // P
  // =============================================
  {
    id: 'personenbezogene_daten',
    term: 'Personenbezogene Daten',
    simpleExplanation: 'Alle Informationen, die sich auf eine bestimmte Person beziehen - Name, Adresse, E-Mail, IP-Adresse...',
    legalDefinition: 'Alle Informationen, die sich auf eine identifizierte oder identifizierbare natürliche Person beziehen.',
    examples: ['E-Mail-Adressen sind personenbezogene Daten', 'Auch IP-Adressen können personenbezogen sein'],
    relatedTerms: ['dsgvo', 'einwilligung', 'datenpanne'],
    legalArea: 'dsgvo',
    legalBasis: 'Art. 4 Nr. 1 DSGVO',
    letterGroup: 'P',
  },
  {
    id: 'probezeit',
    term: 'Probezeit',
    simpleExplanation: 'Die erste Phase des Arbeitsverhältnisses, in der beide Seiten leichter kündigen können.',
    legalDefinition: 'Ein zu Beginn des Arbeitsverhältnisses vereinbarter Zeitraum (maximal 6 Monate), während dessen eine verkürzte Kündigungsfrist von zwei Wochen gilt.',
    examples: ['Die Probezeit dauerte 6 Monate', 'In der Probezeit kann mit 2 Wochen Frist gekündigt werden'],
    relatedTerms: ['arbeitsvertrag', 'kuendigung', 'kuendigungsfrist'],
    legalArea: 'arbeitsrecht',
    legalBasis: '§ 622 Abs. 3 BGB',
    letterGroup: 'P',
  },
  {
    id: 'prokura',
    term: 'Prokura',
    simpleExplanation: 'Eine besonders weitreichende Vollmacht im Handelsrecht - der Prokurist darf fast alles für das Unternehmen unterschreiben.',
    legalDefinition: 'Eine handelsrechtliche Vollmacht, die zu allen Arten von gerichtlichen und außergerichtlichen Geschäften und Rechtshandlungen ermächtigt, die der Betrieb eines Handelsgewerbes mit sich bringt.',
    examples: ['Als Prokurist konnte er Verträge im Namen der Firma unterzeichnen', 'Die Prokura wurde ins Handelsregister eingetragen'],
    relatedTerms: ['vollmacht', 'handelsregister', 'kaufmann'],
    legalArea: 'handelsrecht',
    legalBasis: '§§ 48-53 HGB',
    letterGroup: 'P',
  },

  // =============================================
  // R
  // =============================================
  {
    id: 'ruecktritt',
    term: 'Rücktritt',
    simpleExplanation: 'Der Ausstieg aus einem Vertrag - man macht alles rückgängig, als hätte es den Vertrag nie gegeben.',
    legalDefinition: 'Gestaltungsrecht, durch dessen Ausübung ein Schuldverhältnis rückwirkend in ein Rückgewährschuldverhältnis umgewandelt wird.',
    examples: ['Nach erfolgloser Nachbesserung trat sie vom Kaufvertrag zurück', 'Der Rücktritt wurde per Einschreiben erklärt'],
    relatedTerms: ['mangel', 'gewaehrleistung', 'widerruf'],
    legalArea: 'vertragsrecht',
    legalBasis: '§§ 346 ff. BGB',
    letterGroup: 'R',
  },

  // =============================================
  // S
  // =============================================
  {
    id: 'salvatorische_klausel',
    term: 'Salvatorische Klausel',
    simpleExplanation: 'Eine Klausel, die sicherstellt, dass der Rest des Vertrags gültig bleibt, auch wenn ein Teil unwirksam ist.',
    legalDefinition: 'Vertragsklausel, die bestimmt, dass die Unwirksamkeit einzelner Vertragsbestimmungen die Wirksamkeit des übrigen Vertrags nicht berührt.',
    examples: ['Die salvatorische Klausel rettete den Vertrag', 'Trotz der unwirksamen Klausel blieb der Vertrag bestehen'],
    relatedTerms: ['agb', 'vertragsfreiheit'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 139 BGB',
    letterGroup: 'S',
  },
  {
    id: 'schadensersatz',
    term: 'Schadensersatz',
    simpleExplanation: 'Die Pflicht, einen verursachten Schaden auszugleichen - meist durch Geldzahlung.',
    legalDefinition: 'Die Verpflichtung des Schädigers, den Zustand herzustellen, der bestehen würde, wenn der zum Ersatz verpflichtende Umstand nicht eingetreten wäre.',
    examples: ['Er forderte Schadensersatz für den Wasserschaden', 'Der Schadensersatz umfasste auch den entgangenen Gewinn'],
    relatedTerms: ['haftung', 'verschulden'],
    legalArea: 'vertragsrecht',
    legalBasis: '§§ 249 ff. BGB',
    letterGroup: 'S',
  },
  {
    id: 'schriftform',
    term: 'Schriftform',
    simpleExplanation: 'Die Anforderung, dass etwas schriftlich mit eigenhändiger Unterschrift erklärt werden muss.',
    legalDefinition: 'Formerfordernis, bei dem die Erklärung in einer Urkunde niedergelegt und eigenhändig durch Namensunterschrift unterzeichnet werden muss.',
    examples: ['Die Kündigung eines Arbeitsvertrags bedarf der Schriftform', 'E-Mails erfüllen nicht die Schriftform nach § 126 BGB'],
    relatedTerms: ['textform', 'willenserklarung'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 126 BGB',
    letterGroup: 'S',
  },
  {
    id: 'schuldner',
    term: 'Schuldner',
    simpleExplanation: 'Derjenige, der etwas leisten muss - zum Beispiel der Käufer, der den Preis zahlen muss.',
    legalDefinition: 'Derjenige, der aus einem Schuldverhältnis verpflichtet ist, dem Gläubiger eine Leistung zu erbringen.',
    examples: ['Als Schuldner musste er die Rechnung bezahlen', 'Der Schuldner kam mit der Zahlung in Verzug'],
    relatedTerms: ['glaeubiger', 'forderung', 'verzug'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 241 BGB',
    letterGroup: 'S',
  },
  {
    id: 'sperrzeit',
    term: 'Sperrzeit (Arbeitslosengeld)',
    simpleExplanation: 'Ein Zeitraum, in dem man kein Arbeitslosengeld bekommt - z.B. wenn man selbst gekündigt hat.',
    legalDefinition: 'Der Zeitraum, für den der Anspruch auf Arbeitslosengeld ruht, weil der Arbeitnehmer sein Arbeitsverhältnis selbst aufgelöst oder durch vertragswidriges Verhalten Anlass zur Kündigung gegeben hat.',
    examples: ['Nach der Eigenkündigung drohte eine Sperrzeit', 'Der Aufhebungsvertrag führte zu einer 12-wöchigen Sperrzeit'],
    relatedTerms: ['kuendigung', 'aufhebungsvertrag'],
    legalArea: 'arbeitsrecht',
    legalBasis: '§ 159 SGB III',
    letterGroup: 'S',
  },
  {
    id: 'sozialauswahl',
    term: 'Sozialauswahl',
    simpleExplanation: 'Bei betriebsbedingten Kündigungen muss der Arbeitgeber prüfen, wer den Job am meisten braucht.',
    legalDefinition: 'Die Auswahl der zu kündigenden Arbeitnehmer unter Berücksichtigung sozialer Gesichtspunkte (Betriebszugehörigkeit, Lebensalter, Unterhaltspflichten, Schwerbehinderung).',
    examples: ['Die Sozialauswahl war fehlerhaft durchgeführt worden', 'Der jüngere Kollege ohne Familie wurde zuerst gekündigt'],
    relatedTerms: ['kuendigung', 'kuendigungsschutz'],
    legalArea: 'arbeitsrecht',
    legalBasis: '§ 1 Abs. 3 KSchG',
    letterGroup: 'S',
  },

  // =============================================
  // T
  // =============================================
  {
    id: 'textform',
    term: 'Textform',
    simpleExplanation: 'Eine lesbare Erklärung auf einem dauerhaften Datenträger - E-Mail oder Fax reichen aus.',
    legalDefinition: 'Formerfordernis, bei dem die Erklärung in einer Urkunde oder auf andere zur dauerhaften Wiedergabe in Schriftzeichen geeignete Weise abgegeben und die Person des Erklärenden genannt werden muss.',
    examples: ['Die Widerrufsbelehrung kann in Textform erfolgen', 'E-Mails erfüllen die Textform'],
    relatedTerms: ['schriftform', 'willenserklarung'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 126b BGB',
    letterGroup: 'T',
  },

  // =============================================
  // U
  // =============================================
  {
    id: 'unmoglichkeit',
    term: 'Unmöglichkeit',
    simpleExplanation: 'Wenn die versprochene Leistung nicht mehr erbracht werden kann - z.B. die Ware ist verbrannt.',
    legalDefinition: 'Der Leistungsausschluss tritt ein, wenn die Leistung dem Schuldner oder jedermann unmöglich ist.',
    examples: ['Durch den Brand wurde die Lieferung unmöglich', 'Bei Unmöglichkeit entfällt die Leistungspflicht'],
    relatedTerms: ['verzug', 'schadensersatz'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 275 BGB',
    letterGroup: 'U',
  },
  {
    id: 'urheberrecht',
    term: 'Urheberrecht',
    simpleExplanation: 'Das Recht des Schöpfers an seinem Werk - Texte, Bilder, Musik, Software...',
    legalDefinition: 'Das subjektive Recht des Urhebers an seinem Werk, das die geistige und persönliche Beziehung des Urhebers zu seinem Werk schützt und die Nutzung regelt.',
    examples: ['Das Foto war urheberrechtlich geschützt', 'Die Nutzung erforderte eine Lizenz des Urhebers'],
    relatedTerms: ['lizenz', 'nutzungsrecht'],
    legalArea: 'allgemein',
    legalBasis: 'UrhG',
    letterGroup: 'U',
  },

  // =============================================
  // V
  // =============================================
  {
    id: 'verantwortlicher',
    term: 'Verantwortlicher (DSGVO)',
    simpleExplanation: 'Wer entscheidet, warum und wie personenbezogene Daten verarbeitet werden - meist das Unternehmen selbst.',
    legalDefinition: 'Die natürliche oder juristische Person, die allein oder gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung personenbezogener Daten entscheidet.',
    examples: ['Das Unternehmen war Verantwortlicher im Sinne der DSGVO', 'Der Verantwortliche muss die Betroffenenrechte gewährleisten'],
    relatedTerms: ['dsgvo', 'auftragsverarbeitung'],
    legalArea: 'dsgvo',
    legalBasis: 'Art. 4 Nr. 7 DSGVO',
    letterGroup: 'V',
  },
  {
    id: 'verjaehrung',
    term: 'Verjährung',
    simpleExplanation: 'Nach einer bestimmten Zeit kann man seinen Anspruch nicht mehr durchsetzen - er ist "verjährt".',
    legalDefinition: 'Der Zeitablauf, nach dem der Schuldner berechtigt ist, die Leistung zu verweigern, auch wenn der Anspruch noch besteht.',
    examples: ['Die Gewährleistungsansprüche waren nach 2 Jahren verjährt', 'Die Verjährung wurde durch Klageerhebung gehemmt'],
    relatedTerms: ['frist', 'anspruch'],
    legalArea: 'allgemein',
    legalBasis: '§§ 194 ff. BGB',
    letterGroup: 'V',
  },
  {
    id: 'verschulden',
    term: 'Verschulden',
    simpleExplanation: 'Vorsatz oder Fahrlässigkeit - man hat den Schaden absichtlich oder unvorsichtig verursacht.',
    legalDefinition: 'Der Schuldner hat Vorsatz und Fahrlässigkeit zu vertreten. Fahrlässig handelt, wer die im Verkehr erforderliche Sorgfalt außer Acht lässt.',
    examples: ['Ohne Verschulden keine Haftung', 'Grobe Fahrlässigkeit liegt vor bei besonders schwerem Sorgfaltspflichtverstoß'],
    relatedTerms: ['haftung', 'fahrlassigkeit', 'vorsatz'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 276 BGB',
    letterGroup: 'V',
  },
  {
    id: 'vertragsfreiheit',
    term: 'Vertragsfreiheit',
    simpleExplanation: 'Jeder darf selbst entscheiden, ob und mit wem er einen Vertrag schließt und was drin steht.',
    legalDefinition: 'Grundsatz des Privatrechts, der die Freiheit umfasst, Verträge zu schließen (Abschlussfreiheit), den Vertragspartner zu wählen und den Vertragsinhalt frei zu gestalten (Inhaltsfreiheit).',
    examples: ['Die Vertragsfreiheit erlaubt individuelle Vereinbarungen', 'Die Vertragsfreiheit wird durch AGB-Recht eingeschränkt'],
    relatedTerms: ['agb', 'inhaltskontrolle'],
    legalArea: 'vertragsrecht',
    legalBasis: 'Art. 2 Abs. 1 GG',
    letterGroup: 'V',
  },
  {
    id: 'vertragsstrafe',
    term: 'Vertragsstrafe',
    simpleExplanation: 'Eine im Voraus vereinbarte Strafzahlung bei Vertragsverstoß - ohne Schadensnachweis.',
    legalDefinition: 'Eine Vereinbarung, wonach der Schuldner im Falle der Nichterfüllung oder nicht gehörigen Erfüllung seiner Verbindlichkeit eine Geldstrafe zu zahlen hat.',
    examples: ['Die Vertragsstrafe bei Terminüberschreitung betrug 1% pro Woche', 'Die Vertragsstrafe war auf 10% des Auftragswertes begrenzt'],
    relatedTerms: ['schadensersatz', 'haftung'],
    legalArea: 'vertragsrecht',
    legalBasis: '§§ 339-345 BGB',
    letterGroup: 'V',
  },
  {
    id: 'verzug',
    term: 'Verzug',
    simpleExplanation: 'Wenn jemand nicht rechtzeitig zahlt oder liefert - man ist "im Rückstand".',
    legalDefinition: 'Der Schuldner kommt in Verzug, wenn er auf eine Mahnung des Gläubigers nicht leistet oder die Leistung nicht nach dem Kalender bestimmten Zeitpunkt erbringt.',
    examples: ['Der Schuldner kam nach der Mahnung in Verzug', 'Im Verzug muss er Verzugszinsen zahlen'],
    relatedTerms: ['mahnung', 'schuldner', 'glaeubiger'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 286 BGB',
    letterGroup: 'V',
  },
  {
    id: 'vollmacht',
    term: 'Vollmacht',
    simpleExplanation: 'Die Erlaubnis, für jemand anderen rechtlich zu handeln - z.B. Verträge zu unterschreiben.',
    legalDefinition: 'Die durch Rechtsgeschäft erteilte Vertretungsmacht, die den Bevollmächtigten berechtigt, im Namen des Vollmachtgebers zu handeln.',
    examples: ['Er hatte Vollmacht zum Vertragsabschluss', 'Die Vollmacht wurde widerrufen'],
    relatedTerms: ['prokura', 'vertretung'],
    legalArea: 'vertragsrecht',
    legalBasis: '§§ 164 ff. BGB',
    letterGroup: 'V',
  },
  {
    id: 'vorsatz',
    term: 'Vorsatz',
    simpleExplanation: 'Man hat den Schaden absichtlich verursacht - man wusste und wollte es.',
    legalDefinition: 'Das Wissen und Wollen der Tatbestandsverwirklichung. Bedingter Vorsatz liegt vor, wenn der Handelnde die Tatbestandsverwirklichung für möglich hält und billigend in Kauf nimmt.',
    examples: ['Vorsätzliche Pflichtverletzungen führen immer zur Haftung', 'Haftungsausschlüsse für Vorsatz sind unwirksam'],
    relatedTerms: ['verschulden', 'fahrlassigkeit', 'haftung'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 276 BGB',
    letterGroup: 'V',
  },

  // =============================================
  // W
  // =============================================
  {
    id: 'werkvertrag',
    term: 'Werkvertrag',
    simpleExplanation: 'Ein Vertrag, bei dem ein bestimmtes Ergebnis geschuldet wird - anders als beim Dienstvertrag.',
    legalDefinition: 'Vertrag, durch den sich der Unternehmer zur Herstellung des versprochenen Werkes und der Besteller zur Zahlung der vereinbarten Vergütung verpflichtet.',
    examples: ['Der Bauvertrag war ein Werkvertrag', 'Beim Werkvertrag wird der Erfolg geschuldet'],
    relatedTerms: ['dienstvertrag', 'abnahme', 'mangel'],
    legalArea: 'vertragsrecht',
    legalBasis: '§§ 631 ff. BGB',
    letterGroup: 'W',
  },
  {
    id: 'wettbewerbsverbot',
    term: 'Wettbewerbsverbot',
    simpleExplanation: 'Das Verbot, für einen Konkurrenten zu arbeiten oder ein Konkurrenzunternehmen zu gründen.',
    legalDefinition: 'Vertragliche Vereinbarung, die es dem Arbeitnehmer untersagt, während oder nach dem Arbeitsverhältnis in Wettbewerb zum Arbeitgeber zu treten.',
    examples: ['Das nachvertragliche Wettbewerbsverbot galt für 2 Jahre', 'Ohne Karenzentschädigung war das Verbot unwirksam'],
    relatedTerms: ['arbeitsvertrag', 'geschaeftsgeheimnis'],
    legalArea: 'arbeitsrecht',
    legalBasis: '§§ 74 ff. HGB',
    letterGroup: 'W',
  },
  {
    id: 'wichtiger_grund',
    term: 'Wichtiger Grund',
    simpleExplanation: 'Ein schwerwiegender Anlass, der eine fristlose Kündigung rechtfertigt.',
    legalDefinition: 'Ein Umstand, der es dem Kündigenden unter Berücksichtigung aller Umstände des Einzelfalls und unter Abwägung der beiderseitigen Interessen unzumutbar macht, das Vertragsverhältnis fortzusetzen.',
    examples: ['Diebstahl ist ein wichtiger Grund für fristlose Kündigung', 'Ob ein wichtiger Grund vorliegt, ist im Einzelfall zu prüfen'],
    relatedTerms: ['fristlose_kuendigung', 'kuendigung'],
    legalArea: 'arbeitsrecht',
    legalBasis: '§ 626 BGB',
    letterGroup: 'W',
  },
  {
    id: 'widerruf',
    term: 'Widerruf',
    simpleExplanation: 'Das Rückgängigmachen eines Vertrags bei Fernabsatzgeschäften - 14 Tage Bedenkzeit.',
    legalDefinition: 'Das Gestaltungsrecht des Verbrauchers, sich innerhalb der Widerrufsfrist von einem Vertrag zu lösen, insbesondere bei Fernabsatzverträgen.',
    examples: ['Die Online-Bestellung wurde innerhalb von 14 Tagen widerrufen', 'Der Händler erstattete nach dem Widerruf den Kaufpreis'],
    relatedTerms: ['fernabsatz', 'verbraucher', 'ruecktritt'],
    legalArea: 'vertragsrecht',
    legalBasis: '§§ 355 ff. BGB',
    letterGroup: 'W',
  },
  {
    id: 'willenserklarung',
    term: 'Willenserklärung',
    simpleExplanation: 'Die Äußerung eines rechtlichen Willens - z.B. "Ich kaufe dieses Auto für 10.000 Euro".',
    legalDefinition: 'Die Äußerung eines auf einen rechtlichen Erfolg gerichteten Willens, die unmittelbar auf die Herbeiführung einer Rechtsfolge gerichtet ist.',
    examples: ['Der Kaufvertrag kam durch zwei übereinstimmende Willenserklärungen zustande', 'Die Willenserklärung wurde per E-Mail abgegeben'],
    relatedTerms: ['anfechtung', 'irrtum', 'vertrag'],
    legalArea: 'vertragsrecht',
    legalBasis: '§§ 116 ff. BGB',
    letterGroup: 'W',
  },

  // =============================================
  // Z
  // =============================================
  {
    id: 'zeugnis',
    term: 'Arbeitszeugnis',
    simpleExplanation: 'Die Beurteilung des Arbeitnehmers durch den Arbeitgeber - jeder hat Anspruch auf ein Zeugnis.',
    legalDefinition: 'Eine vom Arbeitgeber ausgestellte Urkunde über Art und Dauer des Arbeitsverhältnisses (einfaches Zeugnis) oder zusätzlich über Leistung und Verhalten (qualifiziertes Zeugnis).',
    examples: ['Er verlangte ein qualifiziertes Arbeitszeugnis', 'Das Zeugnis muss wohlwollend formuliert sein'],
    relatedTerms: ['arbeitsvertrag', 'kuendigung'],
    legalArea: 'arbeitsrecht',
    legalBasis: '§ 109 GewO',
    letterGroup: 'Z',
  },
  {
    id: 'zinsen',
    term: 'Zinsen',
    simpleExplanation: 'Der Preis für das Ausleihen von Geld - der Schuldner zahlt mehr zurück als er bekommen hat.',
    legalDefinition: 'Die laufzeitabhängige Vergütung für die Überlassung von Kapital, berechnet als Prozentsatz der Hauptforderung.',
    examples: ['Der Darlehenszins betrug 3% p.a.', 'Bei Zahlungsverzug fallen Verzugszinsen an'],
    relatedTerms: ['darlehen', 'verzug'],
    legalArea: 'vertragsrecht',
    legalBasis: '§§ 246, 288 BGB',
    letterGroup: 'Z',
  },
  {
    id: 'zusatzvereinbarung',
    term: 'Zusatzvereinbarung (Nachtrag)',
    simpleExplanation: 'Eine spätere Ergänzung oder Änderung eines bestehenden Vertrags.',
    legalDefinition: 'Eine vertragliche Vereinbarung, die einen bestehenden Vertrag ergänzt, abändert oder erweitert.',
    examples: ['Die Gehaltserhöhung wurde in einer Zusatzvereinbarung festgehalten', 'Der Vertragsnachtrag regelte die verlängerte Laufzeit'],
    relatedTerms: ['vertrag', 'schriftform'],
    legalArea: 'vertragsrecht',
    letterGroup: 'Z',
  },

  // =============================================
  // Zusätzliche wichtige Begriffe
  // =============================================
  {
    id: 'fahrlassigkeit',
    term: 'Fahrlässigkeit',
    simpleExplanation: 'Unvorsichtiges Handeln - man hätte den Schaden vermeiden können, wenn man aufgepasst hätte.',
    legalDefinition: 'Fahrlässig handelt, wer die im Verkehr erforderliche Sorgfalt außer Acht lässt. Bei grober Fahrlässigkeit liegt ein besonders schwerer Sorgfaltspflichtverstoß vor.',
    examples: ['Der Unfall geschah durch Fahrlässigkeit', 'Bei grober Fahrlässigkeit kann die Versicherung die Leistung kürzen'],
    relatedTerms: ['verschulden', 'vorsatz', 'haftung'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 276 Abs. 2 BGB',
    letterGroup: 'F',
  },
  {
    id: 'gmbh',
    term: 'GmbH (Gesellschaft mit beschränkter Haftung)',
    simpleExplanation: 'Eine Unternehmensform, bei der die Gesellschafter nur mit ihrer Einlage haften - nicht mit ihrem Privatvermögen.',
    legalDefinition: 'Eine Kapitalgesellschaft mit eigener Rechtspersönlichkeit, bei der die Haftung der Gesellschafter auf ihre Stammeinlagen beschränkt ist.',
    examples: ['Die GmbH wurde mit 25.000 Euro Stammkapital gegründet', 'Der Geschäftsführer vertritt die GmbH nach außen'],
    relatedTerms: ['handelsregister', 'geschaeftsfuehrer'],
    legalArea: 'gesellschaftsrecht',
    legalBasis: 'GmbHG',
    letterGroup: 'G',
  },
  {
    id: 'hgb',
    term: 'HGB (Handelsgesetzbuch)',
    simpleExplanation: 'Das Gesetzbuch für Kaufleute - regelt besondere Rechte und Pflichten im Handelsverkehr.',
    legalDefinition: 'Das deutsche Handelsgesetzbuch enthält die besonderen Vorschriften für Kaufleute, Handelsgesellschaften und Handelsgeschäfte.',
    examples: ['Die Mängelrüge richtete sich nach § 377 HGB', 'Als Kaufmann war er an das HGB gebunden'],
    relatedTerms: ['kaufmann', 'handelsregister'],
    legalArea: 'handelsrecht',
    legalBasis: 'Handelsgesetzbuch',
    letterGroup: 'H',
  },
  {
    id: 'abnahme',
    term: 'Abnahme',
    simpleExplanation: 'Die Bestätigung, dass eine Werkleistung vertragsgemäß erbracht wurde.',
    legalDefinition: 'Die körperliche Hinnahme des Werkes als im Wesentlichen vertragsgemäße Leistung durch den Besteller.',
    examples: ['Nach der Abnahme begann die Gewährleistungsfrist', 'Die Abnahme wurde wegen Mängeln verweigert'],
    relatedTerms: ['werkvertrag', 'mangel', 'gewaehrleistung'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 640 BGB',
    letterGroup: 'A',
  },
  {
    id: 'forderung',
    term: 'Forderung',
    simpleExplanation: 'Das Recht, von jemandem etwas zu verlangen - z.B. die Zahlung von Geld.',
    legalDefinition: 'Das Recht des Gläubigers gegen den Schuldner auf die geschuldete Leistung aus einem Schuldverhältnis.',
    examples: ['Die Forderung wurde an ein Inkassobüro abgetreten', 'Er machte seine Forderung gerichtlich geltend'],
    relatedTerms: ['glaeubiger', 'schuldner', 'verjaehrung'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 241 BGB',
    letterGroup: 'F',
  },
  {
    id: 'nutzungsrecht',
    term: 'Nutzungsrecht',
    simpleExplanation: 'Das Recht, ein Werk (Software, Text, Bild) zu verwenden - kann einfach oder ausschließlich sein.',
    legalDefinition: 'Das vom Urheber eingeräumte Recht, ein urheberrechtlich geschütztes Werk auf bestimmte Weise zu nutzen.',
    examples: ['Die Software wurde mit einem einfachen Nutzungsrecht lizenziert', 'Das ausschließliche Nutzungsrecht verhinderte andere Lizenzen'],
    relatedTerms: ['urheberrecht', 'lizenz'],
    legalArea: 'allgemein',
    legalBasis: '§§ 31 ff. UrhG',
    letterGroup: 'N',
  },
  {
    id: 'patent',
    term: 'Patent',
    simpleExplanation: 'Ein zeitlich begrenztes Monopol auf eine technische Erfindung - andere dürfen sie nicht nutzen.',
    legalDefinition: 'Ein vom Patentamt erteiltes gewerbliches Schutzrecht, das dem Inhaber das ausschließliche Recht gewährt, die patentierte Erfindung zu nutzen.',
    examples: ['Das Patent wurde für 20 Jahre erteilt', 'Die Konkurrenz verletzte sein Patent'],
    relatedTerms: ['lizenz', 'geistiges_eigentum'],
    legalArea: 'allgemein',
    legalBasis: 'PatG',
    letterGroup: 'P',
  },
  {
    id: 'gesellschafter',
    term: 'Gesellschafter',
    simpleExplanation: 'Ein Eigentümer oder Miteigentümer eines Unternehmens - er hält Anteile an der Gesellschaft.',
    legalDefinition: 'Eine natürliche oder juristische Person, die an einer Gesellschaft beteiligt ist und damit Rechte und Pflichten aus dem Gesellschaftsverhältnis hat.',
    examples: ['Als Gesellschafter hatte er Stimmrecht in der Gesellschafterversammlung', 'Die Gesellschafter beschlossen die Gewinnausschüttung'],
    relatedTerms: ['gmbh', 'gesellschaftsvertrag'],
    legalArea: 'gesellschaftsrecht',
    legalBasis: 'GmbHG, HGB',
    letterGroup: 'G',
  },
  {
    id: 'tauschung',
    term: 'Arglistige Täuschung',
    simpleExplanation: 'Wenn jemand absichtlich belogen wird, um ihn zum Vertragsabschluss zu bewegen.',
    legalDefinition: 'Das vorsätzliche Hervorrufen oder Aufrechterhalten eines Irrtums durch Vorspiegelung falscher oder Unterdrückung wahrer Tatsachen, um den anderen Teil zur Abgabe einer Willenserklärung zu bestimmen.',
    examples: ['Der Verkäufer verschwieg den Unfallschaden - arglistige Täuschung', 'Wegen arglistiger Täuschung konnte der Vertrag angefochten werden'],
    relatedTerms: ['anfechtung', 'irrtum', 'willenserklarung'],
    legalArea: 'vertragsrecht',
    legalBasis: '§ 123 BGB',
    letterGroup: 'T',
  },
  {
    id: 'meldepflicht',
    term: 'Meldepflicht (DSGVO)',
    simpleExplanation: 'Die Pflicht, Datenpannen innerhalb von 72 Stunden der Aufsichtsbehörde zu melden.',
    legalDefinition: 'Die Verpflichtung des Verantwortlichen, eine Verletzung des Schutzes personenbezogener Daten binnen 72 Stunden der zuständigen Aufsichtsbehörde zu melden.',
    examples: ['Nach dem Datenleck bestand eine Meldepflicht', 'Die Frist für die Meldepflicht beträgt 72 Stunden'],
    relatedTerms: ['datenpanne', 'dsgvo', 'verantwortlicher'],
    legalArea: 'dsgvo',
    legalBasis: 'Art. 33 DSGVO',
    letterGroup: 'M',
  },
];

// Helper: Get all unique letter groups
export function getLetterGroups(): string[] {
  const letters = new Set(legalTerms.map(t => t.letterGroup));
  return Array.from(letters).sort();
}

// Helper: Get terms by letter
export function getTermsByLetter(letter: string): LegalTerm[] {
  return legalTerms.filter(t => t.letterGroup === letter);
}

// Helper: Get terms by legal area
export function getTermsByLegalArea(area: LegalTerm['legalArea']): LegalTerm[] {
  return legalTerms.filter(t => t.legalArea === area);
}

// Helper: Search terms
export function searchLegalTerms(query: string): LegalTerm[] {
  const lowerQuery = query.toLowerCase();
  return legalTerms.filter(t =>
    t.term.toLowerCase().includes(lowerQuery) ||
    t.simpleExplanation.toLowerCase().includes(lowerQuery) ||
    t.legalDefinition.toLowerCase().includes(lowerQuery)
  );
}

// Helper: Get term by ID
export function getTermById(id: string): LegalTerm | undefined {
  return legalTerms.find(t => t.id === id);
}

// Helper: Get related terms
export function getRelatedTerms(term: LegalTerm): LegalTerm[] {
  return term.relatedTerms
    .map(id => legalTerms.find(t => t.id === id))
    .filter((t): t is LegalTerm => t !== undefined);
}
