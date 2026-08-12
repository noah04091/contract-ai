// 📁 backend/eslint.config.js
//
// WARUM ES DIESE DATEI GIBT (12.08.2026):
// Das Backend hatte KEINE statische Prüfung. Am 11.08. wäre dadurch ein Absturz im
// Zahlungs-Webhook live gegangen: `syncOrgPlan(db, …)` an einer Stelle, an der `db`
// gar nicht im Scope war. `node --check` findet so etwas NICHT (Syntax ist gültig),
// die Unit-Tests auch nicht (sie testen die Bausteine, nicht die Verdrahtung).
// Gefunden wurde er nur durch manuelles Nachlesen — beim nächsten Mal hätten wir
// vielleicht weniger Glück.
//
// Bewusst MINIMAL gehalten: nur `no-undef`. Keine Stil-Regeln, keine Formatierung,
// nichts, was 5000 Meldungen über gewachsenen Code ausschüttet. Genau eine Frage:
// "Benutzt dieser Code eine Variable, die es hier gar nicht gibt?"
//
// Aufruf:  npm run lint          (aus backend/)
//
// Der erste Lauf fand 16 Treffer: 7 Fehlalarme (Browser-Code in Puppeteer, siehe
// `globals` unten) und 9 echte. Zwei davon im Zahlungs-Webhook — sofort behoben.
// Die restlichen 7 stehen in Dateien, die zu diesem Zeitpunkt niemand bearbeitet
// hat; sie sind absichtlich NICHT stillgelegt, damit sie sichtbar bleiben:
//   routes/optimize.js          `parsed`      (Retry-Ergebnis landet ins Leere)
//   routes/optimizedContract.js `requestId`   (bricht die PDF-Erzeugung ab)
//   services/integrations/SAPService.js `credentials` (SAP-Mapping)

module.exports = [
  // Globale Ausnahmen — muss ein EIGENER Block ohne `files` sein, sonst gilt
  // `ignores` nur innerhalb des jeweiligen Blocks (Stolperstein der Flat-Config).
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'tests/**',        // Jest bringt eigene Globals mit
      'scripts/**',      // Wegwerf-Werkzeuge, oft bewusst unvollständig
      'migrations/**',
      'playbooks/**',
      'data/**',
    ],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        // Node
        require: 'readonly', module: 'writable', exports: 'writable',
        process: 'readonly', console: 'readonly', __dirname: 'readonly',
        __filename: 'readonly', Buffer: 'readonly', global: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly',
        setInterval: 'readonly', clearInterval: 'readonly',
        setImmediate: 'readonly', clearImmediate: 'readonly',
        URL: 'readonly', URLSearchParams: 'readonly',
        TextEncoder: 'readonly', TextDecoder: 'readonly',
        AbortController: 'readonly', AbortSignal: 'readonly',
        fetch: 'readonly', Response: 'readonly', Request: 'readonly',
        Headers: 'readonly', FormData: 'readonly', Blob: 'readonly',
        structuredClone: 'readonly', queueMicrotask: 'readonly',
        performance: 'readonly', crypto: 'readonly',

        // Browser-Globals: erlaubt, weil mehrere Routen Puppeteer nutzen und in
        // `page.evaluate(() => …)` echter Browser-Code steht. ESLint kann nicht
        // erkennen, dass dieser Callback woanders läuft — ohne diese Einträge
        // gäbe es 7 Fehlalarme allein in routes/generate.js.
        document: 'readonly', window: 'readonly', navigator: 'readonly',
        localStorage: 'readonly', getComputedStyle: 'readonly',
      },
    },
    rules: {
      'no-undef': 'error',
    },
  },
];
