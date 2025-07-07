// 📁 backend/routes/invoices.js - ✅ STRIPE INVOICES API VERSION (Professional)

const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const { MongoClient, ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");
require("dotenv").config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";

// 🛢️ MongoDB-Verbindung für User-Daten
let usersCollection;
const client = new MongoClient(MONGO_URI);
client.connect()
  .then(() => {
    const db = client.db("contract_ai");
    usersCollection = db.collection("users");
    console.log("✅ Invoices-Route: MongoDB verbunden (für User-Daten)");
  })
  .catch(err => {
    console.error("❌ MongoDB-Verbindung fehlgeschlagen:", err.message);
  });

// 📋 GET /api/invoices/me - Alle Rechnungen des Users (von Stripe API)
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
        message: "Benutzer nicht gefunden",
        error: "USER_NOT_FOUND" 
      });
    }

    if (!user.stripeCustomerId) {
      console.warn("⚠️ Keine Stripe Customer ID für User:", req.user.email);
      return res.json([]); // Leere Liste wenn noch kein Stripe-Kunde
    }

    // 2. Rechnungen von Stripe API laden
    console.log("🔍 Lade Stripe-Rechnungen für Customer:", user.stripeCustomerId);

    const stripeInvoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 50, // Letzte 50 Rechnungen
      status: 'paid', // Nur bezahlte Rechnungen
      expand: ['data.subscription', 'data.subscription.items.data.price']
    });

    console.log(`📊 ${stripeInvoices.data.length} Stripe-Rechnungen gefunden`);

    // 3. Rechnungen für Frontend formatieren
    const formattedInvoices = stripeInvoices.data.map(invoice => {
      // Plan aus der Subscription ermitteln
      let plan = "unknown";
      if (invoice.subscription && invoice.subscription.items && invoice.subscription.items.data.length > 0) {
        const priceId = invoice.subscription.items.data[0].price.id;
        
        // Plan-Mapping basierend auf Price-IDs
        if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
          plan = "business";
        } else if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
          plan = "premium";
        }
      }

      return {
        invoiceNumber: invoice.number || invoice.id, // Stripe's Rechnungsnummer
        plan: plan,
        amount: invoice.amount_paid, // Bereits in Cent von Stripe
        date: new Date(invoice.created * 1000).toISOString(), // Unix timestamp → ISO string
        stripeInvoiceId: invoice.id, // Für Download-Links
        status: invoice.status,
        currency: invoice.currency,
        pdfUrl: invoice.invoice_pdf // Direkter PDF-Link von Stripe
      };
    });

    // Nach Datum sortieren (neueste zuerst)
    formattedInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log(`✅ ${formattedInvoices.length} Rechnungen erfolgreich formatiert`);
    res.json(formattedInvoices);

  } catch (error) {
    console.error("❌ Fehler beim Laden der Stripe-Rechnungen:", error);
    
    // Spezifische Stripe-Fehler behandeln
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        message: "Ungültige Stripe-Anfrage",
        error: "STRIPE_INVALID_REQUEST",
        details: error.message
      });
    }

    res.status(500).json({
      message: "Fehler beim Laden der Rechnungen",
      error: "INTERNAL_SERVER_ERROR",
      details: error.message
    });
  }
});

// 📥 GET /api/invoices/download/:invoiceId - Rechnung herunterladen (Stripe PDF)
router.get("/download/:invoiceId", verifyToken, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    console.log(`📥 Download-Request für Stripe-Rechnung ${invoiceId} von ${req.user.email}`);

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

    // 2. Rechnung von Stripe laden
    const invoice = await stripe.invoices.retrieve(invoiceId);

    // 3. Berechtigung prüfen (gehört die Rechnung zu diesem Kunden?)
    if (invoice.customer !== user.stripeCustomerId) {
      console.warn(`⚠️ Unbefugter Zugriff: Rechnung ${invoiceId} gehört nicht zu User ${req.user.email}`);
      return res.status(403).json({ 
        message: "Keine Berechtigung für diese Rechnung" 
      });
    }

    // 4. Direkter Link zu Stripe's PDF oder Proxy
    if (invoice.invoice_pdf) {
      console.log(`✅ Weiterleitung zu Stripe PDF für Rechnung ${invoiceId}`);
      
      // Option A: Direkte Weiterleitung zu Stripe PDF
      res.redirect(302, invoice.invoice_pdf);
      
      // Option B: Proxy (falls Sie Stripe-Links verstecken wollen)
      // const response = await fetch(invoice.invoice_pdf);
      // const buffer = await response.buffer();
      // res.setHeader('Content-Type', 'application/pdf');
      // res.setHeader('Content-Disposition', `attachment; filename="Rechnung-${invoice.number || invoiceId}.pdf"`);
      // res.send(buffer);
      
    } else {
      console.error(`❌ Kein PDF verfügbar für Rechnung ${invoiceId}`);
      return res.status(404).json({ 
        message: "PDF nicht verfügbar für diese Rechnung" 
      });
    }

  } catch (error) {
    console.error("❌ Fehler beim Download der Stripe-Rechnung:", error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(404).json({
        message: "Rechnung nicht gefunden",
        error: "STRIPE_INVOICE_NOT_FOUND"
      });
    }

    res.status(500).json({
      message: "Fehler beim Herunterladen der Rechnung",
      error: "INTERNAL_SERVER_ERROR",
      details: error.message
    });
  }
});

// 📊 GET /api/invoices/stats - Rechnung-Statistiken (von Stripe API)
router.get("/stats", verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    console.log("📊 Lade Stripe-Rechnung-Statistiken für:", userEmail);

    const user = await usersCollection.findOne({
      $or: [
        { _id: new ObjectId(req.user.userId) },
        { email: req.user.email }
      ]
    });

    if (!user || !user.stripeCustomerId) {
      return res.json({
        userEmail: userEmail,
        totalInvoices: 0,
        totalAmount: 0,
        lastInvoice: null,
        planSummary: {},
        source: "stripe_api"
      });
    }

    // Alle bezahlten Rechnungen von Stripe laden
    const stripeInvoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      status: 'paid',
      limit: 100
    });

    const totalInvoices = stripeInvoices.data.length;
    const totalAmount = stripeInvoices.data.reduce((sum, inv) => sum + inv.amount_paid, 0);
    const lastInvoice = stripeInvoices.data.length > 0 ? 
      new Date(stripeInvoices.data[0].created * 1000).toISOString() : null;

    // Plan-Aufschlüsselung
    const planSummary = {};
    stripeInvoices.data.forEach(invoice => {
      if (invoice.subscription && invoice.subscription.items) {
        const priceId = invoice.subscription.items.data[0]?.price?.id;
        let plan = "unknown";
        
        if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
          plan = "business";
        } else if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
          plan = "premium";
        }

        if (!planSummary[plan]) {
          planSummary[plan] = { count: 0, total: 0 };
        }
        planSummary[plan].count++;
        planSummary[plan].total += invoice.amount_paid;
      }
    });

    res.json({
      userEmail: userEmail,
      stripeCustomerId: user.stripeCustomerId,
      totalInvoices: totalInvoices,
      totalAmount: totalAmount,
      lastInvoice: lastInvoice,
      planSummary: planSummary,
      source: "stripe_api",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Fehler bei Stripe Invoice Stats:", error);
    res.status(500).json({
      message: "Fehler beim Laden der Statistiken",
      error: "INTERNAL_SERVER_ERROR",
      details: error.message
    });
  }
});

// 🔍 GET /api/invoices/debug - Debug-Info (Stripe API Version)
router.get("/debug", verifyToken, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: "Debug-Route nur in Development verfügbar" });
  }

  try {
    const userEmail = req.user.email;
    console.log("🔍 Stripe Invoice Debug für:", userEmail);

    const user = await usersCollection.findOne({
      $or: [
        { _id: new ObjectId(req.user.userId) },
        { email: req.user.email }
      ]
    });

    let stripeInfo = null;
    if (user && user.stripeCustomerId) {
      try {
        // Stripe Customer Info
        const customer = await stripe.customers.retrieve(user.stripeCustomerId);
        const invoices = await stripe.invoices.list({
          customer: user.stripeCustomerId,
          limit: 5
        });

        stripeInfo = {
          customerId: user.stripeCustomerId,
          customerEmail: customer.email,
          invoiceCount: invoices.data.length,
          sampleInvoices: invoices.data.map(inv => ({
            id: inv.id,
            number: inv.number,
            amount: inv.amount_paid,
            status: inv.status,
            created: new Date(inv.created * 1000).toISOString(),
            hasPdf: !!inv.invoice_pdf,
            pdfUrl: inv.invoice_pdf
          }))
        };
      } catch (stripeError) {
        stripeInfo = { error: stripeError.message };
      }
    }

    res.json({
      userEmail: userEmail,
      userId: req.user.userId,
      hasUser: !!user,
      hasStripeCustomerId: !!(user && user.stripeCustomerId),
      stripeInfo: stripeInfo,
      environmentCheck: {
        stripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
        businessPriceId: process.env.STRIPE_BUSINESS_PRICE_ID,
        premiumPriceId: process.env.STRIPE_PREMIUM_PRICE_ID
      },
      apiVersion: "stripe_invoices_api",
      note: "Diese Version verwendet die Stripe Invoices API anstelle von MongoDB"
    });

  } catch (error) {
    console.error("❌ Debug Fehler:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;