// 📄 pdfBranding.ts - Shared Enterprise Branding Utilities for PDF Exports
// Provides consistent company branding across all PDF downloads

export interface CompanyProfile {
  companyName?: string;
  legalForm?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  vatId?: string;
  tradeRegister?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
}

// Brand colors (consistent with ContractContentViewer)
const BRAND_COLOR = '#003366';
const BRAND_COLOR_LIGHT = '#f8fafc';

/**
 * Loads the company profile from the API
 * Returns null if no profile exists or user doesn't have Enterprise access
 */
export async function loadCompanyProfile(): Promise<CompanyProfile | null> {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/company-profile/me', {
      credentials: 'include',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
    const data = await response.json();
    if (data.success && data.profile) {
      console.log('✅ Company Profile loaded for PDF branding');
      return data.profile;
    }
  } catch (err) {
    console.error('Error loading company profile:', err);
  }
  return null;
}

/**
 * Generates HTML header with company branding for PDF exports
 * Uses html2canvas compatible HTML structure
 */
export function generateBrandedHeader(companyProfile: CompanyProfile | null): string {
  if (!companyProfile || !companyProfile.companyName) return '';

  return `
    <div style="display: flex; justify-content: space-between; align-items: flex-start;
                margin-bottom: 30px; padding-bottom: 15px; border-bottom: 3px solid ${BRAND_COLOR};
                background: ${BRAND_COLOR_LIGHT}; padding: 20px; border-radius: 8px;">
      <div>
        <div style="font-size: 18pt; font-weight: bold; color: ${BRAND_COLOR}; margin-bottom: 8px;">
          ${companyProfile.companyName}${companyProfile.legalForm ? ` ${companyProfile.legalForm}` : ''}
        </div>
        <div style="font-size: 10pt; color: #64748b; line-height: 1.6;">
          ${companyProfile.street ? `${companyProfile.street}<br>` : ''}
          ${companyProfile.postalCode || companyProfile.city ? `${companyProfile.postalCode || ''} ${companyProfile.city || ''}<br>` : ''}
          ${companyProfile.contactEmail ? `E-Mail: ${companyProfile.contactEmail}<br>` : ''}
          ${companyProfile.contactPhone ? `Tel: ${companyProfile.contactPhone}` : ''}
        </div>
      </div>
      ${companyProfile.logoUrl ? `
        <div style="max-width: 150px; max-height: 80px; display: flex; align-items: center; justify-content: flex-end;">
          <img src="${companyProfile.logoUrl}" alt="Firmenlogo"
               style="max-width: 150px; max-height: 80px; object-fit: contain; border-radius: 4px;"
               crossorigin="anonymous" />
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Generates HTML footer with company branding for PDF exports
 */
export function generateBrandedFooter(companyProfile: CompanyProfile | null, documentType: string): string {
  const date = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const companyText = companyProfile?.companyName
    ? `Erstellt für ${companyProfile.companyName}`
    : 'Erstellt mit Contract AI';

  return `
    <div style="margin-top: 40px; padding-top: 15px; border-top: 2px solid #e2e8f0;
                font-size: 9pt; color: #94a3b8; text-align: center;">
      ${companyText} | ${documentType} | ${date}
    </div>
  `;
}

/**
 * Creates a branded wrapper div around content for PDF export
 * Use this before passing to html2canvas
 */
export function createBrandedWrapper(
  contentElement: HTMLElement,
  companyProfile: CompanyProfile | null,
  documentType: string
): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'background: white; padding: 20px; font-family: Arial, sans-serif;';

  // Add header
  const headerHTML = generateBrandedHeader(companyProfile);
  if (headerHTML) {
    const headerDiv = document.createElement('div');
    headerDiv.innerHTML = headerHTML;
    wrapper.appendChild(headerDiv);
  }

  // Clone and append the original content
  const contentClone = contentElement.cloneNode(true) as HTMLElement;
  wrapper.appendChild(contentClone);

  // Add footer
  const footerDiv = document.createElement('div');
  footerDiv.innerHTML = generateBrandedFooter(companyProfile, documentType);
  wrapper.appendChild(footerDiv);

  return wrapper;
}

/**
 * For jsPDF: Returns branding info to add manually
 * Use this for direct jsPDF document manipulation
 */
export interface JsPDFBranding {
  hasLogo: boolean;
  logoUrl?: string;
  companyName?: string;
  companyAddress?: string;
  footerText: string;
}

export function getJsPDFBranding(
  companyProfile: CompanyProfile | null,
  documentType: string
): JsPDFBranding {
  const date = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  if (!companyProfile || !companyProfile.companyName) {
    return {
      hasLogo: false,
      footerText: `Erstellt mit Contract AI | ${documentType} | ${date}`
    };
  }

  // Build address
  const addressParts: string[] = [];
  if (companyProfile.street) addressParts.push(companyProfile.street);
  if (companyProfile.postalCode || companyProfile.city) {
    addressParts.push(`${companyProfile.postalCode || ''} ${companyProfile.city || ''}`.trim());
  }

  return {
    hasLogo: !!companyProfile.logoUrl,
    logoUrl: companyProfile.logoUrl,
    companyName: `${companyProfile.companyName}${companyProfile.legalForm ? ` ${companyProfile.legalForm}` : ''}`,
    companyAddress: addressParts.join(', '),
    footerText: `Erstellt für ${companyProfile.companyName} | ${documentType} | ${date}`
  };
}

/**
 * Converts an image URL to Base64 data URI
 * Useful for embedding logos in PDFs that require Base64
 */
export async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to Base64:', error);
    return null;
  }
}
