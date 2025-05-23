// ContractContentViewer.tsx - Neue Komponente für Vertragsinhalt
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Download, 
  Maximize2, 
  X, 
  Eye,
  Copy,
  CheckCircle,
  Printer
} from 'lucide-react';

interface ContractContentViewerProps {
  contract: {
    _id: string;
    name: string;
    content?: string;
    signature?: string;
    isGenerated?: boolean;
    createdAt?: string;
  };
}

const ContractContentViewer: React.FC<ContractContentViewerProps> = ({ contract }) => {
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Prüfen ob Vertrag Inhalt hat
  if (!contract.content) {
    return (
      <div style={{ 
        padding: '24px', 
        background: '#f8fafc', 
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        textAlign: 'center',
        color: '#64748b'
      }}>
        <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
        <h3 style={{ margin: '0 0 8px 0', color: '#475569' }}>Kein Vertragsinhalt verfügbar</h3>
        <p style={{ margin: 0 }}>
          {contract.isGenerated 
            ? 'Dieser generierte Vertrag hat keinen gespeicherten Inhalt.' 
            : 'Dieser hochgeladene Vertrag enthält nur Metadaten.'}
        </p>
      </div>
    );
  }

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(contract.content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Kopieren fehlgeschlagen:', error);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      // Dynamically import html2pdf with proper typing
      const html2pdfModule = await import('html2pdf.js') as any;
      const html2pdf = html2pdfModule.default || html2pdfModule;
      
      const container = contentRef.current;
      if (!container) return;

      // Create a temporary container with better styling for PDF
      const pdfContainer = document.createElement('div');
      pdfContainer.innerHTML = `
        <div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #000; max-width: 100%; padding: 40px;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
            <h1 style="margin: 0; font-size: 18pt; font-weight: bold;">${contract.name}</h1>
            <p style="margin: 10px 0 0 0; color: #666; font-size: 10pt;">
              ${contract.isGenerated ? 'KI-Generierter Vertrag' : 'Hochgeladener Vertrag'} • 
              Erstellt am ${new Date(contract.createdAt || '').toLocaleDateString('de-DE')}
            </p>
          </div>
          <div style="white-space: pre-wrap; text-align: justify;">
            ${contract.content?.replace(/\n/g, '<br>')}
          </div>
          ${contract.signature ? `
            <div style="margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px;">
              <p style="margin-bottom: 10px; font-weight: bold;">Digitale Unterschrift:</p>
              <img src="${contract.signature}" style="max-width: 200px; border: 1px solid #ddd; border-radius: 4px;" />
              <p style="margin-top: 10px; font-size: 10pt; color: #666;">
                Unterschrieben am ${new Date().toLocaleString('de-DE')}
              </p>
            </div>
          ` : ''}
        </div>
      `;

      const opt = {
        margin: [15, 15, 15, 15],
        filename: `${contract.name}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          width: 794,
          height: 1123
        },
        jsPDF: { 
          unit: 'pt', 
          format: 'a4', 
          orientation: 'portrait'
        },
      };

      await html2pdf().from(pdfContainer).set(opt).save();
      
    } catch (error) {
      console.error('PDF-Export fehlgeschlagen:', error);
      alert('❌ Fehler beim PDF-Export');
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
              body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; margin: 40px; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .title { font-size: 18pt; font-weight: bold; margin: 0; }
              .subtitle { color: #666; font-size: 10pt; margin: 10px 0 0 0; }
              .content { white-space: pre-wrap; text-align: justify; }
              .signature { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; }
              .signature img { max-width: 200px; border: 1px solid #ddd; border-radius: 4px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 class="title">${contract.name}</h1>
              <p class="subtitle">
                ${contract.isGenerated ? 'KI-Generierter Vertrag' : 'Hochgeladener Vertrag'} • 
                Erstellt am ${new Date(contract.createdAt || '').toLocaleDateString('de-DE')}
              </p>
            </div>
            <div class="content">${contract.content?.replace(/\n/g, '<br>')}</div>
            ${contract.signature ? `
              <div class="signature">
                <p><strong>Digitale Unterschrift:</strong></p>
                <img src="${contract.signature}" alt="Unterschrift" />
                <p style="font-size: 10pt; color: #666; margin-top: 10px;">
                  Unterschrieben am ${new Date().toLocaleString('de-DE')}
                </p>
              </div>
            ` : ''}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div style={{ marginTop: '32px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: contract.isGenerated ? 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <FileText size={20} />
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600' }}>
              {contract.isGenerated ? '✨ KI-Generierter Vertragsinhalt' : '📄 Vertragsinhalt'}
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
              Vollständige Ansicht und Export-Optionen
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleCopyContent}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: copied ? '#10b981' : '#f8fafc',
              border: `1px solid ${copied ? '#10b981' : '#e2e8f0'}`,
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: copied ? 'white' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
            {copied ? 'Kopiert!' : 'Kopieren'}
          </button>

          <button
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Printer size={16} />
            Drucken
          </button>

          <button
            onClick={handleDownloadPDF}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Download size={16} />
            PDF Export
          </button>

          <button
            onClick={() => setShowFullPreview(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Maximize2 size={16} />
            Vollansicht
          </button>
        </div>
      </div>

      {/* Content Preview */}
      <div style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div 
          ref={contentRef}
          className="contract-content-scroll"
          style={{
            padding: '24px',
            maxHeight: '400px',
            overflowY: 'auto',
            fontFamily: '"Times New Roman", serif',
            fontSize: '14px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            color: '#1e293b'
          }}
        >
          {contract.content}
        </div>
        
        {contract.signature && (
          <div style={{
            borderTop: '1px solid #f1f5f9',
            padding: '20px 24px',
            background: '#f8fafc'
          }}>
            <p style={{ margin: '0 0 12px 0', fontWeight: '600', fontSize: '14px' }}>
              Digitale Unterschrift:
            </p>
            <img 
              src={contract.signature} 
              alt="Unterschrift" 
              style={{ 
                maxWidth: '200px', 
                border: '1px solid #e2e8f0', 
                borderRadius: '6px',
                background: 'white'
              }} 
            />
            <p style={{ 
              margin: '8px 0 0 0', 
              fontSize: '12px', 
              color: '#64748b' 
            }}>
              Unterschrieben am {new Date().toLocaleString('de-DE')}
            </p>
          </div>
        )}

        <div style={{
          borderTop: '1px solid #f1f5f9',
          padding: '16px 24px',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '12px',
          color: '#64748b'
        }}>
          <Eye size={16} />
          Zum Lesen scrollen • Verwenden Sie die Buttons oben für Export und Vollansicht
        </div>
      </div>

      {/* Full Preview Modal */}
      <AnimatePresence>
        {showFullPreview && (
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
              background: 'rgba(0, 0, 0, 0.8)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setShowFullPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                background: 'white',
                borderRadius: '12px',
                width: '90%',
                maxWidth: '800px',
                maxHeight: '90%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                  {contract.name}
                </h3>
                <button
                  onClick={() => setShowFullPreview(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#64748b'
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
                  padding: '24px',
                  overflowY: 'auto',
                  fontFamily: '"Times New Roman", serif',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  color: '#1e293b'
                }}
              >
                {contract.content}
                
                {contract.signature && (
                  <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 12px 0', fontWeight: '600' }}>
                      Digitale Unterschrift:
                    </p>
                    <img 
                      src={contract.signature} 
                      alt="Unterschrift" 
                      style={{ 
                        maxWidth: '200px', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '6px' 
                      }} 
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContractContentViewer;