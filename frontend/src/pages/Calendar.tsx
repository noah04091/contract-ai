// src/pages/Calendar.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import styles from "../styles/CalendarPage.module.css";

interface Contract {
  _id: string;
  name: string;
  expiryDate?: string;
}

export default function CalendarPage() {
  const [markedDates, setMarkedDates] = useState<Date[]>([]);

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const token = localStorage.getItem("token") || "";
        const res = await axios.get("https://://contract-ai-backend.onrender.com/calendar-events", {
          headers: { Authorization: token },
        });

        const contracts = res.data as Contract[]; // ✅ fix für TS

        const dates = contracts
          .filter((c) => c.expiryDate)
          .map((c) => new Date(c.expiryDate!));

        setMarkedDates(dates);
      } catch (err) {
        console.error("Fehler beim Laden der Verträge:", err);
      }
    };
    fetchContracts();
  }, []);

  const tileClassName = ({ date }: { date: Date }) => {
    return markedDates.some((d) => d.toDateString() === date.toDateString())
      ? styles.markedDate
      : null;
  };

  return (
    <div className={styles.container}>
      <h2>🗓️ Vertragskalender</h2>
      <Calendar tileClassName={tileClassName} />
      <div className={styles.legend}>
        <span className={styles.dot}></span> Vertrag läuft aus
      </div>
    </div>
  );
}
