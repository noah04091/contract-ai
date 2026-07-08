// 📨 Welle 2 (08.07.2026) — Offline-Test-Suite: Token-Budget + Quota-Logik + Plan-Normalisierung.
// GPT-frei, DB-frei (Mini-Fake-Collection für die Quota-Operatoren).
// Aufruf: node scripts/testChatWelle2.js
/* eslint-disable no-console */
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-dummy-offline';

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
};

// ─────────────────────────────────────────────────────────────────────────────
console.log('A) chatTokenBudget — pure Funktionen');
const tb = require('../utils/chatTokenBudget');

check('estimateChatTokens: 4000 Zeichen ≈ 1200 tok (×1.2)', tb.estimateChatTokens('x'.repeat(4000)) === 1200);
check('estimateChatTokens: null → 0', tb.estimateChatTokens(null) === 0);

// fitDocumentToBudget
const smallDoc = 'Kurzer Vertragstext.';
const fitSmall = tb.fitDocumentToBudget(smallDoc, 1000);
check('fit: kleines Doc unverändert', fitSmall.truncated === false && fitSmall.text === smallDoc);

const bigDoc = 'A'.repeat(50000) + 'MITTE_MARKER_INHALT' + 'B'.repeat(50000);
const fitBig = tb.fitDocumentToBudget(bigDoc, 5000); // ~16.6k Zeichen erlaubt
check('fit: großes Doc truncated', fitBig.truncated === true);
check('fit: Marker IM Text (gleicher Block!)', fitBig.text.includes('DOKUMENT GEKÜRZT'));
check('fit: Head enthalten', fitBig.text.startsWith('AAAA'));
check('fit: Tail enthalten', fitBig.text.endsWith('BBBB'));
check('fit: Budget eingehalten', tb.estimateChatTokens(fitBig.text) <= 5000 + 100);

// budgetHistory
const mkMsg = (role, len) => ({ role, content: 'x'.repeat(len) });
const history = [];
for (let i = 0; i < 40; i++) history.push(mkMsg(i % 2 ? 'assistant' : 'user', 4000)); // je ~1200 tok
const budgeted = tb.budgetHistory(history, 6000); // Platz für ~5 Messages
check(`history: token-budgetiert (${budgeted.length} von 40, erwartet ≤5)`, budgeted.length <= 5 && budgeted.length >= 4);
check('history: neueste Nachricht IMMER dabei', budgeted[budgeted.length - 1] === history[39]);
check('history: chronologische Reihenfolge', budgeted[0] === history[40 - budgeted.length]);
const one = tb.budgetHistory([mkMsg('user', 999999)], 10);
check('history: riesige neueste Nachricht trotzdem enthalten', one.length === 1);
check('history: Cap 30 greift bei viel Budget', tb.budgetHistory(history, 10_000_000).length === 30);

// computeBudgets
const { docBudgetTokens, historyBudgetTokens } = tb.computeBudgets({ systemPromptTokens: 2000, docCount: 1 });
check(`budgets: Doc-Budget groß genug für 100k-Zeichen-Doc (${docBudgetTokens} tok ≥ 30000)`, docBudgetTokens >= 30000);
check('budgets: Summe unter Kontextfenster', 2000 + docBudgetTokens + historyBudgetTokens + tb.OUTPUT_RESERVE_TOKENS + tb.RAG_RESERVE_TOKENS + tb.SAFETY_MARGIN_TOKENS <= tb.MODEL_CONTEXT_TOKENS);
const multi = tb.computeBudgets({ systemPromptTokens: 2000, docCount: 3 });
check('budgets: Multi-Doc teilt (3 Docs → je ~1/3)', multi.docBudgetTokens <= Math.ceil(docBudgetTokens / 3) + 5 && multi.docBudgetTokens >= tb.MIN_DOC_BUDGET_TOKENS / 3 - 5);

// ─────────────────────────────────────────────────────────────────────────────
console.log('B) subscriptionPlans — Normalisierung + Free-Kontingent');
const sp = require('../constants/subscriptionPlans');
check('FREE chat = 5', sp.getFeatureLimit('free', 'chat') === 5);
check('BUSINESS chat = 50 (unverändert)', sp.getFeatureLimit('business', 'chat') === 50);
check('ENTERPRISE chat = Infinity (unverändert)', sp.getFeatureLimit('enterprise', 'chat') === Infinity);
check('legendary → enterprise (Limit ∞ statt 0!)', sp.getFeatureLimit('legendary', 'chat') === Infinity);
check('legendary ist businessOrHigher (Smoke-Test-Erwartung)', sp.isBusinessOrHigher('legendary') === true);
check('premium → enterprise', sp.isEnterpriseOrHigher('premium') === true);
check('unbekannter Plan → free', sp.normalizePlan('quatsch') === 'free');
check('Regression: free ist NICHT businessOrHigher', sp.isBusinessOrHigher('free') === false);
check('Regression: analyze-Limit free unverändert 3', sp.getFeatureLimit('free', 'analyze') === 3);
check('Regression: optimize free weiter 0', sp.getFeatureLimit('free', 'optimize') === 0);

// ─────────────────────────────────────────────────────────────────────────────
console.log('C) Quota-Logik (getChatUsage read-only / consumeChatQuota atomar) — Fake-Collection');
// Mini-Fake, der exakt die genutzten Operatoren abbildet ($exists/$lte-Filter,
// $set, $inc, $or mit $lt/$exists/null). Logik-Test, kein Mongo-Ersatz —
// echte Nebenläufigkeit deckt der Live-TÜV ab.
function makeFakeUsers(userDoc) {
  const store = { doc: userDoc };
  const matches = (filter) => {
    const d = store.doc;
    for (const [k, v] of Object.entries(filter)) {
      if (k === '_id') continue;
      if (k === '$or') {
        const ok = v.some(clause => matches({ _id: null, ...clause }));
        if (!ok) return false;
        continue;
      }
      const path = k.split('.');
      let cur = d;
      for (let i = 0; i < path.length - 1; i++) cur = cur?.[path[i]];
      const val = cur?.[path[path.length - 1]];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if ('$exists' in v) { const ex = val !== undefined; if (ex !== v.$exists) return false; }
        if ('$lte' in v) { if (!(val !== undefined && val <= v.$lte)) return false; }
        if ('$lt' in v) { if (!(val !== undefined && val !== null && val < v.$lt)) return false; }
      } else if (v === null) {
        if (val !== null) return false;
      } else if (val !== v) return false;
    }
    return true;
  };
  const apply = (update) => {
    if (update.$set) for (const [k, v] of Object.entries(update.$set)) {
      const path = k.split('.'); let cur = store.doc;
      for (let i = 0; i < path.length - 1; i++) { if (cur[path[i]] === undefined) cur[path[i]] = {}; cur = cur[path[i]]; }
      cur[path[path.length - 1]] = v;
    }
    if (update.$inc) for (const [k, v] of Object.entries(update.$inc)) {
      const path = k.split('.'); let cur = store.doc;
      for (let i = 0; i < path.length - 1; i++) { if (cur[path[i]] === undefined) cur[path[i]] = {}; cur = cur[path[i]]; }
      cur[path[path.length - 1]] = (cur[path[path.length - 1]] || 0) + v;
    }
  };
  return {
    store,
    findOne: async () => JSON.parse(JSON.stringify(store.doc)),
    updateOne: async (filter, update) => { if (matches(filter)) apply(update); return { matchedCount: matches(filter) ? 1 : 0 }; },
    findOneAndUpdate: async (filter, update) => {
      if (!matches(filter)) return null;
      apply(update);
      return JSON.parse(JSON.stringify(store.doc));
    }
  };
}

// chat.js exportiert die Funktionen (siehe module.exports-Erweiterung)
const chatRoute = require('../routes/chat');
const { getChatUsage, consumeChatQuota } = chatRoute;
const { ObjectId } = require('mongodb');

(async () => {
  const uid = new ObjectId().toString();
  const future = new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString();

  // C1: getChatUsage verbraucht NICHTS (5× Aufruf → count unverändert)
  const fake1 = makeFakeUsers({ _id: uid, subscriptionPlan: 'free', chatUsage: { count: 2, resetDate: future } });
  for (let i = 0; i < 5; i++) await getChatUsage(uid, fake1);
  check('getChatUsage 5× → count bleibt 2 (READ-ONLY)', fake1.store.doc.chatUsage.count === 2);
  const u1 = await getChatUsage(uid, fake1);
  check('getChatUsage: allowed bei 2/5, remaining 3', u1.allowed === true && u1.remaining === 3 && u1.limit === 5);

  // C2: consumeChatQuota — exakt bis Limit
  const fake2 = makeFakeUsers({ _id: uid, subscriptionPlan: 'free', chatUsage: { count: 0, resetDate: future } });
  let allowedCount = 0;
  for (let i = 0; i < 8; i++) { const r = await consumeChatQuota(uid, fake2); if (r.allowed) allowedCount++; }
  check(`consume: exakt 5 von 8 erlaubt (Free-Limit), war ${allowedCount}`, allowedCount === 5);
  check('consume: count steht auf 5 (nicht 8)', fake2.store.doc.chatUsage.count === 5);
  const denied = await consumeChatQuota(uid, fake2);
  check('consume: 403-Body-Felder vorhanden (limit/current)', denied.allowed === false && denied.limit === 5 && denied.current === 5);

  // C3: Erstnutzer ohne chatUsage-Feld ($exists-Fall)
  const fake3 = makeFakeUsers({ _id: uid, subscriptionPlan: 'free' });
  const first = await consumeChatQuota(uid, fake3);
  check('consume: Erstnutzer erlaubt (kein $lt-auf-undefined-Fail)', first.allowed === true && first.current === 1);

  // C4: Monats-Reset (resetDate überschritten)
  const past = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const fake4 = makeFakeUsers({ _id: uid, subscriptionPlan: 'free', chatUsage: { count: 5, resetDate: past } });
  const afterReset = await consumeChatQuota(uid, fake4);
  check('consume: nach Monats-Reset wieder erlaubt (count 5→0→1)', afterReset.allowed === true && fake4.store.doc.chatUsage.count === 1);
  check('consume: resetDate fortgeschrieben', new Date(fake4.store.doc.chatUsage.resetDate) > new Date());

  // C5: Enterprise/legendary = unbegrenzt
  const fake5 = makeFakeUsers({ _id: uid, subscriptionPlan: 'legendary', chatUsage: { count: 999, resetDate: future } });
  const ent = await consumeChatQuota(uid, fake5);
  check('consume: legendary (→enterprise) nie geblockt', ent.allowed === true);

  console.log(`\n${fail === 0 ? '🎉' : '💥'} ${pass} bestanden, ${fail} fehlgeschlagen`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('💥', e); process.exit(1); });
