/**
 * generateAVV.js
 * Erzeugt einen professionellen Auftragsverarbeitungsvertrag (AVV / DPA)
 * nach Art. 28 DSGVO als PDF — auf Contract AI zugeschnitten.
 *
 * Aufruf:  node backend/scripts/generateAVV.js
 * Ausgabe: <repo-root>/AVV_Contract-AI_v1.0.pdf
 */

const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

// ---------------------------------------------------------------------------
// Layout-Konstanten
// ---------------------------------------------------------------------------
const PAGE = { size: "A4", margin: 64 };
const COLORS = {
  ink: "#1a2230",       // Haupttext (fast schwarz, leicht blaustichig)
  muted: "#5b6573",     // Sekundärtext
  accent: "#1f4e8c",    // Corporate-Blau (kein Lila)
  hair: "#d7dce3",      // Trennlinien
  light: "#f4f6f9",     // Box-Hintergrund
};
const FONT = {
  body: "Helvetica",
  bold: "Helvetica-Bold",
  italic: "Helvetica-Oblique",
};

const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "AVV_Contract-AI_v1.0.pdf");
const SIGNATURE_FONT = "C:\\Windows\\Fonts\\segoesc.ttf"; // Segoe Script

// ---------------------------------------------------------------------------
const doc = new PDFDocument({
  size: PAGE.size,
  margins: { top: PAGE.margin, bottom: PAGE.margin + 14, left: PAGE.margin, right: PAGE.margin },
  bufferPages: true,
  info: {
    Title: "Auftragsverarbeitungsvertrag (AVV) gemäß Art. 28 DSGVO",
    Author: "Contract AI – Noah Liebold",
    Subject: "Auftragsverarbeitung nach Art. 28 DSGVO",
  },
});

const stream = fs.createWriteStream(OUT);
doc.pipe(stream);

let hasSignatureFont = false;
try {
  if (fs.existsSync(SIGNATURE_FONT)) {
    doc.registerFont("Signature", SIGNATURE_FONT);
    hasSignatureFont = true;
  }
} catch (_) { /* fällt auf Oblique zurück */ }

const CONTENT_W = doc.page.width - PAGE.margin * 2;
const BOTTOM = () => doc.page.height - doc.page.margins.bottom;

// ---------------------------------------------------------------------------
// Helfer
// ---------------------------------------------------------------------------
function ensureSpace(need) {
  if (doc.y + need > BOTTOM()) doc.addPage();
}

function gap(h = 10) {
  doc.y += h;
}

function rule(color = COLORS.hair, w = 0.8) {
  const y = doc.y;
  doc.save().lineWidth(w).strokeColor(color)
    .moveTo(PAGE.margin, y).lineTo(PAGE.margin + CONTENT_W, y).stroke().restore();
  doc.y = y + 1;
}

function h1(text) {
  ensureSpace(60);
  gap(6);
  doc.font(FONT.bold).fontSize(13).fillColor(COLORS.accent)
    .text(text, PAGE.margin, doc.y, { width: CONTENT_W });
  gap(3);
  rule(COLORS.hair);
  gap(7);
}

function h2(text) {
  ensureSpace(40);
  gap(4);
  doc.font(FONT.bold).fontSize(10.5).fillColor(COLORS.ink)
    .text(text, PAGE.margin, doc.y, { width: CONTENT_W });
  gap(3);
}

function para(text, opts = {}) {
  ensureSpace(28);
  doc.font(opts.font || FONT.body).fontSize(opts.size || 9.5)
    .fillColor(opts.color || COLORS.ink)
    .text(text, PAGE.margin, doc.y, {
      width: CONTENT_W,
      align: opts.align || "justify",
      lineGap: opts.lineGap != null ? opts.lineGap : 2.2,
    });
  gap(opts.after != null ? opts.after : 6);
}

function bullet(text, opts = {}) {
  ensureSpace(24);
  const indent = opts.indent || 16;
  const x = PAGE.margin + indent;
  const w = CONTENT_W - indent;
  const startY = doc.y;
  doc.font(FONT.bold).fontSize(9.5).fillColor(COLORS.accent)
    .text(opts.marker || "•", PAGE.margin + indent - 12, startY, { width: 10 });
  doc.font(opts.font || FONT.body).fontSize(9.5).fillColor(COLORS.ink)
    .text(text, x, startY, { width: w, align: "left", lineGap: 2 });
  gap(opts.after != null ? opts.after : 4);
}

function lettered(letter, text) {
  ensureSpace(24);
  const indent = 22;
  const x = PAGE.margin + indent;
  const startY = doc.y;
  doc.font(FONT.bold).fontSize(9.5).fillColor(COLORS.ink)
    .text(letter, PAGE.margin + 2, startY, { width: indent - 4 });
  doc.font(FONT.body).fontSize(9.5).fillColor(COLORS.ink)
    .text(text, x, startY, { width: CONTENT_W - indent, align: "left", lineGap: 2 });
  gap(4);
}

// Einfache Zwei-Spalten-Box (Label / Wert) für Parteien
function partyBox(title, rows) {
  ensureSpace(40 + rows.length * 16);
  const boxX = PAGE.margin;
  const startY = doc.y;
  const pad = 12;
  const labelW = 116;

  // Höhe vorab grob schätzen
  doc.font(FONT.body).fontSize(9.5);
  let innerY = startY + pad + 20;
  const lineHeights = rows.map((r) => {
    const h = doc.heightOfString(r[1], { width: CONTENT_W - 2 * pad - labelW, lineGap: 1.5 });
    return Math.max(h, 12);
  });
  const totalH = pad + 18 + lineHeights.reduce((a, b) => a + b + 5, 0) + pad - 5;

  doc.save().roundedRect(boxX, startY, CONTENT_W, totalH, 6)
    .fillAndStroke(COLORS.light, COLORS.hair).restore();

  doc.font(FONT.bold).fontSize(10).fillColor(COLORS.accent)
    .text(title, boxX + pad, startY + pad, { width: CONTENT_W - 2 * pad });

  innerY = startY + pad + 20;
  rows.forEach((r, i) => {
    doc.font(FONT.bold).fontSize(9).fillColor(COLORS.muted)
      .text(r[0], boxX + pad, innerY, { width: labelW });
    doc.font(FONT.body).fontSize(9.5).fillColor(COLORS.ink)
      .text(r[1], boxX + pad + labelW, innerY, { width: CONTENT_W - 2 * pad - labelW, lineGap: 1.5 });
    innerY += lineHeights[i] + 5;
  });

  doc.y = startY + totalH;
  gap(10);
}

// Box mit Titel + Fließtext (für allgemein gehaltene Definitionen)
function textBox(title, text) {
  const pad = 12;
  const boxX = PAGE.margin;
  const innerW = CONTENT_W - 2 * pad;
  doc.font(FONT.body).fontSize(9.5);
  const textH = doc.heightOfString(text, { width: innerW, lineGap: 2 });
  const totalH = pad + 16 + textH + pad - 2;
  ensureSpace(totalH + 6);
  const startY = doc.y;
  doc.save().roundedRect(boxX, startY, CONTENT_W, totalH, 6)
    .fillAndStroke(COLORS.light, COLORS.hair).restore();
  doc.font(FONT.bold).fontSize(10).fillColor(COLORS.accent)
    .text(title, boxX + pad, startY + pad, { width: innerW });
  doc.font(FONT.body).fontSize(9.5).fillColor(COLORS.ink)
    .text(text, boxX + pad, startY + pad + 16, { width: innerW, lineGap: 2, align: "left" });
  doc.y = startY + totalH;
  gap(10);
}

// Authentische, handgemalte Unterschrift als Vektorkurve (kein Font).
// (x0,y0) = linker Startpunkt auf der gedachten Grundlinie, s = Skalierung.
function drawSignature(x0, y0, s = 1) {
  const ink = "#16243d";
  const sigFont = hasSignatureFont ? "Signature" : FONT.italic;
  const size = 30 * s;

  // Lesbarer Namenszug in Handschrift-Schrift, leicht schräg
  doc.font(sigFont).fontSize(size);
  const textW = doc.widthOfString("Noah Liebold");
  doc.save();
  doc.rotate(-4, { origin: [x0, y0] });
  doc.fillColor(ink).text("Noah Liebold", x0, y0 - size * 0.78, { lineBreak: false });
  doc.restore();

  // Dezenter Unterschwung als Signatur-Schnörkel
  doc.save();
  doc.lineJoin("round").lineCap("round").strokeColor(ink).lineWidth(1.2 * s);
  const ex = x0 + textW + 6 * s;
  doc.moveTo(ex, y0 + 1 * s);
  doc.bezierCurveTo(x0 + textW * 0.45, y0 + 15 * s, x0 + textW * 0.1, y0 + 12 * s, x0 - 6 * s, y0 + 7 * s);
  doc.bezierCurveTo(x0 - 15 * s, y0 + 6 * s, x0 - 11 * s, y0 - 1 * s, x0 + 1 * s, y0 - 3 * s);
  doc.stroke();
  doc.restore();
}

// Tabelle (für Unterauftragnehmer / TOM)
function table(columns, rows, opts = {}) {
  const widths = columns.map((c) => (c.w / 100) * CONTENT_W);
  const headH = 20;
  const cellPadX = 5;
  const fontSize = opts.size || 8.2;

  const drawHeader = () => {
    const y = doc.y;
    doc.save().rect(PAGE.margin, y, CONTENT_W, headH).fill(COLORS.accent).restore();
    let x = PAGE.margin;
    columns.forEach((c, i) => {
      doc.font(FONT.bold).fontSize(fontSize).fillColor("#ffffff")
        .text(c.label, x + cellPadX, y + 6, { width: widths[i] - 2 * cellPadX });
      x += widths[i];
    });
    doc.y = y + headH;
  };

  ensureSpace(headH + 40);
  drawHeader();

  rows.forEach((row, ri) => {
    // Zeilenhöhe bestimmen
    doc.font(FONT.body).fontSize(fontSize);
    let maxH = 0;
    row.forEach((cell, i) => {
      const h = doc.heightOfString(String(cell), { width: widths[i] - 2 * cellPadX, lineGap: 1.2 });
      if (h > maxH) maxH = h;
    });
    const rowH = maxH + 9;

    if (doc.y + rowH > BOTTOM()) {
      doc.addPage();
      drawHeader();
    }

    const y = doc.y;
    if (ri % 2 === 1) {
      doc.save().rect(PAGE.margin, y, CONTENT_W, rowH).fill(COLORS.light).restore();
    }
    let x = PAGE.margin;
    row.forEach((cell, i) => {
      doc.font(FONT.body).fontSize(fontSize).fillColor(COLORS.ink)
        .text(String(cell), x + cellPadX, y + 4.5, { width: widths[i] - 2 * cellPadX, lineGap: 1.2 });
      x += widths[i];
    });
    // untere Linie
    doc.save().lineWidth(0.5).strokeColor(COLORS.hair)
      .moveTo(PAGE.margin, y + rowH).lineTo(PAGE.margin + CONTENT_W, y + rowH).stroke().restore();
    doc.y = y + rowH;
  });
  gap(10);
}

// ===========================================================================
// DECKBLATT-KOPF
// ===========================================================================
doc.font(FONT.bold).fontSize(9).fillColor(COLORS.accent)
  .text("CONTRACT AI", PAGE.margin, PAGE.margin, { characterSpacing: 1.5 });
doc.font(FONT.body).fontSize(8).fillColor(COLORS.muted)
  .text("KI-gestütztes Vertragsmanagement  ·  contract-ai.de", PAGE.margin, doc.y + 1);
gap(18);
rule(COLORS.accent, 1.4);
gap(16);

doc.font(FONT.bold).fontSize(20).fillColor(COLORS.ink)
  .text("Vertrag über die Auftragsverarbeitung", PAGE.margin, doc.y, { width: CONTENT_W });
gap(2);
doc.font(FONT.body).fontSize(11).fillColor(COLORS.muted)
  .text("gemäß Art. 28 der Datenschutz-Grundverordnung (DSGVO)", PAGE.margin, doc.y, { width: CONTENT_W });
gap(20);

para(
  "Dieser Vertrag über die Auftragsverarbeitung („Vertrag“ oder „AVV“) konkretisiert die " +
  "datenschutzrechtlichen Pflichten der Vertragsparteien, die sich aus der Verarbeitung " +
  "personenbezogener Daten im Auftrag im Rahmen des zwischen den Parteien bestehenden " +
  "Hauptvertrags über die Nutzung der SaaS-Plattform „Contract AI“ (der „Hauptvertrag“) ergeben. " +
  "Er gilt für alle Tätigkeiten, bei denen der Auftragsverarbeiter personenbezogene Daten für den " +
  "Verantwortlichen im Sinne des Art. 4 Nr. 8 DSGVO verarbeitet.",
  { after: 16 }
);

// Parteien
textBox(
  "Verantwortlicher (Auftraggeber) – im Folgenden „Verantwortlicher“",
  "Verantwortlicher im Sinne dieses Vertrags ist der jeweilige Auftraggeber (Kunde), der den " +
  "Hauptvertrag über die Nutzung der Plattform Contract AI abschließt bzw. das betreffende " +
  "Nutzerkonto betreibt und in diesem Rahmen personenbezogene Daten über die Plattform verarbeiten " +
  "lässt. Dieser Vertrag gilt für jeden solchen Auftraggeber, ohne dass es einer gesonderten " +
  "namentlichen Eintragung bedarf; die Identität des Verantwortlichen ergibt sich aus den Stammdaten " +
  "des jeweiligen Nutzerkontos sowie dem zugrunde liegenden Hauptvertrag."
);

doc.font(FONT.body).fontSize(9.5).fillColor(COLORS.muted)
  .text("– und –", PAGE.margin, doc.y, { width: CONTENT_W, align: "center" });
gap(10);

partyBox("Auftragsverarbeiter – im Folgenden „Auftragsverarbeiter“", [
  ["Anbieter", "Contract AI – Inhaber Noah Liebold (Einzelunternehmen)"],
  ["Anschrift", "Richard-Oberle-Weg 27, 76648 Durmersheim, Deutschland"],
  ["USt-IdNr.", "DE361461136"],
  ["Kontakt", "info@contract-ai.de  ·  Tel. 0176 5554 9923"],
]);

para(
  "Der Verantwortliche und der Auftragsverarbeiter werden nachfolgend einzeln auch „Partei“ und " +
  "gemeinsam „Parteien“ genannt.",
  { after: 6 }
);

// ===========================================================================
// § 1
// ===========================================================================
h1("§ 1  Gegenstand, Art und Zweck der Verarbeitung");
para(
  "(1) Gegenstand des Auftrags ist die Verarbeitung personenbezogener Daten durch den " +
  "Auftragsverarbeiter im Auftrag und nach Weisung des Verantwortlichen im Rahmen der Bereitstellung " +
  "der Plattform Contract AI (KI-gestützte Analyse, Verwaltung, Optimierung, Erstellung und " +
  "Fristenüberwachung von Verträgen)."
);
para(
  "(2) Art und Zweck der Verarbeitung, die Art der personenbezogenen Daten sowie die Kategorien " +
  "betroffener Personen ergeben sich abschließend aus Anlage 1 zu diesem Vertrag."
);
para(
  "(3) Die Verarbeitung findet ausschließlich innerhalb der Europäischen Union bzw. des Europäischen " +
  "Wirtschaftsraums statt, soweit in Anlage 3 nicht ausdrücklich etwas anderes geregelt ist (Drittlandtransfer, vgl. § 9)."
);

// ===========================================================================
// § 2
// ===========================================================================
h1("§ 2  Dauer des Auftrags");
para(
  "Die Laufzeit dieses Vertrags entspricht der Laufzeit des Hauptvertrags. Eine Kündigung des " +
  "Hauptvertrags gilt zugleich als Kündigung dieses Vertrags. Eine isolierte Kündigung dieses Vertrags " +
  "ist ausgeschlossen, solange der Hauptvertrag fortbesteht. Die Regelungen zur Löschung und Rückgabe " +
  "(§ 10) bleiben über das Vertragsende hinaus wirksam."
);

// ===========================================================================
// § 3
// ===========================================================================
h1("§ 3  Weisungsrecht des Verantwortlichen");
para(
  "(1) Der Auftragsverarbeiter verarbeitet personenbezogene Daten ausschließlich im Rahmen der " +
  "getroffenen Vereinbarungen und nach dokumentierten Weisungen des Verantwortlichen, es sei denn, er " +
  "ist nach dem Recht der Union oder der Mitgliedstaaten, dem er unterliegt, zur Verarbeitung " +
  "verpflichtet (Art. 28 Abs. 3 lit. a DSGVO). In einem solchen Fall teilt der Auftragsverarbeiter dem " +
  "Verantwortlichen diese rechtlichen Anforderungen vor der Verarbeitung mit, sofern das betreffende " +
  "Recht eine solche Mitteilung nicht wegen eines wichtigen öffentlichen Interesses verbietet."
);
para(
  "(2) Weisungen werden grundsätzlich in Textform (z. B. per E-Mail an info@contract-ai.de) erteilt. " +
  "Mündliche Weisungen sind unverzüglich in Textform zu bestätigen. Der Hauptvertrag und dieser AVV " +
  "nebst Anlagen stellen die initiale, vollständige Weisung des Verantwortlichen dar."
);
para(
  "(3) Der Auftragsverarbeiter informiert den Verantwortlichen unverzüglich, wenn er der Auffassung ist, " +
  "dass eine Weisung gegen datenschutzrechtliche Vorschriften verstößt (Art. 28 Abs. 3 S. 3 DSGVO). Der " +
  "Auftragsverarbeiter ist berechtigt, die Durchführung der betreffenden Weisung auszusetzen, bis sie " +
  "durch den Verantwortlichen bestätigt oder geändert wird."
);

// ===========================================================================
// § 4
// ===========================================================================
h1("§ 4  Pflichten des Auftragsverarbeiters");
para("Der Auftragsverarbeiter verpflichtet sich insbesondere zu Folgendem:");
lettered("a)", "die Verarbeitung ausschließlich gemäß § 3 (Weisungsbindung) durchzuführen; verarbeitet er Daten für andere Zwecke oder bestimmt er Mittel der Verarbeitung selbst, gilt er insoweit als Verantwortlicher (Art. 28 Abs. 10 DSGVO);");
lettered("b)", "zu gewährleisten, dass sich die zur Verarbeitung befugten Personen zur Vertraulichkeit verpflichtet haben oder einer angemessenen gesetzlichen Verschwiegenheitspflicht unterliegen (Art. 28 Abs. 3 lit. b, Art. 29, Art. 32 Abs. 4 DSGVO);");
lettered("c)", "alle gemäß Art. 32 DSGVO erforderlichen technischen und organisatorischen Maßnahmen zu ergreifen und einzuhalten (im Einzelnen Anlage 2);");
lettered("d)", "die Bedingungen für die Inanspruchnahme weiterer Auftragsverarbeiter (Unterauftragnehmer) nach § 6 dieses Vertrags einzuhalten (Art. 28 Abs. 2 und 4 DSGVO);");
lettered("e)", "den Verantwortlichen nach Maßgabe von § 7 bei der Erfüllung der Rechte betroffener Personen (Art. 12–23 DSGVO) zu unterstützen;");
lettered("f)", "den Verantwortlichen bei der Einhaltung der in den Art. 32 bis 36 DSGVO genannten Pflichten zu unterstützen (Datensicherheit, Meldung von Verletzungen, Datenschutz-Folgenabschätzung, vorherige Konsultation), unter Berücksichtigung der Art der Verarbeitung und der ihm zur Verfügung stehenden Informationen;");
lettered("g)", "nach Wahl des Verantwortlichen sämtliche personenbezogenen Daten nach Abschluss der Erbringung der Verarbeitungsleistungen zu löschen oder zurückzugeben (§ 10);");
lettered("h)", "dem Verantwortlichen alle erforderlichen Informationen zum Nachweis der Einhaltung der Pflichten aus Art. 28 DSGVO zur Verfügung zu stellen und Überprüfungen zu ermöglichen (§ 11);");
lettered("i)", "ein Verzeichnis aller Kategorien von im Auftrag durchgeführten Verarbeitungstätigkeiten gemäß Art. 30 Abs. 2 DSGVO zu führen.");
para(
  "Der Auftragsverarbeiter hat einen betrieblichen Datenschutzbeauftragten zu benennen, sofern eine " +
  "gesetzliche Bestellpflicht nach Art. 37 DSGVO bzw. § 38 BDSG besteht. Kontakt für Datenschutzanfragen: " +
  "info@contract-ai.de.",
  { font: FONT.body }
);

// ===========================================================================
// § 5
// ===========================================================================
h1("§ 5  Technische und organisatorische Maßnahmen (TOM)");
para(
  "(1) Der Auftragsverarbeiter trifft die in Anlage 2 beschriebenen technischen und organisatorischen " +
  "Maßnahmen, um ein dem Risiko angemessenes Schutzniveau nach Art. 32 DSGVO sicherzustellen. Die " +
  "Maßnahmen sind dem Verantwortlichen vor Beginn der Verarbeitung bekannt und werden von diesem als " +
  "angemessen anerkannt."
);
para(
  "(2) Die technischen und organisatorischen Maßnahmen unterliegen dem technischen Fortschritt. Dem " +
  "Auftragsverarbeiter ist es gestattet, alternative angemessene Maßnahmen umzusetzen, sofern das " +
  "Sicherheitsniveau der festgelegten Maßnahmen nicht unterschritten wird. Wesentliche Änderungen sind " +
  "zu dokumentieren."
);

// ===========================================================================
// § 6
// ===========================================================================
h1("§ 6  Unterauftragsverhältnisse");
para(
  "(1) Der Verantwortliche erteilt dem Auftragsverarbeiter die allgemeine Genehmigung, weitere " +
  "Auftragsverarbeiter (Unterauftragnehmer) hinzuzuziehen (Art. 28 Abs. 2 S. 1 DSGVO). Die zum Zeitpunkt " +
  "des Vertragsschlusses eingesetzten Unterauftragnehmer sind in Anlage 3 aufgeführt und werden hiermit " +
  "genehmigt."
);
para(
  "(2) Beabsichtigt der Auftragsverarbeiter, einen weiteren Unterauftragnehmer hinzuzuziehen oder einen " +
  "bestehenden zu ersetzen, informiert er den Verantwortlichen vorab in Textform. Der Verantwortliche " +
  "kann einer solchen Änderung innerhalb von 14 Tagen aus wichtigem datenschutzrechtlichem Grund " +
  "widersprechen (Art. 28 Abs. 2 S. 2 DSGVO). Erfolgt kein Widerspruch innerhalb der Frist, gilt die " +
  "Änderung als genehmigt."
);
para(
  "(3) Der Auftragsverarbeiter erlegt jedem Unterauftragnehmer durch Vertrag dieselben " +
  "Datenschutzpflichten auf, wie sie in diesem Vertrag festgelegt sind (Art. 28 Abs. 4 DSGVO). Kommt der " +
  "Unterauftragnehmer seinen Datenschutzpflichten nicht nach, haftet der Auftragsverarbeiter gegenüber " +
  "dem Verantwortlichen für die Einhaltung der Pflichten des Unterauftragnehmers."
);
para(
  "(4) Dienstleistungen, die der Auftragsverarbeiter als bloße Nebenleistung in Anspruch nimmt (z. B. " +
  "Telekommunikations- oder Reinigungsleistungen), gelten nicht als Unterauftragsverhältnisse im Sinne " +
  "dieses Vertrags."
);

// ===========================================================================
// § 7
// ===========================================================================
h1("§ 7  Unterstützung bei Betroffenenrechten");
para(
  "(1) Macht eine betroffene Person Rechte (Auskunft, Berichtigung, Löschung, Einschränkung, " +
  "Datenübertragbarkeit, Widerspruch – Art. 15–21 DSGVO) gegenüber dem Auftragsverarbeiter geltend, " +
  "verweist dieser die betroffene Person an den Verantwortlichen, sofern eine Zuordnung zum " +
  "Verantwortlichen möglich ist, und leitet das Ersuchen unverzüglich an den Verantwortlichen weiter."
);
para(
  "(2) Der Auftragsverarbeiter unterstützt den Verantwortlichen im Rahmen seiner Möglichkeiten mit " +
  "geeigneten technischen und organisatorischen Maßnahmen dabei, dessen Pflicht zur Beantwortung von " +
  "Anträgen betroffener Personen nachzukommen (Art. 28 Abs. 3 lit. e DSGVO). Soweit die Mitwirkung über " +
  "die im Hauptvertrag vereinbarten Leistungen hinausgeht, kann der Auftragsverarbeiter hierfür eine " +
  "angemessene Vergütung verlangen."
);

// ===========================================================================
// § 8
// ===========================================================================
h1("§ 8  Meldung von Verletzungen des Schutzes personenbezogener Daten");
para(
  "(1) Der Auftragsverarbeiter meldet dem Verantwortlichen jede ihm bekannt gewordene Verletzung des " +
  "Schutzes personenbezogener Daten, die die im Auftrag verarbeiteten Daten betrifft, unverzüglich " +
  "(in der Regel innerhalb von 48 Stunden) nach Bekanntwerden (Art. 33 Abs. 2 DSGVO)."
);
para("(2) Die Meldung an den Verantwortlichen enthält mindestens:");
bullet("eine Beschreibung der Art der Verletzung, soweit möglich mit Angabe der betroffenen Kategorien und der ungefähren Zahl der betroffenen Personen und Datensätze;");
bullet("eine Beschreibung der wahrscheinlichen Folgen der Verletzung;");
bullet("eine Beschreibung der ergriffenen oder vorgeschlagenen Maßnahmen zur Behebung der Verletzung und zur Abmilderung möglicher nachteiliger Auswirkungen;");
bullet("den Namen und die Kontaktdaten einer Anlaufstelle für weitere Informationen.");
para(
  "(3) Die Meldepflichten des Verantwortlichen gegenüber der Aufsichtsbehörde (Art. 33 DSGVO) und " +
  "gegenüber betroffenen Personen (Art. 34 DSGVO) bleiben hiervon unberührt und obliegen allein dem " +
  "Verantwortlichen."
);

// ===========================================================================
// § 9
// ===========================================================================
h1("§ 9  Verarbeitung in Drittländern");
para(
  "(1) Eine Verarbeitung personenbezogener Daten in einem Land außerhalb der EU/des EWR (Drittland) " +
  "findet nur statt, soweit dies in Anlage 3 ausgewiesen ist und die besonderen Voraussetzungen der " +
  "Art. 44 ff. DSGVO erfüllt sind."
);
para(
  "(2) Für Übermittlungen in die USA stützt sich der Auftragsverarbeiter, soweit der jeweilige " +
  "Empfänger unter dem EU-US Data Privacy Framework (DPF) zertifiziert ist, auf den Angemessenheits­" +
  "beschluss der Europäischen Kommission vom 10. Juli 2023. Ergänzend bzw. für nicht unter dem DPF " +
  "zertifizierte Empfänger werden die Standardvertragsklauseln der EU-Kommission (SCC, " +
  "Durchführungsbeschluss (EU) 2021/914) nebst erforderlicher zusätzlicher Schutzmaßnahmen vereinbart."
);

// ===========================================================================
// § 10
// ===========================================================================
h1("§ 10  Löschung und Rückgabe nach Beendigung");
para(
  "(1) Nach Beendigung der Verarbeitungsleistungen löscht der Auftragsverarbeiter nach Wahl des " +
  "Verantwortlichen sämtliche personenbezogenen Daten oder gibt sie zurück und löscht vorhandene Kopien, " +
  "sofern nicht nach dem Recht der Union oder der Mitgliedstaaten eine Verpflichtung zur Speicherung der " +
  "Daten besteht (Art. 28 Abs. 3 lit. g DSGVO)."
);
para(
  "(2) Der Verantwortliche kann seine Daten während der Vertragslaufzeit jederzeit selbst über die " +
  "Funktionen der Plattform exportieren und löschen. Eine Löschung erfolgt spätestens 30 Tage nach " +
  "Beendigung des Hauptvertrags, soweit keine gesetzlichen Aufbewahrungspflichten (z. B. handels- und " +
  "steuerrechtliche Fristen) entgegenstehen. Für die Dauer einer gesetzlichen Aufbewahrungspflicht " +
  "werden die Daten gesperrt."
);
para(
  "(3) Die Dokumentation, die dem Nachweis der ordnungsgemäßen Verarbeitung dient, ist durch den " +
  "Auftragsverarbeiter entsprechend den jeweiligen Aufbewahrungsfristen auch über das Vertragsende " +
  "hinaus aufzubewahren."
);

// ===========================================================================
// § 11
// ===========================================================================
h1("§ 11  Nachweise und Kontrollrechte");
para(
  "(1) Der Auftragsverarbeiter stellt dem Verantwortlichen auf Anfrage alle erforderlichen Informationen " +
  "zum Nachweis der Einhaltung der in Art. 28 DSGVO niedergelegten Pflichten zur Verfügung (Art. 28 " +
  "Abs. 3 lit. h DSGVO)."
);
para(
  "(2) Der Verantwortliche ist berechtigt, sich von der Einhaltung der technischen und organisatorischen " +
  "Maßnahmen sowie der vertraglichen Pflichten zu überzeugen. Der Nachweis kann erfolgen durch aktuelle " +
  "Testate, Zertifizierungen oder Berichte einer unabhängigen Instanz (z. B. der eingesetzten " +
  "Unterauftragnehmer) oder eine geeignete Selbstauskunft."
);
para(
  "(3) Soweit dies im Einzelfall erforderlich ist, ermöglicht der Auftragsverarbeiter Überprüfungen — " +
  "auch vor Ort — durch den Verantwortlichen oder einen von diesem beauftragten, zur Verschwiegenheit " +
  "verpflichteten Prüfer. Vor-Ort-Prüfungen sind mit angemessener Vorankündigung (mind. 14 Tage), zu den " +
  "üblichen Geschäftszeiten und ohne Störung des Betriebsablaufs durchzuführen. Der hierfür anfallende " +
  "angemessene Aufwand kann dem Verantwortlichen in Rechnung gestellt werden."
);

// ===========================================================================
// § 12
// ===========================================================================
h1("§ 12  Haftung");
para(
  "(1) Für die Haftung der Parteien gilt Art. 82 DSGVO. Im Verhältnis der Parteien zueinander gelten " +
  "ergänzend die Haftungsregelungen des Hauptvertrags, soweit diese nicht zwingenden gesetzlichen " +
  "Vorschriften widersprechen."
);
para(
  "(2) Der Verantwortliche ist für die Zulässigkeit der Verarbeitung sowie für die Wahrung der Rechte " +
  "betroffener Personen allein verantwortlich (Art. 4 Nr. 7, Art. 24 DSGVO)."
);

// ===========================================================================
// § 13
// ===========================================================================
h1("§ 13  Schlussbestimmungen");
para(
  "(1) Änderungen und Ergänzungen dieses Vertrags sowie seiner Anlagen bedürfen der Textform. Dies gilt " +
  "auch für die Aufhebung dieses Textformerfordernisses."
);
para(
  "(2) Bei Widersprüchen zwischen diesem Vertrag und Regelungen des Hauptvertrags gehen die Regelungen " +
  "dieses Vertrags in datenschutzrechtlicher Hinsicht vor."
);
para(
  "(3) Sollte eine Bestimmung dieses Vertrags unwirksam sein oder werden, so wird die Wirksamkeit der " +
  "übrigen Bestimmungen hiervon nicht berührt. Die Parteien verpflichten sich, die unwirksame Bestimmung " +
  "durch eine wirksame zu ersetzen, die dem wirtschaftlichen Zweck am nächsten kommt."
);
para(
  "(4) Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist, soweit zulässig, der Sitz des " +
  "Auftragsverarbeiters."
);

// ===========================================================================
// UNTERSCHRIFTEN
// ===========================================================================
gap(6);
h1("Abschluss des Vertrags");
para(
  "Dieser Vertrag zur Auftragsverarbeitung wird vom Auftragsverarbeiter bereitgestellt und ist " +
  "einschließlich der Anlagen 1 bis 3 Bestandteil des Hauptvertrags über die Nutzung der Plattform " +
  "Contract AI.",
  { after: 16 }
);

// Verantwortlicher: allgemeine Akzeptanz statt Unterschriftsfeldern
doc.font(FONT.bold).fontSize(9).fillColor(COLORS.accent)
  .text("Für den Verantwortlichen (Auftraggeber)", PAGE.margin, doc.y, { width: CONTENT_W });
gap(6);
para(
  "Der Verantwortliche erkennt die Bedingungen dieses Vertrags mit der Registrierung bzw. der Nutzung " +
  "der Plattform Contract AI sowie mit Abschluss des Hauptvertrags an. Einer gesonderten Unterzeichnung " +
  "durch den Verantwortlichen bedarf es nicht; auf Wunsch kann der Verantwortliche diesen Vertrag " +
  "gegenzeichnen.",
  { after: 24 }
);

// Auftragsverarbeiter: handgezeichnete Unterschrift, darunter Name/Funktion/Datum
(function processorBlock() {
  ensureSpace(120);
  const colW = (CONTENT_W - 40) / 2;
  const x = PAGE.margin;
  doc.font(FONT.bold).fontSize(9).fillColor(COLORS.accent)
    .text("Für den Auftragsverarbeiter", x, doc.y, { width: CONTENT_W });

  // Freier Platz zum handschriftlichen Unterschreiben (ohne Linie)
  const lineY = doc.y + 44;

  doc.font(FONT.body).fontSize(9).fillColor(COLORS.ink)
    .text("Noah Liebold", x, lineY + 8, { width: colW });
  doc.font(FONT.body).fontSize(8.5).fillColor(COLORS.muted)
    .text("Inhaber · Contract AI", x, doc.y + 1, { width: colW });
  doc.font(FONT.body).fontSize(9).fillColor(COLORS.ink)
    .text("Durmersheim, den 10. Dezember 2025", x, doc.y + 6, { width: colW });
  doc.y += 8;
})();

// ===========================================================================
// ANLAGE 1
// ===========================================================================
doc.addPage();
h1("Anlage 1 — Gegenstand und Einzelheiten der Verarbeitung");

h2("1. Gegenstand und Zweck der Verarbeitung");
para(
  "Bereitstellung der SaaS-Plattform Contract AI zur KI-gestützten Analyse, Verwaltung, Optimierung, " +
  "Erstellung und Fristenüberwachung von Verträgen sowie zugehöriger Benachrichtigungs- und " +
  "Kalenderfunktionen für den Verantwortlichen."
);

h2("2. Art der Verarbeitung");
para(
  "Erheben, Erfassen, Speichern, Auslesen, Verwenden (KI-gestützte Analyse/Extraktion), Strukturieren, " +
  "Übermitteln an Unterauftragnehmer (vgl. Anlage 3), Löschen und sonstige Bereitstellung im Rahmen der " +
  "Plattformfunktionen."
);

h2("3. Art der personenbezogenen Daten");
bullet("Bestands-/Stammdaten: Name, E-Mail-Adresse des Nutzers/Kontos;");
bullet("Zugangsdaten: Passwort (gehasht mit bcrypt), Authentifizierungs-/Session-Daten;");
bullet("Inhaltsdaten: hochgeladene Vertragsdokumente (PDF) und die darin enthaltenen personenbezogenen Daten von Vertragspartnern des Verantwortlichen (z. B. Namen, Anschriften, Vertrags- und Zahlungskonditionen, Fristen);");
bullet("Metadaten zu Dokumenten: Dateiname, Datum, Dateigröße, Hash, Nutzer-ID;");
bullet("Nutzungs- und Analysedaten: Analysehistorie, Erinnerungen/Fristen, Protokolldaten;");
bullet("Abrechnungsdaten: Name, E-Mail, Abonnement- und Zahlungsdaten (Zahlungsabwicklung über Stripe).");

h2("4. Kategorien betroffener Personen");
bullet("Nutzer und Mitarbeiter des Verantwortlichen, die die Plattform verwenden;");
bullet("Vertragspartner, Kunden und sonstige Dritte des Verantwortlichen, deren personenbezogene Daten in den hochgeladenen Dokumenten enthalten sind.");

h2("5. Dauer der Verarbeitung");
para(
  "Für die Laufzeit des Hauptvertrags zzgl. der in § 10 geregelten Lösch-/Aufbewahrungsfristen."
);

// ===========================================================================
// ANLAGE 2
// ===========================================================================
doc.addPage();
h1("Anlage 2 — Technische und organisatorische Maßnahmen (Art. 32 DSGVO)");
para(
  "Der Auftragsverarbeiter setzt die folgenden technischen und organisatorischen Maßnahmen ein, um ein " +
  "dem Risiko angemessenes Schutzniveau zu gewährleisten. Soweit Maßnahmen durch eingesetzte " +
  "Unterauftragnehmer (Anlage 3) erbracht werden, beruhen sie auf deren zertifizierten " +
  "Sicherheitsstandards (z. B. ISO 27001, SOC 2)."
);

table(
  [
    { label: "Schutzziel", w: 26 },
    { label: "Maßnahmen", w: 74 },
  ],
  [
    ["Vertraulichkeit — Zutrittskontrolle", "Betrieb in zertifizierten Rechenzentren der Unterauftragnehmer innerhalb der EU/des EWR mit physischer Zugangssicherung; keine eigenen On-Premise-Server."],
    ["Vertraulichkeit — Zugangskontrolle", "Individuelle Benutzerkonten, Authentifizierung über JWT-Token, Passwörter ausschließlich gehasht gespeichert (bcrypt); E-Mail-Verifizierung für Neukonten."],
    ["Vertraulichkeit — Zugriffskontrolle", "Rollen-/rechtebasierte Zugriffstrennung; mandantengetrennte Datenhaltung pro Nutzerkonto; Beschränkung administrativer Zugriffe auf das erforderliche Maß (need-to-know)."],
    ["Integrität — Weitergabe-/ Übertragungskontrolle", "Durchgängige Transportverschlüsselung (TLS/SSL/HTTPS) für sämtliche Datenübertragungen, einschließlich der Übermittlung an die KI-Verarbeitung."],
    ["Integrität — Eingabekontrolle", "Protokollierung (Logging) und Monitoring sicherheitsrelevanter Ereignisse zur Nachvollziehbarkeit von Eingabe, Änderung und Löschung."],
    ["Verfügbarkeit und Belastbarkeit", "Regelmäßige Backups; Server-Hardening und Zugriffsbeschränkungen; Monitoring der Systemverfügbarkeit; Redundanz auf Ebene der Cloud-Infrastruktur."],
    ["Datentrennung", "Logische Trennung der Daten nach Mandant/Nutzerkonto; Trennung von Produktiv- und Testumgebungen."],
    ["Datenminimierung / Speicherbegrenzung", "Übermittlung an die KI-Verarbeitung nur im erforderlichen Umfang; keine Nutzung der Inhalte zu Trainingszwecken durch den KI-Dienstleister; Löschung bei OpenAI nach max. 30 Tagen."],
    ["Verfahren zur Überprüfung und Bewertung", "Regelmäßige Überprüfung und Aktualisierung der Maßnahmen; Sicherheits-Updates; Auswahl von Unterauftragnehmern mit anerkannten Zertifizierungen."],
  ],
);

// ===========================================================================
// ANLAGE 3
// ===========================================================================
doc.addPage();
h1("Anlage 3 — Genehmigte Unterauftragnehmer");
para(
  "Der Verantwortliche genehmigt mit Abschluss dieses Vertrags den Einsatz der folgenden " +
  "Unterauftragnehmer. Alle Anbieter mit Sitz bzw. Verarbeitung in den USA sind entweder unter dem " +
  "EU-US Data Privacy Framework zertifiziert und/oder es bestehen EU-Standardvertragsklauseln (SCC) " +
  "gemäß § 9 dieses Vertrags."
);

table(
  [
    { label: "Unterauftragnehmer", w: 22 },
    { label: "Leistung", w: 28 },
    { label: "Ort der Verarbeitung", w: 22 },
    { label: "Transfergrundlage", w: 28 },
  ],
  [
    ["Amazon Web Services (AWS S3)", "Speicherung hochgeladener Vertragsdokumente (Objektspeicher)", "EU/EWR (AWS)", "EU/EWR; ergänzend DPF / SCC"],
    ["OpenAI, L.L.C.", "KI-gestützte Vertragsanalyse und -verarbeitung (kein Training, Löschung max. 30 Tage)", "USA", "EU-US Data Privacy Framework + SCC"],
    ["Anthropic, PBC", "KI-gestützte Vertragserstellung und Formular-Vorbereitung (kein Training der Modelle)", "USA", "EU-Standardvertragsklauseln (SCC)"],
    ["Stripe Payments Europe, Ltd.", "Zahlungs- und Abonnementabwicklung", "EU — Dublin, Irland", "EU/EWR"],
    ["Vercel Inc.", "Hosting/Auslieferung der Web-Anwendung (Frontend)", "USA", "EU-US Data Privacy Framework"],
    ["Render Services, Inc.", "Hosting der Backend-/API-Anwendung", "EU — Frankfurt", "EU/EWR"],
    ["MongoDB, Inc. (MongoDB Atlas)", "Datenbank (Konto-, Vertrags- und Metadaten)", "EU — Frankfurt (eu-central-1)", "EU/EWR"],
  ],
);

para(
  "Stand dieser Liste: bei Vertragsschluss. Änderungen werden dem Verantwortlichen gemäß § 6 Abs. 2 " +
  "dieses Vertrags mitgeteilt.",
  { color: COLORS.muted, size: 8.5, after: 4 }
);

// ===========================================================================
// FUSSZEILEN / SEITENZAHLEN
// ===========================================================================
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i);
  // Unteren Rand kurz aufheben, damit das Schreiben in den Fußbereich
  // keine Leerseite anhängt:
  doc.page.margins.bottom = 0;
  const fy = doc.page.height - PAGE.margin + 24;
  doc.save();
  doc.lineWidth(0.5).strokeColor(COLORS.hair)
    .moveTo(PAGE.margin, fy - 8).lineTo(doc.page.width - PAGE.margin, fy - 8).stroke();
  doc.font(FONT.body).fontSize(7.5).fillColor(COLORS.muted)
    .text("Auftragsverarbeitungsvertrag · Contract AI · Noah Liebold", PAGE.margin, fy, {
      width: CONTENT_W * 0.7, align: "left", lineBreak: false,
    });
  doc.font(FONT.body).fontSize(7.5).fillColor(COLORS.muted)
    .text(`Seite ${i + 1} von ${range.count}`, PAGE.margin + CONTENT_W * 0.7, fy, {
      width: CONTENT_W * 0.3, align: "right", lineBreak: false,
    });
  doc.restore();
}

doc.end();

stream.on("finish", () => {
  console.log("✅ AVV erstellt:");
  console.log("   " + OUT);
  console.log("   Seiten: " + doc.bufferedPageRange().count);
  console.log("   Signatur-Font eingebettet: " + (hasSignatureFont ? "ja (Segoe Script)" : "nein (Fallback kursiv)"));
});
