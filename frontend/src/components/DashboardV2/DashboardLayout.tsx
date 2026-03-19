import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import styles from './DashboardLayout.module.css';

interface UserData {
  email?: string;
  name?: string;
  subscriptionPlan?: string;
  analysisCount?: number;
  analysisLimit?: number;
  profilePicture?: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: UserData | null;
  minimal?: boolean;
}

export default function DashboardLayout({ children, user, minimal }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024 && !minimal) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [minimal]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    if (isMobile || minimal) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className={`${styles.dashboardLayout} ${minimal ? styles.dashboardMinimal : ''}`}>
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} user={user} />

      {/* Main Content Area */}
      <div className={styles.mainArea}>
        {/* Top Bar */}
        <TopBar onMenuClick={toggleSidebar} user={user} minimal={minimal} />

        {/* Page Content */}
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
}
