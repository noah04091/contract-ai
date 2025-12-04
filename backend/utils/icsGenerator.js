// 📁 backend/utils/icsGenerator.js
const crypto = require('crypto');

/**
 * Generiert einen ICS-Feed für externe Kalender-Integration
 */
function generateICSFeed(events) {
  const lines = [];
  
  // ICS Header
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Contract AI//Calendar Feed//DE');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  lines.push('X-WR-CALNAME:Contract AI Vertragskalender');
  lines.push('X-WR-CALDESC:Automatische Vertragserinnerungen von Contract AI');
  lines.push('X-WR-TIMEZONE:Europe/Berlin');
  
  // Timezone Definition
  lines.push('BEGIN:VTIMEZONE');
  lines.push('TZID:Europe/Berlin');
  lines.push('BEGIN:DAYLIGHT');
  lines.push('TZOFFSETFROM:+0100');
  lines.push('TZOFFSETTO:+0200');
  lines.push('TZNAME:CEST');
  lines.push('DTSTART:19700329T020000');
  lines.push('RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU');
  lines.push('END:DAYLIGHT');
  lines.push('BEGIN:STANDARD');
  lines.push('TZOFFSETFROM:+0200');
  lines.push('TZOFFSETTO:+0100');
  lines.push('TZNAME:CET');
  lines.push('DTSTART:19701025T030000');
  lines.push('RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU');
  lines.push('END:STANDARD');
  lines.push('END:VTIMEZONE');
  
  // Events
  events.forEach(event => {
    lines.push('BEGIN:VEVENT');
    
    // UID - Unique identifier
    const uid = generateUID(event._id);
    lines.push(`UID:${uid}@contract-ai.de`);
    
    // DTSTAMP - Creation timestamp
    lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
    
    // DTSTART - Event date
    const eventDate = new Date(event.date);
    lines.push(`DTSTART;TZID=Europe/Berlin:${formatICSDate(eventDate)}`);
    
    // DTEND - Same as start for all-day events
    const endDate = new Date(eventDate);
    endDate.setHours(endDate.getHours() + 1); // 1 hour duration
    lines.push(`DTEND;TZID=Europe/Berlin:${formatICSDate(endDate)}`);
    
    // SUMMARY - Event title
    lines.push(`SUMMARY:${escapeICS(event.title)}`);
    
    // DESCRIPTION
    const description = buildEventDescription(event);
    lines.push(`DESCRIPTION:${escapeICS(description)}`);
    
    // LOCATION
    if (event.contract?.provider) {
      lines.push(`LOCATION:${escapeICS(event.contract.provider)}`);
    }
    
    // CATEGORIES
    lines.push(`CATEGORIES:${event.type},${event.severity}`);
    
    // PRIORITY
    const priority = getPriority(event.severity);
    lines.push(`PRIORITY:${priority}`);
    
    // STATUS
    lines.push(`STATUS:CONFIRMED`);
    
    // ALARM - Reminder
    if (event.severity === 'critical' || event.severity === 'warning') {
      lines.push('BEGIN:VALARM');
      lines.push('TRIGGER:-PT24H'); // 24 hours before
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:${escapeICS(event.title)}`);
      lines.push('END:VALARM');
      
      // Second alarm for critical events
      if (event.severity === 'critical') {
        lines.push('BEGIN:VALARM');
        lines.push('TRIGGER:-PT1H'); // 1 hour before
        lines.push('ACTION:DISPLAY');
        lines.push(`DESCRIPTION:DRINGEND: ${escapeICS(event.title)}`);
        lines.push('END:VALARM');
      }
    }
    
    // URL - Link back to Contract AI
    const contractUrl = `https://contract-ai.de/contracts/${event.contractId}`;
    lines.push(`URL:${contractUrl}`);
    
    // Custom properties
    lines.push(`X-CONTRACT-ID:${event.contractId}`);
    lines.push(`X-CONTRACT-NAME:${escapeICS(event.contract?.name || '')}`);
    lines.push(`X-EVENT-TYPE:${event.type}`);
    lines.push(`X-SEVERITY:${event.severity}`);
    
    if (event.metadata?.suggestedAction) {
      lines.push(`X-SUGGESTED-ACTION:${event.metadata.suggestedAction}`);
    }
    
    lines.push('END:VEVENT');
  });
  
  // ICS Footer
  lines.push('END:VCALENDAR');
  
  // Join with CRLF as per ICS specification
  return lines.join('\r\n');
}

/**
 * Generiert ein einzelnes ICS-Event für Download
 */
function generateSingleEventICS(event) {
  return generateICSFeed([event]);
}

/**
 * Generiert eine eindeutige UID für ein Event
 */
function generateUID(eventId) {
  const hash = crypto.createHash('sha256');
  hash.update(eventId.toString());
  return hash.digest('hex').substring(0, 16);
}

/**
 * Formatiert ein Date-Objekt für ICS
 */
function formatICSDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Escaped Sonderzeichen für ICS
 */
function escapeICS(text) {
  if (!text) return '';
  
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .split('')
    .map((char, i) => {
      // Wrap at 75 characters (ICS line length limit)
      if (i > 0 && i % 70 === 0) {
        return '\r\n ' + char;
      }
      return char;
    })
    .join('');
}

/**
 * Baut die Event-Beschreibung
 */
function buildEventDescription(event) {
  const lines = [];
  
  lines.push(event.description || '');
  lines.push('');
  
  if (event.contract) {
    lines.push('VERTRAGSDETAILS:');
    lines.push(`• Vertrag: ${event.contract.name}`);
    if (event.contract.provider) {
      lines.push(`• Anbieter: ${event.contract.provider}`);
    }
    if (event.contract.amount) {
      lines.push(`• Betrag: ${event.contract.amount}€`);
    }
  }
  
  if (event.metadata) {
    lines.push('');
    if (event.metadata.noticePeriodDays) {
      lines.push(`• Kündigungsfrist: ${event.metadata.noticePeriodDays} Tage`);
    }
    if (event.metadata.autoRenewMonths) {
      lines.push(`• Automatische Verlängerung: ${event.metadata.autoRenewMonths} Monate`);
    }
    if (event.metadata.daysLeft) {
      lines.push(`• Verbleibende Tage: ${event.metadata.daysLeft}`);
    }
  }
  
  lines.push('');
  lines.push('EMPFOHLENE AKTION:');
  
  switch (event.metadata?.suggestedAction) {
    case 'cancel':
      lines.push('→ Jetzt kündigen');
      break;
    case 'compare':
      lines.push('→ Alternativen vergleichen');
      break;
    case 'review':
      lines.push('→ Vertrag überprüfen');
      break;
    case 'optimize':
      lines.push('→ Optimierungsmöglichkeiten prüfen');
      break;
    default:
      lines.push('→ Im Contract AI Dashboard prüfen');
  }
  
  lines.push('');
  lines.push('🔗 Direkt in Contract AI öffnen:');
  lines.push(`https://contract-ai.de/contracts/${event.contractId}`);
  
  return lines.join('\\n');
}

/**
 * Bestimmt die Priorität basierend auf Severity
 */
function getPriority(severity) {
  switch (severity) {
    case 'critical':
      return 1; // Highest
    case 'warning':
      return 5; // Medium
    case 'info':
      return 9; // Low
    default:
      return 5;
  }
}

/**
 * Generiert einen Webcal-Link für Kalender-Abonnements
 */
function generateWebcalLink(token) {
  const baseUrl = process.env.FRONTEND_URL || 'https://contract-ai.de';
  const icsUrl = `${baseUrl}/api/calendar/ics?token=${token}`;
  
  // Webcal protocol für automatische Updates
  return icsUrl.replace('https://', 'webcal://').replace('http://', 'webcal://');
}

/**
 * Generiert Kalender-Abonnement-Links für verschiedene Kalender-Apps
 */
function generateCalendarLinks(token) {
  // WICHTIG: ICS-Endpoint ist auf dem Backend-Server, nicht Frontend!
  const backendUrl = process.env.BACKEND_URL || 'https://api.contract-ai.de';
  const icsUrl = `${backendUrl}/api/calendar/ics?token=${token}`;
  const webcalUrl = icsUrl.replace('https://', 'webcal://').replace('http://', 'webcal://');
  
  return {
    // Direct ICS download
    download: icsUrl,
    
    // Webcal subscription
    webcal: webcalUrl,
    
    // Google Calendar
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`,
    
    // Outlook.com
    outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(icsUrl)}&name=Contract%20AI%20Kalender`,
    
    // Apple Calendar (macOS/iOS)
    apple: webcalUrl,
    
    // Yahoo Calendar
    yahoo: `https://calendar.yahoo.com/?v=60&view=d&type=20&url=${encodeURIComponent(icsUrl)}&title=Contract%20AI%20Kalender`,
    
    // Instructions for different platforms
    instructions: {
      google: "Klicken Sie auf den Link und folgen Sie den Anweisungen zum Hinzufügen des Kalenders.",
      outlook: "Der Kalender wird zu Ihrem Outlook.com-Konto hinzugefügt.",
      apple: "Der Link öffnet sich in der Kalender-App. Bestätigen Sie das Abonnement.",
      thunderbird: `Kopieren Sie diesen Link: ${icsUrl}\nÖffnen Sie Thunderbird → Datei → Neu → Kalender → Im Netzwerk → Format: iCalendar → URL einfügen`,
      other: `Verwenden Sie diese URL in Ihrer Kalender-App: ${icsUrl}`
    }
  };
}

module.exports = {
  generateICSFeed,
  generateSingleEventICS,
  generateWebcalLink,
  generateCalendarLinks,
  formatICSDate,
  escapeICS
};