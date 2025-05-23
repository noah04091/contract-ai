// ContractContentViewer.tsx - Neue Komponente für Vertragsinhalt
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Maximize2, X, Eye, Copy, CheckCircle, Printer } from 'lucide-react';

interface ContractContentViewerProps {
  contract: {
    _id: string;
    name: string;
    content?: string;
    signature?: string;
    isGenerated?: boolean;
    createdAt?: string;
    uploadedAt?: string;
  };
}

const ContractContentViewer: React.FC<ContractContentViewerProps> = ({ contract }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Fallback-Content für Verträge ohne Inhalt
  const displayContent = contract.content || 
    `Vertrag: ${contract.name}\n\nDieser Vertrag wurde ${contract.isGenerated ? 'generiert' : 'hochgeladen'} am ${
      contract.isGenerated ? 
        new Date(contract.createdAt || '').toLocaleDateString('de-DE') : 
        new Date(contract.uploadedAt || '').toLocaleDateString('de-DE')
    }.\n\nDetaillierte Vertragsinhalte können durch Analyse oder manuellen Upload bereitgestellt werden.`;

  const handleDownloadPDF = async () => {
    try {
      // Dynamischer Import mit korrekten TypeScript-Typen
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = (html2pdfModule.default || html2pdfModule) as typeof import('html2pdf.js').default;
      
      if (contentRef.current) {
        const opt = {
          margin: [15, 15, 15, 15],
          filename: `${contract.name}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2, 
            useCORS: true,
            letterRendering: true 
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait' 
          }
        };

        // Erstelle temporäres Element für PDF-Generierung
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = `
          <div style="font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
              <h1 style="margin: 0; color: #333; font-size: 24px;">${contract.name}</h1>
              ${contract.isGenerated ? 
                '<p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">✨ KI-Generierter Vertrag</p>' : 
                '<p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">📄 Hochgeladener Vertrag</p>'
              }
              <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">
                ${contract.isGenerated ? 'Erstellt' : 'Hochgeladen'} am: ${
                  contract.isGenerated ? 
                    new Date(contract.createdAt || '').toLocaleDateString('de-DE') : 
                    new Date(contract.uploadedAt || '').toLocaleDateString('de-DE')
                }
              </p>
            </div>
            <div style="white-space: pre-wrap; font-size: 14px; color: #333; text-align: justify;">
              ${displayContent}
            </div>
            ${contract.signature ? `
              <div style="margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px;">
                <p style="margin-bottom: 10px; color: #666; font-size: 12px;">Digitale Unterschrift:</p>
                <img src="${contract.signature}" alt="Unterschrift" style="max-width: 200px; height: auto;" />
              </div>
            ` : ''}
          </div>
        `;
        
        document.body.appendChild(tempDiv);
        
        await html2pdf().set(opt).from(tempDiv).save();
        
        document.body.removeChild(tempDiv);
      }
    } catch (error) {
      console.error('PDF-Export fehlgeschlagen:', error);
      alert('PDF-Export fehlgeschlagen. Bitte versuchen Sie es erneut.');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${contract.name}</title>
            <style>
              body { 
                font-family: 'Times New Roman', serif; 
                padding: 40px; 
                line-height: 1.6; 
                color: #333;
              }
              .header { 
                text-align: center; 
                margin-bottom: 30px; 
                border-bottom: 2px solid #333; 
                padding-bottom: 20px; 
              }
              .content { 
                white-space: pre-wrap; 
                font-size: 14px; 
                text-align: justify; 
              }
              .signature { 
                margin-top: 50px; 
                border-top: 1px solid #ccc; 
                padding-top: 20px; 
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${contract.name}</h1>
              ${contract.isGenerated ? '<p>✨ KI-Generierter Vertrag</p>' : '<p>📄 Hochgeladener Vertrag</p>'}
              <p>${contract.isGenerated ? 'Erstellt' : 'Hochgeladen'} am: ${
                contract.isGenerated ? 
                  new Date(contract.createdAt || '').toLocaleDateString('de-DE') : 
                  new Date(contract.uploadedAt || '').toLocaleDateString('de-DE')
              }</p>
            </div>
            <div class="content">${displayContent}</div>
            ${contract.signature ? `
              <div class="signature">
                <p>Digitale Unterschrift:</p>
                <img src="${contract.signature}" alt="Unterschrift" style="max-width: 200px; height: auto;" />
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
      await navigator.clipboard.writeText(displayContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Kopieren fehlgeschlagen:', error);
    }
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
          maxHeight: '400px',
          overflowY: 'auto',
          fontFamily: '"Times New Roman", serif',
          fontSize: '14px',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          color: '#1e293b',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
      >
        {displayContent}
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
                maxWidth: '800px',
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
                  padding: '20px',
                  overflowY: 'auto',
                  fontFamily: '"Times New Roman", serif',
                  fontSize: '16px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  color: '#1e293b'
                }}
              >
                {displayContent}
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