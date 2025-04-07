import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
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
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch("http://localhost:5000/contracts", {
        headers: { Authorization: token },
      });
      const data = await res.json();
      setContracts(data.filter((c: Contract) => c.expiryDate));
    };

    fetchContracts();
  }, []);

  const events = contracts.map((contract) => ({
    title: contract.name,
    date: contract.expiryDate,
    id: contract._id,
  }));

  const handleEventClick = (info: any) => {
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
