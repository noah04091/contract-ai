require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const EmbeddingService = require('./services/embeddingService');
const VectorStore = require('./services/vectorStore');

(async () => {
  console.log('🚀 Creating demo contract with actual text content...\n');

  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db('contract_ai');

  // Create a realistic purchase agreement (Kaufvertrag)
  const demoContract = {
    _id: new ObjectId(),
    userId: '682b7269a6f717b2dce98667', // Use existing user ID
    name: 'DEMO_Kaufvertrag_Gebrauchtwagen_2025.pdf',
    type: 'kaufvertrag',
    status: 'processed',
    analysis: {
      fullText: `KAUFVERTRAG GEBRAUCHTWAGEN

Zwischen dem Verkäufer:
Max Mustermann
Musterstraße 123, 12345 Musterstadt

Und dem Käufer:
[NAME]
[ADRESSE]

wird folgender Kaufvertrag über einen Gebrauchtwagen geschlossen:

§ 1 KAUFGEGENSTAND
Verkauft wird der PKW:
- Marke/Modell: Volkswagen Golf 7
- Erstzulassung: 15.03.2020
- Kilometerstand: 45.000 km
- Fahrzeug-Identifikationsnummer (FIN): WVW123456789ABC

§ 2 KAUFPREIS UND ZAHLUNG
Der Kaufpreis beträgt 15.500 Euro (in Worten: fünfzehntausendfünfhundert Euro).
Die Zahlung erfolgt bei Übergabe in bar.

§ 3 GEWÄHRLEISTUNG
Der Verkäufer gewährt eine Gewährleistungsfrist von 2 Jahren ab Übergabe gemäß § 438 BGB.
Während dieser Frist hat der Käufer bei Mängeln Anspruch auf Nachbesserung oder Ersatzlieferung.

§ 4 ÜBERGABE
Die Übergabe des Fahrzeugs erfolgt am 22.05.2025.
Der Verkäufer übergibt das Fahrzeug mit:
- Fahrzeugbrief und Fahrzeugschein
- 2 Schlüsseln
- Serviceheft

§ 5 HAFTUNGSAUSSCHLUSS
Der Verkäufer haftet nicht für versteckte Mängel, die bei Vertragsschluss nicht erkennbar waren,
sofern er diese nicht arglistig verschwiegen hat.

§ 6 EIGENTUMSVORBEHALT
Das Eigentum am Fahrzeug geht erst nach vollständiger Bezahlung des Kaufpreises auf den Käufer über.

§ 7 SALVATORISCHE KLAUSEL
Sollten einzelne Bestimmungen dieses Vertrages unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.


Ort, Datum: Musterstadt, 15.05.2025

_______________________          _______________________
Unterschrift Verkäufer           Unterschrift Käufer`,
      score: 85,
      risks: ['Gewährleistungsfrist könnte zu kurz sein'],
      suggestions: ['Gewährleistungsfristen prüfen']
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Insert contract
  await db.collection('contracts').insertOne(demoContract);
  console.log('✅ Demo contract created with ID:', demoContract._id.toString());

  // Initialize services
  const embeddingService = new EmbeddingService();
  const vectorStore = new VectorStore();
  await vectorStore.init();

  // Embed and store the contract
  const text = demoContract.analysis.fullText;
  const pseudoText = embeddingService.pseudonymize(text);
  const chunks = embeddingService.chunkText(pseudoText, 800, 100);

  console.log(`📄 Text chunked into ${chunks.length} chunks`);

  const embeddings = await embeddingService.embedBatch(chunks);

  const contractDocs = chunks.map((chunk, idx) => ({
    id: `${demoContract._id.toString()}_chunk_${idx}`,
    embedding: embeddings[idx],
    text: chunk,
    metadata: {
      contractId: demoContract._id.toString(),
      userId: demoContract.userId,
      contractName: demoContract.name,
      contractType: demoContract.type,
      chunkIndex: idx,
      totalChunks: chunks.length,
      createdAt: demoContract.createdAt
    }
  }));

  await vectorStore.upsertContracts(contractDocs);

  console.log(`✅ ${chunks.length} chunks embedded and stored in vector DB`);
  console.log('\n📊 Final Stats:');
  console.log('  Demo contract ID:', demoContract._id.toString());
  console.log('  Text length:', text.length, 'characters');
  console.log('  Chunks created:', chunks.length);
  console.log('\n🎯 Ready to test Legal Pulse monitoring!\n');

  await vectorStore.close();
  await client.close();
})();
