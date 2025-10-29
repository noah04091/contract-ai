# 🧪 Kalender-Tests für Contract AI

Diese Tests sichern den Kalender-View gegen Regressions ab und garantieren korrekte EU-Norm-Konformität (ISO 8601).

## 📁 Test-Struktur

```
frontend/
├── src/__tests__/
│   └── calendar-math.test.ts    # Jest/Vitest Unit-Tests (Monatslogik)
└── tests/
    └── calendar.spec.ts          # Playwright E2E-Tests (Frontend)
```

## 🎯 Was wird getestet?

### Unit-Tests (`calendar-math.test.ts`)
- ✅ Monatslängen (28/29/30/31 Tage)
- ✅ Schaltjahre (2024=ja, 2025=nein, 1900=nein, 2000=ja)
- ✅ ISO-Wochenschema (Montag=1, Sonntag=7)
- ✅ Vollständigkeit aller Monatstage

### E2E-Tests (`calendar.spec.ts`)
- ✅ Wochentag-Header: Mo, Di, Mi, Do, Fr, Sa, So (ISO 8601)
- ✅ Flexible Tile-Anzahl: 35 oder 42 (je nach Monat)
- ✅ Nachbar-Monate mit `neighboringMonth`-Klasse
- ✅ Keine Extra-Woche mit nur Folgemonats-Tagen
- ✅ Outlook-Style: Nachbar-Zahlen gedimmt (opacity < 1.0)
- ✅ Heute-Markierung vorhanden
- ✅ 7 Spalten-Grid (Sonntag nicht versteckt)
- ✅ Responsiv: Wochentage brechen nicht um (iPhone SE)

## 🚀 Setup & Ausführung

### Unit-Tests (Vitest)

1. **Vitest installieren:**
   ```bash
   cd frontend
   npm install -D vitest @vitest/ui
   ```

2. **Vitest-Config hinzufügen** (in `vite.config.ts`):
   ```typescript
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';

   export default defineConfig({
     plugins: [react()],
     test: {
       globals: true,
       environment: 'jsdom',
       setupFiles: './src/__tests__/setup.ts', // optional
     },
   });
   ```

3. **Tests ausführen:**
   ```bash
   npm run test              # Unit-Tests ausführen
   npm run test:ui           # Mit UI (empfohlen)
   ```

### E2E-Tests (Playwright)

1. **Playwright installieren:**
   ```bash
   cd frontend
   npm install -D @playwright/test
   npx playwright install     # Browser-Treiber installieren
   ```

2. **Playwright-Config** (in `playwright.config.ts`):
   ```typescript
   import { defineConfig } from '@playwright/test';

   export default defineConfig({
     testDir: './tests',
     use: {
       baseURL: 'http://localhost:5173',
       screenshot: 'only-on-failure',
     },
     webServer: {
       command: 'npm run dev',
       port: 5173,
     },
   });
   ```

3. **Tests ausführen:**
   ```bash
   npx playwright test                    # Alle E2E-Tests
   npx playwright test --headed           # Mit sichtbarem Browser
   npx playwright test --ui               # Mit UI (empfohlen)
   npx playwright test calendar.spec.ts   # Nur Kalender-Tests
   ```

## 📊 CI/CD Integration

### GitHub Actions Beispiel

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: cd frontend && npm ci

      - name: Run Unit-Tests
        run: cd frontend && npm run test

      - name: Install Playwright
        run: cd frontend && npx playwright install --with-deps

      - name: Run E2E-Tests
        run: cd frontend && npx playwright test
```

## 🐛 Troubleshooting

### Tests schlagen fehl nach react-calendar Update
→ Prüfe, ob sich Klassennamen oder Struktur geändert haben:
```bash
npx playwright test --headed --debug
```

### Monatstage sind falsch
→ Prüfe Browser-Kalender und Timezone:
```typescript
// Optional: Timezone explizit setzen
process.env.TZ = 'Europe/Berlin';
```

### Nachbar-Tage nicht sichtbar
→ Prüfe CSS-Overrides in `AppleCalendar.css`:
```css
.calendar-premium .react-calendar__month-view__days__day--neighboringMonth abbr {
  opacity: 0.55 !important;
}
```

## 📚 Weitere Informationen

- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [ISO 8601 Standard](https://en.wikipedia.org/wiki/ISO_8601)

## 🎯 Ziel dieser Tests

Diese Tests garantieren, dass der Kalender auch nach:
- ✅ Updates von `react-calendar`
- ✅ CSS-Änderungen
- ✅ Browser-Updates
- ✅ Code-Refactorings

...immer korrekt funktioniert und die EU-Norm (ISO 8601) einhält.

**Enterprise-Niveau: "Unkaputtbar" 🚀**
