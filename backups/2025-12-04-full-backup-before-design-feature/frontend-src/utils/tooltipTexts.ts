// tooltipTexts.ts - Vordefinierte InfoTooltip-Texte für Dashboard-Sektionen
export const tooltipTexts = {
  // Legal Pulse Analyse
  legalPulse: {
    title: "Legal Pulse Analyse",
    content: "Automatische KI-Analyse Ihrer Verträge auf rechtliche Risiken und Compliance-Probleme. Scores von 0-100 zeigen Optimierungspotential.",
    position: "bottom" as const,
    size: "lg" as const
  },

  // KI-Generierte Verträge
  generatedContracts: {
    title: "KI-Vertragsgenerator",
    content: "Automatisch erstellte Verträge durch künstliche Intelligenz. Basierend auf Ihren Angaben und bewährten Vertragsmustern.",
    position: "bottom" as const,
    size: "md" as const
  },

  // Wichtige Verträge (Priority Contracts)
  priorityContracts: {
    title: "Smart Priorisierung",
    content: "Intelligente Auswahl wichtiger Verträge: Bald ablaufende (< 30 Tage), Verträge mit Erinnerungen und neueste Aktivitäten.",
    position: "bottom" as const,
    size: "lg" as const
  },

  // Quick Actions
  quickActions: {
    title: "Schnellzugriff",
    content: "Die wichtigsten Aktionen direkt verfügbar: Upload, KI-Generator, Datenexport und Kalender-Integration.",
    position: "top" as const,
    size: "md" as const
  },

  // Analytics Status (Statusverteilung)
  analyticsStatus: {
    title: "Statusverteilung",
    content: "Übersicht Ihrer Verträge nach Status: Aktiv, Abgelaufen und bald ablaufende Dokumente.",
    position: "top" as const,
    size: "md" as const
  },

  // Analytics Uploads (Upload-Trends)
  analyticsUploads: {
    title: "Upload-Trends", 
    content: "Monatliche Upload-Aktivitäten mit Unterscheidung zwischen manuellen und KI-generierten Verträgen.",
    position: "top" as const,
    size: "md" as const
  },

  // Analytics Risk (Risiko-Analyse)
  analyticsRisk: {
    title: "Risiko-Analyse",
    content: "Verteilung der Legal Pulse Scores. Hohe Werte zeigen Verträge mit Überprüfungsbedarf.",
    position: "top" as const,
    size: "md" as const
  },

  // Analytics Trend (30-Tage Aktivität)
  analyticsTrend: {
    title: "Aktivitäts-Verlauf",
    content: "14-Tage Übersicht Ihrer Vertragsaktivitäten: Uploads, Analysen und Verwaltungsaufgaben.",
    position: "top" as const,
    size: "md" as const
  },

  // Metriken
  metricsTotal: {
    title: "Gesamte Verträge",
    content: "Alle Verträge in Ihrem System - hochgeladene und KI-generierte Dokumente.",
    position: "bottom" as const,
    size: "sm" as const
  },

  metricsActive: {
    title: "Aktive Verträge", 
    content: "Verträge die aktuell gültig sind und deren Laufzeit noch nicht abgelaufen ist.",
    position: "bottom" as const,
    size: "sm" as const
  },

  metricsExpiring: {
    title: "Bald ablaufend",
    content: "Verträge die in den nächsten 30 Tagen ablaufen und Aufmerksamkeit benötigen.",
    position: "bottom" as const,
    size: "md" as const
  },

  metricsReminders: {
    title: "Aktive Erinnerungen",
    content: "Verträge mit aktivierten Benachrichtigungen für wichtige Termine und Deadlines.",
    position: "bottom" as const,
    size: "md" as const
  }
};