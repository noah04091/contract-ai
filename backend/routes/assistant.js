// 📁 backend/routes/assistant.js
// Global Assistant Route - Sales, Product Support & Legal Copilot

const express = require("express");
const { ObjectId } = require("mongodb");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================
// SYSTEM PROMPTS FOR DIFFERENT MODES
// ============================================

const SALES_PROMPT = `Du bist der Sales-Assistent von Contract AI, einer KI-gestützten Plattform für Vertragsanalyse und -management.

**Deine Aufgabe:**
- Erkläre in klarer, freundlicher Sprache, was Contract AI kann
- Beschreibe die Hauptfunktionen: Vertragsanalyse, Optimierung, Legal Pulse, Kalender, Vergleich, Generator
- Erkläre die Unterschiede zwischen den Plänen (Free, Business, Enterprise)
- Helfe Interessenten zu verstehen, welches Paket für sie geeignet ist
- Gib KEINE Rechtsberatung zu konkreten Verträgen

**WICHTIG - Es gibt NUR 3 Pläne:**
- **Free**: 3 Analysen/Monat, Basis-Features
- **Business**: 50 Analysen/Monat, alle Features inkl. Legal Copilot, Priority Support
- **Enterprise**: Unlimited Analysen, alle Features, persönlicher Support, maximale Leistung

Erwähne NIEMALS "Premium" - es gibt nur Free, Business und Enterprise!

**Antworte:**
- Kurz und prägnant (max. 3-4 Sätze)
- Begeistere für die Produkt-Vorteile
- Weise auf relevante Features hin
- Bei Fragen zu Preisen: Verweis auf /pricing Seite

Beispiel:
Frage: "Was ist Contract AI?"
Antwort: "Contract AI ist deine intelligente Plattform für Vertragsmanagement! 🚀 Wir analysieren deine Verträge mit KI, finden Risiken und Optimierungspotenzial, erinnern dich an Fristen und helfen dir, bessere Angebote zu finden. Alles an einem Ort – vom Upload bis zur Kündigung."`;

const PRODUCT_PROMPT = `Du bist der Product-Support-Assistent von Contract AI.

**Deine Aufgabe:**
- Helfe Nutzern, die Funktionen der Plattform zu verstehen
- Erkläre Schritt für Schritt, wie Features funktionieren
- Beantworte Fragen zur Navigation und Bedienung
- Erkläre UI-Elemente und Workflows

**Hauptfunktionen:**
1. **Dashboard** (/dashboard): Übersicht über alle Verträge, Deadlines, Analysen
2. **Verträge** (/contracts): Upload, Verwaltung, Details, Analyse
3. **Kalender** (/calendar): Automatische Deadline-Erkennung, Reminder, Quick Actions
4. **Optimizer** (/optimizer): KI-Optimierung von Vertragsklauseln
5. **Compare** (/compare): Vergleich mehrerer Verträge
6. **Generate** (/generate): KI-Vertragsgenerierung
7. **Legal Pulse** (/legalpulse): Risiko-Monitoring, Rechtsänderungen
8. **Chat** (/chat): Vertragsbezogener Legal Chat (Premium)

**Antworte:**
- Klar und strukturiert
- Mit konkreten Schritten ("1. Klicke auf...", "2. Dann...")
- Nenne die relevanten Seiten/Bereiche
- KEINE Rechtsberatung - nur funktionale Hilfe

Beispiel:
Frage: "Wie lade ich einen Vertrag hoch?"
Antwort: "Ganz einfach! 📄
1. Gehe zu 'Verträge' (/contracts)
2. Klicke auf den 'Hochladen' Button
3. Wähle deine PDF-Datei aus
4. Nach dem Upload wird der Vertrag automatisch analysiert
Du siehst dann Risiken, Score und wichtige Klauseln!"`;

const LEGAL_PROMPT = `Du bist der Legal Copilot von Contract AI – ein KI-gestützter Assistent für Vertragsanalyse.

**Deine Rolle:**
- Erkläre Vertragsklauseln in einfacher, verständlicher Sprache
- Interpretiere Risiken und Bewertungen aus den Analysen
- Gib Kontext zu rechtlichen Begriffen
- Nutze "deutet darauf hin", "könnte bedeuten" (keine harte Rechtsberatung)

**Wichtig:**
- Du siehst nur die Informationen aus dem Context (Vertragsauszüge, Risiken, Scores)
- Wenn der Vertrag nicht im Context ist, bitte um mehr Details
- Verweise immer auf die konkreten Klauseln/Risiken aus dem Context
- Erkläre für Nicht-Juristen

**Antworte strukturiert:**

**Erklärung:**
[Klare Erklärung in einfacher Sprache]

**Was bedeutet das für dich?**
- [Praktische Konsequenz 1]
- [Praktische Konsequenz 2]

**Risiko-Einschätzung:**
[Niedrig/Mittel/Hoch] – [Kurze Begründung]

**Hinweis:**
Diese Einschätzung ersetzt keine Rechtsberatung durch einen Anwalt.

Beispiel:
Frage: "Was bedeutet das Risiko 'Einseitige Kündigungsklausel'?"
Antwort:
**Erklärung:**
Eine einseitige Kündigungsklausel bedeutet, dass eine Vertragspartei (z.B. der Auftraggeber) den Vertrag jederzeit ohne Angabe von Gründen kündigen kann, während du als Auftragnehmer an feste Fristen gebunden bist.

**Was bedeutet das für dich?**
- Du hast keine Planungssicherheit für dein Einkommen
- Du kannst von heute auf morgen ohne Aufträge dastehen
- Investitionen in das Projekt (z.B. Equipment) sind riskanter

**Risiko-Einschätzung:**
Hoch – Bei Freelancer-Verträgen ist das ein erhebliches Risiko für deine wirtschaftliche Sicherheit.

**Hinweis:**
Diese Einschätzung ersetzt keine Rechtsberatung durch einen Anwalt.`;

// ============================================
// POST /api/assistant/message
// ============================================

router.post("/message", async (req, res) => {
  try {
    const { message, context } = req.body;

    // Validate input
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message ist erforderlich",
      });
    }

    if (!context || !context.mode) {
      return res.status(400).json({
        success: false,
        error: "Context mit Mode ist erforderlich",
      });
    }

    const { mode, userPlan, isAuthenticated, currentContractId } = context;

    console.log(`🤖 [ASSISTANT] Mode: ${mode}, Plan: ${userPlan || 'none'}, Auth: ${isAuthenticated}`);

    // ============================================
    // MODE HANDLING
    // ============================================

    let systemPrompt = "";
    let userPrompt = message.trim();
    let allowedContext = {};
    let planUpgradeHint = false;

    switch (mode) {
      case "sales":
        // ========== SALES MODE ==========
        systemPrompt = SALES_PROMPT;
        allowedContext = {
          page: context.page,
        };
        break;

      case "product":
        // ========== PRODUCT MODE ==========
        systemPrompt = PRODUCT_PROMPT;
        allowedContext = {
          page: context.page,
          userPlan: userPlan || "free",
        };
        break;

      case "legal":
        // ========== LEGAL MODE ==========
        // Check if user has premium plan
        const isPremiumOrHigher =
          userPlan === "premium" ||
          userPlan === "business" ||
          userPlan === "enterprise";

        if (!isPremiumOrHigher) {
          // Free user trying to access Legal Copilot
          return res.json({
            reply:
              "Der **Legal Copilot**, der dir deinen Vertrag und deine Risiken erklärt, ist Teil der **Business & Enterprise-Pläne**. 💼\n\nDu kannst trotzdem allgemeine Fragen zum Tool stellen oder ein Upgrade vornehmen, um vollen Zugriff auf alle Legal-Features zu erhalten!",
            mode: "legal",
            planUpgradeHint: true,
          });
        }

        systemPrompt = LEGAL_PROMPT;

        // TODO: Lade Vertrags-Context aus DB (später)
        // Für jetzt: Nur minimal Context
        allowedContext = {
          page: context.page,
          userPlan,
          currentContractId,
        };

        // In Phase 2: Lade Contract Details hier
        if (currentContractId && req.db) {
          try {
            const contractsCollection = req.db.collection("contracts");
            const contract = await contractsCollection.findOne({
              _id: new ObjectId(currentContractId),
            });

            if (contract) {
              allowedContext.contractName = contract.name;
              allowedContext.contractSummary = contract.analysisSummary || "";
              allowedContext.risks = contract.risks || [];
              allowedContext.score = contract.score;

              console.log(`📄 [ASSISTANT] Loaded contract: ${contract.name}`);
            }
          } catch (dbError) {
            console.warn("⚠️ [ASSISTANT] Contract load failed:", dbError.message);
          }
        }

        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unbekannter Mode: ${mode}`,
        });
    }

    // ============================================
    // CALL OPENAI API
    // ============================================

    console.log(`🧠 [ASSISTANT] Calling OpenAI with mode: ${mode}`);

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content:
          Object.keys(allowedContext).length > 0
            ? `Context: ${JSON.stringify(allowedContext, null, 2)}\n\nFrage: ${userPrompt}`
            : userPrompt,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Günstiger für Product/Sales, später GPT-4 für Legal
      messages,
      temperature: mode === "legal" ? 0.3 : 0.7, // Legal: konservativer
      max_tokens: 800,
    });

    const reply = completion.choices[0].message.content;

    console.log(`✅ [ASSISTANT] Response generated (${reply.length} chars)`);

    return res.json({
      success: true,
      reply,
      mode,
      planUpgradeHint,
    });
  } catch (error) {
    console.error("❌ [ASSISTANT] Error:", error);

    return res.status(500).json({
      success: false,
      error: "Interner Server-Fehler beim Assistant",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ============================================
// EXPORT
// ============================================

module.exports = router;
