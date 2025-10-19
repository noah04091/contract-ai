// 📄 src/App.tsx
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import Navbar from "./components/Navbar";
import RequireAuth from "./components/RequireAuth";
import PageLoader from "./components/PageLoader";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { AnnouncerProvider } from "./components/ScreenReaderAnnouncer";
import { ToastContainer } from "./components/Toast";
import { useToast } from "./context/ToastContext";
import SkipNavigation from "./components/SkipNavigation";
import CookieConsentBanner from "./components/CookieConsentBanner";
import ScrollToTop from "./components/ScrollToTop";

// 🚀 PERFORMANCE: Lazy Loading für alle Seiten (Code Splitting)
// Homepage, Login und Contracts werden sofort geladen (kritische Seiten)
import HomeRedesign from "./pages/HomeRedesign";
import Login from "./pages/Login";
import Contracts from "./pages/Contracts"; // 🔧 FIX: Direct import verhindert CSS-Preload-Fehler

// 🔓 Öffentliche Seiten - Lazy Loading
const Register = lazy(() => import("./pages/Register"));
const VerifySuccess = lazy(() => import("./pages/VerifySuccess"));
const SignaturePage = lazy(() => import("./pages/SignaturePage")); // ✉️ NEU: Public Signature Page
const Pricing = lazy(() => import("./pages/Pricing"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Impressum = lazy(() => import("./pages/Impressum"));
const Datenschutz = lazy(() => import("./pages/Datenschutz"));
const AGB = lazy(() => import("./pages/AGB"));
const About = lazy(() => import("./pages/About"));
const Press = lazy(() => import("./pages/Press"));
const Success = lazy(() => import("./pages/Success"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const NotFound = lazy(() => import("./pages/NotFound"));

// 🌟 Feature-Landingpages - Lazy Loading
const Vertragsanalyse = lazy(() => import("./pages/features/Vertragsanalyse"));
const Optimierung = lazy(() => import("./pages/features/Optimierung"));
const Fristen = lazy(() => import("./pages/features/Fristen"));
const Vergleich = lazy(() => import("./pages/features/Vergleich"));
const GeneratorPage = lazy(() => import("./pages/features/Generator"));
const LegalPulsePage = lazy(() => import("./pages/features/LegalPulse"));
const Vertragsverwaltung = lazy(() => import("./pages/features/Vertragsverwaltung"));
const DigitaleSignatur = lazy(() => import("./pages/features/DigitaleSignatur"));

// 🔒 Geschützte Seiten - Lazy Loading
const Dashboard = lazy(() => import("./pages/Dashboard"));
// Contracts wird direkt importiert (siehe oben) - verhindert CSS-Preload-Fehler
const ContractDetails = lazy(() => import("./pages/ContractDetails"));
const EditContract = lazy(() => import("./pages/EditContract"));
const Profile = lazy(() => import("./pages/Profile"));
const CalendarView = lazy(() => import("./pages/CalendarView"));
const Cancel = lazy(() => import("./pages/Cancel"));
const Optimizer = lazy(() => import("./pages/Optimizer"));
const Compare = lazy(() => import("./pages/Compare"));
const Chat = lazy(() => import("./pages/Chat"));
const Generate = lazy(() => import("./pages/Generate"));
const CompanyProfile = lazy(() => import("./pages/CompanyProfile"));
const Subscribe = lazy(() => import("./pages/Subscribe"));
const Upgrade = lazy(() => import("./pages/Upgrade"));
const BetterContracts = lazy(() => import("./pages/BetterContracts"));
const LegalPulse = lazy(() => import("./pages/LegalPulse"));
const Envelopes = lazy(() => import("./pages/Envelopes")); // ✉️ NEU: Digital Signature Dashboard

function AppWithLoader() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const { toasts, removeToast } = useToast();

  // 🛡️ DOM Error Handler für removeChild-Fehler
  useEffect(() => {
    const handleDOMError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('removeChild') || 
          event.error?.name === 'NotFoundError') {
        console.log('🔧 DOM-Fehler abgefangen:', event.error.message);
        event.preventDefault(); // Verhindere den Crash
        event.stopPropagation();
        return false; // Unterdrücke weitere Error-Propagation
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('removeChild')) {
        console.log('🔧 Promise-Rejection abgefangen:', event.reason.message);
        event.preventDefault();
      }
    };

    // Global Error Handler registrieren
    window.addEventListener('error', handleDOMError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleDOMError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [location]);

  return (
    <ErrorBoundary>
      <SkipNavigation />
      <ScrollToTop />
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {loading && <PageLoader />}
        <Navbar />
        <main id="main-content" style={{ flex: 1, paddingTop: "60px" }}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
            {/* 🔓 Öffentliche Seiten */}
            <Route path="/" element={<HomeRedesign />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-success" element={<VerifySuccess />} /> {/* ✅ NEU: E-Mail bestätigt Seite */}
            <Route path="/sign/:token" element={<SignaturePage />} /> {/* ✉️ NEU: Public Signature Page */}
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/press" element={<Press />} />
            <Route path="/success" element={<Success />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/impressum" element={<Impressum />} />
            <Route path="/datenschutz" element={<Datenschutz />} />
            <Route path="/agb" element={<AGB />} />
            <Route path="/hilfe" element={<HelpCenter />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            
            {/* 🌟 Feature-Landingpages (NEU) */}
            <Route path="/features/vertragsanalyse" element={<Vertragsanalyse />} />
            <Route path="/features/optimierung" element={<Optimierung />} />
            <Route path="/features/fristen" element={<Fristen />} />
            <Route path="/features/vergleich" element={<Vergleich />} />
            <Route path="/features/generator" element={<GeneratorPage />} />
            <Route path="/features/legalpulse" element={<LegalPulsePage />} />
            <Route path="/features/vertragsverwaltung" element={<Vertragsverwaltung />} />
            <Route path="/features/digitalesignatur" element={<DigitaleSignatur />} />

            {/* 🔒 Geschützte Seiten */}
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/contracts" element={<RequireAuth><Contracts /></RequireAuth>} />
            <Route path="/contracts/:id" element={<RequireAuth><ContractDetails /></RequireAuth>} />
            <Route path="/contracts/:id/edit" element={<RequireAuth><EditContract /></RequireAuth>} />

            {/* ✉️ NEU: Digital Signature Dashboard */}
            <Route path="/envelopes" element={<RequireAuth><Envelopes /></RequireAuth>} />

            <Route path="/me" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/calendar" element={<RequireAuth><CalendarView /></RequireAuth>} />
            
            {/* ✅ NEU: Cancel Route */}
            <Route path="/cancel/:contractId" element={<RequireAuth><Cancel /></RequireAuth>} />
            
            {/* ✨ KI-Vertragsoptimierung - Legendary Feature */}
            <Route path="/optimizer" element={<RequireAuth><Optimizer /></RequireAuth>} />
            
            {/* 🔍 Legal Pulse - Rechtliche Risikoanalyse */}
            <Route path="/legalpulse" element={<RequireAuth><LegalPulse /></RequireAuth>} />
            <Route path="/legalpulse/:contractId" element={<RequireAuth><LegalPulse /></RequireAuth>} />
            
            <Route path="/compare" element={<RequireAuth><Compare /></RequireAuth>} />
            <Route path="/chat" element={<RequireAuth><Chat /></RequireAuth>} />
            <Route path="/Generate" element={<RequireAuth><Generate /></RequireAuth>} />
            <Route path="/company-profile" element={<RequireAuth><CompanyProfile /></RequireAuth>} />
            <Route path="/subscribe" element={<RequireAuth><Subscribe /></RequireAuth>} />
            <Route path="/upgrade" element={<RequireAuth><Upgrade /></RequireAuth>} />
            <Route path="/better-contracts" element={<RequireAuth><BetterContracts /></RequireAuth>} />

            {/* ✅ 404 Catch-All Route (muss am Ende stehen) */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <CookieConsentBanner />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <AnnouncerProvider>
            <AppWithLoader />
          </AnnouncerProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}