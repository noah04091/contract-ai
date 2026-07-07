/**
 * 🎯 Typspezifische Tab-Labels und Empty-States für V2-Analyse (20.05.2026)
 *
 * Backend liefert documentType (CONTRACT / INVOICE / RECEIPT / TABLE_DOCUMENT /
 * FINANCIAL_DOCUMENT / UNKNOWN) plus ggf. contractType (purchase, rental, agb, ...).
 *
 * Diese Helper-Funktionen liefern je Dokumentklasse passende Texte für
 * Tabs + Empty-States, damit eine Rechnung nicht "Du kannst entspannt
 * unterschreiben" als Empty-State zeigt.
 *
 * Default-Fallback = CONTRACT-Wording → backwards-kompatibel bei
 * unbekannten/missenden documentType-Werten.
 */

export type DocClass = "CONTRACT" | "AGB" | "INVOICE" | "RECEIPT" | "TABLE_DOCUMENT" | "FINANCIAL_DOCUMENT" | "LETTER" | "UNKNOWN";

export type TabId = "summary" | "risks" | "strengths" | "recos" | "pilot" | "suggestions" | "market" | "opinion";

/**
 * Normalisiert documentType + contractType vom Backend zu DocClass.
 * AGB ist Sonderfall: contractType="agb" → DocClass="AGB" (priorität vor CONTRACT).
 */
export function classifyDocType(documentType?: string | null, contractType?: string | null): DocClass {
  // AGB hat Priorität (contractType-Erkennung)
  if (contractType && typeof contractType === "string" && contractType.toLowerCase() === "agb") {
    return "AGB";
  }
  if (!documentType || typeof documentType !== "string") return "CONTRACT";
  const upper = documentType.toUpperCase();
  if (upper === "INVOICE") return "INVOICE";
  if (upper === "RECEIPT") return "RECEIPT";
  if (upper === "TABLE_DOCUMENT") return "TABLE_DOCUMENT";
  if (upper === "FINANCIAL_DOCUMENT") return "FINANCIAL_DOCUMENT";
  // 📨 Welle 1 (07.07.2026): einseitige empfangene Schreiben (Kündigung, Abmahnung,
  // Bescheid, Mahnung) — eigene Klasse, sonst fiele alles auf CONTRACT-Wording
  // („Du kannst entspannt unterschreiben" über einer Kündigung).
  if (upper === "LETTER") return "LETTER";
  if (upper === "UNKNOWN") return "UNKNOWN";
  return "CONTRACT"; // CONTRACT + alle unbekannten Werte
}

/**
 * Liefert die Tab-Labels je Dokumentklasse.
 * Bei unbekanntem Tab-Key wird der Vertrags-Default zurückgegeben.
 */
export function getTabLabels(dc: DocClass): Record<TabId, string> {
  const CONTRACT_LABELS: Record<TabId, string> = {
    summary: "Zusammenfassung",
    risks: "Risiken",
    strengths: "Stärken",
    recos: "Empfehlungen",
    pilot: "Pilotprüfung",
    suggestions: "Verbesserungsideen",
    market: "Marktvergleich",
    opinion: "Rechtliche Vorprüfung",
  };

  if (dc === "CONTRACT") return CONTRACT_LABELS;

  if (dc === "AGB") {
    return {
      summary: "Zusammenfassung",
      risks: "Unwirksame Klauseln",
      strengths: "Vertretbar",
      recos: "Empfehlungen",
      pilot: "AGB-Pilotprüfung",
      suggestions: "Verbesserungsideen",
      market: "Verbraucherschutz",
      opinion: "Rechtliche Vorprüfung",
    };
  }

  if (dc === "INVOICE") {
    return {
      summary: "Zusammenfassung",
      risks: "Mängel",
      strengths: "Korrekt",
      recos: "Empfehlungen",
      pilot: "Pflichtangaben",
      suggestions: "Verbesserungsideen",
      market: "Compliance", // Marktvergleich nicht anwendbar → wird via showMarketTab ausgeblendet
      opinion: "Steuerprüfung",
    };
  }

  if (dc === "RECEIPT") {
    return {
      summary: "Zusammenfassung",
      risks: "Mängel",
      strengths: "Korrekt",
      recos: "Empfehlungen",
      pilot: "Belegprüfung",
      suggestions: "Verbesserungsideen",
      market: "Compliance",
      opinion: "Beleg-Bewertung",
    };
  }

  if (dc === "TABLE_DOCUMENT") {
    return {
      summary: "Zusammenfassung",
      risks: "Auffälligkeiten",
      strengths: "Konsistenz",
      recos: "Empfehlungen",
      pilot: "Datenprüfung",
      suggestions: "Verbesserungsideen",
      market: "Plausibilität",
      opinion: "Datenanalyse",
    };
  }

  if (dc === "FINANCIAL_DOCUMENT") {
    return {
      summary: "Zusammenfassung",
      risks: "Auffälligkeiten",
      strengths: "Korrekt",
      recos: "Empfehlungen",
      pilot: "Bilanz-Check",
      suggestions: "Verbesserungsideen",
      market: "Vergleichswerte",
      opinion: "Buchhalterische Bewertung",
    };
  }

  if (dc === "UNKNOWN") {
    return {
      summary: "Zusammenfassung",
      risks: "Auffälligkeiten",
      strengths: "Hervorzuheben",
      recos: "Empfehlungen",
      pilot: "Dokumentenprüfung",
      suggestions: "Hinweise",
      market: "Einordnung",
      opinion: "Dokumenten-Bewertung",
    };
  }

  // 📨 LETTER: alle 8 IDs bewusst definiert — der Spill-over-Guard in
  // V2TabsSection kann strengths/suggestions einblenden, wenn die KI sie
  // wider Erwarten liefert; dann dürfen dort keine Vertrags-Labels stehen.
  if (dc === "LETTER") {
    return {
      summary: "Zusammenfassung",
      risks: "Was das für dich bedeutet",
      strengths: "Was für dich spricht",
      recos: "Deine Optionen & Fristen",
      pilot: "Detailprüfung",
      suggestions: "Hinweise",
      market: "Einordnung",
      opinion: "Rechtliche Einordnung",
    };
  }

  return CONTRACT_LABELS;
}

/**
 * Marktvergleich-Tab macht nur bei Verträgen Sinn.
 * Bei Rechnungen/Tabellen/etc. komplett ausblenden.
 */
export function showMarketTab(dc: DocClass): boolean {
  return dc === "CONTRACT" || dc === "AGB";
}

/**
 * 🎯 Liefert die sichtbaren Tabs je Dokumentklasse.
 * Bei CONTRACT/AGB: alle Tabs (Standard-Vertragsfluss).
 * Bei INVOICE/RECEIPT/FINANCIAL_DOCUMENT: kompakter Fluss (4 Tabs).
 * Bei TABLE_DOCUMENT/UNKNOWN: minimaler Fluss (3 Tabs).
 *
 * Hinweis: Pilot-Tab wird in V2TabsSection zusätzlich an hasPilot gekoppelt.
 */
export function getVisibleTabs(dc: DocClass): TabId[] {
  if (dc === "CONTRACT" || dc === "AGB") {
    return ["summary", "risks", "strengths", "recos", "pilot", "suggestions", "market", "opinion"];
  }
  if (dc === "INVOICE" || dc === "RECEIPT" || dc === "FINANCIAL_DOCUMENT") {
    return ["summary", "risks", "recos", "opinion"];
  }
  // 📨 LETTER: Fokus auf Bedeutung + Handlungsoptionen/Fristen — kein
  // Marktvergleich, keine Stärken, keine Verbesserungsideen für ein Schreiben.
  if (dc === "LETTER") {
    return ["summary", "risks", "recos", "opinion"];
  }
  // TABLE_DOCUMENT, UNKNOWN — minimal
  return ["summary", "risks", "opinion"];
}

/**
 * 🎯 Liefert das Analyse-Label je Dokumentklasse.
 * Genutzt in MiniHeader, ScoreDrawer, ConversionBanner.
 */
export function getAnalysisLabel(dc: DocClass): string {
  switch (dc) {
    case "INVOICE": return "Rechnungsanalyse";
    case "RECEIPT": return "Belegprüfung";
    case "TABLE_DOCUMENT": return "Datenanalyse";
    case "FINANCIAL_DOCUMENT": return "Finanzanalyse";
    case "LETTER": return "Schreiben-Analyse";
    case "UNKNOWN": return "Dokumentenanalyse";
    case "CONTRACT":
    case "AGB":
    default: return "Vertragsanalyse";
  }
}

/**
 * 🎯 Liefert das Hauptwort je Dokumentklasse (Singular).
 * Genutzt z.B. für "{Doc-Noun} optimieren".
 */
export function getDocNoun(dc: DocClass): string {
  switch (dc) {
    case "AGB": return "AGB";
    case "INVOICE": return "Rechnung";
    case "RECEIPT": return "Beleg";
    case "TABLE_DOCUMENT": return "Tabelle";
    case "FINANCIAL_DOCUMENT": return "Finanzdokument";
    case "LETTER": return "Schreiben";
    case "UNKNOWN": return "Dokument";
    case "CONTRACT":
    default: return "Vertrag";
  }
}

/**
 * 🎯 Liefert das Hauptwort je Dokumentklasse im Plural.
 * Achtung: deutscher Plural ist unregelmäßig — nicht naiv +e/+en anhängen!
 * Genutzt z.B. für "Mehrere {Doc-Noun-Plural} gleichzeitig?".
 */
export function getDocNounPlural(dc: DocClass): string {
  switch (dc) {
    case "AGB": return "AGB"; // AGB ist bereits Plural
    case "INVOICE": return "Rechnungen";
    case "RECEIPT": return "Belege";
    case "TABLE_DOCUMENT": return "Tabellen";
    case "FINANCIAL_DOCUMENT": return "Finanzdokumente";
    case "LETTER": return "Schreiben"; // Plural = Singular
    case "UNKNOWN": return "Dokumente";
    case "CONTRACT":
    default: return "Verträge";
  }
}

/**
 * Empty-State-Texte je Dokumentklasse und Tab.
 * Default = CONTRACT-Wording (für unbekannte/missende Klassen).
 */
export function getEmptyState(dc: DocClass, tabId: TabId): { title: string; text: string } {
  // Risiken — wichtigster Empty-State (heute hartcodiert "Du kannst entspannt unterschreiben")
  if (tabId === "risks") {
    if (dc === "CONTRACT") {
      return {
        title: "Keine kritischen Klauseln gefunden",
        text: "Unsere KI hat den gesamten Vertrag gegen typische Risiko-Muster geprüft — alle Klauseln sind im grünen Bereich. Du kannst entspannt unterschreiben.",
      };
    }
    if (dc === "AGB") {
      return {
        title: "Keine unwirksamen Klauseln gefunden",
        text: "Wir haben die AGB gegen die typischen Klauselverbote (§§ 308, 309 BGB) und das Transparenzgebot (§ 307 BGB) geprüft — keine offensichtlich unwirksamen Klauseln gefunden.",
      };
    }
    if (dc === "INVOICE") {
      return {
        title: "Keine Mängel gefunden",
        text: "Die Rechnung wirkt formal korrekt — die relevanten Pflichtangaben nach § 14 UStG scheinen vorhanden zu sein. Eine 100%-Vorsteuerabzugs-Garantie ist das aber nicht — bei großen Beträgen empfehlen wir Rücksprache mit dem Steuerberater.",
      };
    }
    if (dc === "RECEIPT") {
      return {
        title: "Keine Mängel gefunden",
        text: "Der Beleg wirkt formal in Ordnung. Für steuerliche Zwecke aufbewahren (§ 147 AO: bis zu 10 Jahre für Geschäftsbelege).",
      };
    }
    if (dc === "TABLE_DOCUMENT") {
      return {
        title: "Keine Auffälligkeiten gefunden",
        text: "Die Daten wirken intern konsistent und plausibel. Bei kritischen Entscheidungen empfehlen wir trotzdem einen zweiten Blick auf die Datenquelle.",
      };
    }
    if (dc === "FINANCIAL_DOCUMENT") {
      return {
        title: "Keine Auffälligkeiten gefunden",
        text: "Das Finanzdokument wirkt plausibel und formal korrekt. Bei steuerlich relevanten Bescheiden: prüfe selbst die Einspruchsfrist (§ 355 AO: 1 Monat).",
      };
    }
    if (dc === "LETTER") {
      return {
        title: "Keine Forderungen oder Fristen erkannt",
        text: "Unsere KI hat in diesem Schreiben keine laufenden Fristen oder Forderungen gefunden. Prüfe trotzdem das Original — gerade bei Kündigungen und Bescheiden können Fristen ab dem Empfangsdatum laufen.",
      };
    }
    return {
      title: "Keine Auffälligkeiten gefunden",
      text: "Unsere KI hat das Dokument geprüft — keine offensichtlichen Probleme gefunden.",
    };
  }

  if (tabId === "strengths") {
    if (dc === "CONTRACT" || dc === "AGB") {
      return {
        title: "Keine besonderen Stärken hervorzuheben",
        text: "Das Dokument ist juristisch standardmäßig aufgesetzt — weder besonders ausgewogen noch außergewöhnlich problematisch.",
      };
    }
    if (dc === "INVOICE" || dc === "RECEIPT") {
      return {
        title: "Standardmäßiger Beleg",
        text: "Das Dokument wirkt korrekt aufgesetzt — keine besonderen Auszeichnungen, aber auch nichts Auffälliges.",
      };
    }
    return {
      title: "Keine besonderen Hervorhebungen",
      text: "Das Dokument wirkt standardmäßig — weder besonders gelungen noch problematisch.",
    };
  }

  if (tabId === "recos") {
    if (dc === "CONTRACT" || dc === "AGB") {
      return {
        title: "Keine konkreten Empfehlungen nötig",
        text: "Die KI sieht keine dringenden Punkte, die vor Vertragsschluss verhandelt werden müssten.",
      };
    }
    if (dc === "LETTER") {
      return {
        title: "Kein akuter Handlungsbedarf erkannt",
        text: "Die KI sieht keine Frist, auf die du reagieren musst. Wenn du unsicher bist: prüfe das Empfangsdatum des Schreibens — manche Fristen laufen ab Zugang.",
      };
    }
    return {
      title: "Keine konkreten Empfehlungen",
      text: "Die KI sieht aktuell keine dringenden Handlungsempfehlungen für dieses Dokument.",
    };
  }

  if (tabId === "suggestions") {
    if (dc === "CONTRACT" || dc === "AGB") {
      return {
        title: "Keine Verbesserungsideen",
        text: 'Die KI hat keine spezifischen Klausel-Optimierungsvorschläge — entweder weil das Dokument bereits ausgewogen ist oder weil die Punkte bereits unter „Empfehlungen" stehen.',
      };
    }
    return {
      title: "Keine Verbesserungsideen",
      text: "Die KI hat keine spezifischen Optimierungsvorschläge für dieses Dokument.",
    };
  }

  if (tabId === "market") {
    if (dc === "CONTRACT" || dc === "AGB") {
      return {
        title: "Marktvergleich noch nicht verfügbar",
        text: "Für den Vertragstyp liegen uns aktuell keine ausreichenden Marktdaten vor. Diese Funktion wird kontinuierlich ausgebaut.",
      };
    }
    return {
      title: "Vergleich nicht verfügbar",
      text: "Für diesen Dokumenttyp liegen aktuell keine Vergleichswerte vor.",
    };
  }

  if (tabId === "opinion") {
    return {
      title: "Keine ausführliche Bewertung verfügbar",
      text: "Die KI konnte für dieses Dokument keine ausführliche rechtliche Vorprüfung erstellen — schau in die anderen Tabs für die wichtigsten Punkte.",
    };
  }

  // summary — typspezifisch je DocClass (Erweiterung 22.05.2026)
  if (tabId === "summary") {
    if (dc === "LETTER") {
      return {
        title: "Keine Zusammenfassung verfügbar",
        text: 'Die Eckdaten des Schreibens findest du oben. Prüfe unbedingt die Fristen-Sektion und den Tab „Deine Optionen & Fristen" — dort steht, ob und bis wann du reagieren musst.',
      };
    }
    if (dc === "CONTRACT" || dc === "AGB") {
      return {
        title: "Bei dieser Analyse fehlt die Zusammenfassung",
        text: 'Das kann bei komplexen oder gescannten Dokumenten gelegentlich passieren. Klicke oben rechts auf „Erneut analysieren" — meistens reicht ein zweiter Versuch. Falls weiterhin keine Zusammenfassung erscheint, schau zusätzlich in den Risiken-Tab und in das Rechtsgutachten.',
      };
    }
    if (dc === "INVOICE") {
      return {
        title: "Keine Zusammenfassung verfügbar",
        text: 'Die Eckdaten der Rechnung (Datum, Betrag, Steuersatz) findest du oben. Für Details schau in den „Mängel"- und „Steuerprüfung"-Tab.',
      };
    }
    if (dc === "RECEIPT") {
      return {
        title: "Keine Zusammenfassung verfügbar",
        text: 'Die wichtigsten Belegdaten findest du oben. Detail-Bewertung im „Beleg-Bewertung"-Tab.',
      };
    }
    if (dc === "TABLE_DOCUMENT" || dc === "FINANCIAL_DOCUMENT") {
      return {
        title: "Keine Zusammenfassung verfügbar",
        text: 'Eckdaten findest du oben. Detail-Auffälligkeiten im jeweiligen Analyse-Tab.',
      };
    }
    return {
      title: "Keine Zusammenfassung verfügbar",
      text: 'Die KI konnte für dieses Dokument keine Zusammenfassung erstellen. Schau in die anderen Tabs für die wichtigsten Punkte.',
    };
  }

  // pilot — in V2TabsSection schon adaptiv genug, kein eigener Default nötig
  return {
    title: "Keine Daten verfügbar",
    text: "Für diesen Bereich wurden keine Daten gefunden.",
  };
}
