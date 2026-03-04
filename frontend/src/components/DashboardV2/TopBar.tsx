import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fixUtf8Display } from "../../utils/textUtils";
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
  RefreshCw,
  Settings
} from 'lucide-react';
import NotificationSettingsModal from '../NotificationSettingsModal';
import styles from './DashboardLayout.module.css';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.contract-ai.de';

interface UserData {
  email?: string;
  name?: string;
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
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    try {
      // Backend-Logout aufrufen um Cookie zu löschen
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout-Fehler:', error);
    }
    // localStorage leeren
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('authEmail');
    localStorage.removeItem('authTimestamp');
    // Zur Login-Seite
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

  // Settings Modal öffnen
  const handleOpenSettings = () => {
    setShowNotifications(false);
    setShowSettingsModal(true);
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

  // Benutzername: Bevorzuge name, dann email-Präfix, dann 'User'
  const userName = user?.name || user?.email?.split('@')[0] || 'User';
  const userInitial = userName.charAt(0).toUpperCase();
  // Plan-Anzeige: Formatiere für bessere Lesbarkeit
  const formatPlan = (plan?: string): string => {
    if (!plan || plan === 'free') return 'Free';
    if (plan === 'business') return 'Business';
    if (plan === 'enterprise') return 'Enterprise';
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };
  const userPlan = formatPlan(user?.subscriptionPlan);

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
                          <div className={styles.searchResultName}>{fixUtf8Display(contract.name)}</div>
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
      <NotificationSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </>
  );
}
