// 📁 backend/routes/exportContracts.js
// Excel-Export für Verträge - Portfolio als Tabelle exportieren

const express = require("express");
const router = express.Router();
const Contract = require("../models/Contract");
const xlsx = require("xlsx");

// Middleware: Require authentication
const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

/**
 * GET /api/contracts/export-excel
 * Exportiert alle Verträge des Users als Excel-Datei
 */
router.get("/export-excel", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Alle Verträge des Users laden
    const contracts = await Contract.find({ userId })
      .populate("folderId", "name")
      .sort({ uploadedAt: -1 })
      .lean();

    if (!contracts || contracts.length === 0) {
      return res.status(404).json({ error: "Keine Verträge gefunden" });
    }

    // Daten für Excel aufbereiten
    const excelData = contracts.map((contract, index) => {
      // Helper: Sicherer Zugriff auf nested Felder
      const getName = () => contract.name || contract.title || "Unbenannt";
      const getType = () => contract.analysis?.contractType || contract.contractType || "-";
      const getProvider = () => {
        if (typeof contract.provider === "string") return contract.provider;
        if (contract.provider && contract.provider.name) return contract.provider.name;
        if (contract.analysis?.parties?.provider) return contract.analysis.parties.provider;
        return "-";
      };
      const getAmount = () => {
        const amount = contract.paymentAmount || contract.amount || contract.baseAmount;
        if (!amount) return "-";
        return `${parseFloat(amount).toFixed(2)} €`;
      };
      const getFrequency = () => {
        const freq = contract.paymentFrequency;
        const map = {
          monthly: "Monatlich",
          yearly: "Jährlich",
          weekly: "Wöchentlich",
          quarterly: "Quartalsweise"
        };
        return map[freq] || freq || "-";
      };
      const getStatus = () => {
        const status = contract.status;
        const map = {
          active: "Aktiv",
          expired: "Abgelaufen",
          cancelled: "Gekündigt",
          pending: "Ausstehend"
        };
        return map[status] || status || "-";
      };
      const getFolder = () => contract.folderId?.name || "Keine Zuordnung";
      const formatDate = (date) => {
        if (!date) return "-";
        try {
          return new Date(date).toLocaleDateString("de-DE");
        } catch {
          return "-";
        }
      };

      return {
        "#": index + 1,
        "Vertragsname": getName(),
        "Vertragsart": getType(),
        "Anbieter": getProvider(),
        "Status": getStatus(),
        "Ordner": getFolder(),
        "Betrag": getAmount(),
        "Häufigkeit": getFrequency(),
        "Laufzeit": contract.laufzeit || "-",
        "Kündigungsfrist": contract.kuendigung || "-",
        "Ablaufdatum": formatDate(contract.expiryDate),
        "Vertragsnummer": contract.contractNumber || "-",
        "Kundennummer": contract.customerNumber || "-",
        "Vertragsscore": contract.contractScore ? `${contract.contractScore}/100` : "-",
        "Risiko-Score": contract.legalPulse?.riskScore ? `${contract.legalPulse.riskScore}/100` : "-",
        "Health-Score": contract.legalPulse?.healthScore ? `${contract.legalPulse.healthScore}/100` : "-",
        "Analysiert": contract.analyzed ? "Ja" : "Nein",
        "Hochgeladen am": formatDate(contract.uploadedAt),
        "Zahlungsstatus": contract.paymentStatus === "paid" ? "Bezahlt" : contract.paymentStatus === "unpaid" ? "Offen" : "-",
        "Nächste Zahlung": formatDate(contract.paymentDueDate),
        "Auto-Verlängerung": contract.autoRenewMonths ? `${contract.autoRenewMonths} Monate` : "-",
        "Notizen": contract.notes || "-"
      };
    });

    // Excel-Arbeitsmappe erstellen
    const worksheet = xlsx.utils.json_to_sheet(excelData);

    // Spaltenbreiten optimieren
    const columnWidths = [
      { wch: 5 },   // #
      { wch: 30 },  // Vertragsname
      { wch: 20 },  // Vertragsart
      { wch: 25 },  // Anbieter
      { wch: 12 },  // Status
      { wch: 20 },  // Ordner
      { wch: 15 },  // Betrag
      { wch: 15 },  // Häufigkeit
      { wch: 15 },  // Laufzeit
      { wch: 15 },  // Kündigungsfrist
      { wch: 15 },  // Ablaufdatum
      { wch: 15 },  // Vertragsnummer
      { wch: 15 },  // Kundennummer
      { wch: 15 },  // Vertragsscore
      { wch: 15 },  // Risiko-Score
      { wch: 15 },  // Health-Score
      { wch: 12 },  // Analysiert
      { wch: 15 },  // Hochgeladen am
      { wch: 15 },  // Zahlungsstatus
      { wch: 15 },  // Nächste Zahlung
      { wch: 18 },  // Auto-Verlängerung
      { wch: 30 }   // Notizen
    ];
    worksheet["!cols"] = columnWidths;

    // Arbeitsmappe erstellen
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Verträge");

    // Excel-Buffer generieren
    const excelBuffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Dateinamen mit Datum generieren
    const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const filename = `Contract_AI_Portfolio_${timestamp}.xlsx`;

    // Response mit Excel-Datei
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(excelBuffer);

    console.log(`✅ [Excel Export] ${contracts.length} Verträge exportiert für User ${userId}`);
  } catch (error) {
    console.error("❌ [Excel Export] Error:", error);
    res.status(500).json({
      error: "Excel-Export fehlgeschlagen",
      details: error.message
    });
  }
});

module.exports = router;
