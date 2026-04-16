// backend/services/clauseLibraryPdf.js
// PDF-Generator fuer Klausel-Bibliothek (einzelne Klauseln + Sammlungen)
const PDFDocument = require("pdfkit");
const path = require("path");

const COLORS = {
  primary: "#10b981",
  primaryDark: "#059669",
  text: "#1e293b",
  textSecondary: "#64748b",
  muted: "#94a3b8",
  border: "#e2e8f0",
  bgLight: "#f8fafc",
  bgAccent: "#f0fdf4",
  risky: "#dc2626",
  goodPractice: "#16a34a",
  important: "#d97706",
  unusual: "#7c3aed",
  standard: "#0ea5e9"
};

const CATEGORY_LABELS = {
  risky: "Riskant",
  good_practice: "Best Practice",
  important: "Wichtig",
  unusual: "Ungewöhnlich",
  standard: "Standard"
};

const RISK_LABELS = {
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig"
};

const AREA_LABELS = {
  liability: "Haftung",
  termination: "Kündigung",
  payment: "Zahlung",
  confidentiality: "Vertraulichkeit",
  intellectual_property: "Geistiges Eigentum",
  warranty: "Gewährleistung",
  force_majeure: "Höhere Gewalt",
  dispute: "Streitbeilegung",
  data_protection: "Datenschutz",
  non_compete: "Wettbewerbsverbot",
  other: "Sonstiges"
};

const categoryColor = (category) => COLORS[
  category === "good_practice" ? "goodPractice" : category
] || COLORS.textSecondary;

/**
 * Generiert ein professionelles PDF fuer Klausel-Bibliothek.
 *
 * @param {Object} params
 * @param {string} params.title - Haupttitel
 * @param {string} [params.subtitle] - Untertitel/Beschreibung
 * @param {Array} params.sections - [{ title, category, meta, text, notes }]
 * @param {string} [params.mode] - "single" | "collection" (nur fuer Deckblatt)
 * @returns {Promise<Buffer>}
 */
function generateClauseLibraryPdf({ title, subtitle, sections = [], mode = "collection" }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 60, bottom: 60, left: 50, right: 50 },
        bufferPages: true,
        info: {
          Title: title || "Klausel-Export",
          Author: "Contract AI",
          Creator: "Contract AI"
        }
      });

      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const contentLeft = 50;
      const contentRight = pageWidth - 50;
      const contentWidth = contentRight - contentLeft;

      const today = new Date().toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      });

      // ========================================
      // DECKBLATT
      // ========================================
      try {
        const logoPath = path.join(__dirname, "../assets/logo-contractai.png");
        doc.image(logoPath, contentLeft, 50, { width: 140 });
      } catch (err) {
        doc.fillColor(COLORS.text)
          .fontSize(16)
          .font("Helvetica-Bold")
          .text("CONTRACT AI", contentLeft, 55);
      }

      // Oben rechts: Erstellungsdatum
      doc.fillColor(COLORS.muted)
        .fontSize(9)
        .font("Helvetica")
        .text(`Erstellt am ${today}`, contentLeft, 62, {
          width: contentWidth,
          align: "right"
        });

      // Trennlinie
      doc.moveTo(contentLeft, 130)
        .lineTo(contentRight, 130)
        .strokeColor(COLORS.border)
        .lineWidth(1)
        .stroke();

      // Label
      doc.fillColor(COLORS.primary)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text(
          mode === "single" ? "KLAUSEL" : "KLAUSEL-SAMMLUNG",
          contentLeft,
          155,
          { characterSpacing: 1.5 }
        );

      // Haupttitel
      doc.fillColor(COLORS.text)
        .fontSize(26)
        .font("Helvetica-Bold")
        .text(title || "Klausel-Export", contentLeft, 175, {
          width: contentWidth,
          lineGap: 4
        });

      let coverY = doc.y + 8;

      // Untertitel / Beschreibung
      if (subtitle) {
        doc.fillColor(COLORS.textSecondary)
          .fontSize(11)
          .font("Helvetica")
          .text(subtitle, contentLeft, coverY, {
            width: contentWidth,
            lineGap: 2
          });
        coverY = doc.y + 10;
      }

      // Anzahl Sektionen
      if (sections.length > 1) {
        doc.fillColor(COLORS.muted)
          .fontSize(10)
          .font("Helvetica")
          .text(
            `${sections.length} ${sections.length === 1 ? "Eintrag" : "Einträge"}`,
            contentLeft,
            coverY
          );
        coverY = doc.y + 4;
      }

      // Abstand vor Content
      doc.y = Math.max(coverY + 20, 280);

      // ========================================
      // INHALT — Sektionen
      // ========================================
      sections.forEach((section, idx) => {
        const safeTitle = section.title || "Ohne Titel";
        const text = (section.text || "").trim();
        const catLabel = section.category && CATEGORY_LABELS[section.category]
          ? CATEGORY_LABELS[section.category]
          : section.category;
        const catColor = categoryColor(section.category);

        // Platz-Check: mindestens 120pt frei fuer Header + erste Zeilen
        if (doc.y > pageHeight - 160) {
          doc.addPage();
        }

        const sectionTop = doc.y;

        // Kleine Nummer + Kategorie-Badge
        doc.fillColor(COLORS.muted)
          .fontSize(9)
          .font("Helvetica")
          .text(`${idx + 1} / ${sections.length}`, contentLeft, sectionTop);

        if (catLabel) {
          const badgeText = catLabel.toUpperCase();
          const badgeWidth = doc.widthOfString(badgeText) + 14;
          const badgeX = contentRight - badgeWidth;
          const badgeY = sectionTop - 1;

          doc.roundedRect(badgeX, badgeY, badgeWidth, 16, 4)
            .fillColor(catColor)
            .fillOpacity(0.12)
            .fill()
            .fillOpacity(1);

          doc.fillColor(catColor)
            .fontSize(8)
            .font("Helvetica-Bold")
            .text(badgeText, badgeX + 7, badgeY + 4, {
              characterSpacing: 0.5
            });
        }

        // Titel
        doc.fillColor(COLORS.text)
          .fontSize(15)
          .font("Helvetica-Bold")
          .text(safeTitle, contentLeft, sectionTop + 20, {
            width: contentWidth,
            lineGap: 2
          });

        // Meta-Zeile (optional)
        if (section.meta && section.meta.length > 0) {
          const metaText = section.meta.filter(Boolean).join("  \u2022  ");
          if (metaText) {
            doc.fillColor(COLORS.textSecondary)
              .fontSize(9)
              .font("Helvetica")
              .text(metaText, contentLeft, doc.y + 4, {
                width: contentWidth,
                lineGap: 1
              });
          }
        }

        // Klauseltext (Hauptinhalt)
        if (text) {
          const textY = doc.y + 10;
          doc.fillColor(COLORS.text)
            .fontSize(10.5)
            .font("Helvetica")
            .text(text, contentLeft, textY, {
              width: contentWidth,
              lineGap: 3,
              align: "justify"
            });
        }

        // Notizen (falls vorhanden) — als abgesetzter Block
        if (section.notes && section.notes.trim()) {
          const notesY = doc.y + 10;

          // Pruefen ob genug Platz fuer den Notes-Block
          if (notesY > pageHeight - 120) {
            doc.addPage();
          }

          const notesStartY = doc.y + 10;
          doc.fillColor(COLORS.muted)
            .fontSize(8)
            .font("Helvetica-Bold")
            .text("NOTIZEN", contentLeft, notesStartY, {
              characterSpacing: 1
            });

          doc.fillColor(COLORS.textSecondary)
            .fontSize(10)
            .font("Helvetica-Oblique")
            .text(section.notes.trim(), contentLeft, doc.y + 3, {
              width: contentWidth,
              lineGap: 2
            });
        }

        // Trennlinie zwischen Sektionen (nicht nach letzter)
        if (idx < sections.length - 1) {
          const sepY = doc.y + 20;
          if (sepY < pageHeight - 80) {
            doc.moveTo(contentLeft, sepY)
              .lineTo(contentRight, sepY)
              .strokeColor(COLORS.border)
              .lineWidth(0.5)
              .stroke();
            doc.y = sepY + 20;
          } else {
            doc.addPage();
          }
        }
      });

      // ========================================
      // FOOTER auf allen Seiten
      // WICHTIG: lineBreak: false verhindert dass PDFKit neue Seiten erstellt,
      // wenn der Footer am Seitenende positioniert wird.
      // ========================================
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        const footerY = pageHeight - 35;

        doc.moveTo(contentLeft, footerY - 8)
          .lineTo(contentRight, footerY - 8)
          .strokeColor(COLORS.border)
          .lineWidth(0.5)
          .stroke();

        doc.fillColor(COLORS.muted)
          .fontSize(8)
          .font("Helvetica");

        doc.text(
          "Erstellt mit Contract AI \u2022 contract-ai.de",
          contentLeft,
          footerY,
          { width: contentWidth / 2, align: "left", lineBreak: false }
        );

        doc.text(
          `Seite ${i - range.start + 1} von ${range.count}`,
          contentLeft + contentWidth / 2,
          footerY,
          { width: contentWidth / 2, align: "right", lineBreak: false }
        );
      }

      // flushPages bevor end() — verhindert dass durch Footer entstandene Auto-Pages noch hinzukommen
      doc.flushPages();
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateClauseLibraryPdf,
  CATEGORY_LABELS,
  RISK_LABELS,
  AREA_LABELS
};
