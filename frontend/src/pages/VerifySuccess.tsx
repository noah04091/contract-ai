import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export default function VerifySuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(5);

  const email = searchParams.get('email') || 'Ihre E-Mail-Adresse';

  useEffect(() => {
    // Countdown Timer
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
    };
  }, [navigate]);

  return (
    <>
      <Helmet>
        <title>E-Mail bestätigt | Contract AI</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Ihre E-Mail-Adresse wurde erfolgreich bestätigt." />
      </Helmet>

      <div className="min-h-screen flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-12 flex-col justify-between relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-400 rounded-full blur-3xl"></div>
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
              Willkommen bei<br />Contract AI!
            </h1>
            <p className="text-xl text-emerald-100 mb-12 max-w-md">
              Ihr Konto ist jetzt vollständig aktiviert. Starten Sie mit der intelligenten Vertragsanalyse.
            </p>

            {/* Features */}
            <div className="space-y-4">
              {[
                "KI-gestützte Vertragsanalyse",
                "Automatische Fristenverwaltung",
                "Optimierungsvorschläge",
                "Risiko-Erkennung",
                "Vertragsgenerator",
                "Digitale Signaturen",
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-white/90">
                  <svg className="w-5 h-5 text-emerald-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-lg">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Text */}
          <div className="relative z-10">
            <p className="text-emerald-200 text-sm">
              Bereits über 1.000+ Verträge analysiert
            </p>
          </div>
        </div>

        {/* Right Side - Success Content */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">Contract AI</span>
            </div>

            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Success Message */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">E-Mail bestätigt!</h2>
              <p className="text-gray-600">
                Ihre E-Mail-Adresse wurde erfolgreich verifiziert.
              </p>
            </div>

            {/* Email Badge */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{email}</span>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => navigate("/login")}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 mb-6"
            >
              <span>Jetzt anmelden</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>

            {/* Countdown */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 transform -rotate-90">
                  <circle
                    cx="20"
                    cy="20"
                    r="18"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="18"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeDasharray={113.04}
                    strokeDashoffset={113.04 - (113.04 * (5 - countdown)) / 5}
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700">
                  {countdown}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                Automatische Weiterleitung in <span className="font-semibold text-gray-700">{countdown}s</span>
              </div>
            </div>

            {/* Alternative Links */}
            <div className="flex items-center justify-center gap-4 text-sm">
              <button
                onClick={() => navigate("/")}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                Zur Startseite
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => navigate("/pricing")}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                Preise ansehen
              </button>
            </div>

            {/* Mobile Features */}
            <div className="lg:hidden mt-10 p-6 bg-white rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Ihre Vorteile:</h3>
              <div className="space-y-3">
                {[
                  "KI-gestützte Vertragsanalyse",
                  "Automatische Fristenverwaltung",
                  "Optimierungsvorschläge",
                  "Risiko-Erkennung",
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
