/**
 * Optimizer 2.0 API Test Script
 *
 * Usage:
 *   node test-optimizer-api.js <email> <password>
 *   oder
 *   node test-optimizer-api.js --token <jwt-token>
 */

const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const API_BASE = 'https://api.contract-ai.de/api';

// Test-Verträge
const PROFESSIONAL_CONTRACT = `ARBEITSVERTRAG

zwischen

Muster GmbH
Musterstraße 123, 80333 München
- nachfolgend "Arbeitgeber" genannt -

und

Max Mustermann
Beispielweg 45, 80335 München
- nachfolgend "Arbeitnehmer" genannt -


§ 1 Beginn und Dauer des Arbeitsverhältnisses

(1) Das Arbeitsverhältnis beginnt am 01.02.2025 und wird auf unbestimmte Zeit geschlossen.

(2) Die ersten sechs Monate gelten als Probezeit. Während der Probezeit kann das Arbeitsverhältnis von beiden Seiten mit einer Frist von zwei Wochen gekündigt werden.


§ 2 Tätigkeit und Aufgabenbereich

(1) Der Arbeitnehmer wird als Senior Software Developer eingestellt.

(2) Zu seinen Aufgaben gehören insbesondere:
- Entwicklung und Wartung von Softwareanwendungen
- Technische Konzeption und Architektur
- Code-Reviews und Qualitätssicherung
- Mentoring von Junior-Entwicklern

(3) Der Arbeitgeber behält sich vor, dem Arbeitnehmer andere zumutbare Aufgaben zuzuweisen, die seinen Fähigkeiten und Qualifikationen entsprechen.


§ 3 Arbeitsort

(1) Der Arbeitsort ist der Firmensitz in München.

(2) Der Arbeitnehmer erklärt sich bereit, auch an anderen Orten des Arbeitgebers tätig zu werden, soweit dies zumutbar ist.

(3) Nach Absprache ist mobiles Arbeiten (Home Office) an bis zu drei Tagen pro Woche möglich.


§ 4 Arbeitszeit

(1) Die regelmäßige wöchentliche Arbeitszeit beträgt 40 Stunden.

(2) Die Verteilung der Arbeitszeit richtet sich nach den betrieblichen Erfordernissen und wird in Abstimmung mit dem Vorgesetzten festgelegt.

(3) Der Arbeitnehmer ist verpflichtet, bei betrieblichem Bedarf Mehrarbeit zu leisten. Mehrarbeit wird durch Freizeitausgleich oder gesonderte Vergütung abgegolten.


§ 5 Vergütung

(1) Der Arbeitnehmer erhält ein monatliches Bruttogehalt von 6.500,00 Euro.

(2) Die Zahlung erfolgt jeweils zum Ende des Monats auf ein vom Arbeitnehmer angegebenes Bankkonto.

(3) Zusätzlich erhält der Arbeitnehmer einen leistungsabhängigen Bonus von bis zu 10% des Jahresgehalts.


§ 6 Urlaub

(1) Der Arbeitnehmer hat Anspruch auf 30 Arbeitstage bezahlten Erholungsurlaub pro Kalenderjahr.

(2) Der Urlaub ist in Abstimmung mit dem Vorgesetzten und unter Berücksichtigung betrieblicher Belange zu nehmen.


§ 7 Entgeltfortzahlung im Krankheitsfall

(1) Im Falle einer Arbeitsunfähigkeit durch Krankheit erhält der Arbeitnehmer Entgeltfortzahlung nach den gesetzlichen Bestimmungen.

(2) Der Arbeitnehmer ist verpflichtet, eine Arbeitsunfähigkeit unverzüglich anzuzeigen und spätestens am dritten Kalendertag eine ärztliche Bescheinigung vorzulegen.


§ 8 Kündigung

(1) Nach Ablauf der Probezeit kann das Arbeitsverhältnis von beiden Seiten mit einer Frist von drei Monaten zum Monatsende gekündigt werden.

(2) Die Kündigung bedarf zu ihrer Wirksamkeit der Schriftform.

(3) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.


§ 9 Nebentätigkeiten

(1) Nebentätigkeiten bedürfen der vorherigen schriftlichen Zustimmung des Arbeitgebers.

(2) Die Zustimmung ist zu erteilen, wenn die Nebentätigkeit die Arbeitsleistung nicht beeinträchtigt.


§ 10 Geheimhaltung

(1) Der Arbeitnehmer verpflichtet sich, über alle betrieblichen Angelegenheiten Stillschweigen zu bewahren.

(2) Diese Verpflichtung gilt auch nach Beendigung des Arbeitsverhältnisses fort.


§ 11 Wettbewerbsverbot

Während der Dauer des Arbeitsverhältnisses ist es dem Arbeitnehmer untersagt, für ein Konkurrenzunternehmen tätig zu werden.


§ 12 Vertragsänderungen

(1) Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform.

(2) Sollten einzelne Bestimmungen unwirksam sein, wird die Wirksamkeit der übrigen Bestimmungen nicht berührt.


§ 13 Schlussbestimmungen

(1) Auf dieses Arbeitsverhältnis findet deutsches Recht Anwendung.

(2) Gerichtsstand ist München.


München, den 15.01.2025


_________________________          _________________________
Arbeitgeber                        Arbeitnehmer`;


const PROBLEMATIC_CONTRACT = `ARBEITSVERTRAG

zwischen Firma ABC und Herr Schmidt

1. Der Arbeitnehmer wird eingestellt. Die Arbeit beginnt wenn der Chef sagt.

2. Gehalt: 3000 Euro oder so ähnlich, je nachdem wie der Chef drauf ist. Kann auch weniger sein.

3. Arbeitszeit: Der Arbeitnehmer muss arbeiten wenn Arbeit da ist. Auch nachts und am Wochenende. Überstunden werden nicht bezahlt und sind mit dem Gehalt abgegolten, egal wie viele.

4. Urlaub gibt es wenn der Chef es erlaubt. Der Arbeitnehmer hat keinen festen Urlaubsanspruch.

5. Der Arbeitnehmer kann jederzeit ohne Grund gekündigt werden. Der Arbeitgeber muss keine Frist einhalten.

6. Der Arbeitnehmer darf nirgendwo anders arbeiten, auch nicht nach Feierabend, auch nicht ehrenamtlich.

7. Bei Krankheit muss der Arbeitnehmer trotzdem kommen oder es gibt Lohnabzug.

8. Der Arbeitnehmer haftet für alle Schäden die im Betrieb entstehen, auch wenn er nichts dafür kann. Die Haftung ist unbegrenzt.

9. Der Arbeitgeber darf den Arbeitnehmer jederzeit zu anderen Aufgaben einteilen, auch wenn diese nichts mit seiner Qualifikation zu tun haben.

10. Nach Ende des Arbeitsverhältnisses darf der Arbeitnehmer 10 Jahre lang nicht in der Branche arbeiten. Eine Entschädigung gibt es dafür nicht.

11. Der Arbeitgeber behält sich vor, das Gehalt jederzeit zu kürzen.

12. Mündliche Zusagen gelten mehr als dieser Vertrag.

Unterschrift: ________________`;


async function createPDF(text, filename) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 10;
  const margin = 50;
  const lineHeight = 14;

  // Split text into lines
  const lines = text.split('\n');
  let currentPage = pdfDoc.addPage([595, 842]); // A4
  let y = 842 - margin;

  for (const line of lines) {
    // Word wrap
    const words = line.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width > 595 - 2 * margin) {
        if (y < margin + lineHeight) {
          currentPage = pdfDoc.addPage([595, 842]);
          y = 842 - margin;
        }
        currentPage.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
        y -= lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      if (y < margin + lineHeight) {
        currentPage = pdfDoc.addPage([595, 842]);
        y = 842 - margin;
      }
      currentPage.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
      y -= lineHeight;
    } else {
      y -= lineHeight; // Empty line
    }
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(filename, pdfBytes);
  console.log(`📄 PDF erstellt: ${filename}`);
  return filename;
}


async function login(email, password) {
  console.log('🔐 Login...');
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    throw new Error(`Login fehlgeschlagen: ${res.status}`);
  }

  const data = await res.json();
  console.log('✅ Login erfolgreich!');
  return data.token;
}


async function optimizeContract(token, pdfPath, perspective = 'neutral') {
  console.log(`\n📄 Starte Optimierung (Perspektive: ${perspective})...`);

  const startTime = Date.now();

  // Use axios with form-data (fetch had issues)
  const axios = require('axios');
  const FormData = require('form-data');

  const form = new FormData();
  form.append('file', fs.createReadStream(pdfPath), {
    filename: path.basename(pdfPath),
    contentType: 'application/pdf'
  });
  form.append('perspective', perspective);

  try {
    const response = await axios.post(`${API_BASE}/optimize`, form, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      },
      timeout: 300000  // 5 Minuten Timeout für GPT
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Optimierung abgeschlossen in ${duration}s`);

    return response.data;
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`❌ Optimierung fehlgeschlagen nach ${duration}s`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data).substring(0, 500)}`);
    }
    throw error;
  }
}


function analyzeResult(result, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ERGEBNIS: ${label}`);
  console.log('='.repeat(60));

  // Meta-Daten
  if (result.meta) {
    console.log(`\n📋 Meta:`);
    console.log(`   Vertragstyp: ${result.meta.type}`);
    console.log(`   Erkannt als: ${result.meta.recognizedAs || 'N/A'}`);
    console.log(`   Reife: ${result.meta.maturity || 'N/A'}`);
    console.log(`   Konfidenz: ${result.meta.confidence || 'N/A'}%`);
  }

  // Assessment (NEU in v2.0!)
  if (result.assessment) {
    console.log(`\n🎯 Assessment (Decision-First):`);
    console.log(`   Gesamt: ${result.assessment.overall}`);
    console.log(`   Optimierung nötig: ${result.assessment.optimizationNeeded ? 'JA' : 'NEIN'}`);
    console.log(`   Begründung: ${result.assessment.reasoning?.substring(0, 150)}...`);
    if (result.assessment.intentionalClauses?.length > 0) {
      console.log(`   Beabsichtigte Klauseln: ${result.assessment.intentionalClauses.length}`);
    }
  }

  // Score
  if (result.score) {
    console.log(`\n💯 Health Score: ${result.score.health}/100`);
  }

  // Kategorien und Issues
  let totalIssues = 0;
  let criticalCount = 0;
  let highCount = 0;

  if (result.categories) {
    result.categories.forEach(cat => {
      if (cat.issues?.length > 0) {
        totalIssues += cat.issues.length;
        cat.issues.forEach(issue => {
          if (issue.priority === 'critical') criticalCount++;
          if (issue.priority === 'high') highCount++;
        });
      }
    });
  }

  console.log(`\n📈 Statistik:`);
  console.log(`   Gesamt-Optimierungen: ${totalIssues}`);
  console.log(`   Kritisch: ${criticalCount}`);
  console.log(`   Hoch: ${highCount}`);

  // v2.0 Felder Check
  let issuesWithEvidence = 0;
  let issuesWithWhyItMatters = 0;
  let issuesWithWhyNotIntentional = 0;
  let issuesWithWhenToIgnore = 0;

  if (result.categories) {
    result.categories.forEach(cat => {
      (cat.issues || []).forEach(issue => {
        if (issue.evidence?.length > 0) issuesWithEvidence++;
        if (issue.whyItMatters) issuesWithWhyItMatters++;
        if (issue.whyNotIntentional) issuesWithWhyNotIntentional++;
        if (issue.whenToIgnore) issuesWithWhenToIgnore++;
      });
    });
  }

  console.log(`\n🆕 V2.0 FELDER CHECK:`);
  console.log(`   Issues mit Evidence: ${issuesWithEvidence}/${totalIssues}`);
  console.log(`   Issues mit whyItMatters: ${issuesWithWhyItMatters}/${totalIssues}`);
  console.log(`   Issues mit whyNotIntentional: ${issuesWithWhyNotIntentional}/${totalIssues}`);
  console.log(`   Issues mit whenToIgnore: ${issuesWithWhenToIgnore}/${totalIssues}`);

  // Details der ersten 3 Issues
  if (totalIssues > 0) {
    console.log(`\n📝 Erste Optimierungen (max 3):`);
    let shown = 0;
    for (const cat of result.categories || []) {
      for (const issue of cat.issues || []) {
        if (shown >= 3) break;
        console.log(`\n   [${issue.priority?.toUpperCase()}] ${issue.summary}`);
        if (issue.evidence?.length > 0) {
          console.log(`   📌 Evidence: "${issue.evidence[0]?.substring(0, 60)}..."`);
        }
        if (issue.whyItMatters) {
          console.log(`   ⚠️  Warum wichtig: ${issue.whyItMatters?.substring(0, 80)}...`);
        }
        shown++;
      }
      if (shown >= 3) break;
    }
  }

  return { totalIssues, criticalCount, highCount, score: result.score?.health };
}


async function main() {
  const args = process.argv.slice(2);

  let token;

  if (args[0] === '--token' && args[1]) {
    token = args[1];
    console.log('🔑 Verwende bereitgestellten Token');
  } else if (args.length >= 2) {
    const [email, password] = args;
    token = await login(email, password);
  } else {
    console.log('Usage:');
    console.log('  node test-optimizer-api.js <email> <password>');
    console.log('  node test-optimizer-api.js --token <jwt-token>');
    process.exit(1);
  }

  console.log('\n' + '🚀'.repeat(30));
  console.log('   OPTIMIZER 2.0 - DECISION-FIRST TEST');
  console.log('🚀'.repeat(30));

  // Verwende echte PDFs (erstellt mit html-pdf-node/puppeteer)
  const pdf1 = 'test-professional-real.pdf';
  const pdf2 = 'test-problematic-real.pdf';

  // Prüfe ob PDFs existieren
  if (!fs.existsSync(pdf1) || !fs.existsSync(pdf2)) {
    console.log('\n⚠️  Test-PDFs nicht gefunden. Erstelle mit: node create-test-pdf.js');
    console.log('📄 Fallback: Erstelle PDFs mit pdf-lib (may not work with pdf-parse)...');
    await createPDF(PROFESSIONAL_CONTRACT, pdf1);
    await createPDF(PROBLEMATIC_CONTRACT, pdf2);
  } else {
    console.log('\n📄 Verwende vorhandene Test-PDFs (html-pdf-node/puppeteer)');
  }

  // Test 1: Professioneller Vertrag
  console.log('\n\n' + '─'.repeat(60));
  console.log('📄 TEST 1: PROFESSIONELLER ARBEITSVERTRAG');
  console.log('   Erwartung: 0-wenige Optimierungen, hoher Score (80+)');
  console.log('─'.repeat(60));
  try {
    const result1 = await optimizeContract(token, pdf1, 'neutral');
    const stats1 = analyzeResult(result1, 'Professioneller Vertrag');

    console.log('\n✅ BEWERTUNG:');
    if (stats1.totalIssues <= 5) {
      console.log(`   ✓ ${stats1.totalIssues} Optimierungen - Decision-First funktioniert!`);
    } else {
      console.log(`   ⚠️  ${stats1.totalIssues} Optimierungen - Evtl. zu viele?`);
    }
    if (stats1.score >= 75) {
      console.log(`   ✓ Score ${stats1.score} - Gut erkannt als professioneller Vertrag`);
    } else {
      console.log(`   ⚠️  Score ${stats1.score} - Erwartet war 75+`);
    }
  } catch (err) {
    console.error('❌ Test 1 fehlgeschlagen:', err.message);
  }

  // Test 2: Problematischer Vertrag
  console.log('\n\n' + '─'.repeat(60));
  console.log('📄 TEST 2: PROBLEMATISCHER ARBEITSVERTRAG');
  console.log('   Erwartung: Viele kritische Optimierungen, niedriger Score (<50)');
  console.log('─'.repeat(60));
  try {
    const result2 = await optimizeContract(token, pdf2, 'neutral');
    const stats2 = analyzeResult(result2, 'Problematischer Vertrag');

    console.log('\n✅ BEWERTUNG:');
    if (stats2.criticalCount >= 3) {
      console.log(`   ✓ ${stats2.criticalCount} kritische Probleme erkannt - Gut!`);
    } else {
      console.log(`   ⚠️  Nur ${stats2.criticalCount} kritische Probleme - Erwartet waren mehr!`);
    }
    if (stats2.score <= 50) {
      console.log(`   ✓ Score ${stats2.score} - Probleme korrekt bewertet`);
    } else {
      console.log(`   ⚠️  Score ${stats2.score} - Sollte niedriger sein (<50)`);
    }
  } catch (err) {
    console.error('❌ Test 2 fehlgeschlagen:', err.message);
  }

  // Behalte die echten PDFs für spätere Tests
  console.log('\n📁 Test-PDFs bleiben erhalten für weitere Tests');

  console.log('\n\n' + '='.repeat(60));
  console.log('🏁 TESTS ABGESCHLOSSEN');
  console.log('='.repeat(60));
}

main().catch(console.error);
