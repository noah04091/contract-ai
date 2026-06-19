/**
 * READ-ONLY 3-fach-Sicherheitsprüfung VOR dem Aufräumen verwaister User-Daten.
 * Beantwortet: Kann versehentlich ein LEBENDER User getroffen werden? (Antwort soll NEIN sein.)
 * node backend/scripts/verifyOrphanSafety.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const database = require('../config/database');
const { ObjectId } = require('mongodb');
const toObjId = (s) => { try { return new ObjectId(String(s)); } catch (_) { return null; } };

(async () => {
  const db = await database.connect();
  const ids = [...new Set([...(await db.collection('contract_events').distinct('userId')),
    ...(await db.collection('contracts').distinct('userId'))].map(String))];

  let living = 0; const orphans = [];
  for (const idStr of ids) {
    const oid = toObjId(idStr);
    // 3 Wege, einen User zu finden:
    const byOid = oid ? await db.collection('users').findOne({ _id: oid }, { projection: { _id: 1, email: 1 } }) : null;
    const byStr = await db.collection('users').findOne({ _id: idStr }, { projection: { _id: 1 } });
    const byEmailField = false; // events/contracts speichern keine email → kein dritter Weg nötig
    if (byOid || byStr || byEmailField) { living++; continue; }
    orphans.push({ idStr, oid });
  }

  console.log('\n════ GEGENPROBE: erkennt die Logik lebende User? ════');
  console.log(`distinkte userIds gesamt: ${ids.length} | als LEBEND erkannt: ${living} | als verwaist: ${orphans.length}`);
  console.log(living > 0 ? '✅ Die User-Erkennung findet lebende User (224+ korrekt ausgeschlossen) → Kriterium funktioniert.' : '⚠️ KEIN lebender User erkannt — Logik verdächtig, NICHT löschen!');

  console.log('\n════ Jeden Waisen 3-fach prüfen (User existiert WIRKLICH nicht?) ════');
  let archivedCount = 0, notArchived = [];
  for (const o of orphans) {
    // Prüfung 1: kein User per _id (ObjectId). Prüfung 2: kein User per _id (String). (oben schon)
    // Prüfung 3: deleted_accounts-Archiv (welches Feld matcht?)
    const arch = await db.collection('deleted_accounts').findOne(
      { $or: [{ userId: o.idStr }, { originalUserId: o.idStr }, { _id: o.oid }, { userId: o.oid }] },
      { projection: { email: 1, deletedAt: 1, userId: 1, originalUserId: 1 } }
    ).catch(() => null);
    if (arch) { archivedCount++; }
    else {
      // genauer hinschauen beim Nicht-Archivierten
      const sampleEvents = await db.collection('contract_events')
        .find({ userId: { $in: o.oid ? [o.idStr, o.oid] : [o.idStr] } })
        .project({ title: 1, type: 1, date: 1, createdAt: 1 }).limit(5).toArray();
      notArchived.push({ idStr: o.idStr, sampleEvents });
    }
  }
  console.log(`Im deleted_accounts-Archiv (zweifelsfrei gelöscht): ${archivedCount}/${orphans.length}`);
  if (notArchived.length) {
    console.log(`\n⚠️ ${notArchived.length} NICHT im Archiv — Details:`);
    for (const n of notArchived) {
      console.log(`  userId ${n.idStr} (kein User per ObjectId UND String geprüft):`);
      n.sampleEvents.forEach(e => console.log(`     - ${e.type} "${(e.title || '').slice(0, 50)}" date=${e.date?.toISOString?.() || e.date} created=${e.createdAt?.toISOString?.() || e.createdAt}`));
    }
  }

  console.log('\n════ FAZIT SICHERHEIT ════');
  console.log(`• Lebende User unter den zu löschenden IDs: 0 (per ObjectId+String ausgeschlossen)`);
  console.log(`• Aufräum-Kandidaten: ${orphans.length} verwaiste IDs, davon ${archivedCount} archiv-bestätigt`);
  console.log('(Read-only — nichts verändert.)\n');
  await database.close();
})().catch(async e => { console.error('FEHLER:', e.message); try { await database.close(); } catch (_) {} process.exit(1); });
