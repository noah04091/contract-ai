import type { NewsletterTemplate } from './index';

const PROMO_CODE = 'AKTION10';
const PROMO_PERCENT = '10';
const PROMO_DAYS = '7';
// Rabattierte Monatspreise (Basis: Business 19€, Enterprise 29€ — bei Coupon-Änderung mit anpassen!)
const PROMO_PRICE_BUSINESS = '17,10';
const PROMO_PRICE_ENTERPRISE = '26,10';

const body = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="format-detection" content="telephone=no">
<title>Liest du deine Verträge wirklich?</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; max-width:100%; height:auto; display:block; }
  a { text-decoration:none; }
  @media only screen and (max-width:620px) {
    .container { width:100% !important; max-width:100% !important; border-radius:0 !important; }
    .px-outer { padding:0 !important; }
    .px-inner { padding-left:20px !important; padding-right:20px !important; }
    .hero-h { font-size:30px !important; line-height:1.15 !important; }
    .section-h { font-size:24px !important; line-height:1.2 !important; }
    .feat-h { font-size:18px !important; }
    .cta-link { display:block !important; padding:16px 20px !important; font-size:15px !important; }
    .promo-code { font-size:22px !important; letter-spacing:4px !important; }
    .price-table td { display:block !important; width:100% !important; }
    .price-card { margin-bottom:14px !important; }
    .bonus-pill { display:inline-block !important; margin:4px 2px !important; }
    .mock-quote { font-size:12px !important; }
    .header-pill { display:none !important; }
    .final-h { font-size:26px !important; }
    .br-desk { display:none !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f3f5fa;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;-webkit-font-smoothing:antialiased;">

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f3f5fa;">
Geht den meisten so. ${PROMO_PERCENT}&thinsp;% Rabatt mit Code ${PROMO_CODE} &mdash; nur ${PROMO_DAYS} Tage. Im Jahresabo: aufs ganze Jahr.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f5fa;">
  <tr>
    <td align="center" class="px-outer" style="padding:36px 16px;">

      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:20px;overflow:hidden;max-width:600px;width:100%;border:1px solid #e7ebf3;">

        <!-- ═══ HEADER: Logo + Aktion-Pill ═══ -->
        <tr>
          <td class="px-inner" style="padding:28px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle;">
                  <img src="https://www.contract-ai.de/logo.png" alt="Contract AI" width="128" height="33" style="height:33px;width:auto;max-width:128px;display:block;border:0;">
                </td>
                <td align="right" style="vertical-align:middle;">
                  <span class="header-pill" style="display:inline-block;padding:7px 14px;background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:20px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;color:#1d4ed8;letter-spacing:0.5px;">
                    &minus;${PROMO_PERCENT}&thinsp;% &middot; nur ${PROMO_DAYS} Tage
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ═══ HERO ═══ -->
        <tr>
          <td class="px-inner" style="padding:44px 40px 0;text-align:center;">
            <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:#64748b;letter-spacing:2px;text-transform:uppercase;font-weight:600;">
              Pers&ouml;nlich f&uuml;r {{firstName}}
            </div>
            <h1 class="hero-h" style="margin:16px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:38px;line-height:1.12;color:#0f172a;font-weight:800;letter-spacing:-1.2px;">
              Liest du deine Vertr&auml;ge<br><span style="color:#2563eb;">wirklich</span>?
            </h1>
            <p style="margin:18px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.65;color:#475569;">
              Vom ersten Absatz bis zur letzten Klausel? Geht den meisten so.<br class="br-desk">
              Und genau dort wird es teuer: eine &uuml;bersehene Klausel, eine vergessene Frist, eine Verl&auml;ngerung, die du nie wolltest.
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:28px 40px 0;text-align:center;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
              <tr>
                <td style="background:linear-gradient(135deg,#2563eb 0%,#1e40af 100%);background-color:#2563eb;border-radius:12px;">
                  <a href="https://contract-ai.de/pricing?code=${PROMO_CODE}" class="cta-link" style="display:inline-block;padding:16px 36px;color:#ffffff;text-decoration:none;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.2px;">
                    Vertr&auml;ge absichern &rarr;
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:14px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.6;color:#94a3b8;">
              Monatlich k&uuml;ndbar &nbsp;&middot;&nbsp; 14 Tage Geld-zur&uuml;ck-Garantie
            </p>
            <p style="margin:6px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.6;color:#2563eb;font-weight:600;">
              ${PROMO_PERCENT}&thinsp;% Rabatt mit Code ${PROMO_CODE} &middot; nur noch ${PROMO_DAYS} Tage
            </p>
          </td>
        </tr>

        <!-- ═══ PRODUKT-MOCK: So sieht eine Analyse aus ═══ -->
        <tr>
          <td class="px-inner" style="padding:44px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;">
              <!-- Mock-Header -->
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="vertical-align:middle;">
                        <span style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12.5px;font-weight:600;color:#334155;">&#128196;&nbsp; Dienstleistungsvertrag_2026.pdf</span>
                      </td>
                      <td align="right" style="vertical-align:middle;">
                        <span style="display:inline-block;padding:4px 12px;background-color:#fef2f2;border:1px solid #fecaca;border-radius:14px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;font-weight:800;color:#dc2626;white-space:nowrap;">43&thinsp;/&thinsp;100</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Risiko-Zeile 1 -->
              <tr>
                <td style="padding:16px 20px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border:1px solid #e2e8f0;border-left:3px solid #dc2626;border-radius:10px;">
                    <tr>
                      <td style="padding:13px 16px;">
                        <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;color:#0f172a;">
                          Automatische Verl&auml;ngerung um 12 Monate
                          <span style="display:inline-block;padding:2px 8px;margin-left:6px;background-color:#eff6ff;border-radius:10px;font-size:10px;font-weight:700;color:#1d4ed8;vertical-align:middle;">&#10003; W&ouml;rtlich belegt</span>
                        </div>
                        <div class="mock-quote" style="margin-top:6px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.55;color:#64748b;font-style:italic;">
                          &bdquo;&hellip; verl&auml;ngert sich der Vertrag jeweils um weitere 12 Monate, sofern nicht sp&auml;testens 3 Monate vor Ablauf &hellip;&ldquo; &mdash; &sect;&thinsp;11 Abs.&thinsp;2
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Risiko-Zeile 2 -->
              <tr>
                <td style="padding:10px 20px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border:1px solid #e2e8f0;border-left:3px solid #f59e0b;border-radius:10px;">
                    <tr>
                      <td style="padding:13px 16px;">
                        <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;color:#0f172a;">
                          K&uuml;ndigungsfrist: 3 Monate zum Laufzeitende
                        </div>
                        <div style="margin-top:4px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12.5px;color:#64748b;">
                          Frist automatisch im Kalender &mdash; Erinnerung rechtzeitig vorher.
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Optimierungs-Zeile -->
              <tr>
                <td style="padding:10px 20px 18px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;">
                    <tr>
                      <td style="padding:12px 16px;">
                        <span style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12.5px;font-weight:600;color:#1d4ed8;">&#9998;&nbsp; 3 bessere Formulierungen fertig zum Kopieren</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <p style="margin:12px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#94a3b8;text-align:center;">
              So pr&uuml;ft Contract AI jeden Vertrag &mdash; vom Handyvertrag bis zum Gewerbemietvertrag. Beispiel-Analyse.
            </p>
          </td>
        </tr>

        <!-- ═══ DIVIDER ═══ -->
        <tr>
          <td class="px-inner" style="padding:44px 40px 0;">
            <div style="border-top:1px solid #eef1f6;height:1px;line-height:1px;font-size:0;">&nbsp;</div>
          </td>
        </tr>

        <!-- ═══ 3 FEATURES ═══ -->
        <tr>
          <td class="px-inner" style="padding:40px 40px 0;text-align:center;">
            <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:#2563eb;letter-spacing:2.5px;text-transform:uppercase;font-weight:700;">
              Was Premium f&uuml;r dich &uuml;bernimmt
            </div>
            <h2 class="section-h" style="margin:12px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:28px;line-height:1.2;color:#0f172a;font-weight:800;letter-spacing:-0.6px;">
              Drei Dinge, die du<br>sofort sp&uuml;rst.
            </h2>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:32px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:44px;vertical-align:top;padding-top:2px;">
                  <span style="display:inline-block;width:32px;height:32px;line-height:32px;background-color:#eff6ff;border-radius:9px;text-align:center;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;font-weight:800;color:#1d4ed8;">1</span>
                </td>
                <td style="vertical-align:top;">
                  <h3 class="feat-h" style="margin:0 0 6px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:18px;line-height:1.3;color:#0f172a;font-weight:700;letter-spacing:-0.3px;">
                    W&ouml;rtlich belegt statt behauptet.
                  </h3>
                  <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#475569;">
                    Jedes gefundene Risiko zeigt dir die Klausel im Wortlaut &mdash; du siehst schwarz auf wei&szlig;, wo es steht. Keine vagen KI-Behauptungen.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:24px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:44px;vertical-align:top;padding-top:2px;">
                  <span style="display:inline-block;width:32px;height:32px;line-height:32px;background-color:#eff6ff;border-radius:9px;text-align:center;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;font-weight:800;color:#1d4ed8;">2</span>
                </td>
                <td style="vertical-align:top;">
                  <h3 class="feat-h" style="margin:0 0 6px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:18px;line-height:1.3;color:#0f172a;font-weight:700;letter-spacing:-0.3px;">
                    Fristen, bevor sie ablaufen.
                  </h3>
                  <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#475569;">
                    K&uuml;ndigungsfristen landen automatisch im Kalender. Und bei einer erhaltenen K&uuml;ndigung erkennt Contract AI sogar die 3-Wochen-Klagefrist (&sect;&thinsp;4 KSchG) &mdash; am Tag&thinsp;1, nicht wenn es zu sp&auml;t ist.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:24px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:44px;vertical-align:top;padding-top:2px;">
                  <span style="display:inline-block;width:32px;height:32px;line-height:32px;background-color:#eff6ff;border-radius:9px;text-align:center;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;font-weight:800;color:#1d4ed8;">3</span>
                </td>
                <td style="vertical-align:top;">
                  <h3 class="feat-h" style="margin:0 0 6px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:18px;line-height:1.3;color:#0f172a;font-weight:700;letter-spacing:-0.3px;">
                    Frag deinen Vertrag einfach.
                  </h3>
                  <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#475569;">
                    &bdquo;Wann kann ich k&uuml;ndigen?&ldquo; &bdquo;Wer haftet bei Verzug?&ldquo; Stell die Fragen, die du sonst einem Anwalt stellst &mdash; Antwort in zwei S&auml;tzen, in deiner Sprache.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ═══ BONUS-PILLS ═══ -->
        <tr>
          <td class="px-inner" style="padding:36px 40px 0;text-align:center;">
            <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;font-weight:700;margin-bottom:14px;">
              Und dazu
            </div>
            <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:2;color:#334155;">
              <span class="bonus-pill" style="display:inline-block;padding:6px 14px;margin:4px 3px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:20px;font-weight:600;font-size:12.5px;color:#0f172a;">&#128247;&nbsp; Foto vom Vertrag gen&uuml;gt</span>
              <span class="bonus-pill" style="display:inline-block;padding:6px 14px;margin:4px 3px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:20px;font-weight:600;font-size:12.5px;color:#0f172a;">&#9878;&nbsp; Fr&uuml;hwarnung bei Urteilen</span>
              <span class="bonus-pill" style="display:inline-block;padding:6px 14px;margin:4px 3px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:20px;font-weight:600;font-size:12.5px;color:#0f172a;">&#128203;&nbsp; Vertragsvergleich</span>
              <span class="bonus-pill" style="display:inline-block;padding:6px 14px;margin:4px 3px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:20px;font-weight:600;font-size:12.5px;color:#0f172a;">&#9997;&nbsp; Vertragsgenerator</span>
              <span class="bonus-pill" style="display:inline-block;padding:6px 14px;margin:4px 3px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:20px;font-weight:600;font-size:12.5px;color:#0f172a;">&#128465;&nbsp; 1-Klick-K&uuml;ndigung</span>
            </div>
          </td>
        </tr>

        <!-- ═══ DIVIDER ═══ -->
        <tr>
          <td class="px-inner" style="padding:44px 40px 0;">
            <div style="border-top:1px solid #eef1f6;height:1px;line-height:1px;font-size:0;">&nbsp;</div>
          </td>
        </tr>

        <!-- ═══ PRICING ═══ -->
        <tr>
          <td class="px-inner" style="padding:40px 40px 0;text-align:center;">
            <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:#2563eb;letter-spacing:2.5px;text-transform:uppercase;font-weight:700;">
              Transparent &amp; monatlich k&uuml;ndbar
            </div>
            <h2 class="section-h" style="margin:12px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:28px;line-height:1.2;color:#0f172a;font-weight:800;letter-spacing:-0.6px;">
              Weniger als ein<br>Mittagessen im Monat.
            </h2>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:30px 24px 0;">
            <table role="presentation" class="price-table" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>

                <!-- FREE -->
                <td class="price-card" valign="top" style="width:33.33%;padding:6px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:14px;background-color:#ffffff;">
                    <tr>
                      <td style="padding:20px 16px;">
                        <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:#64748b;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">Starter</div>
                        <div style="margin-top:10px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:26px;color:#0f172a;font-weight:800;letter-spacing:-0.5px;">0&thinsp;&euro;</div>
                        <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11.5px;color:#94a3b8;">dein aktueller Plan</div>
                        <div style="margin-top:12px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;color:#64748b;line-height:1.8;">
                          &middot;&nbsp;3 Analysen inklusive<br>
                          &middot;&nbsp;Basis-Risiken<br>
                          &middot;&nbsp;Fristen selbst im Kopf
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>

                <!-- BUSINESS -->
                <td class="price-card" valign="top" style="width:33.33%;padding:6px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:14px;background-color:#ffffff;">
                    <tr>
                      <td style="padding:20px 16px;">
                        <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:#1d4ed8;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">Business</div>
                        <div style="margin-top:10px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:26px;color:#0f172a;font-weight:800;letter-spacing:-0.5px;">19&thinsp;&euro;<span style="font-size:13px;color:#64748b;font-weight:600;">/Monat</span></div>
                        <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11.5px;color:#16a34a;font-weight:700;">${PROMO_PRICE_BUSINESS}&thinsp;&euro; mit Code</div>
                        <div style="margin-top:12px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;color:#334155;line-height:1.8;">
                          <span style="color:#2563eb;font-weight:700;">&#10003;</span>&nbsp;25 Analysen/Monat<br>
                          <span style="color:#2563eb;font-weight:700;">&#10003;</span>&nbsp;Premium-Features<br>
                          <span style="color:#2563eb;font-weight:700;">&#10003;</span>&nbsp;Fristen automatisch
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>

                <!-- ENTERPRISE ★ MEIST GEWÄHLT -->
                <td class="price-card" valign="top" style="width:33.33%;padding:6px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #f59e0b;border-radius:14px;background-color:#ffffff;">
                    <tr>
                      <td style="padding:0;">
                        <div style="padding:6px 12px;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);background-color:#f59e0b;border-radius:11px 11px 0 0;text-align:center;">
                          <span style="color:#ffffff;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">&#9733; Meist gew&auml;hlt</span>
                        </div>
                        <div style="padding:16px 16px 20px;">
                          <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:#b45309;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">Enterprise</div>
                          <div style="margin-top:10px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:26px;color:#0f172a;font-weight:800;letter-spacing:-0.5px;">29&thinsp;&euro;<span style="font-size:13px;color:#64748b;font-weight:600;">/Monat</span></div>
                          <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11.5px;color:#16a34a;font-weight:700;">${PROMO_PRICE_ENTERPRISE}&thinsp;&euro; mit Code</div>
                          <div style="margin-top:12px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;color:#334155;line-height:1.8;">
                            <span style="color:#d97706;font-weight:700;">&#10003;</span>&nbsp;Ohne Analyse-Limit<br>
                            <span style="color:#d97706;font-weight:700;">&#10003;</span>&nbsp;API &amp; Excel-Export<br>
                            <span style="color:#d97706;font-weight:700;">&#10003;</span>&nbsp;CRM-Integrationen
                          </div>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>

              </tr>
            </table>
            <p style="margin:14px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#94a3b8;text-align:center;">
              Im Jahresabo sparst du zus&auml;tzlich &mdash; und der Code gilt dort aufs ganze Jahr.
            </p>
          </td>
        </tr>

        <!-- ═══ DARK OFFER PANEL ═══ -->
        <tr>
          <td class="px-inner" style="padding:40px 32px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:16px;">
              <tr>
                <td style="padding:36px 28px;text-align:center;">
                  <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#1d4ed8;letter-spacing:3px;text-transform:uppercase;font-weight:700;">
                    Nur noch ${PROMO_DAYS} Tage
                  </div>
                  <div style="margin-top:12px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:30px;line-height:1.2;color:#0f172a;font-weight:800;letter-spacing:-0.6px;">
                    ${PROMO_PERCENT}&thinsp;% Rabatt auf<br>deinen Schutz
                  </div>
                  <div style="margin-top:20px;display:inline-block;padding:12px 24px;background-color:#ffffff;border:1px dashed #2563eb;border-radius:10px;">
                    <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:9px;color:#64748b;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin-bottom:4px;">Dein Code</div>
                    <div class="promo-code" style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:24px;color:#1e3a8a;font-weight:800;letter-spacing:6px;">${PROMO_CODE}</div>
                  </div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;border-top:1px solid #bfdbfe;">
                    <tr>
                      <td style="padding:14px 0 4px;color:#475569;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12.5px;text-align:left;">Monatsabo</td>
                      <td style="padding:14px 0 4px;color:#0f172a;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12.5px;font-weight:700;text-align:right;">${PROMO_PERCENT}&thinsp;% f&uuml;r 3 Monate</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:#475569;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12.5px;text-align:left;">Jahresabo</td>
                      <td style="padding:4px 0;color:#0f172a;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12.5px;font-weight:700;text-align:right;">${PROMO_PERCENT}&thinsp;% aufs ganze Jahr</td>
                    </tr>
                  </table>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:24px auto 0;">
                    <tr>
                      <td style="background:linear-gradient(135deg,#2563eb 0%,#1e40af 100%);background-color:#2563eb;border-radius:12px;">
                        <a href="https://contract-ai.de/pricing?code=${PROMO_CODE}" class="cta-link" style="display:inline-block;padding:15px 34px;color:#ffffff;text-decoration:none;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14.5px;font-weight:700;letter-spacing:0.2px;">
                          Rabatt einl&ouml;sen &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:14px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11.5px;line-height:1.6;color:#64748b;">
                    Code wird im Checkout automatisch angewendet.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ═══ FOUNDER QUOTE ═══ -->
        <tr>
          <td class="px-inner" style="padding:44px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:3px solid #2563eb;">
              <tr>
                <td style="padding:4px 0 4px 20px;">
                  <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#0f172a;font-weight:500;font-style:italic;">
                    &bdquo;Wir bauen Contract AI f&uuml;r Menschen, die nicht mehr unterschreiben wollen, ohne zu wissen, worauf sie sich einlassen.&ldquo;
                  </p>
                  <p style="margin:12px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#64748b;font-weight:600;">
                    Noah &middot; Gr&uuml;nder von Contract AI
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ═══ ROI-SATZ + FINAL ═══ -->
        <tr>
          <td class="px-inner" style="padding:44px 40px 0;text-align:center;">
            <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:19px;line-height:1.5;color:#0f172a;font-weight:700;letter-spacing:-0.3px;">
              Eine &uuml;bersehene Klausel kostet oft mehr<br class="br-desk"> als dein gesamtes Jahresabo.
            </p>
            <p style="margin:12px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#94a3b8;">
              Bereits genutzt von Privatpersonen, Selbstst&auml;ndigen und kleinen Teams.
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:28px 40px 0;text-align:center;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
              <tr>
                <td style="background:linear-gradient(135deg,#2563eb 0%,#1e40af 100%);background-color:#2563eb;border-radius:12px;">
                  <a href="https://contract-ai.de/pricing?code=${PROMO_CODE}" class="cta-link" style="display:inline-block;padding:16px 38px;color:#ffffff;text-decoration:none;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.2px;">
                    Jetzt absichern &rarr;
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:14px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.6;color:#94a3b8;">
              Monatlich k&uuml;ndbar &nbsp;&middot;&nbsp; 14 Tage Geld-zur&uuml;ck-Garantie
            </p>
          </td>
        </tr>

        <!-- ═══ FOOTER ═══ -->
        <tr>
          <td class="px-inner" style="padding:44px 40px 44px;text-align:center;">
            <div style="border-top:1px solid #eef1f6;padding-top:28px;">
              <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.9;color:#94a3b8;">
                Mehr Klarheit. Weniger Risiko. Bessere Entscheidungen.
              </p>
              <p style="margin:12px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;color:#0f172a;">
                Contract&nbsp;AI
              </p>
            </div>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>`;

export const freeToBusinessUltimateV3Template: NewsletterTemplate = {
  id: 'free-to-business-ultimate-v3',
  label: '🚀 Free → Business · ULTIMATE v3 (Fintech-Design)',
  description: 'TOP-EMPFEHLUNG v3. Modernes Stripe/DocuSign-Level-Design (Inter statt Serifen, Produkt-Mock „Dienstleistungsvertrag" statt Stock-Foto, helles Aktion-Panel). Neu vs. v2: echte Preise in der Tarif-Tabelle (19€/29€ + rabattiert), Enterprise als „Meist gewählt" hervorgehoben, Risk-Reversal unter jedem CTA (monatlich kündbar + 14-Tage-Geld-zurück), aktuelle USPs (Wörtlich belegt, Klagefrist §4 KSchG, Foto-Upload), kürzerer Mobile-tauglicher Betreff.',
  subject: '{{firstName}}, liest du deine Verträge wirklich?',
  preheader: 'Geht den meisten so. 10% Rabatt mit Code AKTION10 — nur 7 Tage. Im Jahresabo: aufs ganze Jahr.',
  title: 'Liest du deine Verträge wirklich?',
  ctaText: 'Verträge absichern',
  ctaUrl: 'https://contract-ai.de/pricing?code=AKTION10',
  body
};
