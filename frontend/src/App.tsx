// 📁 src/App.tsx 
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import RequireAuth from "./components/RequireAuth";

// 🧠 Seiten
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
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
import Pricing from "./pages/Pricing";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// ✅ NEU: Import der neuen Vergleichsseite
import BetterContracts from "./pages/BetterContracts";

export default function App() {
  return (
    <Router>
      <Navbar />
      <Sidebar />

      <div style={{ paddingLeft: "0px", paddingTop: "60px" }}>
        <Routes>
          {/* 🔓 Öffentliche Seiten */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* 🔒 Geschützte Seiten */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/contracts"
            element={
              <RequireAuth>
                <Contracts />
              </RequireAuth>
            }
          />
          <Route
            path="/contracts/:id"
            element={
              <RequireAuth>
                <ContractDetails />
              </RequireAuth>
            }
          />
          <Route
            path="/contracts/:id/edit"
            element={
              <RequireAuth>
                <EditContract />
              </RequireAuth>
            }
          />
          <Route
            path="/me"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path="/calendar"
            element={
              <RequireAuth>
                <CalendarView />
              </RequireAuth>
            }
          />
          <Route
            path="/optimizer"
            element={
              <RequireAuth>
                <Optimizer />
              </RequireAuth>
            }
          />
          <Route
            path="/compare"
            element={
              <RequireAuth>
                <Compare />
              </RequireAuth>
            }
          />
          <Route
            path="/chat"
            element={
              <RequireAuth>
                <Chat />
              </RequireAuth>
            }
          />
          <Route
            path="/generate"
            element={
              <RequireAuth>
                <Generate />
              </RequireAuth>
            }
          />
          <Route
            path="/subscribe"
            element={
              <RequireAuth>
                <Subscribe />
              </RequireAuth>
            }
          />
          <Route
            path="/upgrade"
            element={
              <RequireAuth>
                <Upgrade />
              </RequireAuth>
            }
          />
          {/* ✅ NEU: Bessere Anbieter-Vergleichsseite */}
          <Route
            path="/better-contracts"
            element={
              <RequireAuth>
                <BetterContracts />
              </RequireAuth>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}
