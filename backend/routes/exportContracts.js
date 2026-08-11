// 📁 backend/routes/exportContracts.js
// Excel-Export für Verträge - Portfolio als Tabelle exportieren (Enterprise only)

const express = require("express");
const router = express.Router();
const Contract = require("../models/Contract");
const ExcelJS = require("exceljs");
const { ObjectId } = require("mongodb");
const { isEnterpriseOrHigher } = require("../constants/subscriptionPlans"); // 📊 Zentrale Plan-Definitionen

// Middleware: Require authentication
const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// 🔐 Middleware: Require Enterprise plan for Excel export
const requireEnterprisePlan = async (req, res, next) => {
  try {
    const usersCollection = req.db?.collection("users") || req.usersCollection;
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    // 11.08.2026: Effektiver Plan inkl. Org-Vererbung — Mitglieder einer zahlenden
    // Organisation haben ihr eigenes Feld auf "free" und wurden hier ausgesperrt.
    const { resolveEffectivePlan } = require('../utils/planAccess');
    const dbConn = req.db || await require('../config/database').connect();
    const plan = await resolveEffectivePlan(dbConn, user);

    if (!isEnterpriseOrHigher(plan)) {
      return res.status(403).json({
        error: 'Excel-Export ist nur für Enterprise verfügbar',
        requiresUpgrade: true,
        feature: 'excel_export',
        upgradeUrl: '/pricing',
        userPlan: plan
      });
    }
    next();
  } catch (error) {
    console.error('❌ Error checking subscription:', error);
    return res.status(500).json({ error: 'Fehler bei der Abo-Überprüfung' });
  }
};

/**
 * GET /api/contracts/export-excel
 * Exportiert alle Verträge des Users als Excel-Datei (Enterprise only)
 */
router.get("/export-excel", requireAuth, requireEnterprisePlan, async (req, res) => {
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

    // ExcelJS Workbook erstellen
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Contract AI';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Verträge', {
      properties: { tabColor: { argb: '3b82f6' } }
    });

    // Spalten definieren mit Breiten
    worksheet.columns = [
      { header: '#', key: 'index', width: 5 },
      { header: 'Vertragsname', key: 'name', width: 30 },
      { header: 'Vertragsart', key: 'type', width: 20 },
      { header: 'Anbieter', key: 'provider', width: 25 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Ordner', key: 'folder', width: 20 },
      { header: 'Betrag', key: 'amount', width: 15 },
      { header: 'Häufigkeit', key: 'frequency', width: 15 },
      { header: 'Laufzeit', key: 'laufzeit', width: 15 },
      { header: 'Kündigungsfrist', key: 'kuendigung', width: 15 },
      { header: 'Ablaufdatum', key: 'expiryDate', width: 15 },
      { header: 'Vertragsnummer', key: 'contractNumber', width: 15 },
      { header: 'Kundennummer', key: 'customerNumber', width: 15 },
      { header: 'Vertragsscore', key: 'contractScore', width: 15 },
      { header: 'Risiko-Score', key: 'riskScore', width: 15 },
      { header: 'Health-Score', key: 'healthScore', width: 15 },
      { header: 'Analysiert', key: 'analyzed', width: 12 },
      { header: 'Hochgeladen am', key: 'uploadedAt', width: 15 },
      { header: 'Zahlungsstatus', key: 'paymentStatus', width: 15 },
      { header: 'Nächste Zahlung', key: 'paymentDueDate', width: 15 },
      { header: 'Auto-Verlängerung', key: 'autoRenew', width: 18 },
      { header: 'Notizen', key: 'notes', width: 30 }
    ];

    // Header-Stil
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '3b82f6' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Helper-Funktionen
    const formatDate = (date) => {
      if (!date) return "-";
      try {
        return new Date(date).toLocaleDateString("de-DE");
      } catch {
        return "-";
      }
    };

    const getProvider = (contract) => {
      if (typeof contract.provider === "string") return contract.provider;
      if (contract.provider && contract.provider.name) return contract.provider.name;
      if (contract.analysis?.parties?.provider) return contract.analysis.parties.provider;
      return "-";
    };

    const getAmount = (contract) => {
      const amount = contract.paymentAmount || contract.amount || contract.baseAmount;
      if (!amount) return "-";
      return `${parseFloat(amount).toFixed(2)} €`;
    };

    const frequencyMap = {
      monthly: "Monatlich",
      yearly: "Jährlich",
      weekly: "Wöchentlich",
      quarterly: "Quartalsweise"
    };

    const statusMap = {
      active: "Aktiv",
      expired: "Abgelaufen",
      cancelled: "Gekündigt",
      pending: "Ausstehend"
    };

    // Daten hinzufügen
    contracts.forEach((contract, index) => {
      worksheet.addRow({
        index: index + 1,
        name: contract.name || contract.title || "Unbenannt",
        type: contract.analysis?.contractType || contract.contractType || "-",
        provider: getProvider(contract),
        status: statusMap[contract.status] || contract.status || "-",
        folder: contract.folderId?.name || "Keine Zuordnung",
        amount: getAmount(contract),
        frequency: frequencyMap[contract.paymentFrequency] || contract.paymentFrequency || "-",
        laufzeit: contract.laufzeit || "-",
        kuendigung: contract.kuendigung || "-",
        expiryDate: formatDate(contract.expiryDate),
        contractNumber: contract.contractNumber || "-",
        customerNumber: contract.customerNumber || "-",
        contractScore: contract.contractScore ? `${contract.contractScore}/100` : "-",
        riskScore: contract.legalPulse?.riskScore ? `${contract.legalPulse.riskScore}/100` : "-",
        healthScore: contract.legalPulse?.healthScore ? `${contract.legalPulse.healthScore}/100` : "-",
        analyzed: contract.analyzed ? "Ja" : "Nein",
        uploadedAt: formatDate(contract.uploadedAt),
        paymentStatus: contract.paymentStatus === "paid" ? "Bezahlt" : contract.paymentStatus === "unpaid" ? "Offen" : "-",
        paymentDueDate: formatDate(contract.paymentDueDate),
        autoRenew: contract.autoRenewMonths ? `${contract.autoRenewMonths} Monate` : "-",
        notes: contract.notes || "-"
      });
    });

    // Alternating row colors für bessere Lesbarkeit
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F3F4F6' }
        };
      }
    });

    // Excel-Buffer generieren
    const excelBuffer = await workbook.xlsx.writeBuffer();

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
