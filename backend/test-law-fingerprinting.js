// 📁 backend/test-law-fingerprinting.js
// Test Law Fingerprinting & Deduplication

require('dotenv').config();
const { getInstance: getLawFingerprinting } = require('./services/lawFingerprinting');

console.log('🧪 Testing Law Fingerprinting & Deduplication\n');
console.log('='.repeat(70));

const fingerprinting = getLawFingerprinting();

// Test Case 1: Same law from different sources
console.log('\n📋 Test 1: Detecting Duplicates from Different Sources\n');

const law1 = {
  title: 'Neue Gewährleistungsfristen für Kaufverträge ab 2025',
  description: 'Die gesetzliche Gewährleistungsfrist wird verlängert',
  updatedAt: new Date('2025-01-15'),
  feedId: 'bundesgesetzblatt',
  source: 'BGBl'
};

const law2 = {
  title: 'Neue Gewährleistungsfristen für Kaufverträge ab 2025',
  description: 'Gesetz zur Verlängerung der Gewährleistungsfrist tritt in Kraft',
  updatedAt: new Date('2025-01-15'),
  feedId: 'lto-news',
  source: 'LTO'
};

const fingerprint1 = fingerprinting.generateFingerprint(law1);
const fingerprint2 = fingerprinting.generateFingerprint(law2);

console.log(`Law 1 (${law1.feedId}):`);
console.log(`  Title: "${law1.title}"`);
console.log(`  Fingerprint: ${fingerprint1}`);

console.log(`\nLaw 2 (${law2.feedId}):`);
console.log(`  Title: "${law2.title}"`);
console.log(`  Fingerprint: ${fingerprint2}`);

console.log(`\n✅ Same fingerprint? ${fingerprint1 === fingerprint2 ? 'YES - Will be merged!' : 'NO'}`);

// Test Case 2: Different laws
console.log('\n\n📋 Test 2: Different Laws Get Different Fingerprints\n');

const law3 = {
  title: 'Mietrecht: Neue Kündigungsfristen ab März 2025',
  description: 'Kündigungsfristen für Mietverträge werden angepasst',
  updatedAt: new Date('2025-01-20'),
  feedId: 'bundestag',
  source: 'Bundestag'
};

const fingerprint3 = fingerprinting.generateFingerprint(law3);

console.log(`Law 3:`);
console.log(`  Title: "${law3.title}"`);
console.log(`  Fingerprint: ${fingerprint3}`);

console.log(`\n✅ Different from Law 1? ${fingerprint1 !== fingerprint3 ? 'YES - Separate entries!' : 'NO'}`);

// Test Case 3: Fuzzy matching
console.log('\n\n📋 Test 3: Fuzzy Matching for Similar Titles\n');

const law4 = {
  title: 'NEU: Gewährleistungsfristen Kaufverträge 2025!',
  description: 'Wichtige Änderung der Gewährleistungsfristen',
  updatedAt: new Date('2025-01-15'),
  feedId: 'another-source'
};

const fingerprint4 = fingerprinting.generateFingerprint(law4);
const areDuplicates = fingerprinting.areLikelyDuplicates(law1, law4);

console.log(`Law 4:`);
console.log(`  Title: "${law4.title}"`);
console.log(`  Fingerprint: ${fingerprint4}`);
console.log(`\n✅ Detected as duplicate via fuzzy matching? ${areDuplicates ? 'YES' : 'NO'}`);

// Test Case 4: Merging metadata
console.log('\n\n📋 Test 4: Merging Duplicate Metadata\n');

const existingLaw = {
  _id: 'law-123',
  title: 'Neue Gewährleistungsfristen für Kaufverträge',
  description: 'Original description',
  feedId: 'bundesgesetzblatt',
  url: 'https://bgbl.de/law1',
  createdAt: new Date('2025-01-15T08:00:00'),
  updatedAt: new Date('2025-01-15T08:00:00'),
  metadata: {
    sources: ['bundesgesetzblatt'],
    mergeCount: 0
  }
};

const newLaw = {
  title: 'Neue Gewährleistungsfristen für Kaufverträge',
  description: 'More detailed description from LTO',
  feedId: 'lto-news',
  url: 'https://lto.de/article/12345',
  createdAt: new Date('2025-01-15T10:00:00'),
  updatedAt: new Date('2025-01-15T10:00:00')
};

const merged = fingerprinting.mergeDuplicates(existingLaw, newLaw);

console.log(`Existing Law:`);
console.log(`  Sources: ${existingLaw.metadata.sources.join(', ')}`);
console.log(`  URL: ${existingLaw.url}`);

console.log(`\nNew Law (Duplicate):`);
console.log(`  Source: ${newLaw.feedId}`);
console.log(`  URL: ${newLaw.url}`);

console.log(`\nMerged Result:`);
console.log(`  Sources: ${merged.metadata.sources.join(', ')}`);
console.log(`  URLs: ${merged.metadata.urls.join(', ')}`);
console.log(`  Merge Count: ${merged.metadata.mergeCount}`);
console.log(`  Description: "${merged.description.substring(0, 50)}..."`);

console.log('\n' + '='.repeat(70));
console.log('✅ Law Fingerprinting Tests Complete!');
console.log('='.repeat(70));

process.exit(0);
