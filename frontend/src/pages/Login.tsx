import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../hooks/useAuth";

interface AuthResponse {
  token?: string;
  message?: string;
  email?: string;
  requiresVerification?: boolean;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type?: "success" | "error" | "warning" | "info" } | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";
  const redirectTimeout = useRef<NodeJS.Timeout | null>(null);
  const { refetchUser } = useAuth();

  // E-Mail-Verification States
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // E-Mail-Verification senden
  const sendVerificationEmail = async (emailToVerify: string) => {
    try {
      const response = await fetch("/api/email-verification/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: emailToVerify }),
      });
      const data = await response.json();
      if (response.ok) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || "Fehler beim Senden der E-Mail" };
      }
    } catch {
      return { success: false, message: "Verbindung fehlgeschlagen" };
    }
  };

  // Resend E-Mail mit Cooldown
  const handleResendEmail = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    const result = await sendVerificationEmail(verificationEmail);
    if (result.success) {
      setNotification({ message: "Bestätigungs-E-Mail wurde erneut gesendet", type: "success" });
      setResendCooldown(60);
      const countdown = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(countdown); return 0; }
          return prev - 1;
        });
      }, 1000);
    } else {
      setNotification({ message: result.message, type: "error" });
    }
    setResendLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data: AuthResponse = await response.json();

      if (!response.ok) {
        if (data.requiresVerification) {
          setShowVerificationPrompt(true);
          setVerificationEmail(data.email || email);
          setNotification({ message: "E-Mail-Adresse noch nicht bestätigt.", type: "info" });
          setLoading(false);
          return;
        }
        throw new Error(data.message || "Login fehlgeschlagen");
      }

      if (data.token) {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("authEmail", email);
        localStorage.setItem("authTimestamp", String(Date.now()));
      }

      setNotification({ message: "Login erfolgreich", type: "success" });
      await refetchUser();

      redirectTimeout.current = setTimeout(() => {
        navigate(redirectUrl);
      }, 1000);
    } catch (error) {
      const err = error as Error;
      setNotification({ message: err.message || "Server nicht erreichbar", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const response = await fetch("/api/auth/me", { method: "GET", credentials: "include" });
        if (response.ok) {
          await refetchUser();
          navigate(redirectUrl);
        }
      } catch { /* ignore */ }
    };
    checkLoginStatus();
    return () => { if (redirectTimeout.current) clearTimeout(redirectTimeout.current); };
  }, [navigate, refetchUser, redirectUrl]);

  return (
    <>
      <Helmet>
        <title>Anmelden | Contract AI</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Melde dich bei Contract AI an und verwalte deine Verträge intelligent mit KI." />
      </Helmet>

      <div className="min-h-screen flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 flex-col justify-between relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-16">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-white">Contract AI</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Verträge intelligent<br />verwalten
            </h1>
            <p className="text-xl text-blue-100 mb-12 max-w-md">
              Die All-in-One Plattform für KI-gestützte Vertragsanalyse, Optimierung und Fristenverwaltung.
            </p>

            {/* Features */}
            <div className="space-y-4">
              {[
                { icon: "📄", text: "KI-Vertragsanalyse in Sekunden" },
                { icon: "⏰", text: "Automatische Fristenverwaltung" },
                { icon: "🚀", text: "Optimierungsvorschläge" },
                { icon: "🛡️", text: "Risiko-Erkennung" },
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-white/90">
                  <span className="text-xl">{feature.icon}</span>
                  <span className="text-lg">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Text */}
          <div className="relative z-10">
            <p className="text-blue-200 text-sm">
              Bereits über 1.000+ Verträge analysiert
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">Contract AI</span>
            </div>

            {/* Notification */}
            {notification && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                notification.type === "success" ? "bg-green-50 text-green-800 border border-green-200" :
                notification.type === "error" ? "bg-red-50 text-red-800 border border-red-200" :
                notification.type === "info" ? "bg-blue-50 text-blue-800 border border-blue-200" :
                "bg-yellow-50 text-yellow-800 border border-yellow-200"
              }`}>
                <span>{notification.type === "success" ? "✓" : notification.type === "error" ? "✕" : "ℹ"}</span>
                <span className="text-sm">{notification.message}</span>
                <button onClick={() => setNotification(null)} className="ml-auto text-current opacity-50 hover:opacity-100">✕</button>
              </div>
            )}

            {!showVerificationPrompt ? (
              <>
                {/* Header */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Willkommen zurück</h2>
                  <p className="text-gray-600">Melden Sie sich an, um fortzufahren</p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      E-Mail Adresse
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                      placeholder="name@beispiel.de"
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Passwort
                      </label>
                      <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                        Passwort vergessen?
                      </Link>
                    </div>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span>Anmelden</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="my-8 flex items-center">
                  <div className="flex-1 border-t border-gray-200"></div>
                  <span className="px-4 text-sm text-gray-500">oder</span>
                  <div className="flex-1 border-t border-gray-200"></div>
                </div>

                {/* Register Link */}
                <p className="text-center text-gray-600">
                  Noch kein Konto?{" "}
                  <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                    Jetzt kostenlos registrieren
                  </Link>
                </p>
              </>
            ) : (
              /* Email Verification Prompt */
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">E-Mail bestätigen</h2>
                <p className="text-gray-600 mb-6">
                  Bitte bestätigen Sie Ihre E-Mail-Adresse, um sich anmelden zu können.
                </p>

                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-green-700 font-medium mb-8">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>{verificationEmail}</span>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleResendEmail}
                    disabled={resendLoading || resendCooldown > 0}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                    ) : resendCooldown > 0 ? (
                      `E-Mail erneut senden (${resendCooldown}s)`
                    ) : (
                      "E-Mail erneut senden"
                    )}
                  </button>

                  <button
                    onClick={() => { setShowVerificationPrompt(false); setNotification(null); }}
                    className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
                  >
                    Zurück zur Anmeldung
                  </button>
                </div>

                <div className="mt-8 p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tipp:</strong> Schauen Sie auch in Ihren Spam-Ordner!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
