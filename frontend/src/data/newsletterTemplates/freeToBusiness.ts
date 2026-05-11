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
<title>Wann hast du das letzte Mal einen Vertrag wirklich gelesen?</title>
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
    .hero-h { font-size:32px !important; line-height:1.18 !important; }
    .section-h { font-size:26px !important; line-height:1.22 !important; }
    .feat-h { font-size:22px !important; line-height:1.25 !important; }
    .quote-text { font-size:19px !important; line-height:1.5 !important; }
    .final-h { font-size:24px !important; line-height:1.25 !important; }
    .cta-link { padding:16px 28px !important; font-size:14px !important; }
    .promo-code { font-size:22px !important; letter-spacing:4px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f5f3ee;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;-webkit-font-smoothing:antialiased;">

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f5f3ee;">
Geht den meisten so. Genau deshalb gibt's ${PROMO_PERCENT}% Rabatt auf Business mit Code ${PROMO_CODE} &mdash; nur ${PROMO_DAYS} Tage.
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
            <h1 class="hero-h" style="margin:0;font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-size:38px;line-height:1.15;color:#0f172a;font-weight:700;letter-spacing:-0.8px;">
              Wann hast du das letzte Mal<br>einen Vertrag <em style="font-style:italic;font-weight:600;color:#1e3a8a;">wirklich</em> gelesen?
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
            <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:17px;line-height:1.6;color:#1f2937;font-weight:500;">
              Vom ersten Absatz bis zur letzten Klausel.
            </p>
            <p style="margin:8px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#94a3b8;font-style:italic;">
              Eben. Geht den meisten so.
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:28px 56px 0;text-align:center;">
            <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:#4b5563;">
              Genau deshalb steht in vielen Vertr&auml;gen etwas, das dich irgendwann teuer wird. Eine Klausel, die du &uuml;bersehen hast. Eine Frist, die du vergessen hast. Eine Verl&auml;ngerung, die du nicht wolltest.
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:28px 56px 0;text-align:center;">
            <p style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:20px;line-height:1.45;color:#0f172a;font-weight:600;">
              Contract AI liest deine Vertr&auml;ge.<br>Damit du es nicht musst.
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:40px 56px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0f172a;border-radius:14px;">
              <tr>
                <td style="padding:32px 28px;text-align:center;background-color:#0f172a;border-radius:14px;">
                  <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#93c5fd;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:14px;">
                    Nur noch ${PROMO_DAYS} Tage
                  </div>
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:28px;line-height:1.25;color:#ffffff;font-weight:700;letter-spacing:-0.3px;">
                    ${PROMO_PERCENT}&thinsp;% Rabatt auf Business
                  </div>
                  <div style="margin-top:18px;display:inline-block;padding:12px 22px;background-color:rgba(59,130,246,0.18);border:1px dashed #3b82f6;border-radius:8px;">
                    <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:9px;color:#bfdbfe;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin-bottom:4px;">Dein Code</div>
                    <div class="promo-code" style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:24px;color:#ffffff;font-weight:700;letter-spacing:6px;">${PROMO_CODE}</div>
                  </div>
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
                    Jetzt ${PROMO_PERCENT}&thinsp;% sichern &rarr;
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
              Was Business f&uuml;r dich macht
            </div>
            <h2 class="section-h" style="margin:14px 0 0;font-family:'Playfair Display',Georgia,serif;font-size:30px;line-height:1.28;color:#0f172a;font-weight:700;letter-spacing:-0.4px;">
              Drei Werkzeuge,<br>die du sofort sp&uuml;rst.
            </h2>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:40px 56px 0;">
            <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;font-weight:700;">
              01 &middot; Fr&uuml;hwarnung
            </div>
            <h3 class="feat-h" style="margin:8px 0 12px;font-family:'Playfair Display',Georgia,serif;font-size:24px;line-height:1.25;color:#0f172a;font-weight:700;letter-spacing:-0.3px;">
              Du erf&auml;hrst es zuerst.
            </h3>
            <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14.5px;line-height:1.7;color:#4b5563;">
              Ein neues Urteil. Eine Gesetzes&auml;nderung. Eine Klausel, die pl&ouml;tzlich nicht mehr h&auml;lt. Wir beobachten die Rechtslage f&uuml;r dich. Wenn etwas deinen Vertrag betrifft, wei&szlig;t du es, bevor es jemand anderes mitkriegt.
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:28px 56px 0;"><div style="border-top:1px solid #f3f4f6;height:1px;line-height:1px;font-size:0;">&nbsp;</div></td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:28px 56px 0;">
            <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;font-weight:700;">
              02 &middot; Bessere Klauseln
            </div>
            <h3 class="feat-h" style="margin:8px 0 12px;font-family:'Playfair Display',Georgia,serif;font-size:24px;line-height:1.25;color:#0f172a;font-weight:700;letter-spacing:-0.3px;">
              Fertig zum Kopieren.
            </h3>
            <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14.5px;line-height:1.7;color:#4b5563;">
              Wir zeigen dir nicht nur, was in deinem Vertrag schlecht ist. Wir liefern die bessere Formulierung gleich mit. Du kopierst sie. Du f&uuml;gst sie ein. Fertig.
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:28px 56px 0;"><div style="border-top:1px solid #f3f4f6;height:1px;line-height:1px;font-size:0;">&nbsp;</div></td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:28px 56px 0;">
            <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;font-weight:700;">
              03 &middot; Dein Vertrag antwortet
            </div>
            <h3 class="feat-h" style="margin:8px 0 12px;font-family:'Playfair Display',Georgia,serif;font-size:24px;line-height:1.25;color:#0f172a;font-weight:700;letter-spacing:-0.3px;">
              Frag, was du wissen willst.
            </h3>
            <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14.5px;line-height:1.7;color:#4b5563;">
              &bdquo;Wann kann ich k&uuml;ndigen?&ldquo; &bdquo;Was passiert bei Verzug?&ldquo; Stell deinem Vertrag jede Frage, die du sonst einem Anwalt stellst. Antwort in zwei S&auml;tzen. In deiner Sprache.
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:36px 56px 0;text-align:center;">
            <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:#64748b;font-style:italic;">
              Und f&uuml;nf weitere Werkzeuge, die deine Vertr&auml;ge sicherer machen.<br>
              <a href="https://contract-ai.de" style="color:#1e3a8a;text-decoration:underline;font-weight:600;">Alle auf contract-ai.de</a>
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:56px 56px 0;">
            <div style="border-top:1px solid #e5e7eb;height:1px;line-height:1px;font-size:0;">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:48px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border-radius:12px;border-left:3px solid #3b82f6;">
              <tr>
                <td style="padding:32px 32px;">
                  <p class="quote-text" style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:20px;line-height:1.55;color:#0f172a;font-style:italic;font-weight:500;">
                    Wir bauen Contract AI f&uuml;r Menschen, die nicht mehr unterschreiben wollen, ohne wirklich zu wissen, worauf sie sich einlassen.
                  </p>
                  <p style="margin:20px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#64748b;font-weight:600;">
                    Noah &middot; Gr&uuml;nder von Contract AI
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:48px 56px 0;text-align:center;">
            <p style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:22px;line-height:1.5;color:#0f172a;font-weight:600;">
              ${PROMO_PERCENT}&thinsp;% Rabatt sind ein paar Euro.<br>
              <em style="font-style:italic;color:#1e3a8a;">Eine &uuml;bersehene Klausel sind oft tausende.</em>
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:32px 56px 0;text-align:center;">
            <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#94a3b8;font-style:italic;">
              Bereits genutzt von Privatpersonen und Selbstst&auml;ndigen, die ihre Vertr&auml;ge nicht mehr dem Zufall &uuml;berlassen.
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:32px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);background-color:#1e3a8a;border-radius:16px;">
              <tr>
                <td style="padding:44px 32px;text-align:center;background-color:#1e3a8a;border-radius:16px;">
                  <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#bfdbfe;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:14px;">
                    Nur noch ${PROMO_DAYS} Tage
                  </div>
                  <h3 class="final-h" style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:30px;line-height:1.25;color:#ffffff;font-weight:700;letter-spacing:-0.5px;">
                    Sch&uuml;tz dich,<br>bevor's teuer wird.
                  </h3>
                  <p style="margin:14px 0 24px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#dbeafe;">
                    Code <strong style="color:#ffffff;letter-spacing:2px;">${PROMO_CODE}</strong> beim Checkout. ${PROMO_PERCENT}&thinsp;% Rabatt.
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
          <td class="px-inner" style="padding:40px 56px 0;text-align:center;">
            <p style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:15px;line-height:2;color:#6b7280;font-style:italic;">
              Mehr Klarheit.<br>
              Weniger Risiko.<br>
              Bessere Entscheidungen.
            </p>
            <p style="margin:20px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;color:#0f172a;">
              Contract&nbsp;AI &nbsp;&middot;&nbsp; Business
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:32px 56px 48px;"></td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>`;

export const freeToBusinessTemplate: NewsletterTemplate = {
  id: 'free-to-business',
  label: 'Free → Business (Launch-Aktion)',
  description: 'Pattern-Interrupt-Hook + 3 große Feature-Stories + Founder-Voice + Preis-Anchoring. Verkaufs-psychologisch durchstrukturiert.',
  subject: 'Wann hast du das letzte Mal einen Vertrag wirklich gelesen?',
  preheader: 'Geht den meisten so. Genau deshalb gibt\'s 10% auf Business — 7 Tage.',
  title: 'Wann hast du das letzte Mal einen Vertrag wirklich gelesen?',
  ctaText: 'Business jetzt freischalten',
  ctaUrl: 'https://contract-ai.de/pricing?code=BUSINESS10',
  body
};
