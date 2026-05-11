import type { NewsletterTemplate } from './index';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1631623843714-3b91f30ec1dc?w=1200&q=80&auto=format&fit=crop';
const CTA_URL = 'https://contract-ai.de/contracts';

const body = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="format-detection" content="telephone=no">
<title>Dein erster Vertrag wartet auf dich.</title>
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
    .step-num-inline { font-size:32px !important; }
    .quote-text { font-size:21px !important; line-height:1.42 !important; }
    .final-h { font-size:24px !important; line-height:1.25 !important; }
    .cta-link { padding:16px 28px !important; font-size:14px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f5f3ee;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;-webkit-font-smoothing:antialiased;">

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f5f3ee;">
Du hast dich registriert. Jetzt fehlt nur ein Klick.
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
            <a href="${CTA_URL}" style="display:block;line-height:0;font-size:0;">
              <img class="hero-img" src="${HERO_IMAGE}" alt="H&auml;nde tippen auf einem Laptop" width="488" height="320" style="width:100%;max-width:488px;height:320px;object-fit:cover;border-radius:12px;display:block;margin:0 auto;">
            </a>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:36px 56px 0;text-align:center;">
            <h1 class="hero-h" style="margin:0;font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-size:44px;line-height:1.1;color:#0f172a;font-weight:700;letter-spacing:-1px;">
              Dein erster Vertrag<br><em style="font-style:italic;font-weight:600;color:#1e3a8a;">wartet auf dich.</em>
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
              Du hast dich registriert. Jetzt fehlt nur ein Klick.<br>
              Dann wei&szlig;t du, worauf du dich eingelassen hast.
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:40px 56px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eff6ff;border-radius:14px;border:1px solid #dbeafe;">
              <tr>
                <td style="padding:28px 28px 24px;text-align:center;background-color:#eff6ff;border-radius:14px;">
                  <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#1e3a8a;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:12px;">
                    Weniger als eine Minute
                  </div>
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;line-height:1.3;color:#0f172a;font-weight:700;letter-spacing:-0.3px;margin-bottom:20px;">
                    So einfach geht&apos;s.
                  </div>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding:6px 0;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="42" valign="middle" style="padding-right:12px;text-align:left;">
                              <span class="step-num-inline" style="font-family:'Playfair Display',Georgia,serif;font-size:32px;line-height:1;color:#3b82f6;font-weight:700;letter-spacing:-1px;">01</span>
                            </td>
                            <td valign="middle" style="text-align:left;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#1f2937;font-weight:600;">
                              Hochladen. PDF oder Foto.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="42" valign="middle" style="padding-right:12px;text-align:left;">
                              <span class="step-num-inline" style="font-family:'Playfair Display',Georgia,serif;font-size:32px;line-height:1;color:#3b82f6;font-weight:700;letter-spacing:-1px;">02</span>
                            </td>
                            <td valign="middle" style="text-align:left;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#1f2937;font-weight:600;">
                              Wir pr&uuml;fen. Etwa 30 Sekunden.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="42" valign="middle" style="padding-right:12px;text-align:left;">
                              <span class="step-num-inline" style="font-family:'Playfair Display',Georgia,serif;font-size:32px;line-height:1;color:#3b82f6;font-weight:700;letter-spacing:-1px;">03</span>
                            </td>
                            <td valign="middle" style="text-align:left;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#1f2937;font-weight:600;">
                              Du wei&szlig;t Bescheid.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
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
                  <a href="${CTA_URL}" class="cta-link" style="display:inline-block;padding:15px 34px;color:#ffffff;text-decoration:none;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.3px;">
                    Erste Analyse starten &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:56px 56px 0;">
            <div style="border-top:1px solid #e5e7eb;height:1px;line-height:1px;font-size:0;">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:40px 56px 0;text-align:center;">
            <h2 class="section-h" style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:28px;line-height:1.28;color:#0f172a;font-weight:700;letter-spacing:-0.4px;">
              Was du nach 60 Sekunden wei&szlig;t.
            </h2>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:24px 56px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="36" valign="middle" style="padding-right:14px;">
                        <span style="display:inline-block;width:24px;height:24px;background-color:#dbeafe;color:#1e3a8a;border-radius:50%;text-align:center;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;line-height:24px;">&#10003;</span>
                      </td>
                      <td valign="middle" style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;color:#1f2937;line-height:1.5;">
                        Wie sicher dieser Vertrag wirklich ist.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="36" valign="middle" style="padding-right:14px;">
                        <span style="display:inline-block;width:24px;height:24px;background-color:#dbeafe;color:#1e3a8a;border-radius:50%;text-align:center;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;line-height:24px;">&#10003;</span>
                      </td>
                      <td valign="middle" style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;color:#1f2937;line-height:1.5;">
                        Welche Klauseln dich teuer werden k&ouml;nnen.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="36" valign="middle" style="padding-right:14px;">
                        <span style="display:inline-block;width:24px;height:24px;background-color:#dbeafe;color:#1e3a8a;border-radius:50%;text-align:center;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;line-height:24px;">&#10003;</span>
                      </td>
                      <td valign="middle" style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;color:#1f2937;line-height:1.5;">
                        Welche Fristen du nicht verpassen darfst.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:32px 56px 0;text-align:center;">
            <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.75;color:#64748b;font-style:italic;">
              Und das ist erst der Anfang.<br>
              Live-Warnungen bei neuen Urteilen, fertige Klausel-Verbesserungen, Vertrags-Chat und mehr &mdash; auf <a href="https://contract-ai.de" style="color:#1e3a8a;text-decoration:underline;font-weight:600;">contract-ai.de</a>.
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:48px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fef3c7;border-radius:14px;">
              <tr>
                <td style="padding:40px 32px;text-align:center;background-color:#fef3c7;border-radius:14px;">
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:40px;line-height:1;color:#92400e;font-weight:700;margin-bottom:8px;">&ldquo;</div>
                  <p class="quote-text" style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:22px;line-height:1.45;color:#451a03;font-style:italic;font-weight:500;">
                    Was du heute nicht erkennst,<br>kostet dich sp&auml;ter.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:40px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);background-color:#1e3a8a;border-radius:16px;">
              <tr>
                <td style="padding:44px 32px;text-align:center;background-color:#1e3a8a;border-radius:16px;">
                  <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#bfdbfe;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:14px;">
                    Der letzte Klick
                  </div>
                  <h3 class="final-h" style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:28px;line-height:1.25;color:#ffffff;font-weight:700;letter-spacing:-0.5px;">
                    Account steht.<br>Fehlt nur ein Vertrag.
                  </h3>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:24px auto 0;">
                    <tr>
                      <td style="background-color:#ffffff;border-radius:30px;">
                        <a href="${CTA_URL}" class="cta-link" style="display:inline-block;padding:17px 40px;color:#1e3a8a;text-decoration:none;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.3px;">
                          Erste Analyse starten &rarr;
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
              Du legst los.<br>
              Wir machen den Rest.
            </p>
            <p style="margin:20px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;color:#0f172a;">
              Contract&nbsp;AI &nbsp;&middot;&nbsp; Vertragsintelligenz
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

export const freeInactiveReactivationTemplate: NewsletterTemplate = {
  id: 'free-inactive-reactivation',
  label: 'Free-Inaktiv → Reaktivierung',
  description: 'Reaktivierungs-Mail mit 60-Sek-Anleitung, 3-Punkte-Versprechen und Sneak-Peek auf weitere Funktionen.',
  subject: 'Dein erster Vertrag wartet auf dich',
  preheader: 'Du hast dich registriert. Jetzt fehlt nur ein Klick.',
  title: 'Dein erster Vertrag wartet auf dich',
  ctaText: 'Erste Analyse starten',
  ctaUrl: CTA_URL,
  body
};
