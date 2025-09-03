/* eslint-disable @typescript-eslint/no-explicit-any */
// ContractContentViewer.tsx - VERBESSERTE VERSION mit HTML-Support für professionelle PDFs
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Maximize2, X, Eye, Copy, CheckCircle, Printer, Edit, Save, Keyboard } from 'lucide-react';
import { toast } from 'react-toastify';

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

  // Formatiere Content für bessere Darstellung
  const formatContentForDisplay = (content: string): string => {
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

  // 🔴 NEU: Verwende HTML wenn vorhanden, sonst formatiere den normalen Content
  const displayContent = isEditing ? editedContent : (
    contract.contentHTML || formatContentForDisplay(contract.content || 
    `Vertrag: ${contract.name}\n\nDieser Vertrag wurde ${contract.isGenerated ? 'generiert' : 'hochgeladen'} am ${
      contract.isGenerated ? 
        new Date(contract.createdAt || '').toLocaleDateString('de-DE') : 
        new Date(contract.uploadedAt || '').toLocaleDateString('de-DE')
    }.\n\nDetaillierte Vertragsinhalte können durch Analyse oder manuellen Upload bereitgestellt werden.`)
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

  // 🔴 HAUPTVERBESSERUNG: PDF Export mit HTML-Support
  const handleDownloadPDF = async () => {
    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = (html2pdfModule.default || html2pdfModule) as typeof import('html2pdf.js').default;
      
      if (contentRef.current) {
        let pdfContent;
        
        // 🔴 NEU: Prüfe ob HTML-Version vorhanden ist
        if (contract.contentHTML) {
          // Verwende die professionelle HTML-Version mit Logo etc.
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = contract.contentHTML;
          
          // Füge Unterschrift zur HTML-Version hinzu wenn vorhanden
          if (contract.signature) {
            const signatureHTML = `
              <div style="margin-top: 50px; page-break-inside: avoid;">
                <h3 style="font-size: 14pt; font-weight: bold; margin-bottom: 10px;">Digitale Unterschrift:</h3>
                <img src="${contract.signature}" alt="Unterschrift" style="max-width: 200px; margin-top: 10px; border: 1px solid #e2e8f0; padding: 8px; background: white;" />
                <p style="font-size: 9pt; color: #666; margin-top: 10px;">
                  Elektronisch unterschrieben am ${new Date().toLocaleDateString('de-DE', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
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
          
          pdfContent = tempDiv;
          
        } else {
          // Fallback: Erstelle HTML aus normalem Content (für ältere Verträge ohne HTML)
          const tempDiv = document.createElement('div');
          
          tempDiv.innerHTML = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                @page {
                  size: A4;
                  margin: 25mm 20mm 20mm 30mm;
                }
                
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                
                body {
                  font-family: Arial, Calibri, sans-serif;
                  font-size: 11pt;
                  line-height: 1.5;
                  color: #000;
                }
                
                .header {
                  text-align: center;
                  margin-bottom: 40px;
                  padding-bottom: 20px;
                  border-bottom: 2px solid #000;
                }
                
                .logo {
                  max-height: 60px;
                  margin-bottom: 20px;
                }
                
                .company-info {
                  text-align: center;
                  font-size: 10pt;
                  color: #333;
                  margin-bottom: 30px;
                }
                
                h1 {
                  font-size: 18pt;
                  font-weight: bold;
                  text-align: center;
                  margin: 30px 0;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                }
                
                h2 {
                  font-size: 13pt;
                  font-weight: bold;
                  margin: 20px 0 10px 0;
                  page-break-after: avoid;
                }
                
                p {
                  margin-bottom: 8px;
                  text-align: justify;
                  orphans: 3;
                  widows: 3;
                }
                
                .parties {
                  margin: 30px 0;
                  page-break-inside: avoid;
                }
                
                .party {
                  margin: 15px 0;
                }
                
                .party strong {
                  display: block;
                  margin-bottom: 5px;
                }
                
                .between {
                  text-align: center;
                  font-style: italic;
                  margin: 15px 0;
                }
                
                .section {
                  margin: 20px 0;
                  page-break-inside: avoid;
                }
                
                .subsection {
                  margin-left: 20px;
                  margin-bottom: 10px;
                }
                
                .subpoint {
                  margin-left: 40px;
                  margin-bottom: 5px;
                }
                
                .signature-section {
                  margin-top: 50px;
                  page-break-inside: avoid;
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
                }
                
                .signature-line {
                  border-bottom: 1px solid #000;
                  width: 200px;
                  margin: 40px 0 5px 0;
                }
                
                .footer {
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 1px solid #ccc;
                  text-align: center;
                  font-size: 9pt;
                  color: #666;
                }
                
                @media print {
                  .section { page-break-inside: avoid; }
                  h2 { page-break-after: avoid; }
                }
              </style>
            </head>
            <body>
              ${companyProfile?.logoUrl ? `
                <div class="header">
                  <img src="${companyProfile.logoUrl}" alt="Logo" class="logo" />
                </div>
              ` : ''}
              
              ${companyProfile ? `
                <div class="company-info">
                  <strong>${companyProfile.companyName}</strong>
                  ${companyProfile.legalForm ? `<br/>${companyProfile.legalForm}` : ''}
                  <br/>${companyProfile.street}, ${companyProfile.postalCode} ${companyProfile.city}
                  ${companyProfile.contactEmail ? `<br/>E-Mail: ${companyProfile.contactEmail}` : ''}
                  ${companyProfile.contactPhone ? `<br/>Tel: ${companyProfile.contactPhone}` : ''}
                  ${companyProfile.vatId ? `<br/>USt-IdNr.: ${companyProfile.vatId}` : ''}
                </div>
              ` : ''}
              
              <div class="content">
                ${formatContentForDisplay(contract.content || '')}
              </div>
              
              ${contract.signature ? `
                <div class="signature-section">
                  <h3>Digitale Unterschrift:</h3>
                  <img src="${contract.signature}" alt="Unterschrift" style="max-width: 200px; margin-top: 10px;" />
                  <p style="font-size: 9pt; color: #666; margin-top: 10px;">
                    Elektronisch unterschrieben am ${new Date().toLocaleDateString('de-DE')}
                  </p>
                </div>
              ` : ''}
              
              <div class="footer">
                <p>Erstellt mit Contract AI - ${new Date().toLocaleDateString('de-DE')}</p>
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
        
        // 🎨 ERWEITERTE PDF-OPTIONEN - PROFESSIONAL GRADE
        const enhancedPdfOptions = {
          margin: contract.contentHTML ? [5, 5, 5, 5] : [15, 15, 15, 15], // Kleinere Margins wenn HTML vorhanden
          filename: `${contract.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2, 
            useCORS: true,
            letterRendering: true,
            logging: false,
            allowTaint: true,
            backgroundColor: '#ffffff',
            removeContainer: true,
            foreignObjectRendering: true
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            compress: true,
            precision: 16,
            putOnlyUsedFonts: true,
            floatPrecision: 16
          },
          pagebreak: { 
            mode: ['avoid-all', 'css', 'legacy'],
            before: '.page-break-before',
            after: '.page-break-after',
            avoid: ['h1', 'h2', '.avoid-break', '.signature-section', '.company-info']
          }
        };

        // 📄 PDF METADATA SETUP
        const addPdfMetadata = (pdf: any) => {
          try {
            pdf.setProperties({
              title: contract.name,
              subject: `Vertrag erstellt mit Contract AI`,
              author: companyProfile?.companyName || 'Contract AI User',
              keywords: `Vertrag, Contract, Legal, ${contract.contractType}`,
              creator: 'Contract AI v2 Enhanced',
              producer: 'Contract AI PDF Generator',
              creationDate: new Date(),
              modDate: new Date()
            });
            console.log("✅ PDF Metadata hinzugefügt");
          } catch (error) {
            console.warn("⚠️ PDF Metadata konnte nicht hinzugefügt werden:", error);
          }
        };
        
        try {
          console.log("🚀 Starte erweiterten PDF-Export...");
          const pdfGenerator = html2pdf().set(enhancedPdfOptions).from(pdfContent);
          
          // 📊 ANALYTICS: PDF Generation Start
          console.log("📊 PDF Export gestartet:", {
            contractId: contract._id,
            contractType: contract.contractType,
            hasCompanyProfile: !!companyProfile,
            hasHTMLVersion: !!contract.contentHTML,
            timestamp: new Date().toISOString()
          });
          
          // PDF generieren und Metadata hinzufügen
          const pdfBlob = await pdfGenerator.outputPdf() as Blob;
          
          // Versuche Metadata hinzuzufügen (falls möglich)
          try {
            const pdfDoc = await pdfGenerator.outputPdf() as any;
            addPdfMetadata(pdfDoc);
          } catch (metadataError) {
            console.warn("Metadata konnte nicht hinzugefügt werden:", metadataError);
          }
          
          // PDF speichern
          await pdfGenerator.save();
          
          console.log("✅ PDF erfolgreich generiert mit erweiterten Features");
          toast.success("✅ PDF erfolgreich generiert!");
          
          // 📊 ANALYTICS: PDF Generation Success
          console.log("📊 PDF Export erfolgreich:", {
            contractId: contract._id,
            pdfSize: pdfBlob.size,
            timestamp: new Date().toISOString()
          });
          
        } catch (pdfError: any) {
          console.error("❌ Erweiterter PDF-Export fehlgeschlagen", pdfError);
          
          // 📊 ANALYTICS: PDF Generation Error
          console.log("📊 PDF Export Fehler:", {
            contractId: contract._id,
            error: pdfError?.message || 'Unknown error',
            timestamp: new Date().toISOString()
          });
          
          toast.error("PDF-Export fehlgeschlagen. Bitte versuchen Sie es erneut.");
        }
        
        document.body.removeChild(pdfContent);
      }
    } catch (error) {
      console.error('PDF-Export fehlgeschlagen:', error);
      toast.error('PDF-Export fehlgeschlagen.');
    }
  };

  const handlePrint = () => {
    const printContent = contract.contentHTML || formatContentForDisplay(contract.content || '');
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${contract.name}</title>
            <style>
              @page { size: A4; margin: 25mm 20mm; }
              body { 
                font-family: Arial, sans-serif; 
                font-size: 11pt;
                line-height: 1.5;
                color: #000;
              }
              h1 { font-size: 18pt; text-align: center; margin: 30px 0; }
              h2 { font-size: 13pt; margin: 20px 0 10px; }
              .signature { margin-top: 50px; }
            </style>
          </head>
          <body>
            ${companyProfile ? `
              <div style="text-align: center; margin-bottom: 30px;">
                ${companyProfile.logoUrl ? `<img src="${companyProfile.logoUrl}" style="max-height: 60px; margin-bottom: 20px;" alt="Logo" />` : ''}
                <strong>${companyProfile.companyName}</strong><br/>
                ${companyProfile.street}, ${companyProfile.postalCode} ${companyProfile.city}
              </div>
            ` : ''}
            ${printContent}
            ${contract.signature ? `
              <div class="signature">
                <p>Digitale Unterschrift:</p>
                <img src="${contract.signature}" alt="Unterschrift" style="max-width: 200px;" />
              </div>
            ` : ''}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
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
    setEditedHTML(''); // HTML wird beim Editieren zurückgesetzt
    setIsEditing(true);
    setTimeout(() => {
      if (editTextareaRef.current) {
        editTextareaRef.current.focus();
      }
    }, 100);
  };

  const handleCancelEdit = () => {
    setEditedContent(contract.content || '');
    setEditedHTML(contract.contentHTML || '');
    setIsEditing(false);
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
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Download size={14} />
            PDF
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
        className="contract-content-scroll"
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          padding: '24px',
          maxHeight: '600px',
          overflowY: 'auto',
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          lineHeight: '1.6',
          color: '#1e293b',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
      >
        {!isEditing ? (
          // 🔴 NEU: Zeige HTML-Version wenn vorhanden, sonst formatiere den normalen Content
          <div dangerouslySetInnerHTML={{ __html: displayContent }} />
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
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          backgroundColor: '#f8fafc'
        }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
            Digitale Unterschrift:
          </p>
          <img 
            src={contract.signature} 
            alt="Unterschrift" 
            style={{ 
              maxWidth: '200px', 
              height: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              backgroundColor: 'white',
              padding: '8px'
            }} 
          />
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
                  borderTop: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc'
                }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
                    Digitale Unterschrift:
                  </p>
                  <img 
                    src={contract.signature} 
                    alt="Unterschrift" 
                    style={{ 
                      maxWidth: '250px', 
                      height: 'auto',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      padding: '12px'
                    }} 
                  />
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