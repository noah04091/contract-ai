/**
 * Contract Relationship Detector
 * Detects deterministic patterns and relationships between contracts — no AI calls.
 */

/**
 * Detect relationships and patterns in portfolio
 * @param {object} portfolio - From portfolioAggregator
 * @returns {object[]} Detected patterns
 */
function detectRelationships(portfolio) {
  const patterns = [];

  // 1. Provider Concentration Risk
  for (const group of portfolio.byProvider) {
    if (group.contracts.length >= 3) {
      const criticalCount = group.contracts.filter(c => c.criticalFindings > 0).length;
      patterns.push({
        type: "concentration_risk",
        severity: criticalCount > 0 ? "high" : "medium",
        title: `Anbieter-Konzentration: ${group.provider}`,
        description: `${group.contracts.length} Verträge mit ${group.provider}. ${criticalCount > 0 ? `${criticalCount} davon mit kritischen Befunden.` : "Klumpenrisiko bei Anbieterausfall."}`,
        relatedContracts: group.contracts.map(c => c.id),
        confidence: 90,
      });
    }
  }

  // 2. Renewal Cluster Risk
  for (const cluster of portfolio.renewalClusters) {
    const names = cluster.map(c => c.name).slice(0, 3);
    const minDays = Math.min(...cluster.map(c => c.daysUntilExpiry || 999));
    patterns.push({
      type: "renewal_cluster",
      severity: minDays <= 30 ? "critical" : minDays <= 60 ? "high" : "medium",
      title: `${cluster.length} Verträge laufen gleichzeitig aus`,
      description: `${names.join(", ")}${cluster.length > 3 ? ` und ${cluster.length - 3} weitere` : ""} laufen innerhalb von 60 Tagen aus. Frühester Ablauf in ${minDays} Tagen.`,
      relatedContracts: cluster.map(c => c.id),
      confidence: 95,
    });
  }

  // 3. Auto-Renewal Traps
  for (const c of portfolio.autoRenewalRisks) {
    patterns.push({
      type: "renewal_cluster",
      severity: (c.daysUntilExpiry || 999) <= 30 ? "critical" : "high",
      title: `Auto-Verlängerung: ${c.name}`,
      description: `Vertrag verlängert sich automatisch in ${c.daysUntilExpiry} Tagen. Prüfen Sie, ob die Konditionen noch aktuell sind.`,
      relatedContracts: [c.id],
      confidence: 95,
    });
  }

  // 4. Score Outliers within same type
  for (const group of portfolio.byType) {
    if (group.contracts.length < 2) continue;
    const scored = group.contracts.filter(c => c.score !== null);
    if (scored.length < 2) continue;

    const avgScore = scored.reduce((s, c) => s + (c.score || 0), 0) / scored.length;

    for (const c of scored) {
      if ((c.score || 0) < avgScore - 20) {
        patterns.push({
          type: "benchmark_gap",
          severity: (c.score || 0) < 40 ? "high" : "medium",
          title: `${c.name} deutlich unter Durchschnitt`,
          description: `Score ${c.score}/100 liegt ${Math.round(avgScore - (c.score || 0))} Punkte unter dem Durchschnitt (${Math.round(avgScore)}) für ${group.type}-Verträge in Ihrem Portfolio.`,
          relatedContracts: [c.id],
          confidence: 85,
        });
      }
    }
  }

  // 5. Weak Contract Cluster
  if (portfolio.weakContracts.length >= 3) {
    patterns.push({
      type: "benchmark_gap",
      severity: "high",
      title: `${portfolio.weakContracts.length} Verträge mit schwachem Score`,
      description: `${portfolio.weakContracts.length} Verträge haben einen Score unter 50. Diese sollten priorisiert überprüft werden.`,
      relatedContracts: portfolio.weakContracts.map(c => c.id),
      confidence: 90,
    });
  }

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  patterns.sort((a, b) => (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5));

  return patterns;
}

module.exports = { detectRelationships };
