const fs = require('fs');
const https = require('https');
const path = require('path');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im5vYWhib2ExM0B3ZWIuZGUiLCJ1c2VySWQiOiI2ODI3NzcxOGIzMTIzNjVhODI2MjQwNjYiLCJpYXQiOjE3Njc0ODI1MjcsImV4cCI6MTc2NzQ4OTcyN30.jJHmPHKbwdE9pYcLS28NvtYUtARQsPw1XVvWEOPuXTc';
const pdfPath = process.argv[2] || './test-professional-real.pdf';
const testName = process.argv[3] || 'Test';

const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
const fileContent = fs.readFileSync(pdfPath);
const fileName = path.basename(pdfPath);

const body = Buffer.concat([
  Buffer.from('--' + boundary + '\r\n'),
  Buffer.from('Content-Disposition: form-data; name="file"; filename="' + fileName + '"\r\n'),
  Buffer.from('Content-Type: application/pdf\r\n\r\n'),
  fileContent,
  Buffer.from('\r\n--' + boundary + '\r\n'),
  Buffer.from('Content-Disposition: form-data; name="perspective"\r\n\r\n'),
  Buffer.from('neutral'),
  Buffer.from('\r\n--' + boundary + '--\r\n')
]);

const options = {
  hostname: 'api.contract-ai.de',
  path: '/api/optimize',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + TOKEN,
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': body.length
  }
};

console.log('='.repeat(60));
console.log('TEST:', testName);
console.log('Datei:', fileName);
console.log('='.repeat(60));
console.log('Analysiere... (kann 30-60s dauern)\n');

const startTime = Date.now();

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    try {
      const result = JSON.parse(data);

      if (!result.success) {
        console.log('API Fehler:', result.message);
        return;
      }

      console.log('ERGEBNISSE (' + duration + 's):');
      console.log('   Score:', result.score?.health || 'N/A', '/100');
      console.log('   Optimierungen:', result.summary?.totalIssues || 0);
      console.log('   Erkannt als:', result.meta?.recognizedAs || result.meta?.type || 'N/A');
      console.log('   Reife:', result.meta?.maturity || 'N/A');
      console.log('   isAmendment:', result.meta?._debug?.documentScope?.isAmendment || false);

      // Issues by Origin
      const debug = result.meta?._debug;
      if (debug?.issuesByOrigin) {
        console.log('\n   Issues by Origin:');
        console.log('     AI:', debug.issuesByOrigin.ai);
        console.log('     Rule:', debug.issuesByOrigin.rule);
        console.log('     TopUp:', debug.issuesByOrigin.topup);
      }

      // Issues by Necessity
      if (debug?.issuesByNecessity) {
        console.log('\n   Issues by Necessity:');
        console.log('     Mandatory:', debug.issuesByNecessity.mandatory);
        console.log('     Risk-based:', debug.issuesByNecessity.risk_based);
        console.log('     Best-Practice (Hinweise):', debug.issuesByNecessity.best_practice);
      }

      // Kategorien
      if (result.categories?.length > 0) {
        console.log('\n   Kategorien:');
        result.categories.forEach(cat => {
          console.log('     ' + cat.tag + ': ' + cat.issues.length + ' Issues');
        });
      }

      // Top Issues
      const allIssues = result.categories?.flatMap(c => c.issues) || [];
      if (allIssues.length > 0) {
        console.log('\n   Top 5 Issues:');
        allIssues.slice(0, 5).forEach((issue, i) => {
          const hint = issue.classification?.necessity === 'best_practice' ? ' [HINWEIS]' : '';
          const prio = '[' + (issue.priority || 'N/A') + ']';
          console.log('     ' + (i+1) + '. ' + prio + hint + ' ' + (issue.summary || issue.id || 'N/A').slice(0, 55));
        });
      }

      // Assessment
      if (result.assessment) {
        console.log('\n   Assessment:', result.assessment.optimizationNeeded ? 'Optimierung empfohlen' : 'Keine Optimierung noetig');
        if (result.assessment.reasoning) {
          console.log('   Begruendung:', result.assessment.reasoning.slice(0, 100) + '...');
        }
      }

      console.log('\n' + '='.repeat(60));

    } catch(e) {
      console.log('Parse Error:', e.message);
      console.log('Status:', res.statusCode);
      console.log('Raw (first 500):', data.slice(0, 500));
    }
  });
});

req.on('error', e => console.log('Request Error:', e.message));
req.write(body);
req.end();
