// 📁 src/App.tsx
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import RequireAuth from "./components/RequireAuth";
import PageLoader from "./components/PageLoader";

// 🔓 Öffentliche Seiten
import HomeRedesign from "./pages/HomeRedesign";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Pricing from "./pages/Pricing";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import AGB from "./pages/AGB";

// 🔒 Geschützte Seiten
import Dashboard from "./pages/Dashboard";
import Contracts from "./pages/Contracts";
import ContractDetails from "./pages/ContractDetails";
import EditContract from "./pages/EditContract";
import Profile from "./pages/Profile";
import CalendarView from "./pages/CalendarView";
import Optimizer from "./pages/Optimizer";
import Compare from "./pages/Compare";
import Chat from "./pages/Chat";
import Generate from "./pages/Generate";
import Subscribe from "./pages/Subscribe";
import Upgrade from "./pages/Upgrade";
import BetterContracts from "./pages/BetterContracts";

// ✅ Wrapper-Komponente, um bei Seitenwechsel Ladeanimation zu zeigen
function AppWithLoader() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [location]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {loading && <PageLoader />}
      <Navbar />
      <Sidebar />

      <main style={{ flex: 1, paddingTop: "60px" }}>
        <Routes>
          {/* 🔓 Öffentliche Seiten */}
          <Route path="/" element={<HomeRedesign />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/agb" element={<AGB />} />

          {/* 🔒 Geschützte Seiten mit RequireAuth */}
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/contracts" element={<RequireAuth><Contracts /></RequireAuth>} />
          <Route path="/contracts/:id" element={<RequireAuth><ContractDetails /></RequireAuth>} />
          <Route path="/contracts/:id/edit" element={<RequireAuth><EditContract /></RequireAuth>} />
          <Route path="/me" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/calendar" element={<RequireAuth><CalendarView /></RequireAuth>} />
          <Route path="/optimizer" element={<RequireAuth><Optimizer /></RequireAuth>} />
          <Route path="/compare" element={<RequireAuth><Compare /></RequireAuth>} />
          <Route path="/chat" element={<RequireAuth><Chat /></RequireAuth>} />
          <Route path="/generate" element={<RequireAuth><Generate /></RequireAuth>} />
          <Route path="/subscribe" element={<RequireAuth><Subscribe /></RequireAuth>} />
          <Route path="/upgrade" element={<RequireAuth><Upgrade /></RequireAuth>} />
          <Route path="/better-contracts" element={<RequireAuth><BetterContracts /></RequireAuth>} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

// 🧠 Haupt-App mit Router
export default function App() {
  return (
    <Router>
      <AppWithLoader />
    </Router>
  );
}
