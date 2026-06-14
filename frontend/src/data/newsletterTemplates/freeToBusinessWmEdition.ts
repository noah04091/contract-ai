import type { NewsletterTemplate } from './index';

// WM-Edition: identischer premium-Inhalt wie freeToBusinessUltimateV2,
// nur mit dezentem WM-Aufhänger (Betreff + Preheader + 1 Brückensatz oben).
// Aktion unverändert: AKTION10 / 10% / 7 Tage. V2 bleibt unangetastet.
const HERO_IMAGE = 'https://www.contract-ai.de/newsletter/hero-contract-signing.jpg';
const PROMO_CODE = 'AKTION10';
const PROMO_PERCENT = '10';
const PROMO_DAYS = '7';

const body = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="format-detection" content="telephone=no">
<title>Alle schauen aufs Spielfeld &ndash; wer liest deine Vertr&auml;ge?</title>
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
    .compare-table-3 td { display:block !important; width:100% !important; }
    .compare-cell { border-right:none !important; border-bottom:1px solid #e5e7eb !important; }
    .compare-cell-last { border-bottom:none !important; }
    .bonus-pill { display:block !important; margin:6px 0 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f5f3ee;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;-webkit-font-smoothing:antialiased;">

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f5f3ee;">
W&auml;hrend alle aufs Spielfeld schauen: ${PROMO_PERCENT}% Rabatt auf deinen Vertrags-Schutz mit Code ${PROMO_CODE} &mdash; nur ${PROMO_DAYS} Tage.
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
          <td class="px-inner" style="padding:32px 56px 0;text-align:center;">
            <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:#64748b;letter-spacing:2px;text-transform:uppercase;font-weight:600;">
              Pers&ouml;nlich f&uuml;r {{firstName}}
            </div>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:14px 56px 0;text-align:center;">
            <h1 class="hero-h" style="margin:0;font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-size:38px;line-height:1.15;color:#0f172a;font-weight:700;letter-spacing:-0.8px;">
              Wann hast du das letzte&nbsp;Mal<br>einen Vertrag <em style="font-style:italic;font-weight:600;color:#1e3a8a;">wirklich</em>&nbsp;gelesen?
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
            <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#94a3b8;font-style:italic;">
              Gerade schaut die halbe Welt gebannt aufs Spielfeld &mdash; deine Vertr&auml;ge laufen in der Zwischenzeit einfach weiter.
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:18px 56px 0;text-align:center;">
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
              Genau deshalb steht in vielen Vertr&auml;gen etwas, das dich irgendwann teuer zu stehen kommt. Eine Klausel, die du &uuml;bersehen hast. Eine Frist, die du vergessen hast. Eine Verl&auml;ngerung, die du nicht wolltest.
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
                    Nur noch ${PROMO_DAYS} Tage &middot; Sicher dir 10 % Rabatt
                  </div>
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:28px;line-height:1.25;color:#ffffff;font-weight:700;letter-spacing:-0.3px;">
                    ${PROMO_PERCENT}&thinsp;% Rabatt auf deinen Schutz
                  </div>
                  <div style="margin-top:18px;display:inline-block;padding:12px 22px;background-color:rgba(59,130,246,0.18);border:1px dashed #3b82f6;border-radius:8px;">
                    <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:9px;color:#bfdbfe;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin-bottom:4px;">Dein Code</div>
                    <div class="promo-code" style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:24px;color:#ffffff;font-weight:700;letter-spacing:6px;">${PROMO_CODE}</div>
                  </div>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border-top:1px solid rgba(255,255,255,0.12);">
                    <tr>
                      <td style="padding:14px 0 6px;color:#cbd5e1;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;text-align:left;">
                        Monatsabo
                      </td>
                      <td style="padding:14px 0 6px;color:#ffffff;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;text-align:right;">
                        10&thinsp;% f&uuml;r 3 Monate
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#cbd5e1;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;text-align:left;">
                        Jahresabo
                      </td>
                      <td style="padding:6px 0;color:#ffffff;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;text-align:right;">
                        10&thinsp;% auf das ganze Jahr
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
                  <a href="https://contract-ai.de/pricing?code=${PROMO_CODE}" class="cta-link" style="display:inline-block;padding:15px 34px;color:#ffffff;text-decoration:none;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.3px;">
                    Jetzt passenden Schutz w&auml;hlen &rarr;
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
          <td class="px-inner" style="padding:48px 56px 0;text-align:center;">
            <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#3b82f6;letter-spacing:3px;text-transform:uppercase;font-weight:700;">
              Free &middot; Business &middot; Enterprise
            </div>
            <h2 class="section-h" style="margin:14px 0 0;font-family:'Playfair Display',Georgia,serif;font-size:30px;line-height:1.28;color:#0f172a;font-weight:700;letter-spacing:-0.4px;">
              Drei Stufen,<br>eine klare Entscheidung.
            </h2>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:32px 30px 0;">
            <table role="presentation" class="compare-table-3" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
              <tr>

                <!-- FREE -->
                <td class="compare-cell" valign="top" style="width:33.33%;padding:0;background-color:#fafafa;border-right:1px solid #e5e7eb;">
                  <div style="padding:10px 12px;background-color:#e5e7eb;text-align:center;">
                    <span style="color:#6b7280;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Free</span>
                  </div>
                  <div style="padding:24px 18px;">
                    <div style="font-family:'Playfair Display',Georgia,serif;font-size:17px;color:#374151;font-weight:600;margin-bottom:14px;line-height:1.3;">
                      Du speicherst<br>Vertr&auml;ge.
                    </div>
                    <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12.5px;color:#6b7280;line-height:1.7;">
                      &middot;&nbsp; 3 Basis-Analysen einmalig<br>
                      &middot;&nbsp; Risiken nur an der Oberfl&auml;che<br>
                      &middot;&nbsp; Fristen selbst im Kopf<br>
                      &middot;&nbsp; Kein Fr&uuml;hwarn-System
                    </div>
                  </div>
                </td>

                <!-- BUSINESS ⭐ EMPFOHLEN -->
                <td class="compare-cell" valign="top" style="width:33.33%;padding:0;background-color:#eff6ff;border-right:1px solid #e5e7eb;">
                  <div style="padding:10px 12px;background:linear-gradient(135deg,#3b82f6 0%,#1e3a8a 100%);background-color:#3b82f6;text-align:center;">
                    <span style="color:#ffffff;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">&#9733;&nbsp; Empfohlen</span>
                  </div>
                  <div style="padding:24px 18px;">
                    <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#1e3a8a;letter-spacing:2px;text-transform:uppercase;font-weight:700;margin-bottom:8px;">Business</div>
                    <div style="font-family:'Playfair Display',Georgia,serif;font-size:17px;color:#0f172a;font-weight:700;margin-bottom:14px;line-height:1.3;">
                      Du bist<br>abgesichert.
                    </div>
                    <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12.5px;color:#1f2937;line-height:1.7;">
                      <span style="color:#3b82f6;font-weight:700;">&#10003;</span>&nbsp; 25 Analysen pro Monat<br>
                      <span style="color:#3b82f6;font-weight:700;">&#10003;</span>&nbsp; Alle Premium-Features<br>
                      <span style="color:#3b82f6;font-weight:700;">&#10003;</span>&nbsp; Fr&uuml;hwarnung bei Urteilen<br>
                      <span style="color:#3b82f6;font-weight:700;">&#10003;</span>&nbsp; Fristen automatisch erkannt
                    </div>
                  </div>
                </td>

                <!-- ENTERPRISE 🚀 UNBEGRENZT (Gold-Premium) -->
                <td class="compare-cell compare-cell-last" valign="top" style="width:33.33%;padding:0;background-color:#fffbeb;">
                  <div style="padding:10px 12px;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);background-color:#f59e0b;text-align:center;">
                    <span style="color:#ffffff;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">&#x1F680;&nbsp; Unbegrenzt</span>
                  </div>
                  <div style="padding:24px 18px;">
                    <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#b45309;letter-spacing:2px;text-transform:uppercase;font-weight:700;margin-bottom:8px;">Enterprise</div>
                    <div style="font-family:'Playfair Display',Georgia,serif;font-size:17px;color:#92400e;font-weight:700;margin-bottom:14px;line-height:1.3;">
                      Du hast<br>keine Grenzen.
                    </div>
                    <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12.5px;color:#44403c;line-height:1.7;">
                      <span style="color:#d97706;font-weight:700;">&#10003;</span>&nbsp; Unbegrenzte Analysen<br>
                      <span style="color:#d97706;font-weight:700;">&#10003;</span>&nbsp; Alle Business-Features<br>
                      <span style="color:#d97706;font-weight:700;">&#10003;</span>&nbsp; REST-API &amp; Excel-Bulk-Export<br>
                      <span style="color:#d97706;font-weight:700;">&#10003;</span>&nbsp; CRM (Salesforce, HubSpot, SAP)
                    </div>
                    <p style="margin:14px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11.5px;line-height:1.5;color:#92400e;font-style:italic;font-weight:600;">
                      F&uuml;r Power-User &amp; Vielnutzer
                    </p>
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
          <td class="px-inner" style="padding:48px 56px 0;text-align:center;">
            <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#3b82f6;letter-spacing:3px;text-transform:uppercase;font-weight:700;">
              Was Premium f&uuml;r dich &uuml;bernimmt
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
              Ein neues Urteil. Eine Gesetzes&auml;nderung. Eine Klausel, die pl&ouml;tzlich nicht mehr h&auml;lt. Wir beobachten die Rechtslage f&uuml;r dich &mdash; wenn etwas deinen Vertrag betrifft, wei&szlig;t du es vor allen anderen.
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
              Wir zeigen dir nicht nur, was riskant ist &mdash; wir liefern die bessere Formulierung gleich mit. Kopieren, einf&uuml;gen, fertig.
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
              &bdquo;Wann kann ich k&uuml;ndigen?&ldquo; &bdquo;Wer haftet bei Verzug?&ldquo; Stell deinem Vertrag jede Frage, die du sonst einem Anwalt stellst. Antwort in zwei S&auml;tzen &mdash; in deiner Sprache.
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:48px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;">
              <tr>
                <td style="padding:28px 28px;text-align:center;">
                  <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:#3b82f6;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:14px;">
                    Plus f&uuml;nf weitere Werkzeuge
                  </div>
                  <div style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13.5px;line-height:2;color:#334155;">
                    <span class="bonus-pill" style="display:inline-block;padding:6px 14px;margin:4px 3px;background:#ffffff;border:1px solid #cbd5e1;border-radius:20px;font-weight:600;font-size:12.5px;color:#0f172a;">&#10003;&nbsp; Vertragsvergleich</span>
                    <span class="bonus-pill" style="display:inline-block;padding:6px 14px;margin:4px 3px;background:#ffffff;border:1px solid #cbd5e1;border-radius:20px;font-weight:600;font-size:12.5px;color:#0f172a;">&#10003;&nbsp; Vertragsgenerator</span>
                    <span class="bonus-pill" style="display:inline-block;padding:6px 14px;margin:4px 3px;background:#ffffff;border:1px solid #cbd5e1;border-radius:20px;font-weight:600;font-size:12.5px;color:#0f172a;">&#10003;&nbsp; Auto-Kalender</span>
                    <span class="bonus-pill" style="display:inline-block;padding:6px 14px;margin:4px 3px;background:#ffffff;border:1px solid #cbd5e1;border-radius:20px;font-weight:600;font-size:12.5px;color:#0f172a;">&#10003;&nbsp; 1-Klick-K&uuml;ndigung</span>
                    <span class="bonus-pill" style="display:inline-block;padding:6px 14px;margin:4px 3px;background:#ffffff;border:1px solid #cbd5e1;border-radius:20px;font-weight:600;font-size:12.5px;color:#0f172a;">&#10003;&nbsp; Tiefen-Analyse</span>
                  </div>
                  <p style="margin:18px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#64748b;font-style:italic;">
                    Den vollen Funktionsumfang siehst du auf <a href="https://contract-ai.de" style="color:#1e3a8a;text-decoration:underline;font-weight:600;">contract-ai.de</a>.
                  </p>
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
              <em style="font-style:italic;color:#1e3a8a;">Eine &uuml;bersehene Klausel kostet oft mehr<br>als dein gesamtes Jahresabo.</em>
            </p>
          </td>
        </tr>

        <tr>
          <td class="px-inner" style="padding:32px 56px 0;text-align:center;">
            <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#94a3b8;font-style:italic;">
              Bereits genutzt von Privatpersonen, Selbstst&auml;ndigen und kleinen Teams, die ihre Vertr&auml;ge nicht mehr dem Zufall &uuml;berlassen.
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
                    Code <strong style="color:#ffffff;letter-spacing:2px;">${PROMO_CODE}</strong> &middot; ${PROMO_PERCENT}&thinsp;% f&uuml;r 3 Monate. Im Jahresabo: aufs ganze Jahr.
                  </p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
                    <tr>
                      <td style="background-color:#ffffff;border-radius:30px;">
                        <a href="https://contract-ai.de/pricing?code=${PROMO_CODE}" class="cta-link" style="display:inline-block;padding:17px 40px;color:#1e3a8a;text-decoration:none;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.3px;">
                          Jetzt optimal absichern &rarr;
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
              Contract&nbsp;AI &nbsp;&middot;&nbsp; Premium
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

export const freeToBusinessWmEditionTemplate: NewsletterTemplate = {
  id: 'free-to-business-wm-edition',
  label: '⚽ Free → Business · WM-Edition (dezent, 10% AKTION10)',
  description: 'Saisonale WM-Variante der ULTIMATE-v2-Empfehlung. Identischer premium-Inhalt, nur mit dezentem WM-Aufhänger (Betreff + Preheader + 1 Brückensatz oben) — gibt der Aussendung einen Anlass ("warum gerade jetzt"), ohne das Vertrauens-/Anwalts-Image mit Fußball-Vokabular zu verwässern. Aktion unverändert: AKTION10 / 10% / 7 Tage.',
  subject: '{{firstName}}, alle schauen aufs Spielfeld – wer liest deine Verträge?',
  preheader: 'Während alle auf die WM schauen: 10% auf deinen Vertrags-Schutz mit Code AKTION10 — nur 7 Tage.',
  title: 'Wann hast du das letzte Mal einen Vertrag wirklich gelesen?',
  ctaText: 'Jetzt passenden Schutz wählen',
  ctaUrl: 'https://contract-ai.de/pricing?code=AKTION10',
  body
};
