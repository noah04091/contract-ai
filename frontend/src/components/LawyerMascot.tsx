// 📁 frontend/src/components/LawyerMascot.tsx
// Contract AI Brand Entity — Abstract AI Persona
// Enterprise-grade visual identity: Apple / OpenAI / Palantir level
// NOT a mascot. A silent, sovereign, abstract KI-Rechtsassistent.

export default function LawyerMascot({ size = 220 }: { size?: number }) {
  const h = size * 1.25;
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 360 450"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* ── FILTERS ── */}
        <filter id="ambientBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="30" />
        </filter>
        <filter id="coreGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="8" result="g1" />
          <feGaussianBlur stdDeviation="3" result="g2" />
          <feMerge>
            <feMergeNode in="g1" />
            <feMergeNode in="g2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="g" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="g" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="dropShadow" x="-20%" y="0%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="20" floodColor="#0a0e1a" floodOpacity="0.35" />
        </filter>

        {/* ── GRADIENTS ── */}

        {/* Ambient background halo */}
        <radialGradient id="ambientHalo" cx="0.5" cy="0.42" r="0.48">
          <stop offset="0%" stopColor="#c4a35a" stopOpacity="0.06" />
          <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#0a0e1a" stopOpacity="0" />
        </radialGradient>

        {/* Primary body — matte titanium / graphite */}
        <linearGradient id="titanBody" x1="120" y1="90" x2="240" y2="400">
          <stop offset="0%" stopColor="#2a2d35" />
          <stop offset="20%" stopColor="#1e2028" />
          <stop offset="50%" stopColor="#16181f" />
          <stop offset="80%" stopColor="#1e2028" />
          <stop offset="100%" stopColor="#12141a" />
        </linearGradient>

        {/* Head — dark titanium with subtle sheen */}
        <linearGradient id="titanHead" x1="130" y1="50" x2="230" y2="210">
          <stop offset="0%" stopColor="#35383f" />
          <stop offset="25%" stopColor="#2a2d35" />
          <stop offset="50%" stopColor="#22252c" />
          <stop offset="75%" stopColor="#2a2d35" />
          <stop offset="100%" stopColor="#1e2028" />
        </linearGradient>

        {/* Rim light — very subtle left edge highlight */}
        <linearGradient id="rimLeft" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f0f0f0" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#f0f0f0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="rimRight" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#f0f0f0" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#f0f0f0" stopOpacity="0" />
        </linearGradient>

        {/* Visor / sensor strip — controlled blue energy */}
        <linearGradient id="visorEnergy" x1="135" y1="148" x2="225" y2="148">
          <stop offset="0%" stopColor="#1e40af" stopOpacity="0" />
          <stop offset="15%" stopColor="#2563eb" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
          <stop offset="85%" stopColor="#2563eb" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
        </linearGradient>

        {/* Gold accent */}
        <linearGradient id="goldAccent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4a35a" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#d4af37" stopOpacity="1" />
          <stop offset="100%" stopColor="#b8960b" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="goldSubtle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4a35a" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#d4af37" stopOpacity="0.15" />
        </linearGradient>

        {/* Core chest element — glass energy */}
        <radialGradient id="coreEnergy" cx="0.5" cy="0.4" r="0.55">
          <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#1e40af" stopOpacity="0.2" />
        </radialGradient>

        {/* Scales of Justice — abstract, geometric */}
        <linearGradient id="scalesGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4af37" />
          <stop offset="50%" stopColor="#c4a35a" />
          <stop offset="100%" stopColor="#b8960b" />
        </linearGradient>

        {/* Shoulder geometry */}
        <linearGradient id="shoulderGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2a2d35" />
          <stop offset="100%" stopColor="#1a1c22" />
        </linearGradient>
      </defs>

      {/* ═══════════════════════════════════════════════ */}
      {/* AMBIENT GLOW — soft halo behind entity         */}
      {/* ═══════════════════════════════════════════════ */}
      <ellipse cx="180" cy="200" rx="170" ry="210" fill="url(#ambientHalo)" filter="url(#ambientBlur)">
        <animate attributeName="rx" values="170;175;170" dur="8s" repeatCount="indefinite" />
        <animate attributeName="ry" values="210;215;210" dur="8s" repeatCount="indefinite" />
      </ellipse>

      <g filter="url(#dropShadow)">

        {/* ═══════════════════════════════════════════════ */}
        {/* TORSO — tapered, abstract, geometric           */}
        {/* ═══════════════════════════════════════════════ */}
        <path
          d="M130 240 C130 230, 145 222, 180 220 C215 222, 230 230, 230 240
             L238 380 C238 400, 122 400, 122 380 Z"
          fill="url(#titanBody)"
        />
        {/* Torso rim light left */}
        <path
          d="M130 240 C130 230, 145 222, 170 220 L140 380 L122 380 Z"
          fill="url(#rimLeft)"
        />
        {/* Torso subtle edge right */}
        <path
          d="M230 240 C230 230, 215 222, 190 220 L220 380 L238 380 Z"
          fill="url(#rimRight)"
        />

        {/* Center seam — precision engineering detail */}
        <line x1="180" y1="228" x2="180" y2="390" stroke="#3b82f6" strokeWidth="0.4" opacity="0.12" />

        {/* ── Gold accent lines on torso ── */}
        <line x1="155" y1="260" x2="155" y2="360" stroke="url(#goldSubtle)" strokeWidth="0.6" />
        <line x1="205" y1="260" x2="205" y2="360" stroke="url(#goldSubtle)" strokeWidth="0.6" />

        {/* ═══════════════════════════════════════════════ */}
        {/* SHOULDER PANELS — angular, geometric           */}
        {/* ═══════════════════════════════════════════════ */}
        {/* Left shoulder */}
        <path
          d="M130 240 C120 238, 95 244, 88 260 C85 268, 90 274, 100 272
             L130 258 Z"
          fill="url(#shoulderGrad)"
        />
        <path
          d="M130 240 C122 239, 100 244, 94 255"
          stroke="#c4a35a"
          strokeWidth="0.5"
          opacity="0.25"
          fill="none"
        />
        {/* Right shoulder */}
        <path
          d="M230 240 C240 238, 265 244, 272 260 C275 268, 270 274, 260 272
             L230 258 Z"
          fill="url(#shoulderGrad)"
        />
        <path
          d="M230 240 C238 239, 260 244, 266 255"
          stroke="#c4a35a"
          strokeWidth="0.5"
          opacity="0.25"
          fill="none"
        />

        {/* ═══════════════════════════════════════════════ */}
        {/* NECK — cylindrical, minimal                    */}
        {/* ═══════════════════════════════════════════════ */}
        <rect x="164" y="196" width="32" height="28" rx="4" fill="url(#titanHead)" />
        {/* Neck segments */}
        <line x1="168" y1="202" x2="192" y2="202" stroke="#3b3e47" strokeWidth="0.5" opacity="0.3" />
        <line x1="168" y1="210" x2="192" y2="210" stroke="#3b3e47" strokeWidth="0.5" opacity="0.3" />
        <line x1="168" y1="218" x2="192" y2="218" stroke="#3b3e47" strokeWidth="0.5" opacity="0.3" />

        {/* ═══════════════════════════════════════════════ */}
        {/* HEAD — smooth, symmetric, abstract form        */}
        {/* ═══════════════════════════════════════════════ */}
        <ellipse cx="180" cy="125" rx="62" ry="72" fill="url(#titanHead)" />

        {/* Head rim light — studio quality left highlight */}
        <path
          d="M120 100 C118 80, 130 58, 160 52 C162 52, 140 80, 130 120
             C125 145, 122 160, 123 175"
          stroke="#f0f0f0"
          strokeWidth="1.5"
          opacity="0.08"
          fill="none"
        />

        {/* Head top ridge — geometric precision */}
        <path
          d="M125 95 C128 62, 150 45, 180 43 C210 45, 232 62, 235 95"
          fill="none"
          stroke="#3b3e47"
          strokeWidth="0.8"
          opacity="0.3"
        />

        {/* Forehead panel line */}
        <path
          d="M140 78 L180 72 L220 78"
          fill="none"
          stroke="#c4a35a"
          strokeWidth="0.5"
          opacity="0.2"
        />

        {/* ═══════════════════════════════════════════════ */}
        {/* VISOR — single horizontal energy band          */}
        {/* NO eyes. NO pupils. Just a sensor strip.       */}
        {/* ═══════════════════════════════════════════════ */}
        <g>
          {/* Visor recess */}
          <rect x="128" y="118" width="104" height="22" rx="11" fill="#0a0e1a" />

          {/* Energy strip — the "gaze" */}
          <rect x="132" y="121" width="96" height="16" rx="8" fill="url(#visorEnergy)" filter="url(#subtleGlow)">
            <animate
              attributeName="opacity"
              values="0.85;1;0.85"
              dur="4s"
              repeatCount="indefinite"
            />
          </rect>

          {/* Visor inner light — very faint scanline */}
          <line x1="140" y1="129" x2="220" y2="129" stroke="#93c5fd" strokeWidth="0.4" opacity="0.15">
            <animate attributeName="opacity" values="0.05;0.2;0.05" dur="6s" repeatCount="indefinite" />
          </line>

          {/* Visor reflection — glass surface top */}
          <path
            d="M136 123 C150 119, 200 119, 224 123 L222 126 C200 123, 155 123, 138 126 Z"
            fill="white"
            opacity="0.06"
          />
        </g>

        {/* ═══════════════════════════════════════════════ */}
        {/* SIDE PANELS — minimal sensor arrays            */}
        {/* ═══════════════════════════════════════════════ */}
        {/* Left panel */}
        <rect x="112" y="110" width="8" height="32" rx="4" fill="#1e2028" stroke="#2a2d35" strokeWidth="0.5" />
        <circle cx="116" cy="120" r="1.5" fill="#3b82f6" opacity="0.4">
          <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="116" cy="130" r="1" fill="#c4a35a" opacity="0.3">
          <animate attributeName="opacity" values="0.15;0.35;0.15" dur="4s" begin="1s" repeatCount="indefinite" />
        </circle>

        {/* Right panel */}
        <rect x="240" y="110" width="8" height="32" rx="4" fill="#1e2028" stroke="#2a2d35" strokeWidth="0.5" />
        <circle cx="244" cy="120" r="1.5" fill="#3b82f6" opacity="0.4">
          <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" begin="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="244" cy="130" r="1" fill="#c4a35a" opacity="0.3">
          <animate attributeName="opacity" values="0.15;0.35;0.15" dur="4s" begin="2.5s" repeatCount="indefinite" />
        </circle>

        {/* ═══════════════════════════════════════════════ */}
        {/* CORE ELEMENT — chest energy source             */}
        {/* ═══════════════════════════════════════════════ */}
        <g>
          {/* Outer housing */}
          <circle cx="180" cy="275" r="22" fill="#12141a" />
          <circle cx="180" cy="275" r="20" fill="none" stroke="#2a2d35" strokeWidth="0.8" />

          {/* Energy core */}
          <circle cx="180" cy="275" r="14" fill="url(#coreEnergy)" filter="url(#softGlow)">
            <animate attributeName="r" values="14;15;14" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;1;0.8" dur="4s" repeatCount="indefinite" />
          </circle>

          {/* Core inner ring */}
          <circle cx="180" cy="275" r="8" fill="none" stroke="#93c5fd" strokeWidth="0.5" opacity="0.5">
            <animate attributeName="r" values="8;9;8" dur="4s" repeatCount="indefinite" />
          </circle>

          {/* Core center point */}
          <circle cx="180" cy="275" r="3" fill="#dbeafe" opacity="0.9">
            <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite" />
          </circle>

          {/* Energy lines radiating from core */}
          <line x1="180" y1="253" x2="180" y2="242" stroke="#3b82f6" strokeWidth="0.6" opacity="0.2">
            <animate attributeName="opacity" values="0.1;0.3;0.1" dur="5s" repeatCount="indefinite" />
          </line>
          <line x1="164" y1="260" x2="155" y2="252" stroke="#3b82f6" strokeWidth="0.5" opacity="0.15" />
          <line x1="196" y1="260" x2="205" y2="252" stroke="#3b82f6" strokeWidth="0.5" opacity="0.15" />
        </g>

        {/* ═══════════════════════════════════════════════ */}
        {/* SCALES OF JUSTICE — abstract, geometric        */}
        {/* Integrated into the chest, not held            */}
        {/* ═══════════════════════════════════════════════ */}
        <g opacity="0.35" transform="translate(180, 330)">
          {/* Central pillar */}
          <line x1="0" y1="-12" x2="0" y2="12" stroke="url(#scalesGold)" strokeWidth="1.2" />
          {/* Balance beam */}
          <line x1="-20" y1="-10" x2="20" y2="-10" stroke="url(#scalesGold)" strokeWidth="1" />
          {/* Left plate */}
          <path d="M-22 -10 L-18 -10 L-16 -4 L-24 -4 Z" fill="url(#scalesGold)" opacity="0.6" />
          {/* Right plate */}
          <path d="M18 -10 L22 -10 L24 -4 L16 -4 Z" fill="url(#scalesGold)" opacity="0.6" />
          {/* Base */}
          <path d="M-8 12 L8 12 L6 15 L-6 15 Z" fill="url(#scalesGold)" opacity="0.5" />
        </g>

        {/* ═══════════════════════════════════════════════ */}
        {/* GEOMETRIC DETAIL LINES — engineering precision  */}
        {/* ═══════════════════════════════════════════════ */}
        <g opacity="0.08">
          {/* Torso structure lines */}
          <path d="M145 250 L145 340" stroke="#c4a35a" strokeWidth="0.4" />
          <path d="M215 250 L215 340" stroke="#c4a35a" strokeWidth="0.4" />
          {/* Cross details */}
          <path d="M145 290 L155 290" stroke="#c4a35a" strokeWidth="0.4" />
          <path d="M205 290 L215 290" stroke="#c4a35a" strokeWidth="0.4" />
          <path d="M145 320 L155 320" stroke="#c4a35a" strokeWidth="0.4" />
          <path d="M205 320 L215 320" stroke="#c4a35a" strokeWidth="0.4" />
        </g>

      </g>

      {/* ═══════════════════════════════════════════════ */}
      {/* FLOATING PARTICLES — sparse, controlled         */}
      {/* ═══════════════════════════════════════════════ */}
      <g>
        {/* Subtle energy particles — very few, very slow */}
        <circle cx="90" cy="100" r="1.5" fill="#3b82f6" opacity="0.2">
          <animate attributeName="cy" values="100;92;100" dur="7s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.1;0.25;0.1" dur="7s" repeatCount="indefinite" />
        </circle>
        <circle cx="270" cy="85" r="1.2" fill="#c4a35a" opacity="0.15">
          <animate attributeName="cy" values="85;78;85" dur="9s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.08;0.2;0.08" dur="9s" repeatCount="indefinite" />
        </circle>
        <circle cx="80" cy="200" r="1" fill="#93c5fd" opacity="0.12">
          <animate attributeName="cy" values="200;193;200" dur="8s" begin="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.06;0.15;0.06" dur="8s" begin="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="275" cy="180" r="1.3" fill="#3b82f6" opacity="0.15">
          <animate attributeName="cy" values="180;172;180" dur="6s" begin="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.08;0.18;0.08" dur="6s" begin="3s" repeatCount="indefinite" />
        </circle>
      </g>

    </svg>
  );
}
