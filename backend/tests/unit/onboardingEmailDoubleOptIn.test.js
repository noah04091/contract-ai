// tests/unit/onboardingEmailDoubleOptIn.test.js
// Beweis-Tests für Registrierungs-Strecke Stufe 1a (18.08.2026):
// 1) Onboarding-Mail-Cron mailt NUR verifizierte User (Double-Opt-In, § 7 UWG).
// 2) sendWelcomeEmailNow sendet die Welcome-Mail nie doppelt.

jest.mock("../../services/mailer", () => jest.fn().mockResolvedValue(true));

const fs = require("fs");
const path = require("path");
const sendEmail = require("../../services/mailer");
const {
  processOnboardingEmails,
  sendWelcomeEmailNow,
} = require("../../services/onboardingEmailService");

afterEach(() => {
  jest.clearAllMocks();
});

describe("Cron-Query: nur verifizierte User (Double-Opt-In)", () => {
  test("processOnboardingEmails fragt users mit verified: true ab", async () => {
    let capturedQuery = null;
    const db = {
      collection: (name) => {
        expect(name).toBe("users");
        return {
          find: (query) => {
            capturedQuery = query;
            return { toArray: async () => [] };
          },
        };
      },
    };

    const sent = await processOnboardingEmails(db);

    expect(sent).toBe(0);
    expect(capturedQuery).not.toBeNull();
    expect(capturedQuery.verified).toBe(true);
    // Bestehende Schutz-Filter bleiben erhalten
    expect(capturedQuery.emailNotifications).toEqual({ $ne: false });
    expect(capturedQuery.emailOptOut).toEqual({ $ne: true });
    expect(capturedQuery["emailPreferences.marketing"]).toEqual({ $ne: false });
    expect(capturedQuery["onboarding.emailSequence.unsubscribed"]).toEqual({ $ne: true });
  });

  test("Statische Zusicherung: verified-Filter steht im Quelltext der Cron-Query", () => {
    // Regressions-Schutz: Wer den Filter entfernt, macht diese Suite rot.
    const src = fs.readFileSync(
      path.join(__dirname, "..", "..", "services", "onboardingEmailService.js"),
      "utf8"
    );
    const queryBlock = src.match(/const users = await usersCollection\.find\(\{[\s\S]*?\}\)\.toArray\(\)/);
    expect(queryBlock).not.toBeNull();
    expect(queryBlock[0]).toContain("verified: true");
  });
});

describe("sendWelcomeEmailNow: kein Doppel-Versand", () => {
  const makeDb = () => {
    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    return { db: { collection: () => ({ updateOne }) }, updateOne };
  };

  const baseUser = {
    _id: "u1",
    email: "test@example.com",
    firstName: "Max",
    subscriptionPlan: "free",
  };

  test("Welcome-Flag vorhanden → KEIN Versand, kein DB-Write, trotzdem success", async () => {
    const { db, updateOne } = makeDb();
    const user = {
      ...baseUser,
      onboarding: { emailSequence: { welcome: new Date("2026-08-17T08:30:00Z") } },
    };

    const result = await sendWelcomeEmailNow(user, db);

    expect(result).toBe(true);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(updateOne).not.toHaveBeenCalled();
  });

  test("Kein Welcome-Flag → Versand + Flag wird gesetzt", async () => {
    const { db, updateOne } = makeDb();
    const user = { ...baseUser, onboarding: { emailSequence: {} } };

    const result = await sendWelcomeEmailNow(user, db);

    expect(result).toBe(true);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0]).toBe("test@example.com");
    expect(updateOne).toHaveBeenCalledTimes(1);
    expect(updateOne.mock.calls[0][1].$set["onboarding.emailSequence.welcome"]).toBeInstanceOf(Date);
  });

  test("User ganz ohne onboarding-Feld (Alt-Bestand) → Versand läuft normal", async () => {
    const { db } = makeDb();

    const result = await sendWelcomeEmailNow({ ...baseUser }, db);

    expect(result).toBe(true);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
