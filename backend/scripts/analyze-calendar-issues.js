// 📊 Analyse-Skript: Calendar-Event-Probleme identifizieren
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config({ path: "../.env" });

const mongoUri = process.env.MONGO_URI;

async function analyzeCalendarIssues() {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log("✅ Mit MongoDB verbunden");

    const db = client.db("contract_ai");
    const contractsCollection = db.collection("contracts");
    const eventsCollection = db.collection("contract_events");

    // 1. Verträge analysieren
    console.log("\n📋 VERTRAGS-ANALYSE:");
    console.log("=".repeat(60));

    const allContracts = await contractsCollection.find({}).toArray();
    console.log(`✅ Gesamtanzahl Verträge: ${allContracts.length}`);

    // Analyse: Ablaufdaten
    const contractsWithExpiryDate = allContracts.filter(c => c.expiryDate);
    const contractsWithEndDate = allContracts.filter(c => c.endDate);
    const contractsWithEitherDate = allContracts.filter(c => c.expiryDate || c.endDate);
    const contractsWithNoDate = allContracts.filter(c => !c.expiryDate && !c.endDate);

    console.log(`📅 Mit expiryDate: ${contractsWithExpiryDate.length}`);
    console.log(`📅 Mit endDate: ${contractsWithEndDate.length}`);
    console.log(`📅 Mit irgendeinem Datum: ${contractsWithEitherDate.length}`);
    console.log(`❌ Ohne Ablaufdatum: ${contractsWithNoDate.length}`);

    // Analyse: Auto-Renewal
    const contractsWithAutoRenewal = allContracts.filter(c => c.isAutoRenewal === true);
    console.log(`🔄 Mit isAutoRenewal=true: ${contractsWithAutoRenewal.length}`);

    // Analyse: Cancellation Period
    const contractsWithCancellationPeriod = allContracts.filter(c => c.cancellationPeriod);
    console.log(`📝 Mit cancellationPeriod: ${contractsWithCancellationPeriod.length}`);

    // Analyse: Datum in Vergangenheit vs. Zukunft
    const now = new Date();
    const contractsWithFutureDate = contractsWithEitherDate.filter(c => {
      const date = new Date(c.expiryDate || c.endDate);
      return date > now;
    });
    const contractsWithPastDate = contractsWithEitherDate.filter(c => {
      const date = new Date(c.expiryDate || c.endDate);
      return date <= now;
    });

    console.log(`📅 Zukünftige Ablaufdaten: ${contractsWithFutureDate.length}`);
    console.log(`📅 Vergangene Ablaufdaten: ${contractsWithPastDate.length}`);

    // 2. Events analysieren
    console.log("\n📅 EVENT-ANALYSE:");
    console.log("=".repeat(60));

    const allEvents = await eventsCollection.find({}).toArray();
    console.log(`✅ Gesamtanzahl Events: ${allEvents.length}`);

    const eventsByStatus = {
      scheduled: allEvents.filter(e => e.status === "scheduled").length,
      notified: allEvents.filter(e => e.status === "notified").length,
      expired: allEvents.filter(e => e.status === "expired").length,
      snoozed: allEvents.filter(e => e.status === "snoozed").length,
      dismissed: allEvents.filter(e => e.status === "dismissed").length
    };

    console.log(`📊 Status-Verteilung:`, eventsByStatus);

    const eventsBySeverity = {
      critical: allEvents.filter(e => e.severity === "critical").length,
      warning: allEvents.filter(e => e.severity === "warning").length,
      info: allEvents.filter(e => e.severity === "info").length
    };

    console.log(`📊 Severity-Verteilung:`, eventsBySeverity);

    // 3. Verträge ohne Events finden
    console.log("\n🔍 VERTRÄGE OHNE EVENTS:");
    console.log("=".repeat(60));

    const contractsWithEvents = new Set(allEvents.map(e => e.contractId.toString()));
    const contractsWithoutEvents = contractsWithEitherDate.filter(c =>
      !contractsWithEvents.has(c._id.toString())
    );

    console.log(`❌ Verträge mit Datum aber OHNE Events: ${contractsWithoutEvents.length}`);

    if (contractsWithoutEvents.length > 0) {
      console.log("\n📋 Beispiele (erste 10):");
      contractsWithoutEvents.slice(0, 10).forEach((c, i) => {
        console.log(`  ${i+1}. "${c.name}"`);
        console.log(`     - ID: ${c._id}`);
        console.log(`     - expiryDate: ${c.expiryDate || 'N/A'}`);
        console.log(`     - endDate: ${c.endDate || 'N/A'}`);
        console.log(`     - isAutoRenewal: ${c.isAutoRenewal || false}`);
        console.log(`     - cancellationPeriod: ${JSON.stringify(c.cancellationPeriod) || 'N/A'}`);
        console.log(`     - uploadedAt: ${c.uploadedAt || c.createdAt}`);
        console.log("");
      });
    }

    // 4. Verträge mit vergangenen Daten aber ohne Auto-Renewal
    console.log("\n⚠️ PROBLEMATISCHE VERTRÄGE:");
    console.log("=".repeat(60));

    const problematicContracts = contractsWithPastDate.filter(c => !c.isAutoRenewal);
    console.log(`📊 Verträge mit altem Datum & kein Auto-Renewal: ${problematicContracts.length}`);
    console.log(`   → Diese generieren keine Events, weil das Datum in der Vergangenheit liegt!`);

    // 5. User-spezifische Analyse (falls mehrere User)
    console.log("\n👥 USER-ANALYSE:");
    console.log("=".repeat(60));

    const userIds = [...new Set(allContracts.map(c => c.userId?.toString()).filter(Boolean))];
    console.log(`👥 Anzahl unterschiedliche User: ${userIds.length}`);

    if (userIds.length <= 5) {
      for (const userId of userIds) {
        const userContracts = allContracts.filter(c => c.userId?.toString() === userId);
        const userEvents = allEvents.filter(e => e.userId?.toString() === userId);
        console.log(`  User ${userId}:`);
        console.log(`    - Verträge: ${userContracts.length}`);
        console.log(`    - Events: ${userEvents.length}`);
      }
    }

    // 6. Empfehlungen
    console.log("\n💡 EMPFEHLUNGEN:");
    console.log("=".repeat(60));

    if (contractsWithNoDate.length > 0) {
      console.log(`⚠️ ${contractsWithNoDate.length} Verträge ohne Ablaufdatum`);
      console.log(`   → Lösung: KI-Analyse verbessern für Datumsextraktion`);
    }

    if (problematicContracts.length > 0) {
      console.log(`⚠️ ${problematicContracts.length} Verträge mit vergangenem Datum`);
      console.log(`   → Lösung: Auto-Renewal-Detection verbessern ODER`);
      console.log(`   → Lösung: Manuelle Datumsaktualisierung ermöglichen`);
    }

    if (contractsWithoutEvents.length > 0) {
      console.log(`⚠️ ${contractsWithoutEvents.length} Verträge ohne Events`);
      console.log(`   → Lösung: /api/calendar/regenerate-all ausführen`);
    }

    console.log("\n✅ Analyse abgeschlossen!");

  } catch (error) {
    console.error("❌ Fehler bei der Analyse:", error);
  } finally {
    await client.close();
  }
}

analyzeCalendarIssues();
