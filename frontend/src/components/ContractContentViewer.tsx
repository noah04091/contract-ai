/* eslint-disable @typescript-eslint/no-explicit-any */
// ContractContentViewer.tsx - VERBESSERTE VERSION mit HTML-Support für professionelle PDFs
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Maximize2, X, Eye, Copy, CheckCircle, Printer, Edit, Save, Keyboard } from 'lucide-react';
import { toast } from 'react-toastify';

// 🎨 BOMBASTISCHE CSS-Styles für Premium-Verträge
const premiumContractStyles = `
  <style>
    .premium-contract-preview {
      position: relative;
      animation: slideInFromBottom 0.8s ease-out;
    }
    
    @keyframes slideInFromBottom {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .contract-quality-badge {
      position: absolute;
      top: -15px;
      right: -15px;
      z-index: 10;
    }
    
    .quality-indicator {
      background: linear-gradient(135deg, #3b82f6, #6366f1);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
      transform: rotate(12deg);
    }
    
    .quality-icon {
      animation: sparkle 2s infinite;
    }
    
    @keyframes sparkle {
      0%, 100% { transform: scale(1) rotate(0deg); }
      50% { transform: scale(1.2) rotate(180deg); }
    }
    
    /* PREMIUM HEADER STYLING für HTML-Verträge */
    .premium-contract-display .header {
      margin: -30px -30px 40px -30px;
      border-radius: 16px 16px 0 0;
    }
    
    /* PREMIUM PARAGRAPHEN im Frontend */
    .premium-contract-display .paragraph-title {
      margin: 25px -15px 15px -15px;
      padding: 15px 20px;
      border-radius: 8px;
    }
    
    /* FALLBACK STYLING für normale Verträge */
    .contract-preview-fallback {
      text-align: center;
      padding: 40px 20px;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      border-radius: 12px;
      margin: -15px;
    }
    
    .contract-meta {
      background: rgba(59, 130, 246, 0.1);
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #3b82f6;
    }
    
    .content-placeholder {
      margin-top: 30px;
      padding: 30px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .placeholder-icon {
      font-size: 48px;
      margin-bottom: 20px;
      opacity: 0.7;
    }
    
    .company-preview {
      margin-top: 30px;
      padding: 20px;
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      border-radius: 12px;
      border: 2px solid #93c5fd;
    }
    
    /* RESPONSIVE OPTIMIERUNGEN */
    @media (max-width: 768px) {
      .premium-contract-display .header {
        margin: -20px -20px 30px -20px;
        padding: 20px;
      }
      
      .premium-contract-display .company-name {
        font-size: 18pt;
      }
      
      .premium-contract-display .contract-title {
        font-size: 20pt;
        letter-spacing: 2px;
      }
    }
  </style>
`;

interface ContractContentViewerProps {
  contract: {
    _id: string;
    name: string;
    content?: string;
    contentHTML?: string; // 🔴 NEU: HTML-Version für professionelle PDFs
    signature?: string;
    isGenerated?: boolean;
    createdAt?: string;
    uploadedAt?: string;
    contractType?: string;
    formData?: any;
  };
}

interface CompanyProfile {
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

const ContractContentViewer: React.FC<ContractContentViewerProps> = ({ contract }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [editedHTML, setEditedHTML] = useState(''); // 🔴 NEU: HTML-Version beim Editieren
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Load company profile
  useEffect(() => {
    const loadCompanyProfile = async () => {
      try {
        const response = await fetch('/api/company-profile/me', {
          credentials: 'include'
        });
        const data = await response.json();
        if (data.success && data.profile) {
          setCompanyProfile(data.profile);
          console.log('✅ Company Profile geladen für PDF Export');
        }
      } catch (error) {
        console.error('Failed to load company profile:', error);
      }
    };
    loadCompanyProfile();
  }, []);

  // ⌨️ KEYBOARD SHORTCUTS für Power User
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Nur wenn das Component focused ist oder keine anderen Inputs aktiv sind
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + E: Edit Mode Toggle
      if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        if (isEditing) {
          handleSaveContent();
        } else {
          handleStartEdit();
        }
        console.log("⌨️ Keyboard Shortcut: Edit Mode Toggle");
      }

      // Ctrl/Cmd + S: Save (nur im Edit-Modus)
      if ((event.ctrlKey || event.metaKey) && event.key === 's' && isEditing) {
        event.preventDefault();
        handleSaveContent();
        console.log("⌨️ Keyboard Shortcut: Save");
      }

      // Escape: Cancel Edit oder Close Fullscreen
      if (event.key === 'Escape') {
        event.preventDefault();
        if (isFullscreen) {
          setIsFullscreen(false);
          console.log("⌨️ Keyboard Shortcut: Close Fullscreen");
        } else if (isEditing) {
          handleCancelEdit();
          console.log("⌨️ Keyboard Shortcut: Cancel Edit");
        }
      }

      // Ctrl/Cmd + P: Print
      if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault();
        handlePrint();
        console.log("⌨️ Keyboard Shortcut: Print");
      }

      // Ctrl/Cmd + D: Download PDF
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault();
        handleDownloadPDF();
        console.log("⌨️ Keyboard Shortcut: Download PDF");
      }

      // Ctrl/Cmd + C: Copy (nur wenn nicht in Edit-Modus)
      if ((event.ctrlKey || event.metaKey) && event.key === 'c' && !isEditing) {
        event.preventDefault();
        handleCopy();
        console.log("⌨️ Keyboard Shortcut: Copy");
      }

      // F11: Toggle Fullscreen
      if (event.key === 'F11') {
        event.preventDefault();
        setIsFullscreen(!isFullscreen);
        console.log("⌨️ Keyboard Shortcut: Toggle Fullscreen");
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, isFullscreen]); // Dependencies für korrekte Event-Handler

  // Initialize edited content
  useEffect(() => {
    setEditedContent(contract.content || '');
    setEditedHTML(contract.contentHTML || ''); // 🔴 NEU: HTML initialisieren
  }, [contract.content, contract.contentHTML]);

  // ✅ PERFORMANCE: Memoized formatContentForDisplay
  const formatContentForDisplay = useMemo(() => {
    return (content: string): string => {
    // ✅ EMPTY STATE: Behandle leeren/fehlenden Content
    if (!content || content.trim().length === 0) {
      return `
        <div style="text-align: center; padding: 40px 20px; color: #6b7280; border: 2px dashed #e5e7eb; border-radius: 8px; margin: 20px 0;">
          <div style="font-size: 48px; margin-bottom: 16px;">📄</div>
          <h3 style="margin: 0 0 8px 0; color: #374151;">Kein Vertragsinhalt verfügbar</h3>
          <p style="margin: 0; font-size: 14px;">
            Dieser Vertrag enthält keinen anzeigbaren Text oder wurde als PDF hochgeladen.
          </p>
        </div>
      `;
    }

    // Konvertiere Text-Struktur zu HTML für bessere Darstellung
    let formatted = content;
    
    // Vertragstitel hervorheben
    formatted = formatted.replace(/^={3,}\n(.+)\n={3,}/gm, '<h1 style="text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">$1</h1>');
    
    // Paragraphen formatieren
    formatted = formatted.replace(/^§ (\d+) (.+)$/gm, '<h2 style="font-size: 16px; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">§ $1 $2</h2>');
    
    // Absätze formatieren
    formatted = formatted.replace(/^\((\d+)\) /gm, '<div style="margin-left: 20px; margin-bottom: 8px;"><strong>($1)</strong> ');
    formatted = formatted.replace(/^ {3}([a-z])\) /gm, '<div style="margin-left: 40px; margin-bottom: 4px;">$1) ');
    
    // Parteien hervorheben
    formatted = formatted.replace(/^(AUFTRAGGEBER|AUFTRAGNEHMER|VERKÄUFER|KÄUFER|VERMIETER|MIETER|ARBEITGEBER|ARBEITNEHMER|PARTEI [AB]):/gm, '<strong style="display: block; margin-top: 10px;">$1:</strong>');
    
    // Unterschriftenbereich formatieren
    formatted = formatted.replace(/_____+/g, '<span style="display: inline-block; width: 200px; border-bottom: 1px solid #000; margin: 20px 10px 5px 0;">&nbsp;</span>');
    
    // Zeilenumbrüche zu HTML
    formatted = formatted.replace(/\n/g, '<br/>');
    
    return formatted;
    };
  }, []); // ✅ PERFORMANCE: No dependencies - pure function

  // 🎨 BOMBASTISCHER Content mit Premium-Styling für normale Ansicht
  const displayContent = isEditing ? editedContent : (
    contract.contentHTML ? 
      // HTML-Version für bombastische Darstellung
      `<div class="premium-contract-preview">
         ${contract.contentHTML}
         <div class="contract-quality-badge">
           <div class="quality-indicator">
             <span class="quality-icon">⭐</span>
             <span class="quality-text">Premium Vertrag</span>
           </div>
         </div>
       </div>` :
      // Fallback für normale Verträge mit verbesserter Formatierung  
      formatContentForDisplay(contract.content || 
        `<div class="contract-preview-fallback">
           <h2 style="color: #1e40af; margin-bottom: 20px;">📄 ${contract.name}</h2>
           <div class="contract-meta">
             <p>Dieser Vertrag wurde ${contract.isGenerated ? '🤖 <strong>automatisch generiert</strong>' : '📤 <strong>hochgeladen</strong>'} am 
             <strong>${contract.isGenerated ? 
               new Date(contract.createdAt || '').toLocaleDateString('de-DE') : 
               new Date(contract.uploadedAt || '').toLocaleDateString('de-DE')
             }</strong>.</p>
           </div>
           <div class="content-placeholder">
             <div class="placeholder-icon">📋</div>
             <p>Detaillierte Vertragsinhalte können durch Analyse oder manuellen Upload bereitgestellt werden.</p>
             ${companyProfile?.logoUrl ? `
               <div class="company-preview">
                 <img src="${companyProfile.logoUrl}" alt="Firmenlogo" style="max-height: 60px; margin: 20px auto; display: block; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
                 <p style="text-align: center; color: #3b82f6; font-weight: 600;">${companyProfile.companyName}</p>
               </div>
             ` : ''}
           </div>
         </div>`)
  );

  // 🔴 AKTUALISIERT: Speichere sowohl Text als auch HTML
  const handleSaveContent = useCallback(async () => {
    try {
      const response = await fetch(`/api/contracts/${contract._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          content: editedContent,
          contentHTML: editedHTML // 🔴 NEU: HTML auch speichern
        })
      });
      
      if (response.ok) {
        contract.content = editedContent;
        contract.contentHTML = editedHTML; // 🔴 NEU: HTML aktualisieren
        setIsEditing(false);
        toast.success('✅ Änderungen erfolgreich gespeichert!');
      } else {
        throw new Error('Speichern fehlgeschlagen');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('❌ Fehler beim Speichern der Änderungen');
    }
  }, [contract, editedContent, editedHTML]);

  // 🔴 HAUPTVERBESSERUNG: PDF Export mit HTML-Support und besserem Styling - KORRIGIERT
  const handleDownloadPDF = async () => {
    if (isExportingPDF) return; // Prevent double-clicks
    setIsExportingPDF(true);
    
    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = (html2pdfModule.default || html2pdfModule) as typeof import('html2pdf.js').default;
      
      if (contentRef.current) {
        let pdfContent;
        
        // 🔴 VERBESSERT: Prüfe ob HTML-Version vorhanden ist
        if (contract.contentHTML) {
          console.log("🎨 Verwende professionelle HTML-Version für PDF");
          // Verwende die professionelle HTML-Version mit Logo etc.
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = contract.contentHTML;
          tempDiv.style.fontFamily = 'Arial, sans-serif';
          tempDiv.style.fontSize = '11pt';
          tempDiv.style.lineHeight = '1.6';
          tempDiv.style.color = '#000';
          
          // Füge Unterschrift zur HTML-Version hinzu wenn vorhanden
          if (contract.signature) {
            const signatureHTML = `
              <div style="margin-top: 60px; page-break-inside: avoid; padding-top: 20px; border-top: 2px solid #003366;">
                <h3 style="font-size: 14pt; font-weight: bold; margin-bottom: 15px; color: #003366;">Digitale Unterschrift:</h3>
                <img src="${contract.signature}" alt="Unterschrift" style="max-width: 250px; margin: 10px 0; border: 2px solid #e2e8f0; padding: 10px; background: white; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
                <p style="font-size: 10pt; color: #666; margin-top: 15px; font-style: italic;">
                  Elektronisch unterschrieben am ${new Date().toLocaleDateString('de-DE', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                <p style="font-size: 8pt; color: #999; margin-top: 5px;">
                  Dokument-ID: ${contract._id}
                </p>
              </div>
            `;
            
            // Suche nach dem contract-content div oder füge es am Ende hinzu
            const contentArea = tempDiv.querySelector('.contract-content');
            if (contentArea) {
              contentArea.insertAdjacentHTML('beforeend', signatureHTML);
            } else {
              tempDiv.insertAdjacentHTML('beforeend', signatureHTML);
            }
          }
          
          // Füge Footer hinzu
          const footerHTML = `
            <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ccc; text-align: center; font-size: 9pt; color: #666;">
              <p>Erstellt mit Contract AI - ${new Date().toLocaleDateString('de-DE')}</p>
              <p style="font-size: 8pt; margin-top: 5px;">
                ${contract.isGenerated ? 'KI-generierter Vertrag' : 'Hochgeladener Vertrag'} | 
                Dokument-ID: ${contract._id}
              </p>
            </div>
          `;
          tempDiv.insertAdjacentHTML('beforeend', footerHTML);
          
          pdfContent = tempDiv;
          
        } else {
          console.log("⚠️ Keine HTML-Version vorhanden, erstelle professionellen Fallback");
          // Fallback: Erstelle professionelles HTML aus normalem Content
          const tempDiv = document.createElement('div');
          
          tempDiv.innerHTML = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                @page {
                  size: A4;
                  margin: 20mm 15mm 25mm 20mm;
                  @bottom-center {
                    content: counter(page);
                    font-size: 10pt;
                    color: #666;
                  }
                }
                
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                
                body {
                  font-family: Arial, Calibri, sans-serif;
                  font-size: 11pt;
                  line-height: 1.6;
                  color: #000;
                  background: white;
                }
                
                .header {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  margin-bottom: 30px;
                  padding-bottom: 15px;
                  border-bottom: 3px solid #003366;
                }
                
                .company-info {
                  flex: 1;
                }
                
                .company-name {
                  font-size: 16pt;
                  font-weight: bold;
                  color: #003366;
                  margin-bottom: 8px;
                  letter-spacing: 0.5px;
                }
                
                .company-details {
                  font-size: 10pt;
                  color: #333;
                  line-height: 1.4;
                }
                
                .company-details div {
                  margin-bottom: 2px;
                }
                
                .logo-container {
                  width: 150px;
                  height: 80px;
                  display: flex;
                  align-items: center;
                  justify-content: flex-end;
                  margin-left: 20px;
                }
                
                .logo-container img {
                  max-width: 100%;
                  max-height: 100%;
                  object-fit: contain;
                }
                
                h1 {
                  font-size: 20pt;
                  font-weight: bold;
                  text-align: center;
                  margin: 40px 0;
                  text-transform: uppercase;
                  letter-spacing: 2px;
                  border-bottom: 2px solid #000;
                  padding-bottom: 10px;
                }
                
                h2 {
                  font-size: 14pt;
                  font-weight: bold;
                  margin: 25px 0 15px 0;
                  color: #003366;
                  border-left: 4px solid #003366;
                  padding-left: 10px;
                  page-break-after: avoid;
                }
                
                p {
                  margin-bottom: 10px;
                  text-align: justify;
                  orphans: 3;
                  widows: 3;
                  hyphens: auto;
                }
                
                .parties {
                  margin: 30px 0;
                  page-break-inside: avoid;
                }
                
                .party {
                  margin: 15px 0;
                  padding: 10px;
                  background: #f8f9fa;
                  border-left: 3px solid #003366;
                }
                
                .party strong {
                  display: block;
                  margin-bottom: 5px;
                  color: #003366;
                }
                
                .between {
                  text-align: center;
                  font-style: italic;
                  margin: 20px 0;
                  font-size: 11pt;
                }
                
                .section {
                  margin: 25px 0;
                  page-break-inside: avoid;
                }
                
                .subsection {
                  margin-left: 20px;
                  margin-bottom: 12px;
                }
                
                .subpoint {
                  margin-left: 40px;
                  margin-bottom: 8px;
                }
                
                .signature-section {
                  margin-top: 60px;
                  page-break-inside: avoid;
                  border-top: 2px solid #003366;
                  padding-top: 20px;
                }
                
                .signature-grid {
                  display: table;
                  width: 100%;
                  margin-top: 40px;
                }
                
                .signature-block {
                  display: table-cell;
                  width: 45%;
                  vertical-align: top;
                  text-align: center;
                }
                
                .signature-line {
                  border-bottom: 2px solid #000;
                  width: 250px;
                  margin: 40px auto 10px;
                }
                
                .footer {
                  margin-top: 50px;
                  padding-top: 20px;
                  border-top: 1px solid #ccc;
                  text-align: center;
                  font-size: 9pt;
                  color: #666;
                }
                
                @media print {
                  .section { page-break-inside: avoid; }
                  h2 { page-break-after: avoid; }
                  .signature-section { page-break-inside: avoid; }
                }
              </style>
            </head>
            <body>
              ${companyProfile ? `
                <div class="header">
                  <div class="company-info">
                    <div class="company-name">${companyProfile.companyName || 'Firmenname'}${companyProfile.legalForm ? ` ${companyProfile.legalForm}` : ''}</div>
                    <div class="company-details">
                      ${companyProfile.street ? `<div>${companyProfile.street}</div>` : ''}
                      ${companyProfile.postalCode || companyProfile.city ? `<div>${companyProfile.postalCode || ''} ${companyProfile.city || ''}</div>` : ''}
                      ${companyProfile.contactEmail ? `<div>E-Mail: ${companyProfile.contactEmail}</div>` : ''}
                      ${companyProfile.contactPhone ? `<div>Tel: ${companyProfile.contactPhone}</div>` : ''}
                      ${companyProfile.vatId ? `<div>USt-IdNr.: ${companyProfile.vatId}</div>` : ''}
                      ${companyProfile.tradeRegister ? `<div>${companyProfile.tradeRegister}</div>` : ''}
                    </div>
                  </div>
                  ${companyProfile.logoUrl ? `
                    <div class="logo-container">
                      <img src="${companyProfile.logoUrl}" alt="Firmenlogo" />
                    </div>
                  ` : ''}
                </div>
              ` : ''}
              
              <div class="content">
                ${formatContentForDisplay(contract.content || '')}
              </div>
              
              ${contract.signature ? `
                <div class="signature-section">
                  <h3 style="color: #003366;">Digitale Unterschrift:</h3>
                  <img src="${contract.signature}" alt="Unterschrift" style="max-width: 250px; margin: 15px auto; display: block; border: 2px solid #e2e8f0; padding: 10px; background: white; border-radius: 4px;" />
                  <p style="font-size: 10pt; color: #666; text-align: center; font-style: italic;">
                    Elektronisch unterschrieben am ${new Date().toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              ` : ''}
              
              <div class="footer">
                <p><strong>Contract AI</strong> - Intelligente Vertragsverwaltung</p>
                <p>Erstellt am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}</p>
                <p style="font-size: 8pt; margin-top: 5px;">
                  ${contract.isGenerated ? 'KI-generierter Vertrag' : 'Hochgeladener Vertrag'} | 
                  Dokument-ID: ${contract._id}
                </p>
              </div>
            </body>
            </html>
          `;
          
          pdfContent = tempDiv;
        }
        
        document.body.appendChild(pdfContent);
        
        // 🎨 PDF-OPTIONEN - PROFESSIONAL GRADE (OHNE PROBLEMATISCHE METHODEN)
        const enhancedPdfOptions = {
          margin: contract.contentHTML ? [5, 5, 5, 5] as [number, number, number, number] : [10, 10, 10, 10] as [number, number, number, number],
          filename: `${contract.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
          image: {
            type: 'jpeg' as const,
            quality: 0.98
          },
          html2canvas: { 
            scale: 2, 
            useCORS: true,
            letterRendering: true,
            logging: false,
            allowTaint: true,
            backgroundColor: '#ffffff',
            removeContainer: true,
            foreignObjectRendering: true,
            windowWidth: 794,
            windowHeight: 1123
          },
          jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait' as const,
            compress: true,
            precision: 16,
            putOnlyUsedFonts: true,
            floatPrecision: 16,
            hotfixes: ['px_scaling']
          },
          pagebreak: { 
            mode: ['avoid-all', 'css', 'legacy'],
            before: '.page-break-before',
            after: '.page-break-after',
            avoid: ['h1', 'h2', 'h3', '.avoid-break', '.signature-section', '.company-info', '.header', '.section']
          },
          enableLinks: false
        };
        
        try {
          console.log("🚀 Starte professionellen PDF-Export...");
          
          // 📊 ANALYTICS: PDF Generation Start
          console.log("📊 PDF Export gestartet:", {
            contractId: contract._id,
            contractType: contract.contractType,
            hasCompanyProfile: !!companyProfile,
            hasHTMLVersion: !!contract.contentHTML,
            hasSignature: !!contract.signature,
            timestamp: new Date().toISOString()
          });
          
          // PDF direkt generieren und speichern - OHNE outputPdf() AUFRUF!
          await html2pdf().set(enhancedPdfOptions).from(pdfContent).save();
          
          console.log("✅ PDF erfolgreich generiert mit professionellen Features");
          toast.success("✅ PDF wurde erfolgreich heruntergeladen!");
          
          // 📊 ANALYTICS: PDF Generation Success
          console.log("📊 PDF Export erfolgreich:", {
            contractId: contract._id,
            timestamp: new Date().toISOString(),
            quality: 'professional'
          });
          
        } catch (pdfError: any) {
          console.error("❌ Professioneller PDF-Export fehlgeschlagen", pdfError);
          
          // 📊 ANALYTICS: PDF Generation Error
          console.log("📊 PDF Export Fehler:", {
            contractId: contract._id,
            error: pdfError?.message || 'Unknown error',
            timestamp: new Date().toISOString()
          });
          
          // Fallback zu einfacherem Export
          try {
            console.log("🔄 Versuche Fallback PDF-Export...");
            const simplePdfOptions = {
              margin: 15,
              filename: `${contract.name}_${new Date().toISOString().split('T')[0]}.pdf`,
              image: { type: 'jpeg' as const, quality: 0.95 },
              html2canvas: { scale: 1.5 },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
            };

            await html2pdf().set(simplePdfOptions).from(pdfContent).save();
            toast.warning("⚠️ PDF mit reduzierter Qualität exportiert");
          } catch (fallbackError) {
            console.error("❌ Auch Fallback fehlgeschlagen:", fallbackError);
            toast.error("PDF-Export fehlgeschlagen. Bitte versuchen Sie es erneut.");
          }
        }
        
        document.body.removeChild(pdfContent);
      }
    } catch (error) {
      console.error('PDF-Export fehlgeschlagen:', error);
      toast.error('PDF-Export fehlgeschlagen.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handlePrint = () => {
    try {
      const printContent = contract.contentHTML || formatContentForDisplay(contract.content || '');
      const printWindow = window.open('', '_blank');
      if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${contract.name}</title>
            <style>
              @page { 
                size: A4; 
                margin: 20mm 15mm 25mm 20mm;
              }
              body { 
                font-family: Arial, sans-serif; 
                font-size: 11pt;
                line-height: 1.6;
                color: #000;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 30px;
                padding-bottom: 15px;
                border-bottom: 3px solid #003366;
              }
              .company-info {
                flex: 1;
              }
              .company-name {
                font-size: 16pt;
                font-weight: bold;
                color: #003366;
                margin-bottom: 8px;
              }
              .company-details {
                font-size: 10pt;
                color: #333;
                line-height: 1.4;
              }
              h1 { 
                font-size: 18pt; 
                text-align: center; 
                margin: 30px 0;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              h2 { 
                font-size: 13pt; 
                margin: 20px 0 10px;
                color: #003366;
                border-left: 4px solid #003366;
                padding-left: 10px;
              }
              .signature { 
                margin-top: 50px;
                page-break-inside: avoid;
                border-top: 2px solid #003366;
                padding-top: 20px;
              }
              @media print {
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${companyProfile ? `
              <div class="header">
                <div class="company-info">
                  <div class="company-name">${companyProfile.companyName}${companyProfile.legalForm ? ` ${companyProfile.legalForm}` : ''}</div>
                  <div class="company-details">
                    ${companyProfile.street ? `${companyProfile.street}<br/>` : ''}
                    ${companyProfile.postalCode || companyProfile.city ? `${companyProfile.postalCode || ''} ${companyProfile.city || ''}<br/>` : ''}
                    ${companyProfile.contactEmail ? `E-Mail: ${companyProfile.contactEmail}<br/>` : ''}
                    ${companyProfile.contactPhone ? `Tel: ${companyProfile.contactPhone}<br/>` : ''}
                    ${companyProfile.vatId ? `USt-IdNr.: ${companyProfile.vatId}<br/>` : ''}
                  </div>
                </div>
                ${companyProfile.logoUrl ? `
                  <div style="width: 150px; text-align: right;">
                    <img src="${companyProfile.logoUrl}" style="max-width: 150px; max-height: 80px;" alt="Logo" />
                  </div>
                ` : ''}
              </div>
            ` : ''}
            ${printContent}
            ${contract.signature ? `
              <div class="signature">
                <h3>Digitale Unterschrift:</h3>
                <img src="${contract.signature}" alt="Unterschrift" style="max-width: 200px;" />
                <p style="margin-top: 10px; font-size: 10pt; color: #666;">
                  Elektronisch unterschrieben am ${new Date().toLocaleString('de-DE')}
                </p>
              </div>
            ` : ''}
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } else {
      alert('Pop-up wurde blockiert. Bitte erlaube Pop-ups für diese Seite.');
    }
    } catch (error) {
      console.error('Print failed:', error);
      alert('Drucken fehlgeschlagen. Bitte versuche es erneut.');
    }
  };

  const handleCopy = async () => {
    try {
      // Kopiere nur den reinen Text, nicht das HTML
      const plainText = contract.content || '';
      await navigator.clipboard.writeText(plainText);
      setCopySuccess(true);
      toast.success("📋 Text erfolgreich kopiert!");
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Kopieren fehlgeschlagen:', error);
      toast.error('Kopieren fehlgeschlagen.');
    }
  };

  const handleStartEdit = () => {
    setEditedContent(contract.content || '');
    setEditedHTML(''); // HTML wird beim Editieren zurückgesetzt (muss neu generiert werden)
    setIsEditing(true);
    setTimeout(() => {
      if (editTextareaRef.current) {
        editTextareaRef.current.focus();
      }
    }, 100);
    toast.info("✏️ Bearbeitungsmodus aktiviert");
  };

  const handleCancelEdit = () => {
    setEditedContent(contract.content || '');
    setEditedHTML(contract.contentHTML || '');
    setIsEditing(false);
    toast.info("❌ Bearbeitung abgebrochen");
  };

  return (
    <div style={{ marginBottom: '32px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={20} style={{ color: '#64748b' }} />
          <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px', fontWeight: '600' }}>
            Vertragsinhalt
          </h3>
          {contract.isGenerated && (
            <span style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              ✨ KI-Generiert
            </span>
          )}
          {contract.contentHTML && (
            <span style={{
              background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              📄 Professionelles Format
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {!isEditing ? (
            <button
              onClick={handleStartEdit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
            >
              <Edit size={16} />
              Bearbeiten
            </button>
          ) : (
            <>
              <button
                onClick={handleSaveContent}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <Save size={16} />
                Speichern
              </button>
              <button
                onClick={handleCancelEdit}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <X size={16} />
                Abbrechen
              </button>
            </>
          )}
          
          <button
            onClick={handleDownloadPDF}
            disabled={isExportingPDF}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: isExportingPDF ? '#94a3b8' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: isExportingPDF ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: isExportingPDF ? '0 1px 2px rgba(0,0,0,0.1)' : '0 2px 4px rgba(59, 130, 246, 0.3)',
              opacity: isExportingPDF ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!isExportingPDF) {
                e.currentTarget.style.backgroundColor = '#2563eb';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isExportingPDF) {
                e.currentTarget.style.backgroundColor = '#3b82f6';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
              }
            }}
          >
            <Download size={14} />
            {isExportingPDF ? 'Exportiere...' : 'PDF Export'}
          </button>

          <button
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Printer size={14} />
            Drucken
          </button>

          <button
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: copySuccess ? '#10b981' : '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {copySuccess ? <CheckCircle size={14} /> : <Copy size={14} />}
            {copySuccess ? 'Kopiert!' : 'Kopieren'}
          </button>

          <button
            onClick={() => setIsFullscreen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Maximize2 size={14} />
            Vollansicht
          </button>

          <button
            onClick={() => setShowKeyboardHints(!showKeyboardHints)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: '#64748b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title="Keyboard Shortcuts anzeigen"
          >
            <Keyboard size={14} />
          </button>
        </div>
      </div>

      {/* Content Preview */}
      <div
        ref={contentRef}
        className="contract-content-scroll premium-contract-display"
        style={{
          border: '2px solid #e2e8f0',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          padding: '30px',
          maxHeight: '700px',
          overflowY: 'auto',
          fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
          fontSize: '13px',
          lineHeight: '1.7',
          color: '#1a1a1a',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          position: 'relative',
          backdropFilter: 'blur(10px)'
        }}
      >
        {!isEditing ? (
          // 🎨 BOMBASTISCHE HTML-Version mit Premium-Styling
          <div 
            dangerouslySetInnerHTML={{ 
              __html: premiumContractStyles + displayContent 
            }} 
          />
        ) : (
          <textarea
            ref={editTextareaRef}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            style={{
              width: '100%',
              minHeight: '500px',
              border: 'none',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: '1.6',
              color: '#1e293b',
              backgroundColor: 'transparent',
              padding: '0'
            }}
            placeholder="Vertrag bearbeiten..."
          />
        )}
      </div>

      {/* Signature */}
      {contract.signature && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          border: '2px solid #003366',
          borderRadius: '8px',
          backgroundColor: '#f8fafc'
        }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#003366', fontWeight: '600' }}>
            Digitale Unterschrift:
          </p>
          <img 
            src={contract.signature} 
            alt="Unterschrift" 
            style={{ 
              maxWidth: '200px', 
              height: 'auto',
              border: '2px solid #e2e8f0',
              borderRadius: '4px',
              backgroundColor: 'white',
              padding: '8px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }} 
          />
          <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
            Unterschrieben am {new Date(contract.createdAt || '').toLocaleDateString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      )}

      {/* ⌨️ KEYBOARD SHORTCUTS HELP MODAL */}
      <div style={{ position: 'relative' }}>
        <AnimatePresence>
          {showKeyboardHints && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                position: 'absolute',
                top: '-400px',
                right: '0px',
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                border: '1px solid #e2e8f0',
                zIndex: 1000,
                minWidth: '280px',
                maxWidth: '350px'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <Keyboard size={18} style={{ color: '#64748b' }} />
                <h4 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: '600' }}>
                  ⌨️ Keyboard Shortcuts
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Edit Mode Toggle</span>
                  <code style={{
                    backgroundColor: '#f1f5f9',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#475569'
                  }}>Ctrl + E</code>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Save Changes</span>
                  <code style={{
                    backgroundColor: '#f1f5f9',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#475569'
                  }}>Ctrl + S</code>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Cancel/Close</span>
                  <code style={{
                    backgroundColor: '#f1f5f9',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#475569'
                  }}>Escape</code>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Print</span>
                  <code style={{
                    backgroundColor: '#f1f5f9',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#475569'
                  }}>Ctrl + P</code>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Download PDF</span>
                  <code style={{
                    backgroundColor: '#f1f5f9',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#475569'
                  }}>Ctrl + D</code>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Copy Text</span>
                  <code style={{
                    backgroundColor: '#f1f5f9',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#475569'
                  }}>Ctrl + C</code>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Fullscreen Toggle</span>
                  <code style={{
                    backgroundColor: '#f1f5f9',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#475569'
                  }}>F11</code>
                </div>
              </div>

              <div style={{
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid #e2e8f0',
                textAlign: 'center'
              }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                  💡 Power User Features für schnellere Bedienung
                </p>
              </div>

              <button
                onClick={() => setShowKeyboardHints(false)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  color: '#64748b',
                  transition: 'all 0.2s'
                }}
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              backdropFilter: 'blur(4px)'
            }}
            onClick={() => setIsFullscreen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                width: '90%',
                maxWidth: '900px',
                maxHeight: '90%',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
              }}
            >
              {/* Modal Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={20} style={{ color: '#64748b' }} />
                  <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px', fontWeight: '600' }}>
                    {contract.name}
                  </h3>
                  {contract.isGenerated && (
                    <span style={{
                      background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      ✨ KI-Generiert
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsFullscreen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    transition: 'all 0.2s'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div
                className="contract-modal-scroll"
                style={{
                  flex: 1,
                  padding: '30px',
                  overflowY: 'auto',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '14px',
                  lineHeight: '1.8',
                  color: '#1e293b'
                }}
              >
                {/* 🔴 NEU: Zeige HTML-Version wenn vorhanden in Fullscreen */}
                <div dangerouslySetInnerHTML={{ __html: displayContent }} />
              </div>

              {/* Modal Signature */}
              {contract.signature && (
                <div style={{
                  padding: '20px',
                  borderTop: '2px solid #003366',
                  backgroundColor: '#f8fafc'
                }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#003366', fontWeight: '600' }}>
                    Digitale Unterschrift:
                  </p>
                  <img 
                    src={contract.signature} 
                    alt="Unterschrift" 
                    style={{ 
                      maxWidth: '250px', 
                      height: 'auto',
                      border: '2px solid #e2e8f0',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      padding: '12px',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                    Elektronisch unterschrieben am {new Date(contract.createdAt || '').toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContractContentViewer;