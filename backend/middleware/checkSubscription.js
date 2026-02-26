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
    if (req.originalUrl.includes('/api/contracts/email-import')) {
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
      const premiumRequiredRoutes = [
        '/api/optimize',           // KI-Optimierung
        '/api/contracts/generate', // Vertrag generieren
        '/api/chat',               // Chat mit Vertrag
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
      const premiumRequiredRoutes = ['/api/optimize', '/api/contracts/generate', '/api/chat', '/api/compare', '/api/envelopes', '/api/legal-lens', '/api/legalpulse'];
      const isPremiumRoute = premiumRequiredRoutes.some(route => req.originalUrl.toLowerCase().startsWith(route.toLowerCase()));

      if (isPremiumRoute) {
        return res.status(500).json({ message: "Serverfehler bei Abo-Überprüfung" });
      }

      console.log(`⚠️ Fehler in checkSubscription, aber Basis-Feature erlaubt: ${req.originalUrl}`);
      next();
    }
  };
};