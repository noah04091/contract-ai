#!/usr/bin/env node
// 📁 backend/scripts/seed-test-weekly-checks.js
// Seed test weekly legal checks for demo/testing purposes
// Usage: node scripts/seed-test-weekly-checks.js <email>

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient, ObjectId } = require('mongodb');

async function seedTestWeeklyChecks(userEmail) {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    const db = client.db('contract_ai');

    // Find user
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      return;
    }
    console.log(`✅ Found user: ${user.email} (${user._id})`);

    // Find user's contracts
    const contracts = await db.collection('contracts')
      .find({ userId: user._id })
      .limit(5)
      .toArray();

    if (contracts.length === 0) {
      console.error('❌ No contracts found for this user');
      return;
    }
    console.log(`✅ Found ${contracts.length} contracts`);

    // Sample findings for realistic test data
    const sampleFindings = [
      {
        type: 'law_change',
        severity: 'critical',
        title: 'Neue Kündigungsfristen nach BGB-Reform',
        description: 'Die kürzlich beschlossene BGB-Reform ändert die Kündigungsfristen für Mietverträge. Ihre aktuelle Klausel entspricht nicht mehr den neuen Anforderungen.',
        affectedClause: '§ 5 Kündigungsfristen',
        legalBasis: 'BGB § 573c (Neufassung 2024)',
        recommendation: 'Passen Sie die Kündigungsfristen in Abschnitt 5 an die neuen gesetzlichen Mindestfristen an.'
      },
      {
        type: 'compliance',
        severity: 'warning',
        title: 'DSGVO-Erweiterung: Aufbewahrungsfristen',
        description: 'Neue EU-Richtlinie präzisiert Aufbewahrungsfristen für personenbezogene Daten. Ihr Vertrag sollte aktualisiert werden.',
        affectedClause: '§ 12 Datenschutz',
        legalBasis: 'DSGVO Art. 17 (Ergänzung)',
        recommendation: 'Ergänzen Sie konkrete Aufbewahrungsfristen und Löschkonzepte.'
      },
      {
        type: 'risk',
        severity: 'warning',
        title: 'Haftungsklausel möglicherweise unwirksam',
        description: 'BGH-Urteil vom Januar stellt strengere Anforderungen an Haftungsbeschränkungen in AGB.',
        affectedClause: '§ 8 Haftung',
        legalBasis: 'BGH Urteil VII ZR 123/23',
        recommendation: 'Überprüfen Sie die Haftungsklausel auf AGB-Konformität.'
      },
      {
        type: 'improvement',
        severity: 'info',
        title: 'Neue Muster-Widerrufsbelehrung verfügbar',
        description: 'Das BMJ hat eine aktualisierte Muster-Widerrufsbelehrung veröffentlicht.',
        affectedClause: 'Anlage: Widerrufsbelehrung',
        legalBasis: 'BGB-InfoV Anlage 1 (aktualisiert)',
        recommendation: 'Aktualisieren Sie die Widerrufsbelehrung auf die neue Mustervorlage.'
      }
    ];

    const relevantChanges = [
      { title: 'BGB-Reform: Änderungen im Mietrecht treten in Kraft', score: 0.89 },
      { title: 'Neue DSGVO-Leitlinien des BfDI veröffentlicht', score: 0.82 },
      { title: 'BGH verschärft Anforderungen an AGB-Klauseln', score: 0.78 },
      { title: 'Verbraucherrechte-Richtlinie: Umsetzungsfrist läuft ab', score: 0.71 }
    ];

    // Status distribution for realistic mix
    const statusOptions = ['aktuell', 'handlungsbedarf', 'handlungsbedarf', 'kritisch'];

    let inserted = 0;

    for (const contract of contracts) {
      // Random status for variety
      const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];

      // Generate findings based on status
      let findings = [];
      if (status === 'kritisch') {
        findings = sampleFindings.slice(0, 3); // 3 findings including critical
      } else if (status === 'handlungsbedarf') {
        findings = sampleFindings.slice(1, 3); // 2 warnings
      }
      // 'aktuell' has no findings

      const checkDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Random time in last week

      const checkResult = {
        userId: user._id,
        contractId: contract._id,
        contractName: contract.name || contract.fileName || 'Unbenannter Vertrag',
        checkDate,
        stage1Results: {
          relevantChanges: status !== 'aktuell' ? relevantChanges.slice(0, 2 + Math.floor(Math.random() * 3)) : [],
          totalRssItems: 45 + Math.floor(Math.random() * 20),
          matchedItems: status !== 'aktuell' ? 3 + Math.floor(Math.random() * 5) : 0
        },
        stage2Results: {
          overallStatus: status,
          hasChanges: status !== 'aktuell',
          findings,
          summary: status === 'aktuell'
            ? 'Keine relevanten Rechtsänderungen für diesen Vertrag gefunden.'
            : status === 'handlungsbedarf'
            ? 'Es wurden Rechtsänderungen identifiziert, die eine Überprüfung Ihres Vertrags erfordern.'
            : 'Kritische Rechtsänderungen erfordern sofortige Aufmerksamkeit. Bitte prüfen Sie die Befunde.'
        },
        metadata: {
          analyzedPercentage: 95 + Math.floor(Math.random() * 5),
          dataSourcesUsed: ['beck-online', 'bundesanzeiger', 'bmj-news', 'dejure'],
          confidenceScore: 0.85 + Math.random() * 0.1,
          lastDataSync: new Date(Date.now() - 24 * 60 * 60 * 1000)
        },
        costEstimate: {
          stage1Tokens: 1500 + Math.floor(Math.random() * 500),
          stage2Tokens: status !== 'aktuell' ? 3000 + Math.floor(Math.random() * 1000) : 0,
          totalCost: status !== 'aktuell' ? 0.05 + Math.random() * 0.03 : 0.02
        },
        createdAt: checkDate
      };

      // Check if a check already exists for this contract (avoid duplicates)
      const existing = await db.collection('weekly_legal_checks').findOne({
        userId: user._id,
        contractId: contract._id,
        checkDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      if (!existing) {
        await db.collection('weekly_legal_checks').insertOne(checkResult);
        console.log(`   ✅ Inserted check for "${contract.name || contract.fileName}" (${status})`);
        inserted++;
      } else {
        console.log(`   ⏭️ Skipped "${contract.name || contract.fileName}" (already has recent check)`);
      }
    }

    console.log(`\n✅ Done! Inserted ${inserted} test weekly checks.`);
    console.log('   Refresh Legal Pulse page to see them.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

// Get email from command line
const email = process.argv[2];
if (!email) {
  console.log('Usage: node scripts/seed-test-weekly-checks.js <email>');
  console.log('Example: node scripts/seed-test-weekly-checks.js test@example.com');
  process.exit(1);
}

seedTestWeeklyChecks(email);
