// 📁 frontend/src/components/LawyerMascot.tsx
// Premium AI Robot Lawyer Mascot - Contract AI Brand Character

export default function LawyerMascot({ size = 200 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 300 345"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* === GLOW EFFECTS === */}
      <defs>
        {/* Main blue glow */}
        <filter id="blueGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="dropShadow" x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#1e3a5f" floodOpacity="0.3" />
        </filter>

        {/* Suit gradient - deep navy */}
        <linearGradient id="suitBody" x1="90" y1="200" x2="210" y2="310">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="50%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        {/* Head metallic gradient */}
        <linearGradient id="headMetal" x1="100" y1="30" x2="200" y2="180">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="30%" stopColor="#f8fafc" />
          <stop offset="70%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        {/* Face screen gradient */}
        <linearGradient id="faceScreen" x1="115" y1="80" x2="185" y2="160">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="50%" stopColor="#1e40af" />
          <stop offset="100%" stopColor="#172554" />
        </linearGradient>
        {/* Eye glow */}
        <radialGradient id="eyeGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="60%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#2563eb" />
        </radialGradient>
        {/* Tie gradient */}
        <linearGradient id="tieGrad" x1="145" y1="195" x2="155" y2="260">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        {/* Scale glow */}
        <radialGradient id="scaleGlow" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
        {/* Circuit line gradient */}
        <linearGradient id="circuitGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
          <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
        {/* Shirt gradient */}
        <linearGradient id="shirtGrad" x1="130" y1="195" x2="170" y2="220">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>

      <g filter="url(#dropShadow)">
        {/* === BODY / SUIT === */}
        {/* Shoulders wide */}
        <path
          d="M75 230 C75 210, 100 195, 150 195 C200 195, 225 210, 225 230 L230 310 C230 325, 70 325, 70 310 Z"
          fill="url(#suitBody)"
        />
        {/* Suit shine left */}
        <path
          d="M85 220 C90 210, 115 200, 140 198 L120 310 L75 310 Z"
          fill="white"
          opacity="0.04"
        />
        {/* Lapel left */}
        <path d="M120 198 L150 250 L105 290" fill="#0f172a" opacity="0.6" />
        {/* Lapel right */}
        <path d="M180 198 L150 250 L195 290" fill="#0f172a" opacity="0.6" />
        {/* Lapel outline - subtle */}
        <path d="M120 198 L150 250" stroke="#334155" strokeWidth="0.8" opacity="0.5" />
        <path d="M180 198 L150 250" stroke="#334155" strokeWidth="0.8" opacity="0.5" />

        {/* White shirt V */}
        <path d="M128 198 L150 240 L172 198" fill="url(#shirtGrad)" />

        {/* Tie */}
        <path d="M146 210 L150 265 L154 210 Z" fill="url(#tieGrad)" />
        <rect x="144" y="205" width="12" height="7" rx="2" fill="#2563eb" />
        {/* Tie shine */}
        <path d="M148 215 L150 260 L149 215 Z" fill="white" opacity="0.15" />

        {/* Pocket square */}
        <path d="M185 225 L195 218 L200 228 L192 232 Z" fill="#60a5fa" opacity="0.7" />

        {/* === SCALE OF JUSTICE BADGE === */}
        <g transform="translate(100, 228)" filter="url(#softGlow)">
          <circle cx="0" cy="0" r="12" fill="url(#scaleGlow)" />
          {/* Scale post */}
          <line x1="0" y1="-7" x2="0" y2="5" stroke="#92400e" strokeWidth="1.5" />
          {/* Scale beam */}
          <line x1="-7" y1="-5" x2="7" y2="-5" stroke="#92400e" strokeWidth="1.5" />
          {/* Scale plates */}
          <path d="M-9 -5 Q-8 -1, -5 -1 Q-2 -1, -1 -5" stroke="#92400e" strokeWidth="1" fill="none" />
          <path d="M1 -5 Q2 -1, 5 -1 Q8 -1, 9 -5" stroke="#92400e" strokeWidth="1" fill="none" />
          {/* Scale base */}
          <path d="M-5 5 L5 5 L3 7 L-3 7 Z" fill="#92400e" />
        </g>

        {/* === HEAD === */}
        {/* Head shell - metallic */}
        <ellipse cx="150" cy="110" rx="62" ry="68" fill="url(#headMetal)" />

        {/* Head top ridge */}
        <path
          d="M95 90 C95 55, 120 35, 150 33 C180 35, 205 55, 205 90"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2"
          opacity="0.5"
        />

        {/* Antenna / AI indicator */}
        <g transform="translate(150, 33)">
          <line x1="0" y1="0" x2="0" y2="-18" stroke="#94a3b8" strokeWidth="2.5" />
          <circle cx="0" cy="-22" r="5" fill="#3b82f6" filter="url(#blueGlow)">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="0" cy="-22" r="2.5" fill="#93c5fd" />
        </g>

        {/* Face screen / visor */}
        <rect x="102" y="75" width="96" height="70" rx="20" fill="url(#faceScreen)" />
        {/* Screen inner glow */}
        <rect x="106" y="79" width="88" height="62" rx="17" fill="none" stroke="#3b82f6" strokeWidth="0.5" opacity="0.4" />
        {/* Screen reflection */}
        <path
          d="M110 82 C115 79, 175 79, 185 85 L185 90 C175 84, 120 84, 110 88 Z"
          fill="white"
          opacity="0.08"
        />

        {/* === EYES === */}
        {/* Left eye */}
        <g>
          <ellipse cx="130" cy="108" rx="14" ry="13" fill="url(#eyeGlow)" filter="url(#softGlow)">
            <animate attributeName="ry" values="13;1;13" dur="4s" begin="2s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="130" cy="108" rx="8" ry="8" fill="#1e3a8a" />
          <ellipse cx="130" cy="108" rx="5" ry="5" fill="#60a5fa" />
          <circle cx="133" cy="105" r="2.5" fill="white" opacity="0.9" />
          <circle cx="127" cy="111" r="1.2" fill="white" opacity="0.4" />
        </g>
        {/* Right eye */}
        <g>
          <ellipse cx="170" cy="108" rx="14" ry="13" fill="url(#eyeGlow)" filter="url(#softGlow)">
            <animate attributeName="ry" values="13;1;13" dur="4s" begin="2s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="170" cy="108" rx="8" ry="8" fill="#1e3a8a" />
          <ellipse cx="170" cy="108" rx="5" ry="5" fill="#60a5fa" />
          <circle cx="173" cy="105" r="2.5" fill="white" opacity="0.9" />
          <circle cx="167" cy="111" r="1.2" fill="white" opacity="0.4" />
        </g>

        {/* === SMILE === */}
        <path
          d="M130 130 Q140 142, 150 142 Q160 142, 170 130"
          stroke="#60a5fa"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          filter="url(#softGlow)"
        />

        {/* === CIRCUIT PATTERNS ON HEAD === */}
        {/* Left side circuits */}
        <g opacity="0.3">
          <path d="M92 95 L88 95 L88 110 L92 110" stroke="#3b82f6" strokeWidth="1" fill="none" />
          <circle cx="88" cy="102" r="2" fill="#3b82f6" />
          <path d="M92 120 L85 120" stroke="#3b82f6" strokeWidth="1" fill="none" />
          <circle cx="85" cy="120" r="1.5" fill="#60a5fa" />
        </g>
        {/* Right side circuits */}
        <g opacity="0.3">
          <path d="M208 95 L212 95 L212 110 L208 110" stroke="#3b82f6" strokeWidth="1" fill="none" />
          <circle cx="212" cy="102" r="2" fill="#3b82f6" />
          <path d="M208 120 L215 120" stroke="#3b82f6" strokeWidth="1" fill="none" />
          <circle cx="215" cy="120" r="1.5" fill="#60a5fa" />
        </g>

        {/* === EARS / SIDE PANELS === */}
        <rect x="82" y="95" width="10" height="30" rx="5" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
        <rect x="208" y="95" width="10" height="30" rx="5" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
        {/* Ear lights */}
        <circle cx="87" cy="105" r="2.5" fill="#3b82f6" opacity="0.7">
          <animate attributeName="opacity" values="0.4;0.9;0.4" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="213" cy="105" r="2.5" fill="#3b82f6" opacity="0.7">
          <animate attributeName="opacity" values="0.4;0.9;0.4" dur="3s" begin="1.5s" repeatCount="indefinite" />
        </circle>

        {/* === NECK === */}
        <rect x="135" y="172" width="30" height="26" rx="4" fill="#cbd5e1" />
        <line x1="142" y1="175" x2="142" y2="195" stroke="#94a3b8" strokeWidth="0.5" opacity="0.5" />
        <line x1="150" y1="175" x2="150" y2="195" stroke="#94a3b8" strokeWidth="0.5" opacity="0.5" />
        <line x1="158" y1="175" x2="158" y2="195" stroke="#94a3b8" strokeWidth="0.5" opacity="0.5" />

        {/* === LEFT ARM - RAISED WAVING === */}
        <g>
          {/* Upper arm */}
          <path
            d="M80 220 C60 210, 40 180, 35 160"
            stroke="#0f172a"
            strokeWidth="22"
            strokeLinecap="round"
            fill="none"
          />
          {/* Arm shine */}
          <path
            d="M80 220 C60 210, 40 180, 35 160"
            stroke="#1e293b"
            strokeWidth="18"
            strokeLinecap="round"
            fill="none"
          />
          {/* Hand / glove */}
          <circle cx="33" cy="152" r="16" fill="#e2e8f0" />
          <circle cx="33" cy="152" r="14" fill="#f1f5f9" />
          {/* Fingers */}
          <ellipse cx="22" cy="140" rx="5" ry="8" fill="#f1f5f9" transform="rotate(-20, 22, 140)" />
          <ellipse cx="30" cy="136" rx="4.5" ry="9" fill="#f1f5f9" transform="rotate(-5, 30, 136)" />
          <ellipse cx="38" cy="135" rx="4.5" ry="9" fill="#f1f5f9" transform="rotate(5, 38, 135)" />
          <ellipse cx="46" cy="138" rx="4.5" ry="8" fill="#f1f5f9" transform="rotate(15, 46, 138)" />
          {/* Wrist detail */}
          <circle cx="33" cy="160" r="3" fill="#3b82f6" opacity="0.5" />
        </g>

        {/* === RIGHT ARM - HOLDING SCALES === */}
        <g>
          {/* Upper arm */}
          <path
            d="M220 220 C240 205, 250 180, 248 160"
            stroke="#0f172a"
            strokeWidth="22"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M220 220 C240 205, 250 180, 248 160"
            stroke="#1e293b"
            strokeWidth="18"
            strokeLinecap="round"
            fill="none"
          />
          {/* Hand */}
          <circle cx="248" cy="152" r="14" fill="#f1f5f9" />

          {/* === FLOATING SCALES OF JUSTICE === */}
          <g filter="url(#blueGlow)">
            {/* Center post */}
            <line x1="248" y1="100" x2="248" y2="140" stroke="#fbbf24" strokeWidth="2.5" />
            {/* Top ornament */}
            <circle cx="248" cy="96" r="5" fill="#fbbf24" />
            <circle cx="248" cy="96" r="3" fill="#fde68a" />
            {/* Beam */}
            <line x1="225" y1="108" x2="271" y2="108" stroke="#fbbf24" strokeWidth="2" />
            {/* Left chain */}
            <line x1="228" y1="108" x2="228" y2="122" stroke="#fbbf24" strokeWidth="1.2" />
            <line x1="225" y1="108" x2="225" y2="120" stroke="#fbbf24" strokeWidth="1" />
            <line x1="231" y1="108" x2="231" y2="120" stroke="#fbbf24" strokeWidth="1" />
            {/* Left plate */}
            <ellipse cx="228" cy="125" rx="10" ry="4" fill="#fbbf24" />
            <ellipse cx="228" cy="124" rx="9" ry="3" fill="#fde68a" />
            {/* Right chain */}
            <line x1="268" y1="108" x2="268" y2="122" stroke="#fbbf24" strokeWidth="1.2" />
            <line x1="265" y1="108" x2="265" y2="120" stroke="#fbbf24" strokeWidth="1" />
            <line x1="271" y1="108" x2="271" y2="120" stroke="#fbbf24" strokeWidth="1" />
            {/* Right plate */}
            <ellipse cx="268" cy="125" rx="10" ry="4" fill="#fbbf24" />
            <ellipse cx="268" cy="124" rx="9" ry="3" fill="#fde68a" />
          </g>
        </g>

        {/* === SUIT BUTTONS === */}
        <circle cx="150" cy="270" r="3" fill="#334155" stroke="#475569" strokeWidth="0.5" />
        <circle cx="150" cy="285" r="3" fill="#334155" stroke="#475569" strokeWidth="0.5" />

        {/* === CIRCUIT PATTERN ON SUIT === */}
        <g opacity="0.15">
          <line x1="110" y1="250" x2="110" y2="280" stroke="#3b82f6" strokeWidth="0.8" />
          <line x1="110" y1="265" x2="120" y2="265" stroke="#3b82f6" strokeWidth="0.8" />
          <circle cx="120" cy="265" r="1.5" fill="#3b82f6" />
          <line x1="190" y1="245" x2="190" y2="275" stroke="#3b82f6" strokeWidth="0.8" />
          <line x1="190" y1="260" x2="180" y2="260" stroke="#3b82f6" strokeWidth="0.8" />
          <circle cx="180" cy="260" r="1.5" fill="#3b82f6" />
        </g>

        {/* === FLOATING PARTICLES === */}
        <circle cx="60" cy="80" r="2" fill="#3b82f6" opacity="0.4">
          <animate attributeName="cy" values="80;70;80" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="240" cy="70" r="1.5" fill="#60a5fa" opacity="0.3">
          <animate attributeName="cy" values="70;60;70" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.1;0.5;0.1" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="55" cy="150" r="1.5" fill="#93c5fd" opacity="0.3">
          <animate attributeName="cy" values="150;140;150" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.2;0.5;0.2" dur="4s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
}
