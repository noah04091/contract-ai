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
<title>Dein erster Vertrag wartet.</title>
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
Du hast den ersten Schritt gemacht. Jetzt fehlt nur noch einer &mdash; 60 Sekunden bis zur ersten Vertragsanalyse.
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
              Du hast den ersten Schritt schon gemacht &mdash; die Registrierung.<br>
              Jetzt fehlt nur noch ein einziger, um zu sehen, was in deinen Vertr&auml;gen wirklich steckt.
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:48px 56px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eff6ff;border-radius:14px;border:1px solid #dbeafe;">
              <tr>
                <td style="padding:32px 28px;text-align:center;background-color:#eff6ff;border-radius:14px;">
                  <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#1e3a8a;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:14px;">
                    60 Sekunden bis zur Analyse
                  </div>
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:24px;line-height:1.3;color:#0f172a;font-weight:700;letter-spacing:-0.3px;margin-bottom:24px;">
                    So einfach geht&apos;s.
                  </div>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding:8px 0;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="48" valign="top" style="padding-right:14px;text-align:left;">
                              <span class="step-num-inline" style="font-family:'Playfair Display',Georgia,serif;font-size:36px;line-height:1;color:#3b82f6;font-weight:700;letter-spacing:-1px;">01</span>
                            </td>
                            <td valign="middle" style="text-align:left;">
                              <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.55;color:#1f2937;font-weight:600;">Vertrag hochladen</div>
                              <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;color:#6b7280;">PDF oder Foto &mdash; Drag &amp; Drop, fertig.</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="48" valign="top" style="padding-right:14px;text-align:left;">
                              <span class="step-num-inline" style="font-family:'Playfair Display',Georgia,serif;font-size:36px;line-height:1;color:#3b82f6;font-weight:700;letter-spacing:-1px;">02</span>
                            </td>
                            <td valign="middle" style="text-align:left;">
                              <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.55;color:#1f2937;font-weight:600;">KI pr&uuml;ft automatisch</div>
                              <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;color:#6b7280;">In etwa 30 Sekunden &mdash; kein manuelles Markieren n&ouml;tig.</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="48" valign="top" style="padding-right:14px;text-align:left;">
                              <span class="step-num-inline" style="font-family:'Playfair Display',Georgia,serif;font-size:36px;line-height:1;color:#3b82f6;font-weight:700;letter-spacing:-1px;">03</span>
                            </td>
                            <td valign="middle" style="text-align:left;">
                              <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.55;color:#1f2937;font-weight:600;">Ergebnis durchlesen</div>
                              <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;color:#6b7280;">Risiken, Fristen und konkrete Hinweise auf einen Blick.</div>
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
          <td class="px-inner" style="padding:64px 56px 0;">
            <div style="border-top:1px solid #e5e7eb;height:1px;line-height:1px;font-size:0;">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:48px 56px 0;text-align:center;">
            <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#3b82f6;letter-spacing:3px;text-transform:uppercase;font-weight:700;">
              Was du sofort siehst
            </div>
            <h2 class="section-h" style="margin:14px 0 0;font-family:'Playfair Display',Georgia,serif;font-size:30px;line-height:1.28;color:#0f172a;font-weight:700;letter-spacing:-0.4px;">
              Vier Dinge,<br>direkt nach dem Upload.
            </h2>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:32px 56px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:14px 0;border-bottom:1px solid #f3f4f6;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="36" valign="top" style="padding-right:14px;padding-top:2px;">
                        <span style="display:inline-block;width:24px;height:24px;background-color:#dbeafe;color:#1e3a8a;border-radius:50%;text-align:center;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;line-height:24px;">&#10003;</span>
                      </td>
                      <td valign="middle">
                        <div style="font-family:'Playfair Display',Georgia,serif;font-size:17px;color:#0f172a;font-weight:700;line-height:1.35;">Vollst&auml;ndiger Risiko-Score</div>
                        <div style="margin-top:4px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;color:#6b7280;line-height:1.6;">Eine Zahl, die zeigt: Wie sicher ist dieser Vertrag wirklich.</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 0;border-bottom:1px solid #f3f4f6;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="36" valign="top" style="padding-right:14px;padding-top:2px;">
                        <span style="display:inline-block;width:24px;height:24px;background-color:#dbeafe;color:#1e3a8a;border-radius:50%;text-align:center;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;line-height:24px;">&#10003;</span>
                      </td>
                      <td valign="middle">
                        <div style="font-family:'Playfair Display',Georgia,serif;font-size:17px;color:#0f172a;font-weight:700;line-height:1.35;">Kritische Klauseln markiert</div>
                        <div style="margin-top:4px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;color:#6b7280;line-height:1.6;">Direkt im Vertragstext &mdash; mit Erkl&auml;rung, warum sie problematisch sind.</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 0;border-bottom:1px solid #f3f4f6;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="36" valign="top" style="padding-right:14px;padding-top:2px;">
                        <span style="display:inline-block;width:24px;height:24px;background-color:#dbeafe;color:#1e3a8a;border-radius:50%;text-align:center;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;line-height:24px;">&#10003;</span>
                      </td>
                      <td valign="middle">
                        <div style="font-family:'Playfair Display',Georgia,serif;font-size:17px;color:#0f172a;font-weight:700;line-height:1.35;">Konkrete Verbesserungs-Hinweise</div>
                        <div style="margin-top:4px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;color:#6b7280;line-height:1.6;">Statt nur Probleme zu zeigen &mdash; sagen wir dir, was du daran &auml;ndern kannst.</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="36" valign="top" style="padding-right:14px;padding-top:2px;">
                        <span style="display:inline-block;width:24px;height:24px;background-color:#dbeafe;color:#1e3a8a;border-radius:50%;text-align:center;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;line-height:24px;">&#10003;</span>
                      </td>
                      <td valign="middle">
                        <div style="font-family:'Playfair Display',Georgia,serif;font-size:17px;color:#0f172a;font-weight:700;line-height:1.35;">Fristen, die du sonst &uuml;bersiehst</div>
                        <div style="margin-top:4px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;color:#6b7280;line-height:1.6;">K&uuml;ndigungsfristen, Verl&auml;ngerungsdaten, Stichtage &mdash; automatisch erkannt.</div>
                      </td>
                    </tr>
                  </table>
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
                    Was nicht gepr&uuml;ft ist,<br>bleibt eine Black-Box.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:64px 56px 0;text-align:center;">
            <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#3b82f6;letter-spacing:3px;text-transform:uppercase;font-weight:700;">
              Worauf wir automatisch pr&uuml;fen
            </div>
            <h2 class="section-h" style="margin:14px 0 0;font-family:'Playfair Display',Georgia,serif;font-size:30px;line-height:1.28;color:#0f172a;font-weight:700;letter-spacing:-0.4px;">
              Die Muster,<br>die fast jeder &uuml;bersieht.
            </h2>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:32px 56px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:10px 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#374151;">
                  <span style="color:#3b82f6;font-weight:700;margin-right:10px;">&middot;</span> Versteckte automatische Verl&auml;ngerungsklauseln
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#374151;">
                  <span style="color:#3b82f6;font-weight:700;margin-right:10px;">&middot;</span> Unklare oder zu lange K&uuml;ndigungsfristen
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#374151;">
                  <span style="color:#3b82f6;font-weight:700;margin-right:10px;">&middot;</span> Einseitige Haftungs-Beschr&auml;nkungen
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#374151;">
                  <span style="color:#3b82f6;font-weight:700;margin-right:10px;">&middot;</span> Asymmetrische Vertragsbedingungen
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#374151;">
                  <span style="color:#3b82f6;font-weight:700;margin-right:10px;">&middot;</span> Versteckte Preisanpassungs-Mechanismen
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#374151;">
                  <span style="color:#3b82f6;font-weight:700;margin-right:10px;">&middot;</span> Unklare Datenschutz-Regelungen
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
            <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.75;color:#4b5563;">
              Vertr&auml;ge, die nicht gepr&uuml;ft sind,<br>
              kosten Geld &mdash; oft genau dann, wenn du es <em style="color:#0f172a;font-weight:500;">am wenigsten erwartest</em>.
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:48px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);background-color:#1e3a8a;border-radius:16px;">
              <tr>
                <td style="padding:48px 32px;text-align:center;background-color:#1e3a8a;border-radius:16px;">
                  <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#bfdbfe;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:16px;">
                    Der letzte Klick
                  </div>
                  <h3 class="final-h" style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:30px;line-height:1.25;color:#ffffff;font-weight:700;letter-spacing:-0.5px;">
                    Du hast den schwersten<br>Teil hinter dir.
                  </h3>
                  <p style="margin:16px 0 28px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#dbeafe;">
                    Account ist da. Login geht. Jetzt fehlt nur eins: dein erster Vertrag.
                  </p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
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
          <td class="px-inner" style="padding:48px 56px 0;text-align:center;">
            <p style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:16px;line-height:2;color:#6b7280;font-style:italic;">
              Du legst los.<br>
              Wir machen den Rest.
            </p>
            <p style="margin:24px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;color:#0f172a;">
              Contract&nbsp;AI &nbsp;&middot;&nbsp; Vertragsintelligenz
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

export const freeInactiveReactivationTemplate: NewsletterTemplate = {
  id: 'free-inactive-reactivation',
  label: 'Free-Inaktiv → Reaktivierung',
  description: 'Für registrierte Free-User, die noch keine Analyse gestartet haben. Quick-Win-Hook, niedrigschwellige Aktivierung, kein Verkaufs-Push.',
  subject: 'Dein erster Vertrag wartet auf dich',
  preheader: '60 Sekunden bis zur ersten Vertragsanalyse — so geht\'s.',
  title: 'Dein erster Vertrag wartet auf dich',
  ctaText: 'Erste Analyse starten',
  ctaUrl: CTA_URL,
  body
};
