// 📁 backend/routes/onboarding.js
// Enterprise Onboarding System v3.0
// Server-seitige Persistierung für zuverlässiges Onboarding

const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");

// 🔗 Collections werden dynamisch übergeben
let usersCollection;
let contractsCollection;
let companyProfilesCollection;

module.exports = (db) => {
  usersCollection = db.collection("users");
  contractsCollection = db.collection("contracts");
  companyProfilesCollection = db.collection("company_profiles");
  return router;
};

// =====================================================
// 📊 ONBOARDING STATUS
// =====================================================

/**
 * GET /api/onboarding/status
 * Aktuellen Onboarding-Status abrufen
 */
router.get("/status", verifyToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId);

    const user = await usersCollection.findOne(
      { _id: userId },
      { projection: { onboarding: 1, email: 1, createdAt: 1, verified: 1 } }
    );

    if (!user) {
      return res.status(404).json({ message: "User nicht gefunden" });
    }

    // Default-Werte falls onboarding noch nicht existiert
    let onboarding = user.onboarding || {
      status: 'not_started',
      completedSteps: [],
      profile: {},
      seenFeatures: [],
      showTooltips: true,
      checklist: {
        accountCreated: true,
        emailVerified: false,
        firstContractUploaded: false,
        companyProfileComplete: false,
        firstAnalysisComplete: false
      }
    };

    // 🔧 AUTO-SYNC: Checklist-Items automatisch basierend auf tatsächlichen Daten aktualisieren
    const checklist = { ...onboarding.checklist };
    let needsUpdate = false;

    // ✅ accountCreated ist immer true (User existiert ja)
    if (!checklist.accountCreated) {
      checklist.accountCreated = true;
      needsUpdate = true;
    }

    // ✅ emailVerified: Aus User.verified Feld
    if (!checklist.emailVerified && user.verified) {
      checklist.emailVerified = true;
      needsUpdate = true;
    }

    // ✅ firstContractUploaded: Prüfe ob User mindestens 1 Vertrag hat
    if (!checklist.firstContractUploaded && contractsCollection) {
      const contractCount = await contractsCollection.countDocuments({ userId: userId });
      if (contractCount > 0) {
        checklist.firstContractUploaded = true;
        needsUpdate = true;
        console.log(`🔄 [Onboarding Auto-Sync] firstContractUploaded = true für ${user.email} (${contractCount} Verträge)`);
      }
    }

    // ✅ companyProfileComplete: Prüfe ob Firmenprofil existiert und ausgefüllt ist
    if (!checklist.companyProfileComplete && companyProfilesCollection) {
      const profile = await companyProfilesCollection.findOne({ userId: userId });
      if (profile && profile.companyName && profile.companyName.trim()) {
        checklist.companyProfileComplete = true;
        needsUpdate = true;
        console.log(`🔄 [Onboarding Auto-Sync] companyProfileComplete = true für ${user.email}`);
      }
    }

    // ✅ firstAnalysisComplete: Prüfe ob User mindestens 1 analysierten Vertrag hat
    if (!checklist.firstAnalysisComplete && contractsCollection) {
      const analyzedCount = await contractsCollection.countDocuments({
        userId: userId,
        analyzed: true
      });
      if (analyzedCount > 0) {
        checklist.firstAnalysisComplete = true;
        needsUpdate = true;
        console.log(`🔄 [Onboarding Auto-Sync] firstAnalysisComplete = true für ${user.email} (${analyzedCount} Analysen)`);
      }
    }

    // 💾 Bei Änderungen: Checklist in DB aktualisieren (async, nicht blockierend)
    if (needsUpdate) {
      usersCollection.updateOne(
        { _id: userId },
        {
          $set: {
            'onboarding.checklist': checklist,
            updatedAt: new Date()
          }
        }
      ).then(() => {
        console.log(`✅ [Onboarding Auto-Sync] Checklist aktualisiert für ${user.email}`);
      }).catch(err => {
        console.warn(`⚠️ [Onboarding Auto-Sync] Update fehlgeschlagen:`, err.message);
      });

      // Verwende aktualisierte Checklist für Response
      onboarding = { ...onboarding, checklist };
    }

    // Berechne Checklist-Progress
    const checklistItems = Object.values(checklist);
    const checklistProgress = checklistItems.filter(Boolean).length;
    const checklistTotal = checklistItems.length || 5;

    // 🙈 Prüfe ob User die Checklist dauerhaft ausgeblendet hat
    const checklistHiddenByUser = onboarding.checklistHiddenByUser || false;

    // Entscheide ob Modal/Checklist gezeigt werden soll
    const shouldShowModal = onboarding.status === 'not_started' || onboarding.status === 'in_progress';
    // 🔧 FIX: Checklist auch für 'skipped' Status zeigen, ABER nicht wenn User sie ausgeblendet hat
    const shouldShowChecklist = !checklistHiddenByUser &&
      (onboarding.status === 'completed' || onboarding.status === 'skipped') &&
      checklistProgress < checklistTotal;

    res.json({
      status: onboarding.status,
      completedAt: onboarding.completedAt || null,
      skippedAt: onboarding.skippedAt || null,
      startedAt: onboarding.startedAt || null,
      completedSteps: onboarding.completedSteps || [],
      profile: onboarding.profile || {},
      seenFeatures: onboarding.seenFeatures || [],
      showTooltips: onboarding.showTooltips ?? true,
      checklist: checklist,
      checklistProgress,
      checklistTotal,
      shouldShowModal,
      shouldShowChecklist,
      checklistHiddenByUser // 🆕 Für Frontend-Logik
    });
  } catch (err) {
    console.error("❌ Fehler bei /onboarding/status:", err);
    res.status(500).json({ message: "Serverfehler" });
  }
});

// =====================================================
// 🚀 ONBOARDING FLOW CONTROL
// =====================================================

/**
 * POST /api/onboarding/start
 * Onboarding starten (Status: in_progress)
 */
router.post("/start", verifyToken, async (req, res) => {
  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      return res.status(404).json({ message: "User nicht gefunden" });
    }

    // Nur starten wenn noch nicht gestartet
    if (user.onboarding?.status === 'completed' || user.onboarding?.status === 'skipped') {
      return res.json({
        success: true,
        message: "Onboarding bereits abgeschlossen",
        status: user.onboarding.status
      });
    }

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          "onboarding.status": "in_progress",
          "onboarding.startedAt": new Date(),
          updatedAt: new Date()
        }
      }
    );

    console.log(`🚀 Onboarding gestartet für: ${user.email}`);

    res.json({
      success: true,
      message: "Onboarding gestartet",
      status: "in_progress"
    });
  } catch (err) {
    console.error("❌ Fehler bei /onboarding/start:", err);
    res.status(500).json({ message: "Serverfehler" });
  }
});

/**
 * PUT /api/onboarding/step/:stepId
 * Einzelnen Step als abgeschlossen markieren
 */
router.put("/step/:stepId", verifyToken, async (req, res) => {
  try {
    const { stepId } = req.params;
    const { data } = req.body; // Optional: Zusätzliche Daten für den Step

    if (!stepId) {
      return res.status(400).json({ message: "stepId erforderlich" });
    }

    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      return res.status(404).json({ message: "User nicht gefunden" });
    }

    // Prüfen ob Step bereits abgeschlossen
    const completedSteps = user.onboarding?.completedSteps || [];
    const existingStep = completedSteps.find(s => s.stepId === stepId);

    if (existingStep) {
      return res.json({
        success: true,
        message: "Step bereits abgeschlossen",
        completedSteps
      });
    }

    // Step hinzufügen
    const newStep = {
      stepId,
      completedAt: new Date(),
      data: data || null
    };

    // Update-Objekt vorbereiten
    const updateObj = {
      $push: { "onboarding.completedSteps": newStep },
      $set: { updatedAt: new Date() }
    };

    // Spezielle Verarbeitung für bestimmte Steps
    if (stepId === 'personalization' && data) {
      updateObj.$set["onboarding.profile"] = data;
    }

    await usersCollection.updateOne({ _id: user._id }, updateObj);

    console.log(`✅ Onboarding Step abgeschlossen für ${user.email}: ${stepId}`);

    res.json({
      success: true,
      message: `Step "${stepId}" abgeschlossen`,
      completedSteps: [...completedSteps, newStep]
    });
  } catch (err) {
    console.error("❌ Fehler bei /onboarding/step:", err);
    res.status(500).json({ message: "Serverfehler" });
  }
});

/**
 * POST /api/onboarding/complete
 * Onboarding abschließen (Status: completed)
 */
router.post("/complete", verifyToken, async (req, res) => {
  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      return res.status(404).json({ message: "User nicht gefunden" });
    }

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          "onboarding.status": "completed",
          "onboarding.completedAt": new Date(),
          updatedAt: new Date()
        }
      }
    );

    console.log(`🎉 Onboarding abgeschlossen für: ${user.email}`);

    res.json({
      success: true,
      message: "Onboarding abgeschlossen",
      status: "completed"
    });
  } catch (err) {
    console.error("❌ Fehler bei /onboarding/complete:", err);
    res.status(500).json({ message: "Serverfehler" });
  }
});

/**
 * POST /api/onboarding/skip
 * Onboarding überspringen (Status: skipped)
 */
router.post("/skip", verifyToken, async (req, res) => {
  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      return res.status(404).json({ message: "User nicht gefunden" });
    }

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          "onboarding.status": "skipped",
          "onboarding.skippedAt": new Date(),
          updatedAt: new Date()
        }
      }
    );

    console.log(`⏭️ Onboarding übersprungen für: ${user.email}`);

    res.json({
      success: true,
      message: "Onboarding übersprungen",
      status: "skipped"
    });
  } catch (err) {
    console.error("❌ Fehler bei /onboarding/skip:", err);
    res.status(500).json({ message: "Serverfehler" });
  }
});

/**
 * POST /api/onboarding/hide-checklist
 * Checklist dauerhaft ausblenden (in DB gespeichert)
 */
router.post("/hide-checklist", verifyToken, async (req, res) => {
  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      return res.status(404).json({ message: "User nicht gefunden" });
    }

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          "onboarding.checklistHiddenByUser": true,
          "onboarding.checklistHiddenAt": new Date(),
          updatedAt: new Date()
        }
      }
    );

    console.log(`🙈 Checklist dauerhaft ausgeblendet für: ${user.email}`);

    res.json({
      success: true,
      message: "Checklist dauerhaft ausgeblendet"
    });
  } catch (err) {
    console.error("❌ Fehler bei /onboarding/hide-checklist:", err);
    res.status(500).json({ message: "Serverfehler" });
  }
});

/**
 * POST /api/onboarding/show-checklist
 * Checklist wieder einblenden (für Einstellungen)
 */
router.post("/show-checklist", verifyToken, async (req, res) => {
  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      return res.status(404).json({ message: "User nicht gefunden" });
    }

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          "onboarding.checklistHiddenByUser": false,
          updatedAt: new Date()
        },
        $unset: {
          "onboarding.checklistHiddenAt": ""
        }
      }
    );

    console.log(`👁️ Checklist wieder eingeblendet für: ${user.email}`);

    res.json({
      success: true,
      message: "Checklist wieder eingeblendet"
    });
  } catch (err) {
    console.error("❌ Fehler bei /onboarding/show-checklist:", err);
    res.status(500).json({ message: "Serverfehler" });
  }
});

// =====================================================
// ✅ CHECKLIST MANAGEMENT
// =====================================================

/**
 * PUT /api/onboarding/checklist/:itemId
 * Checklist-Item als erledigt markieren
 */
router.put("/checklist/:itemId", verifyToken, async (req, res) => {
  try {
    const { itemId } = req.params;
    const validItems = [
      'accountCreated',
      'emailVerified',
      'firstContractUploaded',
      'companyProfileComplete',
      'firstAnalysisComplete'
    ];

    if (!validItems.includes(itemId)) {
      return res.status(400).json({
        message: "Ungültiges Checklist-Item",
        validItems
      });
    }

    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      return res.status(404).json({ message: "User nicht gefunden" });
    }

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          [`onboarding.checklist.${itemId}`]: true,
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ Checklist-Item erledigt für ${user.email}: ${itemId}`);

    res.json({
      success: true,
      message: `Checklist-Item "${itemId}" erledigt`,
      itemId
    });
  } catch (err) {
    console.error("❌ Fehler bei /onboarding/checklist:", err);
    res.status(500).json({ message: "Serverfehler" });
  }
});

// =====================================================
// 💡 FEATURE TOOLTIPS
// =====================================================

/**
 * POST /api/onboarding/feature/:featureId
 * Feature als gesehen markieren (für Tooltips)
 */
router.post("/feature/:featureId", verifyToken, async (req, res) => {
  try {
    const { featureId } = req.params;

    if (!featureId) {
      return res.status(400).json({ message: "featureId erforderlich" });
    }

    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      return res.status(404).json({ message: "User nicht gefunden" });
    }

    // Prüfen ob Feature bereits gesehen
    const seenFeatures = user.onboarding?.seenFeatures || [];
    if (seenFeatures.includes(featureId)) {
      return res.json({
        success: true,
        message: "Feature bereits gesehen",
        seenFeatures
      });
    }

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $push: { "onboarding.seenFeatures": featureId },
        $set: { updatedAt: new Date() }
      }
    );

    console.log(`👁️ Feature gesehen für ${user.email}: ${featureId}`);

    res.json({
      success: true,
      message: `Feature "${featureId}" als gesehen markiert`,
      seenFeatures: [...seenFeatures, featureId]
    });
  } catch (err) {
    console.error("❌ Fehler bei /onboarding/feature:", err);
    res.status(500).json({ message: "Serverfehler" });
  }
});

/**
 * PUT /api/onboarding/preferences
 * Onboarding-Präferenzen aktualisieren (z.B. Tooltips ein/aus)
 */
router.put("/preferences", verifyToken, async (req, res) => {
  try {
    const { showTooltips } = req.body;

    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      return res.status(404).json({ message: "User nicht gefunden" });
    }

    const updates = { updatedAt: new Date() };

    if (typeof showTooltips === 'boolean') {
      updates["onboarding.showTooltips"] = showTooltips;
    }

    await usersCollection.updateOne(
      { _id: user._id },
      { $set: updates }
    );

    console.log(`⚙️ Onboarding-Präferenzen aktualisiert für: ${user.email}`);

    res.json({
      success: true,
      message: "Präferenzen aktualisiert",
      showTooltips: showTooltips ?? user.onboarding?.showTooltips ?? true
    });
  } catch (err) {
    console.error("❌ Fehler bei /onboarding/preferences:", err);
    res.status(500).json({ message: "Serverfehler" });
  }
});

/**
 * POST /api/onboarding/reset-feature
 * Feature-Tour zurücksetzen (aus seenFeatures entfernen)
 * Ermöglicht das erneute Anzeigen einer Tour
 */
router.post("/reset-feature", verifyToken, async (req, res) => {
  try {
    const { featureId } = req.body;

    if (!featureId) {
      return res.status(400).json({ message: "featureId erforderlich" });
    }

    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      return res.status(404).json({ message: "User nicht gefunden" });
    }

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $pull: { "onboarding.seenFeatures": featureId },
        $set: { updatedAt: new Date() }
      }
    );

    const updatedFeatures = (user.onboarding?.seenFeatures || []).filter(f => f !== featureId);

    console.log(`🔄 Feature-Tour zurückgesetzt für ${user.email}: ${featureId}`);

    res.json({
      success: true,
      message: `Feature "${featureId}" zurückgesetzt`,
      seenFeatures: updatedFeatures
    });
  } catch (err) {
    console.error("❌ Fehler bei /onboarding/reset-feature:", err);
    res.status(500).json({ message: "Serverfehler" });
  }
});

// =====================================================
// 🔄 MIGRATION: Bestehende User
// =====================================================

/**
 * POST /api/onboarding/migrate-existing-users
 * Alle bestehenden User (vor Go-Live) als "completed" markieren
 * EINMALIG AUSFÜHREN!
 */
router.post("/migrate-existing-users", async (req, res) => {
  try {
    console.log("🔄 Migration gestartet: Bestehende User auf onboarding.status = 'completed'...");

    // Alle User OHNE onboarding Feld oder mit not_started
    const result = await usersCollection.updateMany(
      {
        $or: [
          { onboarding: { $exists: false } },
          { "onboarding.status": { $exists: false } }
        ]
      },
      {
        $set: {
          onboarding: {
            status: "completed",
            completedAt: new Date(),
            startedAt: null,
            skippedAt: null,
            completedSteps: [],
            profile: {},
            seenFeatures: [],
            showTooltips: true,
            checklist: {
              accountCreated: true,
              emailVerified: true,
              firstContractUploaded: true,
              companyProfileComplete: true,
              firstAnalysisComplete: true
            }
          },
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ Migration abgeschlossen: ${result.modifiedCount} User migriert`);

    res.json({
      success: true,
      message: `${result.modifiedCount} bestehende User auf 'completed' gesetzt`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error("❌ Fehler bei Migration:", err);
    res.status(500).json({ message: "Serverfehler bei Migration" });
  }
});

/**
 * POST /api/onboarding/reset (ADMIN/DEBUG)
 * Onboarding für einen User zurücksetzen
 */
router.post("/reset", verifyToken, async (req, res) => {
  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      return res.status(404).json({ message: "User nicht gefunden" });
    }

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          onboarding: {
            status: "not_started",
            completedAt: null,
            startedAt: null,
            skippedAt: null,
            completedSteps: [],
            profile: {},
            seenFeatures: [],
            showTooltips: true,
            checklist: {
              accountCreated: true,
              emailVerified: user.verified || false,
              firstContractUploaded: false,
              companyProfileComplete: false,
              firstAnalysisComplete: false
            }
          },
          updatedAt: new Date()
        }
      }
    );

    console.log(`🔄 Onboarding zurückgesetzt für: ${user.email}`);

    res.json({
      success: true,
      message: "Onboarding zurückgesetzt",
      status: "not_started"
    });
  } catch (err) {
    console.error("❌ Fehler bei /onboarding/reset:", err);
    res.status(500).json({ message: "Serverfehler" });
  }
});
