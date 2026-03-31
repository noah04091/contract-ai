import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, XCircle, Minus } from 'lucide-react';
import {
  ContractStructure, StructuredClause,
  ClauseArea, CLAUSE_AREA_LABELS,
  EnhancedDifference, DocumentTypeInfo,
} from '../../../types/compare';
import styles from '../../../styles/Compare.module.css';

interface ContractMapTabProps {
  contract1: ContractStructure;
  contract2: ContractStructure;
  differences: EnhancedDifference[];
  documentType?: DocumentTypeInfo | null;
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

export default function ContractMapTab({ contract1, contract2, differences, documentType }: ContractMapTabProps) {
  const [expandedArea, setExpandedArea] = useState<string | null>(null);
  const rows = buildAreaRows(contract1, contract2, differences);
  const docName = documentType?.labels?.documentName || 'Vertrag';

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

      {/* Header */}
      <div className={styles.mapHeader}>
        <div className={styles.mapHeaderArea}>Klauselbereich</div>
        <div className={styles.mapHeaderContract}>{docName} 1</div>
        <div className={styles.mapHeaderContract}>{docName} 2</div>
      </div>

      {/* Rows */}
      <div className={styles.mapRows}>
        {rows.map((row) => {
          const isExpanded = expandedArea === row.area;
          return (
            <div key={row.area} className={styles.mapRowWrapper}>
              <div
                className={`${styles.mapRow} ${styles[`mapRow_${row.status}`]}`}
                onClick={() => setExpandedArea(isExpanded ? null : row.area)}
              >
                {/* Area label */}
                <div className={styles.mapRowArea}>
                  <StatusIcon status={row.status} />
                  <span className={styles.mapRowLabel}>{row.label}</span>
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
      {clauses.map((clause, i) => (
        <div key={i} className={styles.mapClauseCard}>
          <div className={styles.mapClauseHeader}>
            <span className={styles.mapClauseSection}>{clause.section}</span>
            <span className={styles.mapClauseTitle}>{clause.title}</span>
          </div>
          <p className={styles.mapClauseSummary}>{clause.summary}</p>
          {clause.keyValues && Object.keys(clause.keyValues).length > 0 && (
            <div className={styles.mapKeyValues}>
              {Object.entries(clause.keyValues).map(([key, value]) => (
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
      ))}
    </div>
  );
}
