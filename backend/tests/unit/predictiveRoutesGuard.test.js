/**
 * predictiveRoutesGuard.test.js — 02.09.2026 (Pulse-Masterplan Phase 1)
 *
 * Sichert die Absicherung von routes/predictiveAnalytics.js ab:
 *  1. POST /trigger-now ist Admin-only UND hinter LEGAL_PULSE_CRON_ENABLED —
 *     die Route verarbeitet sonst die Verträge ALLER Nutzer und löst
 *     V1-Direktmails ohne Abmelde-Link aus (umging den Stilllege-Schalter 06.07.).
 *  2. GET /forecast/:contractId liefert nur EIGENE Verträge (vorher IDOR:
 *     findOne per ID ohne userId — Muster aus dem Sicherheits-Durchgang 23./24.08.).
 *  3. GET /trigger-status ist Admin-only.
 */

// tfjs-node hat lokal kein natives Binding — für den Modul-Load stubben
jest.mock("@tensorflow/tfjs-node", () => ({}), { virtual: true });

// Auth-Middleware kontrollierbar machen
jest.mock("../../middleware/verifyToken", () => (req, res, next) => {
  req.user = { userId: req.headers["x-test-user"] || "aaaaaaaaaaaaaaaaaaaaaaaa" };
  next();
});
jest.mock("../../middleware/verifyAdmin", () => (req, res, next) => {
  if (req.headers["x-test-admin"] === "1") return next();
  return res.status(403).json({ success: false, message: "Admin-Zugriff erforderlich" });
});

// DB: nur die vom Forecast-Ownership-Check benutzte Stelle
const mockFindOne = jest.fn();
jest.mock("../../config/database", () => ({
  connect: jest.fn(async () => ({
    collection: jest.fn(() => ({ findOne: mockFindOne })),
  })),
}));

// Services: dürfen im Test nie echte Arbeit tun
const mockRunAutoTrigger = jest.fn(async () => ({ ok: true }));
const mockGenerateForecast = jest.fn(async () => ({ demo: true }));
jest.mock("../../services/autoTriggerService", () => ({
  getInstance: () => ({ runAutoTrigger: mockRunAutoTrigger, getStatus: () => ({}) }),
}));
jest.mock("../../services/predictiveAnalyticsService", () => ({
  getInstance: () => ({ generateForecast: mockGenerateForecast }),
}));

const express = require("express");
const request = require("supertest");

function makeApp() {
  const app = express();
  app.use("/api/predictive", require("../../routes/predictiveAnalytics"));
  return app;
}

const OWNER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const CONTRACT_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";

describe("predictiveAnalytics — Absicherung (Phase 1)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.LEGAL_PULSE_CRON_ENABLED;
  });

  test("trigger-now: Nicht-Admin bekommt 403, nichts läuft", async () => {
    const res = await request(makeApp()).post("/api/predictive/trigger-now");
    expect(res.status).toBe(403);
    expect(mockRunAutoTrigger).not.toHaveBeenCalled();
  });

  test("trigger-now: Admin, aber Altsystem still → 503, nichts läuft", async () => {
    const res = await request(makeApp())
      .post("/api/predictive/trigger-now")
      .set("x-test-admin", "1");
    expect(res.status).toBe(503);
    expect(mockRunAutoTrigger).not.toHaveBeenCalled();
  });

  test("trigger-now: Admin + Schalter an → läuft", async () => {
    process.env.LEGAL_PULSE_CRON_ENABLED = "true";
    const res = await request(makeApp())
      .post("/api/predictive/trigger-now")
      .set("x-test-admin", "1");
    expect(res.status).toBe(200);
    expect(mockRunAutoTrigger).toHaveBeenCalledTimes(1);
  });

  test("trigger-status: Nicht-Admin bekommt 403", async () => {
    const res = await request(makeApp()).get("/api/predictive/trigger-status");
    expect(res.status).toBe(403);
  });

  test("forecast: fremder Vertrag → 404, Service wird nie gerufen", async () => {
    mockFindOne.mockResolvedValueOnce({ userId: "cccccccccccccccccccccccc" });
    const res = await request(makeApp()).get(`/api/predictive/forecast/${CONTRACT_ID}`);
    expect(res.status).toBe(404);
    expect(mockGenerateForecast).not.toHaveBeenCalled();
  });

  test("forecast: nicht existenter Vertrag → 404", async () => {
    mockFindOne.mockResolvedValueOnce(null);
    const res = await request(makeApp()).get(`/api/predictive/forecast/${CONTRACT_ID}`);
    expect(res.status).toBe(404);
    expect(mockGenerateForecast).not.toHaveBeenCalled();
  });

  test("forecast: ungültige ID → 400 (kein CastError-500)", async () => {
    const res = await request(makeApp()).get("/api/predictive/forecast/kaputt");
    expect(res.status).toBe(400);
    expect(mockGenerateForecast).not.toHaveBeenCalled();
  });

  test("forecast: eigener Vertrag → 200 (String- wie ObjectId-userId)", async () => {
    mockFindOne.mockResolvedValueOnce({ userId: OWNER });
    const res = await request(makeApp()).get(`/api/predictive/forecast/${CONTRACT_ID}`);
    expect(res.status).toBe(200);
    expect(mockGenerateForecast).toHaveBeenCalledTimes(1);
  });
});
