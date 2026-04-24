// backend/services/negotiationLetterGenerator.js
// Generiert professionellen Verhandlungsbrief basierend auf Playbook-Check-Ergebnis
const { OpenAI } = require("openai");
const PDFDocument = require("pdfkit");
const path = require("path");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generiert einen Verhandlungsbrief-Text basierend auf einem Playbook-Check
 * @param {Object} params
 * @param {Object} params.check - PlaybookCheck Dokument
 * @param {string} params.playbookName - Name des Playbooks
 * @param {string} params.role - "auftraggeber" | "auftragnehmer" | "neutral"
 * @returns {Promise<string>} Brief-Text
 */
async function generateNegotiationLetter({ check, playbookName, role }) {
  const roleLabel = role === "auftraggeber" ? "Auftraggeber"
    : role === "auftragnehmer" ? "Auftragnehmer"
    : "Vertragspartei";

  // Nur problematische Regeln im Brief erwähnen
  const issues = (check.results || []).filter(r =>
    r.status === "failed" || r.status === "warning" || r.status === "not_found"
  );

  if (issues.length === 0) {
    return "Alle Anforderungen sind erfüllt. Es besteht kein Nachverhandlungsbedarf.";
  }

  const issuesList = issues.map((r, i) => {
    const parts = [`${i + 1}. ${r.ruleTitle} (${r.status === "failed" ? "Nicht erfüllt" : r.status === "warning" ? "Abweichung" : "Fehlt im Vertrag"})`];
    if (r.finding) parts.push(`   Aktuell im Vertrag: ${r.finding}`);
    if (r.deviation) parts.push(`   Problem: ${r.deviation}`);
    if (r.alternativeText) parts.push(`   Gewünschte Formulierung: ${r.alternativeText}`);
    return parts.join("\n");
  }).join("\n\n");

  const prompt = `Du bist ein erfahrener deutscher Wirtschaftsjurist und schreibst einen professionellen Verhandlungsbrief.

KONTEXT:
- Perspektive: ${roleLabel}
- Vertrag: "${check.contractName || "Unbenannt"}"
- Playbook: "${playbookName}"
- Gesamtscore: ${check.summary?.overallScore || 0}/100
- ${issues.length} Punkte müssen nachverhandelt werden

NACHVERHANDLUNGSPUNKTE:
${issuesList}

AUFGABE:
Schreibe einen professionellen, diplomatischen Verhandlungsbrief an den Vertragspartner. Der Brief soll:
1. Höflich aber bestimmt formuliert sein
2. Jeden Nachverhandlungspunkt klar benennen
3. Konkrete Alternativformulierungen vorschlagen
4. Den Vertragspartner zur Anpassung auffordern
5. Professionell und geschäftsmäßig klingen

Format: Normaler Brieftext (kein HTML, kein Markdown). Absätze durch Leerzeilen trennen.
Beginne mit "Sehr geehrte Damen und Herren," und ende mit "Mit freundlichen Grüßen".`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "Du schreibst professionelle deutsche Geschäftsbriefe. Kein Markdown, kein HTML — nur Reintext." },
      { role: "user", content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 2000
  });

  return response.choices[0]?.message?.content || "Brief konnte nicht generiert werden.";
}

/**
 * Generiert den Verhandlungsbrief als PDF
 * @param {Object} params
 * @param {string} params.letterText - Der Brief-Text
 * @param {string} params.contractName - Vertragsname
 * @returns {Promise<Buffer>} PDF Buffer
 */
function generateNegotiationLetterPdf({ letterText, contractName }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 0, size: "A4" });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      const blue = "#3b82f6";
      const darkGray = "#1e293b";
      const lightGray = "#94a3b8";

      // Logo
      try {
        const logoPath = path.join(__dirname, "../assets/logo-contractai.png");
        doc.image(logoPath, 50, 30, { width: 140 });
      } catch {
        doc.fillColor(blue).fontSize(18).font("Helvetica-Bold").text("CONTRACT AI", 50, 35);
      }

      // Datum rechts oben
      const today = new Date().toLocaleDateString("de-DE", {
        day: "2-digit", month: "long", year: "numeric"
      });
      doc.fillColor(lightGray).fontSize(9).font("Helvetica")
        .text(today, 350, 40, { align: "right", width: 200 });

      // Betreff
      let y = 110;
      doc.fillColor(darkGray).fontSize(11).font("Helvetica-Bold")
        .text(`Betreff: Nachverhandlung — ${contractName || "Vertrag"}`, 50, y);
      y += 30;

      // Brief-Text
      doc.fillColor(darkGray).fontSize(10).font("Helvetica");
      const lines = letterText.split("\n");
      for (const line of lines) {
        if (y > 770) {
          doc.addPage();
          y = 50;
        }
        if (line.trim() === "") {
          y += 8;
        } else {
          doc.text(line, 50, y, { width: 495 });
          y += doc.heightOfString(line, { width: 495, fontSize: 10 }) + 2;
        }
      }

      // Footer
      doc.fillColor(lightGray).fontSize(7).font("Helvetica")
        .text("Erstellt mit Contract AI — www.contract-ai.de", 50, 810, { width: 495, align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateNegotiationLetter,
  generateNegotiationLetterPdf
};
