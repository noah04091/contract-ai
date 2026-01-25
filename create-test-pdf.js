/**
 * Creates test PDFs using html-pdf-node (puppeteer-based)
 * These PDFs can be read by pdf-parse (unlike pdf-lib generated ones)
 */

const htmlPdf = require('./backend/node_modules/html-pdf-node');
const fs = require('fs');

const PROBLEMATIC_CONTRACT = `
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.6; padding: 40px; }
    h1 { text-align: center; font-size: 18px; margin-bottom: 30px; }
    p { margin: 10px 0; }
  </style>
</head>
<body>
  <h1>ARBEITSVERTRAG</h1>

  <p>zwischen Firma ABC und Herr Schmidt</p>

  <p><strong>1.</strong> Der Arbeitnehmer wird eingestellt. Die Arbeit beginnt wenn der Chef sagt.</p>

  <p><strong>2.</strong> Gehalt: 3000 Euro oder so ähnlich, je nachdem wie der Chef drauf ist. Kann auch weniger sein.</p>

  <p><strong>3.</strong> Arbeitszeit: Der Arbeitnehmer muss arbeiten wenn Arbeit da ist. Auch nachts und am Wochenende. Überstunden werden nicht bezahlt und sind mit dem Gehalt abgegolten, egal wie viele.</p>

  <p><strong>4.</strong> Urlaub gibt es wenn der Chef es erlaubt. Der Arbeitnehmer hat keinen festen Urlaubsanspruch.</p>

  <p><strong>5.</strong> Der Arbeitnehmer kann jederzeit ohne Grund gekündigt werden. Der Arbeitgeber muss keine Frist einhalten.</p>

  <p><strong>6.</strong> Der Arbeitnehmer darf nirgendwo anders arbeiten, auch nicht nach Feierabend, auch nicht ehrenamtlich.</p>

  <p><strong>7.</strong> Bei Krankheit muss der Arbeitnehmer trotzdem kommen oder es gibt Lohnabzug.</p>

  <p><strong>8.</strong> Der Arbeitnehmer haftet für alle Schäden die im Betrieb entstehen, auch wenn er nichts dafür kann. Die Haftung ist unbegrenzt.</p>

  <p><strong>9.</strong> Der Arbeitgeber darf den Arbeitnehmer jederzeit zu anderen Aufgaben einteilen, auch wenn diese nichts mit seiner Qualifikation zu tun haben. Der Arbeitnehmer darf nicht ablehnen.</p>

  <p><strong>10.</strong> Nach Ende des Arbeitsverhältnisses darf der Arbeitnehmer 10 Jahre lang nicht in der Branche arbeiten. Eine Entschädigung gibt es dafür nicht.</p>

  <p><strong>11.</strong> Der Arbeitgeber behält sich vor, das Gehalt jederzeit zu kürzen.</p>

  <p><strong>12.</strong> Mündliche Zusagen gelten mehr als dieser Vertrag.</p>

  <p style="margin-top: 40px;">Unterschrift: ________________</p>
</body>
</html>
`;

const PROFESSIONAL_CONTRACT = `
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.5; padding: 30px; }
    h1 { text-align: center; font-size: 16px; margin-bottom: 20px; }
    h2 { font-size: 12px; margin-top: 20px; margin-bottom: 10px; }
    p { margin: 8px 0; }
    .parties { margin-bottom: 20px; }
    .signature { margin-top: 40px; display: flex; justify-content: space-between; }
    .signature div { width: 45%; text-align: center; }
  </style>
</head>
<body>
  <h1>ARBEITSVERTRAG</h1>

  <div class="parties">
    <p><strong>zwischen</strong></p>
    <p>Muster GmbH<br>Musterstraße 123<br>80333 München<br>- nachfolgend "Arbeitgeber" genannt -</p>
    <p><strong>und</strong></p>
    <p>Max Mustermann<br>Beispielweg 45<br>80335 München<br>- nachfolgend "Arbeitnehmer" genannt -</p>
  </div>

  <h2>§ 1 Beginn und Dauer des Arbeitsverhältnisses</h2>
  <p>(1) Das Arbeitsverhältnis beginnt am 01.02.2025 und wird auf unbestimmte Zeit geschlossen.</p>
  <p>(2) Die ersten sechs Monate gelten als Probezeit. Während der Probezeit kann das Arbeitsverhältnis von beiden Seiten mit einer Frist von zwei Wochen gekündigt werden.</p>

  <h2>§ 2 Tätigkeit und Aufgabenbereich</h2>
  <p>(1) Der Arbeitnehmer wird als Senior Software Developer eingestellt.</p>
  <p>(2) Zu seinen Aufgaben gehören insbesondere: Entwicklung und Wartung von Softwareanwendungen, Technische Konzeption und Architektur, Code-Reviews und Qualitätssicherung, Mentoring von Junior-Entwicklern.</p>
  <p>(3) Der Arbeitgeber behält sich vor, dem Arbeitnehmer andere zumutbare Aufgaben zuzuweisen, die seinen Fähigkeiten und Qualifikationen entsprechen.</p>

  <h2>§ 3 Arbeitsort</h2>
  <p>(1) Der Arbeitsort ist der Firmensitz in München.</p>
  <p>(2) Der Arbeitnehmer erklärt sich bereit, auch an anderen Orten des Arbeitgebers tätig zu werden, soweit dies zumutbar ist.</p>
  <p>(3) Nach Absprache ist mobiles Arbeiten (Home Office) an bis zu drei Tagen pro Woche möglich.</p>

  <h2>§ 4 Arbeitszeit</h2>
  <p>(1) Die regelmäßige wöchentliche Arbeitszeit beträgt 40 Stunden.</p>
  <p>(2) Die Verteilung der Arbeitszeit richtet sich nach den betrieblichen Erfordernissen.</p>
  <p>(3) Der Arbeitnehmer ist verpflichtet, bei betrieblichem Bedarf Mehrarbeit zu leisten. Mehrarbeit wird durch Freizeitausgleich oder gesonderte Vergütung abgegolten.</p>

  <h2>§ 5 Vergütung</h2>
  <p>(1) Der Arbeitnehmer erhält ein monatliches Bruttogehalt von 6.500,00 Euro.</p>
  <p>(2) Die Zahlung erfolgt jeweils zum Ende des Monats auf ein vom Arbeitnehmer angegebenes Bankkonto.</p>
  <p>(3) Zusätzlich erhält der Arbeitnehmer einen leistungsabhängigen Bonus von bis zu 10% des Jahresgehalts.</p>

  <h2>§ 6 Urlaub</h2>
  <p>(1) Der Arbeitnehmer hat Anspruch auf 30 Arbeitstage bezahlten Erholungsurlaub pro Kalenderjahr.</p>
  <p>(2) Der Urlaub ist in Abstimmung mit dem Vorgesetzten und unter Berücksichtigung betrieblicher Belange zu nehmen.</p>

  <h2>§ 7 Entgeltfortzahlung im Krankheitsfall</h2>
  <p>(1) Im Falle einer Arbeitsunfähigkeit durch Krankheit erhält der Arbeitnehmer Entgeltfortzahlung nach den gesetzlichen Bestimmungen.</p>
  <p>(2) Der Arbeitnehmer ist verpflichtet, eine Arbeitsunfähigkeit unverzüglich anzuzeigen und spätestens am dritten Kalendertag eine ärztliche Bescheinigung vorzulegen.</p>

  <h2>§ 8 Kündigung</h2>
  <p>(1) Nach Ablauf der Probezeit kann das Arbeitsverhältnis von beiden Seiten mit einer Frist von drei Monaten zum Monatsende gekündigt werden.</p>
  <p>(2) Die Kündigung bedarf zu ihrer Wirksamkeit der Schriftform.</p>
  <p>(3) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.</p>

  <h2>§ 9 Nebentätigkeiten</h2>
  <p>(1) Nebentätigkeiten bedürfen der vorherigen schriftlichen Zustimmung des Arbeitgebers.</p>
  <p>(2) Die Zustimmung ist zu erteilen, wenn die Nebentätigkeit die Arbeitsleistung nicht beeinträchtigt.</p>

  <h2>§ 10 Geheimhaltung</h2>
  <p>(1) Der Arbeitnehmer verpflichtet sich, über alle betrieblichen Angelegenheiten Stillschweigen zu bewahren.</p>
  <p>(2) Diese Verpflichtung gilt auch nach Beendigung des Arbeitsverhältnisses fort.</p>

  <h2>§ 11 Wettbewerbsverbot</h2>
  <p>Während der Dauer des Arbeitsverhältnisses ist es dem Arbeitnehmer untersagt, für ein Konkurrenzunternehmen tätig zu werden.</p>

  <h2>§ 12 Vertragsänderungen</h2>
  <p>(1) Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform.</p>
  <p>(2) Sollten einzelne Bestimmungen unwirksam sein, wird die Wirksamkeit der übrigen Bestimmungen nicht berührt.</p>

  <h2>§ 13 Schlussbestimmungen</h2>
  <p>(1) Auf dieses Arbeitsverhältnis findet deutsches Recht Anwendung.</p>
  <p>(2) Gerichtsstand ist München.</p>

  <p style="margin-top: 20px;">München, den 15.01.2025</p>

  <div class="signature">
    <div>_________________________<br>Arbeitgeber<br>(Muster GmbH)</div>
    <div>_________________________<br>Arbeitnehmer<br>(Max Mustermann)</div>
  </div>
</body>
</html>
`;

async function createPDFs() {
  console.log('📄 Erstelle Test-PDFs mit html-pdf-node (puppeteer)...\n');

  const options = {
    format: 'A4',
    margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
  };

  // Problematic contract
  console.log('1. Erstelle problematischen Vertrag...');
  const problematicFile = { content: PROBLEMATIC_CONTRACT };
  const problematicPdf = await htmlPdf.generatePdf(problematicFile, options);
  fs.writeFileSync('test-problematic-real.pdf', problematicPdf);
  console.log('   ✅ test-problematic-real.pdf erstellt');

  // Professional contract
  console.log('2. Erstelle professionellen Vertrag...');
  const professionalFile = { content: PROFESSIONAL_CONTRACT };
  const professionalPdf = await htmlPdf.generatePdf(professionalFile, options);
  fs.writeFileSync('test-professional-real.pdf', professionalPdf);
  console.log('   ✅ test-professional-real.pdf erstellt');

  console.log('\n🎉 Fertig! PDFs können jetzt mit der API getestet werden.');
}

createPDFs().catch(console.error);
