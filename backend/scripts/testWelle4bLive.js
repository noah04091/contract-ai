// 🌍 Welle 4b (09.07.2026) — LIVE-Test Sprach-/Jurisdiktions-Erkennung.
// KRITISCH: beweist, dass die 2 neuen T2-Felder die Klassifikation DEUTSCHER
// Verträge NICHT kippen (die Schema-Addition könnte category/contractType/
// parties verschieben — genau das ist bei W3-Teil-C passiert). Plus: erkennt
// ein englischer/US-Text korrekt als fremdes Recht?
// Braucht OPENAI_API_KEY (.env). ~5 gpt-4o-mini-Calls (<1 Cent).
// Aufruf: node scripts/testWelle4bLive.js
/* eslint-disable no-console */
require('dotenv').config();
const OpenAI = require('openai');
const { classifyDocumentTypeWithGPT } = require('../routes/analyze');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
};

// Deutsche Verträge — MÜSSEN language=de, jurisdiction=DE/EU/null (KEIN Flag)
// UND stabile category/contractType behalten (Regressions-Beweis).
const DE_CASES = [
  ['DE Mietvertrag', 'CONTRACT', 'rental', `Wohnraummietvertrag zwischen Vermieter Karl Weber und Mieterin Lisa Brandt über die Wohnung Hauptstraße 5, 2. OG. § 1 Mietbeginn 01.09.2026. § 2 Die Grundmiete beträgt 850 EUR zzgl. 180 EUR Nebenkosten. § 8 Es gilt deutsches Recht, Gerichtsstand ist das Amtsgericht München. Kündigungsfristen nach § 573c BGB.`],
  ['DE SaaS mit DSGVO', 'CONTRACT', 'service', `Software-as-a-Service-Rahmenvertrag zwischen der CloudTech GmbH (Anbieter) und der Handels AG (Kunde). Der Anbieter erbringt SaaS-Leistungen. § 5 Datenschutz: Die Parteien schließen einen Auftragsverarbeitungsvertrag nach Art. 28 DSGVO. Force Majeure: Bei höherer Gewalt ruhen die Pflichten. § 12 Es gilt deutsches Recht.`],
  ['DE AVV', 'CONTRACT', 'avv', `Auftragsverarbeitungsvertrag gemäß Art. 28 DSGVO zwischen der Marketing GmbH (Verantwortlicher) und der DataProcess GmbH (Auftragsverarbeiter). Gegenstand: Verarbeitung personenbezogener Daten. Technische und organisatorische Maßnahmen nach Art. 32 DSGVO. Es gilt das Recht der Bundesrepublik Deutschland.`],
];

// Englische/US-Verträge — MÜSSEN language=en, jurisdiction=US/UK/other, Flag TRUE
const EN_CASES = [
  ['US Service Agreement', 'en', ['US', 'other', 'UK'], `MASTER SERVICES AGREEMENT. This Master Services Agreement ("Agreement") is entered into between CloudCorp Inc., a Delaware corporation ("Provider"), and Acme LLC ("Client"). 1. SERVICES. Provider shall provide the services described in Exhibit A. 5. LIMITATION OF LIABILITY. In no event shall Provider be liable for indirect damages. 12. GOVERNING LAW. This Agreement shall be governed by the laws of the State of Delaware, without regard to its conflict of laws provisions. 13. Each party shall indemnify the other against third-party claims.`],
];

(async () => {
  console.log('A) DE-Regression: deutsche Verträge — Klassifikation stabil + KEIN Fremdrecht-Flag');
  for (const [name, expCat, expType, text] of DE_CASES) {
    const r = await classifyDocumentTypeWithGPT(text, openai, 'w4b-de');
    if (!r) { check(`${name}: T2 lieferte Ergebnis`, false, 'null (Trunkierung? max_tokens!)'); continue; }
    check(`${name}: category=${expCat} stabil (ist ${r.type})`, r.type === expCat);
    check(`${name}: contractType=${expType} stabil (ist ${r.contractType})`, r.contractType === expType);
    check(`${name}: language=de (ist ${r.language})`, r.language === 'de');
    const foreignFlag = r.jurisdiction && !['DE', 'EU'].includes(r.jurisdiction) && r.jurisdictionConfidence >= 0.7;
    check(`${name}: KEIN Fremdrecht-Flag (juris=${r.jurisdiction}/${(r.jurisdictionConfidence||0).toFixed(2)})`, !foreignFlag);
  }

  console.log('\nB) Fremdrecht-Erkennung: englische Verträge → Flag TRUE');
  for (const [name, expLang, expJurs, text] of EN_CASES) {
    const r = await classifyDocumentTypeWithGPT(text, openai, 'w4b-en');
    if (!r) { check(`${name}: T2 lieferte Ergebnis`, false, 'null'); continue; }
    check(`${name}: language=${expLang} (ist ${r.language})`, r.language === expLang);
    check(`${name}: jurisdiction in [${expJurs}] (ist ${r.jurisdiction})`, expJurs.includes(r.jurisdiction));
    const foreignFlag = r.jurisdiction && !['DE', 'EU'].includes(r.jurisdiction) && r.jurisdictionConfidence >= 0.7;
    check(`${name}: Fremdrecht-Flag TRUE (juris=${r.jurisdiction}/${(r.jurisdictionConfidence||0).toFixed(2)})`, foreignFlag);
  }

  console.log(`\n${fail === 0 ? '🎉' : '💥'} ${pass} bestanden, ${fail} fehlgeschlagen`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('💥', e); process.exit(1); });
