import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, XCircle, Minus, Info } from 'lucide-react';
import {
  ContractStructure, StructuredClause,
  ClauseArea, CLAUSE_AREA_LABELS,
  EnhancedDifference, DocumentTypeInfo,
} from '../../../types/compare';
import styles from '../../../styles/Compare.module.css';

/**
 * Filtert OCR-Rauschen aus keyValues bei gescannten PDFs
 * (Dokument-Metadaten, Seitenfuß-IDs, technische Timestamps).
 * Wirkt nur auf die Anzeige — Rohdaten/Analyse bleiben unverändert.
 */
const NOISE_KEY_PATTERNS = [
  /^TD_[A-Z0-9_]+/i,              // "TD_K9001n_RIFE_SCB_Mob1 von 6Stand"
  /^Beratungsprotokoll_/i,         // "Beratungsprotokoll_Mob_202202041 von 4Stand"
  /\d+ von \d+\s*Stand$/i,         // Seiten-Metadaten Endung
];

/**
 * Entfernt die Section-Nummer aus dem Titel, wenn GPT sie dort dupliziert hat
 * (z.B. section="1." + title="1. Name und Kontaktangaben" → "Name und Kontaktangaben").
 * Sicherheits-Guard: Strippt nur, wenn die Section von einem Wort-Grenzzeichen gefolgt wird.
 * Verhindert, dass z.B. section="1" aus title="123 Something" ein "23 Something" macht.
 */
function stripSectionPrefix(section: string, title: string): string {
  const s = (section || '').trim();
  const t = title || '';
  if (!s || !t.startsWith(s)) return t;
  const rest = t.slice(s.length);
  if (rest === '' || /^[\s\-–—:.)]/.test(rest)) return rest.trimStart();
  return t;
}

function isNoiseKeyValue(key: string, value: string): boolean {
  if (NOISE_KEY_PATTERNS.some(p => p.test(key))) return true;
  // "DAC: 911681706366" (interne Doc-ID, 10+ stellige Zahl)
  if (/^DAC$/i.test(key) && /^\d{10,}$/.test(value.trim())) return true;
  // "Posteingang: 10022025" (8-stelliger Datum-Code)
  if (/^Posteingang$/i.test(key) && /^\d{8}$/.test(value.trim())) return true;
  // Email-Adresse als Key (z.B. "kontakt@xyz.de") — Formularfeld, nie ein legitimer Label-Key
  if (/@/.test(key)) return true;
  // Überlange Keys (>80 Zeichen) — echte Labels sind kurze Begriffe, >80 ist OCR-Artefakt
  if (key.length > 80) return true;
  // Nummerierungs-Keys (z.B. "1. 1. Art des Darlehens") — Paragraphen-Header, kein Label
  if (/^\d+\.\s*\d+\./.test(key.trim())) return true;
  return false;
}

interface ContractMapTabProps {
  contract1: ContractStructure;
  contract2: ContractStructure;
  differences: EnhancedDifference[];
  documentType?: DocumentTypeInfo | null;
  extractionWarning?: boolean;
}

// Preferred display order for clause areas
const AREA_ORDER: ClauseArea[] = [
  'parties', 'subject', 'duration', 'payment', 'termination',
  'liability', 'warranty', 'confidentiality', 'ip_rights',
  'data_protection', 'non_compete', 'force_majeure', 'jurisdiction', 'other',
];

type MatchStatus = 'same' | 'different' | 'only1' | 'only2';

interface AreaRow {
  area: ClauseArea;
  label: string;
  clauses1: StructuredClause[];
  clauses2: StructuredClause[];
  status: MatchStatus;
  hasDifference: boolean;
  severity?: string;
}

function buildAreaRows(
  contract1: ContractStructure,
  contract2: ContractStructure,
  differences: EnhancedDifference[],
): AreaRow[] {
  // Group clauses by area
  const byArea1 = new Map<string, StructuredClause[]>();
  const byArea2 = new Map<string, StructuredClause[]>();

  for (const c of contract1.clauses || []) {
    const list = byArea1.get(c.area) || [];
    list.push(c);
    byArea1.set(c.area, list);
  }
  for (const c of contract2.clauses || []) {
    const list = byArea2.get(c.area) || [];
    list.push(c);
    byArea2.set(c.area, list);
  }

  // All unique areas
  const allAreas = new Set<string>([...byArea1.keys(), ...byArea2.keys()]);

  // Build rows in preferred order
  const rows: AreaRow[] = [];
  const diffAreas = new Set(differences.map(d => d.clauseArea));
  const diffSeverity = new Map<string, string>();
  for (const d of differences) {
    const existing = diffSeverity.get(d.clauseArea);
    if (!existing || severityRank(d.severity) > severityRank(existing)) {
      diffSeverity.set(d.clauseArea, d.severity);
    }
  }

  for (const area of AREA_ORDER) {
    if (!allAreas.has(area)) continue;
    allAreas.delete(area);

    const c1 = byArea1.get(area) || [];
    const c2 = byArea2.get(area) || [];
    const hasDiff = diffAreas.has(area);

    let status: MatchStatus;
    if (c1.length === 0) status = 'only2';
    else if (c2.length === 0) status = 'only1';
    else if (hasDiff) status = 'different';
    else status = 'same';

    rows.push({
      area: area as ClauseArea,
      label: CLAUSE_AREA_LABELS[area as ClauseArea] || area,
      clauses1: c1,
      clauses2: c2,
      status,
      hasDifference: hasDiff,
      severity: diffSeverity.get(area),
    });
  }

  // Any remaining areas not in AREA_ORDER
  for (const area of allAreas) {
    const c1 = byArea1.get(area) || [];
    const c2 = byArea2.get(area) || [];
    const hasDiff = diffAreas.has(area as ClauseArea);

    rows.push({
      area: area as ClauseArea,
      label: CLAUSE_AREA_LABELS[area as ClauseArea] || area,
      clauses1: c1,
      clauses2: c2,
      status: c1.length === 0 ? 'only2' : c2.length === 0 ? 'only1' : hasDiff ? 'different' : 'same',
      hasDifference: hasDiff,
      severity: diffSeverity.get(area),
    });
  }

  return rows;
}

function severityRank(s?: string): number {
  switch (s) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

export default function ContractMapTab({ contract1, contract2, differences, documentType, extractionWarning }: ContractMapTabProps) {
  const [expandedArea, setExpandedArea] = useState<string | null>(null);
  const allExpanded = expandedArea === '__all__';
  const rows = buildAreaRows(contract1, contract2, differences);
  const docName = documentType?.labels?.documentName || 'Vertrag';
  const partiesLabel = documentType?.labels?.partiesLabel || null;

  // Heuristik-Fallback für alte History-Einträge ohne extractionWarning-Flag:
  // Wenn unser Filter Noise erkennt, war das Doc vermutlich gescannt / ein Formular-PDF.
  const hasFilteredNoise =
    extractionWarning === undefined &&
    [...(contract1.clauses || []), ...(contract2.clauses || [])].some(
      (c) => Object.entries(c.keyValues || {}).some(([k, v]) => isNoiseKeyValue(k, String(v)))
    );
  const showExtractionHint = extractionWarning === true || hasFilteredNoise;

  // Stats
  const stats = {
    same: rows.filter(r => r.status === 'same').length,
    different: rows.filter(r => r.status === 'different').length,
    missing: rows.filter(r => r.status === 'only1' || r.status === 'only2').length,
  };

  return (
    <div className={styles.contractMapTab}>
      {/* Legend */}
      <div className={styles.mapLegend}>
        <span className={styles.mapLegendItem}>
          <span className={`${styles.mapDot} ${styles.mapDotSame}`} /> Gleich ({stats.same})
        </span>
        <span className={styles.mapLegendItem}>
          <span className={`${styles.mapDot} ${styles.mapDotDiff}`} /> Unterschiedlich ({stats.different})
        </span>
        <span className={styles.mapLegendItem}>
          <span className={`${styles.mapDot} ${styles.mapDotMissing}`} /> Fehlt ({stats.missing})
        </span>
      </div>

      {/* Hinweis bei gescannten PDFs / Formular-PDFs: Werteextraktion kann Formularfelder als zusätzliche Angaben enthalten */}
      {showExtractionHint && (
        <div className={styles.mapExtractionHint}>
          <Info size={16} />
          <span>
            <strong>Hinweis:</strong> Bei gescannten PDFs oder Formular-PDFs kann die automatische Werteextraktion
            vereinzelt Formularfelder oder OCR-Artefakte als zusätzliche Angaben enthalten.
            Die <strong>Vertragsanalyse, Unterschiede und Risiken sind davon nicht betroffen</strong>.
          </span>
        </div>
      )}

      <div className={styles.expandAllBar}>
        <button
          className={`${styles.viewToggle} ${allExpanded ? styles.viewToggleActive : ''}`}
          onClick={() => setExpandedArea(allExpanded ? null : '__all__')}
        >
          {allExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span>{allExpanded ? 'Alle zuklappen' : 'Alle aufklappen'}</span>
        </button>
      </div>

      {/* Header */}
      <div className={styles.mapHeader}>
        <div className={styles.mapHeaderArea}>Klauselbereich</div>
        <div className={styles.mapHeaderContract}>{docName} 1</div>
        <div className={styles.mapHeaderContract}>{docName} 2</div>
      </div>

      {/* Rows */}
      <div className={styles.mapRows}>
        {rows.map((row) => {
          const isExpanded = expandedArea === row.area || allExpanded;
          return (
            <div key={row.area} className={styles.mapRowWrapper}>
              <div
                className={`${styles.mapRow} ${styles[`mapRow_${row.status}`]}`}
                onClick={() => setExpandedArea(isExpanded ? null : row.area)}
              >
                {/* Area label */}
                <div className={styles.mapRowArea}>
                  <StatusIcon status={row.status} />
                  <span className={styles.mapRowLabel}>{row.area === 'parties' && partiesLabel ? partiesLabel : row.label}</span>
                  {row.severity && (
                    <span className={`${styles.mapSeverity} ${styles[`mapSev_${row.severity}`]}`}>
                      {row.severity}
                    </span>
                  )}
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>

                {/* Contract 1 summary */}
                <div className={styles.mapRowCell}>
                  {row.clauses1.length > 0 ? (
                    <ClauseSummary clauses={row.clauses1} />
                  ) : (
                    <span className={styles.mapMissing}>Keine Regelung</span>
                  )}
                </div>

                {/* Contract 2 summary */}
                <div className={styles.mapRowCell}>
                  {row.clauses2.length > 0 ? (
                    <ClauseSummary clauses={row.clauses2} />
                  ) : (
                    <span className={styles.mapMissing}>Keine Regelung</span>
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className={styles.mapDetail}>
                  <div className={styles.mapDetailGrid}>
                    <ClauseDetail clauses={row.clauses1} label={`${docName} 1`} />
                    <ClauseDetail clauses={row.clauses2} label={`${docName} 2`} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: MatchStatus }) {
  switch (status) {
    case 'same':
      return <CheckCircle size={14} className={styles.mapIconSame} />;
    case 'different':
      return <AlertTriangle size={14} className={styles.mapIconDiff} />;
    case 'only1':
    case 'only2':
      return <XCircle size={14} className={styles.mapIconMissing} />;
    default:
      return <Minus size={14} />;
  }
}

function ClauseSummary({ clauses }: { clauses: StructuredClause[] }) {
  if (clauses.length === 1) {
    return <span className={styles.mapCellText}>{clauses[0].summary || clauses[0].title}</span>;
  }
  return (
    <span className={styles.mapCellText}>
      {clauses[0].summary || clauses[0].title}
      {clauses.length > 1 && (
        <span className={styles.mapMoreBadge}>+{clauses.length - 1}</span>
      )}
    </span>
  );
}

function ClauseDetail({ clauses, label }: { clauses: StructuredClause[]; label: string }) {
  if (clauses.length === 0) {
    return (
      <div className={styles.mapDetailCol}>
        <h5>{label}</h5>
        <p className={styles.mapMissing}>Keine Regelung vorhanden</p>
      </div>
    );
  }

  return (
    <div className={styles.mapDetailCol}>
      <h5>{label}</h5>
      {clauses.map((clause, i) => {
        const filteredKVs = Object.entries(clause.keyValues || {}).filter(
          ([key, value]) => !isNoiseKeyValue(key, String(value))
        );
        return (
          <div key={i} className={styles.mapClauseCard}>
            <div className={styles.mapClauseHeader}>
              <span className={styles.mapClauseSection}>{clause.section}</span>
              <span className={styles.mapClauseTitle}>{stripSectionPrefix(clause.section, clause.title)}</span>
            </div>
            <p className={styles.mapClauseSummary}>{clause.summary}</p>
            {filteredKVs.length > 0 && (
              <div className={styles.mapKeyValues}>
                {filteredKVs.map(([key, value]) => (
                  <span key={key} className={styles.mapKV}>
                    <strong>{key}:</strong> {value}
                  </span>
                ))}
              </div>
            )}
            {clause.originalText && (
              <details className={styles.mapOriginalText}>
                <summary>Originaltext</summary>
                <p>{clause.originalText}</p>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}
