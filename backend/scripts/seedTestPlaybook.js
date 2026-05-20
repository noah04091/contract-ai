/**
 * Test-Playbook Tool: Erstellt oder löscht das "Test-Playbook IT-Dienstleistung
 * (Auftraggeber)" mit 13 vordefinierten Regeln für einen User per E-Mail.
 *
 * Erstellen:
 *   node backend/scripts/seedTestPlaybook.js 2302test@flirt.ms
 *
 * Löschen:
 *   node backend/scripts/seedTestPlaybook.js 2302test@flirt.ms --delete
 *
 * Idempotent — bei doppeltem Erstellen wird kein Duplikat angelegt.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { MongoClient, ObjectId } = require('mongodb');
const Playbook = require('../models/Playbook');

const PLAYBOOK_NAME = 'Test-Playbook IT-Dienstleistung (Auftraggeber)';

const TEST_RULES = [
  {
    title: 'Zahlungsfrist max. 30 Tage',
    description: 'Rechnungen müssen innerhalb von 30 Tagen zahlbar sein.',
    category: 'zahlung',
    priority: 'muss',
    threshold: 'max. 30 Tage nach Rechnungseingang',
    note: '',
    standardText: ''
  },
  {
    title: 'Haftung muss begrenzt sein',
    description: 'Eine konkrete Haftungsobergrenze (Cap) muss im Vertrag stehen.',
    category: 'haftung',
    priority: 'muss',
    threshold: 'Cap zwingend, mind. EUR 250.000',
    note: '',
    standardText: ''
  },
  {
    title: 'DSGVO-Auftragsverarbeitungsvereinbarung',
    description: 'Bei Verarbeitung personenbezogener Daten muss eine AVV nach Art. 28 DSGVO vorhanden sein.',
    category: 'datenschutz',
    priority: 'muss',
    threshold: '',
    note: '',
    standardText: ''
  },
  {
    title: 'Kündigungsfrist max. 3 Monate',
    description: 'Vertrag muss mit max. 3 Monaten Frist kündbar sein.',
    category: 'kuendigung',
    priority: 'muss',
    threshold: 'max. 3 Monate',
    note: '',
    standardText: ''
  },
  {
    title: 'Gewährleistung mindestens 24 Monate',
    description: 'Gewährleistungsfrist für IT-Leistungen sollte mindestens 24 Monate betragen.',
    category: 'gewaehrleistung',
    priority: 'soll',
    threshold: 'mind. 24 Monate ab Abnahme',
    note: '',
    standardText: ''
  },
  {
    title: 'Wettbewerbsverbot max. 12 Monate nach Vertragsende',
    description: 'Nachvertragliches Wettbewerbsverbot sollte 12 Monate nicht überschreiten.',
    category: 'sonstiges',
    priority: 'kann',
    threshold: 'max. 12 Monate post-Vertrag',
    note: '',
    standardText: ''
  },
  {
    title: 'SLA-Verfügbarkeit 99,5%',
    description: 'Systemverfügbarkeit muss mindestens 99,5% im Monatsmittel betragen.',
    category: 'sonstiges',
    priority: 'soll',
    threshold: '≥ 99,5%',
    note: '',
    standardText: 'Der Auftragnehmer gewährleistet eine Systemverfügbarkeit von 99,5% im Monatsmittel. Bei Unterschreitung erhält der Auftraggeber Gutschriften nach gestaffeltem Modell.'
  },
  {
    title: 'Betriebshaftpflichtversicherung des Auftragnehmers',
    description: 'Auftragnehmer muss eine Betriebshaftpflichtversicherung mit Deckungssumme mindestens 5 Mio. EUR nachweisen.',
    category: 'haftung',
    priority: 'soll',
    threshold: 'mind. EUR 5.000.000',
    note: '',
    standardText: ''
  },
  {
    title: 'Datenschutz angemessen',
    description: 'Datenschutz muss angemessen geregelt sein.',
    category: 'datenschutz',
    priority: 'muss',
    threshold: '',
    note: '',
    standardText: ''
  },
  {
    title: 'Force-Majeure-Klausel vorhanden',
    description: 'Vertrag muss eine Regelung zu höherer Gewalt enthalten.',
    category: 'force_majeure',
    priority: 'soll',
    threshold: '',
    note: '',
    standardText: ''
  },
  {
    title: 'Schriftformklausel für Vertragsänderungen',
    description: 'Änderungen und Ergänzungen müssen schriftlich erfolgen.',
    category: 'formvorschriften',
    priority: 'soll',
    threshold: '',
    note: '',
    standardText: ''
  },
  {
    title: 'Gerichtsstand in Deutschland',
    description: 'Gerichtsstand muss in Deutschland liegen.',
    category: 'gerichtsstand',
    priority: 'kann',
    threshold: '',
    note: '',
    standardText: ''
  },
  {
    title: 'Zahlung an Meilensteine gekoppelt',
    description: 'Zahlungen sollten an konkrete Meilensteine geknüpft sein, nicht zeitbasiert.',
    category: 'zahlung',
    priority: 'kann',
    threshold: '',
    note: '',
    standardText: 'Die Vergütung wird in Raten fällig: 30% bei Unterzeichnung, 30% bei Übergabe an Testsystem, 30% bei Abnahme, 10% nach Ablauf Gewährleistung.'
  }
];

async function main() {
  const email = process.argv[2];
  const isDelete = process.argv.includes('--delete');
  if (!email) {
    console.error('❌ Bitte E-Mail als Argument übergeben:');
    console.error('   node backend/scripts/seedTestPlaybook.js 2302test@flirt.ms');
    console.error('   node backend/scripts/seedTestPlaybook.js 2302test@flirt.ms --delete');
    process.exit(1);
  }

  // 1. User-Lookup via Native MongoDB (User wird im Projekt nativ verwaltet)
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db('contract_ai');

  const user = await db.collection('users').findOne(
    { email: email.toLowerCase().trim() },
    { projection: { _id: 1, email: 1, firstName: 1, lastName: 1 } }
  );

  if (!user) {
    console.error(`❌ Kein User mit E-Mail "${email}" gefunden.`);
    await client.close();
    process.exit(1);
  }

  console.log(`✅ User gefunden: ${user.email} (${user._id})`);

  // 2. Mongoose-Connection für Playbook-Operations
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'contract_ai' });

  // 3. Idempotenz-Check (bzw. Delete-Modus)
  const userIdObj = user._id instanceof ObjectId ? user._id : new ObjectId(user._id.toString());
  const existing = await Playbook.findOne({ userId: userIdObj, name: PLAYBOOK_NAME });

  if (isDelete) {
    if (!existing) {
      console.log(`ℹ️  Kein Test-Playbook bei ${user.email} gefunden — nichts zu löschen.`);
    } else {
      await Playbook.deleteOne({ _id: existing._id });
      console.log(`🗑️  Playbook "${PLAYBOOK_NAME}" gelöscht (ID: ${existing._id}).`);
    }
    await mongoose.disconnect();
    await client.close();
    return;
  }

  if (existing) {
    console.log(`ℹ️  Playbook "${PLAYBOOK_NAME}" existiert bereits (ID: ${existing._id}).`);
    console.log('   Zum Neuerstellen: erst mit --delete entfernen, dann ohne Flag aufrufen.');
    await mongoose.disconnect();
    await client.close();
    return;
  }

  // 4. Playbook erstellen
  const playbook = new Playbook({
    userId: userIdObj,
    name: PLAYBOOK_NAME,
    description: 'Test-Playbook für IT-Beschaffungsverträge aus Auftraggeber-Sicht. 13 Regeln, deckt alle Funktionen des Playbook-Review-Features ab.',
    contractType: 'Dienstleistungsvertrag',
    role: 'auftraggeber',
    industry: 'it_software',
    rules: TEST_RULES,
    isDefault: false,
    isGlobal: false,
    status: 'active'
  });

  await playbook.save();

  console.log(`\n✅ Playbook erstellt!`);
  console.log(`   Name:    ${playbook.name}`);
  console.log(`   ID:      ${playbook._id}`);
  console.log(`   Regeln:  ${playbook.rules.length}`);
  console.log(`\n   Öffne https://www.contract-ai.de/playbook-review im Browser — das Playbook ist sofort sichtbar.`);

  await mongoose.disconnect();
  await client.close();
}

main().catch(err => {
  console.error('❌ Fehler:', err);
  process.exit(1);
});
