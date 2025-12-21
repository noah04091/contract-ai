import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  User,
  Building2,
  CreditCard,
  HelpCircle,
  LogOut,
  FileText,
  Clock,
  ArrowRight,
  Calendar,
  PenTool,
  Sun,
  Moon,
  RefreshCw,
  Settings,
  Mail,
  BellRing,
  Monitor,
  X,
  Save
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import styles from './DashboardLayout.module.css';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.contract-ai.de';

interface UserData {
  email?: string;
  subscriptionPlan?: string;
  profilePicture?: string;
}

interface SearchResult {
  _id: string;
  name: string;
  status?: string;
  date?: string;
}

interface Notification {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
  time: string;
  category: string;
  contractId?: string;
  actionUrl?: string;
}

interface NotificationSettings {
  email: {
    enabled: boolean;
    contractDeadlines: boolean;
    legalPulse: boolean;
    analysisComplete: boolean;
    signatureUpdates: boolean;
    weeklyReport: boolean;
  };
  push: {
    enabled: boolean;
    contractDeadlines: boolean;
    legalPulse: boolean;
    analysisComplete: boolean;
    signatureUpdates: boolean;
  };
  inApp: {
    enabled: boolean;
    contractDeadlines: boolean;
    legalPulse: boolean;
    analysisComplete: boolean;
    signatureUpdates: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  deadlineReminders: {
    days7: boolean;
    days3: boolean;
    days1: boolean;
    daysSame: boolean;
  };
}

interface TopBarProps {
  onMenuClick: () => void;
  user?: UserData | null;
}

export default function TopBar({ onMenuClick, user }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationStats, setNotificationStats] = useState({ unread: 0, warnings: 0 });
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'channels' | 'types' | 'schedule'>('channels');
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Auth headers helper
  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  // Lade Benachrichtigungen beim Mount
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setIsLoadingNotifications(true);
        setNotificationError(null);
        const response = await fetch(`${API_BASE}/api/dashboard/notifications?limit=10`, {
          headers: getAuthHeaders(),
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setNotifications(data.notifications || []);
            setNotificationStats(data.stats || { unread: 0, warnings: 0 });
          } else {
            setNotificationError('Fehler beim Laden');
          }
        } else {
          setNotificationError('Verbindungsfehler');
        }
      } catch (error) {
        console.error('Fehler beim Laden der Benachrichtigungen:', error);
        setNotificationError('Netzwerkfehler');
      } finally {
        setIsLoadingNotifications(false);
      }
    };

    fetchNotifications();

    // Refresh alle 2 Minuten
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, []);

  // Server-side Search mit Debounce
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/dashboard/notifications/search?q=${encodeURIComponent(query)}&limit=6`,
        {
          headers: getAuthHeaders(),
          credentials: 'include'
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSearchResults(data.results || []);
        }
      }
    } catch (error) {
      console.error('Fehler bei der Suche:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (searchQuery.trim()) {
      setIsSearching(true);
      searchDebounceRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 300); // 300ms debounce
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setShowSearch(true);
      }

      // ESC to close search
      if (event.key === 'Escape') {
        setShowSearch(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keyboard navigation in search results
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleSelectContract(searchResults[selectedIndex]._id);
        }
        break;
    }
  };

  const handleSelectContract = (contractId: string) => {
    setShowSearch(false);
    setSearchQuery('');
    navigate(`/contracts/${contractId}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleSelectContract(searchResults[selectedIndex]._id);
    } else if (searchQuery.trim()) {
      navigate(`/contracts?search=${encodeURIComponent(searchQuery)}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch(`${API_BASE}/api/dashboard/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      setNotificationStats(prev => ({ ...prev, unread: 0 }));
    } catch (error) {
      console.error('Fehler beim Markieren:', error);
    }
  };

  // Notification Settings laden
  const loadNotificationSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const response = await fetch(`${API_BASE}/api/dashboard/notifications/settings`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotificationSettings(data.settings);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // Notification Settings speichern
  const saveNotificationSettings = async () => {
    if (!notificationSettings) return;

    setIsSavingSettings(true);
    try {
      const response = await fetch(`${API_BASE}/api/dashboard/notifications/settings`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ settings: notificationSettings })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotificationSettings(data.settings);
          setShowSettingsModal(false);
        }
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Settings Modal öffnen
  const handleOpenSettings = () => {
    setShowNotifications(false);
    loadNotificationSettings();
    setShowSettingsModal(true);
  };

  // Toggle für verschachtelte Settings
  const updateSetting = (
    category: 'email' | 'push' | 'inApp' | 'quietHours' | 'deadlineReminders',
    key: string,
    value: boolean | string
  ) => {
    if (!notificationSettings) return;

    setNotificationSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [category]: {
          ...prev[category],
          [key]: value
        }
      };
    });
  };

  const handleNotificationClick = (notification: Notification) => {
    setShowNotifications(false);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getNotificationIcon = (type: string, category?: string) => {
    if (category === 'calendar') {
      return <Calendar size={16} strokeWidth={2} />;
    }
    if (category === 'signature') {
      return <PenTool size={16} strokeWidth={2} />;
    }
    switch (type) {
      case 'warning':
        return <AlertTriangle size={16} strokeWidth={2} />;
      case 'success':
        return <CheckCircle size={16} strokeWidth={2} />;
      default:
        return <Info size={16} strokeWidth={2} />;
    }
  };

  const userName = user?.email?.split('@')[0] || 'User';
  const userInitial = userName.charAt(0).toUpperCase();
  const userPlan = user?.subscriptionPlan || 'Free';

  return (
    <>
      <header className={styles.topBar}>
        {/* Left side */}
        <div className={styles.topBarLeft}>
          <button className={styles.menuButton} onClick={onMenuClick} aria-label="Toggle menu">
            <Menu size={20} strokeWidth={2} />
          </button>

          {/* Search Bar */}
          <div className={styles.searchContainer}>
            <button className={styles.searchButton} onClick={() => setShowSearch(true)}>
              <Search size={18} strokeWidth={2} />
              <span className={styles.searchPlaceholder}>Verträge suchen...</span>
            </button>
          </div>
        </div>

        {/* Right side */}
        <div className={styles.topBarRight}>
          {/* Theme Toggle */}
          <div className={styles.topBarItem}>
            <button
              className={styles.iconButton}
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Light Mode aktivieren' : 'Dark Mode aktivieren'}
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun size={20} strokeWidth={2} />
              ) : (
                <Moon size={20} strokeWidth={2} />
              )}
            </button>
          </div>

          {/* Notifications */}
          <div className={styles.topBarItem} ref={notificationRef}>
            <button
              className={`${styles.iconButton} ${showNotifications ? styles.iconButtonActive : ''}`}
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notifications"
            >
              <Bell size={20} strokeWidth={2} />
              {notificationStats.unread > 0 && (
                <span className={styles.notificationDot} />
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                  <span className={styles.dropdownTitle}>
                    Benachrichtigungen
                    {notificationStats.unread > 0 && (
                      <span className={styles.notificationBadge}>{notificationStats.unread}</span>
                    )}
                  </span>
                  <div className={styles.dropdownHeaderActions}>
                    {notificationStats.unread > 0 && (
                      <button className={styles.dropdownAction} onClick={handleMarkAllRead}>
                        Alle lesen
                      </button>
                    )}
                    <button
                      className={styles.dropdownActionIcon}
                      onClick={handleOpenSettings}
                      title="Benachrichtigungseinstellungen"
                    >
                      <Settings size={16} />
                    </button>
                  </div>
                </div>
                <div className={styles.dropdownList}>
                  {isLoadingNotifications ? (
                    <div className={styles.notificationLoading}>
                      {[1, 2, 3].map(i => (
                        <div key={i} className={styles.skeletonNotification}>
                          <div className={`${styles.skeleton} ${styles.skeletonAvatar}`} />
                          <div className={styles.skeletonContent}>
                            <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
                            <div className={`${styles.skeleton} ${styles.skeletonText}`} />
                            <div className={`${styles.skeleton} ${styles.skeletonTime}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : notificationError ? (
                    <div className={styles.notificationError}>
                      <AlertCircle size={24} strokeWidth={1.5} />
                      <span>{notificationError}</span>
                      <button
                        className={styles.retryButton}
                        onClick={() => window.location.reload()}
                      >
                        <RefreshCw size={14} />
                        Erneut versuchen
                      </button>
                    </div>
                  ) : notifications.length > 0 ? (
                    notifications.map(notification => (
                      <button
                        key={notification.id}
                        className={styles.notificationItem}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className={`${styles.notificationIcon} ${styles[`notification${notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}`]}`}>
                          {getNotificationIcon(notification.type, notification.category)}
                        </div>
                        <div className={styles.notificationContent}>
                          <div className={styles.notificationTitle}>{notification.title}</div>
                          <div className={styles.notificationMessage}>{notification.message}</div>
                          <div className={styles.notificationTime}>{notification.time}</div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className={styles.notificationEmpty}>
                      <Bell size={24} strokeWidth={1.5} />
                      <span>Keine neuen Benachrichtigungen</span>
                    </div>
                  )}
                </div>
                <div className={styles.dropdownFooter}>
                  <Link to="/calendar" className={styles.dropdownFooterLink}>
                    Alle Benachrichtigungen
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className={styles.topBarItem} ref={userMenuRef}>
            <button
              className={styles.userButton}
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className={styles.userAvatar}>
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt={userName} className={styles.userAvatarImage} />
                ) : (
                  userInitial
                )}
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{userName}</span>
                <span className={styles.userPlan}>{userPlan}</span>
              </div>
              <ChevronDown size={16} strokeWidth={2} />
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownUserHeader}>
                  <div className={styles.dropdownUserAvatar}>
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt={userName} className={styles.userAvatarImage} />
                    ) : (
                      userInitial
                    )}
                  </div>
                  <div>
                    <div className={styles.dropdownUserName}>{userName}</div>
                    <div className={styles.dropdownUserEmail}>{user?.email}</div>
                  </div>
                </div>
                <div className={styles.dropdownDivider} />
                <div className={styles.dropdownList}>
                  <Link to="/me" className={styles.dropdownItem} onClick={() => setShowUserMenu(false)}>
                    <User size={16} strokeWidth={1.75} />
                    <span>Mein Profil</span>
                  </Link>
                  <Link to="/company-profile" className={styles.dropdownItem} onClick={() => setShowUserMenu(false)}>
                    <Building2 size={16} strokeWidth={1.75} />
                    <span>Unternehmen</span>
                  </Link>
                  <Link to="/pricing" className={styles.dropdownItem} onClick={() => setShowUserMenu(false)}>
                    <CreditCard size={16} strokeWidth={1.75} />
                    <span>Abo verwalten</span>
                  </Link>
                </div>
                <div className={styles.dropdownDivider} />
                <div className={styles.dropdownList}>
                  <Link to="/hilfe" className={styles.dropdownItem} onClick={() => setShowUserMenu(false)}>
                    <HelpCircle size={16} strokeWidth={1.75} />
                    <span>Hilfe & Support</span>
                  </Link>
                </div>
                <div className={styles.dropdownDivider} />
                <button className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`} onClick={handleLogout}>
                  <LogOut size={16} strokeWidth={1.75} />
                  <span>Abmelden</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {showSearch && (
        <div className={styles.searchModal} onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
          <div className={styles.searchModalContent} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSearch}>
              <div className={styles.searchModalInput}>
                <Search size={20} strokeWidth={2} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Vertrag suchen..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  autoFocus
                />
              </div>
            </form>

            {/* Search Results */}
            {searchQuery.trim() && (
              <div className={styles.searchResults}>
                {isSearching ? (
                  <div className={styles.searchResultsLoading}>
                    <div className={styles.searchSpinner} />
                    <span>Suche...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    <div className={styles.searchResultsHeader}>
                      <FileText size={14} />
                      <span>Verträge ({searchResults.length})</span>
                    </div>
                    {searchResults.map((contract, index) => (
                      <button
                        key={contract._id}
                        className={`${styles.searchResultItem} ${index === selectedIndex ? styles.searchResultItemActive : ''}`}
                        onClick={() => handleSelectContract(contract._id)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <div className={styles.searchResultIcon}>
                          <FileText size={18} />
                        </div>
                        <div className={styles.searchResultContent}>
                          <div className={styles.searchResultName}>{contract.name}</div>
                          <div className={styles.searchResultMeta}>
                            <Clock size={12} />
                            <span>{formatDate(contract.date)}</span>
                          </div>
                        </div>
                        <ArrowRight size={16} className={styles.searchResultArrow} />
                      </button>
                    ))}
                  </>
                ) : (
                  <div className={styles.searchResultsEmpty}>
                    <Search size={24} />
                    <span>Keine Verträge gefunden für "{searchQuery}"</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notification Settings Modal */}
      {showSettingsModal && (
        <div className={styles.settingsModal} onClick={() => setShowSettingsModal(false)}>
          <div className={styles.settingsModalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.settingsModalHeader}>
              <h2>Benachrichtigungseinstellungen</h2>
              <button
                className={styles.settingsModalClose}
                onClick={() => setShowSettingsModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className={styles.settingsTabs}>
              <button
                className={`${styles.settingsTab} ${settingsTab === 'channels' ? styles.settingsTabActive : ''}`}
                onClick={() => setSettingsTab('channels')}
              >
                <Mail size={16} />
                Kanäle
              </button>
              <button
                className={`${styles.settingsTab} ${settingsTab === 'types' ? styles.settingsTabActive : ''}`}
                onClick={() => setSettingsTab('types')}
              >
                <BellRing size={16} />
                Typen
              </button>
              <button
                className={`${styles.settingsTab} ${settingsTab === 'schedule' ? styles.settingsTabActive : ''}`}
                onClick={() => setSettingsTab('schedule')}
              >
                <Clock size={16} />
                Zeitplan
              </button>
            </div>

            {/* Tab Content */}
            <div className={styles.settingsBody}>
              {isLoadingSettings || !notificationSettings ? (
                <div className={styles.settingsLoading}>
                  <RefreshCw size={24} className={styles.spinIcon} />
                  <span>Einstellungen werden geladen...</span>
                </div>
              ) : (
                <>
              {/* Channels Tab */}
              {settingsTab === 'channels' && (
                <div className={styles.settingsSection}>
                  {/* Email */}
                  <div className={styles.settingsGroup}>
                    <div className={styles.settingsGroupHeader}>
                      <Mail size={18} />
                      <div>
                        <h3>E-Mail-Benachrichtigungen</h3>
                        <p>Erhalte wichtige Updates per E-Mail</p>
                      </div>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={notificationSettings.email.enabled}
                          onChange={e => updateSetting('email', 'enabled', e.target.checked)}
                        />
                        <span className={styles.toggleSlider} />
                      </label>
                    </div>
                    {notificationSettings.email.enabled && (
                      <div className={styles.settingsSubOptions}>
                        <label className={styles.settingsOption}>
                          <input
                            type="checkbox"
                            checked={notificationSettings.email.weeklyReport}
                            onChange={e => updateSetting('email', 'weeklyReport', e.target.checked)}
                          />
                          <span>Wöchentlicher Bericht</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Push */}
                  <div className={styles.settingsGroup}>
                    <div className={styles.settingsGroupHeader}>
                      <BellRing size={18} />
                      <div>
                        <h3>Push-Benachrichtigungen</h3>
                        <p>Browser-Benachrichtigungen in Echtzeit</p>
                      </div>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={notificationSettings.push.enabled}
                          onChange={e => updateSetting('push', 'enabled', e.target.checked)}
                        />
                        <span className={styles.toggleSlider} />
                      </label>
                    </div>
                  </div>

                  {/* In-App */}
                  <div className={styles.settingsGroup}>
                    <div className={styles.settingsGroupHeader}>
                      <Monitor size={18} />
                      <div>
                        <h3>In-App-Benachrichtigungen</h3>
                        <p>Benachrichtigungen im Dashboard anzeigen</p>
                      </div>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={notificationSettings.inApp.enabled}
                          onChange={e => updateSetting('inApp', 'enabled', e.target.checked)}
                        />
                        <span className={styles.toggleSlider} />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Types Tab */}
              {settingsTab === 'types' && (
                <div className={styles.settingsSection}>
                  <p className={styles.settingsInfo}>
                    Wähle aus, über welche Ereignisse du benachrichtigt werden möchtest.
                  </p>

                  <div className={styles.settingsTypeGrid}>
                    <div className={styles.settingsTypeItem}>
                      <div className={`${styles.settingsTypeIcon} ${styles.settingsTypeIconWarning}`}>
                        <Calendar size={20} />
                      </div>
                      <div className={styles.settingsTypeContent}>
                        <h4>Vertragsfristen</h4>
                        <p>Kündigungsfristen & Ablaufdaten</p>
                      </div>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={notificationSettings.inApp.contractDeadlines}
                          onChange={e => {
                            updateSetting('inApp', 'contractDeadlines', e.target.checked);
                            updateSetting('email', 'contractDeadlines', e.target.checked);
                          }}
                        />
                        <span className={styles.toggleSlider} />
                      </label>
                    </div>

                    <div className={styles.settingsTypeItem}>
                      <div className={`${styles.settingsTypeIcon} ${styles.settingsTypeIconDanger}`}>
                        <AlertTriangle size={20} />
                      </div>
                      <div className={styles.settingsTypeContent}>
                        <h4>Legal Pulse Alerts</h4>
                        <p>Wichtige rechtliche Hinweise</p>
                      </div>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={notificationSettings.inApp.legalPulse}
                          onChange={e => {
                            updateSetting('inApp', 'legalPulse', e.target.checked);
                            updateSetting('email', 'legalPulse', e.target.checked);
                          }}
                        />
                        <span className={styles.toggleSlider} />
                      </label>
                    </div>

                    <div className={styles.settingsTypeItem}>
                      <div className={`${styles.settingsTypeIcon} ${styles.settingsTypeIconSuccess}`}>
                        <CheckCircle size={20} />
                      </div>
                      <div className={styles.settingsTypeContent}>
                        <h4>Analyse abgeschlossen</h4>
                        <p>Wenn KI-Analysen fertig sind</p>
                      </div>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={notificationSettings.inApp.analysisComplete}
                          onChange={e => {
                            updateSetting('inApp', 'analysisComplete', e.target.checked);
                            updateSetting('email', 'analysisComplete', e.target.checked);
                          }}
                        />
                        <span className={styles.toggleSlider} />
                      </label>
                    </div>

                    <div className={styles.settingsTypeItem}>
                      <div className={`${styles.settingsTypeIcon} ${styles.settingsTypeIconInfo}`}>
                        <PenTool size={20} />
                      </div>
                      <div className={styles.settingsTypeContent}>
                        <h4>Signatur-Updates</h4>
                        <p>Status digitaler Unterschriften</p>
                      </div>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={notificationSettings.inApp.signatureUpdates}
                          onChange={e => {
                            updateSetting('inApp', 'signatureUpdates', e.target.checked);
                            updateSetting('email', 'signatureUpdates', e.target.checked);
                          }}
                        />
                        <span className={styles.toggleSlider} />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule Tab */}
              {settingsTab === 'schedule' && (
                <div className={styles.settingsSection}>
                  {/* Quiet Hours */}
                  <div className={styles.settingsGroup}>
                    <div className={styles.settingsGroupHeader}>
                      <Moon size={18} />
                      <div>
                        <h3>Ruhezeiten</h3>
                        <p>Keine Benachrichtigungen während dieser Zeit</p>
                      </div>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={notificationSettings.quietHours.enabled}
                          onChange={e => updateSetting('quietHours', 'enabled', e.target.checked)}
                        />
                        <span className={styles.toggleSlider} />
                      </label>
                    </div>
                    {notificationSettings.quietHours.enabled && (
                      <div className={styles.settingsTimeRange}>
                        <div className={styles.settingsTimeInput}>
                          <label>Von</label>
                          <input
                            type="time"
                            value={notificationSettings.quietHours.startTime}
                            onChange={e => updateSetting('quietHours', 'startTime', e.target.value)}
                          />
                        </div>
                        <span className={styles.settingsTimeSeparator}>bis</span>
                        <div className={styles.settingsTimeInput}>
                          <label>Bis</label>
                          <input
                            type="time"
                            value={notificationSettings.quietHours.endTime}
                            onChange={e => updateSetting('quietHours', 'endTime', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Deadline Reminders */}
                  <div className={styles.settingsGroup}>
                    <div className={styles.settingsGroupHeader}>
                      <Calendar size={18} />
                      <div>
                        <h3>Frist-Erinnerungen</h3>
                        <p>Wann möchtest du erinnert werden?</p>
                      </div>
                    </div>
                    <div className={styles.settingsCheckboxGrid}>
                      <label className={styles.settingsCheckbox}>
                        <input
                          type="checkbox"
                          checked={notificationSettings.deadlineReminders.days7}
                          onChange={e => updateSetting('deadlineReminders', 'days7', e.target.checked)}
                        />
                        <span>7 Tage vorher</span>
                      </label>
                      <label className={styles.settingsCheckbox}>
                        <input
                          type="checkbox"
                          checked={notificationSettings.deadlineReminders.days3}
                          onChange={e => updateSetting('deadlineReminders', 'days3', e.target.checked)}
                        />
                        <span>3 Tage vorher</span>
                      </label>
                      <label className={styles.settingsCheckbox}>
                        <input
                          type="checkbox"
                          checked={notificationSettings.deadlineReminders.days1}
                          onChange={e => updateSetting('deadlineReminders', 'days1', e.target.checked)}
                        />
                        <span>1 Tag vorher</span>
                      </label>
                      <label className={styles.settingsCheckbox}>
                        <input
                          type="checkbox"
                          checked={notificationSettings.deadlineReminders.daysSame}
                          onChange={e => updateSetting('deadlineReminders', 'daysSame', e.target.checked)}
                        />
                        <span>Am selben Tag</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className={styles.settingsModalFooter}>
              <button
                className={styles.settingsModalCancel}
                onClick={() => setShowSettingsModal(false)}
              >
                Abbrechen
              </button>
              <button
                className={styles.settingsModalSave}
                onClick={saveNotificationSettings}
                disabled={isSavingSettings}
              >
                {isSavingSettings ? (
                  <>
                    <RefreshCw size={16} className={styles.spinIcon} />
                    Speichere...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Speichern
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
