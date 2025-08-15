// 📄 src/App.tsx
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import RequireAuth from "./components/RequireAuth";
import PageLoader from "./components/PageLoader";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import CookieConsentBanner from "./components/CookieConsentBanner";

// 🔓 Öffentliche Seiten
import HomeRedesign from "./pages/HomeRedesign";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifySuccess from "./pages/VerifySuccess"; // ✅ NEU: E-Mail-Bestätigung Success Page
import Pricing from "./pages/Pricing";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import AGB from "./pages/AGB";
import About from "./pages/About";
import Press from "./pages/Press";
import Success from "./pages/Success";
import HelpCenter from "./pages/HelpCenter";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Vertragsanalyse from "./pages/features/Vertragsanalyse";
import Optimierung from "./pages/features/Optimierung";
import Fristen from "./pages/features/Fristen";
import Vergleich from "./pages/features/Vergleich";
import GeneratorPage from "./pages/features/Generator";
import LegalPulsePage from "./pages/features/LegalPulse";

// 🔒 Geschützte Seiten
import Dashboard from "./pages/Dashboard";
import Contracts from "./pages/Contracts";
import ContractDetails from "./pages/ContractDetails";
import EditContract from "./pages/EditContract";
import Profile from "./pages/Profile";
import CalendarView from "./pages/CalendarView";
import Cancel from "./pages/Cancel"; // ✅ NEU: Cancel Page
import Optimizer from "./pages/Optimizer"; // ✅ Legendäre KI-Vertragsoptimierung
import Compare from "./pages/Compare";
import Chat from "./pages/Chat";
import Generate from "./pages/Generate";
import Subscribe from "./pages/Subscribe";
import Upgrade from "./pages/Upgrade";
import BetterContracts from "./pages/BetterContracts";
import LegalPulse from "./pages/LegalPulse";

function AppWithLoader() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

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
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {loading && <PageLoader />}
        <Navbar />
        <main style={{ flex: 1, paddingTop: "60px" }}>
          <Routes>
            {/* 🔓 Öffentliche Seiten */}
            <Route path="/" element={<HomeRedesign />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-success" element={<VerifySuccess />} /> {/* ✅ NEU: E-Mail bestätigt Seite */}
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
            <Route path="/features/vertragsanalyse" element={<Vertragsanalyse />} />
            <Route path="/features/optimierung" element={<Optimierung />} />
            <Route path="/features/fristen" element={<Fristen />} />
            <Route path="/features/vergleich" element={<Vergleich />} />
            <Route path="/features/generator" element={<GeneratorPage />} />
            <Route path="/features/legal-pulse" element={<LegalPulsePage />} />



            {/* 🔒 Geschützte Seiten */}
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/contracts" element={
              <RequireAuth>
                <ErrorBoundary>
                  <Contracts />
                </ErrorBoundary>
              </RequireAuth>
            } />
            <Route path="/contracts/:id" element={<RequireAuth><ContractDetails /></RequireAuth>} />
            <Route path="/contracts/:id/edit" element={<RequireAuth><EditContract /></RequireAuth>} />
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
            <Route path="/subscribe" element={<RequireAuth><Subscribe /></RequireAuth>} />
            <Route path="/upgrade" element={<RequireAuth><Upgrade /></RequireAuth>} />
            <Route path="/better-contracts" element={<RequireAuth><BetterContracts /></RequireAuth>} />
          </Routes>
        </main>
        <CookieConsentBanner />
      </div>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppWithLoader />
      </AuthProvider>
    </Router>
  );
}