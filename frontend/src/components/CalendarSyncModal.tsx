// src/components/CalendarSyncModal.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Smartphone,
  Monitor,
  Link2,
  Shield,
  Zap,
  Bug,
  CheckCircle,
  XCircle,
  Loader
} from 'lucide-react';
import axios from 'axios';
import styles from './CalendarSyncModal.module.css';

// Calendar provider icons as components
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const OutlookIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24">
    <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.152-.362.229-.61.229h-8.214v-7.09l1.817 1.33c.123.098.275.147.457.147.182 0 .334-.05.457-.147l6.33-4.603V7.387zM24 5.86c0-.04-.003-.07-.01-.088-.007-.018-.01-.027-.01-.027-.016-.082-.06-.143-.129-.184l-.01-.01c-.03-.024-.082-.054-.154-.09-.073-.036-.134-.054-.184-.054H14.938v1.802l.09.06 6.36 4.63.01.01c.056.03.127.05.21.05.098 0 .178-.026.24-.08.062-.053.108-.11.138-.17.03-.06.046-.12.046-.178l.01-5.67h-.002zM13.35 24c.072 0 .14-.014.206-.04.066-.027.115-.066.147-.118l.022-.01V13.67H0V23c0 .277.097.513.29.71.193.193.43.29.71.29h12.35zm-4.81-8.606c.568.46.852 1.09.852 1.893 0 .81-.287 1.447-.86 1.914-.573.466-1.357.7-2.352.7-.89 0-1.61-.154-2.162-.46v-1.297c.332.198.68.35 1.047.456.366.106.71.16 1.033.16.505 0 .896-.1 1.172-.302.276-.2.414-.494.414-.878 0-.378-.147-.68-.44-.908-.293-.227-.78-.48-1.46-.76-.716-.284-1.23-.613-1.543-.987-.313-.374-.47-.83-.47-1.37 0-.704.267-1.264.8-1.68.533-.417 1.242-.625 2.127-.625.81 0 1.578.174 2.305.523l-.444 1.153c-.66-.31-1.27-.466-1.83-.466-.42 0-.75.09-.985.27-.236.18-.354.428-.354.742 0 .366.12.654.36.867.24.212.677.45 1.31.714.494.195.89.39 1.186.58.295.19.54.413.733.67.193.256.332.546.415.87.084.323.125.693.125 1.11z"/>
    <path fill="#0078D4" d="M0 3c0-.277.097-.513.29-.71.193-.193.43-.29.71-.29h8.47l3.53 3.158V12H0V3z"/>
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24">
    <path fill="#000000" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

const ThunderbirdIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24">
    <path fill="#0A84FF" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>
);

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SyncLinks {
  download: string;
  webcal: string;
  google: string;
  outlook: string;
  apple: string;
  yahoo: string;
}

type TabType = 'google' | 'outlook' | 'apple' | 'other' | 'test';

export default function CalendarSyncModal({ isOpen, onClose }: CalendarSyncModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('google');
  const [syncLinks, setSyncLinks] = useState<SyncLinks | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [testResults, setTestResults] = useState<{
    icsEndpoint: 'idle' | 'loading' | 'success' | 'error';
    icsContent: 'idle' | 'loading' | 'success' | 'error';
    eventCount: number;
    errorMessage: string;
    rawResponse: string;
  }>({
    icsEndpoint: 'idle',
    icsContent: 'idle',
    eventCount: 0,
    errorMessage: '',
    rawResponse: ''
  });
  const [debugInfo, setDebugInfo] = useState<{
    contractCount: number;
    totalEvents: number;
    futureEvents: number;
    contracts: Array<{ name: string; expiryDate: string; hasExpiryDate: boolean }>;
    hint: string;
  } | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch sync links when modal opens
  useEffect(() => {
    if (isOpen && !syncLinks) {
      fetchSyncLinks();
    }
  }, [isOpen]);

  const fetchSyncLinks = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Bitte melden Sie sich an.');
        return;
      }

      const response = await axios.get<{ success: boolean; links: SyncLinks }>('/api/calendar/sync-links', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSyncLinks(response.data.links);
      } else {
        setError('Fehler beim Laden der Sync-Links');
      }
    } catch (err) {
      console.error('Error fetching sync links:', err);
      setError('Sync-Links konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const regenerateToken = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post<{ success: boolean; links: SyncLinks }>('/api/calendar/regenerate-sync-token', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSyncLinks(response.data.links);
      }
    } catch (err) {
      console.error('Error regenerating token:', err);
      setError('Token konnte nicht erneuert werden');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (field) setCopiedField(field);
      setTimeout(() => {
        setCopied(false);
        setCopiedField(null);
      }, 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Test ICS Endpoint
  const runIcsTest = async () => {
    if (!syncLinks) return;

    setTestResults(prev => ({
      ...prev,
      icsEndpoint: 'loading',
      icsContent: 'idle',
      errorMessage: '',
      rawResponse: ''
    }));

    try {
      // Test 1: Check if ICS endpoint responds
      const response = await fetch(syncLinks.download);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      setTestResults(prev => ({ ...prev, icsEndpoint: 'success' }));

      // Test 2: Check ICS content
      setTestResults(prev => ({ ...prev, icsContent: 'loading' }));
      const text = await response.text();

      // Store first 500 chars for preview
      setTestResults(prev => ({ ...prev, rawResponse: text.substring(0, 1000) }));

      // Validate ICS format
      if (!text.startsWith('BEGIN:VCALENDAR')) {
        throw new Error('Ungültiges ICS-Format: Datei beginnt nicht mit BEGIN:VCALENDAR');
      }

      if (!text.includes('END:VCALENDAR')) {
        throw new Error('Ungültiges ICS-Format: END:VCALENDAR fehlt');
      }

      // Count events
      const eventCount = (text.match(/BEGIN:VEVENT/g) || []).length;

      setTestResults(prev => ({
        ...prev,
        icsContent: 'success',
        eventCount
      }));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setTestResults(prev => ({
        ...prev,
        icsEndpoint: prev.icsEndpoint === 'loading' ? 'error' : prev.icsEndpoint,
        icsContent: prev.icsContent === 'loading' ? 'error' : prev.icsContent,
        errorMessage
      }));
    }
  };

  // Fetch debug info
  const fetchDebugInfo = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get<{
        success: boolean;
        debug: {
          contractCount: number;
          totalEvents: number;
          futureEvents: number;
          contracts: Array<{ name: string; expiryDate: string; hasExpiryDate: boolean }>;
          hint: string;
        };
      }>('/api/calendar/debug', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setDebugInfo(response.data.debug);
      }
    } catch (err) {
      console.error('Error fetching debug info:', err);
    }
  };

  // Regenerate events
  const regenerateEvents = async () => {
    setRegenerating(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post<{
        success: boolean;
        eventsGenerated: number;
      }>('/api/calendar/regenerate-events', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        alert(`${response.data.eventsGenerated} Events wurden generiert!`);
        // Refresh debug info
        await fetchDebugInfo();
      }
    } catch (err) {
      console.error('Error regenerating events:', err);
      alert('Fehler beim Regenerieren der Events');
    } finally {
      setRegenerating(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'google' as TabType, label: 'Google', icon: <GoogleIcon /> },
    { id: 'outlook' as TabType, label: 'Outlook', icon: <OutlookIcon /> },
    { id: 'apple' as TabType, label: 'Apple', icon: <AppleIcon /> },
    { id: 'other' as TabType, label: 'Andere', icon: <ThunderbirdIcon /> },
    { id: 'test' as TabType, label: 'Test', icon: <Bug size={20} /> },
  ];

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className={styles.loadingState}>
          <RefreshCw className={styles.spinner} size={32} />
          <p>Lade Sync-Links...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.errorState}>
          <AlertCircle size={32} />
          <p>{error}</p>
          <button onClick={fetchSyncLinks} className={styles.retryBtn}>
            Erneut versuchen
          </button>
        </div>
      );
    }

    if (!syncLinks) return null;

    switch (activeTab) {
      case 'google':
        return (
          <div className={styles.tabContent}>
            <div className={styles.instructionHeader}>
              <GoogleIcon />
              <h3>Google Kalender verbinden</h3>
            </div>

            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <h4>URL kopieren</h4>
                  <p>Kopieren Sie diese Kalender-URL:</p>
                  <div className={styles.urlBox}>
                    <code>{syncLinks.download}</code>
                    <motion.button
                      onClick={() => copyToClipboard(syncLinks.download, 'google-url')}
                      className={styles.copyBtn}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {copiedField === 'google-url' ? <Check size={16} /> : <Copy size={16} />}
                    </motion.button>
                  </div>
                  {copiedField === 'google-url' && <span className={styles.copiedHint}>✓ URL kopiert!</span>}
                </div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <h4>Google Kalender öffnen</h4>
                  <p>Klicken Sie auf den Button unten, um Google Kalender zu öffnen:</p>
                  <motion.button
                    className={styles.primaryBtn}
                    onClick={() => openLink('https://calendar.google.com/calendar/u/0/r/settings/addbyurl')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <GoogleIcon />
                    <span>Google Kalender Einstellungen öffnen</span>
                    <ExternalLink size={16} />
                  </motion.button>
                </div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepContent}>
                  <h4>URL einfügen</h4>
                  <p>Fügen Sie die kopierte URL in das Feld "URL des Kalenders" ein und klicken Sie auf "Kalender hinzufügen".</p>
                </div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepNumber}>
                  <Check size={16} />
                </div>
                <div className={styles.stepContent}>
                  <h4>Fertig!</h4>
                  <p>Ihre Vertragstermine werden automatisch synchronisiert (Updates alle 15-60 Min).</p>
                </div>
              </div>
            </div>

            <div className={styles.infoBox}>
              <Shield size={18} />
              <div>
                <strong>Sicher & Privat</strong>
                <p>Contract AI erstellt einen separaten Kalender. Ihre bestehenden Termine werden nicht verändert.</p>
              </div>
            </div>
          </div>
        );

      case 'outlook':
        return (
          <div className={styles.tabContent}>
            <div className={styles.instructionHeader}>
              <OutlookIcon />
              <h3>Outlook Kalender verbinden</h3>
            </div>

            <div className={styles.deviceOptions}>
              <div className={styles.deviceOption}>
                <div className={styles.deviceIcon}>
                  <Monitor size={20} />
                </div>
                <div className={styles.deviceInfo}>
                  <h4>Outlook.com / Microsoft 365</h4>
                  <p>Web-Version von Outlook</p>
                </div>
              </div>
            </div>

            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <h4>Klicken Sie auf den Button</h4>
                  <p>Der Link öffnet Outlook und fügt den Contract AI Kalender automatisch hinzu.</p>
                  <motion.button
                    className={styles.primaryBtn}
                    onClick={() => openLink(syncLinks.outlook)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ background: 'linear-gradient(135deg, #0078D4, #106EBE)' }}
                  >
                    <OutlookIcon />
                    <span>In Outlook öffnen</span>
                    <ExternalLink size={16} />
                  </motion.button>
                </div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <h4>Abonnement bestätigen</h4>
                  <p>Bestätigen Sie das Hinzufügen des Kalenders in Outlook.</p>
                </div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepNumber}>
                  <Check size={16} />
                </div>
                <div className={styles.stepContent}>
                  <h4>Fertig!</h4>
                  <p>Der Contract AI Kalender erscheint unter "Andere Kalender" in Outlook.</p>
                </div>
              </div>
            </div>

            <div className={styles.alternativeMethod}>
              <h4>Alternative: Desktop Outlook</h4>
              <p>Für Outlook Desktop kopieren Sie diese URL:</p>
              <div className={styles.urlBox}>
                <code>{syncLinks.download}</code>
                <button
                  onClick={() => copyToClipboard(syncLinks.download)}
                  className={styles.copyBtn}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <p className={styles.hint}>
                Outlook → Datei → Kontoeinstellungen → Internetkalender → Neu
              </p>
            </div>
          </div>
        );

      case 'apple':
        return (
          <div className={styles.tabContent}>
            <div className={styles.instructionHeader}>
              <AppleIcon />
              <h3>Apple Kalender verbinden</h3>
            </div>

            <div className={styles.deviceOptions}>
              <div
                className={`${styles.deviceOption} ${styles.clickable}`}
                onClick={() => openLink(syncLinks.apple)}
              >
                <div className={styles.deviceIcon}>
                  <Monitor size={20} />
                </div>
                <div className={styles.deviceInfo}>
                  <h4>Mac</h4>
                  <p>Kalender App</p>
                </div>
                <ChevronRight size={20} />
              </div>

              <div
                className={`${styles.deviceOption} ${styles.clickable}`}
                onClick={() => openLink(syncLinks.apple)}
              >
                <div className={styles.deviceIcon}>
                  <Smartphone size={20} />
                </div>
                <div className={styles.deviceInfo}>
                  <h4>iPhone / iPad</h4>
                  <p>iOS Kalender</p>
                </div>
                <ChevronRight size={20} />
              </div>
            </div>

            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <h4>Klicken Sie auf den Button</h4>
                  <p>Der webcal://-Link öffnet automatisch die Kalender-App.</p>
                  <motion.button
                    className={styles.primaryBtn}
                    onClick={() => openLink(syncLinks.apple)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ background: 'linear-gradient(135deg, #1d1d1f, #424245)' }}
                  >
                    <AppleIcon />
                    <span>Kalender-Abo öffnen</span>
                    <ExternalLink size={16} />
                  </motion.button>
                </div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <h4>Abonnieren bestätigen</h4>
                  <p>Klicken Sie auf "Abonnieren" im Popup-Dialog.</p>
                </div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepNumber}>
                  <Check size={16} />
                </div>
                <div className={styles.stepContent}>
                  <h4>Fertig!</h4>
                  <p>Contract AI Termine erscheinen jetzt in Ihrer Kalender-App.</p>
                </div>
              </div>
            </div>

            <div className={styles.infoBox}>
              <Zap size={18} />
              <div>
                <strong>iCloud Sync</strong>
                <p>Wenn Sie iCloud Kalender nutzen, wird der Contract AI Kalender automatisch auf allen Ihren Apple-Geräten synchronisiert.</p>
              </div>
            </div>
          </div>
        );

      case 'other':
        return (
          <div className={styles.tabContent}>
            <div className={styles.instructionHeader}>
              <Link2 size={24} />
              <h3>Andere Kalender-Apps</h3>
            </div>

            <p className={styles.introText}>
              Kopieren Sie die ICS-URL und fügen Sie sie in Ihrer Kalender-App als Abonnement hinzu.
            </p>

            <div className={styles.urlSection}>
              <label>ICS-Feed URL (iCalendar)</label>
              <div className={styles.urlBox}>
                <code>{syncLinks.download}</code>
                <button
                  onClick={() => copyToClipboard(syncLinks.download)}
                  className={styles.copyBtn}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              {copied && <span className={styles.copiedHint}>Link kopiert!</span>}
            </div>

            <div className={styles.urlSection}>
              <label>Webcal-Link (Auto-Updates)</label>
              <div className={styles.urlBox}>
                <code>{syncLinks.webcal}</code>
                <button
                  onClick={() => copyToClipboard(syncLinks.webcal)}
                  className={styles.copyBtn}
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <div className={styles.appInstructions}>
              <h4>Anleitungen für beliebte Apps:</h4>

              <div className={styles.appGuide}>
                <ThunderbirdIcon />
                <div>
                  <strong>Thunderbird</strong>
                  <p>Datei → Neu → Kalender → Im Netzwerk → iCalendar → URL einfügen</p>
                </div>
              </div>

              <div className={styles.appGuide}>
                <Calendar size={24} />
                <div>
                  <strong>Yahoo Kalender</strong>
                  <p>
                    <a href={syncLinks.yahoo} target="_blank" rel="noopener noreferrer">
                      Direkt zu Yahoo Kalender <ExternalLink size={12} />
                    </a>
                  </p>
                </div>
              </div>

              <div className={styles.appGuide}>
                <Smartphone size={24} />
                <div>
                  <strong>Android</strong>
                  <p>Einstellungen → Konten → Konto hinzufügen → Kalenderabonnement</p>
                </div>
              </div>
            </div>

            <motion.button
              className={styles.downloadBtn}
              onClick={() => openLink(syncLinks.download)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Calendar size={18} />
              <span>ICS-Datei herunterladen</span>
            </motion.button>
          </div>
        );

      case 'test':
        return (
          <div className={styles.tabContent}>
            <div className={styles.instructionHeader}>
              <Bug size={24} />
              <h3>Test & Debug</h3>
            </div>

            <div className={styles.testSection}>
              <div className={styles.testWarning}>
                <AlertCircle size={18} />
                <p>Dieser Tab ist nur für Entwickler/Admins. Hier kannst du die ICS-Integration testen.</p>
              </div>

              {/* All URLs */}
              <div className={styles.debugUrls}>
                <h4>Generierte URLs</h4>

                <div className={styles.debugUrlItem}>
                  <label>ICS Download URL:</label>
                  <div className={styles.urlBox}>
                    <code>{syncLinks.download}</code>
                    <button
                      onClick={() => copyToClipboard(syncLinks.download, 'download')}
                      className={styles.copyBtn}
                    >
                      {copiedField === 'download' ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div className={styles.debugUrlItem}>
                  <label>Webcal URL:</label>
                  <div className={styles.urlBox}>
                    <code>{syncLinks.webcal}</code>
                    <button
                      onClick={() => copyToClipboard(syncLinks.webcal, 'webcal')}
                      className={styles.copyBtn}
                    >
                      {copiedField === 'webcal' ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div className={styles.debugUrlItem}>
                  <label>Google Calendar URL:</label>
                  <div className={styles.urlBox}>
                    <code>{syncLinks.google}</code>
                    <button
                      onClick={() => copyToClipboard(syncLinks.google, 'google')}
                      className={styles.copyBtn}
                    >
                      {copiedField === 'google' ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div className={styles.debugUrlItem}>
                  <label>Outlook URL:</label>
                  <div className={styles.urlBox}>
                    <code>{syncLinks.outlook}</code>
                    <button
                      onClick={() => copyToClipboard(syncLinks.outlook, 'outlook')}
                      className={styles.copyBtn}
                    >
                      {copiedField === 'outlook' ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Debug & Regenerate */}
              <div className={styles.debugSection}>
                <h4>Events Diagnostik</h4>
                <div className={styles.debugActions}>
                  <motion.button
                    className={styles.debugBtn}
                    onClick={fetchDebugInfo}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <AlertCircle size={18} />
                    <span>Debug-Info laden</span>
                  </motion.button>

                  <motion.button
                    className={styles.regenerateBtn2}
                    onClick={regenerateEvents}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={regenerating}
                  >
                    {regenerating ? (
                      <>
                        <Loader size={18} className={styles.spinner} />
                        <span>Generiere...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={18} />
                        <span>Events regenerieren</span>
                      </>
                    )}
                  </motion.button>
                </div>

                {debugInfo && (
                  <div className={styles.debugResults}>
                    <div className={styles.debugStat}>
                      <strong>Verträge:</strong> {debugInfo.contractCount}
                    </div>
                    <div className={styles.debugStat}>
                      <strong>Gesamt Events:</strong> {debugInfo.totalEvents}
                    </div>
                    <div className={styles.debugStat}>
                      <strong>Zukünftige Events (im ICS):</strong> {debugInfo.futureEvents}
                    </div>

                    {debugInfo.futureEvents === 0 && (
                      <div className={styles.debugWarning}>
                        <AlertCircle size={16} />
                        <span>{debugInfo.hint}</span>
                      </div>
                    )}

                    <div className={styles.debugContracts}>
                      <strong>Verträge mit Ablaufdatum:</strong>
                      <ul>
                        {debugInfo.contracts.map((c, i) => (
                          <li key={i} className={c.hasExpiryDate ? styles.hasDate : styles.noDate}>
                            {c.name}: {c.hasExpiryDate ? new Date(c.expiryDate).toLocaleDateString('de-DE') : 'KEIN DATUM'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Test Button */}
              <div className={styles.testActions}>
                <motion.button
                  className={styles.testBtn}
                  onClick={runIcsTest}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={testResults.icsEndpoint === 'loading' || testResults.icsContent === 'loading'}
                >
                  {(testResults.icsEndpoint === 'loading' || testResults.icsContent === 'loading') ? (
                    <>
                      <Loader size={18} className={styles.spinner} />
                      <span>Teste...</span>
                    </>
                  ) : (
                    <>
                      <Bug size={18} />
                      <span>ICS-Endpoint testen</span>
                    </>
                  )}
                </motion.button>
              </div>

              {/* Test Results */}
              {(testResults.icsEndpoint !== 'idle' || testResults.icsContent !== 'idle') && (
                <div className={styles.testResults}>
                  <h4>Test-Ergebnisse</h4>

                  <div className={styles.testResultItem}>
                    <div className={styles.testResultIcon}>
                      {testResults.icsEndpoint === 'loading' && <Loader size={18} className={styles.spinner} />}
                      {testResults.icsEndpoint === 'success' && <CheckCircle size={18} className={styles.successIcon} />}
                      {testResults.icsEndpoint === 'error' && <XCircle size={18} className={styles.errorIcon} />}
                    </div>
                    <div className={styles.testResultText}>
                      <strong>ICS-Endpoint erreichbar</strong>
                      <span>{testResults.icsEndpoint === 'success' ? 'OK' : testResults.icsEndpoint === 'error' ? 'Fehler' : 'Teste...'}</span>
                    </div>
                  </div>

                  <div className={styles.testResultItem}>
                    <div className={styles.testResultIcon}>
                      {testResults.icsContent === 'loading' && <Loader size={18} className={styles.spinner} />}
                      {testResults.icsContent === 'success' && <CheckCircle size={18} className={styles.successIcon} />}
                      {testResults.icsContent === 'error' && <XCircle size={18} className={styles.errorIcon} />}
                      {testResults.icsContent === 'idle' && <div className={styles.idleIcon} />}
                    </div>
                    <div className={styles.testResultText}>
                      <strong>ICS-Format gültig</strong>
                      <span>
                        {testResults.icsContent === 'success'
                          ? `OK - ${testResults.eventCount} Event(s) gefunden`
                          : testResults.icsContent === 'error'
                          ? 'Fehler'
                          : testResults.icsContent === 'loading'
                          ? 'Prüfe...'
                          : '-'}
                      </span>
                    </div>
                  </div>

                  {testResults.errorMessage && (
                    <div className={styles.testError}>
                      <AlertCircle size={16} />
                      <span>{testResults.errorMessage}</span>
                    </div>
                  )}

                  {testResults.rawResponse && (
                    <div className={styles.rawResponse}>
                      <label>ICS-Inhalt (erste 1000 Zeichen):</label>
                      <pre>{testResults.rawResponse}</pre>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Links */}
              <div className={styles.quickTestLinks}>
                <h4>Schnelltests</h4>
                <div className={styles.quickLinkGrid}>
                  <motion.button
                    className={styles.quickLinkBtn}
                    onClick={() => openLink(syncLinks.download)}
                    whileHover={{ scale: 1.02 }}
                  >
                    <Calendar size={16} />
                    <span>ICS im Browser öffnen</span>
                  </motion.button>

                  <motion.button
                    className={styles.quickLinkBtn}
                    onClick={() => openLink(syncLinks.google)}
                    whileHover={{ scale: 1.02 }}
                  >
                    <GoogleIcon />
                    <span>Google testen</span>
                  </motion.button>

                  <motion.button
                    className={styles.quickLinkBtn}
                    onClick={() => openLink(syncLinks.outlook)}
                    whileHover={{ scale: 1.02 }}
                  >
                    <OutlookIcon />
                    <span>Outlook testen</span>
                  </motion.button>

                  <motion.button
                    className={styles.quickLinkBtn}
                    onClick={() => openLink(syncLinks.apple)}
                    whileHover={{ scale: 1.02 }}
                  >
                    <AppleIcon />
                    <span>Apple testen</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.modal}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: isMobile ? '100%' : '600px',
            width: isMobile ? 'calc(100% - 32px)' : '600px',
            maxHeight: isMobile ? '90vh' : '85vh',
          }}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <div className={styles.headerIcon}>
                <Calendar size={24} />
              </div>
              <div>
                <h2>Kalender synchronisieren</h2>
                <p>Verbinden Sie Contract AI mit Ihrem Kalender</p>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className={styles.content}>
            {renderTabContent()}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button
              className={styles.regenerateBtn}
              onClick={regenerateToken}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? styles.spinner : ''} />
              <span>Neuen Link generieren</span>
            </button>
            <p className={styles.footerHint}>
              Generieren Sie einen neuen Link, falls Sie den alten deaktivieren möchten.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
