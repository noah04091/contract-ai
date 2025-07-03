// 📁 backend/utils/emailTemplate.js

const fs = require('fs');
const path = require('path');

function generateEmailTemplate({ 
  title, 
  body, 
  preheader = '', 
  cta = null, 
  unsubscribeUrl = 'https://contract-ai.de/abmelden' 
}) {
  // ✅ LOGO-FIX: Mehrere Optionen für das Logo
  let logoSrc = 'https://contract-ai.de/assets/logo.png'; // Haupt-URL
  
  // Versuche lokales Logo zu laden (für Development)
  const possibleLogoPaths = [
    path.join(__dirname, '../../frontend/src/assets/logo.png'), // Neuer Pfad vom User
    path.join(__dirname, '../assets/logo.png'), // Backup-Pfad
    path.join(__dirname, '../assets/logo-contractai.png'), // Alter Pfad
  ];
  
  for (const logoPath of possibleLogoPaths) {
    try {
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        console.log(`✅ Logo erfolgreich geladen von: ${logoPath}`);
        break;
      }
    } catch (error) {
      console.log(`⚠️ Logo konnte nicht geladen werden von: ${logoPath}`);
      continue;
    }
  }

  // ✅ AUFFÄLLIGER CTA-BUTTON - NICHT WEIß SONDERN BLAU!
  const ctaHtml = cta ? `
    <table border="0" cellpadding="0" cellspacing="0" style="margin: 50px auto; text-align: center;">
      <tr>
        <td align="center">
          <!-- ✅ HAUPTBUTTON - GROß & AUFFÄLLIG -->
          <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td align="center" 
                  style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
                         border-radius: 16px; 
                         box-shadow: 0 12px 30px rgba(59, 130, 246, 0.4);
                         border: 2px solid #1d4ed8;">
                <a href="${cta.url}" target="_blank" 
                   style="display: inline-block; 
                          padding: 20px 50px; 
                          font-size: 20px; 
                          font-weight: 700; 
                          color: white !important; 
                          text-decoration: none; 
                          border-radius: 16px; 
                          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                          text-align: center; 
                          min-width: 300px;
                          transition: all 0.3s ease;
                          font-family: 'Inter', sans-serif;
                          text-transform: uppercase;
                          letter-spacing: 1px;">
                  ${cta.text}
                </a>
              </td>
            </tr>
          </table>
          
          <!-- ✅ ZUSÄTZLICHER HINWEIS -->
          <div style="margin-top: 20px; padding: 15px; 
                      background: rgba(59, 130, 246, 0.1); 
                      border: 2px solid #3b82f6;
                      border-radius: 12px; 
                      display: inline-block;">
            <p style="color: #1e40af; font-weight: 600; margin: 0; font-size: 16px;">
              👆 Klicken Sie hier, um Ihr Konto zu aktivieren
            </p>
          </div>
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        margin: 0 !important;
      }
      .mobile-padding {
        padding: 20px !important;
      }
      .logo {
        max-width: 140px !important;
      }
      .mobile-text-center {
        text-align: center !important;
      }
      .mobile-hidden {
        display: none !important;
      }
      .desktop-br {
        display: none !important;
      }
      .mobile-br {
        display: block !important;
      }
    }
    
    .desktop-br {
      display: block;
    }
    
    .mobile-br {
      display: none;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
             background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); 
             -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: none; width: 100%; min-height: 100vh;">
  
  <!-- ✅ PREHEADER TEXT (hidden) -->
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: transparent;">
    ${preheader}
  </div>

  <!-- ✅ MAIN WRAPPER -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" 
         style="min-width: 100%; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);">
    <tr>
      <td align="center" valign="top" style="padding: 40px 20px;">
        
        <!-- ✅ EMAIL CONTAINER -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" 
               style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; 
                      box-shadow: 0 20px 40px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.2);">
          
          <!-- ✅ MODERN HEADER with Gradient -->
          <tr>
            <td align="center" valign="top" 
                style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); 
                       padding: 40px 0; position: relative;" class="mobile-padding">
              
              <!-- Logo Container -->
              <div style="position: relative; z-index: 2;">
                <img src="${logoSrc}" alt="Contract AI" width="200" class="logo" 
                     style="display: block; max-width: 200px; height: auto; margin: 0 auto;" />
              </div>
              
              <!-- Decorative Elements -->
              <div style="position: absolute; top: 20px; right: 20px; width: 60px; height: 60px; 
                          background: rgba(59, 130, 246, 0.2); border-radius: 50%; opacity: 0.6;"></div>
              <div style="position: absolute; bottom: 30px; left: 30px; width: 40px; height: 40px; 
                          background: rgba(16, 185, 129, 0.2); border-radius: 50%; opacity: 0.4;"></div>
            </td>
          </tr>
          
          <!-- ✅ MAIN CONTENT -->
          <tr>
            <td align="left" valign="top" style="padding: 50px 40px 40px 40px;" class="mobile-padding">
              
              <!-- Title -->
              <h1 style="margin: 0 0 30px 0; font-size: 32px; line-height: 1.3; color: #1e293b; 
                         font-weight: 700; text-align: center; font-family: 'Inter', sans-serif;">
                ${title}
              </h1>
              
              <!-- Body Content -->
              <div style="font-size: 16px; line-height: 1.7; color: #334155; margin-bottom: 30px; 
                         font-family: 'Inter', sans-serif;">
                ${body}
              </div>
              
              <!-- ✅ CTA BUTTON -->
              ${ctaHtml}
              
            </td>
          </tr>
          
          <!-- ✅ MODERN DIVIDER -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent);"></div>
            </td>
          </tr>
          
          <!-- ✅ SUPPORT SECTION -->
          <tr>
            <td align="center" valign="top" style="padding: 40px 40px; background-color: #fafbfc;" class="mobile-padding">
              <div style="background: white; border-radius: 16px; padding: 30px; border: 1px solid #e5e7eb;
                          box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                  <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); 
                             width: 50px; height: 50px; border-radius: 50%; 
                             display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                    <span style="font-size: 24px;">💬</span>
                  </div>
                  <div style="text-align: left;">
                    <div style="color: #1e293b; font-weight: 600; font-size: 16px; margin-bottom: 4px;">
                      Fragen oder Probleme?
                    </div>
                    <div style="color: #64748b; font-size: 14px;">
                      Wir helfen Ihnen gerne weiter!
                    </div>
                  </div>
                </div>
                <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #64748b; text-align: center;">
                  <a href="mailto:support@contract-ai.de" 
                     style="color: #3b82f6; text-decoration: none; font-weight: 600; 
                            border-bottom: 2px solid rgba(59, 130, 246, 0.2); 
                            transition: all 0.3s ease;">
                    support@contract-ai.de
                  </a>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- ✅ MODERN FOOTER -->
          <tr>
            <td align="center" valign="top" 
                style="padding: 40px 25px; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);" 
                class="mobile-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                
                <!-- Social Media Section -->
                <tr>
                  <td align="center" valign="top" style="padding-bottom: 25px;">
                    <div style="display: inline-flex; gap: 15px; align-items: center;">
                      <a href="https://contract-ai.de" 
                         style="display: inline-block; background: #3b82f6; 
                                border-radius: 50%; width: 40px; height: 40px; 
                                line-height: 40px; text-align: center; color: white; 
                                text-decoration: none; font-size: 18px;">
                        🌐
                      </a>
                      <a href="mailto:support@contract-ai.de" 
                         style="display: inline-block; background: #10b981; 
                                border-radius: 50%; width: 40px; height: 40px; 
                                line-height: 40px; text-align: center; color: white; 
                                text-decoration: none; font-size: 18px;">
                        📧
                      </a>
                    </div>
                  </td>
                </tr>
                
                <!-- Company Info -->
                <tr>
                  <td align="center" valign="top" style="padding: 0 0 15px 0;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #64748b; font-weight: 500;">
                      <strong style="color: #1e293b;">Contract AI UG (haftungsbeschränkt)</strong>
                      <br class="desktop-br">
                      <span class="mobile-br" style="display: none;"><br></span>
                      Richard-Oberle-Weg 27, 76448 Durmersheim
                    </p>
                  </td>
                </tr>
                
                <!-- Copyright -->
                <tr>
                  <td align="center" valign="top" style="padding: 15px 0;">
                    <p style="margin: 0; font-size: 12px; line-height: 1.4; color: #94a3b8;">
                      &copy; ${new Date().getFullYear()} Contract AI UG. Alle Rechte vorbehalten.
                    </p>
                  </td>
                </tr>
                
                <!-- Legal Links -->
                <tr>
                  <td align="center" valign="top" style="padding-top: 15px; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 12px; line-height: 1.4; color: #94a3b8;">
                      <a href="https://contract-ai.de/datenschutz" 
                         style="color: #64748b; text-decoration: none; font-weight: 500;">Datenschutz</a>
                      <span style="margin: 0 8px; color: #cbd5e1;">•</span>
                      <a href="https://contract-ai.de/impressum" 
                         style="color: #64748b; text-decoration: none; font-weight: 500;">Impressum</a>
                      <span style="margin: 0 8px; color: #cbd5e1;">•</span>
                      <a href="${unsubscribeUrl}" 
                         style="color: #64748b; text-decoration: none; font-weight: 500;">Abmelden</a>
                    </p>
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