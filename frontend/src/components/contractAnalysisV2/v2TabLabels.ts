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

export type DocClass = "CONTRACT" | "AGB" | "INVOICE" | "RECEIPT" | "TABLE_DOCUMENT" | "FINANCIAL_DOCUMENT" | "UNKNOWN";

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

  // summary, pilot — sind in V2TabsSection schon adaptiv genug, kein eigener Default nötig
  return {
    title: "Keine Daten verfügbar",
    text: "Für diesen Bereich wurden keine Daten gefunden.",
  };
}
