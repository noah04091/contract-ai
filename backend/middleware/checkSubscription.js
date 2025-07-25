// 📁 backend/middleware/checkSubscription.js
// ✅ FIXED: Free-User können Basis-Features nutzen, nur Premium-Features werden blockiert

const { ObjectId } = require("mongodb");

// Diese Funktion wird vom Server mit gegebenem DB-Handle aufgerufen
module.exports = function createCheckSubscription(usersCollection) {
  return async function checkSubscription(req, res, next) {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "❌ Nicht autorisiert" });
    }

    try {
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

      if (!user) {
        return res.status(404).json({ message: "❌ Benutzer nicht gefunden" });
      }

      const plan = user.subscriptionPlan || "free";
      const isActive = user.subscriptionActive || false;
      const isPremium = user.isPremium || false;

      // ✅ WICHTIG: Nur BESTIMMTE ROUTES brauchen Premium/Business!
      const premiumRequiredRoutes = [
        '/api/analyze',           // KI-Analyse
        '/api/optimize',          // KI-Optimierung  
        '/api/contracts/generate', // Vertrag generieren
        '/api/chat',              // Chat mit Vertrag
        '/api/compare'            // Vergleich
      ];

      const isPremiumRoute = premiumRequiredRoutes.some(route => 
        req.originalUrl.startsWith(route)
      );

      console.log(`🔍 CheckSubscription: User=${plan}, Route=${req.originalUrl}, IsPremiumRoute=${isPremiumRoute}`);

      // ✅ FREE-USER: Basis-Features (Contracts anzeigen, Dashboard, etc.) erlauben
      if (plan === "free") {
        if (isPremiumRoute) {
          console.log(`❌ Free-User blockiert für Premium-Route: ${req.originalUrl}`);
          return res.status(403).json({
            success: false,
            message: "⛔ Diese Funktion ist nur mit einem aktiven Abo verfügbar.",
            requiresUpgrade: true,
            feature: "premium_feature",
            upgradeUrl: "/pricing",
            userPlan: "free"
          });
        }
        
        // ✅ Basis-Features (Contracts anzeigen, Upload, etc.) sind für Free-User erlaubt
        console.log(`✅ Free-User Zugriff erlaubt auf Basis-Feature: ${req.originalUrl}`);
        return next();
      }

      // ✅ BUSINESS-USER: Premium-Features erlaubt, aber Limits beachten
      if (plan === "business") {
        if (isPremiumRoute) {
          // Business kann Premium-Features nutzen, aber mit Limits
          console.log(`✅ Business-User Zugriff erlaubt auf Premium-Feature: ${req.originalUrl}`);
        } else {
          console.log(`✅ Business-User Zugriff erlaubt auf Basis-Feature: ${req.originalUrl}`);
        }
        return next();
      }

      // ✅ PREMIUM-USER: Alles erlaubt
      if (plan === "premium" || isPremium) {
        console.log(`✅ Premium-User Zugriff erlaubt auf: ${req.originalUrl}`);
        return next();
      }

      // ✅ FALLBACK: Bei unbekanntem Plan - Basis-Features erlauben
      if (isPremiumRoute) {
        console.log(`❌ Unbekannter Plan (${plan}) blockiert für Premium-Route: ${req.originalUrl}`);
        return res.status(403).json({
          success: false,
          message: "⛔ Diese Funktion ist nur mit einem aktiven Abo verfügbar.",
          requiresUpgrade: true,
          feature: "premium_feature",
          upgradeUrl: "/pricing",
          userPlan: plan
        });
      }

      console.log(`✅ Fallback: Zugriff erlaubt für unbekannten Plan (${plan}) auf: ${req.originalUrl}`);
      next();

    } catch (err) {
      console.error("❌ Fehler in checkSubscription:", err);
      
      // ✅ WICHTIG: Bei Fehlern trotzdem Basis-Features erlauben (graceful degradation)
      const premiumRequiredRoutes = ['/api/analyze', '/api/optimize', '/api/contracts/generate', '/api/chat', '/api/compare'];
      const isPremiumRoute = premiumRequiredRoutes.some(route => req.originalUrl.startsWith(route));
      
      if (isPremiumRoute) {
        return res.status(500).json({ message: "Serverfehler bei Abo-Überprüfung" });
      }
      
      console.log(`⚠️ Fehler in checkSubscription, aber Basis-Feature erlaubt: ${req.originalUrl}`);
      next(); // Basis-Features trotz Fehler erlauben
    }
  };
};