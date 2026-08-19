// tests/unit/verificationEmailService.test.js
// Beweis-Tests für Befund 6 der Registrierungs-Strecke (19.08.2026):
// 1) Versand-Service (aus emailVerification.js extrahiert) verhält sich exakt
//    wie die alte Route: Cooldown-Idempotenz, already_verified, Token-Ablage.
// 2) Bei Versand-Fehler wird der Cooldown zurückgenommen (sonst liefe der
//    Frontend-Fallback der Registrierung in "already_sent_recently" ohne Mail).
// 3) Verdrahtung: /auth/register stößt den Server-Versand an, die
//    email-verification-Routen sind gedrosselt, /status/:email ist entfernt.

jest.mock("../../utils/sendEmailHtml", () => jest.fn().mockResolvedValue(true));

const fs = require("fs");
const path = require("path");
const sendEmailHtml = require("../../utils/sendEmailHtml");
const { sendVerificationMail, COOLDOWN_MS } = require("../../services/verificationEmailService");

afterEach(() => {
  jest.clearAllMocks();
});

function makeDb(user) {
  const findOne = jest.fn().mockResolvedValue(user);
  const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
  return { db: { collection: () => ({ findOne, updateOne }) }, findOne, updateOne };
}

describe("sendVerificationMail: Status-Semantik wie die alte Route", () => {
  test("ohne E-Mail → missing_email, kein DB-Zugriff, kein Versand", async () => {
    const { db, findOne } = makeDb(null);
    const result = await sendVerificationMail(db, undefined);
    expect(result.status).toBe("missing_email");
    expect(findOne).not.toHaveBeenCalled();
    expect(sendEmailHtml).not.toHaveBeenCalled();
  });

  test("unbekannte Adresse → not_found, kein Versand", async () => {
    const { db } = makeDb(null);
    const result = await sendVerificationMail(db, "nobody@example.com");
    expect(result.status).toBe("not_found");
    expect(sendEmailHtml).not.toHaveBeenCalled();
  });

  test("bereits verifiziert → already_verified, kein Versand", async () => {
    const { db } = makeDb({ email: "a@example.com", verified: true });
    const result = await sendVerificationMail(db, "a@example.com");
    expect(result.status).toBe("already_verified");
    expect(sendEmailHtml).not.toHaveBeenCalled();
  });

  test("Cooldown aktiv → already_sent_recently mit retryAfter, kein Versand, kein Token-Write", async () => {
    const { db, updateOne } = makeDb({
      email: "a@example.com",
      verified: false,
      lastVerificationSentAt: new Date(Date.now() - 10_000), // vor 10s
    });
    const result = await sendVerificationMail(db, "a@example.com");
    expect(result.status).toBe("already_sent_recently");
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(COOLDOWN_MS / 1000);
    expect(sendEmailHtml).not.toHaveBeenCalled();
    expect(updateOne).not.toHaveBeenCalled();
  });

  test("frischer Versand → queued: Token+Cooldown gespeichert, Link trägt token UND email", async () => {
    const { db, updateOne } = makeDb({ email: "a@example.com", verified: false });
    const result = await sendVerificationMail(db, "A@Example.com"); // wird normalisiert

    expect(result.status).toBe("queued");
    expect(result.email).toBe("a@example.com");
    expect(updateOne).toHaveBeenCalledTimes(1);
    const setFields = updateOne.mock.calls[0][1].$set;
    expect(setFields.verificationToken).toMatch(/^[0-9a-f]{64}$/);
    expect(setFields.verificationTokenExpiry).toBeInstanceOf(Date);
    expect(setFields.lastVerificationSentAt).toBeInstanceOf(Date);

    expect(sendEmailHtml).toHaveBeenCalledTimes(1);
    const [to, subject, html] = sendEmailHtml.mock.calls[0];
    expect(to).toBe("a@example.com");
    expect(subject).toContain("E-Mail-Adresse bestätigen");
    expect(html).toContain(`token=${setFields.verificationToken}`);
    expect(html).toContain("email=a%40example.com"); // Selbstheilungs-Parameter für den Fehlerpfad
  });

  test("Versand-Fehler → error UND Cooldown wird zurückgenommen ($unset lastVerificationSentAt)", async () => {
    sendEmailHtml.mockRejectedValueOnce(new Error("SMTP down"));
    const { db, updateOne } = makeDb({ email: "a@example.com", verified: false });

    const result = await sendVerificationMail(db, "a@example.com");

    expect(result.status).toBe("error");
    expect(updateOne).toHaveBeenCalledTimes(2);
    expect(updateOne.mock.calls[1][1].$unset).toEqual({ lastVerificationSentAt: "" });
  });
});

describe("Verdrahtung (statische Zusicherungen)", () => {
  const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");

  test("POST /auth/register stößt den Server-Versand an (Frontend-Fallback bleibt idempotent)", () => {
    const src = read("routes/auth.js");
    expect(src).toContain("verificationEmailService");
    expect(src).toContain("sendVerificationMail(dbInstance, email)");
  });

  test("email-verification-Routen sind gedrosselt (authLimiter auf send-verification UND verify)", () => {
    const src = read("routes/emailVerification.js");
    expect(src).toMatch(/router\.post\("\/send-verification",\s*authLimiter/);
    expect(src).toMatch(/router\.get\("\/verify",\s*authLimiter/);
  });

  test("Adress-Enumeration geschlossen: GET /status/:email existiert nicht mehr", () => {
    const src = read("routes/emailVerification.js");
    expect(src).not.toMatch(/router\.get\("\/status/);
  });
});
