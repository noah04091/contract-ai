/**
 * Migration: Profil-Schalter „Fristen-Erinnerungen" auf die EINE Wahrheit umziehen.
 * node backend/scripts/migrateFristenSchalter.js            (Probelauf, ändert nichts)
 * node backend/scripts/migrateFristenSchalter.js --apply     (mit Sicherungskopie)
 *
 * WARUM: Bis heute gab es VIER unabhängige Aus-Schalter für Fristen-Mails. Der Profil-
 * Schalter schrieb `notificationSettings.email.contractDeadlines`, der Abmelde-Link
 * `emailPreferences.calendar`. Ab dem Umbau ist NUR NOCH das zweite Feld die Wahrheit.
 *
 * OHNE diese Migration bekäme jeder, der die Fristen über sein Profil ausgeschaltet hat,
 * nach dem Umbau SCHLAGARTIG WIEDER MAILS — ungefragt. Das ist zwar das Gegenteil des
 * Ausgangsproblems, aber genauso ungewollt. Deshalb läuft sie VOR der Umstellung.
 *
 * Bewusst NICHT angefasst:
 *  • `notificationSettings.email.enabled` („alle E-Mails aus") — eigenes, breiteres Konzept.
 *  • `notificationSettings.deadlineReminders.*` (30/7/1 Tage) — andere Granularität.
 *  • Der alte Wert `contractDeadlines` bleibt stehen. Er wird nach dem Umbau von niemandem
 *    mehr gelesen; ihn zu löschen wäre ein zweiter, unnötiger Schreibvorgang an Kundendaten
 *    und würde ein Zurückrollen erschweren.
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const database = require("../config/database");

const APPLY = process.argv.includes("--apply");

(async () => {
  const db = await database.connect();
  const users = db.collection("users");

  const kandidaten = await users.find(
    { "notificationSettings.email.contractDeadlines": false },
    { projection: { email: 1, subscriptionPlan: 1, emailPreferences: 1, notificationSettings: 1 } }
  ).toArray();

  console.log(`Kandidaten (Profil „Fristen-Erinnerungen" = aus): ${kandidaten.length}\n`);

  const zuAendern = kandidaten.filter(u => u.emailPreferences?.calendar !== false);
  for (const u of kandidaten) {
    const jetzt = u.emailPreferences?.calendar;
    const gleich = jetzt === false;
    console.log(`  ${String(u.email).replace(/^(.).*@/, "$1***@")} (${u.subscriptionPlan})`);
    console.log(`     emailPreferences.calendar: ${jetzt === undefined ? "nicht gesetzt" : jetzt}` +
      `  ->  ${gleich ? "bereits false, keine Änderung" : "wird auf false gesetzt"}`);
    console.log(`     email.enabled: ${u.notificationSettings?.email?.enabled}`);
  }

  if (zuAendern.length === 0) {
    console.log("\n✅ Nichts zu tun — alle Kandidaten sind bereits gleichgezogen.");
    process.exit(0);
  }

  if (!APPLY) {
    console.log(`\nDRY-RUN — nichts geändert. ${zuAendern.length} Nutzer würden angefasst. Mit --apply ausführen.`);
    process.exit(0);
  }

  // Sicherungskopie VOR dem Schreiben (voller Vorher-Zustand beider Felder)
  const stempel = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPfad = path.join(__dirname, `migration-fristenschalter-backup-${stempel}.json`);
  fs.writeFileSync(backupPfad, JSON.stringify(zuAendern.map(u => ({
    _id: String(u._id),
    email: u.email,
    vorher: {
      "emailPreferences.calendar": u.emailPreferences?.calendar ?? null,
      "notificationSettings.email.contractDeadlines": u.notificationSettings?.email?.contractDeadlines ?? null,
      "notificationSettings.email.enabled": u.notificationSettings?.email?.enabled ?? null
    }
  })), null, 2));
  console.log(`\nSicherungskopie: ${backupPfad}`);

  let geaendert = 0;
  for (const u of zuAendern) {
    const res = await users.updateOne(
      { _id: u._id },
      { $set: { "emailPreferences.calendar": false, emailPreferencesUpdatedAt: new Date() } }
    );
    geaendert += res.modifiedCount;
  }
  console.log(`✅ ${geaendert} Nutzer migriert.`);

  // Gegenprobe: liest die neue Wahrheit jetzt wirklich „abgemeldet"?
  const { isUnsubscribed, EMAIL_CATEGORIES } = require("../services/emailUnsubscribeService");
  for (const u of zuAendern) {
    const gesperrt = await isUnsubscribed(db, u.email, EMAIL_CATEGORIES.CALENDAR);
    console.log(`   Gegenprobe ${String(u.email).replace(/^(.).*@/, "$1***@")}: isUnsubscribed(calendar) = ${gesperrt}` +
      `${gesperrt ? " ✅" : " ❌ ERWARTET WÄRE true"}`);
  }
  process.exit(0);
})();
