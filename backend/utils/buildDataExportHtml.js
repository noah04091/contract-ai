// 📄 Lesbare Fassung des DSGVO-Datenexports (20.08.2026)
//
// Der Export lieferte bisher ausschließlich eine .json-Datei. Rechtlich ist das
// korrekt (Art. 20 DSGVO verlangt ein "strukturiertes, gängiges, maschinenlesbares
// Format"), für einen normalen Menschen aber unbrauchbar: Er lädt eine Quelldatei
// herunter, die sein Rechner nicht sinnvoll öffnet.
//
// Diese Datei baut daraus eine HTML-Seite, die sich per Doppelklick im Browser
// öffnet, ordentlich aussieht und über die Druckfunktion als PDF speicherbar ist.
// Die JSON-Fassung bleibt daneben erhalten (?format=json).
//
// ⚠️ Alles, was aus der Datenbank kommt, ist NUTZEREINGABE (Vertragsnamen stammen
// aus hochgeladenen Dateien). Jeder eingesetzte Wert läuft deshalb durch esc().

function esc(wert) {
  if (wert === null || wert === undefined) return '';
  return String(wert)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function datum(wert) {
  if (!wert) return '—';
  const d = new Date(wert);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function datumZeit(wert) {
  if (!wert) return '—';
  const d = new Date(wert);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function betrag(wert) {
  if (wert === null || wert === undefined || wert === '') return '—';
  const n = Number(wert);
  if (Number.isNaN(n)) return esc(wert);
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function jaNein(wert) {
  if (wert === true) return 'Ja';
  if (wert === false) return 'Nein';
  return '—';
}

const PLAN_LABELS = { free: 'Starter (kostenlos)', business: 'Business', enterprise: 'Enterprise', premium: 'Enterprise' };

function zeile(bezeichnung, wert) {
  return `<tr><th scope="row">${esc(bezeichnung)}</th><td>${wert === '' || wert === null || wert === undefined ? '—' : esc(wert)}</td></tr>`;
}

function buildDataExportHtml(daten) {
  const u = daten.user || {};
  const firma = daten.companyProfile;
  const vertraege = daten.contracts || [];
  const termine = daten.calendarEvents || [];
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || '';

  const vertragsZeilen = vertraege.length ? vertraege.map(c => `
      <tr>
        <td>${esc(c.contractName || 'Ohne Namen')}</td>
        <td>${esc(c.contractType || '—')}</td>
        <td>${esc(c.partnerName || '—')}</td>
        <td>${datum(c.startDate)}</td>
        <td>${datum(c.expiryDate)}</td>
        <td class="num">${betrag(c.value)}</td>
        <td>${esc(c.status || '—')}</td>
        <td class="num">${c.analysisScore ? esc(c.analysisScore) : '—'}</td>
        <td>${jaNein(c.hasFile)}</td>
      </tr>`).join('') : `<tr><td colspan="9" class="leer">Keine Verträge gespeichert.</td></tr>`;

  const terminZeilen = termine.length ? termine.map(e => `
      <tr>
        <td>${datum(e.date)}</td>
        <td>${esc(e.title || '—')}</td>
        <td>${esc(e.type || '—')}</td>
        <td>${esc(e.description || '—')}</td>
      </tr>`).join('') : `<tr><td colspan="4" class="leer">Keine Termine oder Erinnerungen gespeichert.</td></tr>`;

  const firmenBlock = firma ? `
    <h2>Firmenprofil</h2>
    <table class="paare">
      ${zeile('Firma', firma.companyName)}
      ${zeile('Rechtsform', firma.legalForm)}
      ${zeile('Straße', firma.street)}
      ${zeile('PLZ und Ort', [firma.postalCode, firma.city].filter(Boolean).join(' '))}
      ${zeile('Land', firma.country)}
      ${zeile('USt-ID', firma.vatId)}
      ${zeile('Kontakt E-Mail', firma.contactEmail)}
      ${zeile('Kontakt Telefon', firma.contactPhone)}
    </table>` : '';

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Deine Daten bei Contract AI</title>
<style>
  :root { --ink:#0f172a; --ink2:#334155; --muted:#64748b; --line:#e2e8f0; --soft:#f8fafc; --akzent:#2563eb; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 32px 20px 64px; background: #ffffff; color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 15px; line-height: 1.6;
  }
  .blatt { max-width: 900px; margin: 0 auto; }
  header { border-bottom: 3px solid var(--ink); padding-bottom: 18px; margin-bottom: 30px; }
  .marke { font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--akzent); }
  h1 { font-size: 28px; letter-spacing: -.02em; margin: 8px 0 6px; }
  .unterzeile { color: var(--muted); font-size: 14px; margin: 0; }
  h2 {
    font-size: 18px; letter-spacing: -.01em; margin: 34px 0 12px;
    padding-bottom: 7px; border-bottom: 1px solid var(--line);
  }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  .paare th { text-align: left; font-weight: 600; color: var(--muted); width: 210px; padding: 8px 12px 8px 0; vertical-align: top; font-size: 13.5px; }
  .paare td { padding: 8px 0; border-bottom: 1px solid var(--line); }
  .paare tr:last-child td { border-bottom: none; }
  .liste { margin-top: 4px; }
  .liste th {
    text-align: left; font-size: 11.5px; font-weight: 700; letter-spacing: .06em;
    text-transform: uppercase; color: var(--muted); padding: 9px 10px; border-bottom: 2px solid var(--line);
    white-space: nowrap;
  }
  .liste td { padding: 9px 10px; border-bottom: 1px solid var(--line); color: var(--ink2); vertical-align: top; }
  .liste tr:nth-child(even) td { background: var(--soft); }
  .liste .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .leer { color: var(--muted); font-style: italic; text-align: center; padding: 20px; }
  .rollbar { overflow-x: auto; }
  .zaehler { color: var(--muted); font-weight: 400; font-size: 14px; }
  footer { margin-top: 44px; padding-top: 18px; border-top: 1px solid var(--line); color: var(--muted); font-size: 13px; }
  footer p { margin: 0 0 8px; }
  @media print {
    body { padding: 0; font-size: 11pt; }
    .liste tr { page-break-inside: avoid; }
    h2 { page-break-after: avoid; }
  }
</style>
</head>
<body>
<div class="blatt">

  <header>
    <div class="marke">Contract AI</div>
    <h1>Deine Daten bei Contract AI</h1>
    <p class="unterzeile">Erstellt am ${datumZeit(daten.exportedAt)} für ${esc(daten.exportedFor)}</p>
  </header>

  <h2>Dein Konto</h2>
  <table class="paare">
    ${zeile('Name', name)}
    ${zeile('E-Mail', u.email)}
    ${zeile('Konto angelegt am', datum(u.createdAt))}
    ${zeile('E-Mail bestätigt', jaNein(u.verified))}
    ${zeile('Tarif', PLAN_LABELS[u.subscriptionPlan] || u.subscriptionPlan || 'Starter (kostenlos)')}
    ${zeile('Status des Tarifs', u.subscriptionStatus)}
    ${zeile('Durchgeführte Analysen', u.analysisCount ?? 0)}
    ${zeile('Durchgeführte Optimierungen', u.optimizationCount ?? 0)}
    ${zeile('E-Mail-Benachrichtigungen', u.emailNotifications === false ? 'Aus' : 'An')}
    ${zeile('Vertragserinnerungen', u.contractReminders === false ? 'Aus' : 'An')}
  </table>

  ${firmenBlock}

  <h2>Deine Verträge <span class="zaehler">(${vertraege.length})</span></h2>
  <div class="rollbar">
    <table class="liste">
      <thead>
        <tr>
          <th>Name</th><th>Art</th><th>Vertragspartner</th><th>Beginn</th>
          <th>Ablauf</th><th class="num">Wert</th><th>Status</th><th class="num">Bewertung</th><th>Datei</th>
        </tr>
      </thead>
      <tbody>${vertragsZeilen}</tbody>
    </table>
  </div>

  <h2>Termine und Erinnerungen <span class="zaehler">(${termine.length})</span></h2>
  <div class="rollbar">
    <table class="liste">
      <thead>
        <tr><th>Datum</th><th>Titel</th><th>Art</th><th>Beschreibung</th></tr>
      </thead>
      <tbody>${terminZeilen}</tbody>
    </table>
  </div>

  <footer>
    <p>Diese Übersicht enthält alle personenbezogenen Daten, die zu deinem Konto gespeichert sind. Die hochgeladenen Vertragsdateien selbst sind nicht enthalten, du findest sie in deinem Konto unter „Verträge“.</p>
    <p>Du kannst diese Seite über die Druckfunktion deines Browsers als PDF speichern.</p>
    <p>Brauchst du die Daten in maschinenlesbarer Form, etwa zur Mitnahme zu einem anderen Anbieter, lade sie im Profil zusätzlich als JSON-Datei herunter.</p>
    <p>Fragen dazu: datenschutz@contract-ai.de</p>
  </footer>

</div>
</body>
</html>`;
}

module.exports = { buildDataExportHtml };
