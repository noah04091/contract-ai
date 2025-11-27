// 📁 backend/utils/emailTemplate.js
// ✅ V4 Design - Clean, Modern, Professional

const logoUrl = 'https://www.contract-ai.de/logo.png';

function generateEmailTemplate({
  title,
  body,
  preheader = '',
  cta = null,
  unsubscribeUrl = 'https://www.contract-ai.de/abmelden'
}) {

  const ctaHtml = cta ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="text-align: center; padding: 10px 0 30px 0;">
          <a href="${cta.url}"
             style="display: inline-block;
                    background-color: #0066ff;
                    color: #ffffff !important;
                    padding: 17px 52px;
                    border-radius: 14px;
                    font-size: 16px;
                    font-weight: 600;
                    text-decoration: none;">
            <span style="color: #ffffff !important;">${cta.text}</span>
          </a>
        </td>
      </tr>
    </table>
  ` : '';

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style>
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .content-padding { padding: 30px 25px !important; }
      .header-padding { padding: 35px 25px 25px 25px !important; }
      .footer-padding { padding: 20px 25px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">

  <!-- Preheader -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${preheader}</div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
    <tr>
      <td style="padding: 50px 20px;">

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" align="center" class="email-container" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">

          <!-- Header mit Logo -->
          <tr>
            <td class="header-padding" style="padding: 45px 50px 35px 50px; text-align: center; border-bottom: 1px solid #f0f0f0;">
              <img src="${logoUrl}" alt="Contract AI" width="220" style="display: block; margin: 0 auto; max-width: 220px; height: auto;">
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="content-padding" style="padding: 45px 50px 50px 50px;">

              <h1 style="margin: 0 0 20px 0; font-size: 26px; font-weight: 700; color: #1a1a1a; text-align: center; line-height: 1.35; letter-spacing: -0.5px;">
                ${title}
              </h1>

              <div style="font-size: 16px; color: #555555; line-height: 1.7;">
                ${body}
              </div>

              ${ctaHtml}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer-padding" style="background-color: #fafafa; padding: 28px 50px; text-align: center; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #999999;">
                © ${new Date().getFullYear()} Contract AI. Alle Rechte vorbehalten.
              </p>
              <p style="margin: 0; font-size: 12px;">
                <a href="https://www.contract-ai.de/datenschutz" style="color: #888888; text-decoration: none;">Datenschutz</a>
                <span style="color: #cccccc; margin: 0 8px;">|</span>
                <a href="https://www.contract-ai.de/impressum" style="color: #888888; text-decoration: none;">Impressum</a>
                <span style="color: #cccccc; margin: 0 8px;">|</span>
                <a href="https://www.contract-ai.de/agb" style="color: #888888; text-decoration: none;">AGB</a>
              </p>
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
