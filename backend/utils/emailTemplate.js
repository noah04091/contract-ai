// 📁 backend/utils/emailTemplate.js

function generateEmailTemplate({ 
  title, 
  body, 
  preheader = '', 
  cta = null, 
  unsubscribeUrl = 'https://contract-ai.de/abmelden' 
}) {
  // CTA-Button-HTML nur generieren, wenn CTA-Daten übergeben wurden
  const ctaHtml = cta ? `
    <table border="0" cellpadding="0" cellspacing="0" style="margin-top: 30px; margin-bottom: 10px;">
      <tr>
        <td align="center" bgcolor="#4299e1" style="border-radius: 6px;">
          <a href="${cta.url}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 500; color: white; text-decoration: none; border-radius: 6px; background-color: #4299e1; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ${cta.text}
          </a>
        </td>
      </tr>
    </table>
  ` : '';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Contract AI</title>
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .mobile-padding {
        padding: 20px !important;
      }
      .logo {
        max-width: 120px !important;
      }
      .mobile-text-center {
        text-align: center !important;
      }
      .mobile-hidden {
        display: none !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: none; width: 100%; height: 100%;">
  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${preheader}
  </div>

  <!-- Main table wrapper -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%; background-color: #f9fafb;">
    <tr>
      <td align="center" valign="top" style="padding: 30px 0;">
        <!-- Email container -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td align="center" valign="top" style="background-color: #0f172a; padding: 30px 0;" class="mobile-padding">
              <img src="https://contract-ai.de/logo.png" alt="Contract AI" width="180" class="logo" style="display: block; max-width: 180px; height: auto;" />
            </td>
          </tr>
          
          <!-- Email body -->
          <tr>
            <td align="left" valign="top" style="padding: 40px 40px 30px 40px;" class="mobile-padding">
              <h1 style="margin: 0 0 20px 0; font-size: 28px; line-height: 36px; color: #0f172a; font-weight: 600;">${title}</h1>
              <div style="font-size: 16px; line-height: 26px; color: #334155; margin-bottom: 25px;">
                ${body}
              </div>
              
              <!-- Optional CTA button -->
              ${ctaHtml}
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background-color: #e2e8f0; line-height: 1px;">&nbsp;</div>
            </td>
          </tr>
          
          <!-- Support section -->
          <tr>
            <td align="center" valign="top" style="padding: 30px 40px; background-color: #ffffff;" class="mobile-padding">
              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #64748b; text-align: center;">
                Fragen oder Probleme? <a href="mailto:support@contract-ai.de" style="color: #4299e1; text-decoration: none; font-weight: 500;">support@contract-ai.de</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" valign="top" style="padding: 25px; background-color: #f1f5f9;" class="mobile-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" valign="top" style="padding-bottom: 15px;">
                    <!-- Social media icons if needed -->
                    <a href="https://contract-ai.de" style="display: inline-block; margin: 0 5px;"><img src="https://contract-ai.de/icons/website.png" alt="Website" width="24" height="24" style="display: block;" border="0" /></a>
                  </td>
                </tr>
                <tr>
                  <td align="center" valign="top" style="padding: 0 0 10px 0; font-size: 12px; line-height: 18px; color: #64748b;">
                    &copy; ${new Date().getFullYear()} Contract AI UG (haftungsbeschränkt)<br />
                    Richard-Oberle-Weg 27, 76448 Durmersheim
                  </td>
                </tr>
                <tr>
                  <td align="center" valign="top" style="font-size: 12px; line-height: 18px; color: #64748b;">
                    <a href="https://contract-ai.de/datenschutz" style="color: #64748b; text-decoration: underline;">Datenschutz</a> &nbsp;•&nbsp; 
                    <a href="https://contract-ai.de/impressum" style="color: #64748b; text-decoration: underline;">Impressum</a> &nbsp;•&nbsp;
                    <a href="${unsubscribeUrl}" style="color: #64748b; text-decoration: underline;">Abmelden</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = generateEmailTemplate;