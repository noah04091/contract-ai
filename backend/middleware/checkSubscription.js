// 📁 backend/middleware/checkSubscription.js
// ✅ REFACTORED: Nutzt zentrale Plan-Konstanten für konsistente Berechtigungsprüfung

const { ObjectId } = require("mongodb");
const { isBusinessOrHigher, PLANS } = require("../constants/subscriptionPlans");
const OrganizationMember = require("../models/OrganizationMember");
const Organization = require("../models/Organization");

// Diese Funktion wird vom Server mit gegebenem DB-Handle aufgerufen
module.exports = function createCheckSubscription(usersCollection) {
  return async function checkSubscription(req, res, next) {
    // ✅ SKIP Subscription-Check für E-Mail-Import (nutzt API-Key stattdessen)
    // 🔒 23.08.2026 SICHERHEIT: siehe verifyToken.js — Pfad exakt prüfen statt `.includes()`
    // über die ganze URL (sonst umgeht `?x=/api/contracts/email-import` die Prüfung).
    const emailImportPfad = String(req.originalUrl || '').split('?')[0].split('#')[0];
    if (emailImportPfad === '/api/contracts/email-import' || emailImportPfad === '/api/contracts/email-import/') {
      console.log('⏩ E-Mail-Import Route: Subscription-Check übersprungen (nutzt API-Key)');
      return next();
    }

    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "❌ Nicht autorisiert" });
    }

    try {
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

      if (!user) {
        return res.status(404).json({ message: "❌ Benutzer nicht gefunden" });
      }

      let plan = (user.subscriptionPlan || "free").toLowerCase();

      // 🔐 Admin-Safeguard: Admins haben immer vollen Zugriff
      if (user.role === 'admin' && (!user.subscriptionPlan || user.subscriptionPlan === 'free')) {
        plan = 'enterprise';
      }

      // 👥 Org-Plan-Vererbung: Free-User in einer Org erben den Org-Plan
      if (plan === PLANS.FREE) {
        try {
          const membership = await OrganizationMember.findOne({
            userId: new ObjectId(userId),
            isActive: true
          });
          if (membership) {
            const org = await Organization.findById(membership.organizationId);
            if (org && org.subscriptionPlan && org.subscriptionPlan !== PLANS.FREE) {
              console.log(`👥 Org-Plan-Vererbung: User free → Org ${org.subscriptionPlan}`);
              plan = org.subscriptionPlan.toLowerCase();
            }
          }
        } catch (orgErr) {
          console.warn('⚠️ Org-Plan lookup failed (non-critical):', orgErr.message);
        }
      }

      // ✅ Routes die ein Business-Abo oder höher erfordern
      //
      // ⚠️ '/api/chat' stand hier bis zum 23.08.2026 und war die eigentliche Sperre
      // für den Free-Chat: Sie liegt VOR allen Chat-Routen (server.js: app.use
      // "/api/chat", verifyToken, checkSubscription, chatRoutes) und blockte Free
      // mit 403 PREMIUM_REQUIRED — auch das blosse Anlegen eines leeren Chats.
      // Deshalb war das Eingabefeld tot: Chat.tsx legt beim ersten Besuch per
      // POST /new einen Chat an, bekam 403, loggte nur in die Konsole, und ohne
      // aktiven Chat ist die Eingabe deaktiviert.
      //
      // Entfernt, weil Welle 2 (08.07.2026) den Chat quota-basiert geöffnet hat:
      // Free hat 5 Nachrichten/Monat. Das Kostenlimit erzwingt die Chat-Route
      // selbst und zwar atomar (consumeChatQuota in POST /:id/message, plus
      // Vorab-Prüfung in /new-with-contract und /:id/upload). Diese pauschale
      // Plan-Sperre war der Grund, warum die 5 Fragen nie einlösbar waren.
      const premiumRequiredRoutes = [
        '/api/optimize',           // KI-Optimierung
        '/api/contracts/generate', // Vertrag generieren
        '/api/compare',            // Vertragsvergleich
        '/api/envelopes',          // Digitale Signaturen
        '/api/legal-lens',         // LegalLens Analyse
        '/api/legalpulse',         // Legal Pulse
        '/api/better-contracts'    // Alternative Verträge
      ];

      const isPremiumRoute = premiumRequiredRoutes.some(route =>
        req.originalUrl.toLowerCase().startsWith(route.toLowerCase())
      );

      console.log(`🔍 CheckSubscription: User=${plan}, Route=${req.originalUrl}, IsPremiumRoute=${isPremiumRoute}`);

      // ✅ Speichere Plan-Info für spätere Middleware/Routes
      req.user.plan = plan;
      req.user.subscriptionActive = user.subscriptionActive;

      // ✅ FREE-USER: Basis-Features erlauben, Premium-Features blockieren
      if (plan === PLANS.FREE) {
        if (isPremiumRoute) {
          console.log(`❌ Free-User blockiert für Premium-Route: ${req.originalUrl}`);
          return res.status(403).json({
            success: false,
            message: "⛔ Diese Funktion erfordert ein Business-Abo oder höher.",
            requiresUpgrade: true,
            error: "PREMIUM_REQUIRED",
            upgradeUrl: "/pricing",
            userPlan: plan
          });
        }

        console.log(`✅ Free-User Zugriff erlaubt auf Basis-Feature: ${req.originalUrl}`);
        return next();
      }

      // ✅ BUSINESS, ENTERPRISE, LEGENDARY: Premium-Features erlaubt
      if (isBusinessOrHigher(plan)) {
        console.log(`✅ ${plan.toUpperCase()}-User Zugriff erlaubt auf: ${req.originalUrl}`);
        return next();
      }

      // ✅ FALLBACK: Unbekannter Plan - behandle wie Free
      if (isPremiumRoute) {
        console.log(`❌ Unbekannter Plan (${plan}) blockiert für Premium-Route: ${req.originalUrl}`);
        return res.status(403).json({
          success: false,
          message: "⛔ Diese Funktion erfordert ein Business-Abo oder höher.",
          requiresUpgrade: true,
          error: "PREMIUM_REQUIRED",
          upgradeUrl: "/pricing",
          userPlan: plan
        });
      }

      console.log(`✅ Fallback: Zugriff erlaubt für Plan (${plan}) auf: ${req.originalUrl}`);
      next();

    } catch (err) {
      console.error("❌ Fehler in checkSubscription:", err);

      // Bei Fehlern: Premium-Routes blockieren, Basis-Features erlauben
      // '/api/chat' bewusst NICHT gelistet, siehe Begründung oben. Sonst wäre der
      // Free-Chat bei jedem Datenbankfehler wieder gesperrt.
      const premiumRequiredRoutes = ['/api/optimize', '/api/contracts/generate', '/api/compare', '/api/envelopes', '/api/legal-lens', '/api/legalpulse'];
      const isPremiumRoute = premiumRequiredRoutes.some(route => req.originalUrl.toLowerCase().startsWith(route.toLowerCase()));

      if (isPremiumRoute) {
        return res.status(500).json({ message: "Serverfehler bei Abo-Überprüfung" });
      }

      console.log(`⚠️ Fehler in checkSubscription, aber Basis-Feature erlaubt: ${req.originalUrl}`);
      next();
    }
  };
};