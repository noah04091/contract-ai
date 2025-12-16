/**
 * Contract Type Templates
 * Definiert die Struktur und Inhalte für verschiedene Vertragstypen
 */

export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  category: 'business' | 'personal' | 'employment' | 'property' | 'finance';
  parties: {
    party1: { role: string; defaultName: string };
    party2: { role: string; defaultName: string };
  };
  suggestedClauses: {
    title: string;
    body: string;
  }[];
  defaultVariables: {
    name: string;
    displayName: string;
    type: 'text' | 'number' | 'date' | 'currency' | 'select';
    group: string;
    required?: boolean;
    options?: string[];
  }[];
}

export const contractTemplates: ContractTemplate[] = [
  // =============================================
  // ARBEITSVERTRAG
  // =============================================
  {
    id: 'arbeitsvertrag',
    name: 'Arbeitsvertrag',
    description: 'Vertrag zwischen Arbeitgeber und Arbeitnehmer',
    icon: 'Briefcase',
    category: 'employment',
    parties: {
      party1: { role: 'Arbeitgeber', defaultName: '{{arbeitgeber_name}}' },
      party2: { role: 'Arbeitnehmer', defaultName: '{{arbeitnehmer_name}}' },
    },
    suggestedClauses: [
      {
        title: 'Beginn und Dauer des Arbeitsverhältnisses',
        body: 'Das Arbeitsverhältnis beginnt am {{arbeitsbeginn}} und wird auf unbestimmte Zeit geschlossen. Die Probezeit beträgt {{probezeit}} Monate.',
      },
      {
        title: 'Tätigkeit und Aufgabenbereich',
        body: 'Der Arbeitnehmer wird als {{position}} eingestellt. Zu seinen Aufgaben gehören insbesondere: {{aufgabenbeschreibung}}.',
      },
      {
        title: 'Vergütung',
        body: 'Der Arbeitnehmer erhält ein monatliches Bruttogehalt von {{gehalt}} Euro. Die Zahlung erfolgt jeweils zum {{zahltag}}. des Monats.',
      },
      {
        title: 'Arbeitszeit',
        body: 'Die regelmäßige wöchentliche Arbeitszeit beträgt {{woechentliche_arbeitszeit}} Stunden. Die Verteilung der Arbeitszeit richtet sich nach den betrieblichen Erfordernissen.',
      },
      {
        title: 'Urlaub',
        body: 'Der Arbeitnehmer hat Anspruch auf {{urlaubstage}} Arbeitstage bezahlten Erholungsurlaub pro Kalenderjahr.',
      },
      {
        title: 'Kündigung',
        body: 'Das Arbeitsverhältnis kann von beiden Seiten mit einer Frist von {{kuendigungsfrist}} zum Monatsende gekündigt werden. Während der Probezeit beträgt die Kündigungsfrist zwei Wochen.',
      },
      {
        title: 'Nebentätigkeiten',
        body: 'Nebentätigkeiten bedürfen der vorherigen schriftlichen Zustimmung des Arbeitgebers. Die Zustimmung ist zu erteilen, wenn die Nebentätigkeit die Arbeitsleistung nicht beeinträchtigt.',
      },
      {
        title: 'Geheimhaltung',
        body: 'Der Arbeitnehmer verpflichtet sich, über alle betrieblichen Angelegenheiten, insbesondere Geschäfts- und Betriebsgeheimnisse, Stillschweigen zu bewahren. Diese Verpflichtung gilt auch nach Beendigung des Arbeitsverhältnisses.',
      },
    ],
    defaultVariables: [
      { name: 'arbeitgeber_name', displayName: 'Arbeitgeber', type: 'text', group: 'Parteien', required: true },
      { name: 'arbeitnehmer_name', displayName: 'Arbeitnehmer', type: 'text', group: 'Parteien', required: true },
      { name: 'position', displayName: 'Position/Stelle', type: 'text', group: 'Tätigkeit', required: true },
      { name: 'aufgabenbeschreibung', displayName: 'Aufgabenbeschreibung', type: 'text', group: 'Tätigkeit' },
      { name: 'arbeitsbeginn', displayName: 'Arbeitsbeginn', type: 'date', group: 'Vertragsdaten', required: true },
      { name: 'probezeit', displayName: 'Probezeit (Monate)', type: 'number', group: 'Vertragsdaten' },
      { name: 'gehalt', displayName: 'Bruttogehalt (€)', type: 'currency', group: 'Finanzen', required: true },
      { name: 'zahltag', displayName: 'Zahltag', type: 'number', group: 'Finanzen' },
      { name: 'woechentliche_arbeitszeit', displayName: 'Wochenstunden', type: 'number', group: 'Arbeitszeit' },
      { name: 'urlaubstage', displayName: 'Urlaubstage/Jahr', type: 'number', group: 'Arbeitszeit' },
      { name: 'kuendigungsfrist', displayName: 'Kündigungsfrist', type: 'text', group: 'Kündigung' },
    ],
  },

  // =============================================
  // DIENSTLEISTUNGSVERTRAG
  // =============================================
  {
    id: 'dienstleistungsvertrag',
    name: 'Dienstleistungsvertrag',
    description: 'Vertrag über die Erbringung von Dienstleistungen',
    icon: 'Handshake',
    category: 'business',
    parties: {
      party1: { role: 'Auftraggeber', defaultName: '{{auftraggeber_name}}' },
      party2: { role: 'Auftragnehmer', defaultName: '{{auftragnehmer_name}}' },
    },
    suggestedClauses: [
      {
        title: 'Vertragsgegenstand',
        body: 'Der Auftragnehmer erbringt für den Auftraggeber folgende Dienstleistungen: {{leistungsbeschreibung}}.',
      },
      {
        title: 'Vergütung',
        body: 'Die Vergütung für die Dienstleistungen beträgt {{verguetung}} Euro {{zahlungsart}}. Zahlungen sind innerhalb von {{zahlungsziel}} Tagen nach Rechnungsstellung fällig.',
      },
      {
        title: 'Leistungszeitraum',
        body: 'Die Leistungen werden im Zeitraum vom {{leistungsbeginn}} bis {{leistungsende}} erbracht.',
      },
      {
        title: 'Mitwirkungspflichten',
        body: 'Der Auftraggeber stellt dem Auftragnehmer alle für die Leistungserbringung erforderlichen Informationen und Unterlagen rechtzeitig zur Verfügung.',
      },
      {
        title: 'Haftung',
        body: 'Der Auftragnehmer haftet für Schäden nur bei Vorsatz und grober Fahrlässigkeit. Die Haftung für leichte Fahrlässigkeit ist auf {{haftungssumme}} Euro begrenzt.',
      },
      {
        title: 'Vertraulichkeit',
        body: 'Beide Parteien verpflichten sich, alle im Rahmen dieses Vertrags erhaltenen vertraulichen Informationen geheim zu halten.',
      },
      {
        title: 'Kündigung',
        body: 'Der Vertrag kann von beiden Seiten mit einer Frist von {{kuendigungsfrist}} schriftlich gekündigt werden.',
      },
    ],
    defaultVariables: [
      { name: 'auftraggeber_name', displayName: 'Auftraggeber', type: 'text', group: 'Parteien', required: true },
      { name: 'auftragnehmer_name', displayName: 'Auftragnehmer', type: 'text', group: 'Parteien', required: true },
      { name: 'leistungsbeschreibung', displayName: 'Leistungsbeschreibung', type: 'text', group: 'Leistung', required: true },
      { name: 'verguetung', displayName: 'Vergütung (€)', type: 'currency', group: 'Finanzen', required: true },
      { name: 'zahlungsart', displayName: 'Zahlungsart', type: 'select', group: 'Finanzen', options: ['pauschal', 'pro Stunde', 'pro Tag', 'monatlich'] },
      { name: 'zahlungsziel', displayName: 'Zahlungsziel (Tage)', type: 'number', group: 'Finanzen' },
      { name: 'leistungsbeginn', displayName: 'Leistungsbeginn', type: 'date', group: 'Zeitraum' },
      { name: 'leistungsende', displayName: 'Leistungsende', type: 'date', group: 'Zeitraum' },
      { name: 'haftungssumme', displayName: 'Haftungsbegrenzung (€)', type: 'currency', group: 'Rechtliches' },
      { name: 'kuendigungsfrist', displayName: 'Kündigungsfrist', type: 'text', group: 'Rechtliches' },
    ],
  },

  // =============================================
  // WERKVERTRAG (FREELANCER)
  // =============================================
  {
    id: 'werkvertrag',
    name: 'Werkvertrag',
    description: 'Vertrag über die Erstellung eines Werks (Freelancer)',
    icon: 'Hammer',
    category: 'business',
    parties: {
      party1: { role: 'Auftraggeber', defaultName: '{{auftraggeber_name}}' },
      party2: { role: 'Auftragnehmer', defaultName: '{{auftragnehmer_name}}' },
    },
    suggestedClauses: [
      {
        title: 'Werkleistung',
        body: 'Der Auftragnehmer verpflichtet sich, folgendes Werk zu erstellen: {{werkbeschreibung}}.',
      },
      {
        title: 'Abnahme',
        body: 'Das Werk ist dem Auftraggeber bis zum {{liefertermin}} zur Abnahme vorzulegen. Die Abnahme erfolgt innerhalb von {{abnahmefrist}} Tagen.',
      },
      {
        title: 'Vergütung',
        body: 'Das Honorar für das Werk beträgt {{honorar}} Euro netto. {{anzahlung_text}}',
      },
      {
        title: 'Nutzungsrechte',
        body: 'Mit vollständiger Zahlung gehen alle Nutzungsrechte am Werk auf den Auftraggeber über. Der Umfang der Nutzungsrechte: {{nutzungsrechte}}.',
      },
      {
        title: 'Gewährleistung',
        body: 'Der Auftragnehmer gewährleistet die Mangelfreiheit des Werks für einen Zeitraum von {{gewaehrleistungsfrist}} nach Abnahme.',
      },
      {
        title: 'Änderungswünsche',
        body: 'Änderungswünsche nach Auftragserteilung können zu Mehrkosten und Terminverschiebungen führen. Diese werden vorher abgestimmt.',
      },
    ],
    defaultVariables: [
      { name: 'auftraggeber_name', displayName: 'Auftraggeber', type: 'text', group: 'Parteien', required: true },
      { name: 'auftragnehmer_name', displayName: 'Auftragnehmer', type: 'text', group: 'Parteien', required: true },
      { name: 'werkbeschreibung', displayName: 'Werkbeschreibung', type: 'text', group: 'Werk', required: true },
      { name: 'liefertermin', displayName: 'Liefertermin', type: 'date', group: 'Termine', required: true },
      { name: 'abnahmefrist', displayName: 'Abnahmefrist (Tage)', type: 'number', group: 'Termine' },
      { name: 'honorar', displayName: 'Honorar (€)', type: 'currency', group: 'Finanzen', required: true },
      { name: 'anzahlung_text', displayName: 'Anzahlungsregelung', type: 'text', group: 'Finanzen' },
      { name: 'nutzungsrechte', displayName: 'Umfang Nutzungsrechte', type: 'select', group: 'Rechte', options: ['einfach', 'ausschließlich', 'zeitlich unbegrenzt', 'räumlich unbegrenzt'] },
      { name: 'gewaehrleistungsfrist', displayName: 'Gewährleistungsfrist', type: 'text', group: 'Rechtliches' },
    ],
  },

  // =============================================
  // KAUFVERTRAG
  // =============================================
  {
    id: 'kaufvertrag',
    name: 'Kaufvertrag',
    description: 'Vertrag über den Kauf von Waren oder Gegenständen',
    icon: 'ShoppingCart',
    category: 'business',
    parties: {
      party1: { role: 'Verkäufer', defaultName: '{{verkaeufer_name}}' },
      party2: { role: 'Käufer', defaultName: '{{kaeufer_name}}' },
    },
    suggestedClauses: [
      {
        title: 'Kaufgegenstand',
        body: 'Der Verkäufer verkauft an den Käufer: {{kaufgegenstand}}. Der Zustand des Kaufgegenstands: {{zustand}}.',
      },
      {
        title: 'Kaufpreis',
        body: 'Der Kaufpreis beträgt {{kaufpreis}} Euro. Die Zahlung erfolgt {{zahlungsmodalitaet}}.',
      },
      {
        title: 'Übergabe',
        body: 'Die Übergabe des Kaufgegenstands erfolgt am {{uebergabetermin}} am Ort: {{uebergabeort}}.',
      },
      {
        title: 'Eigentumsvorbehalt',
        body: 'Der Kaufgegenstand bleibt bis zur vollständigen Bezahlung Eigentum des Verkäufers.',
      },
      {
        title: 'Gewährleistung',
        body: 'Der Verkäufer gewährleistet, dass der Kaufgegenstand frei von Mängeln ist. Die Gewährleistungsfrist beträgt {{gewaehrleistung}}.',
      },
      {
        title: 'Haftungsausschluss',
        body: 'Der Verkäufer haftet nicht für Mängel, die dem Käufer bei Vertragsschluss bekannt waren.',
      },
    ],
    defaultVariables: [
      { name: 'verkaeufer_name', displayName: 'Verkäufer', type: 'text', group: 'Parteien', required: true },
      { name: 'kaeufer_name', displayName: 'Käufer', type: 'text', group: 'Parteien', required: true },
      { name: 'kaufgegenstand', displayName: 'Kaufgegenstand', type: 'text', group: 'Gegenstand', required: true },
      { name: 'zustand', displayName: 'Zustand', type: 'select', group: 'Gegenstand', options: ['neu', 'neuwertig', 'gebraucht', 'defekt'] },
      { name: 'kaufpreis', displayName: 'Kaufpreis (€)', type: 'currency', group: 'Finanzen', required: true },
      { name: 'zahlungsmodalitaet', displayName: 'Zahlungsmodalität', type: 'select', group: 'Finanzen', options: ['bei Übergabe', 'per Vorkasse', 'innerhalb 14 Tagen', 'in Raten'] },
      { name: 'uebergabetermin', displayName: 'Übergabetermin', type: 'date', group: 'Übergabe' },
      { name: 'uebergabeort', displayName: 'Übergabeort', type: 'text', group: 'Übergabe' },
      { name: 'gewaehrleistung', displayName: 'Gewährleistung', type: 'select', group: 'Rechtliches', options: ['2 Jahre (gesetzlich)', '1 Jahr', '6 Monate', 'ausgeschlossen (Privatverkauf)'] },
    ],
  },

  // =============================================
  // MIETVERTRAG
  // =============================================
  {
    id: 'mietvertrag',
    name: 'Mietvertrag',
    description: 'Vertrag über die Vermietung von Wohn- oder Gewerberaum',
    icon: 'Home',
    category: 'property',
    parties: {
      party1: { role: 'Vermieter', defaultName: '{{vermieter_name}}' },
      party2: { role: 'Mieter', defaultName: '{{mieter_name}}' },
    },
    suggestedClauses: [
      {
        title: 'Mietobjekt',
        body: 'Vermietet wird die Wohnung/das Objekt in {{adresse_mietobjekt}} mit einer Wohnfläche von {{wohnflaeche}} qm, bestehend aus {{zimmeranzahl}} Zimmern.',
      },
      {
        title: 'Mietzeit',
        body: 'Das Mietverhältnis beginnt am {{mietbeginn}} und wird auf {{mietdauer}} geschlossen.',
      },
      {
        title: 'Miete',
        body: 'Die monatliche Kaltmiete beträgt {{kaltmiete}} Euro. Die Vorauszahlung für Nebenkosten beträgt {{nebenkosten}} Euro monatlich.',
      },
      {
        title: 'Kaution',
        body: 'Der Mieter zahlt eine Kaution in Höhe von {{kaution}} Euro (entspricht {{kaution_monate}} Monatsmieten). Die Kaution ist vor Mietbeginn zu leisten.',
      },
      {
        title: 'Schönheitsreparaturen',
        body: 'Der Mieter übernimmt die Schönheitsreparaturen während der Mietzeit. Bei Auszug ist die Wohnung in {{auszugszustand}} Zustand zu übergeben.',
      },
      {
        title: 'Haustierhaltung',
        body: 'Die Haltung von Haustieren ist {{haustierhaltung}}.',
      },
      {
        title: 'Kündigung',
        body: 'Das Mietverhältnis kann mit einer Frist von {{kuendigungsfrist}} zum Monatsende gekündigt werden.',
      },
    ],
    defaultVariables: [
      { name: 'vermieter_name', displayName: 'Vermieter', type: 'text', group: 'Parteien', required: true },
      { name: 'mieter_name', displayName: 'Mieter', type: 'text', group: 'Parteien', required: true },
      { name: 'adresse_mietobjekt', displayName: 'Adresse Mietobjekt', type: 'text', group: 'Objekt', required: true },
      { name: 'wohnflaeche', displayName: 'Wohnfläche (qm)', type: 'number', group: 'Objekt' },
      { name: 'zimmeranzahl', displayName: 'Zimmeranzahl', type: 'number', group: 'Objekt' },
      { name: 'mietbeginn', displayName: 'Mietbeginn', type: 'date', group: 'Mietzeit', required: true },
      { name: 'mietdauer', displayName: 'Mietdauer', type: 'select', group: 'Mietzeit', options: ['unbestimmte Zeit', '1 Jahr', '2 Jahre', '3 Jahre', '5 Jahre'] },
      { name: 'kaltmiete', displayName: 'Kaltmiete (€)', type: 'currency', group: 'Finanzen', required: true },
      { name: 'nebenkosten', displayName: 'Nebenkosten (€)', type: 'currency', group: 'Finanzen' },
      { name: 'kaution', displayName: 'Kaution (€)', type: 'currency', group: 'Finanzen' },
      { name: 'kaution_monate', displayName: 'Kaution (Monate)', type: 'number', group: 'Finanzen' },
      { name: 'auszugszustand', displayName: 'Auszugszustand', type: 'select', group: 'Pflichten', options: ['besenreinem', 'renoviertem', 'ursprünglichem'] },
      { name: 'haustierhaltung', displayName: 'Haustierhaltung', type: 'select', group: 'Regelungen', options: ['nach Absprache gestattet', 'nicht gestattet', 'Kleintiere gestattet'] },
      { name: 'kuendigungsfrist', displayName: 'Kündigungsfrist', type: 'select', group: 'Kündigung', options: ['3 Monaten', '6 Monaten', '1 Monat'] },
    ],
  },

  // =============================================
  // DARLEHENSVERTRAG
  // =============================================
  {
    id: 'darlehensvertrag',
    name: 'Darlehensvertrag',
    description: 'Vertrag über die Gewährung eines Darlehens',
    icon: 'Banknote',
    category: 'finance',
    parties: {
      party1: { role: 'Darlehensgeber', defaultName: '{{darlehensgeber_name}}' },
      party2: { role: 'Darlehensnehmer', defaultName: '{{darlehensnehmer_name}}' },
    },
    suggestedClauses: [
      {
        title: 'Darlehenssumme',
        body: 'Der Darlehensgeber gewährt dem Darlehensnehmer ein Darlehen in Höhe von {{darlehenssumme}} Euro.',
      },
      {
        title: 'Auszahlung',
        body: 'Die Auszahlung des Darlehens erfolgt am {{auszahlungsdatum}} auf das Konto des Darlehensnehmers.',
      },
      {
        title: 'Zinsen',
        body: 'Das Darlehen wird mit {{zinssatz}} % p.a. verzinst. Die Zinsen sind {{zinszahlung}} zu zahlen.',
      },
      {
        title: 'Rückzahlung',
        body: 'Das Darlehen ist in {{raten_anzahl}} Raten zu je {{ratenhoehe}} Euro zurückzuzahlen. Die erste Rate ist am {{erste_rate}} fällig.',
      },
      {
        title: 'Vorzeitige Rückzahlung',
        body: 'Eine vorzeitige Rückzahlung ist jederzeit möglich. Es fällt keine Vorfälligkeitsentschädigung an.',
      },
      {
        title: 'Sicherheiten',
        body: 'Als Sicherheit für das Darlehen dient: {{sicherheiten}}.',
      },
      {
        title: 'Verzug',
        body: 'Bei Zahlungsverzug werden Verzugszinsen in Höhe von {{verzugszinsen}} % über dem Basiszinssatz berechnet.',
      },
    ],
    defaultVariables: [
      { name: 'darlehensgeber_name', displayName: 'Darlehensgeber', type: 'text', group: 'Parteien', required: true },
      { name: 'darlehensnehmer_name', displayName: 'Darlehensnehmer', type: 'text', group: 'Parteien', required: true },
      { name: 'darlehenssumme', displayName: 'Darlehenssumme (€)', type: 'currency', group: 'Darlehen', required: true },
      { name: 'auszahlungsdatum', displayName: 'Auszahlungsdatum', type: 'date', group: 'Darlehen' },
      { name: 'zinssatz', displayName: 'Zinssatz (%)', type: 'number', group: 'Konditionen' },
      { name: 'zinszahlung', displayName: 'Zinszahlung', type: 'select', group: 'Konditionen', options: ['monatlich', 'vierteljährlich', 'jährlich', 'am Ende der Laufzeit'] },
      { name: 'raten_anzahl', displayName: 'Anzahl Raten', type: 'number', group: 'Rückzahlung' },
      { name: 'ratenhoehe', displayName: 'Ratenhöhe (€)', type: 'currency', group: 'Rückzahlung' },
      { name: 'erste_rate', displayName: 'Erste Rate fällig am', type: 'date', group: 'Rückzahlung' },
      { name: 'sicherheiten', displayName: 'Sicherheiten', type: 'text', group: 'Sicherung' },
      { name: 'verzugszinsen', displayName: 'Verzugszinsen (%)', type: 'number', group: 'Rechtliches' },
    ],
  },

  // =============================================
  // NDA / GEHEIMHALTUNGSVEREINBARUNG
  // =============================================
  {
    id: 'nda',
    name: 'NDA / Geheimhaltung',
    description: 'Vereinbarung zum Schutz vertraulicher Informationen',
    icon: 'Lock',
    category: 'business',
    parties: {
      party1: { role: 'Offenlegende Partei', defaultName: '{{offenleger_name}}' },
      party2: { role: 'Empfangende Partei', defaultName: '{{empfaenger_name}}' },
    },
    suggestedClauses: [
      {
        title: 'Zweck der Vereinbarung',
        body: 'Die Parteien beabsichtigen, vertrauliche Informationen zum Zweck von {{zweck}} auszutauschen.',
      },
      {
        title: 'Definition vertraulicher Informationen',
        body: 'Vertrauliche Informationen umfassen alle Informationen, die als "vertraulich" gekennzeichnet sind oder ihrer Natur nach als vertraulich anzusehen sind, insbesondere: {{vertrauliche_infos}}.',
      },
      {
        title: 'Geheimhaltungspflicht',
        body: 'Die empfangende Partei verpflichtet sich, die vertraulichen Informationen streng geheim zu halten und nicht an Dritte weiterzugeben.',
      },
      {
        title: 'Zulässige Verwendung',
        body: 'Die vertraulichen Informationen dürfen ausschließlich für den in dieser Vereinbarung genannten Zweck verwendet werden.',
      },
      {
        title: 'Laufzeit',
        body: 'Diese Vereinbarung gilt für einen Zeitraum von {{laufzeit}}. Die Geheimhaltungspflicht besteht auch nach Beendigung der Vereinbarung für weitere {{nachwirkung}} fort.',
      },
      {
        title: 'Rückgabe',
        body: 'Auf Verlangen oder bei Beendigung der Vereinbarung sind alle vertraulichen Informationen zurückzugeben oder zu vernichten.',
      },
      {
        title: 'Vertragsstrafe',
        body: 'Bei Verstoß gegen diese Vereinbarung ist eine Vertragsstrafe in Höhe von {{vertragsstrafe}} Euro zu zahlen.',
      },
    ],
    defaultVariables: [
      { name: 'offenleger_name', displayName: 'Offenlegende Partei', type: 'text', group: 'Parteien', required: true },
      { name: 'empfaenger_name', displayName: 'Empfangende Partei', type: 'text', group: 'Parteien', required: true },
      { name: 'zweck', displayName: 'Zweck der Offenlegung', type: 'text', group: 'Vereinbarung', required: true },
      { name: 'vertrauliche_infos', displayName: 'Art der vertraulichen Infos', type: 'text', group: 'Vereinbarung' },
      { name: 'laufzeit', displayName: 'Laufzeit', type: 'select', group: 'Dauer', options: ['1 Jahr', '2 Jahre', '3 Jahre', '5 Jahre', 'unbefristet'] },
      { name: 'nachwirkung', displayName: 'Nachwirkung nach Ende', type: 'select', group: 'Dauer', options: ['2 Jahre', '3 Jahre', '5 Jahre', '10 Jahre'] },
      { name: 'vertragsstrafe', displayName: 'Vertragsstrafe (€)', type: 'currency', group: 'Rechtliches' },
    ],
  },

  // =============================================
  // GESELLSCHAFTSVERTRAG
  // =============================================
  {
    id: 'gesellschaftsvertrag',
    name: 'Gesellschaftsvertrag',
    description: 'Vertrag zur Gründung einer Gesellschaft (GbR, OHG)',
    icon: 'Users',
    category: 'business',
    parties: {
      party1: { role: 'Gesellschafter 1', defaultName: '{{gesellschafter1_name}}' },
      party2: { role: 'Gesellschafter 2', defaultName: '{{gesellschafter2_name}}' },
    },
    suggestedClauses: [
      {
        title: 'Name und Sitz',
        body: 'Die Gesellschaft führt den Namen "{{firmenname}}" und hat ihren Sitz in {{sitz}}.',
      },
      {
        title: 'Gegenstand des Unternehmens',
        body: 'Gegenstand des Unternehmens ist: {{geschaeftszweck}}.',
      },
      {
        title: 'Einlagen',
        body: 'Die Gesellschafter leisten folgende Einlagen: {{gesellschafter1_name}}: {{einlage1}} Euro, {{gesellschafter2_name}}: {{einlage2}} Euro.',
      },
      {
        title: 'Gewinn- und Verlustverteilung',
        body: 'Gewinn und Verlust werden im Verhältnis {{gewinnverteilung}} verteilt.',
      },
      {
        title: 'Geschäftsführung',
        body: 'Zur Geschäftsführung sind berechtigt: {{geschaeftsfuehrung}}. Bei Geschäften über {{betragsschwelle}} Euro ist die Zustimmung aller Gesellschafter erforderlich.',
      },
      {
        title: 'Kündigung',
        body: 'Ein Gesellschafter kann die Gesellschaft mit einer Frist von {{kuendigungsfrist}} zum Jahresende kündigen.',
      },
      {
        title: 'Abfindung',
        body: 'Der ausscheidende Gesellschafter erhält eine Abfindung in Höhe des Verkehrswerts seines Anteils.',
      },
    ],
    defaultVariables: [
      { name: 'gesellschafter1_name', displayName: 'Gesellschafter 1', type: 'text', group: 'Gesellschafter', required: true },
      { name: 'gesellschafter2_name', displayName: 'Gesellschafter 2', type: 'text', group: 'Gesellschafter', required: true },
      { name: 'firmenname', displayName: 'Firmenname', type: 'text', group: 'Gesellschaft', required: true },
      { name: 'sitz', displayName: 'Sitz der Gesellschaft', type: 'text', group: 'Gesellschaft' },
      { name: 'geschaeftszweck', displayName: 'Geschäftszweck', type: 'text', group: 'Gesellschaft', required: true },
      { name: 'einlage1', displayName: 'Einlage Gesellschafter 1 (€)', type: 'currency', group: 'Kapital' },
      { name: 'einlage2', displayName: 'Einlage Gesellschafter 2 (€)', type: 'currency', group: 'Kapital' },
      { name: 'gewinnverteilung', displayName: 'Gewinnverteilung', type: 'select', group: 'Finanzen', options: ['50:50', '60:40', '70:30', 'nach Einlagen'] },
      { name: 'geschaeftsfuehrung', displayName: 'Geschäftsführung', type: 'select', group: 'Organisation', options: ['alle Gesellschafter gemeinsam', 'jeder Gesellschafter einzeln', 'nur Gesellschafter 1'] },
      { name: 'betragsschwelle', displayName: 'Zustimmungsgrenze (€)', type: 'currency', group: 'Organisation' },
      { name: 'kuendigungsfrist', displayName: 'Kündigungsfrist', type: 'select', group: 'Kündigung', options: ['3 Monaten', '6 Monaten', '12 Monaten'] },
    ],
  },

  // =============================================
  // LIZENZVERTRAG
  // =============================================
  {
    id: 'lizenzvertrag',
    name: 'Lizenzvertrag',
    description: 'Vertrag über die Einräumung von Nutzungsrechten',
    icon: 'FileKey',
    category: 'business',
    parties: {
      party1: { role: 'Lizenzgeber', defaultName: '{{lizenzgeber_name}}' },
      party2: { role: 'Lizenznehmer', defaultName: '{{lizenznehmer_name}}' },
    },
    suggestedClauses: [
      {
        title: 'Lizenzgegenstand',
        body: 'Der Lizenzgeber räumt dem Lizenznehmer das Recht ein, {{lizenzgegenstand}} zu nutzen.',
      },
      {
        title: 'Umfang der Lizenz',
        body: 'Die Lizenz ist {{lizenzart}} und gilt {{raeumlich}} für die Dauer von {{lizenzdauer}}.',
      },
      {
        title: 'Lizenzgebühr',
        body: 'Die Lizenzgebühr beträgt {{lizenzgebuehr}} Euro {{zahlungsrhythmus}}.',
      },
      {
        title: 'Unterlizenzierung',
        body: 'Die Vergabe von Unterlizenzen ist {{unterlizenz}}.',
      },
      {
        title: 'Gewährleistung',
        body: 'Der Lizenzgeber gewährleistet, dass er zur Einräumung der Lizenz berechtigt ist und keine Rechte Dritter entgegenstehen.',
      },
      {
        title: 'Kündigung',
        body: 'Der Vertrag kann mit einer Frist von {{kuendigungsfrist}} gekündigt werden.',
      },
    ],
    defaultVariables: [
      { name: 'lizenzgeber_name', displayName: 'Lizenzgeber', type: 'text', group: 'Parteien', required: true },
      { name: 'lizenznehmer_name', displayName: 'Lizenznehmer', type: 'text', group: 'Parteien', required: true },
      { name: 'lizenzgegenstand', displayName: 'Lizenzgegenstand', type: 'text', group: 'Lizenz', required: true },
      { name: 'lizenzart', displayName: 'Lizenzart', type: 'select', group: 'Lizenz', options: ['einfach (nicht exklusiv)', 'ausschließlich (exklusiv)'] },
      { name: 'raeumlich', displayName: 'Räumlicher Geltungsbereich', type: 'select', group: 'Lizenz', options: ['weltweit', 'deutschlandweit', 'europaweit', 'regional begrenzt'] },
      { name: 'lizenzdauer', displayName: 'Lizenzdauer', type: 'select', group: 'Lizenz', options: ['1 Jahr', '3 Jahre', '5 Jahre', 'unbefristet'] },
      { name: 'lizenzgebuehr', displayName: 'Lizenzgebühr (€)', type: 'currency', group: 'Finanzen', required: true },
      { name: 'zahlungsrhythmus', displayName: 'Zahlungsrhythmus', type: 'select', group: 'Finanzen', options: ['einmalig', 'monatlich', 'jährlich', 'pro Nutzung'] },
      { name: 'unterlizenz', displayName: 'Unterlizenzierung', type: 'select', group: 'Rechte', options: ['gestattet', 'nicht gestattet', 'mit Zustimmung'] },
      { name: 'kuendigungsfrist', displayName: 'Kündigungsfrist', type: 'text', group: 'Kündigung' },
    ],
  },

  // =============================================
  // KOOPERATIONSVERTRAG
  // =============================================
  {
    id: 'kooperationsvertrag',
    name: 'Kooperationsvertrag',
    description: 'Vertrag über eine geschäftliche Zusammenarbeit',
    icon: 'Handshake',
    category: 'business',
    parties: {
      party1: { role: 'Partner 1', defaultName: '{{partner1_name}}' },
      party2: { role: 'Partner 2', defaultName: '{{partner2_name}}' },
    },
    suggestedClauses: [
      {
        title: 'Gegenstand der Kooperation',
        body: 'Die Parteien vereinbaren eine Kooperation im Bereich: {{kooperationsbereich}}. Ziel der Kooperation ist: {{kooperationsziel}}.',
      },
      {
        title: 'Pflichten der Partner',
        body: 'Partner 1 übernimmt: {{pflichten_partner1}}. Partner 2 übernimmt: {{pflichten_partner2}}.',
      },
      {
        title: 'Kosten und Erlöse',
        body: 'Die Kosten werden {{kostenverteilung}} getragen. Erlöse werden im Verhältnis {{erloesverteilung}} aufgeteilt.',
      },
      {
        title: 'Laufzeit',
        body: 'Die Kooperation beginnt am {{startdatum}} und gilt für {{laufzeit}}.',
      },
      {
        title: 'Exklusivität',
        body: 'Die Kooperation ist {{exklusivitaet}}.',
      },
      {
        title: 'Beendigung',
        body: 'Die Kooperation kann mit einer Frist von {{kuendigungsfrist}} gekündigt werden. Eine außerordentliche Kündigung ist bei wichtigem Grund möglich.',
      },
    ],
    defaultVariables: [
      { name: 'partner1_name', displayName: 'Partner 1', type: 'text', group: 'Partner', required: true },
      { name: 'partner2_name', displayName: 'Partner 2', type: 'text', group: 'Partner', required: true },
      { name: 'kooperationsbereich', displayName: 'Kooperationsbereich', type: 'text', group: 'Kooperation', required: true },
      { name: 'kooperationsziel', displayName: 'Kooperationsziel', type: 'text', group: 'Kooperation' },
      { name: 'pflichten_partner1', displayName: 'Pflichten Partner 1', type: 'text', group: 'Pflichten' },
      { name: 'pflichten_partner2', displayName: 'Pflichten Partner 2', type: 'text', group: 'Pflichten' },
      { name: 'kostenverteilung', displayName: 'Kostenverteilung', type: 'select', group: 'Finanzen', options: ['hälftig', 'nach Verursachung', 'Partner 1 trägt alle'] },
      { name: 'erloesverteilung', displayName: 'Erlösverteilung', type: 'select', group: 'Finanzen', options: ['50:50', '60:40', '70:30', 'nach Leistungsanteil'] },
      { name: 'startdatum', displayName: 'Beginn', type: 'date', group: 'Laufzeit' },
      { name: 'laufzeit', displayName: 'Laufzeit', type: 'select', group: 'Laufzeit', options: ['1 Jahr', '2 Jahre', '3 Jahre', 'unbefristet'] },
      { name: 'exklusivitaet', displayName: 'Exklusivität', type: 'select', group: 'Bedingungen', options: ['exklusiv', 'nicht exklusiv'] },
      { name: 'kuendigungsfrist', displayName: 'Kündigungsfrist', type: 'text', group: 'Kündigung' },
    ],
  },

  // =============================================
  // BERATERVERTRAG
  // =============================================
  {
    id: 'beratervertrag',
    name: 'Beratervertrag',
    description: 'Vertrag über Beratungsleistungen',
    icon: 'GraduationCap',
    category: 'business',
    parties: {
      party1: { role: 'Auftraggeber', defaultName: '{{auftraggeber_name}}' },
      party2: { role: 'Berater', defaultName: '{{berater_name}}' },
    },
    suggestedClauses: [
      {
        title: 'Beratungsleistung',
        body: 'Der Berater erbringt für den Auftraggeber Beratungsleistungen im Bereich: {{beratungsbereich}}.',
      },
      {
        title: 'Honorar',
        body: 'Das Honorar beträgt {{honorar}} Euro {{honorarart}}. Reisekosten werden {{reisekosten}} erstattet.',
      },
      {
        title: 'Arbeitszeit und Verfügbarkeit',
        body: 'Der Berater steht dem Auftraggeber {{verfuegbarkeit}} zur Verfügung. Die Leistungen werden {{arbeitsort}} erbracht.',
      },
      {
        title: 'Selbstständigkeit',
        body: 'Der Berater erbringt seine Leistungen als selbstständiger Unternehmer. Ein Arbeitsverhältnis wird nicht begründet.',
      },
      {
        title: 'Vertraulichkeit',
        body: 'Der Berater verpflichtet sich zur Verschwiegenheit über alle vertraulichen Informationen des Auftraggebers.',
      },
      {
        title: 'Wettbewerbsverbot',
        body: 'Während der Vertragslaufzeit {{wettbewerbsverbot}}.',
      },
    ],
    defaultVariables: [
      { name: 'auftraggeber_name', displayName: 'Auftraggeber', type: 'text', group: 'Parteien', required: true },
      { name: 'berater_name', displayName: 'Berater', type: 'text', group: 'Parteien', required: true },
      { name: 'beratungsbereich', displayName: 'Beratungsbereich', type: 'text', group: 'Leistung', required: true },
      { name: 'honorar', displayName: 'Honorar (€)', type: 'currency', group: 'Vergütung', required: true },
      { name: 'honorarart', displayName: 'Honorarart', type: 'select', group: 'Vergütung', options: ['pro Stunde', 'pro Tag', 'pauschal/Monat', 'pauschal/Projekt'] },
      { name: 'reisekosten', displayName: 'Reisekosten', type: 'select', group: 'Vergütung', options: ['in voller Höhe', 'pauschal', 'nicht'] },
      { name: 'verfuegbarkeit', displayName: 'Verfügbarkeit', type: 'select', group: 'Arbeitszeit', options: ['nach Bedarf', 'an X Tagen/Woche', 'in Vollzeit'] },
      { name: 'arbeitsort', displayName: 'Arbeitsort', type: 'select', group: 'Arbeitszeit', options: ['remote', 'vor Ort', 'hybrid'] },
      { name: 'wettbewerbsverbot', displayName: 'Wettbewerbsverbot', type: 'select', group: 'Rechtliches', options: ['gilt ein Wettbewerbsverbot', 'gilt kein Wettbewerbsverbot'] },
    ],
  },

  // =============================================
  // HANDELSVERTRETERVERTRAG
  // =============================================
  {
    id: 'handelsvertretervertrag',
    name: 'Handelsvertretervertrag',
    description: 'Vertrag mit einem Handelsvertreter',
    icon: 'Store',
    category: 'business',
    parties: {
      party1: { role: 'Unternehmer', defaultName: '{{unternehmer_name}}' },
      party2: { role: 'Handelsvertreter', defaultName: '{{handelsvertreter_name}}' },
    },
    suggestedClauses: [
      {
        title: 'Tätigkeitsbereich',
        body: 'Der Handelsvertreter ist beauftragt, im Gebiet {{vertriebsgebiet}} Geschäfte für folgende Produkte zu vermitteln: {{produkte}}.',
      },
      {
        title: 'Provision',
        body: 'Der Handelsvertreter erhält eine Provision von {{provision}} % auf alle vermittelten Geschäfte. Die Provision wird {{provisionszahlung}} abgerechnet.',
      },
      {
        title: 'Exklusivität',
        body: 'Das Vertretungsrecht ist {{exklusivitaet}}.',
      },
      {
        title: 'Pflichten des Handelsvertreters',
        body: 'Der Handelsvertreter verpflichtet sich, die Interessen des Unternehmers wahrzunehmen und mindestens {{mindestabsatz}} pro {{zeitraum}} zu vermitteln.',
      },
      {
        title: 'Pflichten des Unternehmers',
        body: 'Der Unternehmer stellt dem Handelsvertreter alle erforderlichen Unterlagen zur Verfügung.',
      },
      {
        title: 'Kündigung und Ausgleichsanspruch',
        body: 'Der Vertrag kann mit einer Frist von {{kuendigungsfrist}} gekündigt werden. Bei Beendigung hat der Handelsvertreter Anspruch auf einen Ausgleich gemäß § 89b HGB.',
      },
    ],
    defaultVariables: [
      { name: 'unternehmer_name', displayName: 'Unternehmer', type: 'text', group: 'Parteien', required: true },
      { name: 'handelsvertreter_name', displayName: 'Handelsvertreter', type: 'text', group: 'Parteien', required: true },
      { name: 'vertriebsgebiet', displayName: 'Vertriebsgebiet', type: 'text', group: 'Tätigkeit', required: true },
      { name: 'produkte', displayName: 'Produkte/Dienstleistungen', type: 'text', group: 'Tätigkeit' },
      { name: 'provision', displayName: 'Provision (%)', type: 'number', group: 'Vergütung', required: true },
      { name: 'provisionszahlung', displayName: 'Provisionsabrechnung', type: 'select', group: 'Vergütung', options: ['monatlich', 'vierteljährlich', 'nach Zahlungseingang'] },
      { name: 'exklusivitaet', displayName: 'Exklusivität', type: 'select', group: 'Rechte', options: ['exklusiv für dieses Gebiet', 'nicht exklusiv'] },
      { name: 'mindestabsatz', displayName: 'Mindestabsatz (€)', type: 'currency', group: 'Ziele' },
      { name: 'zeitraum', displayName: 'Zeitraum Mindestabsatz', type: 'select', group: 'Ziele', options: ['Monat', 'Quartal', 'Jahr'] },
      { name: 'kuendigungsfrist', displayName: 'Kündigungsfrist', type: 'select', group: 'Kündigung', options: ['1 Monat', '3 Monate', '6 Monate'] },
    ],
  },

  // =============================================
  // INDIVIDUELL (LEER)
  // =============================================
  {
    id: 'individuell',
    name: 'Individueller Vertrag',
    description: 'Leere Vorlage für komplett individuelle Verträge',
    icon: 'FileEdit',
    category: 'personal',
    parties: {
      party1: { role: 'Partei 1', defaultName: '{{partei1_name}}' },
      party2: { role: 'Partei 2', defaultName: '{{partei2_name}}' },
    },
    suggestedClauses: [],
    defaultVariables: [
      { name: 'partei1_name', displayName: 'Partei 1', type: 'text', group: 'Parteien', required: true },
      { name: 'partei2_name', displayName: 'Partei 2', type: 'text', group: 'Parteien', required: true },
      { name: 'vertragsdatum', displayName: 'Vertragsdatum', type: 'date', group: 'Allgemein' },
      { name: 'vertragsort', displayName: 'Vertragsort', type: 'text', group: 'Allgemein' },
    ],
  },
];

// Helper: Get template by ID
export function getTemplateById(id: string): ContractTemplate | undefined {
  return contractTemplates.find(t => t.id === id);
}

// Helper: Get templates by category
export function getTemplatesByCategory(category: ContractTemplate['category']): ContractTemplate[] {
  return contractTemplates.filter(t => t.category === category);
}

// Categories for display
export const templateCategories = [
  { id: 'business', name: 'Geschäftlich', icon: 'Building' },
  { id: 'employment', name: 'Arbeit', icon: 'Briefcase' },
  { id: 'property', name: 'Immobilien', icon: 'Home' },
  { id: 'finance', name: 'Finanzen', icon: 'Banknote' },
  { id: 'personal', name: 'Privat', icon: 'User' },
];
