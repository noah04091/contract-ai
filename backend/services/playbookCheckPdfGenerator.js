// backend/services/playbookCheckPdfGenerator.js
// PDF-Prüfbericht für Playbook Checks im professionellen Report-Format
const PDFDocument = require("pdfkit");
const path = require("path");

const STATUS_LABELS = {
  passed: { text: "Erfüllt", color: "#10b981" },
  warning: { text: "Warnung", color: "#f59e0b" },
  failed: { text: "Nicht erfüllt", color: "#ef4444" },
  not_found: { text: "Nicht gefunden", color: "#94a3b8" }
};

const PRIORITY_LABELS = {
  muss: "Pflicht",
  soll: "Empfohlen",
  kann: "Optional"
};

/**
 * Generiert einen professionellen Prüfbericht als PDF
 * @param {Object} params
 * @param {Object} params.check - PlaybookCheck Dokument
 * @param {string} params.playbookName - Name des Playbooks
 * @returns {Promise<Buffer>} PDF als Buffer
 */
function generateCheckReportPdf({ check, playbookName }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: "A4"
      });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // Footer-Funktion (Position innerhalb des druckbaren Bereichs)
      const drawFooter = (num) => {
        doc.save();
        doc.fillColor("#94a3b8").fontSize(7).font("Helvetica")
          .text(`Erstellt mit Contract AI — www.contract-ai.de — Seite ${num}`, 50, 780, { width: pageWidth, align: "center", lineBreak: false });
        doc.restore();
      };

      const blue = "#3b82f6";
      const darkGray = "#1e293b";
      const medGray = "#64748b";
      const lightGray = "#94a3b8";
      const pageWidth = 495; // 595 - 2*50 margin

      // === LOGO ===
      try {
        const logoPath = path.join(__dirname, "../assets/logo-contractai.png");
        doc.image(logoPath, 50, 30, { width: 140 });
      } catch {
        doc.fillColor(blue).fontSize(18).font("Helvetica-Bold").text("CONTRACT AI", 50, 35);
      }

      // === TITEL ===
      doc.fillColor(darkGray).fontSize(20).font("Helvetica-Bold")
        .text("Prüfbericht", 50, 80);

      // === META ===
      const today = new Date(check.checkedAt || Date.now()).toLocaleDateString("de-DE", {
        day: "2-digit", month: "long", year: "numeric"
      });

      doc.fillColor(medGray).fontSize(10).font("Helvetica");
      let y = 110;
      doc.text(`Vertrag: ${check.contractName || "Unbenannt"}`, 50, y);
      y += 16;
      doc.text(`Playbook: ${playbookName || "—"}`, 50, y);
      y += 16;
      doc.text(`Datum: ${today}`, 50, y);
      y += 30;

      // === SCORE ===
      const score = check.summary?.overallScore || 0;
      const scoreColor = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

      doc.save();
      doc.circle(100, y + 30, 30).lineWidth(3).strokeColor(scoreColor).stroke();
      doc.fillColor(scoreColor).fontSize(24).font("Helvetica-Bold")
        .text(String(score), 75, y + 18, { width: 50, align: "center" });
      doc.fillColor(lightGray).fontSize(8).font("Helvetica")
        .text("von 100", 75, y + 42, { width: 50, align: "center" });
      doc.restore();

      // Stats rechts neben Score
      const sx = 160;
      doc.fillColor(darkGray).fontSize(10).font("Helvetica-Bold")
        .text("Zusammenfassung", sx, y);
      y += 2;
      doc.font("Helvetica").fontSize(9).fillColor(medGray);
      doc.text(`${check.summary?.passed || 0} Erfüllt  |  ${check.summary?.warnings || 0} Warnung  |  ${check.summary?.failed || 0} Nicht erfüllt  |  ${check.summary?.notFound || 0} Nicht gefunden`, sx, y + 16);
      y += 32;

      // Empfehlung
      if (check.summary?.recommendation) {
        doc.text(check.summary.recommendation, sx, y + 8, { width: pageWidth - 120 });
      }
      y += 80;

      // === TRENNLINIE ===
      doc.moveTo(50, y).lineTo(545, y).lineWidth(0.5).strokeColor("#e2e8f0").stroke();
      y += 15;

      // === EINZELERGEBNISSE ===
      doc.fillColor(darkGray).fontSize(14).font("Helvetica-Bold")
        .text("Einzelergebnisse", 50, y);
      y += 25;

      const results = check.results || [];
      let currentPage = 1;
      for (const result of results) {
        // Seitenumbruch wenn nötig
        if (y > 720) {
          drawFooter(currentPage);
          doc.addPage();
          currentPage++;
          y = 50;
        }

        const statusInfo = STATUS_LABELS[result.status] || STATUS_LABELS.not_found;

        // Status-Punkt + Titel
        doc.circle(58, y + 5, 4).fill(statusInfo.color);
        doc.fillColor(darkGray).fontSize(10).font("Helvetica-Bold")
          .text(result.ruleTitle, 70, y, { width: pageWidth - 100 });

        // Priorität + Status rechts
        const prioText = PRIORITY_LABELS[result.rulePriority] || "";
        doc.fillColor(lightGray).fontSize(7).font("Helvetica")
          .text(`${prioText} | ${statusInfo.text}`, 430, y + 1, { width: 120, align: "right" });

        y += 18;

        // Finding
        if (result.finding) {
          doc.fillColor(medGray).fontSize(8).font("Helvetica")
            .text(result.finding, 70, y, { width: pageWidth - 30 });
          y += doc.heightOfString(result.finding, { width: pageWidth - 30, fontSize: 8 }) + 6;
        }

        // Abweichung
        if (result.deviation) {
          doc.fillColor("#ef4444").fontSize(8).font("Helvetica-Bold")
            .text("Abweichung: ", 70, y, { continued: true });
          doc.fillColor(medGray).font("Helvetica")
            .text(result.deviation, { width: pageWidth - 30 });
          y += doc.heightOfString("Abweichung: " + result.deviation, { width: pageWidth - 30, fontSize: 8 }) + 6;
        }

        // Alternativtext
        if (result.alternativeText) {
          doc.fillColor("#059669").fontSize(8).font("Helvetica-Bold")
            .text("Empfehlung: ", 70, y, { continued: true });
          doc.fillColor(medGray).font("Helvetica")
            .text(result.alternativeText, { width: pageWidth - 30 });
          y += doc.heightOfString("Empfehlung: " + result.alternativeText, { width: pageWidth - 30, fontSize: 8 }) + 6;
        }

        // Verhandlungstipp
        if (result.negotiationTip) {
          doc.fillColor(blue).fontSize(8).font("Helvetica-Bold")
            .text("Verhandlungstipp: ", 70, y, { continued: true });
          doc.fillColor(medGray).font("Helvetica")
            .text(result.negotiationTip, { width: pageWidth - 30 });
          y += doc.heightOfString("Verhandlungstipp: " + result.negotiationTip, { width: pageWidth - 30, fontSize: 8 }) + 6;
        }

        // Trennlinie
        y += 4;
        doc.moveTo(70, y).lineTo(545, y).lineWidth(0.3).strokeColor("#f1f5f9").stroke();
        y += 12;
      }

      // Footer auf letzter Seite
      drawFooter(currentPage);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateCheckReportPdf };
