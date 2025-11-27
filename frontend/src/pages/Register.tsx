import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);

  // E-Mail-Verification States
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isBetaTester = searchParams.get('beta') === 'true';

  // E-Mail-Verification senden
  const sendVerificationEmail = async (emailToVerify: string) => {
    await new Promise(resolve => setTimeout(resolve, 400));
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
      }
      return { success: false, message: data.message || "Fehler beim Senden der E-Mail" };
    } catch {
      return { success: false, message: "Verbindung fehlgeschlagen" };
    }
  };

  // Resend E-Mail mit Cooldown
  const handleResendEmail = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    const result = await sendVerificationEmail(email);
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, isBetaTester }),
      });

      const data = await res.json();

      if (res.ok) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const emailResult = await sendVerificationEmail(email);

        if (emailResult.success) {
          setShowEmailVerification(true);
          setNotification({ message: "Bitte bestätigen Sie Ihre E-Mail-Adresse.", type: "info" });
        } else {
          setNotification({ message: "Registrierung erfolgreich, E-Mail konnte nicht gesendet werden.", type: "error" });
          setShowEmailVerification(true);
        }
      } else {
        setNotification({ message: data.message, type: "error" });
      }
    } catch {
      setNotification({ message: "Verbindung fehlgeschlagen", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Kostenlos registrieren | Contract AI</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Erstelle dein kostenloses Contract AI Konto und starte mit KI-gestützter Vertragsanalyse." />
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
              Starte kostenlos<br />in wenigen Minuten
            </h1>
            <p className="text-xl text-blue-100 mb-12 max-w-md">
              Erstelle professionelle Vertragsanalysen, verwalte Fristen und optimiere deine Verträge mit KI.
            </p>

            {/* Benefits */}
            <div className="space-y-4">
              {[
                "Kostenloser Start – keine Kreditkarte nötig",
                "3 kostenlose Analysen zum Testen",
                "KI-gestützte Vertragsoptimierung",
                "Jederzeit kündbar",
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-3 text-white/90">
                  <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-lg">{benefit}</span>
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

        {/* Right Side - Register Form */}
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
                "bg-blue-50 text-blue-800 border border-blue-200"
              }`}>
                <span>{notification.type === "success" ? "✓" : notification.type === "error" ? "✕" : "ℹ"}</span>
                <span className="text-sm">{notification.message}</span>
                <button onClick={() => setNotification(null)} className="ml-auto text-current opacity-50 hover:opacity-100">✕</button>
              </div>
            )}

            {!showEmailVerification ? (
              <>
                {/* Beta Badge */}
                {isBetaTester && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full text-sm font-semibold mb-6 shadow-lg shadow-orange-500/25">
                    <span>🎁</span>
                    <span>Beta-Tester Registrierung</span>
                  </div>
                )}

                {/* Header */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {isBetaTester ? "Willkommen, Beta-Tester!" : "Konto erstellen"}
                  </h2>
                  <p className="text-gray-600">
                    {isBetaTester
                      ? "3 Monate Premium kostenlos – alle Features inklusive!"
                      : "Füllen Sie das Formular aus, um loszulegen"
                    }
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleRegister} className="space-y-5">
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
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Passwort
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                      placeholder="Mindestens 6 Zeichen"
                      required
                      autoComplete="new-password"
                    />
                  </div>

                  <p className="text-xs text-gray-500">
                    Mit der Registrierung akzeptieren Sie unsere{" "}
                    <Link to="/agb" className="text-blue-600 hover:underline">AGB</Link> und{" "}
                    <Link to="/datenschutz" className="text-blue-600 hover:underline">Datenschutzerklärung</Link>.
                  </p>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span>🚀 Kostenlos registrieren</span>
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

                {/* Login Link */}
                <p className="text-center text-gray-600">
                  Bereits ein Konto?{" "}
                  <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                    Jetzt anmelden
                  </Link>
                </p>
              </>
            ) : (
              /* Email Verification */
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">E-Mail bestätigen</h2>
                <p className="text-gray-600 mb-4">
                  Wir haben eine Bestätigungs-E-Mail gesendet an:
                </p>

                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-green-700 font-medium mb-6">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>{email}</span>
                </div>

                {/* Steps */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  {[
                    { num: "1", label: "E-Mail öffnen", active: true },
                    { num: "2", label: "Link klicken", active: false },
                    { num: "3", label: "Anmelden", active: false },
                  ].map((step, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        step.active ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
                      }`}>
                        {step.num}
                      </div>
                      <span className="text-xs text-gray-600">{step.label}</span>
                    </div>
                  ))}
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
                    onClick={() => navigate("/login")}
                    className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
                  >
                    Zur Anmeldung
                  </button>
                </div>

                <div className="mt-8 p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tipp:</strong> Schauen Sie auch in Ihren Spam-Ordner, falls die E-Mail nicht ankommt.
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
