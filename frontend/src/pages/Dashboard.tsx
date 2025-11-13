import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./Dashboard.module.css";
import GeneratedContractsSection from "../components/GeneratedContractsSection";
import SavedAlternatives from "../components/SavedAlternatives";
import InfoTooltip from "../components/InfoTooltip";
import { tooltipTexts } from "../utils/tooltipTexts";
import { generateICS } from "../utils/icsGenerator";
import Notification from "../components/Notification";
import { Helmet } from "react-helmet-async";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Line, Area, AreaChart
} from 'recharts';
import DashboardSkeleton from "../components/DashboardSkeleton"; // 💀 Skeleton Loader
import UpcomingDeadlinesWidget from "../components/UpcomingDeadlinesWidget"; // 📅 Upcoming Deadlines Widget

interface Contract {
  _id: string;
  name: string;
  laufzeit: string;
  kuendigung: string;
  expiryDate?: string;
  status?: string;
  uploadedAt?: string;
  filePath?: string;
  reminder?: boolean;
  isGenerated?: boolean;
  createdAt?: string;
  legalPulse?: {
    riskScore: number | null;
  };
  // 💰 Payment & Cost Tracking
  contractType?: 'recurring' | 'one-time' | null;
  paymentAmount?: number;
  paymentFrequency?: 'monthly' | 'yearly' | 'weekly';
  paymentStatus?: 'paid' | 'unpaid';
}

interface UserData {
  email: string;
  analysisCount?: number;
  analysisLimit?: number;
  subscriptionPlan?: string;
}

export default function Dashboard() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [priorityContracts, setPriorityContracts] = useState<Contract[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // 🎯 SMART PRIORITY LOGIK
  const calculatePriorityContracts = (allContracts: Contract[]) => {
    if (!allContracts || allContracts.length === 0) return [];
    
    const now = new Date().getTime();
    const thirtyDaysFromNow = now + (30 * 24 * 60 * 60 * 1000);
    
    // 1. KRITISCH: Bald ablaufende Verträge (< 30 Tage)
    const soonExpiring = allContracts.filter(contract => {
      if (!contract || !contract.expiryDate) return false;
      const expiryTime = new Date(contract.expiryDate).getTime();
      return expiryTime > now && expiryTime <= thirtyDaysFromNow;
    }).sort((a, b) => {
      const dateA = new Date(a.expiryDate!).getTime();
      const dateB = new Date(b.expiryDate!).getTime();
      return dateA - dateB;
    });

    // 2. WICHTIG: Verträge mit aktivierter Erinnerung
    const withReminder = allContracts.filter(contract => {
      if (!contract || !contract.reminder) return false;
      return !soonExpiring.find(c => c._id === contract._id);
    }).sort((a, b) => {
      const dateA = new Date(a.expiryDate || a.uploadedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.expiryDate || b.uploadedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    // 3. AKTUELL: Neueste Verträge
    const recentContracts = allContracts.filter(contract => {
      if (!contract) return false;
      const isAlreadyIncluded = soonExpiring.find(c => c._id === contract._id) || 
                               withReminder.find(c => c._id === contract._id);
      return !isAlreadyIncluded;
    }).sort((a, b) => {
      const dateA = new Date(a.uploadedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.uploadedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    }).slice(0, 3);

    // Kombiniere alle mit Maximum von 8 Verträgen
    const priorityList = [
      ...soonExpiring,
      ...withReminder.slice(0, Math.max(0, 8 - soonExpiring.length)),
      ...recentContracts.slice(0, Math.max(0, 8 - soonExpiring.length - withReminder.length))
    ].slice(0, 8);

    return priorityList;
  };

  // 📊 ANALYTICS DATA PREPARATION
  const getAnalyticsData = (): {
    pieData: Array<{name: string, value: number, percentage: number}>,
    monthlyData: Array<{month: string, uploads: number, generated: number, uploaded: number}>,
    riskData: Array<{category: string, count: number, percentage: number}>,
    trendData: Array<{date: string, activeContracts: number, newContracts: number, expiringContracts: number}>
  } => {
    // Status Distribution für Pie Chart
    const statusCounts = {
      'Aktiv': contracts.filter(c => c.status === 'Aktiv').length,
      'Bald ablaufend': contracts.filter(c => c.status === 'Bald ablaufend').length,
      'Abgelaufen': contracts.filter(c => c.status === 'Abgelaufen').length,
      'Unbekannt': contracts.filter(c => !c.status || c.status === 'Unbekannt').length
    };

    const pieData = Object.entries(statusCounts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        name: status,
        value: count,
        percentage: Math.round((count / contracts.length) * 100)
      }));

    // Monthly Uploads für Bar Chart
    const monthlyData = getMonthlyUploadData();

    // Risk Score Distribution
    const riskData = getRiskDistributionData();

    // Contract Value Trend (Mock data - würde normalerweise aus Backend kommen)
    const trendData = getTrendData();

    return { pieData, monthlyData, riskData, trendData };
  };

  const getMonthlyUploadData = (): Array<{month: string, uploads: number, generated: number, uploaded: number}> => {
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const currentYear = new Date().getFullYear();
    
    const monthlyData = months.map((month, index) => {
      const monthContracts = contracts.filter(contract => {
        const date = new Date(contract.uploadedAt || contract.createdAt || 0);
        return date.getFullYear() === currentYear && date.getMonth() === index;
      });

      return {
        month,
        uploads: monthContracts.length,
        generated: monthContracts.filter(c => c.isGenerated).length,
        uploaded: monthContracts.filter(c => !c.isGenerated).length
      };
    });

    return monthlyData.slice(0, new Date().getMonth() + 1); // Nur bis aktueller Monat
  };

  const getRiskDistributionData = (): Array<{category: string, count: number, percentage: number}> => {
    const riskBuckets = {
      'Niedrig (0-30)': 0,
      'Mittel (31-60)': 0,
      'Hoch (61-100)': 0,
      'Nicht bewertet': 0
    };

    contracts.forEach(contract => {
      const risk = contract.legalPulse?.riskScore;
      if (risk === null || risk === undefined) {
        riskBuckets['Nicht bewertet']++;
      } else if (risk <= 30) {
        riskBuckets['Niedrig (0-30)']++;
      } else if (risk <= 60) {
        riskBuckets['Mittel (31-60)']++;
      } else {
        riskBuckets['Hoch (61-100)']++;
      }
    });

    return Object.entries(riskBuckets).map(([category, count]) => ({
      category,
      count,
      percentage: contracts.length > 0 ? Math.round((count / contracts.length) * 100) : 0
    }));
  };

  const getTrendData = (): Array<{date: string, activeContracts: number, newContracts: number, expiringContracts: number}> => {
    // Mock trend data - in real app würde das aus Backend/Analytics kommen
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      last30Days.push({
        date: date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
        activeContracts: Math.max(contracts.length - Math.floor(Math.random() * 3), 0),
        newContracts: Math.floor(Math.random() * 3),
        expiringContracts: Math.floor(Math.random() * 2)
      });
    }
    return last30Days;
  };

  // 🆕 Legal Pulse Verträge für die Dashboard-Anzeige (nur 5 neueste)
  const getRecentContractsForLegalPulse = () => {
    return contracts
      .filter(contract => contract.uploadedAt || contract.createdAt)
      .sort((a, b) => {
        const dateA = new Date(a.uploadedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.uploadedAt || b.createdAt || 0).getTime();
        return dateB - dateA; // neueste zuerst
      })
      .slice(0, 5);
  };

  // 🆕 Risk Score Helper Funktion - KEINE INLINE STYLES MEHR!
  const getRiskScoreInfo = (score: number | null | undefined) => {
    if (score === null || score === undefined) {
      return {
        label: 'Nicht bewertet',
        className: 'riskScoreUnknown'
      };
    }
    if (score <= 30) {
      return {
        label: 'Niedrig',
        className: 'riskScoreLow'
      };
    }
    if (score <= 60) {
      return {
        label: 'Mittel',
        className: 'riskScoreMedium'
      };
    }
    return {
      label: 'Hoch',
      className: 'riskScoreHigh'
    };
  };

  // Hilfsfunktionen
  const getProgressBarColor = () => {
    if (!userData || !userData.analysisCount || !userData.analysisLimit) return "";
    const usagePercentage = (userData.analysisCount / userData.analysisLimit) * 100;
    if (usagePercentage >= 100) return styles.progressRed;
    if (usagePercentage >= 80) return styles.progressOrange;
    return styles.progressGreen;
  };

  const countStatus = (status: string) => {
    return contracts.filter((c) => c && c.status === status).length;
  };

  const countWithReminder = () => {
    return contracts.filter((c) => c && c.reminder).length;
  };

  // 📊 Durchschnittliche Laufzeit (nicht mehr verwendet, aber behalten für später)
  // const averageLaufzeit = () => {
  //   const laufzeiten = contracts
  //     .filter((c) => c && c.laufzeit && typeof c.laufzeit === 'string')
  //     .map((c) => {
  //       const match = c.laufzeit.match(/(\d+)\s*(Jahr|Monat)/i);
  //       if (!match) return 0;
  //       const num = parseInt(match[1]);
  //       return match[2].toLowerCase().startsWith("jahr") ? num * 12 : num;
  //     })
  //     .filter((val) => val > 0);
  //   return laufzeiten.length > 0 ? Math.round(laufzeiten.reduce((a, b) => a + b, 0) / laufzeiten.length) : 0;
  // };

  // 💰 NEU: Abo-Verträge zählen
  const countSubscriptions = () => {
    return contracts.filter((c) => c && c.contractType === 'recurring').length;
  };

  // 💰 NEU: Monatliche Gesamtkosten berechnen
  const calculateMonthlyCosts = () => {
    const totalMonthly = contracts
      .filter((c) => c && c.contractType === 'recurring' && c.paymentAmount)
      .reduce((sum, c) => {
        const amount = c.paymentAmount || 0;
        const frequency = c.paymentFrequency;

        if (frequency === 'monthly') {
          return sum + amount;
        } else if (frequency === 'yearly') {
          return sum + (amount / 12);
        } else if (frequency === 'weekly') {
          return sum + ((amount * 52) / 12);
        }
        return sum;
      }, 0);

    return Math.round(totalMonthly * 100) / 100; // 2 Dezimalstellen
  };

  // 💰 NEU: Jährliche Gesamtkosten berechnen
  const calculateYearlyCosts = () => {
    return Math.round(calculateMonthlyCosts() * 12 * 100) / 100;
  };

  // 📄 NEU: Rechnungen zählen
  const countInvoices = () => {
    // Rechnungen = Dokumente mit "rechnung" oder "invoice" im Namen ODER contractType = one-time
    return contracts.filter((c) => {
      if (!c || !c.name) return false;
      const name = c.name.toLowerCase();
      return name.includes('rechnung') || name.includes('invoice') || c.contractType === 'one-time';
    }).length;
  };

  // 📄 NEU: Bezahlte Rechnungen zählen
  const countPaidInvoices = () => {
    return contracts.filter((c) => {
      if (!c || !c.name) return false;
      const name = c.name.toLowerCase();
      const isInvoice = name.includes('rechnung') || name.includes('invoice') || c.contractType === 'one-time';
      return isInvoice && c.paymentStatus === 'paid';
    }).length;
  };

  // 📄 NEU: Offene Rechnungen zählen
  const countUnpaidInvoices = () => {
    return contracts.filter((c) => {
      if (!c || !c.name) return false;
      const name = c.name.toLowerCase();
      const isInvoice = name.includes('rechnung') || name.includes('invoice') || c.contractType === 'one-time';
      return isInvoice && c.paymentStatus === 'unpaid';
    }).length;
  };

  const getContractCategory = (contract: Contract) => {
    if (!contract) return 'recent';
    
    const now = new Date().getTime();
    const thirtyDaysFromNow = now + (30 * 24 * 60 * 60 * 1000);
    
    if (contract.expiryDate) {
      const expiryTime = new Date(contract.expiryDate).getTime();
      if (expiryTime > now && expiryTime <= thirtyDaysFromNow) {
        return 'critical';
      }
    }
    
    if (contract.reminder) {
      return 'important';
    }
    
    return 'recent';
  };

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'critical':
        return {
          icon: '🔥',
          label: 'Erfordert Aufmerksamkeit',
          color: '#dc2626'
        };
      case 'important':
        return {
          icon: '⚡',
          label: 'Mit Erinnerung',
          color: '#f59e0b'
        };
      default:
        return {
          icon: '📅',
          label: 'Kürzlich hinzugefügt',
          color: '#6b7280'
        };
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [userResponse, contractsResponse] = await Promise.all([
          fetch("/api/auth/me", { credentials: "include" }),
          fetch("/api/contracts", { credentials: "include" })
        ]);
        
        const userDataResponse = await userResponse.json();
        const contractsData = await contractsResponse.json();

        setUserEmail(userDataResponse.email);
        setUserData(userDataResponse);

        // Handle both old format (array) and new format (object with contracts property)
        const contractsArray = Array.isArray(contractsData)
          ? contractsData
          : (contractsData.contracts || []);
        setContracts(contractsArray);

        const priorityList = calculatePriorityContracts(contractsArray);
        setPriorityContracts(priorityList);
        
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    const priorityList = calculatePriorityContracts(contracts);
    setPriorityContracts(priorityList);
  }, [contracts]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("status");
    if (status === "success") {
      setNotification({ message: "Dein Abo wurde erfolgreich aktiviert", type: "success" });
    } else if (status === "error") {
      setNotification({ message: "Es gab ein Problem beim Bezahlen. Bitte versuche es erneut.", type: "error" });
    }
  }, [location.search]);

  // Event Handlers
  const handleFileUpload = async () => {
    if (!file) return;
    
    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        const updatedContracts = [...contracts, data.contract];
        setContracts(updatedContracts);
        setShowModal(false);
        setFile(null);
        setNotification({ message: "Vertrag erfolgreich hochgeladen", type: "success" });
      } else {
        setNotification({ message: `Fehler beim Hochladen: ${data.message}`, type: "error" });
      }
    } catch (err) {
      console.error(err);
      setNotification({ message: "Ein unerwarteter Fehler ist aufgetreten", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Bist du sicher, dass du diesen Vertrag löschen möchtest?")) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        const updated = contracts.filter((c) => c._id !== id);
        setContracts(updated);
        setNotification({ message: "Vertrag erfolgreich gelöscht", type: "success" });
      } else {
        setNotification({ message: "Fehler beim Löschen", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setNotification({ message: "Ein unerwarteter Fehler ist aufgetreten", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleReminder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/contracts/${id}/reminder`, {
        method: "PATCH",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Fehler beim Umschalten des Reminders");

      const updated = contracts.map((c) =>
        c._id === id ? { ...c, reminder: !c.reminder } : c
      );
      setContracts(updated);
      setNotification({ message: "Erinnerung wurde aktualisiert", type: "success" });
    } catch (err) {
      console.error(err);
      setNotification({ message: "Fehler beim Umschalten des Reminders", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportICS = (contract: Contract, e: React.MouseEvent) => {
    e.stopPropagation();
    if (contract.expiryDate) {
      generateICS({ name: contract.name, expiryDate: contract.expiryDate });
      setNotification({ message: `Kalendereintrag für "${contract.name}" erstellt`, type: "success" });
    } else {
      setNotification({ message: "Kein Ablaufdatum vorhanden", type: "error" });
    }
  };

  const exportToCSV = () => {
    const headers = ["Name", "Laufzeit", "Kündigungsfrist", "Ablaufdatum", "Status"];
    const rows = contracts.map((c) => [
      `"${c.name || ""}"`,
      `"${c.laufzeit || ""}"`,
      `"${c.kuendigung || ""}"`,
      `"${c.expiryDate || ""}"`,
      `"${c.status || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((row) => row.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "vertraege_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setNotification({ message: "CSV-Export erfolgreich erstellt", type: "success" });
  };

  const exportAllICS = () => {
    const soonExpiring = contracts.filter((c) => {
      if (!c || !c.expiryDate) return false;
      const daysLeft = (new Date(c.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysLeft <= 30 && daysLeft > 0;
    });

    if (soonExpiring.length === 0) {
      setNotification({ message: "Keine bald ablaufenden Verträge vorhanden", type: "error" });
      return;
    }

    soonExpiring.forEach((c) => {
      generateICS({ name: c.name, expiryDate: c.expiryDate! });
    });

    setNotification({ message: `${soonExpiring.length} Kalendereinträge exportiert`, type: "success" });
  };

  // Chart Colors
  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280'];

  const { pieData, monthlyData, riskData, trendData } = getAnalyticsData();
  const recentLegalPulseContracts = getRecentContractsForLegalPulse();

  return (
    <div className={styles.dashboardContainer}>
      <Helmet>
        <title>Dashboard – Deine Vertragsübersicht | Contract AI</title>
        <meta name="description" content="Alle deine Verträge, Analysen und Optimierungen auf einen Blick. Verwalte deine Verträge zentral und behalte jederzeit volle Kontrolle mit Contract AI." />
        <meta name="keywords" content="Dashboard, Vertragsübersicht, Verträge verwalten, Vertragsanalyse, Contract AI" />
        <link rel="canonical" href="https://www.contract-ai.de/dashboard" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Dashboard – Deine Vertragsübersicht | Contract AI" />
        <meta property="og:description" content="Deine persönliche Schaltzentrale für Vertragsmanagement. Analysen, Fristen und Optimierungen zentral verwalten." />
        <meta property="og:url" content="https://contract-ai.de/dashboard" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Dashboard – Deine Vertragsübersicht | Contract AI" />
        <meta name="twitter:description" content="Alle Vertragsanalysen und -optimierungen an einem Ort. Contract AI macht Vertragsmanagement einfach und smart." />
        <meta name="twitter:image" content="https://contract-ai.de/og-image.jpg" />
      </Helmet>

      <div className={styles.dashboardHeader}>
        <h1>Vertragsübersicht</h1>
        
        {userEmail && (
          <div className={styles.userInfoContainer}>
            <svg className={styles.userIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor" fillOpacity="0.6"/>
              <path d="M12.0002 14.5C6.99016 14.5 2.91016 17.86 2.91016 22C2.91016 22.28 3.13016 22.5 3.41016 22.5H20.5902C20.8702 22.5 21.0902 22.28 21.0902 22C21.0902 17.86 17.0102 14.5 12.0002 14.5Z" fill="currentColor" fillOpacity="0.6"/>
            </svg>
            <span className={styles.userEmail}>{userEmail}</span>
          </div>
        )}
      </div>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Analyse-Limit Warnung */}
      {userData && 
       userData.analysisCount !== undefined && 
       userData.analysisLimit !== undefined && 
       userData.analysisCount >= userData.analysisLimit && 
       userData.subscriptionPlan !== "premium" && (
        <div className={styles.analysisLimitWarning}>
          <div className={styles.warningContent}>
            <svg className={styles.warningIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Du hast dein monatliches Analyse-Limit erreicht</span>
          </div>
          <button 
            className={`${styles.actionButton} ${styles.upgradeButton}`}
            onClick={() => navigate('/pricing')}
          >
            Jetzt upgraden
          </button>
        </div>
      )}

      {/* Analyse-Fortschrittsbalken */}
      {userData && 
       userData.analysisCount !== undefined && 
       userData.analysisLimit !== undefined && 
       userData.analysisLimit > 0 && (
        <div className={styles.analysisProgressContainer}>
          <div className={styles.progressInfo}>
            <span>{userData.analysisCount} / {userData.analysisLimit} Analysen genutzt</span>
          </div>
          <div className={styles.progressBarContainer}>
            <div 
              className={`${styles.progressBar} ${getProgressBarColor()}`}
              style={{ width: `${Math.min((userData.analysisCount / userData.analysisLimit) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Dashboard Content or Skeleton */}
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
      <div className={styles.dashboardContent}>
        {/* 🆕 Metrics Cards Grid - 6 Karten in logischer Reihenfolge */}
        <div className={styles.metricsGrid}>
          {/* Reihe 1: Allgemeine Übersicht */}

          {/* 1. Verträge insgesamt */}
          <div
            className={`${styles.metricCard} ${styles.clickableCard}`}
            onClick={() => navigate('/contracts')}
          >
            <div className={styles.metricHeader}>
              <div className={styles.metricIcon}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className={styles.metricHeaderActions}>
                <span className={styles.metricTrend}>+{contracts.filter(c => c.isGenerated).length}</span>
                <InfoTooltip {...tooltipTexts.metricsTotal} />
              </div>
            </div>
            <div className={styles.metricValue}>{contracts.length}</div>
            <div className={styles.metricLabel}>Verträge insgesamt</div>
            <div className={styles.metricSubtext}>
              {contracts.filter(c => c.isGenerated).length} KI-generiert
            </div>
          </div>

          {/* 2. Aktive Verträge */}
          <div
            className={`${styles.metricCard} ${styles.clickableCard}`}
            onClick={() => navigate('/contracts?filter=active')}
          >
            <div className={styles.metricHeader}>
              <div className={styles.metricIcon}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className={styles.metricHeaderActions}>
                <span className={styles.metricTrend}>
                  {countStatus("Aktiv") > 0 ? `${Math.round((countStatus("Aktiv") / contracts.length) * 100)}%` : '—'}
                </span>
                <InfoTooltip {...tooltipTexts.metricsActive} />
              </div>
            </div>
            <div className={styles.metricValue}>
              {isLoading ? "..." : countStatus("Aktiv")}
            </div>
            <div className={styles.metricLabel}>Aktive Verträge</div>
            <div className={styles.metricSubtext}>
              Derzeit gültig
            </div>
          </div>

          {/* 3. Bald ablaufend */}
          <div
            className={`${styles.metricCard} ${styles.clickableCard}`}
            onClick={() => navigate('/contracts?filter=expiring')}
          >
            <div className={styles.metricHeader}>
              <div className={styles.metricIcon}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 9V13L15 15" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className={styles.metricHeaderActions}>
                <span className={styles.metricTrend}>
                  {countStatus("Bald ablaufend") > 0 ? '⚠️' : '✅'}
                </span>
                <InfoTooltip {...tooltipTexts.metricsExpiring} />
              </div>
            </div>
            <div className={styles.metricValue}>
              {isLoading ? "..." : countStatus("Bald ablaufend")}
            </div>
            <div className={styles.metricLabel}>Bald ablaufend</div>
            <div className={styles.metricSubtext}>
              Nächste 30 Tage
            </div>
          </div>

          {/* Reihe 2: Spezifische Details */}

          {/* 4. Mit Erinnerung */}
          <div
            className={`${styles.metricCard} ${styles.clickableCard}`}
            onClick={() => navigate('/contracts?filter=reminder')}
          >
            <div className={styles.metricHeader}>
              <div className={styles.metricIcon}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className={styles.metricHeaderActions}>
                <span className={styles.metricTrend}>
                  {countWithReminder() > 0 ? `+${countWithReminder()}` : '—'}
                </span>
                <InfoTooltip {...tooltipTexts.metricsReminders} />
              </div>
            </div>
            <div className={styles.metricValue}>
              {isLoading ? "..." : countWithReminder()}
            </div>
            <div className={styles.metricLabel}>Mit Erinnerung</div>
            <div className={styles.metricSubtext}>
              Aktive Benachrichtigungen
            </div>
          </div>

          {/* 5. Abo-Verträge (kombiniert mit Kosten) */}
          <div
            className={`${styles.metricCard} ${styles.clickableCard}`}
            onClick={() => navigate('/contracts?filter=subscriptions')}
          >
            <div className={styles.metricHeader}>
              <div className={styles.metricIcon}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 6V12L16 16" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className={styles.metricHeaderActions}>
                <span className={styles.metricTrend}>
                  {calculateYearlyCosts() > 0 ? '💰' : '—'}
                </span>
                <InfoTooltip
                  title="Abo-Verträge"
                  content="Anzahl der wiederkehrenden Abo-Verträge mit monatlichen/jährlichen Kosten"
                />
              </div>
            </div>
            <div className={styles.metricValue}>
              {isLoading ? "..." : countSubscriptions()}
            </div>
            <div className={styles.metricLabel}>Abo-Verträge</div>
            <div className={styles.metricSubtext}>
              {calculateMonthlyCosts() > 0
                ? `${calculateMonthlyCosts().toLocaleString('de-DE')}€/Monat · ${calculateYearlyCosts().toLocaleString('de-DE')}€/Jahr`
                : 'Keine Abos'}
            </div>
          </div>

          {/* 6. Rechnungen */}
          <div
            className={`${styles.metricCard} ${styles.clickableCard}`}
            onClick={() => navigate('/contracts?filter=invoices')}
          >
            <div className={styles.metricHeader}>
              <div className={styles.metricIcon}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className={styles.metricHeaderActions}>
                <span className={styles.metricTrend}>
                  {countUnpaidInvoices() > 0 ? '⚠️' : '✅'}
                </span>
                <InfoTooltip
                  title="Rechnungen"
                  content="Anzahl der Rechnungen (bezahlt/offen)"
                />
              </div>
            </div>
            <div className={styles.metricValue}>
              {isLoading ? "..." : `${countPaidInvoices()}/${countInvoices()}`}
            </div>
            <div className={styles.metricLabel}>Rechnungen</div>
            <div className={styles.metricSubtext}>
              {countUnpaidInvoices() > 0 ? `${countUnpaidInvoices()} offen ⚠️` : 'Alle bezahlt ✅'}
            </div>
          </div>
        </div>

        {/* Generierte Verträge Sektion mit InfoTooltip */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>✨ KI-Generierte Verträge</h2>
            <InfoTooltip {...tooltipTexts.generatedContracts} />
          </div>
          <GeneratedContractsSection contracts={contracts} />
        </div>

        {/* 🔖 Gespeicherte Alternativen Sektion */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.headerContent}>
              <h2>🔖 Gespeicherte Alternativen</h2>
              <p>Ihre gemerkten Vertragsalternativen</p>
            </div>
          </div>
          <SavedAlternatives />
        </div>

        {/* 🆕 Legal Pulse Overview - KOMPLETT HELL */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.headerContent}>
              <h2>⚖️ Legal Pulse Analysen</h2>
              <p>Risikoanalyse der neuesten Verträge</p>
            </div>
            <div className={styles.headerActions}>
              <InfoTooltip {...tooltipTexts.legalPulse} />
              <button 
                className={`${styles.actionButton} ${styles.primaryButton}`}
                onClick={() => navigate('/legalpulse')}
              >
                <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 9V13" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2"/>
                  <path d="M10.29 3.86L1.82 18A2 2 0 003.64 21H20.36A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Alle Legal Pulse Analysen anzeigen
              </button>
            </div>
          </div>

          <div className={styles.legalPulseContainer}>
            {isLoading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Legal Pulse Analysen werden geladen...</p>
              </div>
            ) : recentLegalPulseContracts.length > 0 ? (
              <div className={styles.legalPulseGrid}>
                {recentLegalPulseContracts.map((contract) => {
                  const riskInfo = getRiskScoreInfo(contract.legalPulse?.riskScore);
                  
                  return (
                    <div 
                      key={contract._id} 
                      className={`${styles.legalPulseCard} ${styles.clickableCard}`}
                      onClick={() => navigate(`/legalpulse/${contract._id}`)}
                    >
                      <div className={styles.contractHeader}>
                        <div className={styles.contractTitleSection}>
                          <h3 className={styles.contractTitle}>{contract.name || "Unbenannter Vertrag"}</h3>
                          {contract.isGenerated && (
                            <span className={styles.generatedBadge}>✨ KI</span>
                          )}
                        </div>
                        <div className={`${styles.riskScoreBadge} ${styles[riskInfo.className]}`}>
                          {contract.legalPulse?.riskScore !== null && contract.legalPulse?.riskScore !== undefined 
                            ? contract.legalPulse.riskScore 
                            : '—'
                          }
                        </div>
                      </div>
                      
                      <div className={styles.contractMeta}>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Status:</span>
                          <span className={`${styles.statusBadge} ${styles[contract.status?.toLowerCase().replace(' ', '') || 'unknown']}`}>
                            {contract.status || "Unbekannt"}
                          </span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Risiko:</span>
                          <span className={`${styles.riskLabel} ${styles[riskInfo.className]}`}>
                            {riskInfo.label}
                          </span>
                        </div>
                      </div>

                      <div className={styles.contractDetails}>
                        {contract.laufzeit && (
                          <div className={styles.detailItem}>
                            <svg className={styles.detailIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="1.5"/>
                            </svg>
                            <span>{contract.laufzeit}</span>
                          </div>
                        )}
                        {contract.expiryDate && (
                          <div className={styles.detailItem}>
                            <svg className={styles.detailIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M16 2V6" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M8 2V6" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5"/>
                            </svg>
                            <span>{new Date(contract.expiryDate).toLocaleDateString('de-DE')}</span>
                          </div>
                        )}
                      </div>

                      <div className={styles.cardFooter}>
                        <span className={styles.uploadDate}>
                          Hochgeladen: {new Date(contract.uploadedAt || contract.createdAt || 0).toLocaleDateString('de-DE')}
                        </span>
                        <svg className={styles.arrowIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 9V13" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2"/>
                  <path d="M10.29 3.86L1.82 18A2 2 0 003.64 21H20.36A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <h3>Keine Legal Pulse Analysen verfügbar</h3>
                <p>Lade Verträge hoch, um automatische Risikoanalysen zu erhalten.</p>
                <button 
                  className={`${styles.actionButton} ${styles.primaryButton}`}
                  onClick={() => setShowModal(true)}
                >
                  <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5V19" stroke="currentColor" strokeWidth="2"/>
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Ersten Vertrag hochladen
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 📅 Upcoming Deadlines Widget */}
        <UpcomingDeadlinesWidget />

        {/* Priority Verträge Sektion */}
        <div className={styles.priorityContractsSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.headerContent}>
              <h2>📊 Wichtige Verträge</h2>
              <p>Verträge die Ihre Aufmerksamkeit erfordern und aktuelle Aktivitäten</p>
            </div>
            <div className={styles.headerActions}>
              <InfoTooltip {...tooltipTexts.priorityContracts} />
              <button 
                className={`${styles.actionButton} ${styles.primaryButton}`}
                onClick={() => navigate('/contracts')}
              >
                <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Alle {contracts.length} Verträge anzeigen
              </button>
            </div>
          </div>

          <div className={styles.tableContainer}>
            {isLoading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Daten werden geladen...</p>
              </div>
            ) : priorityContracts.length > 0 ? (
              <>
                {/* 🖥️ Desktop Table */}
                <div className={styles.tableWrapper}>
                  <table className={styles.contractTable}>
                    <thead>
                      <tr>
                        <th>Kategorie</th>
                        <th>Name</th>
                        <th>Laufzeit</th>
                        <th>Ablaufdatum</th>
                        <th>Status</th>
                        <th>Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priorityContracts.map((contract) => {
                        const category = getContractCategory(contract);
                        const categoryInfo = getCategoryInfo(category);

                        return (
                          <tr
                            key={contract._id}
                            className={styles.contractRow}
                            onClick={() => navigate(`/contracts/${contract._id}`)}
                          >
                            <td>
                              <div className={styles.categoryCell}>
                                <span
                                  className={styles.categoryIcon}
                                  style={{ color: categoryInfo.color }}
                                >
                                  {categoryInfo.icon}
                                </span>
                                <span
                                  className={styles.categoryLabel}
                                  style={{ color: categoryInfo.color }}
                                >
                                  {categoryInfo.label}
                                </span>
                              </div>
                            </td>
                            <td className={styles.nameCell}>
                              <div className={styles.contractNameCell}>
                                <span className={styles.contractName}>{contract.name || "—"}</span>
                                {contract.isGenerated && (
                                  <span className={styles.generatedBadge}>✨ KI</span>
                                )}
                              </div>
                            </td>
                            <td>{contract.laufzeit || "—"}</td>
                            <td>{contract.expiryDate || "—"}</td>
                            <td>
                              <div className={styles.statusCell}>
                                <span className={`${styles.statusBadge} ${styles[contract.status?.toLowerCase().replace(' ', '') || 'unknown']}`}>
                                  {contract.status || "Unbekannt"}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className={styles.actionButtonsNew}>
                                <button
                                  className={`${styles.actionBtn} ${styles.reminderBtn} ${contract.reminder ? styles.active : ''}`}
                                  onClick={(e) => toggleReminder(contract._id, e)}
                                  title={contract.reminder ? "Erinnerung deaktivieren" : "Erinnerung aktivieren"}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="1.5"/>
                                  </svg>
                                  <span>Reminder</span>
                                </button>
                                <button
                                  className={`${styles.actionBtn} ${styles.calendarBtn}`}
                                  onClick={(e) => handleExportICS(contract, e)}
                                  title="Zum Kalender hinzufügen"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M16 2V6" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M8 2V6" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5"/>
                                  </svg>
                                  <span>Kalender</span>
                                </button>
                                <button
                                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                  onClick={(e) => handleDelete(contract._id, e)}
                                  title="Vertrag löschen"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 6H5H21" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="1.5"/>
                                  </svg>
                                  <span>Löschen</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 📱 Mobile Card Layout */}
                <div className={styles.mobileContractList}>
                  {priorityContracts.map((contract) => {
                    const category = getContractCategory(contract);
                    const categoryInfo = getCategoryInfo(category);

                    return (
                      <div
                        key={contract._id}
                        className={styles.mobileContractCard}
                        onClick={() => navigate(`/contracts/${contract._id}`)}
                      >
                        <div className={styles.mobileCardHeader}>
                          <div className={styles.mobileCardTitle}>
                            <div className={styles.mobileCardName}>
                              {contract.name || "—"}
                              {contract.isGenerated && (
                                <span className={styles.generatedBadge}>✨ KI</span>
                              )}
                            </div>
                            <div className={styles.mobileCardCategory}>
                              <span style={{ color: categoryInfo.color }}>
                                {categoryInfo.icon}
                              </span>
                              <span style={{ color: categoryInfo.color }}>
                                {categoryInfo.label}
                              </span>
                            </div>
                          </div>
                          <span className={`${styles.statusBadge} ${styles[contract.status?.toLowerCase().replace(' ', '') || 'unknown']}`}>
                            {contract.status || "Unbekannt"}
                          </span>
                        </div>

                        <div className={styles.mobileCardDetails}>
                          <div className={styles.mobileDetailRow}>
                            <span className={styles.mobileDetailLabel}>Laufzeit</span>
                            <span className={styles.mobileDetailValue}>{contract.laufzeit || "—"}</span>
                          </div>
                          <div className={styles.mobileDetailRow}>
                            <span className={styles.mobileDetailLabel}>Ablaufdatum</span>
                            <span className={styles.mobileDetailValue}>{contract.expiryDate || "—"}</span>
                          </div>
                        </div>

                        <div className={styles.mobileCardActions}>
                          <button
                            className={`${styles.actionBtn} ${styles.reminderBtn} ${contract.reminder ? styles.active : ''}`}
                            onClick={(e) => toggleReminder(contract._id, e)}
                            title={contract.reminder ? "Erinnerung deaktivieren" : "Erinnerung aktivieren"}
                          >
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="1.5"/>
                            </svg>
                            <span>Reminder</span>
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.calendarBtn}`}
                            onClick={(e) => handleExportICS(contract, e)}
                            title="Zum Kalender hinzufügen"
                          >
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M16 2V6" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M8 2V6" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5"/>
                            </svg>
                            <span>Kalender</span>
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            onClick={(e) => handleDelete(contract._id, e)}
                            title="Vertrag löschen"
                          >
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M3 6H5H21" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="1.5"/>
                            </svg>
                            <span>Löschen</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <h3>🎉 Alles im grünen Bereich!</h3>
                <p>Derzeit sind keine kritischen Verträge vorhanden. Alle Ihre Verträge sind gut verwaltet.</p>
                <div className={styles.emptyStateActions}>
                  <button 
                    className={`${styles.actionButton} ${styles.primaryButton}`}
                    onClick={() => setShowModal(true)}
                  >
                    <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5V19" stroke="currentColor" strokeWidth="2"/>
                      <path d="M5 12H19" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Vertrag hinzufügen
                  </button>
                  <button 
                    className={`${styles.actionButton}`}
                    onClick={() => navigate('/contracts')}
                  >
                    Alle Verträge anzeigen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className={styles.quickActionsSection}>
          <div className={styles.sectionHeader}>
            <h3>⚡ Schnellaktionen</h3>
            <InfoTooltip {...tooltipTexts.quickActions} />
          </div>
          <div className={styles.quickActionsGrid}>
            <button 
              className={`${styles.quickActionCard} ${styles.primaryAction}`}
              onClick={() => setShowModal(true)}
            >
              <div className={styles.quickActionIcon}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19" stroke="currentColor" strokeWidth="2"/>
                  <path d="M5 12H19" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className={styles.quickActionContent}>
                <h4>Vertrag hinzufügen</h4>
                <p>PDF hochladen und analysieren</p>
              </div>
            </button>

            <button 
              className={styles.quickActionCard}
              onClick={() => navigate('/generate')}
            >
              <div className={styles.quickActionIcon}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15.09 8.26L22 9L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className={styles.quickActionContent}>
                <h4>KI-Generator</h4>
                <p>Vertrag mit KI erstellen</p>
              </div>
            </button>

            <button 
              className={styles.quickActionCard}
              onClick={() => navigate('/legalpulse')}
            >
              <div className={styles.quickActionIcon}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 9V13" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2"/>
                  <path d="M10.29 3.86L1.82 18A2 2 0 003.64 21H20.36A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className={styles.quickActionContent}>
                <h4>Legal Pulse</h4>
                <p>Risikoanalyse ansehen</p>
              </div>
            </button>

            <button 
              className={styles.quickActionCard}
              onClick={exportToCSV}
            >
              <div className={styles.quickActionIcon}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2"/>
                  <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className={styles.quickActionContent}>
                <h4>CSV Export</h4>
                <p>Daten exportieren</p>
              </div>
            </button>

            <button 
              className={styles.quickActionCard}
              onClick={exportAllICS}
            >
              <div className={styles.quickActionIcon}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 2V6" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 2V6" stroke="currentColor" strokeWidth="2"/>
                  <path d="M3 10H21" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className={styles.quickActionContent}>
                <h4>Kalender Export</h4>
                <p>Termine exportieren</p>
              </div>
            </button>
          </div>
        </div>

        {/* 📊 ENTERPRISE ANALYTICS GRID */}
        <div className={styles.analyticsGrid}>
          {/* Contract Status Distribution */}
          <div className={`${styles.analyticsCard} ${styles.statusChart}`}>
            <div className={styles.analyticsHeader}>
              <h3>📊 Statusverteilung</h3>
              <p>Übersicht aller Vertragsstatus</p>
              <InfoTooltip {...tooltipTexts.analyticsStatus} />
            </div>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [`${value} Verträge (${pieData.find(d => d.name === name)?.percentage}%)`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.chartLegend}>
                {pieData.map((entry, index) => (
                  <div key={entry.name} className={styles.legendItem}>
                    <span 
                      className={styles.legendColor} 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></span>
                    <span className={styles.legendLabel}>{entry.name}</span>
                    <span className={styles.legendValue}>{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly Upload Trend */}
          <div className={`${styles.analyticsCard} ${styles.uploadsChart}`}>
            <div className={styles.analyticsHeader}>
              <h3>📈 Upload-Trends</h3>
              <p>Monatliche Vertragsaktivitäten</p>
              <InfoTooltip {...tooltipTexts.analyticsUploads} />
            </div>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Bar dataKey="uploaded" fill="#3b82f6" name="Hochgeladen" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="generated" fill="#10b981" name="KI-Generiert" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Risk Score Distribution */}
          <div className={`${styles.analyticsCard} ${styles.riskChart}`}>
            <div className={styles.analyticsHeader}>
              <h3>⚠️ Risiko-Analyse</h3>
              <p>Legal Pulse Bewertungen</p>
              <InfoTooltip {...tooltipTexts.analyticsRisk} />
            </div>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={riskData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} />
                  <YAxis type="category" dataKey="category" stroke="#64748b" fontSize={11} width={100} />
                  <Tooltip 
                    formatter={(value: number) => [`${value} Verträge`, 'Anzahl']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 30-Day Contract Trend */}
          <div className={`${styles.analyticsCard} ${styles.trendChart}`}>
            <div className={styles.analyticsHeader}>
              <h3>📅 30-Tage Trend</h3>
              <p>Tägliche Vertragsaktivitäten</p>
              <InfoTooltip {...tooltipTexts.analyticsTrend} />
            </div>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData.slice(-14)}> {/* Nur letzte 14 Tage für bessere Lesbarkeit */}
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="activeContracts" 
                    stroke="#3b82f6" 
                    fill="rgba(59, 130, 246, 0.1)"
                    name="Aktive Verträge"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="newContracts" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Neue Verträge"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Modal bleibt gleich */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Vertrag hochladen</h2>
              <button 
                className={styles.modalCloseButton} 
                onClick={() => setShowModal(false)}
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2"/>
                  <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.fileUploadContainer}>
                <div className={styles.fileUploadArea}>
                  {file ? (
                    <div className={styles.fileSelected}>
                      <svg className={styles.fileIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <span className={styles.fileName}>{file.name}</span>
                      <button 
                        className={styles.removeFileButton}
                        onClick={() => setFile(null)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2"/>
                          <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2"/>
                        <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 3V15" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <h3>Datei hierher ziehen</h3>
                      <p>oder</p>
                      <label className={styles.fileInputLabel}>
                        Datei auswählen
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                          className={styles.fileInput}
                        />
                      </label>
                      <p className={styles.fileHint}>Nur PDF-Dateien werden unterstützt</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.secondaryButton}
                onClick={() => setShowModal(false)}
              >
                Abbrechen
              </button>
              <button
                className={`${styles.primaryButton} ${!file || isLoading ? styles.disabled : ''}`}
                onClick={handleFileUpload}
                disabled={!file || isLoading}
              >
                {isLoading ? (
                  <div className={styles.uploadingState}>
                    <div className={styles.uploadingText}>
                      <svg className={styles.uploadingIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span>Vertrag wird analysiert...</span>
                    </div>
                    <div className={styles.progressBarContainer}>
                      <div className={styles.progressBarFill}></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2"/>
                      <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 3V15" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    <span>Hochladen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}