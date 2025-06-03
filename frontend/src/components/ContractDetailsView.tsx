import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, FileText, Calendar, Clock, AlertCircle, CheckCircle, 
  Info, Eye, Download, Share2, Edit, Trash2, Star,
  BarChart3, Shield, Lightbulb, TrendingUp,
  Copy, ExternalLink
} from "lucide-react";
import styles from "../styles/ContractDetailsView.module.css";
import ReminderToggle from "./ReminderToggle";
import { getContractFileUrl } from "../utils/api"; // ✅ NEU: Import der File-URL-Funktion

interface Contract {
  _id: string;
  name: string;
  kuendigung: string;
  laufzeit?: string;
  expiryDate?: string;
  status: string;
  reminder?: boolean;
  createdAt: string;
  content?: string;
  isGenerated?: boolean;
  // ✅ Erweiterte Felder für Analyse-Daten
  fullText?: string;
  extractedText?: string; // ✅ NEU: Extrahierter Text als Fallback
  fileUrl?: string; // ✅ NEU: URL zur Original-Vertragsdatei
  filePath?: string; // ✅ NEU: Pfad zur Original-Vertragsdatei (Fallback)
  filename?: string; // ✅ NEU: Original-Dateiname für Backend-URL
  originalname?: string; // ✅ NEU: Fallback für Dateiname
  analysis?: {
    summary?: string;
    legalAssessment?: string;
    suggestions?: string;
    comparison?: string;
    contractScore?: number;
    analysisId?: string;
    lastAnalyzed?: string;
  };
}

interface ContractDetailsViewProps {
  contract: Contract;
  onClose: () => void;
  show: boolean;
  onEdit?: (contractId: string) => void;
  onDelete?: (contractId: string, contractName: string) => void;
}

export default function ContractDetailsView({ 
  contract, 
  onClose, 
  show, 
  onEdit, 
  onDelete 
}: ContractDetailsViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'analysis'>('overview');

  const formatDate = (dateString: string): string => {
    if (!dateString) return "Unbekannt";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateString;
    }
  };

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "aktiv" || statusLower === "gültig") {
      return <CheckCircle size={16} className={styles.statusIconActive} />;
    } else if (statusLower === "läuft ab" || statusLower === "bald fällig") {
      return <AlertCircle size={16} className={styles.statusIconWarning} />;
    } else {
      return <Info size={16} className={styles.statusIconNeutral} />;
    }
  };

  const getStatusColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower === "aktiv" || statusLower === "gültig") {
      return styles.statusActive;
    } else if (statusLower === "läuft ab" || statusLower === "bald fällig") {
      return styles.statusWarning;
    } else if (statusLower === "gekündigt" || statusLower === "beendet") {
      return styles.statusCancelled;
    } else {
      return styles.statusNeutral;
    }
  };

  // ✅ NEU: Score-Farbe bestimmen
  const getScoreColor = (score: number): string => {
    if (score >= 80) return "#34c759";
    if (score >= 60) return "#ff9500";
    if (score >= 40) return "#ff6b35";
    return "#ff3b30";
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return "Ausgezeichnet";
    if (score >= 60) return "Gut";
    if (score >= 40) return "Akzeptabel";
    return "Kritisch";
  };

  // ✅ NEU: Text in Stichpunkte aufteilen
  const formatTextToPoints = (text: string): string[] => {
    if (!text) return ['Keine Details verfügbar'];
    
    const sentences = text
      .split(/[.!?]+|[-•]\s*/)
      .map(s => s.trim())
      .filter(s => s.length > 15 && s.length < 200)
      .slice(0, 4);
    
    return sentences.length > 0 ? sentences : [text.substring(0, 180) + '...'];
  };

  const handleEdit = () => {
    if (onEdit) onEdit(contract._id);
  };

  const handleDelete = () => {
    if (onDelete) onDelete(contract._id, contract.name);
  };

  // ✅ NEU: Content Download (falls verfügbar)
  const handleDownloadContent = () => {
    const content = contract.fullText || contract.content || '';
    if (!content) return;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${contract.name.replace(/\.[^/.]+$/, "")}_content.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // ✅ NEU: Analyse-Daten kopieren
  const handleCopyAnalysis = () => {
    const analysis = contract.analysis;
    if (!analysis) return;
    
    const analysisText = `
Vertragsanalyse: ${contract.name}
Score: ${analysis.contractScore || 'N/A'}/100

Zusammenfassung:
${analysis.summary || 'Nicht verfügbar'}

Rechtssicherheit:
${analysis.legalAssessment || 'Nicht verfügbar'}

Optimierungsvorschläge:
${analysis.suggestions || 'Nicht verfügbar'}

Marktvergleich:
${analysis.comparison || 'Nicht verfügbar'}
    `.trim();
    
    navigator.clipboard.writeText(analysisText);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className={styles.drawer}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerTop}>
              <div className={styles.contractInfo}>
                <div className={styles.contractIcon}>
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className={styles.contractName}>{contract.name}</h2>
                  <div className={styles.contractMeta}>
                    <span className={styles.uploadDate}>
                      Hochgeladen am {formatDate(contract.createdAt)}
                    </span>
                    {contract.isGenerated && (
                      <span className={styles.generatedBadge}>
                        <Star size={12} />
                        KI-Generiert
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.headerActions}>
                <button 
                  className={styles.actionBtn}
                  onClick={() => {/* Share functionality */}}
                  title="Teilen"
                >
                  <Share2 size={18} />
                </button>
                <button 
                  className={styles.actionBtn}
                  onClick={handleEdit}
                  title="Bearbeiten"
                >
                  <Edit size={18} />
                </button>
                <button 
                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  onClick={handleDelete}
                  title="Löschen"
                >
                  <Trash2 size={18} />
                </button>
                <button 
                  className={styles.closeBtn}
                  onClick={onClose}
                  title="Schließen"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Status Bar */}
            <div className={styles.statusBar}>
              <div className={`${styles.statusBadge} ${getStatusColor(contract.status)}`}>
                {getStatusIcon(contract.status)}
                <span>{contract.status}</span>
              </div>
              
              <div className={styles.quickStats}>
                {contract.kuendigung && (
                  <div className={styles.quickStat}>
                    <Clock size={14} />
                    <span>Kündigung: {contract.kuendigung}</span>
                  </div>
                )}
                {contract.expiryDate && (
                  <div className={styles.quickStat}>
                    <Calendar size={14} />
                    <span>Läuft ab: {formatDate(contract.expiryDate)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tab Navigation */}
            <div className={styles.tabNav}>
              <button 
                className={`${styles.tab} ${activeTab === 'overview' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <Info size={16} />
                <span>Übersicht</span>
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'content' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('content')}
              >
                <Eye size={16} />
                <span>Inhalt</span>
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'analysis' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('analysis')}
              >
                <BarChart3 size={16} />
                <span>Analyse</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {activeTab === 'overview' && (
              <motion.div 
                className={styles.overviewTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <FileText size={18} />
                    Vertragsdetails
                  </h3>
                  <div className={styles.detailGrid}>
                    <div className={styles.detailItem}>
                      <label>Vertragsname</label>
                      <span>{contract.name || "Unbekannt"}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <label>Status</label>
                      <div className={`${styles.statusBadge} ${getStatusColor(contract.status)}`}>
                        {getStatusIcon(contract.status)}
                        <span>{contract.status}</span>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <label>Kündigungsfrist</label>
                      <span>{contract.kuendigung || "Nicht angegeben"}</span>
                    </div>
                    {contract.laufzeit && (
                      <div className={styles.detailItem}>
                        <label>Laufzeit</label>
                        <span>{contract.laufzeit}</span>
                      </div>
                    )}
                    {contract.expiryDate && (
                      <div className={styles.detailItem}>
                        <label>Ablaufdatum</label>
                        <span>{formatDate(contract.expiryDate)}</span>
                      </div>
                    )}
                    <div className={styles.detailItem}>
                      <label>Hochgeladen am</label>
                      <span>{formatDate(contract.createdAt)}</span>
                    </div>
                  </div>
                  
                  {/* ✅ VERBESSERT: Button für Original-Vertragsdatei mit korrekter URL */}
                  {(() => {
                    const fileUrl = getContractFileUrl(contract); // ✅ Verwendet importierte Funktion
                    
                    if (fileUrl) {
                      return (
                        <div className={styles.viewContractSection}>
                          <a 
                            href={fileUrl}
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={styles.viewContractButton}
                            onClick={() => {
                              // Debug-Ausgabe für Troubleshooting
                              console.log('🔍 Opening file:', {
                                contractName: contract.name,
                                fileUrl: fileUrl,
                                filename: contract.filename,
                                originalname: contract.originalname,
                                filePath: contract.filePath,
                                usingFunction: 'getContractFileUrl'
                              });
                            }}
                          >
                            📄 Vertrag anzeigen
                          </a>
                        </div>
                      );
                    } else {
                      return (
                        <div className={styles.viewContractSection}>
                          <button 
                            className={styles.viewContractButton}
                            style={{ opacity: 0.5, cursor: 'not-allowed' }}
                            disabled
                            title="Keine Datei verfügbar"
                          >
                            📄 Datei nicht verfügbar
                          </button>
                        </div>
                      );
                    }
                  })()}
                </div>

                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <AlertCircle size={18} />
                    Einstellungen
                  </h3>
                  <div className={styles.settingsGrid}>
                    <ReminderToggle
                      contractId={contract._id}
                      initialValue={contract.reminder || false}
                    />
                  </div>
                </div>

                {contract.isGenerated && (
                  <div className={styles.section}>
                    <div className={styles.aiNotice}>
                      <Star size={20} />
                      <div>
                        <h4>KI-Generierter Vertrag</h4>
                        <p>Dieser Vertrag wurde von unserer KI erstellt. Bitte prüfe alle Details vor der Verwendung.</p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ✅ ERWEITERT: Content Tab - Mit Debug & mehreren Fallbacks */}
            {activeTab === 'content' && (
              <motion.div 
                className={styles.contentTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* ✅ DEBUG: Console-Ausgabe für Troubleshooting */}
                {(() => {
                  console.log('🔍 Content Tab Debug:', {
                    contractName: contract.name,
                    hasFullText: !!contract.fullText,
                    hasContent: !!contract.content,
                    fullTextLength: contract.fullText ? contract.fullText.length : 0,
                    contentLength: contract.content ? contract.content.length : 0,
                    contractKeys: Object.keys(contract)
                  });
                  return null;
                })()}
                
                {/* ✅ ERWEITERTE Fallback-Prüfung für verschiedene Text-Felder */}
                {(() => {
                  const textContent = contract.fullText || contract.content || contract.extractedText || '';
                  
                  if (textContent && textContent.trim().length > 0) {
                    return (
                      <div className={styles.contentViewer}>
                        <div className={styles.contentHeader}>
                          <h3>Vertragsinhalt</h3>
                          <div className={styles.contentSourceInfo}>
                            <span className={styles.sourceLabel}>
                              Quelle: {contract.fullText ? 'Volltext-Analyse' : 
                                      contract.content ? 'Contract Content' : 
                                      contract.extractedText ? 'Extrahierter Text' : 'Unbekannt'}
                            </span>
                          </div>
                          <button 
                            className={styles.downloadBtn}
                            onClick={handleDownloadContent}
                          >
                            <Download size={16} />
                            <span>Als TXT herunterladen</span>
                          </button>
                        </div>
                        
                        <div className={styles.contentText}>
                          {textContent}
                        </div>
                        
                        <div className={styles.contentStats}>
                          <div className={styles.contentStat}>
                            <span className={styles.statLabel}>Zeichen:</span>
                            <span className={styles.statValue}>
                              {textContent.length.toLocaleString()}
                            </span>
                          </div>
                          <div className={styles.contentStat}>
                            <span className={styles.statLabel}>Wörter:</span>
                            <span className={styles.statValue}>
                              {textContent.split(/\s+/).filter((w: string) => w.length > 0).length.toLocaleString()}
                            </span>
                          </div>
                          <div className={styles.contentStat}>
                            <span className={styles.statLabel}>Absätze:</span>
                            <span className={styles.statValue}>
                              {textContent.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0).length.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className={styles.noContent}>
                        <FileText size={48} />
                        <h3>Kein Textinhalt verfügbar</h3>
                        <p>Der Vertragstext konnte nicht extrahiert werden oder ist nicht verfügbar. Möglicherweise handelt es sich um eine bildbasierte PDF oder ein anderes Format.</p>
                        
                        {/* ✅ DEBUG: Zusätzliche Info für Troubleshooting */}
                        <div className={styles.debugInfo}>
                          <details>
                            <summary>Debug-Informationen</summary>
                            <pre style={{ fontSize: '0.8rem', textAlign: 'left', background: '#f5f5f5', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
                              {JSON.stringify({
                                contractId: contract._id,
                                contractName: contract.name,
                                hasFullText: !!contract.fullText,
                                hasContent: !!contract.content,
                                hasExtractedText: !!contract.extractedText,
                                hasAnalysis: !!contract.analysis,
                                availableKeys: Object.keys(contract).filter(key => key.includes('text') || key.includes('content') || key === 'analysis')
                              }, null, 2)}
                            </pre>
                          </details>
                        </div>
                        
                        <div className={styles.noContentActions}>
                          <button 
                            className={styles.retryBtn}
                            onClick={() => {
                              console.log('🔄 Retry text extraction for contract:', {
                                id: contract._id,
                                name: contract.name,
                                availableFields: Object.keys(contract)
                              });
                              alert('Text-Extraktion wird erneut versucht...');
                            }}
                          >
                            <ExternalLink size={16} />
                            <span>Textextraktion wiederholen</span>
                          </button>
                        </div>
                      </div>
                    );
                  }
                })()}
              </motion.div>
            )}

            {/* ✅ NEU: Analysis Tab - Vollständig funktional */}
            {activeTab === 'analysis' && (
              <motion.div 
                className={styles.analysisTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {contract.analysis ? (
                  <div className={styles.analysisViewer}>
                    <div className={styles.analysisHeader}>
                      <h3>KI-Vertragsanalyse</h3>
                      <div className={styles.analysisActions}>
                        <button 
                          className={styles.copyBtn}
                          onClick={handleCopyAnalysis}
                          title="Analyse kopieren"
                        >
                          <Copy size={16} />
                          <span>Kopieren</span>
                        </button>
                      </div>
                    </div>

                    {/* Score Display */}
                    {contract.analysis.contractScore && (
                      <div className={styles.scoreSection}>
                        <div className={styles.scoreDisplay}>
                          <div 
                            className={styles.scoreCircle}
                            style={{ '--score-color': getScoreColor(contract.analysis.contractScore) } as React.CSSProperties}
                          >
                            <span className={styles.scoreNumber}>{contract.analysis.contractScore}</span>
                            <span className={styles.scoreMax}>/100</span>
                          </div>
                          <div className={styles.scoreInfo}>
                            <h4 style={{ color: getScoreColor(contract.analysis.contractScore) }}>
                              {getScoreLabel(contract.analysis.contractScore)}
                            </h4>
                            <p>Contract Score</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Analysis Sections */}
                    <div className={styles.analysisContent}>
                      {contract.analysis.summary && (
                        <div className={styles.analysisSection}>
                          <div className={styles.analysisSectionHeader}>
                            <div className={styles.sectionIcon}>
                              <FileText size={20} />
                            </div>
                            <h4>Zusammenfassung</h4>
                          </div>
                          <div className={styles.analysisSectionContent}>
                            <ul className={styles.analysisList}>
                              {formatTextToPoints(contract.analysis.summary).map((point, index) => (
                                <li key={index} className={styles.analysisPoint}>
                                  <div className={styles.pointBullet}></div>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {contract.analysis.legalAssessment && (
                        <div className={styles.analysisSection}>
                          <div className={styles.analysisSectionHeader}>
                            <div className={styles.sectionIcon} style={{ background: 'rgba(52, 199, 89, 0.1)' }}>
                              <Shield size={20} style={{ color: '#34c759' }} />
                            </div>
                            <h4>Rechtssicherheit</h4>
                          </div>
                          <div className={styles.analysisSectionContent}>
                            <ul className={styles.analysisList}>
                              {formatTextToPoints(contract.analysis.legalAssessment).map((point, index) => (
                                <li key={index} className={styles.analysisPoint}>
                                  <div className={styles.pointBullet} style={{ background: '#34c759' }}></div>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {contract.analysis.suggestions && (
                        <div className={styles.analysisSection}>
                          <div className={styles.analysisSectionHeader}>
                            <div className={styles.sectionIcon} style={{ background: 'rgba(255, 149, 0, 0.1)' }}>
                              <Lightbulb size={20} style={{ color: '#ff9500' }} />
                            </div>
                            <h4>Optimierungsvorschläge</h4>
                          </div>
                          <div className={styles.analysisSectionContent}>
                            <ul className={styles.analysisList}>
                              {formatTextToPoints(contract.analysis.suggestions).map((point, index) => (
                                <li key={index} className={styles.analysisPoint}>
                                  <div className={styles.pointBullet} style={{ background: '#ff9500' }}></div>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {contract.analysis.comparison && (
                        <div className={styles.analysisSection}>
                          <div className={styles.analysisSectionHeader}>
                            <div className={styles.sectionIcon} style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                              <TrendingUp size={20} style={{ color: '#8b5cf6' }} />
                            </div>
                            <h4>Marktvergleich</h4>
                          </div>
                          <div className={styles.analysisSectionContent}>
                            <ul className={styles.analysisList}>
                              {formatTextToPoints(contract.analysis.comparison).map((point, index) => (
                                <li key={index} className={styles.analysisPoint}>
                                  <div className={styles.pointBullet} style={{ background: '#8b5cf6' }}></div>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Analysis Meta */}
                    {contract.analysis.lastAnalyzed && (
                      <div className={styles.analysisMeta}>
                        <p>
                          <Clock size={14} />
                          Letzte Analyse: {formatDate(contract.analysis.lastAnalyzed)}
                        </p>
                        {contract.analysis.analysisId && (
                          <p>
                            <FileText size={14} />
                            ID: {contract.analysis.analysisId}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.noAnalysis}>
                    <BarChart3 size={48} />
                    <h3>Keine Analyse verfügbar</h3>
                    <p>Für diesen Vertrag wurde noch keine KI-Analyse durchgeführt oder die Analyse-Daten sind nicht verfügbar.</p>
                    
                    <div className={styles.noAnalysisActions}>
                      <button 
                        className={styles.analyzeBtn}
                        onClick={() => {
                          // Hier könnte eine Funktion zur Analyse aufgerufen werden
                          console.log('Start analysis for:', contract._id);
                        }}
                      >
                        <BarChart3 size={16} />
                        <span>Jetzt analysieren</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}