// 📁 backend/routes/invoices.js - ✅ EINFACHE STRIPE VERSION (Schneller Fix)

const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const { MongoClient, ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");
require("dotenv").config();

// 📊 PriceId → Plan Mapping (gleich wie in stripe-webhook-server.js)
const getPlanFromPriceId = (priceId) => {
  const priceMap = {
    // Business Plan
    [process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID]: "business",
    [process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID]: "business",
    [process.env.STRIPE_BUSINESS_PRICE_ID]: "business",

    // Enterprise Plan
    [process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID]: "enterprise",
    [process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID]: "enterprise",
    [process.env.STRIPE_ENTERPRISE_PRICE_ID]: "enterprise",

    // LEGACY: "premium" PriceIds werden zu "enterprise" gemappt
    [process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID]: "enterprise",
    [process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID]: "enterprise",
    [process.env.STRIPE_PREMIUM_PRICE_ID]: "enterprise"
  };

  return priceMap[priceId] || null;
};

// 📊 Plan Display Name
const getPlanDisplayName = (plan) => {
  const names = {
    'free': 'Free',
    'business': 'Business',
    'enterprise': 'Enterprise',
    'legendary': 'Enterprise'
  };
  return names[plan] || plan;
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";

// 🛢️ MongoDB-Verbindung für User-Daten und Invoices
let usersCollection;
let invoicesCollection;
const client = new MongoClient(MONGO_URI);
client.connect()
  .then(() => {
    const db = client.db("contract_ai");
    usersCollection = db.collection("users");
    invoicesCollection = db.collection("invoices");
    console.log("✅ Invoices-Route: MongoDB verbunden (für User-Daten und Custom Invoices)");
    console.log("📄 Invoices Collection erfolgreich initialisiert für Custom PDFs");
  })
  .catch(err => {
    console.error("❌ MongoDB-Verbindung fehlgeschlagen:", err.message);
  });

// 📋 GET /api/invoices/me - Alle Rechnungen des Users (EINFACHE VERSION)
router.get("/me", verifyToken, async (req, res) => {
  try {
    console.log("🔍 Lade Stripe-Rechnungen für User:", req.user.email);

    // 1. User aus MongoDB laden (für stripeCustomerId)
    const user = await usersCollection.findOne({ 
      $or: [
        { _id: new ObjectId(req.user.userId) },
        { email: req.user.email }
      ]
    });

    if (!user) {
      console.warn("⚠️ User nicht gefunden:", req.user.email);
      return res.status(404).json({ 
        message: "Benutzer nicht gefunden"
      });
    }

    if (!user.stripeCustomerId) {
      console.warn("⚠️ Keine Stripe Customer ID für User:", req.user.email);
      return res.json([]); // Leere Liste wenn noch kein Stripe-Kunde
    }

    // 2. Rechnungen von Stripe API laden (OHNE KOMPLEXE EXPANSION)
    console.log("🔍 Lade Stripe-Rechnungen für Customer:", user.stripeCustomerId);

    const stripeInvoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 50, // Letzte 50 Rechnungen
      status: 'paid' // Nur bezahlte Rechnungen
      // ✅ KEIN expand - vermeidet den 4-Level-Fehler!
    });

    console.log(`📊 ${stripeInvoices.data.length} Stripe-Rechnungen gefunden`);

    // 3. Rechnungen für Frontend formatieren
    const formattedInvoices = stripeInvoices.data.map(invoice => {
      // ✅ KORRIGIERT: Plan aus Stripe PriceId ermitteln (nicht aus Betrag!)
      let plan = "business"; // Default

      // Versuche Plan aus line_items zu ermitteln
      if (invoice.lines && invoice.lines.data && invoice.lines.data.length > 0) {
        const lineItem = invoice.lines.data[0];
        if (lineItem.price && lineItem.price.id) {
          const detectedPlan = getPlanFromPriceId(lineItem.price.id);
          if (detectedPlan) {
            plan = detectedPlan;
          }
        }
      }

      // Fallback: Aus Betrag ableiten (nur wenn PriceId nicht erkannt)
      // 29€ = Enterprise, 19€ = Business
      if (plan === "business") {
        const amountInEuro = invoice.amount_paid / 100;
        if (amountInEuro >= 28 && amountInEuro <= 30) {
          plan = "enterprise"; // 29€ = Enterprise
        } else if (amountInEuro >= 280 && amountInEuro <= 300) {
          plan = "enterprise"; // 290€ = Enterprise (jährlich)
        }
        // 19€/190€ bleibt bei business (default)
      }

      return {
        invoiceNumber: invoice.number || invoice.id, // Stripe's Rechnungsnummer
        plan: plan,
        planDisplayName: getPlanDisplayName(plan), // ✅ Anzeigename für Frontend
        amount: invoice.amount_paid, // Bereits in Cent von Stripe
        date: new Date(invoice.created * 1000).toISOString(), // Unix timestamp → ISO string
        stripeInvoiceId: invoice.id // Für Download-Links
      };
    });

    // Nach Datum sortieren (neueste zuerst)
    formattedInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log(`✅ ${formattedInvoices.length} Rechnungen erfolgreich formatiert`);
    res.json(formattedInvoices);

  } catch (error) {
    console.error("❌ Fehler beim Laden der Stripe-Rechnungen:", error);
    
    res.status(500).json({
      message: "Fehler beim Laden der Rechnungen",
      details: error.message
    });
  }
});

// 📥 GET /api/invoices/download/:invoiceNumber - Rechnung herunterladen (nach number suchen!)
router.get("/download/:invoiceNumber", verifyToken, async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    console.log(`📥 Download-Request für Rechnung ${invoiceNumber} von ${req.user.email}`);

    // 1. User validieren
    const user = await usersCollection.findOne({
      $or: [
        { _id: new ObjectId(req.user.userId) },
        { email: req.user.email }
      ]
    });

    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ 
        message: "Benutzer oder Stripe-Kunde nicht gefunden" 
      });
    }

    // 2. ✅ RICHTIG: Alle Rechnungen laden und nach NUMBER suchen!
    console.log(`🔍 Suche Rechnung mit Number: ${invoiceNumber} für Customer: ${user.stripeCustomerId}`);
    
    const invoicesList = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 100 // Mehr Rechnungen laden für Suche
    });

    // 3. Rechnung nach NUMBER finden
    const invoice = invoicesList.data.find(inv => inv.number === invoiceNumber);

    if (!invoice) {
      console.warn(`⚠️ Rechnung mit Number ${invoiceNumber} nicht gefunden für User ${req.user.email}`);
      return res.status(404).json({ 
        message: "Rechnung nicht gefunden" 
      });
    }

    console.log(`✅ Rechnung gefunden: ID=${invoice.id}, Number=${invoice.number}`);

    // 4. Erst versuchen, unsere custom PDF aus MongoDB zu finden
    try {
      console.log(`🔍 Suche Custom PDF: Email=${req.user.email}, InvoiceNumber=${invoiceNumber}`);

      const customInvoice = await invoicesCollection.findOne({
        customerEmail: req.user.email,
        invoiceNumber: invoiceNumber
      });

      console.log(`📋 Custom Invoice gefunden: ${customInvoice ? 'JA' : 'NEIN'}`);

      if (customInvoice) {
        console.log(`📄 Custom Invoice Details:`, {
          invoiceNumber: customInvoice.invoiceNumber,
          customerEmail: customInvoice.customerEmail,
          hasFile: customInvoice.file ? 'JA' : 'NEIN',
          fileSize: customInvoice.file ? customInvoice.file.length : 0
        });
      }

      if (customInvoice && customInvoice.file) {
        console.log(`✅ Custom PDF wird gesendet für Rechnung ${invoiceNumber}`);

        // Custom PDF als Download senden
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Rechnung-${invoiceNumber}.pdf"`);

        // PDF Buffer direkt senden
        return res.send(customInvoice.file);
      } else {
        console.log(`❌ Keine Custom PDF gefunden, verwende Stripe Fallback`);
      }
    } catch (dbError) {
      console.warn(`⚠️ Fehler beim Laden der Custom PDF: ${dbError.message}`);
    }

    // 5. Fallback zu Stripe PDF (falls Custom PDF nicht gefunden)
    if (invoice.invoice_pdf) {
      console.log(`🔄 Fallback zu Stripe PDF für Rechnung ${invoiceNumber}`);
      res.redirect(302, invoice.invoice_pdf);
    } else {
      console.error(`❌ Kein PDF verfügbar für Rechnung ${invoiceNumber}`);
      return res.status(404).json({
        message: "PDF nicht verfügbar für diese Rechnung"
      });
    }

  } catch (error) {
    console.error("❌ Fehler beim Download der Stripe-Rechnung:", error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(404).json({
        message: "Fehler bei Stripe API",
        details: error.message
      });
    }

    res.status(500).json({
      message: "Fehler beim Herunterladen der Rechnung",
      details: error.message
    });
  }
});

module.exports = router;