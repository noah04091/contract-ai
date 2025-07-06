// 📁 backend/routes/invoices.js - KORRIGIERT: parseInt Problem behoben

const express = require("express");
const router = express.Router();
const { MongoClient } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";

// GET /invoices/me – alle Rechnungen des aktuellen Nutzers
router.get("/me", verifyToken, async (req, res) => {
  try {
    console.log("🔍 Lade Rechnungen für User:", req.user.email);

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db("contract_ai");
    const invoicesCollection = db.collection("invoices");

    const userEmail = req.user.email;

    // Rechnungen laden und sortieren
    const invoices = await invoicesCollection
      .find({ customerEmail: userEmail })
      .sort({ createdAt: -1 }) // Neueste zuerst - nach Datum sortiert
      .project({ file: 0 }) // PDF-Datei nicht laden (zu groß für API Response)
      .toArray();

    console.log(`📊 ${invoices.length} Rechnungen gefunden für ${userEmail}`);

    // Rechnungen für Frontend formatieren
    const formattedInvoices = invoices.map(invoice => ({
      invoiceNumber: invoice.invoiceNumber,
      plan: invoice.plan,
      amount: Math.round(invoice.amount * 100), // Frontend erwartet Cent-Werte
      date: invoice.createdAt ? invoice.createdAt.toISOString() : invoice.date
    }));

    res.json(formattedInvoices);
    await client.close();

  } catch (err) {
    console.error("❌ Fehler beim Abrufen der Rechnungen:", err);
    res.status(500).json({ 
      error: "Interner Serverfehler",
      message: "Fehler beim Laden der Rechnungen",
      details: err.message 
    });
  }
});

// GET /invoices/download/:invoiceNumber – einzelne Rechnung downloaden
router.get("/download/:invoiceNumber", verifyToken, async (req, res) => {
  // ✅ KRITISCHER FIX: Kein parseInt! invoiceNumber ist ein String wie "CA-2025-00001"
  const invoiceNumber = req.params.invoiceNumber; // ← GEÄNDERT: Kein parseInt mehr!

  try {
    console.log(`📥 Download-Request für Rechnung ${invoiceNumber} von ${req.user.email}`);

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db("contract_ai");
    const invoicesCollection = db.collection("invoices");

    // Rechnung finden und Berechtigung prüfen
    const invoice = await invoicesCollection.findOne({
      invoiceNumber: invoiceNumber, // String-Vergleich, nicht Number!
      customerEmail: req.user.email, // Sicherheit: User kann nur eigene Rechnungen laden
    });

    if (!invoice) {
      console.warn(`⚠️ Rechnung ${invoiceNumber} nicht gefunden oder kein Zugriff für ${req.user.email}`);
      await client.close();
      return res.status(404).json({ error: "Rechnung nicht gefunden" });
    }

    if (!invoice.file) {
      console.error(`❌ PDF-Datei fehlt für Rechnung ${invoiceNumber}`);
      await client.close();
      return res.status(404).json({ error: "PDF-Datei nicht verfügbar" });
    }

    console.log(`✅ Sende PDF für Rechnung ${invoiceNumber} (${invoice.file.length} bytes)`);

    // PDF-Headers setzen
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Rechnung-${invoiceNumber}.pdf"`,
      "Content-Length": invoice.file.length
    });

    // PDF-Buffer senden
    res.send(invoice.file);
    await client.close();

  } catch (err) {
    console.error("❌ Fehler beim Download der Rechnung:", err);
    res.status(500).json({ 
      error: "Interner Serverfehler",
      message: "Fehler beim Herunterladen der Rechnung",
      details: err.message 
    });
  }
});

// 📊 GET /invoices/stats - Rechnung-Statistiken (optional, für Dashboard)
router.get("/stats", verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    console.log("📊 Lade Rechnung-Statistiken für:", userEmail);

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db("contract_ai");
    const invoicesCollection = db.collection("invoices");

    // Aggregation für Statistiken
    const stats = await invoicesCollection.aggregate([
      { $match: { customerEmail: userEmail } },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          lastInvoice: { $max: "$createdAt" },
          planBreakdown: {
            $push: {
              plan: "$plan",
              amount: "$amount",
              date: "$createdAt"
            }
          }
        }
      }
    ]).toArray();

    const result = stats.length > 0 ? stats[0] : {
      totalInvoices: 0,
      totalAmount: 0,
      lastInvoice: null,
      planBreakdown: []
    };

    // Plan-Aufschlüsselung
    const planSummary = {};
    result.planBreakdown.forEach(item => {
      if (!planSummary[item.plan]) {
        planSummary[item.plan] = { count: 0, total: 0 };
      }
      planSummary[item.plan].count++;
      planSummary[item.plan].total += item.amount;
    });

    res.json({
      userEmail: userEmail,
      totalInvoices: result.totalInvoices,
      totalAmount: result.totalAmount,
      lastInvoice: result.lastInvoice,
      planSummary: planSummary,
      timestamp: new Date().toISOString()
    });

    await client.close();

  } catch (error) {
    console.error("❌ Fehler bei Invoice Stats:", error);
    res.status(500).json({ 
      error: "Interner Serverfehler",
      message: "Fehler beim Laden der Statistiken",
      details: error.message 
    });
  }
});

// 🔍 GET /invoices/debug - Debug-Info (nur Development)
router.get("/debug", verifyToken, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: "Debug-Route nur in Development verfügbar" });
  }

  try {
    const userEmail = req.user.email;
    console.log("🔍 Invoice Debug für:", userEmail);
    
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db("contract_ai");
    const invoicesCollection = db.collection("invoices");
    
    // Alle Rechnungen in DB zählen
    const totalInvoicesInDB = await invoicesCollection.countDocuments();
    
    // User-spezifische Rechnungen
    const userInvoices = await invoicesCollection
      .find({ customerEmail: userEmail })
      .toArray();

    // Beispiel-Rechnung Struktur
    const sampleInvoice = await invoicesCollection.findOne({});

    res.json({
      userEmail: userEmail,
      totalInvoicesInDB: totalInvoicesInDB,
      userInvoicesCount: userInvoices.length,
      userInvoices: userInvoices.map(inv => ({
        invoiceNumber: inv.invoiceNumber,
        plan: inv.plan,
        amount: inv.amount,
        date: inv.createdAt,
        hasFile: !!inv.file,
        fileSize: inv.file ? inv.file.length : 0,
        invoiceNumberType: typeof inv.invoiceNumber
      })),
      sampleInvoiceStructure: sampleInvoice ? {
        fields: Object.keys(sampleInvoice),
        hasFile: !!sampleInvoice.file,
        fileType: sampleInvoice.file ? typeof sampleInvoice.file : null,
        invoiceNumberExample: sampleInvoice.invoiceNumber,
        invoiceNumberType: typeof sampleInvoice.invoiceNumber
      } : null,
      collectionExists: !!invoicesCollection,
      note: "invoiceNumber wird jetzt als String behandelt (kein parseInt mehr!)"
    });

    await client.close();

  } catch (error) {
    console.error("❌ Debug Fehler:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;