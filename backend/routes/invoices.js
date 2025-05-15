const express = require("express");
const router = express.Router();
const { MongoClient } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";

// GET /invoices/me – alle Rechnungen des aktuellen Nutzers
router.get("/me", verifyToken, async (req, res) => {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db("contract_ai");
    const invoicesCollection = db.collection("invoices");

    const userEmail = req.user.email;

    const invoices = await invoicesCollection
      .find({ customerEmail: userEmail })
      .sort({ invoiceNumber: -1 })
      .project({ file: 0 })
      .toArray();

    res.json(invoices);
    await client.close();
  } catch (err) {
    console.error("❌ Fehler beim Abrufen der Rechnungen:", err);
    res.status(500).json({ error: "Interner Serverfehler" });
  }
});

// GET /invoices/download/:invoiceNumber – einzelne Rechnung downloaden
router.get("/download/:invoiceNumber", verifyToken, async (req, res) => {
  const invoiceNumber = parseInt(req.params.invoiceNumber);

  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db("contract_ai");
    const invoicesCollection = db.collection("invoices");

    const invoice = await invoicesCollection.findOne({
      invoiceNumber,
      customerEmail: req.user.email,
    });

    if (!invoice) {
      return res.status(404).json({ error: "Rechnung nicht gefunden" });
    }

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=Rechnung-${invoiceNumber}.pdf`,
    });

    res.send(invoice.file);
    await client.close();
  } catch (err) {
    console.error("❌ Fehler beim Download der Rechnung:", err);
    res.status(500).json({ error: "Interner Serverfehler" });
  }
});

module.exports = router;
