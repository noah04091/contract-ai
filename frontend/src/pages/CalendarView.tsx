import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import { EventClickArg, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import styles from "../styles/CalendarView.module.css";

interface Contract {
  _id: string;
  name: string;
  expiryDate?: string;
}

export default function CalendarView() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const res = await fetch("/api/contracts", {
          credentials: "include",
        });

        if (!res.ok) throw new Error("Verträge konnten nicht geladen werden");

        const data = await res.json();
        setContracts(data.filter((c: Contract) => c.expiryDate));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unbekannter Fehler beim Laden der Verträge.";
        console.error("❌ Fehler beim Laden der Verträge:", message);
      }
    };

    fetchContracts();
  }, []);

  const events: EventInput[] = contracts.map((contract) => ({
    title: contract.name,
    date: contract.expiryDate,
    id: contract._id,
  }));

  const handleEventClick = (info: EventClickArg) => {
    navigate(`/contracts/${info.event.id}`);
  };

  return (
    <div className={styles.calendarContainer}>
      <h1>📅 Vertragskalender</h1>
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        events={events}
        eventClick={handleEventClick}
        locale="de"
        height="auto"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth",
        }}
      />
    </div>
  );
}
