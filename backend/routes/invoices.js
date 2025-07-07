// 📁 backend/routes/invoices.js - ✅ EINFACHE STRIPE VERSION (Schneller Fix)

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

    // 3. Rechnungen für Frontend formatieren (EINFACH)
    const formattedInvoices = stripeInvoices.data.map(invoice => {
      // Einfaches Plan-Mapping basierend auf Betrag (Quick & Dirty aber funktioniert)
      let plan = "business"; // Default
      
      // Alternative: Basierend auf Betrag unterscheiden
      if (invoice.amount_paid >= 2000) { // 20€ oder mehr = Premium
        plan = "premium";
      }
      
      // Oder: Alle als "business" behandeln für jetzt
      // plan = "business";

      return {
        invoiceNumber: invoice.number || invoice.id, // Stripe's Rechnungsnummer
        plan: plan,
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

    // 4. Direkter Link zu Stripe's PDF
    if (invoice.invoice_pdf) {
      console.log(`✅ Weiterleitung zu Stripe PDF für Rechnung ${invoiceNumber}`);
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