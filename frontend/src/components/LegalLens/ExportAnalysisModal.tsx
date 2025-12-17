// 📄 ExportAnalysisModal.tsx - Modal für den PDF-Export der Legal Lens Analyse
import { useState } from 'react';
import { X, Download, FileText, Check, Loader2 } from 'lucide-react';
import { exportAnalysisReport, downloadPdfBlob } from '../../services/legalLensAPI';
import { REPORT_DESIGNS, REPORT_SECTIONS, ReportDesign, ReportSection } from '../../types/legalLens';
import styles from '../../styles/ExportAnalysisModal.module.css';

interface ExportAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  contractName: string;
}

export default function ExportAnalysisModal({
  isOpen,
  onClose,
  contractId,
  contractName
}: ExportAnalysisModalProps) {
  const [selectedDesign, setSelectedDesign] = useState<ReportDesign>('executive');
  const [selectedSections, setSelectedSections] = useState<ReportSection[]>(
    REPORT_SECTIONS.filter(s => s.default).map(s => s.id)
  );
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleSection = (sectionId: ReportSection) => {
    setSelectedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleExport = async () => {
    if (selectedSections.length === 0) {
      setError('Bitte wähle mindestens eine Sektion aus.');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const blob = await exportAnalysisReport(contractId, selectedDesign, selectedSections);

      // Dateiname generieren
      const sanitizedName = contractName.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_');
      const date = new Date().toISOString().split('T')[0];
      const filename = `Vertragsanalyse_${sanitizedName}_${date}.pdf`;

      downloadPdfBlob(blob, filename);

      // Modal schließen nach erfolgreichem Export
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export fehlgeschlagen');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <FileText size={20} />
            <h2>Analyse exportieren</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Design Auswahl */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Design-Variante</h3>
            <div className={styles.designGrid}>
              {REPORT_DESIGNS.map(design => (
                <button
                  key={design.id}
                  className={`${styles.designCard} ${selectedDesign === design.id ? styles.selected : ''}`}
                  onClick={() => setSelectedDesign(design.id)}
                >
                  <div
                    className={styles.designPreview}
                    style={{
                      borderColor: design.accentColor,
                      background: `linear-gradient(135deg, ${design.primaryColor} 0%, ${design.accentColor} 100%)`
                    }}
                  >
                    <div className={styles.previewLines}>
                      <div className={styles.previewLine} style={{ width: '80%' }} />
                      <div className={styles.previewLine} style={{ width: '60%' }} />
                      <div className={styles.previewLine} style={{ width: '70%' }} />
                    </div>
                  </div>
                  <span className={styles.designName}>{design.name}</span>
                  {selectedDesign === design.id && (
                    <div className={styles.checkmark}>
                      <Check size={14} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Sektionen Auswahl */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Inhalt auswählen</h3>
            <div className={styles.sectionsGrid}>
              {REPORT_SECTIONS.map(section => (
                <label
                  key={section.id}
                  className={`${styles.sectionItem} ${selectedSections.includes(section.id) ? styles.checked : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSections.includes(section.id)}
                    onChange={() => toggleSection(section.id)}
                    className={styles.checkbox}
                  />
                  <div className={styles.sectionInfo}>
                    <span className={styles.sectionName}>{section.name}</span>
                    <span className={styles.sectionDescription}>{section.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onClose} disabled={isExporting}>
            Abbrechen
          </button>
          <button
            className={styles.exportButton}
            onClick={handleExport}
            disabled={isExporting || selectedSections.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 size={16} className={styles.spinner} />
                Wird exportiert...
              </>
            ) : (
              <>
                <Download size={16} />
                PDF exportieren
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
