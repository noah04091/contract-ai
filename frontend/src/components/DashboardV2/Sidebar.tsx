import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../../assets/logo.png';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Search,
  Sparkles,
  Rocket,
  Scale,
  MessageSquare,
  Lightbulb,
  Hammer,
  PenTool,
  BookOpen,
  User,
  Building2,
  Users,
  Link2,
  Star,
  ChevronRight,
  type LucideIcon
} from 'lucide-react';
import styles from './DashboardLayout.module.css';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  badge?: string;
  badgeColor?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  children?: NavItem[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: 'ÜBERSICHT',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        href: '/dashboard',
      },
      {
        id: 'contracts',
        label: 'Verträge',
        icon: FileText,
        href: '/contracts',
      },
      {
        id: 'calendar',
        label: 'Kalender',
        icon: Calendar,
        href: '/calendar',
      },
    ],
  },
  {
    title: 'KI-ASSISTENT',
    items: [
      {
        id: 'generate',
        label: 'Vertrag erstellen',
        icon: Sparkles,
        href: '/Generate',
      },
      {
        id: 'optimizer',
        label: 'Vertrag optimieren',
        icon: Rocket,
        href: '/optimizer',
      },
      {
        id: 'compare',
        label: 'Verträge vergleichen',
        icon: Scale,
        href: '/compare',
      },
      {
        id: 'chat',
        label: 'KI-Chat',
        icon: MessageSquare,
        href: '/chat',
      },
      {
        id: 'legal-lens',
        label: 'Legal Lens',
        icon: Search,
        href: '/legal-lens',
        badge: 'NEU',
        badgeColor: 'blue',
      },
      {
        id: 'legalpulse',
        label: 'Legal Pulse',
        icon: Lightbulb,
        href: '/legalpulse',
      },
    ],
  },
  {
    title: 'WERKZEUGE',
    items: [
      {
        id: 'contract-builder',
        label: 'ContractForge',
        icon: Hammer,
        href: '/contract-builder',
        badge: 'NEU',
        badgeColor: 'green',
      },
      {
        id: 'clause-library',
        label: 'Klausel-Bibliothek',
        icon: BookOpen,
        href: '/clause-library',
      },
      {
        id: 'envelopes',
        label: 'Digitale Signatur',
        icon: PenTool,
        href: '/envelopes',
      },
    ],
  },
  {
    title: 'EINSTELLUNGEN',
    items: [
      {
        id: 'profile',
        label: 'Profil',
        icon: User,
        href: '/me',
      },
      {
        id: 'company',
        label: 'Unternehmen',
        icon: Building2,
        href: '/company-profile',
      },
      {
        id: 'team',
        label: 'Team',
        icon: Users,
        href: '/team',
        badge: 'PRO',
        badgeColor: 'purple',
      },
      {
        id: 'integrations',
        label: 'Integrationen',
        icon: Link2,
        href: '/integrations',
      },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(['ai-features']);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const getBadgeClass = (color?: string) => {
    switch (color) {
      case 'blue': return styles.badgeBlue;
      case 'green': return styles.badgeGreen;
      case 'orange': return styles.badgeOrange;
      case 'red': return styles.badgeRed;
      case 'purple': return styles.badgePurple;
      default: return styles.badgeBlue;
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div className={styles.sidebarOverlay} onClick={onClose} />
      )}

      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        {/* Logo */}
        <div className={styles.sidebarLogo}>
          <Link to="/dashboard" className={styles.logoLink}>
            <img
              src={logo}
              alt="Contract AI"
              className={styles.logoImage}
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className={styles.sidebarNav}>
          {navigation.map((section, sectionIndex) => (
            <div key={sectionIndex} className={styles.navSection}>
              <div className={styles.navSectionTitle}>{section.title}</div>
              <ul className={styles.navList}>
                {section.items.map(item => {
                  const IconComponent = item.icon;
                  return (
                    <li key={item.id} className={styles.navItem}>
                      {item.children ? (
                        // Item with children (expandable)
                        <>
                          <button
                            className={`${styles.navLink} ${expandedItems.includes(item.id) ? styles.navLinkExpanded : ''}`}
                            onClick={() => toggleExpand(item.id)}
                          >
                            <span className={styles.navIcon}>
                              <IconComponent size={20} strokeWidth={1.75} />
                            </span>
                            <span className={styles.navLabel}>{item.label}</span>
                            {item.badge && (
                              <span className={`${styles.navBadge} ${getBadgeClass(item.badgeColor)}`}>
                                {item.badge}
                              </span>
                            )}
                            <span className={`${styles.navArrow} ${expandedItems.includes(item.id) ? styles.navArrowOpen : ''}`}>
                              <ChevronRight size={16} strokeWidth={2} />
                            </span>
                          </button>
                          {expandedItems.includes(item.id) && (
                            <ul className={styles.navSubList}>
                              {item.children.map(child => {
                                const ChildIconComponent = child.icon;
                                return (
                                  <li key={child.id}>
                                    <Link
                                      to={child.href || '#'}
                                      className={`${styles.navSubLink} ${isActive(child.href) ? styles.navSubLinkActive : ''}`}
                                      onClick={onClose}
                                    >
                                      <span className={styles.navSubIcon}>
                                        <ChildIconComponent size={16} strokeWidth={1.75} />
                                      </span>
                                      <span>{child.label}</span>
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </>
                      ) : (
                        // Regular item
                        <Link
                          to={item.href || '#'}
                          className={`${styles.navLink} ${isActive(item.href) ? styles.navLinkActive : ''}`}
                          onClick={onClose}
                        >
                          <span className={styles.navIcon}>
                            <IconComponent size={20} strokeWidth={1.75} />
                          </span>
                          <span className={styles.navLabel}>{item.label}</span>
                          {item.badge && (
                            <span className={`${styles.navBadge} ${getBadgeClass(item.badgeColor)}`}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Upgrade Card */}
        <div className={styles.upgradeCard}>
          <div className={styles.upgradeIcon}>
            <Star size={24} strokeWidth={1.5} />
          </div>
          <div className={styles.upgradeTitle}>Upgrade auf Pro</div>
          <div className={styles.upgradeText}>
            Unbegrenzte Analysen und alle Features freischalten
          </div>
          <Link to="/pricing" className={styles.upgradeButton} onClick={onClose}>
            Jetzt upgraden
          </Link>
        </div>
      </aside>
    </>
  );
}
