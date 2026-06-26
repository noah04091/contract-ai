// 📁 backend/utils/pulseEmailTemplate.js
// EIGENE, RESPONSIVE Vorlage NUR für Legal-Pulse-Mails (Radar / Monitor / Staleness).
// Bewusst getrennt von der geteilten utils/emailTemplate.js — damit Änderungen hier
// KEINE der ~25 anderen Mails berühren (gleiches Vorgehen wie bei den Kalender-Mails).
//
// Design-Prinzipien (Stripe/DocuSign-Niveau): ruhig, eine Akzentfarbe, viel Weißraum,
// "du"-Ton, Klartext, eine klare Aktion. Mobile-@media: kleinere Ränder + kleinere
// Headline + zweispaltige Detail-Zeilen stapeln sich auf schmalen Displays.

const FE = "https://www.contract-ai.de";
const LOGO = FE + "/logo.png";

/** Linksbündige, schlanke Headline (auf dem Handy etwas kleiner via .ep-h1). */
function pulseHeadline(text) {
  return `<h1 class="ep-h1" style="margin:0 0 16px; font-size:21px; font-weight:700; color:#1a1f36; line-height:1.35; text-align:left;">${text}</h1>`;
}

/** Absatz im Fließtext-Stil ("du"). */
function pulseLead(html) {
  return `<p style="margin:0 0 14px; font-size:15px; color:#3c4257; line-height:1.7; text-align:left;">${html}</p>`;
}

/** Ruhiges Überblick-Panel: kleine Eyebrow, Titel, Meta-Zeile. */
function pulsePanel({ eyebrow, title, meta }) {
  return `
      <div style="background:#f6f8fb; border-radius:10px; padding:16px 18px; margin:8px 0 28px;">
        ${eyebrow ? `<div style="font-size:11px; font-weight:600; color:#8792a2; text-transform:uppercase; letter-spacing:.6px; margin-bottom:5px;">${eyebrow}</div>` : ""}
        <div style="font-size:15px; font-weight:600; color:#1a1f36; line-height:1.4;">${title}</div>
        ${meta ? `<div style="font-size:13px; color:#697386; margin-top:5px;">${meta}</div>` : ""}
      </div>`;
}

/** Zweispaltige Detail-Zeile (Label | Wert) — stapelt auf dem Handy (.ep-row-*). */
function pulseRow(label, value, strong) {
  return `
        <tr>
          <td class="ep-row-label" style="padding:5px 18px 5px 0; font-size:12px; color:#8792a2; vertical-align:top; width:118px; line-height:1.5;">${label}</td>
          <td class="ep-row-val" style="padding:5px 0; font-size:14px; color:${strong ? "#1a1f36" : "#3c4257"}; font-weight:${strong ? 600 : 400}; vertical-align:top; line-height:1.6;">${value}</td>
        </tr>`;
}

/**
 * Ein Block (Vertrag/Element): Status-Punkt + Name + Status-Wort, optional Meta-Zeile
 * und/oder Detail-Zeilen. Blöcke werden durch feine Linien getrennt (isFirst = keine).
 */
function pulseSection({ name, statusText, statusColor = "#697386", dotColor, metaText, rows = [], isFirst = false }) {
  const sep = isFirst ? "" : "border-top:1px solid #e6e9ee; padding-top:22px; margin-top:22px;";
  const dot = dotColor
    ? `<span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:${dotColor}; vertical-align:middle; margin-right:8px;"></span>`
    : "";
  const statusHtml = statusText
    ? `<td style="text-align:right; vertical-align:middle; white-space:nowrap; padding-left:10px;"><span style="font-size:12px; font-weight:600; color:${statusColor};">${statusText}</span></td>`
    : "";
  const metaHtml = metaText ? `<div style="font-size:13px; color:#697386; margin-top:4px;">${metaText}</div>` : "";
  const rowsHtml = rows.length
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">${rows.join("")}</table>`
    : "";
  return `
      <div style="${sep}">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle;">${dot}<span style="font-size:16px; font-weight:600; color:#1a1f36; vertical-align:middle;">${name}</span></td>
          ${statusHtml}
        </tr></table>
        ${metaHtml}${rowsHtml}
      </div>`;
}

/** Solider, linksbündiger Button (8px Radius). */
function pulseButton(text, url) {
  return `
        <table cellpadding="0" cellspacing="0" style="margin:0;"><tr>
          <td style="border-radius:8px; background:#3b82f6;">
            <a href="${url}" style="display:inline-block; padding:13px 26px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:8px;">${text}</a>
          </td>
        </tr></table>`;
}

/** Beruhigungs-Block mit feiner Trennlinie darüber + Button. */
function pulseReassurance({ text, buttonText, buttonUrl }) {
  return `
      <div style="border-top:1px solid #e6e9ee; margin-top:28px; padding-top:24px;">
        ${text ? `<p style="margin:0 0 18px; font-size:14px; color:#3c4257; line-height:1.7;">${text}</p>` : ""}
        ${pulseButton(buttonText, buttonUrl)}
      </div>`;
}

/** Gedämpfte Transparenz-/Fußzeile im Body ("warum bekomme ich das?"). */
function pulseNote(text) {
  return `<p style="margin:24px 0 0; font-size:13px; color:#8792a2; line-height:1.6;">${text}</p>`;
}

/**
 * Die responsive Hülle. Nimmt fertigen `body` (aus den Helfern oben) entgegen.
 * @param {{ body:string, badge?:string, unsubscribeUrl?:string, preheader?:string }} opts
 */
function generatePulseEmailTemplate({ body, badge = "Legal Radar", unsubscribeUrl = null, preheader = "" }) {
  const badgeHtml = badge
    ? `<td align="right"><span style="display:inline-block; padding:6px 12px; background:#dbeafe; color:#1d4ed8; font-size:11px; font-weight:600; border-radius:4px; text-transform:uppercase; letter-spacing:.5px;">${badge}</span></td>`
    : "<td></td>";
  const preheaderHtml = preheader
    ? `<div style="display:none; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">${preheader}</div>`
    : "";
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @media only screen and (max-width:480px){
    .ep-outer{ padding-left:10px !important; padding-right:10px !important; }
    .ep-pad{ padding-left:24px !important; padding-right:24px !important; }
    .ep-h1{ font-size:19px !important; }
    .ep-row-label{ display:block !important; width:auto !important; padding:9px 0 1px !important; }
    .ep-row-val{ display:block !important; width:auto !important; padding:0 0 6px !important; }
  }
</style></head>
<body style="margin:0; padding:0; background:#f0f4f8; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  ${preheaderHtml}
  <table width="100%" cellpadding="0" cellspacing="0" class="ep-outer" style="background:#f0f4f8; padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:12px; overflow:hidden;">
        <tr><td style="height:4px; background:#3b82f6;"></td></tr>
        <tr><td class="ep-pad" style="padding:28px 40px 22px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td><img src="${LOGO}" alt="Contract AI" style="height:30px; max-width:180px;"></td>
            ${badgeHtml}
          </tr></table>
        </td></tr>
        <tr><td class="ep-pad" style="padding:0 40px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-bottom:1px solid #e2e8f0;"></td></tr></table></td></tr>
        <tr><td class="ep-pad" style="padding:30px 40px 36px 40px;">
          <div style="font-size:15px; line-height:1.7; color:#334155;">${body}</div>
        </td></tr>
        <tr><td class="ep-pad" style="padding:0 40px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #e2e8f0;"></td></tr></table></td></tr>
        <tr><td class="ep-pad" style="padding:22px 40px 26px 40px;">
          <p style="margin:0 0 8px; font-size:13px; color:#64748b;">© ${new Date().getFullYear()} Contract AI. Alle Rechte vorbehalten.</p>
          <p style="margin:0; font-size:12px;">
            <a href="${FE}" style="color:#3b82f6; text-decoration:none;">Website</a>
            <span style="color:#cbd5e1; margin:0 10px;">|</span>
            <a href="${FE}/datenschutz" style="color:#64748b; text-decoration:none;">Datenschutz</a>
            <span style="color:#cbd5e1; margin:0 10px;">|</span>
            <a href="${FE}/impressum" style="color:#64748b; text-decoration:none;">Impressum</a>
            ${unsubscribeUrl ? `<span style="color:#cbd5e1; margin:0 10px;">|</span><a href="${unsubscribeUrl}" style="color:#64748b; text-decoration:none;">Benachrichtigungen abmelden</a>` : ""}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

module.exports = {
  generatePulseEmailTemplate,
  pulseHeadline,
  pulseLead,
  pulsePanel,
  pulseRow,
  pulseSection,
  pulseButton,
  pulseReassurance,
  pulseNote,
};
