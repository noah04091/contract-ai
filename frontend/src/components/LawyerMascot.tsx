// 📁 frontend/src/components/LawyerMascot.tsx
// Ultra-Premium AI Robot Lawyer Mascot - Contract AI Brand Character
// Designed for maximum visual impact with 3D depth, glass effects, and cinematic lighting

export default function LawyerMascot({ size = 220 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.18}
      viewBox="0 0 340 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* === FILTERS === */}
        <filter id="heroGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="8" result="g1" />
          <feGaussianBlur stdDeviation="3" result="g2" />
          <feMerge>
            <feMergeNode in="g1" />
            <feMergeNode in="g2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="innerGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="mainShadow" x="-15%" y="-5%" width="130%" height="130%">
          <feDropShadow dx="0" dy="10" stdDeviation="16" floodColor="#0c1222" floodOpacity="0.4" />
        </filter>
        <filter id="glassFrost">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" />
        </filter>

        {/* === GRADIENTS === */}
        {/* Premium suit - 3D depth */}
        <linearGradient id="suitMain" x1="80" y1="220" x2="260" y2="370">
          <stop offset="0%" stopColor="#111827" />
          <stop offset="25%" stopColor="#1f2937" />
          <stop offset="50%" stopColor="#111827" />
          <stop offset="75%" stopColor="#1f2937" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="suitShine" x1="100" y1="220" x2="180" y2="360">
          <stop offset="0%" stopColor="white" stopOpacity="0.06" />
          <stop offset="50%" stopColor="white" stopOpacity="0.02" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* Head - brushed chrome */}
        <linearGradient id="headChrome" x1="95" y1="20" x2="245" y2="195">
          <stop offset="0%" stopColor="#d1d5db" />
          <stop offset="15%" stopColor="#f3f4f6" />
          <stop offset="35%" stopColor="#e5e7eb" />
          <stop offset="55%" stopColor="#f9fafb" />
          <stop offset="75%" stopColor="#d1d5db" />
          <stop offset="100%" stopColor="#9ca3af" />
        </linearGradient>
        <radialGradient id="headHighlight" cx="0.35" cy="0.25" r="0.5">
          <stop offset="0%" stopColor="white" stopOpacity="0.5" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>

        {/* Visor - deep glass */}
        <linearGradient id="visorGlass" x1="112" y1="75" x2="228" y2="170">
          <stop offset="0%" stopColor="#0c1a3d" />
          <stop offset="30%" stopColor="#162557" />
          <stop offset="60%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#0c1a3d" />
        </linearGradient>
        <linearGradient id="visorReflect" x1="120" y1="80" x2="220" y2="90">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="30%" stopColor="white" stopOpacity="0.12" />
          <stop offset="70%" stopColor="white" stopOpacity="0.08" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* Eye cores */}
        <radialGradient id="eyeCore" cx="0.45" cy="0.4" r="0.55">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="40%" stopColor="#60a5fa" />
          <stop offset="70%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </radialGradient>
        <radialGradient id="eyeOuter" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.3" />
        </radialGradient>
        <radialGradient id="pupilGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#bfdbfe" />
          <stop offset="100%" stopColor="#3b82f6" />
        </radialGradient>

        {/* Tie silk */}
        <linearGradient id="tieSilk" x1="160" y1="225" x2="175" y2="310">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="30%" stopColor="#60a5fa" />
          <stop offset="60%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>

        {/* Gold premium */}
        <linearGradient id="goldPremium" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="25%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="75%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
        <linearGradient id="goldDark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>

        {/* Robot hand */}
        <linearGradient id="handMetal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e5e7eb" />
          <stop offset="50%" stopColor="#f9fafb" />
          <stop offset="100%" stopColor="#d1d5db" />
        </linearGradient>

        {/* Shirt crisp */}
        <linearGradient id="shirtCrisp" x1="145" y1="225" x2="195" y2="260">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="50%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        {/* Ambient glow behind character */}
        <radialGradient id="ambientGlow" cx="0.5" cy="0.45" r="0.5">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.12" />
          <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* === AMBIENT GLOW BEHIND CHARACTER === */}
      <ellipse cx="170" cy="200" rx="160" ry="190" fill="url(#ambientGlow)" />

      <g filter="url(#mainShadow)">

        {/* ================================================================ */}
        {/* BODY / SUIT                                                      */}
        {/* ================================================================ */}
        <path
          d="M82 268 C82 242, 115 225, 170 225 C225 225, 258 242, 258 268 L264 365 C264 382, 76 382, 76 365 Z"
          fill="url(#suitMain)"
        />
        {/* 3D suit highlight left */}
        <path
          d="M92 258 C100 245, 130 232, 160 228 L135 365 L82 365 Z"
          fill="url(#suitShine)"
        />
        {/* 3D suit shadow right */}
        <path
          d="M248 258 C240 245, 210 232, 180 228 L205 365 L258 365 Z"
          fill="black"
          opacity="0.08"
        />

        {/* Lapels - deep cut */}
        <path d="M135 228 L170 290 L112 345" fill="#0a0f1a" opacity="0.5" />
        <path d="M205 228 L170 290 L228 345" fill="#0a0f1a" opacity="0.5" />
        {/* Lapel edges - subtle stitching */}
        <path d="M135 228 L170 290" stroke="#374151" strokeWidth="0.6" strokeDasharray="3 2" opacity="0.3" />
        <path d="M205 228 L170 290" stroke="#374151" strokeWidth="0.6" strokeDasharray="3 2" opacity="0.3" />

        {/* Shirt V */}
        <path d="M143 228 L170 280 L197 228" fill="url(#shirtCrisp)" />
        {/* Shirt buttons */}
        <circle cx="170" cy="245" r="1.5" fill="#d1d5db" />
        <circle cx="170" cy="255" r="1.5" fill="#d1d5db" />

        {/* Tie - silk */}
        <path d="M163 242 L170 310 L177 242 Z" fill="url(#tieSilk)" />
        <rect x="161" y="236" width="18" height="9" rx="3" fill="#2563eb" />
        {/* Tie dimple */}
        <ellipse cx="170" cy="241" rx="3" ry="1.5" fill="#1d4ed8" />
        {/* Tie shine */}
        <path d="M166 250 L170 305 L168 250 Z" fill="white" opacity="0.12" />

        {/* Pocket square - folded */}
        <g transform="translate(210, 254)">
          <path d="M0 0 L12 -8 L20 2 L14 8 Z" fill="#60a5fa" opacity="0.8" />
          <path d="M0 0 L12 -8 L14 -3 L3 4 Z" fill="#93c5fd" opacity="0.5" />
        </g>

        {/* Suit buttons */}
        <circle cx="170" cy="318" r="3.5" fill="#1f2937" stroke="#374151" strokeWidth="0.8" />
        <circle cx="170" cy="336" r="3.5" fill="#1f2937" stroke="#374151" strokeWidth="0.8" />
        {/* Button shines */}
        <circle cx="169" cy="317" r="1" fill="#4b5563" />
        <circle cx="169" cy="335" r="1" fill="#4b5563" />

        {/* === SCALE OF JUSTICE LAPEL PIN === */}
        <g transform="translate(118, 268)" filter="url(#innerGlow)">
          <circle cx="0" cy="0" r="11" fill="url(#goldPremium)" />
          <circle cx="0" cy="0" r="9" fill="url(#goldPremium)" stroke="#92400e" strokeWidth="0.5" />
          <line x1="0" y1="-5.5" x2="0" y2="4" stroke="url(#goldDark)" strokeWidth="1.3" />
          <line x1="-6" y1="-3.5" x2="6" y2="-3.5" stroke="url(#goldDark)" strokeWidth="1.3" />
          <path d="M-7.5 -3.5 Q-6 0.5, -3 0.5 Q0 0.5, 1 -3.5" stroke="url(#goldDark)" strokeWidth="0.8" fill="none" />
          <path d="M-1 -3.5 Q0 0.5, 3 0.5 Q6 0.5, 7.5 -3.5" stroke="url(#goldDark)" strokeWidth="0.8" fill="none" />
          <path d="M-4 4 L4 4 L3 6 L-3 6 Z" fill="url(#goldDark)" />
        </g>

        {/* Circuit patterns on suit */}
        <g opacity="0.08">
          <path d="M120 295 L120 330 L130 330" stroke="#60a5fa" strokeWidth="0.8" />
          <circle cx="130" cy="330" r="2" fill="#60a5fa" />
          <path d="M220 290 L220 325 L210 325" stroke="#60a5fa" strokeWidth="0.8" />
          <circle cx="210" cy="325" r="2" fill="#60a5fa" />
          <path d="M105 310 L105 345" stroke="#60a5fa" strokeWidth="0.6" />
          <path d="M235 305 L235 340" stroke="#60a5fa" strokeWidth="0.6" />
        </g>

        {/* ================================================================ */}
        {/* NECK                                                             */}
        {/* ================================================================ */}
        <rect x="152" y="200" width="36" height="30" rx="5" fill="url(#headChrome)" />
        {/* Neck segments */}
        <g opacity="0.25">
          <line x1="157" y1="204" x2="157" y2="228" stroke="#9ca3af" strokeWidth="0.5" />
          <line x1="164" y1="204" x2="164" y2="228" stroke="#9ca3af" strokeWidth="0.5" />
          <line x1="170" y1="204" x2="170" y2="228" stroke="#9ca3af" strokeWidth="0.5" />
          <line x1="176" y1="204" x2="176" y2="228" stroke="#9ca3af" strokeWidth="0.5" />
          <line x1="183" y1="204" x2="183" y2="228" stroke="#9ca3af" strokeWidth="0.5" />
        </g>
        {/* Neck ring */}
        <ellipse cx="170" cy="204" rx="18" ry="4" fill="none" stroke="#9ca3af" strokeWidth="1" opacity="0.4" />

        {/* ================================================================ */}
        {/* HEAD                                                             */}
        {/* ================================================================ */}
        {/* Head main shape - brushed chrome */}
        <ellipse cx="170" cy="120" rx="72" ry="78" fill="url(#headChrome)" />
        {/* Head highlight - top left shine */}
        <ellipse cx="170" cy="120" rx="72" ry="78" fill="url(#headHighlight)" />

        {/* Head contour line - premium edge */}
        <ellipse cx="170" cy="120" rx="72" ry="78" fill="none" stroke="#b0b8c4" strokeWidth="0.8" opacity="0.3" />

        {/* Top ridge */}
        <path
          d="M105 98 C105 58, 135 35, 170 32 C205 35, 235 58, 235 98"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="1.5"
          opacity="0.4"
        />

        {/* === ANTENNA === */}
        <g transform="translate(170, 32)">
          <rect x="-2" y="-22" width="4" height="22" rx="2" fill="#b0b8c4" />
          {/* Antenna orb */}
          <circle cx="0" cy="-26" r="7" fill="#1e40af" filter="url(#heroGlow)">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="0" cy="-26" r="4.5" fill="#3b82f6">
            <animate attributeName="r" values="4.5;5;4.5" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="0" cy="-26" r="2.5" fill="#93c5fd" />
          <circle cx="-1" cy="-28" r="1.2" fill="white" opacity="0.8" />
          {/* Antenna rings */}
          <ellipse cx="0" cy="-18" rx="5" ry="1.5" fill="none" stroke="#60a5fa" strokeWidth="0.5" opacity="0.3">
            <animate attributeName="opacity" values="0.1;0.4;0.1" dur="3s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="0" cy="-12" rx="4" ry="1" fill="none" stroke="#60a5fa" strokeWidth="0.4" opacity="0.2">
            <animate attributeName="opacity" values="0.1;0.3;0.1" dur="3s" begin="0.5s" repeatCount="indefinite" />
          </ellipse>
        </g>

        {/* === VISOR / FACE SCREEN === */}
        <rect x="110" y="82" width="120" height="80" rx="24" fill="url(#visorGlass)" />
        {/* Visor bevel */}
        <rect x="110" y="82" width="120" height="80" rx="24" fill="none" stroke="#2563eb" strokeWidth="1.2" opacity="0.25" />
        {/* Visor inner bevel */}
        <rect x="114" y="86" width="112" height="72" rx="21" fill="none" stroke="#1e40af" strokeWidth="0.5" opacity="0.15" />
        {/* Glass reflection - top curve */}
        <path
          d="M118 90 C125 84, 205 84, 218 92 L218 100 C208 90, 132 90, 118 96 Z"
          fill="url(#visorReflect)"
        />
        {/* Scanline effect */}
        <g opacity="0.03">
          <line x1="115" y1="95" x2="225" y2="95" stroke="white" strokeWidth="0.5" />
          <line x1="115" y1="105" x2="225" y2="105" stroke="white" strokeWidth="0.5" />
          <line x1="115" y1="115" x2="225" y2="115" stroke="white" strokeWidth="0.5" />
          <line x1="115" y1="125" x2="225" y2="125" stroke="white" strokeWidth="0.5" />
          <line x1="115" y1="135" x2="225" y2="135" stroke="white" strokeWidth="0.5" />
          <line x1="115" y1="145" x2="225" y2="145" stroke="white" strokeWidth="0.5" />
        </g>

        {/* === EYES === */}
        {/* Left eye assembly */}
        <g>
          {/* Outer glow ring */}
          <circle cx="145" cy="118" r="20" fill="url(#eyeOuter)" filter="url(#softGlow)" opacity="0.6">
            <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite" />
          </circle>
          {/* Eye socket */}
          <ellipse cx="145" cy="118" rx="17" ry="16" fill="#0c1a3d" />
          {/* Iris ring */}
          <ellipse cx="145" cy="118" rx="14" ry="13" fill="url(#eyeCore)" filter="url(#innerGlow)">
            <animate attributeName="ry" values="13;1.5;13" dur="5s" begin="2.5s" repeatCount="indefinite" />
          </ellipse>
          {/* Pupil */}
          <ellipse cx="145" cy="118" rx="8" ry="8" fill="#0c2461">
            <animate attributeName="ry" values="8;1;8" dur="5s" begin="2.5s" repeatCount="indefinite" />
          </ellipse>
          {/* Inner light */}
          <ellipse cx="145" cy="118" rx="5" ry="5" fill="url(#pupilGlow)">
            <animate attributeName="ry" values="5;0.8;5" dur="5s" begin="2.5s" repeatCount="indefinite" />
          </ellipse>
          {/* Sparkle highlights */}
          <circle cx="149" cy="113" r="3" fill="white" opacity="0.95" />
          <circle cx="140" cy="122" r="1.5" fill="white" opacity="0.5" />
          <circle cx="151" cy="120" r="0.8" fill="white" opacity="0.3" />
        </g>

        {/* Right eye assembly */}
        <g>
          <circle cx="195" cy="118" r="20" fill="url(#eyeOuter)" filter="url(#softGlow)" opacity="0.6">
            <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite" />
          </circle>
          <ellipse cx="195" cy="118" rx="17" ry="16" fill="#0c1a3d" />
          <ellipse cx="195" cy="118" rx="14" ry="13" fill="url(#eyeCore)" filter="url(#innerGlow)">
            <animate attributeName="ry" values="13;1.5;13" dur="5s" begin="2.5s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="195" cy="118" rx="8" ry="8" fill="#0c2461">
            <animate attributeName="ry" values="8;1;8" dur="5s" begin="2.5s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="195" cy="118" rx="5" ry="5" fill="url(#pupilGlow)">
            <animate attributeName="ry" values="5;0.8;5" dur="5s" begin="2.5s" repeatCount="indefinite" />
          </ellipse>
          <circle cx="199" cy="113" r="3" fill="white" opacity="0.95" />
          <circle cx="190" cy="122" r="1.5" fill="white" opacity="0.5" />
          <circle cx="201" cy="120" r="0.8" fill="white" opacity="0.3" />
        </g>

        {/* === SMILE === */}
        <path
          d="M143 148 Q155 162, 170 162 Q185 162, 197 148"
          stroke="#60a5fa"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          filter="url(#softGlow)"
        />
        {/* Smile glow underneath */}
        <path
          d="M148 150 Q160 160, 170 160 Q180 160, 192 150"
          stroke="#93c5fd"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.3"
        />

        {/* === SIDE PANELS / EARS === */}
        {/* Left ear */}
        <g>
          <rect x="90" y="102" width="14" height="38" rx="7" fill="url(#headChrome)" stroke="#9ca3af" strokeWidth="0.8" />
          {/* LED strip */}
          <circle cx="97" cy="112" r="3" fill="#1d4ed8">
            <animate attributeName="fill" values="#1d4ed8;#60a5fa;#1d4ed8" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="97" cy="122" r="2" fill="#3b82f6" opacity="0.5">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.5s" begin="0.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="97" cy="130" r="2" fill="#3b82f6" opacity="0.3">
            <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3s" begin="1.5s" repeatCount="indefinite" />
          </circle>
        </g>
        {/* Right ear */}
        <g>
          <rect x="236" y="102" width="14" height="38" rx="7" fill="url(#headChrome)" stroke="#9ca3af" strokeWidth="0.8" />
          <circle cx="243" cy="112" r="3" fill="#1d4ed8">
            <animate attributeName="fill" values="#1d4ed8;#60a5fa;#1d4ed8" dur="2s" begin="1s" repeatCount="indefinite" />
          </circle>
          <circle cx="243" cy="122" r="2" fill="#3b82f6" opacity="0.5">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.5s" begin="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="243" cy="130" r="2" fill="#3b82f6" opacity="0.3">
            <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3s" begin="0.3s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* === CIRCUIT TRACES ON HEAD === */}
        <g opacity="0.2">
          <path d="M100 105 L96 105 L96 125 L100 125" stroke="#3b82f6" strokeWidth="0.8" fill="none" />
          <path d="M240 105 L244 105 L244 125 L240 125" stroke="#3b82f6" strokeWidth="0.8" fill="none" />
          <circle cx="96" cy="115" r="1.5" fill="#60a5fa" />
          <circle cx="244" cy="115" r="1.5" fill="#60a5fa" />
          <path d="M100 140 L92 140 L92 145" stroke="#3b82f6" strokeWidth="0.6" fill="none" />
          <path d="M240 140 L248 140 L248 145" stroke="#3b82f6" strokeWidth="0.6" fill="none" />
        </g>

        {/* ================================================================ */}
        {/* LEFT ARM - WAVING                                                */}
        {/* ================================================================ */}
        <g>
          {/* Shoulder joint */}
          <circle cx="88" cy="255" r="12" fill="#1f2937" />
          <circle cx="88" cy="255" r="8" fill="#374151" />
          {/* Upper arm */}
          <path
            d="M88 255 C68 242, 48 210, 42 185"
            stroke="#111827"
            strokeWidth="26"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M88 255 C68 242, 48 210, 42 185"
            stroke="#1f2937"
            strokeWidth="22"
            strokeLinecap="round"
            fill="none"
          />
          {/* Arm highlight */}
          <path
            d="M85 250 C67 238, 50 212, 45 190"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            opacity="0.06"
          />
          {/* Elbow joint */}
          <circle cx="42" cy="185" r="8" fill="#374151" stroke="#4b5563" strokeWidth="1" />
          {/* Hand sphere */}
          <circle cx="38" cy="172" r="18" fill="url(#handMetal)" />
          <circle cx="38" cy="172" r="16" fill="#f3f4f6" />
          {/* Hand shine */}
          <ellipse cx="34" cy="167" rx="8" ry="6" fill="white" opacity="0.15" />
          {/* Fingers splayed */}
          <ellipse cx="24" cy="157" rx="5.5" ry="10" fill="url(#handMetal)" transform="rotate(-25, 24, 157)" />
          <ellipse cx="34" cy="152" rx="5" ry="11" fill="url(#handMetal)" transform="rotate(-10, 34, 152)" />
          <ellipse cx="44" cy="150" rx="5" ry="11" fill="url(#handMetal)" transform="rotate(5, 44, 150)" />
          <ellipse cx="53" cy="154" rx="5" ry="10" fill="url(#handMetal)" transform="rotate(18, 53, 154)" />
          {/* Finger joints */}
          <circle cx="24" cy="157" r="1.5" fill="#9ca3af" opacity="0.4" />
          <circle cx="34" cy="152" r="1.5" fill="#9ca3af" opacity="0.4" />
          <circle cx="44" cy="150" r="1.5" fill="#9ca3af" opacity="0.4" />
          <circle cx="53" cy="154" r="1.5" fill="#9ca3af" opacity="0.4" />
          {/* Wrist glow */}
          <circle cx="38" cy="182" r="4" fill="#3b82f6" opacity="0.4" filter="url(#innerGlow)">
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* ================================================================ */}
        {/* RIGHT ARM - HOLDING GOLDEN SCALES                                */}
        {/* ================================================================ */}
        <g>
          {/* Shoulder joint */}
          <circle cx="252" cy="255" r="12" fill="#1f2937" />
          <circle cx="252" cy="255" r="8" fill="#374151" />
          {/* Upper arm */}
          <path
            d="M252 255 C272 240, 282 210, 278 182"
            stroke="#111827"
            strokeWidth="26"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M252 255 C272 240, 282 210, 278 182"
            stroke="#1f2937"
            strokeWidth="22"
            strokeLinecap="round"
            fill="none"
          />
          {/* Arm highlight */}
          <path
            d="M255 250 C273 237, 280 212, 276 188"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            opacity="0.06"
          />
          {/* Elbow */}
          <circle cx="278" cy="182" r="8" fill="#374151" stroke="#4b5563" strokeWidth="1" />
          {/* Hand */}
          <circle cx="278" cy="168" r="16" fill="#f3f4f6" />

          {/* === GOLDEN SCALES OF JUSTICE === */}
          <g filter="url(#heroGlow)">
            {/* Main post */}
            <rect x="276" y="108" width="4" height="50" rx="2" fill="url(#goldPremium)" />
            {/* Top crown ornament */}
            <circle cx="278" cy="104" r="8" fill="url(#goldPremium)" />
            <circle cx="278" cy="104" r="5.5" fill="#fde68a" />
            <circle cx="276" cy="102" r="1.5" fill="white" opacity="0.6" />

            {/* Beam */}
            <rect x="248" y="117" width="60" height="3" rx="1.5" fill="url(#goldPremium)" />

            {/* Left chain + plate */}
            <line x1="252" y1="120" x2="252" y2="138" stroke="#d97706" strokeWidth="1.5" />
            <line x1="248" y1="120" x2="248" y2="136" stroke="#d97706" strokeWidth="1" />
            <line x1="256" y1="120" x2="256" y2="136" stroke="#d97706" strokeWidth="1" />
            <ellipse cx="252" cy="140" rx="13" ry="5" fill="url(#goldPremium)" />
            <ellipse cx="252" cy="139" rx="11" ry="3.5" fill="#fde68a" />
            <ellipse cx="250" cy="138" rx="4" ry="1.5" fill="white" opacity="0.2" />

            {/* Right chain + plate */}
            <line x1="304" y1="120" x2="304" y2="138" stroke="#d97706" strokeWidth="1.5" />
            <line x1="300" y1="120" x2="300" y2="136" stroke="#d97706" strokeWidth="1" />
            <line x1="308" y1="120" x2="308" y2="136" stroke="#d97706" strokeWidth="1" />
            <ellipse cx="304" cy="140" rx="13" ry="5" fill="url(#goldPremium)" />
            <ellipse cx="304" cy="139" rx="11" ry="3.5" fill="#fde68a" />
            <ellipse cx="302" cy="138" rx="4" ry="1.5" fill="white" opacity="0.2" />
          </g>
        </g>

        {/* ================================================================ */}
        {/* FLOATING PARTICLES + ENERGY                                      */}
        {/* ================================================================ */}
        <g>
          {/* Large particles */}
          <circle cx="65" cy="85" r="3" fill="#3b82f6" opacity="0.5" filter="url(#innerGlow)">
            <animate attributeName="cy" values="85;72;85" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.2;0.6;0.2" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle cx="280" cy="72" r="2.5" fill="#60a5fa" opacity="0.4" filter="url(#innerGlow)">
            <animate attributeName="cy" values="72;58;72" dur="3.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.1;0.5;0.1" dur="3.5s" repeatCount="indefinite" />
          </circle>
          {/* Small sparkles */}
          <circle cx="55" cy="160" r="1.5" fill="#93c5fd" opacity="0.3">
            <animate attributeName="cy" values="160;148;160" dur="5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.1;0.4;0.1" dur="5s" repeatCount="indefinite" />
          </circle>
          <circle cx="72" cy="50" r="2" fill="#60a5fa" opacity="0.3">
            <animate attributeName="cy" values="50;38;50" dur="3s" begin="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.15;0.45;0.15" dur="3s" begin="1s" repeatCount="indefinite" />
          </circle>
          <circle cx="260" cy="55" r="1.8" fill="#93c5fd" opacity="0.25">
            <animate attributeName="cy" values="55;42;55" dur="4.5s" begin="0.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.1;0.35;0.1" dur="4.5s" begin="0.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="48" cy="120" r="1.2" fill="#bfdbfe" opacity="0.2">
            <animate attributeName="cy" values="120;110;120" dur="3.2s" begin="2s" repeatCount="indefinite" />
          </circle>
          {/* Energy dots near antenna */}
          <circle cx="155" cy="15" r="1.5" fill="#60a5fa" opacity="0.3">
            <animate attributeName="opacity" values="0;0.5;0" dur="2s" begin="0.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="188" cy="10" r="1" fill="#93c5fd" opacity="0.2">
            <animate attributeName="opacity" values="0;0.4;0" dur="2.5s" begin="1.2s" repeatCount="indefinite" />
          </circle>
        </g>

      </g>
    </svg>
  );
}
