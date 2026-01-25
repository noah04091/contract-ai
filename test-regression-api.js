/**
 * Regression Test für Optimizer API
 * Testet Hauptverträge nach Phase 3b/3c Änderungen
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_URL = 'https://api.contract-ai.de';

// Test-Token (muss gültig sein)
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';

async function testOptimizer(pdfPath, testName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 TEST: ${testName}`);
  console.log(`📄 Datei: ${path.basename(pdfPath)}`);
  console.log('='.repeat(60));

  if (!fs.existsSync(pdfPath)) {
    console.log(`❌ Datei nicht gefunden: ${pdfPath}`);
    return null;
  }

  const formData = new FormData();
  formData.append('contract', fs.createReadStream(pdfPath));
  formData.append('perspective', 'neutral');

  try {
    const startTime = Date.now();

    const response = await fetch(`${API_URL}/api/optimize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ API Fehler: ${response.status}`);
      console.log(`   ${errorText.slice(0, 200)}`);
      return null;
    }

    const result = await response.json();

    // Analyse der Ergebnisse
    console.log(`\n📊 ERGEBNISSE (${duration}s):`);
    console.log(`   Health Score: ${result.healthScore?.overall || 'N/A'}/100`);
    console.log(`   Optimierungen: ${result.optimizations?.length || 0}`);

    // Meta-Daten
    if (result.meta) {
      console.log(`\n📋 META:`);
      console.log(`   Erkannt als: ${result.meta.recognizedAs || 'N/A'}`);
      console.log(`   Vertragstyp: ${result.meta.type || 'N/A'}`);
      console.log(`   Reife: ${result.meta.maturity || 'N/A'}`);
      console.log(`   isAmendment: ${result.meta.documentScope?.isAmendment || false}`);
    }

    // Document Scope (Phase 3b/3c)
    if (result.meta?.documentScope) {
      const ds = result.meta.documentScope;
      console.log(`\n🔍 DOCUMENT SCOPE:`);
      console.log(`   Type: ${ds.type}`);
      console.log(`   Applied Scope: ${ds.appliedScope}`);
      if (ds.hardScopeEnforcement?.applied) {
        console.log(`   Hard Scope: kept=${ds.hardScopeEnforcement.kept}, filtered=${ds.hardScopeEnforcement.filtered}`);
      }
    }

    // Optimierungen nach Kategorie
    if (result.optimizations?.length > 0) {
      const byCategory = {};
      result.optimizations.forEach(opt => {
        const cat = opt.category || 'other';
        byCategory[cat] = (byCategory[cat] || 0) + 1;
      });
      console.log(`\n📈 NACH KATEGORIE:`);
      Object.entries(byCategory).forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count}`);
      });

      // Top 3 Optimierungen
      console.log(`\n🔝 TOP 3 OPTIMIERUNGEN:`);
      result.optimizations.slice(0, 3).forEach((opt, i) => {
        console.log(`   ${i + 1}. [${opt.category}] ${opt.summary?.slice(0, 60)}...`);
        console.log(`      Risk: ${opt.risk}/10, Impact: ${opt.impact}/10`);
      });
    }

    // Assessment (Phase 2.0)
    if (result.assessment) {
      console.log(`\n💡 ASSESSMENT:`);
      console.log(`   Overall: ${result.assessment.overall}`);
      console.log(`   Optimization Needed: ${result.assessment.optimizationNeeded}`);
    }

    return {
      testName,
      score: result.healthScore?.overall,
      optimizations: result.optimizations?.length || 0,
      isAmendment: result.meta?.documentScope?.isAmendment || false,
      duration
    };

  } catch (error) {
    console.log(`❌ Fehler: ${error.message}`);
    return null;
  }
}

async function runRegressionTests() {
  console.log('\n' + '🔄'.repeat(30));
  console.log('   OPTIMIZER REGRESSION TESTS - Phase 3b/3c');
  console.log('🔄'.repeat(30));

  if (!AUTH_TOKEN) {
    console.log('\n⚠️  WARNUNG: Kein AUTH_TOKEN gesetzt!');
    console.log('   Setze TEST_AUTH_TOKEN Umgebungsvariable oder bearbeite das Skript.');
    console.log('   Tests werden trotzdem versucht...\n');
  }

  const tests = [
    {
      path: './test-professional-real.pdf',
      name: 'Professioneller Arbeitsvertrag (sollte wenige Optimierungen haben)',
      expectedScore: '>= 80',
      expectedOptimizations: '< 10'
    },
    {
      path: './test-problematic-real.pdf',
      name: 'Problematischer Arbeitsvertrag (sollte viele Optimierungen haben)',
      expectedScore: '< 60',
      expectedOptimizations: '>= 5'
    }
  ];

  const results = [];

  for (const test of tests) {
    const result = await testOptimizer(
      path.join(__dirname, test.path),
      test.name
    );
    if (result) {
      result.expected = {
        score: test.expectedScore,
        optimizations: test.expectedOptimizations
      };
      results.push(result);
    }
  }

  // Zusammenfassung
  console.log('\n' + '='.repeat(60));
  console.log('📊 ZUSAMMENFASSUNG');
  console.log('='.repeat(60));

  results.forEach(r => {
    const scoreOk = r.score >= 80 ? '✅' : r.score >= 60 ? '⚠️' : '❌';
    const amendmentFlag = r.isAmendment ? ' [AMENDMENT]' : '';
    console.log(`\n${r.testName}${amendmentFlag}`);
    console.log(`   Score: ${scoreOk} ${r.score}/100 (erwartet: ${r.expected.score})`);
    console.log(`   Optimierungen: ${r.optimizations} (erwartet: ${r.expected.optimizations})`);
    console.log(`   Dauer: ${r.duration}s`);
  });

  // Regression Check
  console.log('\n' + '-'.repeat(60));
  console.log('🔍 REGRESSION CHECK:');

  const professional = results.find(r => r.testName.includes('Professioneller'));
  const problematic = results.find(r => r.testName.includes('Problematischer'));

  if (professional && problematic) {
    // Professioneller Vertrag sollte höheren Score haben
    if (professional.score > problematic.score) {
      console.log('   ✅ Professioneller Vertrag hat höheren Score als problematischer');
    } else {
      console.log('   ❌ REGRESSION: Professioneller Vertrag hat niedrigeren Score!');
    }

    // Problematischer sollte mehr Optimierungen haben
    if (problematic.optimizations > professional.optimizations) {
      console.log('   ✅ Problematischer Vertrag hat mehr Optimierungen');
    } else {
      console.log('   ❌ REGRESSION: Problematischer Vertrag hat weniger Optimierungen!');
    }

    // Keiner sollte als Amendment erkannt werden
    if (!professional.isAmendment && !problematic.isAmendment) {
      console.log('   ✅ Beide korrekt als Hauptverträge erkannt (nicht Amendment)');
    } else {
      console.log('   ❌ REGRESSION: Mindestens einer wurde fälschlich als Amendment erkannt!');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Regression Tests abgeschlossen');
  console.log('='.repeat(60) + '\n');
}

runRegressionTests().catch(console.error);
