/**
 * Tests für die Unsubscribe-Token-Härtung (18.08.2026).
 *
 * Hintergrund: validateUnsubscribeToken prüfte die HMAC-Signatur NIE — ein
 * selbstgebauter Payload mit beliebiger "Signatur" konnte jede bekannte
 * E-Mail-Adresse von allen Mails abmelden (inkl. bezahlter Fristen-Erinnerungen).
 */

const crypto = require("crypto");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-fuer-unsubscribe";
delete process.env.UNSUBSCRIBE_SECRET; // Tests laufen deterministisch über JWT_SECRET

const {
  generateUnsubscribeToken,
  validateUnsubscribeToken,
} = require("../../services/emailUnsubscribeService");

const SECRET = process.env.JWT_SECRET;

// Baut einen Token wie die Generierung, aber mit frei wählbaren Werten.
function buildToken({ e, c, t, signOverT = t, secret = SECRET }) {
  const payload = Buffer.from(JSON.stringify({ e, c, t })).toString("base64url");
  const hash = crypto.createHmac("sha256", secret).update(`${e}:${c}:${signOverT}`).digest("hex").substring(0, 16);
  return `${payload}.${hash}`;
}

describe("Unsubscribe-Token: Rundlauf", () => {
  test("frisch generierter Token validiert mit E-Mail und Kategorie", () => {
    const token = generateUnsubscribeToken("Kunde@Example.de", "all");
    const v = validateUnsubscribeToken(token);
    expect(v).not.toBeNull();
    expect(v.email).toBe("kunde@example.de");
    expect(v.category).toBe("all");
  });
});

describe("Unsubscribe-Token: Fälschungen werden abgelehnt", () => {
  test("gefälschter Token (Payload + ausgedachte Signatur) ist ungültig", () => {
    const payload = Buffer.from(JSON.stringify({ e: "opfer@example.de", c: "all", t: Date.now() })).toString("base64url");
    expect(validateUnsubscribeToken(`${payload}.deadbeefdeadbeef`)).toBeNull();
  });

  test("manipulierter Payload (andere E-Mail, echte Signatur) ist ungültig", () => {
    const t = Date.now();
    const echt = buildToken({ e: "kunde@example.de", c: "all", t });
    const signatur = echt.split(".")[1];
    const fremd = Buffer.from(JSON.stringify({ e: "opfer@example.de", c: "all", t })).toString("base64url");
    expect(validateUnsubscribeToken(`${fremd}.${signatur}`)).toBeNull();
  });

  test("Token ohne Signatur-Teil ist ungültig", () => {
    const payload = Buffer.from(JSON.stringify({ e: "opfer@example.de", c: "all", t: Date.now() })).toString("base64url");
    expect(validateUnsubscribeToken(payload)).toBeNull();
  });

  test("mit falschem Secret signierter Token ist ungültig", () => {
    const t = Date.now();
    const token = buildToken({ e: "kunde@example.de", c: "all", t, secret: "anderes-secret" });
    expect(validateUnsubscribeToken(token)).toBeNull();
  });

  test("Payload mit falschen Typen ist ungültig", () => {
    const payload = Buffer.from(JSON.stringify({ e: 42, c: "all", t: "gestern" })).toString("base64url");
    expect(validateUnsubscribeToken(`${payload}.deadbeefdeadbeef`)).toBeNull();
  });
});

describe("Unsubscribe-Token: Abwärtskompatibilität und Ablauf", () => {
  test("Alt-Token mit 1ms Zeitstempel-Drift (Signatur über t-1) bleibt gültig", () => {
    const t = Date.now();
    const token = buildToken({ e: "kunde@example.de", c: "calendar", t, signOverT: t - 1 });
    const v = validateUnsubscribeToken(token);
    expect(v).not.toBeNull();
    expect(v.category).toBe("calendar");
  });

  test("Drift von 2ms wird NICHT akzeptiert (nur die dokumentierte Toleranz)", () => {
    const t = Date.now();
    expect(validateUnsubscribeToken(buildToken({ e: "kunde@example.de", c: "all", t, signOverT: t - 2 }))).toBeNull();
  });

  test("korrekt signierter, aber über 30 Tage alter Token ist abgelaufen", () => {
    const t = Date.now() - 31 * 24 * 60 * 60 * 1000;
    expect(validateUnsubscribeToken(buildToken({ e: "kunde@example.de", c: "all", t }))).toBeNull();
  });
});
