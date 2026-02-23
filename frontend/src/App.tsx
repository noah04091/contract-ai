// 📄 src/App.tsx
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import Navbar from "./components/Navbar";
import RequireAuth from "./components/RequireAuth";
import PageLoader from "./components/PageLoader";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AnnouncerProvider } from "./components/ScreenReaderAnnouncer";
import { ToastContainer } from "./components/Toast";
import { useToast } from "./context/ToastContext";
import SkipNavigation from "./components/SkipNavigation";
import CookieConsentBanner from "./components/CookieConsentBanner";
import ScrollToTop from "./components/ScrollToTop";
import AssistantWidget from "./components/AssistantWidget";
import { OnboardingProvider } from "./components/Onboarding";
import { CelebrationProvider } from "./components/Celebration";

// 🚀 PERFORMANCE: Lazy Loading für alle Seiten (Code Splitting)
// Homepage, Login, Contracts und Profile werden sofort geladen (kritische Seiten)
import HomeRedesign from "./pages/HomeRedesign";
import Login from "./pages/Login";
import Contracts from "./pages/Contracts"; // 🔧 FIX: Direct import verhindert CSS-Preload-Fehler
import Profile from "./pages/Profile"; // 🔧 FIX: Direct import verhindert CSS-Preload-Fehler
// 🔧 FIX: Direct imports für rechtliche Seiten - verhindert CSS-Preload-Fehler
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import AGB from "./pages/AGB";
// 🔧 FIX: Direct import für ForgotPassword & ResetPassword - verhindert CSS-Preload-Fehler
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Unsubscribe from "./pages/Unsubscribe"; // 📧 E-Mail-Abmeldung (DSGVO)

// 🔓 Öffentliche Seiten - Lazy Loading
const Register = lazy(() => import("./pages/Register"));
const VerifySuccess = lazy(() => import("./pages/VerifySuccess"));
const VerifyContract = lazy(() => import("./pages/VerifyContract")); // 🔐 Vertragsverifizierung via QR-Code
const AcceptInvite = lazy(() => import("./pages/AcceptInvite")); // 👥 Team-Einladung annehmen

// Feature Flag: Enhanced Signature UI
const useEnhancedSignUI = import.meta.env.VITE_SIGN_UI_ENHANCED !== "false"; // Default true
const SignaturePageComponent = useEnhancedSignUI
  ? lazy(() => import("./pages/EnhancedSignaturePage")) // ✉️ DocuSign-style UI
  : lazy(() => import("./pages/SignaturePage"));        // 🔙 Fallback to old UI

const Pricing = lazy(() => import("./pages/Pricing"));
// ForgotPassword und ResetPassword werden jetzt direkt importiert (siehe oben)
// Impressum, Datenschutz, AGB werden direkt importiert (siehe oben)
const About = lazy(() => import("./pages/About"));
const Press = lazy(() => import("./pages/Press"));
const Success = lazy(() => import("./pages/Success"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Beta = lazy(() => import("./pages/Beta")); // 🎁 Beta-Tester Landing Page
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
const EmailUpload = lazy(() => import("./pages/features/EmailUpload"));
const ContractBuilderFeature = lazy(() => import("./pages/features/ContractBuilder"));
const LegalLensFeature = lazy(() => import("./pages/features/LegalLens"));
const Features = lazy(() => import("./pages/Features")); // 📋 Features Übersichtsseite

// 🔒 Geschützte Seiten - Lazy Loading
const Dashboard = lazy(() => import("./pages/DashboardV2")); // ✅ Neues Premium Dashboard
const DashboardLegacy = lazy(() => import("./pages/Dashboard")); // 🔙 Altes Dashboard (Backup)
// Contracts und Profile werden direkt importiert (siehe oben) - verhindert CSS-Preload-Fehler
const ContractDetails = lazy(() => import("./pages/ContractDetails"));
const ContractDetailsV2 = lazy(() => import("./pages/ContractDetailsV2")); // V2 - Premium Enterprise Design
const EditContract = lazy(() => import("./pages/EditContract"));
const CalendarView = lazy(() => import("./pages/Calendar"));
const Cancel = lazy(() => import("./pages/Cancel"));
const Optimizer = lazy(() => import("./pages/Optimizer"));
const OptimizerFinalize = lazy(() => import("./pages/OptimizerFinalize")); // 🎯 Optimizer Post-Generation Seite
const Compare = lazy(() => import("./pages/Compare"));
const Chat = lazy(() => import("./pages/Chat"));
const Generate = lazy(() => import("./pages/Generate"));
const CompanyProfile = lazy(() => import("./pages/CompanyProfile"));
const ApiKeys = lazy(() => import("./pages/ApiKeys")); // 🔑 REST API-Zugang (Enterprise)
const ApiDocs = lazy(() => import("./pages/ApiDocs")); // 📚 REST API-Dokumentation
const Integrations = lazy(() => import("./pages/Integrations")); // 🔗 CRM/ERP/CPQ Integrationen
const Team = lazy(() => import("./pages/Team")); // 👥 Team-Management (Enterprise)
const Subscribe = lazy(() => import("./pages/Subscribe"));
const Upgrade = lazy(() => import("./pages/Upgrade"));
const BetterContracts = lazy(() => import("./pages/BetterContracts"));
const LegalPulse = lazy(() => import("./pages/LegalPulse"));
const LegalLens = lazy(() => import("./pages/LegalLens")); // 🔍 NEU: Interaktive Vertragsanalyse
const LegalLensStart = lazy(() => import("./pages/LegalLensStart")); // 🔍 NEU: Legal Lens Startseite
const ClauseLibraryPage = lazy(() => import("./pages/ClauseLibraryPage")); // 📚 NEU: Klausel-Bibliothek
const ContractBuilder = lazy(() => import("./pages/ContractBuilder")); // 🔧 NEU: ContractForge - Visueller Vertragsbaukasten
const Envelopes = lazy(() => import("./pages/Envelopes")); // ✉️ NEU: Digital Signature Dashboard
const PlaceSignatureFields = lazy(() => import("./pages/PlaceSignatureFields")); // ✉️ NEU: Field Placement Editor
const NewSignatureRequest = lazy(() => import("./pages/NewSignatureRequest")); // ✉️ NEU: Neue Signaturanfrage

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

  // ✅ FIX: Nur bei echten Seitenwechseln laden, nicht bei Query-Parameter-Änderungen
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [location.pathname]); // Nur pathname, nicht location.search!

  // Seiten ohne Navbar (Auth-Seiten mit Split-Screen Design + Dashboard mit eigener Sidebar + Fullscreen-Apps)
  const hideNavbarRoutes = ['/login', '/register', '/verify-success', '/dashboard'];
  // Auch /verify/:id soll keine Navbar haben, /dashboard hat eigene Sidebar, /contract-builder ist Fullscreen-App
  const shouldHideNavbar = hideNavbarRoutes.includes(location.pathname) ||
    location.pathname.startsWith('/verify/') ||
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/contract-builder');

  return (
    <ErrorBoundary>
      <SkipNavigation />
      <ScrollToTop />
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {loading && <PageLoader />}
        {!shouldHideNavbar && <Navbar />}
        <main id="main-content" style={{ flex: 1 }}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
            {/* 🔓 Öffentliche Seiten */}
            <Route path="/" element={<HomeRedesign />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-success" element={<VerifySuccess />} /> {/* ✅ NEU: E-Mail bestätigt Seite */}
            <Route path="/verify/:id" element={<VerifyContract />} /> {/* 🔐 Vertragsverifizierung via QR-Code */}
            <Route path="/accept-invite/:token" element={<AcceptInvite />} /> {/* 👥 Team-Einladung annehmen */}
            <Route path="/sign/:token" element={<SignaturePageComponent />} /> {/* ✉️ Signature Page (Feature-Flag controlled) */}
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/press" element={<Press />} />
            <Route path="/success" element={<Success />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/abmelden" element={<Unsubscribe />} /> {/* 📧 E-Mail-Abmeldung (DSGVO) */}
            <Route path="/unsubscribe" element={<Unsubscribe />} /> {/* 📧 Alternative URL for Emails */}
            <Route path="/impressum" element={<Impressum />} />
            <Route path="/datenschutz" element={<Datenschutz />} />
            <Route path="/agb" element={<AGB />} />
            <Route path="/api-docs" element={<ApiDocs />} />
            <Route path="/hilfe" element={<HelpCenter />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/beta" element={<Beta />} /> {/* 🎁 Beta-Tester Landing Page */}

            {/* 📋 Features Übersichtsseite */}
            <Route path="/features" element={<Features />} />

            {/* 🌟 Feature-Landingpages (NEU) */}
            <Route path="/features/vertragsanalyse" element={<Vertragsanalyse />} />
            <Route path="/features/optimierung" element={<Optimierung />} />
            <Route path="/features/fristen" element={<Fristen />} />
            <Route path="/features/vergleich" element={<Vergleich />} />
            <Route path="/features/generator" element={<GeneratorPage />} />
            <Route path="/features/legalpulse" element={<LegalPulsePage />} />
            <Route path="/features/vertragsverwaltung" element={<Vertragsverwaltung />} />
            <Route path="/features/digitalesignatur" element={<DigitaleSignatur />} />
            <Route path="/features/email-upload" element={<EmailUpload />} />
            <Route path="/features/contract-builder" element={<ContractBuilderFeature />} />
            <Route path="/features/legal-lens" element={<LegalLensFeature />} />

            {/* 🔄 SEO Redirects für alte/falsche URLs (301 Redirects) */}
            <Route path="/features/legal-pulse" element={<Navigate to="/features/legalpulse" replace />} />
            <Route path="/features/fristenkalender" element={<Navigate to="/features/fristen" replace />} />
            <Route path="/calendar-view" element={<Navigate to="/calendar" replace />} />
            <Route path="/help-center" element={<Navigate to="/hilfe" replace />} />
            <Route path="/blog/autokauf-vertrag-gewährleistung" element={<Navigate to="/blog/autokauf-vertrag-gewaehrleistung" replace />} />

            {/* 🔒 Geschützte Seiten */}
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/dashboard-legacy" element={<RequireAuth><DashboardLegacy /></RequireAuth>} /> {/* 🔙 Altes Dashboard */}
            <Route path="/contracts" element={<RequireAuth><Contracts /></RequireAuth>} />
            <Route path="/contracts/:id" element={<RequireAuth><ContractDetailsV2 /></RequireAuth>} /> {/* V2 - Premium Enterprise Design */}
            <Route path="/contracts/:id/legacy" element={<RequireAuth><ContractDetails /></RequireAuth>} /> {/* Legacy Backup */}
            <Route path="/contracts/:id/edit" element={<RequireAuth><EditContract /></RequireAuth>} />

            {/* ✉️ NEU: Digital Signature Dashboard */}
            <Route path="/envelopes" element={<RequireAuth><Envelopes /></RequireAuth>} />
            <Route path="/envelopes/new" element={<RequireAuth><NewSignatureRequest /></RequireAuth>} />

            {/* ✉️ NEU: Field Placement Editor für Envelopes */}
            <Route path="/signature/place-fields/:envelopeId" element={<RequireAuth><PlaceSignatureFields /></RequireAuth>} />

            <Route path="/me" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/calendar" element={<RequireAuth><CalendarView /></RequireAuth>} />
            
            {/* ✅ NEU: Cancel Route */}
            <Route path="/cancel/:contractId" element={<RequireAuth><Cancel /></RequireAuth>} />
            
            {/* ✨ KI-Vertragsoptimierung - Legendary Feature */}
            <Route path="/optimizer" element={<RequireAuth><Optimizer /></RequireAuth>} />
            <Route path="/optimizer/:jobId" element={<RequireAuth><Optimizer /></RequireAuth>} />
            <Route path="/optimizer/finalize/:contractId" element={<RequireAuth><OptimizerFinalize /></RequireAuth>} />
            <Route path="/optimize/:contractId" element={<RequireAuth><Optimizer /></RequireAuth>} />

            {/* 🔍 Legal Pulse - Rechtliche Risikoanalyse */}
            <Route path="/legalpulse" element={<RequireAuth><LegalPulse /></RequireAuth>} />
            <Route path="/legalpulse/:contractId" element={<RequireAuth><LegalPulse /></RequireAuth>} />

            {/* 🔍 Legal Lens - Interaktive Vertragsanalyse */}
            <Route path="/legal-lens" element={<RequireAuth><LegalLensStart /></RequireAuth>} />
            <Route path="/legal-lens/:contractId" element={<RequireAuth><LegalLens /></RequireAuth>} />

            {/* 📚 Klausel-Bibliothek */}
            <Route path="/clause-library" element={<RequireAuth><ClauseLibraryPage /></RequireAuth>} />

            {/* 🔧 ContractForge - Visueller Vertragsbaukasten */}
            <Route path="/contract-builder" element={<RequireAuth><ContractBuilder /></RequireAuth>} />
            <Route path="/contract-builder/:id" element={<RequireAuth><ContractBuilder /></RequireAuth>} />

            <Route path="/compare" element={<RequireAuth><Compare /></RequireAuth>} />
            <Route path="/chat" element={<RequireAuth><Chat /></RequireAuth>} />
            <Route path="/generate" element={<RequireAuth><Generate /></RequireAuth>} />
            <Route path="/Generate" element={<Navigate to="/generate" replace />} /> {/* SEO: Redirect uppercase */}
            <Route path="/company-profile" element={<RequireAuth><CompanyProfile /></RequireAuth>} />
            <Route path="/api-keys" element={<RequireAuth><ApiKeys /></RequireAuth>} />
            <Route path="/integrations" element={<RequireAuth><Integrations /></RequireAuth>} />
            <Route path="/team" element={<RequireAuth><Team /></RequireAuth>} />
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
        <AssistantWidget />
      </div>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AnnouncerProvider>
              <CelebrationProvider>
                <OnboardingProvider>
                  <AppWithLoader />
                </OnboardingProvider>
              </CelebrationProvider>
            </AnnouncerProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}