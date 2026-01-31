// backend/scripts/seed_laws.js
// Legal Pulse - Echte deutsche Rechtsdatenbank für Vertragsmonitoring
// 50+ echte Paragraphen aus BGB, DSGVO, HGB, KSchG, TzBfG, MuSchG, etc.

const { MongoClient } = require("mongodb");

// ═══════════════════════════════════════════════════════════════
// ECHTE GESETZESTEXTE - Deutsche Rechtsdatenbank
// ═══════════════════════════════════════════════════════════════

const lawSections = [
  // ─────────────────────────────────────────────────
  // BGB - AGB-RECHT (§§ 305-310)
  // ─────────────────────────────────────────────────
  {
    lawId: "BGB_305",
    sectionId: "§ 305",
    title: "Einbeziehung Allgemeiner Geschäftsbedingungen in den Vertrag",
    text: `Allgemeine Geschäftsbedingungen sind alle für eine Vielzahl von Verträgen vorformulierten Vertragsbedingungen, die eine Vertragspartei (Verwender) der anderen Vertragspartei bei Abschluss eines Vertrags stellt. Gleichgültig ist, ob die Bestimmungen einen äußerlich gesonderten Bestandteil des Vertrags bilden oder in die Vertragsurkunde selbst aufgenommen werden, welchen Umfang sie haben, in welcher Schriftart sie verfasst sind und welche Form der Vertrag hat.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__305.html",
    area: "Vertragsrecht",
    keywords: ["AGB", "Allgemeine Geschäftsbedingungen", "Vertragsbedingungen", "Verwender"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_305c",
    sectionId: "§ 305c",
    title: "Überraschende und mehrdeutige Klauseln",
    text: `Bestimmungen in Allgemeinen Geschäftsbedingungen, die nach den Umständen, insbesondere nach dem äußeren Erscheinungsbild des Vertrags, so ungewöhnlich sind, dass der Vertragspartner des Verwenders mit ihnen nicht zu rechnen braucht, werden nicht Vertragsbestandteil. Zweifel bei der Auslegung Allgemeiner Geschäftsbedingungen gehen zu Lasten des Verwenders.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__305c.html",
    area: "Vertragsrecht",
    keywords: ["AGB", "überraschende Klausel", "Auslegung", "Verwender"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_307",
    sectionId: "§ 307",
    title: "Inhaltskontrolle",
    text: `Bestimmungen in Allgemeinen Geschäftsbedingungen sind unwirksam, wenn sie den Vertragspartner des Verwenders entgegen den Geboten von Treu und Glauben unangemessen benachteiligen. Eine unangemessene Benachteiligung kann sich auch daraus ergeben, dass die Bestimmung nicht klar und verständlich ist. Eine unangemessene Benachteiligung ist im Zweifel anzunehmen, wenn eine Bestimmung mit wesentlichen Grundgedanken der gesetzlichen Regelung, von der abgewichen wird, nicht zu vereinbaren ist, oder wesentliche Rechte oder Pflichten, die sich aus der Natur des Vertrags ergeben, so einschränkt, dass die Erreichung des Vertragszwecks gefährdet ist.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__307.html",
    area: "Vertragsrecht",
    keywords: ["AGB", "Inhaltskontrolle", "unwirksam", "Benachteiligung", "Treu und Glauben"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_308",
    sectionId: "§ 308",
    title: "Klauselverbote mit Wertungsmöglichkeit",
    text: `In Allgemeinen Geschäftsbedingungen ist insbesondere unwirksam: 1. eine Bestimmung, durch die sich der Verwender unangemessen lange oder nicht hinreichend bestimmte Fristen für die Annahme oder Ablehnung eines Angebots oder die Erbringung einer Leistung vorbehält; 2. eine Bestimmung, durch die sich der Verwender abweichend von Rechtsvorschriften das Recht vorbehält, die versprochene Leistung zu ändern oder von ihr abzuweichen; 3. eine Bestimmung, nach der der Verwender die Pflicht, die Leistung zu erbringen, erst auf Verlangen des anderen Vertragsteils übernimmt.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__308.html",
    area: "Vertragsrecht",
    keywords: ["AGB", "Klauselverbot", "Leistungsänderung", "Annahmefrist"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_309",
    sectionId: "§ 309",
    title: "Klauselverbote ohne Wertungsmöglichkeit",
    text: `Auch soweit eine Abweichung von den gesetzlichen Vorschriften zulässig ist, ist in Allgemeinen Geschäftsbedingungen unwirksam: Nr. 7: Ein Ausschluss oder eine Begrenzung der Haftung für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit, die auf einer fahrlässigen Pflichtverletzung des Verwenders oder einer vorsätzlichen oder fahrlässigen Pflichtverletzung eines gesetzlichen Vertreters oder Erfüllungsgehilfen des Verwenders beruhen. Nr. 8: Eine Bestimmung, durch die bei Verträgen über Lieferungen neu hergestellter Sachen und über Werkleistungen die Ansprüche gegen den Verwender wegen eines Mangels insgesamt oder bezüglich einzelner Teile auf ein Recht auf Nacherfüllung beschränkt werden.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__309.html",
    area: "Vertragsrecht",
    keywords: ["AGB", "Haftungsausschluss", "Klauselverbot", "Gewährleistung", "Personenschaden"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_310",
    sectionId: "§ 310",
    title: "Anwendungsbereich",
    text: `§ 305 Absatz 2 und 3, die §§ 308 und 309 finden keine Anwendung auf Allgemeine Geschäftsbedingungen, die gegenüber einem Unternehmer, einer juristischen Person des öffentlichen Rechts oder einem öffentlich-rechtlichen Sondervermögen verwendet werden. § 307 Abs. 1 und 2 ist in den in Satz 1 genannten Fällen auch insoweit anzuwenden, als dies zur Unwirksamkeit von in §§ 308 und 309 genannten Vertragsbestimmungen führt; auf die im Handelsverkehr geltenden Gewohnheiten und Gebräuche ist angemessen Rücksicht zu nehmen.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__310.html",
    area: "Vertragsrecht",
    keywords: ["AGB", "B2B", "Unternehmer", "Anwendungsbereich"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // BGB - FERNABSATZ & VERBRAUCHERRECHT
  // ─────────────────────────────────────────────────
  {
    lawId: "BGB_312",
    sectionId: "§ 312",
    title: "Anwendungsbereich der Vorschriften über besondere Vertriebsformen",
    text: `Die Vorschriften der §§ 312 bis 312k gelten für Verbraucherverträge im Sinne des § 310 Absatz 3. Sie gelten nicht für notariell beurkundete Verträge über Finanzdienstleistungen sowie für Verträge über die Begründung eines Miet- oder Pachtverhältnisses über Wohnraum. Bei kombinierten Verträgen über Waren und Dienstleistungen gelten die Vorschriften über den Fernabsatz auch für die Dienstleistung.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__312.html",
    area: "Verbraucherrecht",
    keywords: ["Fernabsatz", "Verbrauchervertrag", "Online-Handel", "E-Commerce"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_312g",
    sectionId: "§ 312g",
    title: "Widerrufsrecht",
    text: `Dem Verbraucher steht bei außerhalb von Geschäftsräumen geschlossenen Verträgen und bei Fernabsatzverträgen ein Widerrufsrecht gemäß § 355 zu. Das Widerrufsrecht besteht nicht bei Verträgen zur Lieferung von Waren, die nicht vorgefertigt sind und für deren Herstellung eine individuelle Auswahl oder Bestimmung durch den Verbraucher maßgeblich ist oder die eindeutig auf die persönlichen Bedürfnisse des Verbrauchers zugeschnitten sind, sowie bei Verträgen zur Lieferung versiegelter Waren, die aus Gründen des Gesundheitsschutzes oder der Hygiene nicht zur Rückgabe geeignet sind.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__312g.html",
    area: "Verbraucherrecht",
    keywords: ["Widerrufsrecht", "Fernabsatz", "Verbraucher", "14 Tage"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_355",
    sectionId: "§ 355",
    title: "Widerrufsrecht bei Verbraucherverträgen",
    text: `Wird einem Verbraucher durch Gesetz ein Widerrufsrecht nach dieser Vorschrift eingeräumt, so sind der Verbraucher und der Unternehmer an ihre auf den Abschluss des Vertrags gerichteten Willenserklärungen nicht mehr gebunden, wenn der Verbraucher seine Willenserklärung fristgerecht widerrufen hat. Der Widerruf erfolgt durch Erklärung gegenüber dem Unternehmer. Aus der Erklärung muss der Entschluss des Verbrauchers zum Widerruf des Vertrags eindeutig hervorgehen. Der Widerruf muss keine Begründung enthalten. Zur Fristwahrung genügt die rechtzeitige Absendung des Widerrufs.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__355.html",
    area: "Verbraucherrecht",
    keywords: ["Widerruf", "Verbraucher", "Frist", "Willenserklärung"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_356",
    sectionId: "§ 356",
    title: "Widerrufsrecht bei außerhalb von Geschäftsräumen geschlossenen Verträgen und Fernabsatzverträgen",
    text: `Die Widerrufsfrist beträgt 14 Tage. Sie beginnt mit Vertragsschluss, soweit nichts anderes bestimmt ist. Bei einem Vertrag, der eine Verpflichtung des Verbrauchers zum Kauf einer Ware zum Gegenstand hat, beginnt die Widerrufsfrist abweichend von Absatz 2 nicht vor dem Tag, an dem der Verbraucher oder ein von ihm benannter Dritter, der nicht der Beförderer ist, die Ware erhalten hat.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__356.html",
    area: "Verbraucherrecht",
    keywords: ["Widerrufsfrist", "14 Tage", "Fernabsatz", "Warenlieferung"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // BGB - KAUFRECHT
  // ─────────────────────────────────────────────────
  {
    lawId: "BGB_433",
    sectionId: "§ 433",
    title: "Vertragstypische Pflichten beim Kaufvertrag",
    text: `Durch den Kaufvertrag wird der Verkäufer einer Sache verpflichtet, dem Käufer die Sache zu übergeben und das Eigentum an der Sache zu verschaffen. Der Verkäufer hat dem Käufer die Sache frei von Sach- und Rechtsmängeln zu verschaffen. Der Käufer ist verpflichtet, dem Verkäufer den vereinbarten Kaufpreis zu zahlen und die gekaufte Sache abzunehmen.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__433.html",
    area: "Kaufrecht",
    keywords: ["Kaufvertrag", "Kaufpreis", "Sachmangel", "Eigentum"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_434",
    sectionId: "§ 434",
    title: "Sachmangel",
    text: `Die Sache ist frei von Sachmängeln, wenn sie bei Gefahrübergang den subjektiven Anforderungen, den objektiven Anforderungen und den Montageanforderungen entspricht. Die Sache entspricht den subjektiven Anforderungen, wenn sie die vereinbarte Beschaffenheit hat, sich für die nach dem Vertrag vorausgesetzte Verwendung eignet und mit dem vereinbarten Zubehör und den vereinbarten Anleitungen übergeben wird.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__434.html",
    area: "Kaufrecht",
    keywords: ["Sachmangel", "Beschaffenheit", "Gewährleistung", "Mangel"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_437",
    sectionId: "§ 437",
    title: "Rechte des Käufers bei Mängeln",
    text: `Ist die Sache mangelhaft, kann der Käufer, wenn die Voraussetzungen der folgenden Vorschriften vorliegen und soweit nicht ein anderes bestimmt ist, nach § 439 Nacherfüllung verlangen, nach den §§ 440, 323 und 326 Abs. 5 von dem Vertrag zurücktreten oder nach § 441 den Kaufpreis mindern und nach den §§ 440, 280, 281, 283 und 311a Schadensersatz oder nach § 284 Ersatz vergeblicher Aufwendungen verlangen.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__437.html",
    area: "Kaufrecht",
    keywords: ["Mängelrechte", "Nacherfüllung", "Rücktritt", "Minderung", "Schadensersatz"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_438",
    sectionId: "§ 438",
    title: "Verjährung der Mängelansprüche",
    text: `Die in § 437 Nr. 1 und 3 bezeichneten Ansprüche verjähren in 30 Jahren, wenn der Mangel in einem dinglichen Recht eines Dritten besteht, in fünf Jahren bei einem Bauwerk und im Übrigen in zwei Jahren. Die Verjährung beginnt bei Grundstücken mit der Übergabe, im Übrigen mit der Ablieferung der Sache.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__438.html",
    area: "Kaufrecht",
    keywords: ["Verjährung", "Gewährleistung", "zwei Jahre", "Mängelansprüche"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // BGB - MIETRECHT
  // ─────────────────────────────────────────────────
  {
    lawId: "BGB_535",
    sectionId: "§ 535",
    title: "Inhalt und Hauptpflichten des Mietvertrags",
    text: `Durch den Mietvertrag wird der Vermieter verpflichtet, dem Mieter den Gebrauch der Mietsache während der Mietzeit zu gewähren. Der Vermieter hat die Mietsache dem Mieter in einem zum vertragsgemäßen Gebrauch geeigneten Zustand zu überlassen und sie während der Mietzeit in diesem Zustand zu erhalten. Der Mieter ist verpflichtet, dem Vermieter die vereinbarte Miete zu entrichten.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__535.html",
    area: "Mietrecht",
    keywords: ["Mietvertrag", "Miete", "Vermieter", "Mieter", "Mietsache"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_556",
    sectionId: "§ 556",
    title: "Vereinbarungen über Betriebskosten",
    text: `Die Vertragsparteien können vereinbaren, dass der Mieter Betriebskosten trägt. Betriebskosten sind die Kosten, die dem Eigentümer oder Erbbauberechtigten durch das Eigentum oder das Erbbaurecht am Grundstück oder durch den bestimmungsmäßigen Gebrauch des Gebäudes, der Nebengebäude, Anlagen, Einrichtungen und des Grundstücks laufend entstehen. Über die Vorauszahlungen für Betriebskosten ist jährlich abzurechnen; dabei ist der Grundsatz der Wirtschaftlichkeit zu beachten.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__556.html",
    area: "Mietrecht",
    keywords: ["Betriebskosten", "Nebenkosten", "Abrechnung", "Mieter"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_558",
    sectionId: "§ 558",
    title: "Mieterhöhung bis zur ortsüblichen Vergleichsmiete",
    text: `Der Vermieter kann die Zustimmung zu einer Erhöhung der Miete bis zur ortsüblichen Vergleichsmiete verlangen, wenn die Miete in dem Zeitpunkt, zu dem die Erhöhung eintreten soll, seit 15 Monaten unverändert ist. Das Mieterhöhungsverlangen kann frühestens ein Jahr nach der letzten Mieterhöhung geltend gemacht werden. Erhöhungen nach den §§ 559 bis 560 werden nicht berücksichtigt. Die Miete darf sich innerhalb von drei Jahren nicht um mehr als 20 Prozent erhöhen (Kappungsgrenze).`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__558.html",
    area: "Mietrecht",
    keywords: ["Mieterhöhung", "Vergleichsmiete", "Kappungsgrenze", "20 Prozent"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_573",
    sectionId: "§ 573",
    title: "Ordentliche Kündigung des Vermieters",
    text: `Der Vermieter kann nur kündigen, wenn er ein berechtigtes Interesse an der Beendigung des Mietverhältnisses hat. Ein berechtigtes Interesse des Vermieters an der Beendigung des Mietverhältnisses liegt insbesondere vor, wenn der Mieter seine vertraglichen Pflichten schuldhaft nicht unerheblich verletzt hat, der Vermieter die Räume als Wohnung für sich, seine Familienangehörigen oder Angehörige seines Haushalts benötigt (Eigenbedarf), oder der Vermieter durch die Fortsetzung des Mietverhältnisses an einer angemessenen wirtschaftlichen Verwertung des Grundstücks gehindert wird.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__573.html",
    area: "Mietrecht",
    keywords: ["Kündigung", "Eigenbedarf", "berechtigtes Interesse", "Vermieter"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_573c",
    sectionId: "§ 573c",
    title: "Fristen der ordentlichen Kündigung",
    text: `Die Kündigung ist spätestens am dritten Werktag eines Kalendermonats zum Ablauf des übernächsten Monats zulässig. Die Kündigungsfrist für den Vermieter verlängert sich nach fünf und acht Jahren seit der Überlassung des Wohnraums um jeweils drei Monate. Eine Vereinbarung, die zum Nachteil des Mieters von dieser Vorschrift abweicht, ist unwirksam.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__573c.html",
    area: "Mietrecht",
    keywords: ["Kündigungsfrist", "drei Monate", "Werktag", "Mietvertrag"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_543",
    sectionId: "§ 543",
    title: "Außerordentliche fristlose Kündigung aus wichtigem Grund",
    text: `Jede Vertragspartei kann das Mietverhältnis aus wichtigem Grund außerordentlich fristlos kündigen. Ein wichtiger Grund liegt vor, wenn dem Kündigenden unter Berücksichtigung aller Umstände des Einzelfalls, insbesondere eines Verschuldens der Vertragsparteien, und unter Abwägung der beiderseitigen Interessen die Fortsetzung des Mietverhältnisses bis zum Ablauf der Kündigungsfrist oder bis zur sonstigen Beendigung des Mietverhältnisses nicht zugemutet werden kann.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__543.html",
    area: "Mietrecht",
    keywords: ["fristlose Kündigung", "wichtiger Grund", "außerordentlich", "Mietverhältnis"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // BGB - ARBEITSVERTRAG
  // ─────────────────────────────────────────────────
  {
    lawId: "BGB_611a",
    sectionId: "§ 611a",
    title: "Arbeitsvertrag",
    text: `Durch den Arbeitsvertrag wird der Arbeitnehmer im Dienste eines anderen zur Leistung weisungsgebundener, fremdbestimmter Arbeit in persönlicher Abhängigkeit verpflichtet. Das Weisungsrecht kann Inhalt, Durchführung, Zeit und Ort der Tätigkeit betreffen. Weisungsgebunden ist, wer nicht im Wesentlichen frei seine Tätigkeit gestalten und seine Arbeitszeit bestimmen kann. Der Grad der persönlichen Abhängigkeit hängt dabei auch von der Eigenart der jeweiligen Tätigkeit ab.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__611a.html",
    area: "Arbeitsrecht",
    keywords: ["Arbeitsvertrag", "Arbeitnehmer", "Weisungsrecht", "persönliche Abhängigkeit"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_622",
    sectionId: "§ 622",
    title: "Kündigungsfristen bei Arbeitsverhältnissen",
    text: `Das Arbeitsverhältnis eines Arbeiters oder eines Angestellten (Arbeitnehmers) kann mit einer Frist von vier Wochen zum Fünfzehnten oder zum Ende eines Kalendermonats gekündigt werden. Für eine Kündigung durch den Arbeitgeber beträgt die Kündigungsfrist, wenn das Arbeitsverhältnis in dem Betrieb oder Unternehmen 2 Jahre bestanden hat, einen Monat zum Ende eines Kalendermonats; 5 Jahre bestanden hat, zwei Monate zum Ende eines Kalendermonats; 8 Jahre bestanden hat, drei Monate zum Ende eines Kalendermonats; 10 Jahre bestanden hat, vier Monate zum Ende eines Kalendermonats; 12 Jahre bestanden hat, fünf Monate zum Ende eines Kalendermonats; 15 Jahre bestanden hat, sechs Monate zum Ende eines Kalendermonats; 20 Jahre bestanden hat, sieben Monate zum Ende eines Kalendermonats.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__622.html",
    area: "Arbeitsrecht",
    keywords: ["Kündigungsfrist", "vier Wochen", "Arbeitsverhältnis", "Betriebszugehörigkeit"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_626",
    sectionId: "§ 626",
    title: "Fristlose Kündigung aus wichtigem Grund",
    text: `Das Dienstverhältnis kann von jedem Vertragsteil aus wichtigem Grund ohne Einhaltung einer Kündigungsfrist gekündigt werden, wenn Tatsachen vorliegen, auf Grund derer dem Kündigenden unter Berücksichtigung aller Umstände des Einzelfalles und unter Abwägung der Interessen beider Vertragsteile die Fortsetzung des Dienstverhältnisses bis zum Ablauf der Kündigungsfrist oder bis zu der vereinbarten Beendigung des Dienstverhältnisses nicht zugemutet werden kann. Die Kündigung kann nur innerhalb von zwei Wochen erfolgen. Die Frist beginnt mit dem Zeitpunkt, in dem der Kündigungsberechtigte von den für die Kündigung maßgebenden Tatsachen Kenntnis erlangt.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__626.html",
    area: "Arbeitsrecht",
    keywords: ["fristlose Kündigung", "wichtiger Grund", "zwei Wochen", "Dienstverhältnis"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_613a",
    sectionId: "§ 613a",
    title: "Rechte und Pflichten bei Betriebsübergang",
    text: `Geht ein Betrieb oder Betriebsteil durch Rechtsgeschäft auf einen anderen Inhaber über, so tritt dieser in die Rechte und Pflichten aus den im Zeitpunkt des Übergangs bestehenden Arbeitsverhältnissen ein. Sind diese Rechte und Pflichten durch Rechtsnormen eines Tarifvertrags oder durch eine Betriebsvereinbarung geregelt, so werden sie Inhalt des Arbeitsverhältnisses zwischen dem neuen Inhaber und dem Arbeitnehmer. Die Kündigung des Arbeitsverhältnisses eines Arbeitnehmers durch den bisherigen Arbeitgeber oder durch den neuen Inhaber wegen des Übergangs eines Betriebs oder eines Betriebsteils ist unwirksam.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__613a.html",
    area: "Arbeitsrecht",
    keywords: ["Betriebsübergang", "Arbeitsverhältnis", "Kündigungsverbot", "Rechtsgeschäft"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_615",
    sectionId: "§ 615",
    title: "Vergütung bei Annahmeverzug und bei Betriebsrisiko",
    text: `Kommt der Dienstberechtigte mit der Annahme der Dienste in Verzug, so kann der Verpflichtete für die infolge des Verzugs nicht geleisteten Dienste die vereinbarte Vergütung verlangen, ohne zur Nachleistung verpflichtet zu sein. Er muss sich jedoch den Wert desjenigen anrechnen lassen, was er infolge des Unterbleibens der Dienstleistung erspart oder durch anderweitige Verwendung seiner Dienste erwirbt oder zu erwerben böswillig unterlässt. Der Arbeitgeber trägt das Risiko des Arbeitsausfalls, wenn die Arbeit aus Gründen ausfällt, die in seinem betrieblichen Bereich liegen.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__615.html",
    area: "Arbeitsrecht",
    keywords: ["Annahmeverzug", "Vergütung", "Betriebsrisiko", "Arbeitsausfall"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // KSCHG - KÜNDIGUNGSSCHUTZGESETZ
  // ─────────────────────────────────────────────────
  {
    lawId: "KSchG_1",
    sectionId: "§ 1 KSchG",
    title: "Sozial ungerechtfertigte Kündigungen",
    text: `Die Kündigung des Arbeitsverhältnisses gegenüber einem Arbeitnehmer, dessen Arbeitsverhältnis in demselben Betrieb oder Unternehmen ohne Unterbrechung länger als sechs Monate bestanden hat, ist rechtsunwirksam, wenn sie sozial ungerechtfertigt ist. Sozial ungerechtfertigt ist die Kündigung, wenn sie nicht durch Gründe, die in der Person oder in dem Verhalten des Arbeitnehmers liegen, oder durch dringende betriebliche Erfordernisse, die einer Weiterbeschäftigung des Arbeitnehmers in diesem Betrieb entgegenstehen, bedingt ist.`,
    sourceUrl: "https://www.gesetze-im-internet.de/kschg/__1.html",
    area: "Arbeitsrecht",
    keywords: ["Kündigungsschutz", "sozial ungerechtfertigt", "sechs Monate", "betriebsbedingt", "personenbedingt", "verhaltensbedingt"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "KSchG_2",
    sectionId: "§ 2 KSchG",
    title: "Änderungskündigung",
    text: `Kündigt der Arbeitgeber das Arbeitsverhältnis und bietet er dem Arbeitnehmer im Zusammenhang mit der Kündigung die Fortsetzung des Arbeitsverhältnisses zu geänderten Arbeitsbedingungen an, so kann der Arbeitnehmer dieses Angebot unter dem Vorbehalt annehmen, daß die Änderung der Arbeitsbedingungen nicht sozial ungerechtfertigt ist.`,
    sourceUrl: "https://www.gesetze-im-internet.de/kschg/__2.html",
    area: "Arbeitsrecht",
    keywords: ["Änderungskündigung", "Arbeitsbedingungen", "Vorbehalt", "sozial ungerechtfertigt"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "KSchG_4",
    sectionId: "§ 4 KSchG",
    title: "Anrufung des Arbeitsgerichts",
    text: `Will ein Arbeitnehmer geltend machen, dass eine Kündigung sozial ungerechtfertigt oder aus anderen Gründen rechtsunwirksam ist, so muss er innerhalb von drei Wochen nach Zugang der schriftlichen Kündigung Klage beim Arbeitsgericht auf Feststellung erheben, dass das Arbeitsverhältnis durch die Kündigung nicht aufgelöst ist. Hat der Arbeitnehmer die Klagefrist versäumt, wird die Kündigung als von Anfang an rechtswirksam angesehen.`,
    sourceUrl: "https://www.gesetze-im-internet.de/kschg/__4.html",
    area: "Arbeitsrecht",
    keywords: ["Kündigungsschutzklage", "drei Wochen", "Klagefrist", "Arbeitsgericht"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "KSchG_23",
    sectionId: "§ 23 KSchG",
    title: "Geltungsbereich",
    text: `Die Vorschriften des Ersten und Zweiten Abschnitts gelten für Betriebe und Verwaltungen des privaten und des öffentlichen Rechts. Die Vorschriften des Ersten Abschnitts gelten mit Ausnahme der §§ 4 bis 7 und des § 13 Absatz 1 Satz 1 und 2 nicht für Betriebe und Verwaltungen, in denen in der Regel zehn oder weniger Arbeitnehmer ausschließlich der zu ihrer Berufsbildung Beschäftigten beschäftigt werden (Kleinbetriebsklausel).`,
    sourceUrl: "https://www.gesetze-im-internet.de/kschg/__23.html",
    area: "Arbeitsrecht",
    keywords: ["Kleinbetrieb", "zehn Arbeitnehmer", "Geltungsbereich", "Kündigungsschutz"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // TZBFG - TEILZEIT- UND BEFRISTUNGSGESETZ
  // ─────────────────────────────────────────────────
  {
    lawId: "TzBfG_14",
    sectionId: "§ 14 TzBfG",
    title: "Zulässigkeit der Befristung",
    text: `Die Befristung eines Arbeitsvertrages ist zulässig, wenn sie durch einen sachlichen Grund gerechtfertigt ist. Ein sachlicher Grund liegt insbesondere vor, wenn der betriebliche Bedarf an der Arbeitsleistung nur vorübergehend besteht, die Befristung im Anschluss an eine Ausbildung oder ein Studium erfolgt, der Arbeitnehmer zur Vertretung eines anderen Arbeitnehmers beschäftigt wird, die Eigenart der Arbeitsleistung die Befristung rechtfertigt, oder die Befristung zur Erprobung erfolgt. Die kalendermäßige Befristung eines Arbeitsvertrages ohne Vorliegen eines sachlichen Grundes ist bis zur Dauer von zwei Jahren zulässig; bis zu dieser Gesamtdauer von zwei Jahren ist auch die höchstens dreimalige Verlängerung eines kalendermäßig befristeten Arbeitsvertrages zulässig.`,
    sourceUrl: "https://www.gesetze-im-internet.de/tzbfg/__14.html",
    area: "Arbeitsrecht",
    keywords: ["Befristung", "sachlicher Grund", "zwei Jahre", "Arbeitsvertrag", "befristet"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "TzBfG_15",
    sectionId: "§ 15 TzBfG",
    title: "Ende des befristeten Arbeitsvertrags",
    text: `Ein kalendermäßig befristeter Arbeitsvertrag endet mit Ablauf der vereinbarten Zeit. Ein zweckbefristeter Arbeitsvertrag endet mit Erreichen des Zwecks, frühestens jedoch zwei Wochen nach Zugang der schriftlichen Unterrichtung des Arbeitnehmers durch den Arbeitgeber über den Zeitpunkt der Zweckerreichung. Wird der Arbeitsvertrag nach Ablauf der Zeit oder nach Zweckerreichung fortgesetzt, gilt er als auf unbestimmte Zeit geschlossen, wenn der Arbeitgeber nicht unverzüglich widerspricht.`,
    sourceUrl: "https://www.gesetze-im-internet.de/tzbfg/__15.html",
    area: "Arbeitsrecht",
    keywords: ["Befristung", "Beendigung", "Zweckbefristung", "unbefristet"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "TzBfG_8",
    sectionId: "§ 8 TzBfG",
    title: "Verringerung der Arbeitszeit",
    text: `Ein Arbeitnehmer, dessen Arbeitsverhältnis länger als sechs Monate bestanden hat, kann verlangen, dass seine vertraglich vereinbarte Arbeitszeit verringert wird. Der Arbeitnehmer muss die Verringerung seiner Arbeitszeit und den Umfang der Verringerung spätestens drei Monate vor deren Beginn in Textform geltend machen. Der Arbeitgeber hat mit dem Arbeitnehmer die gewünschte Verringerung der Arbeitszeit mit dem Ziel zu erörtern, zu einer Vereinbarung zu gelangen. Der Arbeitgeber hat der Verringerung der Arbeitszeit zuzustimmen, soweit betriebliche Gründe nicht entgegenstehen.`,
    sourceUrl: "https://www.gesetze-im-internet.de/tzbfg/__8.html",
    area: "Arbeitsrecht",
    keywords: ["Teilzeit", "Arbeitszeitverringerung", "sechs Monate", "betriebliche Gründe"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // ENTGELTFORTZAHLUNGSGESETZ
  // ─────────────────────────────────────────────────
  {
    lawId: "EntgFG_3",
    sectionId: "§ 3 EntgFG",
    title: "Anspruch auf Entgeltfortzahlung im Krankheitsfall",
    text: `Wird ein Arbeitnehmer durch Arbeitsunfähigkeit infolge Krankheit an seiner Arbeitsleistung verhindert, ohne daß ihn ein Verschulden trifft, so hat er Anspruch auf Entgeltfortzahlung im Krankheitsfall durch den Arbeitgeber für die Zeit der Arbeitsunfähigkeit bis zur Dauer von sechs Wochen. Der Anspruch entsteht nach vierwöchiger ununterbrochener Dauer des Arbeitsverhältnisses.`,
    sourceUrl: "https://www.gesetze-im-internet.de/entgfg/__3.html",
    area: "Arbeitsrecht",
    keywords: ["Entgeltfortzahlung", "Krankheit", "sechs Wochen", "Arbeitsunfähigkeit"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // BURLG - BUNDESURLAUBSGESETZ
  // ─────────────────────────────────────────────────
  {
    lawId: "BUrlG_3",
    sectionId: "§ 3 BUrlG",
    title: "Dauer des Urlaubs",
    text: `Der Urlaub beträgt jährlich mindestens 24 Werktage. Als Werktage gelten alle Kalendertage, die nicht Sonn- oder gesetzliche Feiertage sind. Bei einer 5-Tage-Woche beträgt der Mindesturlaub 20 Arbeitstage.`,
    sourceUrl: "https://www.gesetze-im-internet.de/burlg/__3.html",
    area: "Arbeitsrecht",
    keywords: ["Urlaub", "Mindesturlaub", "24 Werktage", "20 Arbeitstage"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // DSGVO - DATENSCHUTZ-GRUNDVERORDNUNG
  // ─────────────────────────────────────────────────
  {
    lawId: "DSGVO_Art5",
    sectionId: "Art. 5 DSGVO",
    title: "Grundsätze für die Verarbeitung personenbezogener Daten",
    text: `Personenbezogene Daten müssen auf rechtmäßige Weise, nach Treu und Glauben und in einer für die betroffene Person nachvollziehbaren Weise verarbeitet werden (Rechtmäßigkeit, Verarbeitung nach Treu und Glauben, Transparenz). Sie müssen für festgelegte, eindeutige und legitime Zwecke erhoben werden und dürfen nicht in einer mit diesen Zwecken nicht zu vereinbarenden Weise weiterverarbeitet werden (Zweckbindung). Sie müssen dem Zweck angemessen und erheblich sowie auf das für die Zwecke der Verarbeitung notwendige Maß beschränkt sein (Datenminimierung).`,
    sourceUrl: "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679",
    area: "Datenschutz",
    keywords: ["DSGVO", "Grundsätze", "Rechtmäßigkeit", "Zweckbindung", "Datenminimierung"],
    version: "2016/679",
    language: "de"
  },
  {
    lawId: "DSGVO_Art6",
    sectionId: "Art. 6 DSGVO",
    title: "Rechtmäßigkeit der Verarbeitung",
    text: `Die Verarbeitung ist nur rechtmäßig, wenn mindestens eine der nachstehenden Bedingungen erfüllt ist: a) Die betroffene Person hat ihre Einwilligung zu der Verarbeitung gegeben; b) die Verarbeitung ist für die Erfüllung eines Vertrags erforderlich; c) die Verarbeitung ist zur Erfüllung einer rechtlichen Verpflichtung erforderlich; d) die Verarbeitung ist erforderlich, um lebenswichtige Interessen zu schützen; e) die Verarbeitung ist für die Wahrnehmung einer Aufgabe im öffentlichen Interesse erforderlich; f) die Verarbeitung ist zur Wahrung der berechtigten Interessen des Verantwortlichen erforderlich.`,
    sourceUrl: "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679",
    area: "Datenschutz",
    keywords: ["DSGVO", "Rechtmäßigkeit", "Einwilligung", "Vertragserfüllung", "berechtigtes Interesse"],
    version: "2016/679",
    language: "de"
  },
  {
    lawId: "DSGVO_Art13",
    sectionId: "Art. 13 DSGVO",
    title: "Informationspflicht bei Erhebung von personenbezogenen Daten",
    text: `Werden personenbezogene Daten bei der betroffenen Person erhoben, so teilt der Verantwortliche der betroffenen Person zum Zeitpunkt der Erhebung dieser Daten Folgendes mit: den Namen und die Kontaktdaten des Verantwortlichen, die Kontaktdaten des Datenschutzbeauftragten, die Zwecke der Verarbeitung sowie die Rechtsgrundlage, die berechtigten Interessen, die Empfänger der Daten, die Absicht einer Drittlandübermittlung, die Dauer der Speicherung, die Betroffenenrechte und das Beschwerderecht bei der Aufsichtsbehörde.`,
    sourceUrl: "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679",
    area: "Datenschutz",
    keywords: ["DSGVO", "Informationspflicht", "Datenschutzbeauftragter", "Betroffenenrechte"],
    version: "2016/679",
    language: "de"
  },
  {
    lawId: "DSGVO_Art15",
    sectionId: "Art. 15 DSGVO",
    title: "Auskunftsrecht der betroffenen Person",
    text: `Die betroffene Person hat das Recht, von dem Verantwortlichen eine Bestätigung darüber zu verlangen, ob sie betreffende personenbezogene Daten verarbeitet werden; ist dies der Fall, so hat sie ein Recht auf Auskunft über diese personenbezogenen Daten und auf folgende Informationen: die Verarbeitungszwecke, die Kategorien personenbezogener Daten, die Empfänger, die geplante Speicherdauer, das Bestehen eines Rechts auf Berichtigung oder Löschung, das Beschwerderecht und die Herkunft der Daten.`,
    sourceUrl: "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679",
    area: "Datenschutz",
    keywords: ["DSGVO", "Auskunftsrecht", "Betroffenenrechte", "Datenauskunft"],
    version: "2016/679",
    language: "de"
  },
  {
    lawId: "DSGVO_Art17",
    sectionId: "Art. 17 DSGVO",
    title: "Recht auf Löschung (Recht auf Vergessenwerden)",
    text: `Die betroffene Person hat das Recht, von dem Verantwortlichen zu verlangen, dass sie betreffende personenbezogene Daten unverzüglich gelöscht werden, und der Verantwortliche ist verpflichtet, personenbezogene Daten unverzüglich zu löschen, sofern die Daten für die Zwecke nicht mehr notwendig sind, die Einwilligung widerrufen wird, die betroffene Person Widerspruch einlegt, die Daten unrechtmäßig verarbeitet wurden, oder die Löschung zur Erfüllung einer rechtlichen Verpflichtung erforderlich ist.`,
    sourceUrl: "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679",
    area: "Datenschutz",
    keywords: ["DSGVO", "Löschung", "Recht auf Vergessenwerden", "Datenlöschung"],
    version: "2016/679",
    language: "de"
  },
  {
    lawId: "DSGVO_Art28",
    sectionId: "Art. 28 DSGVO",
    title: "Auftragsverarbeiter",
    text: `Erfolgt eine Verarbeitung im Auftrag eines Verantwortlichen, so arbeitet dieser nur mit Auftragsverarbeitern, die hinreichend Garantien dafür bieten, dass geeignete technische und organisatorische Maßnahmen so durchgeführt werden, dass die Verarbeitung im Einklang mit den Anforderungen dieser Verordnung erfolgt und den Schutz der Rechte der betroffenen Person gewährleistet. Die Verarbeitung durch einen Auftragsverarbeiter erfolgt auf der Grundlage eines Vertrags, der den Auftragsverarbeiter in Bezug auf den Verantwortlichen bindet und der Gegenstand und Dauer der Verarbeitung, Art und Zweck der Verarbeitung, die Art der personenbezogenen Daten und die Kategorien betroffener Personen festlegt.`,
    sourceUrl: "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679",
    area: "Datenschutz",
    keywords: ["DSGVO", "Auftragsverarbeitung", "AV-Vertrag", "technische Maßnahmen", "TOM"],
    version: "2016/679",
    language: "de"
  },
  {
    lawId: "DSGVO_Art33",
    sectionId: "Art. 33 DSGVO",
    title: "Meldung von Verletzungen des Schutzes personenbezogener Daten an die Aufsichtsbehörde",
    text: `Im Falle einer Verletzung des Schutzes personenbezogener Daten meldet der Verantwortliche unverzüglich und möglichst binnen 72 Stunden, nachdem ihm die Verletzung bekannt wurde, diese der zuständigen Aufsichtsbehörde, es sei denn, dass die Verletzung des Schutzes personenbezogener Daten voraussichtlich nicht zu einem Risiko für die Rechte und Freiheiten natürlicher Personen führt.`,
    sourceUrl: "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679",
    area: "Datenschutz",
    keywords: ["DSGVO", "Datenpanne", "Meldepflicht", "72 Stunden", "Aufsichtsbehörde"],
    version: "2016/679",
    language: "de"
  },
  {
    lawId: "DSGVO_Art82",
    sectionId: "Art. 82 DSGVO",
    title: "Haftung und Recht auf Schadenersatz",
    text: `Jede Person, der wegen eines Verstoßes gegen diese Verordnung ein materieller oder immaterieller Schaden entstanden ist, hat Anspruch auf Schadenersatz gegen den Verantwortlichen oder gegen den Auftragsverarbeiter. Jeder an einer Verarbeitung beteiligte Verantwortliche haftet für den Schaden, der durch eine nicht dieser Verordnung entsprechende Verarbeitung verursacht wurde. Ein Auftragsverarbeiter haftet für den durch eine Verarbeitung verursachten Schaden nur dann, wenn er seinen speziell den Auftragsverarbeitern auferlegten Pflichten nicht nachgekommen ist.`,
    sourceUrl: "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679",
    area: "Datenschutz",
    keywords: ["DSGVO", "Schadensersatz", "Haftung", "immaterieller Schaden"],
    version: "2016/679",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // HGB - HANDELSGESETZBUCH
  // ─────────────────────────────────────────────────
  {
    lawId: "HGB_343",
    sectionId: "§ 343 HGB",
    title: "Handelsgeschäfte",
    text: `Handelsgeschäfte sind alle Geschäfte eines Kaufmanns, die zum Betriebe seines Handelsgewerbes gehören. Die von einem Kaufmann vorgenommenen Rechtsgeschäfte gelten im Zweifel als zum Betriebe seines Handelsgewerbes gehörig.`,
    sourceUrl: "https://www.gesetze-im-internet.de/hgb/__343.html",
    area: "Handelsrecht",
    keywords: ["Handelsgeschäft", "Kaufmann", "Handelsgewerbe"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "HGB_377",
    sectionId: "§ 377 HGB",
    title: "Untersuchungs- und Rügepflicht",
    text: `Ist der Kauf für beide Teile ein Handelsgeschäft, so hat der Käufer die Ware unverzüglich nach der Ablieferung durch den Verkäufer, soweit dies nach ordnungsmäßigem Geschäftsgange tunlich ist, zu untersuchen und, wenn sich ein Mangel zeigt, dem Verkäufer unverzüglich Anzeige zu machen. Unterlässt der Käufer die Anzeige, so gilt die Ware als genehmigt, es sei denn, dass es sich um einen Mangel handelt, der bei der Untersuchung nicht erkennbar war.`,
    sourceUrl: "https://www.gesetze-im-internet.de/hgb/__377.html",
    area: "Handelsrecht",
    keywords: ["Rügepflicht", "Untersuchungspflicht", "Mangel", "Handelsgeschäft", "unverzüglich"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "HGB_74",
    sectionId: "§ 74 HGB",
    title: "Wettbewerbsverbot",
    text: `Eine Vereinbarung zwischen dem Prinzipal und dem Handlungsgehilfen, die den Gehilfen für die Zeit nach Beendigung des Dienstverhältnisses in seiner gewerblichen Tätigkeit beschränkt (Wettbewerbsverbot), bedarf der Schriftform und der Aushändigung einer vom Prinzipal unterzeichneten, die vereinbarten Bestimmungen enthaltenden Urkunde an den Gehilfen. Das Wettbewerbsverbot ist nur verbindlich, wenn sich der Prinzipal verpflichtet, für die Dauer des Verbots eine Entschädigung zu zahlen, die für jedes Jahr des Verbots mindestens die Hälfte der von dem Handlungsgehilfen zuletzt bezogenen vertragsmäßigen Leistungen erreicht.`,
    sourceUrl: "https://www.gesetze-im-internet.de/hgb/__74.html",
    area: "Arbeitsrecht",
    keywords: ["Wettbewerbsverbot", "Karenzentschädigung", "nachvertragliches Wettbewerbsverbot", "Schriftform"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // BGB - DIENSTVERTRAG & WERKVERTRAG
  // ─────────────────────────────────────────────────
  {
    lawId: "BGB_611",
    sectionId: "§ 611",
    title: "Vertragstypische Pflichten beim Dienstvertrag",
    text: `Durch den Dienstvertrag wird derjenige, welcher Dienste zusagt, zur Leistung der versprochenen Dienste, der andere Teil zur Gewährung der vereinbarten Vergütung verpflichtet. Gegenstand des Dienstvertrags können Dienste jeder Art sein.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__611.html",
    area: "Vertragsrecht",
    keywords: ["Dienstvertrag", "Dienste", "Vergütung"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_631",
    sectionId: "§ 631",
    title: "Vertragstypische Pflichten beim Werkvertrag",
    text: `Durch den Werkvertrag wird der Unternehmer zur Herstellung des versprochenen Werkes, der Besteller zur Entrichtung der vereinbarten Vergütung verpflichtet. Gegenstand des Werkvertrags kann sowohl die Herstellung oder Veränderung einer Sache als auch ein anderer durch Arbeit oder Dienstleistung herbeizuführender Erfolg sein.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__631.html",
    area: "Vertragsrecht",
    keywords: ["Werkvertrag", "Herstellung", "Werk", "Vergütung", "Erfolg"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_634",
    sectionId: "§ 634",
    title: "Rechte des Bestellers bei Mängeln",
    text: `Ist das Werk mangelhaft, kann der Besteller, wenn die Voraussetzungen der folgenden Vorschriften vorliegen und soweit nicht ein anderes bestimmt ist, Nacherfüllung verlangen, den Mangel selbst beseitigen und Ersatz der erforderlichen Aufwendungen verlangen, von dem Vertrag zurücktreten oder die Vergütung mindern und Schadensersatz oder Ersatz vergeblicher Aufwendungen verlangen.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__634.html",
    area: "Vertragsrecht",
    keywords: ["Werkvertrag", "Mängelrechte", "Nacherfüllung", "Selbstvornahme", "Rücktritt"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_634a",
    sectionId: "§ 634a",
    title: "Verjährung der Mängelansprüche beim Werkvertrag",
    text: `Die in § 634 Nr. 1, 2 und 4 bezeichneten Ansprüche verjähren in fünf Jahren bei einem Bauwerk und einem Werk, dessen Erfolg in der Erbringung von Planungs- oder Überwachungsleistungen hierfür besteht, und in zwei Jahren bei einem Werk, dessen Erfolg in der Herstellung, Wartung oder Veränderung einer Sache oder in der Erbringung von Planungs- oder Überwachungsleistungen hierfür besteht, sowie im Übrigen in der regelmäßigen Verjährungsfrist.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__634a.html",
    area: "Vertragsrecht",
    keywords: ["Verjährung", "Werkvertrag", "fünf Jahre", "Bauwerk", "Mängelansprüche"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // BGB - ALLGEMEINES VERTRAGSRECHT
  // ─────────────────────────────────────────────────
  {
    lawId: "BGB_119",
    sectionId: "§ 119",
    title: "Anfechtbarkeit wegen Irrtums",
    text: `Wer bei der Abgabe einer Willenserklärung über deren Inhalt im Irrtum war oder eine Erklärung dieses Inhalts überhaupt nicht abgeben wollte, kann die Erklärung anfechten. Als Irrtum über den Inhalt der Erklärung gilt auch der Irrtum über solche Eigenschaften der Person oder der Sache, die im Verkehr als wesentlich angesehen werden.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__119.html",
    area: "Vertragsrecht",
    keywords: ["Anfechtung", "Irrtum", "Willenserklärung", "Eigenschaftsirrtum"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_123",
    sectionId: "§ 123",
    title: "Anfechtbarkeit wegen Täuschung oder Drohung",
    text: `Wer zur Abgabe einer Willenserklärung durch arglistige Täuschung oder widerrechtlich durch Drohung bestimmt worden ist, kann die Erklärung anfechten. Hat ein Dritter die Täuschung verübt, so ist eine Erklärung, die einem anderen gegenüber abzugeben war, nur dann anfechtbar, wenn dieser die Täuschung kannte oder kennen musste.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__123.html",
    area: "Vertragsrecht",
    keywords: ["Anfechtung", "Täuschung", "Drohung", "arglistig"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_280",
    sectionId: "§ 280",
    title: "Schadensersatz wegen Pflichtverletzung",
    text: `Verletzt der Schuldner eine Pflicht aus dem Schuldverhältnis, so kann der Gläubiger Ersatz des hierdurch entstehenden Schadens verlangen. Dies gilt nicht, wenn der Schuldner die Pflichtverletzung nicht zu vertreten hat. Schadensersatz wegen Verzögerung der Leistung kann der Gläubiger nur unter der zusätzlichen Voraussetzung des § 286 verlangen. Schadensersatz statt der Leistung kann der Gläubiger nur unter den zusätzlichen Voraussetzungen des § 281, des § 282 oder des § 283 verlangen.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__280.html",
    area: "Vertragsrecht",
    keywords: ["Schadensersatz", "Pflichtverletzung", "Verzug", "Schuldner"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_286",
    sectionId: "§ 286",
    title: "Verzug des Schuldners",
    text: `Leistet der Schuldner auf eine Mahnung des Gläubigers nicht, die nach dem Eintritt der Fälligkeit erfolgt, so kommt er durch die Mahnung in Verzug. Der Mahnung bedarf es nicht, wenn für die Leistung eine Zeit nach dem Kalender bestimmt ist, der Leistung ein Ereignis vorauszugehen hat und eine angemessene Zeit für die Leistung in der Weise bestimmt ist, dass sie sich von dem Ereignis an nach dem Kalender berechnen lässt, der Schuldner die Leistung ernsthaft und endgültig verweigert, oder aus besonderen Gründen unter Abwägung der beiderseitigen Interessen der sofortige Eintritt des Verzugs gerechtfertigt ist.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__286.html",
    area: "Vertragsrecht",
    keywords: ["Verzug", "Mahnung", "Fälligkeit", "Schuldner"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_323",
    sectionId: "§ 323",
    title: "Rücktritt wegen nicht oder nicht vertragsgemäß erbrachter Leistung",
    text: `Erbringt bei einem gegenseitigen Vertrag der Schuldner eine fällige Leistung nicht oder nicht vertragsgemäß, so kann der Gläubiger, wenn er dem Schuldner erfolglos eine angemessene Frist zur Leistung oder Nacherfüllung bestimmt hat, vom Vertrag zurücktreten. Die Fristsetzung ist entbehrlich, wenn der Schuldner die Leistung ernsthaft und endgültig verweigert, der Schuldner die Leistung bis zu einem im Vertrag bestimmten Termin oder innerhalb einer bestimmten Frist nicht bewirkt und der Gläubiger im Vertrag den Fortbestand seines Leistungsinteresses an die Rechtzeitigkeit der Leistung gebunden hat, oder besondere Umstände vorliegen, die unter Abwägung der beiderseitigen Interessen den sofortigen Rücktritt rechtfertigen.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__323.html",
    area: "Vertragsrecht",
    keywords: ["Rücktritt", "Fristsetzung", "Nacherfüllung", "Leistungsstörung"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // UWG - GESETZ GEGEN DEN UNLAUTEREN WETTBEWERB
  // ─────────────────────────────────────────────────
  {
    lawId: "UWG_3",
    sectionId: "§ 3 UWG",
    title: "Verbot unlauterer geschäftlicher Handlungen",
    text: `Unlautere geschäftliche Handlungen sind unzulässig. Geschäftliche Handlungen, die sich an Verbraucher richten oder diese erreichen, sind unlauter, wenn sie nicht der unternehmerischen Sorgfalt entsprechen und dazu geeignet sind, das wirtschaftliche Verhalten des Verbrauchers wesentlich zu beeinflussen.`,
    sourceUrl: "https://www.gesetze-im-internet.de/uwg_2004/__3.html",
    area: "Vertragsrecht",
    keywords: ["Wettbewerb", "unlautere Handlung", "Verbraucherschutz", "UWG"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "UWG_5",
    sectionId: "§ 5 UWG",
    title: "Irreführende geschäftliche Handlungen",
    text: `Unlauter handelt, wer eine irreführende geschäftliche Handlung vornimmt, die geeignet ist, den Verbraucher oder sonstigen Marktteilnehmer zu einer geschäftlichen Entscheidung zu veranlassen, die er andernfalls nicht getroffen hätte. Eine geschäftliche Handlung ist irreführend, wenn sie unwahre Angaben enthält oder sonstige zur Täuschung geeignete Angaben über die wesentlichen Merkmale der Ware oder Dienstleistung, den Anlass des Verkaufs, den Preis oder die Art seiner Berechnung enthält.`,
    sourceUrl: "https://www.gesetze-im-internet.de/uwg_2004/__5.html",
    area: "Vertragsrecht",
    keywords: ["Irreführung", "Täuschung", "Werbung", "unlauterer Wettbewerb"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // BGB - VERJÄHRUNG
  // ─────────────────────────────────────────────────
  {
    lawId: "BGB_195",
    sectionId: "§ 195",
    title: "Regelmäßige Verjährungsfrist",
    text: `Die regelmäßige Verjährungsfrist beträgt drei Jahre.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__195.html",
    area: "Vertragsrecht",
    keywords: ["Verjährung", "drei Jahre", "regelmäßige Frist"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "BGB_199",
    sectionId: "§ 199",
    title: "Beginn der regelmäßigen Verjährungsfrist und Verjährungshöchstfristen",
    text: `Die regelmäßige Verjährungsfrist beginnt mit dem Schluss des Jahres, in dem der Anspruch entstanden ist und der Gläubiger von den den Anspruch begründenden Umständen und der Person des Schuldners Kenntnis erlangt oder ohne grobe Fahrlässigkeit erlangen müsste. Ohne Rücksicht auf die Kenntnis oder grob fahrlässige Unkenntnis verjähren Schadensersatzansprüche in 30 Jahren von der Begehung der Handlung, der Pflichtverletzung oder dem sonstigen, den Schaden auslösenden Ereignis an.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__199.html",
    area: "Vertragsrecht",
    keywords: ["Verjährungsbeginn", "Kenntnis", "Höchstfrist", "30 Jahre"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // NACHWEISGESETZ
  // ─────────────────────────────────────────────────
  {
    lawId: "NachwG_2",
    sectionId: "§ 2 NachwG",
    title: "Nachweispflicht",
    text: `Der Arbeitgeber hat die wesentlichen Vertragsbedingungen des Arbeitsverhältnisses innerhalb der Fristen des Satzes 4 schriftlich niederzulegen, die Niederschrift zu unterzeichnen und dem Arbeitnehmer auszuhändigen. In die Niederschrift sind mindestens aufzunehmen: der Name und die Anschrift der Vertragsparteien, der Zeitpunkt des Beginns des Arbeitsverhältnisses, bei befristeten Arbeitsverhältnissen das Enddatum oder die vorhersehbare Dauer, der Arbeitsort, eine Beschreibung der Tätigkeit, die Zusammensetzung und die Höhe des Arbeitsentgelts, die vereinbarte Arbeitszeit, die Dauer des jährlichen Erholungsurlaubs, die Fristen für die Kündigung des Arbeitsverhältnisses und ein Hinweis auf anwendbare Tarifverträge und Betriebsvereinbarungen.`,
    sourceUrl: "https://www.gesetze-im-internet.de/nachwg/__2.html",
    area: "Arbeitsrecht",
    keywords: ["Nachweisgesetz", "Vertragsbedingungen", "Niederschrift", "Arbeitsvertrag"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // AGG - ALLGEMEINES GLEICHBEHANDLUNGSGESETZ
  // ─────────────────────────────────────────────────
  {
    lawId: "AGG_1",
    sectionId: "§ 1 AGG",
    title: "Ziel des Gesetzes",
    text: `Ziel des Gesetzes ist, Benachteiligungen aus Gründen der Rasse oder wegen der ethnischen Herkunft, des Geschlechts, der Religion oder Weltanschauung, einer Behinderung, des Alters oder der sexuellen Identität zu verhindern oder zu beseitigen.`,
    sourceUrl: "https://www.gesetze-im-internet.de/agg/__1.html",
    area: "Arbeitsrecht",
    keywords: ["Gleichbehandlung", "Diskriminierung", "AGG", "Benachteiligung"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // GESELLSCHAFTSRECHT
  // ─────────────────────────────────────────────────
  {
    lawId: "GmbHG_15",
    sectionId: "§ 15 GmbHG",
    title: "Übertragung von Geschäftsanteilen",
    text: `Die Geschäftsanteile sind veräußerlich und vererblich. Erwirb und Veräußerung von Geschäftsanteilen sind, wenn im Gesellschaftsvertrag nichts anderes bestimmt wird, an keine Voraussetzung geknüpft. Die Abtretung von Geschäftsanteilen bedarf eines in notarieller Form geschlossenen Vertrags.`,
    sourceUrl: "https://www.gesetze-im-internet.de/gmbhg/__15.html",
    area: "Gesellschaftsrecht",
    keywords: ["GmbH", "Geschäftsanteile", "Abtretung", "notarielle Form"],
    version: "2024",
    language: "de"
  },
  {
    lawId: "GmbHG_43",
    sectionId: "§ 43 GmbHG",
    title: "Haftung der Geschäftsführer",
    text: `Die Geschäftsführer haben in den Angelegenheiten der Gesellschaft die Sorgfalt eines ordentlichen Geschäftsmannes anzuwenden. Geschäftsführer, welche ihre Obliegenheiten verletzen, sind der Gesellschaft solidarisch für den entstandenen Schaden zum Ersatz verpflichtet.`,
    sourceUrl: "https://www.gesetze-im-internet.de/gmbhg/__43.html",
    area: "Gesellschaftsrecht",
    keywords: ["GmbH", "Geschäftsführer", "Haftung", "Sorgfaltspflicht"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // BDSG - BUNDESDATENSCHUTZGESETZ
  // ─────────────────────────────────────────────────
  {
    lawId: "BDSG_26",
    sectionId: "§ 26 BDSG",
    title: "Datenverarbeitung für Zwecke des Beschäftigungsverhältnisses",
    text: `Personenbezogene Daten von Beschäftigten dürfen für Zwecke des Beschäftigungsverhältnisses verarbeitet werden, wenn dies für die Entscheidung über die Begründung eines Beschäftigungsverhältnisses oder nach Begründung des Beschäftigungsverhältnisses für dessen Durchführung oder Beendigung oder zur Ausübung oder Erfüllung der sich aus einem Gesetz oder einem Tarifvertrag ergebenden Rechte und Pflichten der Interessenvertretung der Beschäftigten erforderlich ist.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bdsg_2018/__26.html",
    area: "Datenschutz",
    keywords: ["BDSG", "Beschäftigtendatenschutz", "Arbeitnehmer", "Datenverarbeitung"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // MINDESTLOHNGESETZ
  // ─────────────────────────────────────────────────
  {
    lawId: "MiLoG_1",
    sectionId: "§ 1 MiLoG",
    title: "Mindestlohn",
    text: `Jede Arbeitnehmerin und jeder Arbeitnehmer hat Anspruch auf Zahlung eines Arbeitsentgelts mindestens in Höhe des Mindestlohns durch den Arbeitgeber. Die Höhe des Mindestlohns beträgt ab dem 1. Januar 2024 brutto 12,41 Euro je Zeitstunde. Die Höhe des Mindestlohns kann auf Vorschlag einer ständigen Kommission der Tarifpartner durch Rechtsverordnung der Bundesregierung geändert werden.`,
    sourceUrl: "https://www.gesetze-im-internet.de/milog/__1.html",
    area: "Arbeitsrecht",
    keywords: ["Mindestlohn", "Arbeitsentgelt", "12,41 Euro", "Stundenlohn"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // BGB - BÜRGSCHAFT & SICHERHEITEN
  // ─────────────────────────────────────────────────
  {
    lawId: "BGB_765",
    sectionId: "§ 765",
    title: "Vertragstypische Pflichten bei der Bürgschaft",
    text: `Durch den Bürgschaftsvertrag verpflichtet sich der Bürge gegenüber dem Gläubiger eines Dritten, für die Erfüllung der Verbindlichkeit des Dritten einzustehen. Die Bürgschaft kann auch für eine künftige oder eine bedingte Verbindlichkeit übernommen werden. Zur Gültigkeit des Bürgschaftsvertrags ist schriftliche Erteilung der Bürgschaftserklärung erforderlich.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__765.html",
    area: "Vertragsrecht",
    keywords: ["Bürgschaft", "Sicherheit", "Schriftform", "Verbindlichkeit"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // STEUERRECHT (GRUNDLEGENDES)
  // ─────────────────────────────────────────────────
  {
    lawId: "AO_169",
    sectionId: "§ 169 AO",
    title: "Festsetzungsfrist",
    text: `Eine Steuerfestsetzung sowie ihre Aufhebung oder Änderung sind nicht mehr zulässig, wenn die Festsetzungsfrist abgelaufen ist. Die Festsetzungsfrist beträgt für die Einkommensteuer, die Körperschaftsteuer, die Umsatzsteuer und die Gewerbesteuer vier Jahre, für Verbrauchsteuern und Zölle ein Jahr, und in den Fällen des § 370 (Steuerhinterziehung) zehn Jahre.`,
    sourceUrl: "https://www.gesetze-im-internet.de/ao_1977/__169.html",
    area: "Steuerrecht",
    keywords: ["Festsetzungsfrist", "Verjährung", "Steuern", "vier Jahre"],
    version: "2024",
    language: "de"
  },

  // ─────────────────────────────────────────────────
  // INSOLVENZRECHT (GRUNDLEGENDES)
  // ─────────────────────────────────────────────────
  {
    lawId: "InsO_17",
    sectionId: "§ 17 InsO",
    title: "Zahlungsunfähigkeit",
    text: `Allgemeiner Eröffnungsgrund ist die Zahlungsunfähigkeit. Der Schuldner ist zahlungsunfähig, wenn er nicht in der Lage ist, die fälligen Zahlungspflichten zu erfüllen. Zahlungsunfähigkeit ist in der Regel anzunehmen, wenn der Schuldner seine Zahlungen eingestellt hat.`,
    sourceUrl: "https://www.gesetze-im-internet.de/inso/__17.html",
    area: "Insolvenzrecht",
    keywords: ["Insolvenz", "Zahlungsunfähigkeit", "Eröffnungsgrund"],
    version: "2024",
    language: "de"
  }
];

// ═══════════════════════════════════════════════════════════════
// SEED-FUNKTIONALITÄT
// ═══════════════════════════════════════════════════════════════

async function seedLaws() {
  console.log('='.repeat(60));
  console.log('Legal Pulse - Echte Rechtsdatenbank seeden');
  console.log(`Insgesamt ${lawSections.length} Paragraphen`);
  console.log('='.repeat(60));

  let client;

  try {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db("contract_ai");
    const lawsCollection = db.collection("laws");

    // Indexes erstellen
    await lawsCollection.createIndex({ lawId: 1, sectionId: 1 }, { unique: true });
    await lawsCollection.createIndex({ area: 1 });
    await lawsCollection.createIndex({ updatedAt: -1 });
    await lawsCollection.createIndex({ "keywords": 1 });
    console.log('Indexes erstellt');

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const section of lawSections) {
      try {
        const result = await lawsCollection.updateOne(
          { lawId: section.lawId, sectionId: section.sectionId },
          {
            $set: {
              ...section,
              source: 'seed',
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
              embedding: [] // Wird beim ersten Monitoring-Lauf generiert
            }
          },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          inserted++;
        } else if (result.modifiedCount > 0) {
          updated++;
        }
      } catch (error) {
        errors++;
        console.error(`Fehler bei ${section.lawId}: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Seeding abgeschlossen!');
    console.log(`  Neu eingefügt: ${inserted}`);
    console.log(`  Aktualisiert:  ${updated}`);
    console.log(`  Fehler:        ${errors}`);
    console.log(`  Gesamt:        ${lawSections.length}`);

    // Statistiken
    const stats = await lawsCollection.aggregate([
      { $group: { _id: '$area', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    console.log('\nVerteilung nach Rechtsgebiet:');
    stats.forEach(({ _id, count }) => {
      console.log(`  ${_id}: ${count} Paragraphen`);
    });
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Seed-Fehler:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run wenn direkt aufgerufen
if (require.main === module) {
  seedLaws()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}

module.exports = { seedLaws, lawSections };
