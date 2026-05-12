import type { NewsletterTemplate } from './index';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1750277120336-ca98ec2e2f90?w=1200&q=80&auto=format&fit=crop';
const PROMO_CODE = 'BUSINESS10';
const PROMO_PERCENT = '10';
const PROMO_DAYS = '7';

const body = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="format-detection" content="telephone=no">
<title>Vertr&auml;ge kosten dich oft mehr, als du denkst.</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; max-width:100%; height:auto; display:block; }
  a { text-decoration:none; }
  @media only screen and (max-width:620px) {
    .container { width:100% !important; max-width:100% !important; border-radius:0 !important; }
    .px-outer { padding:0 !important; }
    .px-inner { padding-left:24px !important; padding-right:24px !important; }
    .hero-img { height:240px !important; }
    .hero-h { font-size:34px !important; line-height:1.12 !important; }
    .section-h { font-size:26px !important; line-height:1.22 !important; }
    .step-num { font-size:64px !important; }
    .step-h { font-size:20px !important; }
    .quote-text { font-size:21px !important; line-height:1.42 !important; }
    .final-h { font-size:24px !important; line-height:1.25 !important; }
    .cta-link { padding:16px 28px !important; font-size:14px !important; }
    .compare-table td { display:block !important; width:100% !important; }
    .compare-cell { padding:24px !important; border-right:none !important; border-bottom:1px solid #e5e7eb !important; }
    .compare-cell-last { border-bottom:none !important; }
    .promo-code { font-size:22px !important; letter-spacing:4px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f5f3ee;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;-webkit-font-smoothing:antialiased;">

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f5f3ee;">
${PROMO_PERCENT}% Rabatt auf Business mit Code ${PROMO_CODE} &mdash; nur ${PROMO_DAYS} Tage. Versteckte Risiken in deinen Vertr&auml;gen kosten dich oft mehr, als du denkst.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f3ee;">
  <tr>
    <td align="center" class="px-outer" style="padding:32px 16px;">

      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:18px;overflow:hidden;max-width:600px;width:100%;box-shadow:0 1px 2px rgba(15,23,42,0.04);">

        <tr>
          <td class="px-inner" style="padding:40px 56px 0;text-align:center;">
            <img src="https://www.contract-ai.de/logo.png" alt="Contract AI" width="140" height="36" style="height:36px;width:auto;max-width:140px;display:inline-block;border:0;outline:none;">
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:24px 56px 0;">
            <a href="https://contract-ai.de/pricing?code=${PROMO_CODE}" style="display:block;line-height:0;font-size:0;">
              <img class="hero-img" src="${HERO_IMAGE}" alt="Person unterzeichnet einen Vertrag mit einem Stift" width="488" height="320" style="width:100%;max-width:488px;height:320px;object-fit:cover;border-radius:12px;display:block;margin:0 auto;">
            </a>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:36px 56px 0;text-align:center;">
            <h1 class="hero-h" style="margin:0;font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-size:44px;line-height:1.1;color:#0f172a;font-weight:700;letter-spacing:-1px;">
              Vertr&auml;ge kosten dich<br><em style="font-style:italic;font-weight:600;color:#1e3a8a;">oft mehr</em>, als du denkst.
            </h1>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 0 0;text-align:center;">
            <div style="display:inline-block;width:48px;height:3px;background-color:#3b82f6;border-radius:2px;line-height:3px;font-size:0;">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:24px 56px 0;text-align:center;">
            <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:#4b5563;">
              Versteckte Risiken. Schlechte Konditionen. Unklare Verpflichtungen.<br>
              Nicht weil du es nicht besser k&ouml;nntest &mdash; sondern weil viele Vertr&auml;ge genau darauf ausgelegt sind.
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:48px 56px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0f172a;border-radius:14px;">
              <tr>
                <td style="padding:32px 28px;text-align:center;background-color:#0f172a;border-radius:14px;">
                  <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#93c5fd;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:14px;">
                    Launch-Aktion &middot; nur ${PROMO_DAYS} Tage
                  </div>
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:28px;line-height:1.25;color:#ffffff;font-weight:700;letter-spacing:-0.3px;">
                    ${PROMO_PERCENT}&thinsp;% Rabatt auf Business
                  </div>
                  <div style="margin-top:18px;display:inline-block;padding:12px 22px;background-color:rgba(59,130,246,0.18);border:1px dashed #3b82f6;border-radius:8px;">
                    <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:9px;color:#bfdbfe;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin-bottom:4px;">Dein Code</div>
                    <div class="promo-code" style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:24px;color:#ffffff;font-weight:700;letter-spacing:6px;">${PROMO_CODE}</div>
                  </div>
                  <p style="margin:20px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#cbd5e1;">
                    Code beim Checkout einl&ouml;sen. Gilt nur ${PROMO_DAYS} Tage und nur f&uuml;r dich.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:28px 56px 0;text-align:center;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
              <tr>
                <td style="background-color:#3b82f6;border-radius:30px;">
                  <a href="https://contract-ai.de/pricing?code=${PROMO_CODE}" class="cta-link" style="display:inline-block;padding:15px 34px;color:#ffffff;text-decoration:none;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.3px;">
                    Business jetzt ansehen &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:64px 56px 0;">
            <div style="border-top:1px solid #e5e7eb;height:1px;line-height:1px;font-size:0;">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:48px 56px 0;text-align:center;">
            <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#3b82f6;letter-spacing:3px;text-transform:uppercase;font-weight:700;">
              Free vs. Business
            </div>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:14px 56px 0;text-align:center;">
            <h2 class="section-h" style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:32px;line-height:1.25;color:#0f172a;font-weight:700;letter-spacing:-0.5px;">
              Der Unterschied,<br>den du sofort merkst.
            </h2>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:32px 40px 0;">
            <table role="presentation" class="compare-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
              <tr>
                <td class="compare-cell" valign="top" style="width:50%;padding:28px 24px;background-color:#fafafa;border-right:1px solid #e5e7eb;">
                  <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#6b7280;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:14px;">
                    Free
                  </div>
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:18px;color:#374151;font-weight:600;margin-bottom:18px;line-height:1.3;">
                    Du speicherst Vertr&auml;ge.
                  </div>
                  <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;color:#6b7280;line-height:1.7;">
                    &middot;&nbsp; 3 Analysen einmalig<br>
                    &middot;&nbsp; Grundlegende Risiko-Anzeige<br>
                    &middot;&nbsp; Manuelle Fristen-Pflege<br>
                    &middot;&nbsp; Keine Optimierungs&shy;vorschl&auml;ge<br>
                    &middot;&nbsp; Kein Vertragsvergleich
                  </div>
                </td>
                <td class="compare-cell compare-cell-last" valign="top" style="width:50%;padding:28px 24px;background-color:#eff6ff;">
                  <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#1e3a8a;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:14px;">
                    Business
                  </div>
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:18px;color:#0f172a;font-weight:700;margin-bottom:18px;line-height:1.3;">
                    Du kontrollierst Vertr&auml;ge.
                  </div>
                  <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;color:#1f2937;line-height:1.7;">
                    <span style="color:#3b82f6;font-weight:700;">&#10003;</span>&nbsp; 25 Tiefen-Analysen / Monat<br>
                    <span style="color:#3b82f6;font-weight:700;">&#10003;</span>&nbsp; Vollst&auml;ndige Risiko-Bewertung<br>
                    <span style="color:#3b82f6;font-weight:700;">&#10003;</span>&nbsp; Automatische Fristen-Erinnerung<br>
                    <span style="color:#3b82f6;font-weight:700;">&#10003;</span>&nbsp; Konkrete Optimierungen<br>
                    <span style="color:#3b82f6;font-weight:700;">&#10003;</span>&nbsp; Vertr&auml;ge direkt vergleichen
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:64px 56px 0;">
            <div style="border-top:1px solid #e5e7eb;height:1px;line-height:1px;font-size:0;">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:48px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fef3c7;border-radius:14px;">
              <tr>
                <td style="padding:48px 36px;text-align:center;background-color:#fef3c7;border-radius:14px;">
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:48px;line-height:1;color:#92400e;font-weight:700;margin-bottom:12px;">&ldquo;</div>
                  <p class="quote-text" style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:24px;line-height:1.45;color:#451a03;font-style:italic;font-weight:500;">
                    Wer Vertr&auml;ge nur speichert, reagiert.<br>
                    Wer Vertr&auml;ge versteht, entscheidet.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:64px 56px 0;text-align:center;">
            <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#3b82f6;letter-spacing:3px;text-transform:uppercase;font-weight:700;">
              Was Business ver&auml;ndert
            </div>
            <h2 class="section-h" style="margin:14px 0 0;font-family:'Playfair Display',Georgia,serif;font-size:30px;line-height:1.28;color:#0f172a;font-weight:700;letter-spacing:-0.4px;">
              Vier Ebenen,<br>auf denen du sofort gewinnst.
            </h2>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:48px 56px 0;text-align:center;">
            <div class="step-num" style="font-family:'Playfair Display',Georgia,serif;font-size:84px;line-height:1;color:#bfdbfe;font-weight:500;letter-spacing:-3px;">01</div>
            <h3 class="step-h" style="margin:14px 0 0;font-family:'Playfair Display',Georgia,serif;font-size:22px;color:#0f172a;font-weight:700;line-height:1.3;letter-spacing:-0.3px;">Mehr Sicherheit</h3>
            <p style="margin:10px auto 0;max-width:380px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#4b5563;">
              Erkenne kritische Klauseln fr&uuml;h &mdash; bevor sie teuer werden.
            </p>
          </td>
        </tr>
        <tr><td class="px-inner" style="padding:36px 56px 0;"><div style="border-top:1px solid #f3f4f6;height:1px;line-height:1px;font-size:0;">&nbsp;</div></td></tr>

        <tr>
          <td class="px-inner" style="padding:36px 56px 0;text-align:center;">
            <div class="step-num" style="font-family:'Playfair Display',Georgia,serif;font-size:84px;line-height:1;color:#bfdbfe;font-weight:500;letter-spacing:-3px;">02</div>
            <h3 class="step-h" style="margin:14px 0 0;font-family:'Playfair Display',Georgia,serif;font-size:22px;color:#0f172a;font-weight:700;line-height:1.3;letter-spacing:-0.3px;">Mehr Kontrolle</h3>
            <p style="margin:10px auto 0;max-width:380px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#4b5563;">
              Risiken, Fristen und Schw&auml;chen jederzeit im Blick. Ohne Tabellen-Chaos.
            </p>
          </td>
        </tr>
        <tr><td class="px-inner" style="padding:36px 56px 0;"><div style="border-top:1px solid #f3f4f6;height:1px;line-height:1px;font-size:0;">&nbsp;</div></td></tr>

        <tr>
          <td class="px-inner" style="padding:36px 56px 0;text-align:center;">
            <div class="step-num" style="font-family:'Playfair Display',Georgia,serif;font-size:84px;line-height:1;color:#bfdbfe;font-weight:500;letter-spacing:-3px;">03</div>
            <h3 class="step-h" style="margin:14px 0 0;font-family:'Playfair Display',Georgia,serif;font-size:22px;color:#0f172a;font-weight:700;line-height:1.3;letter-spacing:-0.3px;">Mehr Optimierung</h3>
            <p style="margin:10px auto 0;max-width:380px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#4b5563;">
              Konkrete Verbesserungs&shy;vorschl&auml;ge statt Bauchgef&uuml;hl. Direkt umsetzbar.
            </p>
          </td>
        </tr>
        <tr><td class="px-inner" style="padding:36px 56px 0;"><div style="border-top:1px solid #f3f4f6;height:1px;line-height:1px;font-size:0;">&nbsp;</div></td></tr>

        <tr>
          <td class="px-inner" style="padding:36px 56px 0;text-align:center;">
            <div class="step-num" style="font-family:'Playfair Display',Georgia,serif;font-size:84px;line-height:1;color:#bfdbfe;font-weight:500;letter-spacing:-3px;">04</div>
            <h3 class="step-h" style="margin:14px 0 0;font-family:'Playfair Display',Georgia,serif;font-size:22px;color:#0f172a;font-weight:700;line-height:1.3;letter-spacing:-0.3px;">Mehr Professionalit&auml;t</h3>
            <p style="margin:10px auto 0;max-width:380px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#4b5563;">
              Du arbeitest auf einem Niveau, das &uuml;ber Standard-Vertrags&shy;management hinausgeht.
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:64px 56px 0;">
            <div style="border-top:1px solid #e5e7eb;height:1px;line-height:1px;font-size:0;">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:48px 56px 0;text-align:center;">
            <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.75;color:#4b5563;">
              Jeder nicht optimierte Vertrag kann unn&ouml;tige Risiken oder Kosten enthalten.<br>
              Die Frage ist nicht, <em style="color:#0f172a;font-weight:500;">ob</em> bessere Vertragskontrolle sinnvoll ist &mdash;<br>
              sondern <em style="color:#0f172a;font-weight:500;">wie lange</em> du noch darauf verzichten willst.
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:48px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);background-color:#1e3a8a;border-radius:16px;">
              <tr>
                <td style="padding:48px 32px;text-align:center;background-color:#1e3a8a;border-radius:16px;">
                  <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#bfdbfe;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:16px;">
                    Nur noch ${PROMO_DAYS} Tage
                  </div>
                  <h3 class="final-h" style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:30px;line-height:1.25;color:#ffffff;font-weight:700;letter-spacing:-0.5px;">
                    Vertr&auml;ge sollten<br>f&uuml;r dich arbeiten.
                  </h3>
                  <p style="margin:16px 0 28px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#dbeafe;">
                    Mit Code <strong style="color:#ffffff;letter-spacing:2px;">${PROMO_CODE}</strong> sparst du ${PROMO_PERCENT}&thinsp;%.
                  </p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
                    <tr>
                      <td style="background-color:#ffffff;border-radius:30px;">
                        <a href="https://contract-ai.de/pricing?code=${PROMO_CODE}" class="cta-link" style="display:inline-block;padding:17px 40px;color:#1e3a8a;text-decoration:none;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.3px;">
                          Business jetzt freischalten &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:48px 56px 0;text-align:center;">
            <p style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:16px;line-height:2;color:#6b7280;font-style:italic;">
              Mehr Klarheit.<br>
              Weniger Risiko.<br>
              Bessere Entscheidungen.
            </p>
            <p style="margin:24px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;color:#0f172a;">
              Contract&nbsp;AI &nbsp;&middot;&nbsp; Business
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:40px 56px 56px;"></td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>`;

export const freeToBusinessEditorialTemplate: NewsletterTemplate = {
  id: 'free-to-business-editorial',
  label: 'Free → Business · Editorial',
  description: 'Klassisches Editorial-Premium-Layout. 4 Number-Sections (Mehr Sicherheit/Kontrolle/Optimierung/Professionalität) + Vergleichstabelle + Sand-Quote. Ausführlich, ruhig, professionell.',
  subject: 'Verträge kosten dich oft mehr, als du denkst',
  preheader: '10% Rabatt auf Business mit Code BUSINESS10 — nur 7 Tage.',
  title: 'Verträge kosten dich oft mehr, als du denkst',
  ctaText: 'Business jetzt freischalten',
  ctaUrl: 'https://contract-ai.de/pricing?code=BUSINESS10',
  body
};
