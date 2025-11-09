// 📁 backend/scripts/seed_laws.js
// Legal Pulse 2.0 - Seed dummy law sections for testing

const { MongoClient } = require("mongodb");
const { getInstance: getLawEmbeddings } = require("../services/lawEmbeddings");

// Dummy law sections for testing
const dummyLawSections = [
  {
    lawId: "DSGVO_Art13",
    sectionId: "Art. 13 Abs. 1",
    title: "Informationspflicht bei Erhebung von personenbezogenen Daten bei der betroffenen Person",
    text: `Werden personenbezogene Daten bei der betroffenen Person erhoben, so teilt der Verantwortliche der betroffenen Person zum Zeitpunkt der Erhebung dieser Daten Folgendes mit: a) den Namen und die Kontaktdaten des Verantwortlichen sowie gegebenenfalls seines Vertreters; b) gegebenenfalls die Kontaktdaten des Datenschutzbeauftragten; c) die Zwecke, für die die personenbezogenen Daten verarbeitet werden sollen, sowie die Rechtsgrundlage für die Verarbeitung; d) wenn die Verarbeitung auf Artikel 6 Absatz 1 Buchstabe f beruht, die berechtigten Interessen, die von dem Verantwortlichen oder einem Dritten verfolgt werden.`,
    sourceUrl: "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679",
    area: "DSGVO",
    keywords: ["Informationspflicht", "personenbezogene Daten", "Datenschutz", "DSGVO"],
    version: "2016/679",
    language: "de"
  },
  {
    lawId: "BGB_312",
    sectionId: "§ 312 Abs. 1",
    title: "Fernabsatzverträge",
    text: `Fernabsatzverträge sind Verträge, bei denen der Unternehmer oder eine in seinem Namen oder Auftrag handelnde Person und der Verbraucher für die Vertragsverhandlungen und den Vertragsschluss ausschließlich Fernkommunikationsmittel verwenden, es sei denn, dass der Vertragsschluss nicht im Rahmen eines für den Fernabsatz organisierten Vertriebs- oder Dienstleistungssystems erfolgt. Fernkommunikationsmittel sind Kommunikationsmittel, die zur Anbahnung oder zum Abschluss eines Vertrags zwischen einem Verbraucher und einem Unternehmer ohne gleichzeitige körperliche Anwesenheit der Vertragsparteien eingesetzt werden können.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__312.html",
    area: "BGB",
    keywords: ["Fernabsatz", "Verbraucher", "Online-Handel", "E-Commerce"],
    relatedSections: ["§ 312a", "§ 312b", "§ 312c"],
    version: "2023",
    language: "de"
  },
  {
    lawId: "BGB_309_Nr7",
    sectionId: "§ 309 Nr. 7",
    title: "Klauselverbote ohne Wertungsmöglichkeit - Haftungsausschluss",
    text: `Auch soweit eine Abweichung von den gesetzlichen Vorschriften zulässig ist, ist in Allgemeinen Geschäftsbedingungen unwirksam: Nr. 7: Ein Ausschluss oder eine Begrenzung der Haftung für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit, die auf einer fahrlässigen Pflichtverletzung des Verwenders oder einer vorsätzlichen oder fahrlässigen Pflichtverletzung eines gesetzlichen Vertreters oder Erfüllungsgehilfen des Verwenders beruhen.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__309.html",
    area: "BGB",
    keywords: ["AGB", "Haftung", "Klauselverbot", "Unwirksamkeit"],
    relatedSections: ["§ 305", "§ 307", "§ 308"],
    version: "2023",
    language: "de"
  },
  {
    lawId: "DSGVO_Art28",
    sectionId: "Art. 28 Abs. 1",
    title: "Auftragsverarbeiter",
    text: `Erfolgt eine Verarbeitung im Auftrag eines Verantwortlichen, so arbeitet dieser nur mit Auftragsverarbeitern, die hinreichend Garantien dafür bieten, dass geeignete technische und organisatorische Maßnahmen so durchgeführt werden, dass die Verarbeitung im Einklang mit den Anforderungen dieser Verordnung erfolgt und den Schutz der Rechte der betroffenen Person gewährleistet.`,
    sourceUrl: "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679",
    area: "DSGVO",
    keywords: ["Auftragsverarbeitung", "Datenschutz", "technische Maßnahmen", "TOM"],
    relatedSections: ["Art. 28 Abs. 2", "Art. 28 Abs. 3"],
    version: "2016/679",
    language: "de"
  },
  {
    lawId: "BGB_573c",
    sectionId: "§ 573c Abs. 1",
    title: "Kündigungsfristen",
    text: `Die Kündigung ist spätestens am dritten Werktag eines Kalendermonats zum Ablauf des übernächsten Monats zulässig. Die Kündigungsfrist für den Vermieter verlängert sich nach fünf und acht Jahren seit der Überlassung des Wohnraums um jeweils drei Monate.`,
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__573c.html",
    area: "Mietrecht",
    keywords: ["Kündigung", "Kündigungsfrist", "Mietvertrag", "Wohnraum"],
    relatedSections: ["§ 573", "§ 573a", "§ 573b"],
    version: "2023",
    language: "de"
  },
  {
    lawId: "UWG_3",
    sectionId: "§ 3 Abs. 1",
    title: "Verbot unlauterer geschäftlicher Handlungen",
    text: `Unlautere geschäftliche Handlungen sind unzulässig. Geschäftliche Handlungen, die sich an Verbraucher richten oder diese erreichen, sind unlauter, wenn sie nicht der unternehmerischen Sorgfalt entsprechen und dazu geeignet sind, das wirtschaftliche Verhalten des Verbrauchers wesentlich zu beeinflussen.`,
    sourceUrl: "https://www.gesetze-im-internet.de/uwg_2004/__3.html",
    area: "UWG",
    keywords: ["Wettbewerb", "unlautere Handlung", "Verbraucherschutz"],
    relatedSections: ["§ 3a", "§ 4", "§ 5"],
    version: "2023",
    language: "de"
  },
  {
    lawId: "HGB_348",
    sectionId: "§ 348 Abs. 1",
    title: "Kontokorrent",
    text: `Wird auf Grund einer Geschäftsverbindung zwischen einem Kaufmann und einem anderen die Verrechnung der beiderseitigen Ansprüche und Leistungen in der Art vereinbart, dass die aus den einzelnen Posten sich ergebenden Forderungen als Rechnungsposten gelten und in regelmäßigen Zeitabschnitten durch Verrechnung und Feststellung des für den einen oder anderen Teil sich ergebenden Überschusses (Saldo) ausgeglichen werden sollen (Kontokorrent), so kann während der Dauer des Kontokorrentverhältnisses die Erfüllung der einzelnen Forderungen nicht verlangt werden.`,
    sourceUrl: "https://www.gesetze-im-internet.de/hgb/__348.html",
    area: "HGB",
    keywords: ["Kontokorrent", "Geschäftsverbindung", "Handelrecht", "Kaufmann"],
    version: "2023",
    language: "de"
  }
];

async function seedLaws() {
  console.log('🌱 [SEED-LAWS] Starting law database seeding...');

  let client;

  try {
    // Connect to MongoDB
    const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
    client = new MongoClient(MONGO_URI);
    await client.connect();

    console.log('✓ Connected to MongoDB');

    // Initialize law embeddings service
    const lawEmbeddings = getLawEmbeddings();

    // Upsert law sections with embeddings
    console.log(`📚 Upserting ${dummyLawSections.length} law sections...`);

    const stats = await lawEmbeddings.upsertLawSections(dummyLawSections);

    console.log('\n✅ [SEED-LAWS] Seeding complete!');
    console.log(`   - Inserted: ${stats.inserted}`);
    console.log(`   - Updated: ${stats.updated}`);
    console.log(`   - Errors: ${stats.errors}`);
    console.log(`   - Total: ${stats.total}`);

    // Show database stats
    const dbStats = await lawEmbeddings.getStats();
    console.log('\n📊 Law Database Statistics:');
    console.log(`   - Total sections: ${dbStats.total}`);
    console.log(`   - Recent changes (30 days): ${dbStats.recentChanges30Days}`);
    console.log('   - By area:');
    dbStats.byArea.forEach(({ _id, count }) => {
      console.log(`     * ${_id}: ${count}`);
    });

  } catch (error) {
    console.error('❌ [SEED-LAWS] Error:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n✓ MongoDB connection closed');
    }
  }
}

// Run if called directly
if (require.main === module) {
  seedLaws()
    .then(() => {
      console.log('\n🎉 Seed script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Seed script failed:', error);
      process.exit(1);
    });
}

module.exports = { seedLaws, dummyLawSections };
