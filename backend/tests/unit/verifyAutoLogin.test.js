// tests/unit/verifyAutoLogin.test.js
// Beweis-Tests für Paket B der Registrierungs-Strecke (19.08.2026):
// Auto-Login nach E-Mail-Bestätigung (Magic-Link-Muster).
// Statische Zusicherungen auf routes/emailVerification.js — wer eine der
// Sicherheits-Eigenschaften entfernt, macht diese Suite rot.

const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "..", "..", "routes", "emailVerification.js"),
  "utf8"
);

describe("Auto-Login nach Verifikation: Sicherheits-Eigenschaften", () => {
  test("Verify-Erfolg stellt einen befristeten Einmal-Token aus (10 Minuten)", () => {
    expect(src).toContain("autoLoginToken");
    expect(src).toContain("autoLoginTokenExpiry");
    expect(src).toMatch(/10 \* 60 \* 1000/); // 10-Minuten-Frist
  });

  test("Token-Ausstellung ist gekapselt: Fehler bricht den Verify-Erfolg NICHT ab", () => {
    // Der try/catch um die Ausstellung muss existieren und der Redirect
    // funktioniert auch mit leerem welcomeParam (alter Weg als Fallback).
    expect(src).toMatch(/let welcomeParam = ""/);
    expect(src).toMatch(/catch \(tokenErr\)/);
  });

  test("complete-login ist gedrosselt (authLimiter)", () => {
    expect(src).toMatch(/router\.post\("\/complete-login",\s*authLimiter/);
  });

  test("Einlösen ist strikt einmalig und atomar (findOneAndUpdate + $unset)", () => {
    const routeBlock = src.slice(src.indexOf('"/complete-login"'));
    expect(routeBlock).toContain("findOneAndUpdate");
    expect(routeBlock).toContain('$unset: { autoLoginToken: "", autoLoginTokenExpiry: "" }');
  });

  test("Einlösen verlangt gültige Frist, verifiziertes und nicht gesperrtes Konto", () => {
    const routeBlock = src.slice(src.indexOf('"/complete-login"'));
    expect(routeBlock).toContain("autoLoginTokenExpiry: { $gt: new Date() }");
    expect(routeBlock).toContain("verified: true");
    expect(routeBlock).toContain("suspended: { $ne: true }");
  });

  test("Token-Format wird geprüft (64 Hex-Zeichen), sonst 401", () => {
    const routeBlock = src.slice(src.indexOf('"/complete-login"'));
    expect(routeBlock).toMatch(/\^\[0-9a-f\]\{64\}\$/);
    expect(routeBlock).toContain("status(401)");
  });

  test("Session identisch zum Login: 2h-JWT + httpOnly-Cookie 'token'", () => {
    const routeBlock = src.slice(src.indexOf('"/complete-login"'));
    expect(routeBlock).toContain('expiresIn: "2h"');
    expect(routeBlock).toMatch(/res\.cookie\("token", sessionToken/);
    expect(routeBlock).toContain("httpOnly: true");
  });
});
