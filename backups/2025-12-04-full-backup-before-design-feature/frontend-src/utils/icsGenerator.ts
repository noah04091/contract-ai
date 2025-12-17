export function generateICS(contract: {
    name: string;
    expiryDate?: string;
  }) {
    if (!contract.expiryDate) {
      alert("⚠️ Kein Ablaufdatum vorhanden");
      return;
    }
  
    const title = `Vertrag endet: ${contract.name}`;
    const description = `Vertrag ${contract.name} läuft bald ab.`;
    const location = "Vertragsübersicht";
  
    const startDate = new Date(contract.expiryDate);
    startDate.setHours(9, 0, 0); // Kalenderzeit: 09:00 Uhr
    const endDate = new Date(startDate);
    endDate.setHours(10, 0, 0); // 1h Termin
  
    const formatDate = (date: Date) =>
      date
        .toISOString()
        .replace(/[-:]/g, "")
        .split(".")[0] + "Z";
  
    const icsContent = `BEGIN:VCALENDAR
  VERSION:2.0
  CALSCALE:GREGORIAN
  BEGIN:VEVENT
  SUMMARY:${title}
  DESCRIPTION:${description}
  LOCATION:${location}
  DTSTART:${formatDate(startDate)}
  DTEND:${formatDate(endDate)}
  END:VEVENT
  END:VCALENDAR`;
  
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${contract.name}_erinnerung.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  