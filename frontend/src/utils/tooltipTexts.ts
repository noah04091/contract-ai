// tooltipTexts.ts - Vordefinierte InfoTooltip-Texte für Dashboard-Sektionen
export const tooltipTexts = {
  // Legal Pulse Analyse
  legalPulse: {
    title: "Was ist Legal Pulse?",
    content: "Legal Pulse analysiert Ihre Verträge automatisch auf rechtliche Risiken, Compliance-Probleme und Optimierungsmöglichkeiten. Der KI-Score zeigt potenzielle Schwachstellen und hilft bei der Prioritisierung von Vertragsüberprüfungen.",
    position: "bottom" as const,
    size: "lg" as const
  },

  // KI-Generierte Verträge
  generatedContracts: {
    title: "KI-Generierte Verträge",
    content: "Hier sehen Sie die neuesten Verträge, die mit unserem KI-Generator erstellt wurden. Diese Verträge wurden basierend auf Ihren Angaben automatisch generiert und können direkt verwendet oder weiter angepasst werden.",
    position: "bottom" as const,
    size: "md" as const
  },

  // Wichtige Verträge (Priority Contracts)
  priorityContracts: {
    title: "Wichtige Verträge",
    content: "Diese Sektion zeigt die wichtigsten Verträge basierend auf intelligenter Priorisierung: bald ablaufende Verträge (< 30 Tage), Verträge mit Erinnerungen und die neuesten Uploads. So verpassen Sie keine kritischen Deadlines.",
    position: "bottom" as const,
    size: "lg" as const
  },

  // Quick Actions
  quickActions: {
    title: "Schnellaktionen",
    content: "Führen Sie die häufigsten Aktionen direkt vom Dashboard aus: Neue Verträge hochladen, KI-Generator nutzen, Daten exportieren oder Kalender-Integration aktivieren. Sparen Sie Zeit mit Ein-Klick-Aktionen.",
    position: "top" as const,
    size: "md" as const
  },

  // Analytics Status (Statusverteilung)
  analyticsStatus: {
    title: "Statusverteilung",
    content: "Zeigt die Verteilung Ihrer Verträge nach Status (Aktiv, Abgelaufen, Bald ablaufend). Diese Übersicht hilft bei der Verwaltung und rechtzeitigen Verlängerung wichtiger Verträge.",
    position: "top" as const,
    size: "md" as const
  },

  // Analytics Uploads (Upload-Trends)
  analyticsUploads: {
    title: "Upload-Trends", 
    content: "Verfolgen Sie Ihre monatlichen Upload-Aktivitäten. Unterscheidung zwischen manuell hochgeladenen und KI-generierten Verträgen zeigt Ihre Nutzungsmuster und Produktivität.",
    position: "top" as const,
    size: "md" as const
  },

  // Analytics Risk (Risiko-Analyse)
  analyticsRisk: {
    title: "Risiko-Analyse",
    content: "Übersicht über die Legal Pulse Bewertungen Ihrer Verträge. Hohe Risiko-Scores zeigen Verträge an, die eine rechtliche Überprüfung benötigen könnten.",
    position: "top" as const,
    size: "md" as const
  },

  // Analytics Trend (30-Tage Aktivität)
  analyticsTrend: {
    title: "Aktivitäts-Trend",
    content: "Zeigt Ihre Vertragsaktivitäten der letzten 30 Tage. Verfolgen Sie Uploads, Analysen und andere Aktionen, um Ihre Produktivität zu verstehen.",
    position: "top" as const,
    size: "md" as const
  },

  // Metriken
  metricsTotal: {
    title: "Gesamte Verträge",
    content: "Die Gesamtanzahl aller Verträge in Ihrem System - sowohl hochgeladene als auch KI-generierte Dokumente.",
    position: "bottom" as const,
    size: "sm" as const
  },

  metricsActive: {
    title: "Aktive Verträge", 
    content: "Anzahl der Verträge, die aktuell gültig sind und deren Laufzeit noch nicht abgelaufen ist.",
    position: "bottom" as const,
    size: "sm" as const
  },

  metricsExpiring: {
    title: "Bald ablaufend",
    content: "Verträge, die in den nächsten 30 Tagen ablaufen und Ihre Aufmerksamkeit benötigen. Rechtzeitige Verlängerung verhindert Geschäftsunterbrechungen.",
    position: "bottom" as const,
    size: "md" as const
  },

  metricsReminders: {
    title: "Erinnerungen aktiv",
    content: "Anzahl der Verträge mit aktivierten Erinnerungen. Diese Verträge werden Sie automatisch vor wichtigen Terminen benachrichtigen.",
    position: "bottom" as const,
    size: "md" as const
  }
};