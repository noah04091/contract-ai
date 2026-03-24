const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const RefundFeedback = require("../models/RefundFeedback");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

module.exports = function (db, transporter) {
  // ─────────────────────────────────────────────────
  // POST /api/refund-feedback/create (Admin only)
  // Erstellt einen neuen Feedback-Link
  // ─────────────────────────────────────────────────
  router.post("/create", verifyToken, verifyAdmin, async (req, res) => {
    try {
      const { customerName, customerEmail, subscriptionPlan } = req.body;

      if (!customerName || !customerEmail) {
        return res.status(400).json({ error: "Name und E-Mail sind erforderlich." });
      }

      const token = crypto.randomBytes(32).toString("hex");

      const feedback = new RefundFeedback({
        token,
        customerName,
        customerEmail,
        subscriptionPlan: subscriptionPlan || "",
      });

      await feedback.save();

      const feedbackUrl = `https://contract-ai.de/feedback/refund/${token}`;

      console.log(`✅ [REFUND-FEEDBACK] Link erstellt für ${customerName} (${customerEmail}): ${feedbackUrl}`);

      res.json({
        success: true,
        token,
        url: feedbackUrl,
        message: "Feedback-Link wurde erstellt.",
      });
    } catch (error) {
      console.error("❌ [REFUND-FEEDBACK] Create Error:", error);
      res.status(500).json({ error: "Link konnte nicht erstellt werden." });
    }
  });

  // ─────────────────────────────────────────────────
  // GET /api/refund-feedback/admin/list (Geschützt)
  // Alle Feedbacks einsehen — MUSS vor /:token stehen!
  // ─────────────────────────────────────────────────
  router.get("/admin/list", verifyToken, verifyAdmin, async (req, res) => {
    try {
      const feedbacks = await RefundFeedback.find()
        .sort({ createdAt: -1 })
        .lean();

      res.json({ success: true, feedbacks });
    } catch (error) {
      console.error("❌ [REFUND-FEEDBACK] List Error:", error);
      res.status(500).json({ error: "Feedbacks konnten nicht geladen werden." });
    }
  });

  // ─────────────────────────────────────────────────
  // PUT /api/refund-feedback/admin/:id/refund (Admin only)
  // Markiert Feedback als erstattet
  // ─────────────────────────────────────────────────
  router.put("/admin/:id/refund", verifyToken, verifyAdmin, async (req, res) => {
    try {
      const { refundAmount, refundNote } = req.body;

      const feedback = await RefundFeedback.findById(req.params.id);
      if (!feedback) {
        return res.status(404).json({ error: "Feedback nicht gefunden." });
      }

      feedback.status = "refunded";
      feedback.refundAmount = refundAmount || 0;
      feedback.refundNote = refundNote || "";
      feedback.refundedAt = new Date();

      await feedback.save();

      console.log(`✅ [REFUND-FEEDBACK] Als erstattet markiert: ${feedback.customerName} — ${refundAmount}€`);

      res.json({ success: true, message: "Als erstattet markiert." });
    } catch (error) {
      console.error("❌ [REFUND-FEEDBACK] Refund Error:", error);
      res.status(500).json({ error: "Fehler beim Markieren." });
    }
  });

  // ─────────────────────────────────────────────────
  // GET /api/refund-feedback/:token (Öffentlich)
  // Lädt Feedback-Daten für die Anzeige
  // ─────────────────────────────────────────────────
  router.get("/:token", async (req, res) => {
    try {
      const feedback = await RefundFeedback.findOne({ token: req.params.token });

      if (!feedback) {
        return res.status(404).json({ error: "Feedback-Link nicht gefunden oder abgelaufen." });
      }

      if (feedback.status === "submitted" || feedback.status === "refunded") {
        return res.json({
          success: true,
          alreadySubmitted: true,
          customerName: feedback.customerName,
        });
      }

      res.json({
        success: true,
        alreadySubmitted: false,
        customerName: feedback.customerName,
        subscriptionPlan: feedback.subscriptionPlan,
      });
    } catch (error) {
      console.error("❌ [REFUND-FEEDBACK] Get Error:", error);
      res.status(500).json({ error: "Feedback konnte nicht geladen werden." });
    }
  });

  // ─────────────────────────────────────────────────
  // POST /api/refund-feedback/:token/submit (Öffentlich)
  // Speichert das Feedback + sendet Admin-Email
  // ─────────────────────────────────────────────────
  router.post("/:token/submit", async (req, res) => {
    try {
      const feedback = await RefundFeedback.findOne({ token: req.params.token });

      if (!feedback) {
        return res.status(404).json({ error: "Feedback-Link nicht gefunden." });
      }

      if (feedback.status === "submitted" || feedback.status === "refunded") {
        return res.status(400).json({ error: "Feedback wurde bereits abgegeben." });
      }

      const {
        overallRating,
        usedFeatures,
        cancellationReason,
        additionalReasons,
        featureRatings,
        expectedFeatures,
        positiveFeedback,
        negativeFeedback,
        npsScore,
        suggestions,
      } = req.body;

      // Pflichtfeld-Validierung
      if (!overallRating || !cancellationReason || !expectedFeatures) {
        return res.status(400).json({
          error: "Bitte fuelle die Pflichtfelder aus (Gesamtbewertung, Kuendigungsgrund, Erwartungen).",
        });
      }

      // Update Feedback
      feedback.overallRating = overallRating;
      feedback.usedFeatures = usedFeatures || [];
      feedback.cancellationReason = cancellationReason;
      feedback.additionalReasons = additionalReasons || [];
      feedback.featureRatings = featureRatings || {};
      feedback.expectedFeatures = expectedFeatures;
      feedback.positiveFeedback = positiveFeedback || "";
      feedback.negativeFeedback = negativeFeedback || "";
      feedback.npsScore = npsScore;
      feedback.suggestions = suggestions || "";
      feedback.status = "submitted";
      feedback.submittedAt = new Date();

      await feedback.save();

      console.log(`✅ [REFUND-FEEDBACK] Feedback eingegangen von ${feedback.customerName}`);

      // Admin-Benachrichtigung per Email
      try {
        const ratingStars = Array.from({ length: 5 }, (_, i) =>
          i < overallRating ? "&#9733;" : "&#9734;"
        ).join("");

        const npsColor = npsScore >= 9 ? "#22c55e" : npsScore >= 7 ? "#f59e0b" : "#ef4444";
        const npsLabel = npsScore >= 9 ? "Promoter" : npsScore >= 7 ? "Passiv" : "Kritiker";

        const featureList = (usedFeatures || []).map((f) => `<li>${f}</li>`).join("");
        const additionalList = (additionalReasons || []).map((r) => `<li>${r}</li>`).join("");

        const featureRatingRows = Object.entries(featureRatings || {})
          .filter(([, val]) => val > 0)
          .map(
            ([key, val]) =>
              `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${key}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${"&#9733;".repeat(val)}${"&#9734;".repeat(5 - val)}</td></tr>`
          )
          .join("");

        const emailHtml = `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;padding:20px;">
            <div style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:white;padding:30px;border-radius:16px 16px 0 0;text-align:center;">
              <h1 style="margin:0;font-size:22px;">Refund-Feedback eingegangen</h1>
              <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">${feedback.customerName} &mdash; ${feedback.customerEmail}</p>
            </div>

            <div style="background:#f8fafc;padding:24px;border-radius:0 0 16px 16px;">
              <div style="background:white;padding:20px;border-radius:12px;margin-bottom:16px;">
                <h3 style="margin:0 0 12px;color:#1e293b;">Gesamtbewertung</h3>
                <p style="font-size:28px;margin:0;color:#f59e0b;">${ratingStars} <span style="font-size:16px;color:#64748b;">(${overallRating}/5)</span></p>
              </div>

              <div style="background:white;padding:20px;border-radius:12px;margin-bottom:16px;">
                <h3 style="margin:0 0 12px;color:#1e293b;">Hauptgrund</h3>
                <p style="margin:0;color:#334155;font-size:15px;font-weight:600;">${cancellationReason}</p>
                ${additionalList ? `<h4 style="margin:16px 0 8px;color:#475569;">Weitere Gruende:</h4><ul style="margin:0;padding-left:20px;color:#334155;">${additionalList}</ul>` : ""}
              </div>

              <div style="background:#fef2f2;padding:20px;border-radius:12px;margin-bottom:16px;border:1px solid #fecaca;">
                <h3 style="margin:0 0 12px;color:#991b1b;">Was hat der Kunde erwartet?</h3>
                <p style="margin:0;color:#334155;line-height:1.6;white-space:pre-wrap;">${expectedFeatures}</p>
              </div>

              ${featureList ? `
              <div style="background:white;padding:20px;border-radius:12px;margin-bottom:16px;">
                <h3 style="margin:0 0 12px;color:#1e293b;">Genutzte Features</h3>
                <ul style="margin:0;padding-left:20px;color:#334155;">${featureList}</ul>
              </div>` : ""}

              ${featureRatingRows ? `
              <div style="background:white;padding:20px;border-radius:12px;margin-bottom:16px;">
                <h3 style="margin:0 0 12px;color:#1e293b;">Feature-Bewertungen</h3>
                <table style="width:100%;border-collapse:collapse;font-size:14px;">${featureRatingRows}</table>
              </div>` : ""}

              ${positiveFeedback ? `
              <div style="background:#f0fdf4;padding:20px;border-radius:12px;margin-bottom:16px;border:1px solid #bbf7d0;">
                <h3 style="margin:0 0 12px;color:#166534;">Was hat gefallen?</h3>
                <p style="margin:0;color:#334155;line-height:1.6;white-space:pre-wrap;">${positiveFeedback}</p>
              </div>` : ""}

              ${negativeFeedback ? `
              <div style="background:#fff7ed;padding:20px;border-radius:12px;margin-bottom:16px;border:1px solid #fed7aa;">
                <h3 style="margin:0 0 12px;color:#9a3412;">Was hat nicht gefallen?</h3>
                <p style="margin:0;color:#334155;line-height:1.6;white-space:pre-wrap;">${negativeFeedback}</p>
              </div>` : ""}

              <div style="background:white;padding:20px;border-radius:12px;margin-bottom:16px;text-align:center;">
                <h3 style="margin:0 0 8px;color:#1e293b;">NPS Score</h3>
                <span style="display:inline-block;background:${npsColor};color:white;font-size:32px;font-weight:700;width:56px;height:56px;line-height:56px;border-radius:50%;">${npsScore ?? "-"}</span>
                <p style="margin:8px 0 0;color:#64748b;font-size:13px;">${npsLabel}</p>
              </div>

              ${suggestions ? `
              <div style="background:white;padding:20px;border-radius:12px;">
                <h3 style="margin:0 0 12px;color:#1e293b;">Verbesserungsvorschlaege</h3>
                <p style="margin:0;color:#334155;line-height:1.6;white-space:pre-wrap;">${suggestions}</p>
              </div>` : ""}
            </div>

            <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px;">
              Contract AI Refund-Feedback System &bull; ${new Date().toLocaleDateString("de-DE")}
            </p>
          </div>
        `;

        await transporter.sendMail({
          from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
          to: "info@contract-ai.de",
          subject: `Refund-Feedback: ${feedback.customerName} (${overallRating}/5) — ${cancellationReason}`,
          html: emailHtml,
        });

        console.log(`📧 [REFUND-FEEDBACK] Admin-Email gesendet`);
      } catch (emailErr) {
        console.error("⚠️ [REFUND-FEEDBACK] Email konnte nicht gesendet werden:", emailErr.message);
      }

      res.json({
        success: true,
        message: "Vielen Dank fuer dein Feedback! Deine Rueckerstattung wird nun bearbeitet.",
      });
    } catch (error) {
      console.error("❌ [REFUND-FEEDBACK] Submit Error:", error);
      res.status(500).json({ error: "Feedback konnte nicht gespeichert werden." });
    }
  });

  return router;
};
