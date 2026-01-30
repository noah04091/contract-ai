// 📁 frontend/src/components/LawyerMascot.tsx
// Contract AI Mascot — Premium 3D AI Legal Assistant Character
// Pixar-quality SVG mascot: friendly, professional, eye-catching
// A character people WANT to interact with

export default function LawyerMascot({ size = 220 }: { size?: number }) {
  const h = size * 1.3;
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 400 520"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* ═══ FILTERS ═══ */}
        <filter id="bodyShadow" x="-20%" y="-5%" width="140%" height="130%">
          <feDropShadow dx="0" dy="14" stdDeviation="18" floodColor="#1e3a5f" floodOpacity="0.25" />
        </filter>
        <filter id="eyeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="g1" />
          <feGaussianBlur stdDeviation="2" result="g2" />
          <feMerge>
            <feMergeNode in="g1" />
            <feMergeNode in="g2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="g" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="innerShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in2="SourceGraphic" operator="arithmetic" k2="-1" k3="1" result="shadow" />
          <feFlood floodColor="#1e3a5f" floodOpacity="0.15" result="color" />
          <feComposite in="color" in2="shadow" operator="in" />
        </filter>
        <filter id="specular">
          <feGaussianBlur stdDeviation="1" />
        </filter>

        {/* ═══ GRADIENTS ═══ */}

        {/* Head — premium glossy white ceramic */}
        <radialGradient id="headMain" cx="0.42" cy="0.32" r="0.65">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#f0f4f8" />
          <stop offset="65%" stopColor="#dce4ed" />
          <stop offset="85%" stopColor="#c5d0dc" />
          <stop offset="100%" stopColor="#b0bfcf" />
        </radialGradient>
        <radialGradient id="headHighlight" cx="0.35" cy="0.22" r="0.4">
          <stop offset="0%" stopColor="white" stopOpacity="0.95" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>

        {/* Body — glossy white with blue tint */}
        <linearGradient id="bodyMain" x1="140" y1="250" x2="260" y2="460">
          <stop offset="0%" stopColor="#e8eef5" />
          <stop offset="25%" stopColor="#dce4ed" />
          <stop offset="50%" stopColor="#d0dae6" />
          <stop offset="75%" stopColor="#c5d0dc" />
          <stop offset="100%" stopColor="#b8c6d4" />
        </linearGradient>
        <linearGradient id="bodyHighlight" x1="150" y1="260" x2="200" y2="440">
          <stop offset="0%" stopColor="white" stopOpacity="0.5" />
          <stop offset="40%" stopColor="white" stopOpacity="0.15" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* Eye socket — deep inset */}
        <radialGradient id="eyeSocket" cx="0.5" cy="0.45" r="0.55">
          <stop offset="0%" stopColor="#1a2744" />
          <stop offset="70%" stopColor="#0f1a30" />
          <stop offset="100%" stopColor="#0a1020" />
        </radialGradient>

        {/* Eye iris — rich blue with depth */}
        <radialGradient id="irisLeft" cx="0.45" cy="0.4" r="0.5">
          <stop offset="0%" stopColor="#7cb8ff" />
          <stop offset="30%" stopColor="#5ba3f5" />
          <stop offset="60%" stopColor="#3b82f6" />
          <stop offset="85%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </radialGradient>
        <radialGradient id="irisRight" cx="0.45" cy="0.4" r="0.5">
          <stop offset="0%" stopColor="#7cb8ff" />
          <stop offset="30%" stopColor="#5ba3f5" />
          <stop offset="60%" stopColor="#3b82f6" />
          <stop offset="85%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </radialGradient>

        {/* Eye glow ring */}
        <radialGradient id="eyeRing" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>

        {/* Chest panel — blue energy core */}
        <radialGradient id="chestCore" cx="0.5" cy="0.4" r="0.55">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="30%" stopColor="#60a5fa" />
          <stop offset="60%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e40af" />
        </radialGradient>

        {/* Arm gradient */}
        <linearGradient id="armGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e0e8f0" />
          <stop offset="50%" stopColor="#d0dae6" />
          <stop offset="100%" stopColor="#c0ccda" />
        </linearGradient>

        {/* Gold accent */}
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5d77a" />
          <stop offset="50%" stopColor="#e8b830" />
          <stop offset="100%" stopColor="#d4a020" />
        </linearGradient>

        {/* Ambient glow */}
        <radialGradient id="ambGlow" cx="0.5" cy="0.4" r="0.5">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>

        {/* Visor glass reflection */}
        <linearGradient id="visorReflect" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.08" />
          <stop offset="50%" stopColor="white" stopOpacity="0.02" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* Mouth glow */}
        <linearGradient id="mouthGlow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
          <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>

        {/* Hand metal */}
        <radialGradient id="handGrad" cx="0.4" cy="0.35" r="0.6">
          <stop offset="0%" stopColor="#f5f7fa" />
          <stop offset="50%" stopColor="#e0e8f0" />
          <stop offset="100%" stopColor="#c8d4e0" />
        </radialGradient>
      </defs>

      {/* ═══ AMBIENT GLOW ═══ */}
      <ellipse cx="200" cy="260" rx="180" ry="240" fill="url(#ambGlow)" />

      <g filter="url(#bodyShadow)">

        {/* ════════════════════════════════════════════════ */}
        {/* BODY — rounded, friendly, premium ceramic look  */}
        {/* ════════════════════════════════════════════════ */}

        {/* Body base shape — rounded trapezoid */}
        <path
          d="M138 290 C138 270, 160 255, 200 252 C240 255, 262 270, 262 290
             L268 430 C268 458, 132 458, 132 430 Z"
          fill="url(#bodyMain)"
        />
        {/* Body 3D highlight — left side shine */}
        <path
          d="M145 285 C150 272, 170 258, 195 254 L162 430 L138 430 Z"
          fill="url(#bodyHighlight)"
        />
        {/* Body shadow — right side depth */}
        <path
          d="M255 285 C250 272, 230 258, 205 254 L238 430 L262 430 Z"
          fill="#8fa0b5"
          opacity="0.12"
        />

        {/* Body rim light — glossy ceramic edge */}
        <path
          d="M140 292 C142 274, 162 257, 198 253"
          stroke="white"
          strokeWidth="1.5"
          opacity="0.4"
          fill="none"
        />

        {/* Chest panel — inset tech detail */}
        <g>
          {/* Panel housing */}
          <rect x="172" y="300" width="56" height="56" rx="16" fill="#1a2744" />
          <rect x="175" y="303" width="50" height="50" rx="14" fill="#0f1a30" />

          {/* Energy core */}
          <circle cx="200" cy="326" r="18" fill="url(#chestCore)" filter="url(#softGlow)">
            <animate attributeName="r" values="18;19.5;18" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="200" cy="326" r="12" fill="none" stroke="#93c5fd" strokeWidth="0.8" opacity="0.5">
            <animate attributeName="r" values="12;13;12" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="200" cy="326" r="6" fill="#dbeafe" opacity="0.9">
            <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
          </circle>
          {/* Core highlight */}
          <ellipse cx="196" cy="322" rx="6" ry="4" fill="white" opacity="0.3" />

          {/* Panel frame glow */}
          <rect x="175" y="303" width="50" height="50" rx="14" fill="none" stroke="#3b82f6" strokeWidth="0.6" opacity="0.3" />
        </g>

        {/* Center seam line */}
        <line x1="200" y1="370" x2="200" y2="440" stroke="#b0bfcf" strokeWidth="0.5" opacity="0.3" />

        {/* Side panel details */}
        <rect x="148" y="310" width="14" height="40" rx="4" fill="#c5d0dc" stroke="#b0bfcf" strokeWidth="0.5" />
        <circle cx="155" cy="322" r="2.5" fill="#3b82f6" opacity="0.5">
          <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="155" cy="336" r="2" fill="#3b82f6" opacity="0.3">
          <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" begin="0.8s" repeatCount="indefinite" />
        </circle>

        <rect x="238" y="310" width="14" height="40" rx="4" fill="#c5d0dc" stroke="#b0bfcf" strokeWidth="0.5" />
        <circle cx="245" cy="322" r="2.5" fill="#3b82f6" opacity="0.5">
          <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2.5s" begin="1.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="245" cy="336" r="2" fill="#3b82f6" opacity="0.3">
          <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" begin="2s" repeatCount="indefinite" />
        </circle>

        {/* ════════════════════════════════════════════════ */}
        {/* NECK — short, clean connector                   */}
        {/* ════════════════════════════════════════════════ */}
        <rect x="178" y="235" width="44" height="22" rx="6" fill="#d0dae6" />
        <line x1="184" y1="240" x2="216" y2="240" stroke="#b8c6d4" strokeWidth="0.6" opacity="0.4" />
        <line x1="184" y1="246" x2="216" y2="246" stroke="#b8c6d4" strokeWidth="0.6" opacity="0.4" />
        <line x1="184" y1="252" x2="216" y2="252" stroke="#b8c6d4" strokeWidth="0.6" opacity="0.4" />

        {/* ════════════════════════════════════════════════ */}
        {/* HEAD — big, round, expressive, friendly         */}
        {/* The centerpiece of the character                 */}
        {/* ════════════════════════════════════════════════ */}

        {/* Head main shape — large rounded egg shape */}
        <ellipse cx="200" cy="145" rx="88" ry="95" fill="url(#headMain)" />

        {/* Head specular highlight — top-left */}
        <ellipse cx="200" cy="145" rx="88" ry="95" fill="url(#headHighlight)" />

        {/* Head rim light — left edge */}
        <path
          d="M116 115 C114 85, 135 58, 170 50 C175 49, 155 75, 140 115
             C130 145, 118 175, 118 195"
          stroke="white"
          strokeWidth="2.5"
          opacity="0.3"
          fill="none"
        />

        {/* Head bottom shadow for depth */}
        <ellipse cx="200" cy="220" rx="60" ry="12" fill="#8fa0b5" opacity="0.1" />

        {/* Forehead detail — subtle tech panel line */}
        <path
          d="M150 82 C165 75, 200 72, 250 82"
          fill="none"
          stroke="#c5d0dc"
          strokeWidth="1"
          opacity="0.4"
        />

        {/* ═══ ANTENNA — cute, characterful ═══ */}
        <g transform="translate(200, 48)">
          {/* Antenna stem */}
          <rect x="-2.5" y="-28" width="5" height="28" rx="2.5" fill="#c5d0dc" />
          <rect x="-1.5" y="-28" width="3" height="28" rx="1.5" fill="#dce4ed" />

          {/* Antenna orb — glowing */}
          <circle cx="0" cy="-34" r="9" fill="#2563eb" filter="url(#eyeGlow)">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="0" cy="-34" r="7" fill="#3b82f6" />
          <circle cx="0" cy="-34" r="5" fill="#60a5fa">
            <animate attributeName="r" values="5;5.8;5" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="0" cy="-34" r="3" fill="#93c5fd" />
          {/* Orb specular */}
          <ellipse cx="-2" cy="-37" rx="2.5" ry="2" fill="white" opacity="0.8" />

          {/* Antenna rings */}
          <ellipse cx="0" cy="-22" rx="6" ry="1.8" fill="none" stroke="#60a5fa" strokeWidth="0.6" opacity="0.25">
            <animate attributeName="opacity" values="0.1;0.35;0.1" dur="3s" repeatCount="indefinite" />
          </ellipse>
        </g>

        {/* ═══ EAR PANELS — rounded, friendly ═══ */}
        {/* Left ear */}
        <g>
          <rect x="104" y="120" width="16" height="50" rx="8" fill="#d0dae6" stroke="#c0ccda" strokeWidth="0.8" />
          <rect x="106" y="122" width="12" height="46" rx="6" fill="#dce4ed" />
          <circle cx="112" cy="136" r="3" fill="#3b82f6" opacity="0.5">
            <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="112" cy="148" r="2" fill="#60a5fa" opacity="0.3">
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2.8s" begin="0.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="112" cy="158" r="2" fill="#60a5fa" opacity="0.2">
            <animate attributeName="opacity" values="0.1;0.4;0.1" dur="3.2s" begin="1.2s" repeatCount="indefinite" />
          </circle>
        </g>
        {/* Right ear */}
        <g>
          <rect x="280" y="120" width="16" height="50" rx="8" fill="#d0dae6" stroke="#c0ccda" strokeWidth="0.8" />
          <rect x="282" y="122" width="12" height="46" rx="6" fill="#dce4ed" />
          <circle cx="288" cy="136" r="3" fill="#3b82f6" opacity="0.5">
            <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" begin="1s" repeatCount="indefinite" />
          </circle>
          <circle cx="288" cy="148" r="2" fill="#60a5fa" opacity="0.3">
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2.8s" begin="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="288" cy="158" r="2" fill="#60a5fa" opacity="0.2">
            <animate attributeName="opacity" values="0.1;0.4;0.1" dur="3.2s" begin="0.3s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* ════════════════════════════════════════════════ */}
        {/* EYES — the SOUL of the character                */}
        {/* Big, beautiful, expressive, Pixar-quality       */}
        {/* ════════════════════════════════════════════════ */}

        {/* ═══ LEFT EYE ═══ */}
        <g>
          {/* Outer glow */}
          <circle cx="165" cy="148" r="30" fill="url(#eyeRing)" filter="url(#softGlow)" opacity="0.4">
            <animate attributeName="opacity" values="0.3;0.5;0.3" dur="3s" repeatCount="indefinite" />
          </circle>

          {/* Eye socket — deep inset for 3D depth */}
          <ellipse cx="165" cy="148" rx="32" ry="30" fill="url(#eyeSocket)" />
          {/* Socket inner bevel */}
          <ellipse cx="165" cy="148" rx="30" ry="28" fill="none" stroke="#1e3a5f" strokeWidth="1" opacity="0.3" />

          {/* Eyeball — white sclera with subtle shading */}
          <ellipse cx="165" cy="148" rx="26" ry="24" fill="#f0f4f8" />
          <ellipse cx="165" cy="148" rx="26" ry="24" fill="none" stroke="#cdd8e4" strokeWidth="0.5" />
          {/* Sclera shadow top */}
          <ellipse cx="165" cy="140" rx="24" ry="12" fill="#cdd8e4" opacity="0.15" />

          {/* Iris — rich, detailed, deep blue */}
          <circle cx="165" cy="148" r="18" fill="url(#irisLeft)">
            <animate attributeName="r" values="18;2;18" dur="6s" begin="3s" repeatCount="indefinite" />
          </circle>

          {/* Iris detail ring */}
          <circle cx="165" cy="148" r="15" fill="none" stroke="#4b8ee8" strokeWidth="0.8" opacity="0.4">
            <animate attributeName="r" values="15;1.5;15" dur="6s" begin="3s" repeatCount="indefinite" />
          </circle>

          {/* Pupil — deep, dark */}
          <circle cx="165" cy="148" r="10" fill="#0a1628">
            <animate attributeName="r" values="10;1.2;10" dur="6s" begin="3s" repeatCount="indefinite" />
          </circle>

          {/* Pupil inner glow */}
          <circle cx="165" cy="148" r="6" fill="#1e40af" opacity="0.5">
            <animate attributeName="r" values="6;0.8;6" dur="6s" begin="3s" repeatCount="indefinite" />
          </circle>

          {/* ─── SPECULAR HIGHLIGHTS (key to making it look alive) ─── */}
          {/* Main specular — big, bright, positioned top-right */}
          <circle cx="172" cy="139" r="6" fill="white" opacity="0.95" />
          {/* Secondary specular — smaller, bottom-left */}
          <circle cx="158" cy="156" r="3" fill="white" opacity="0.5" />
          {/* Micro sparkle */}
          <circle cx="174" cy="145" r="1.5" fill="white" opacity="0.4" />
        </g>

        {/* ═══ RIGHT EYE ═══ */}
        <g>
          <circle cx="235" cy="148" r="30" fill="url(#eyeRing)" filter="url(#softGlow)" opacity="0.4">
            <animate attributeName="opacity" values="0.3;0.5;0.3" dur="3s" repeatCount="indefinite" />
          </circle>

          <ellipse cx="235" cy="148" rx="32" ry="30" fill="url(#eyeSocket)" />
          <ellipse cx="235" cy="148" rx="30" ry="28" fill="none" stroke="#1e3a5f" strokeWidth="1" opacity="0.3" />

          <ellipse cx="235" cy="148" rx="26" ry="24" fill="#f0f4f8" />
          <ellipse cx="235" cy="148" rx="26" ry="24" fill="none" stroke="#cdd8e4" strokeWidth="0.5" />
          <ellipse cx="235" cy="140" rx="24" ry="12" fill="#cdd8e4" opacity="0.15" />

          <circle cx="235" cy="148" r="18" fill="url(#irisRight)">
            <animate attributeName="r" values="18;2;18" dur="6s" begin="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="235" cy="148" r="15" fill="none" stroke="#4b8ee8" strokeWidth="0.8" opacity="0.4">
            <animate attributeName="r" values="15;1.5;15" dur="6s" begin="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="235" cy="148" r="10" fill="#0a1628">
            <animate attributeName="r" values="10;1.2;10" dur="6s" begin="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="235" cy="148" r="6" fill="#1e40af" opacity="0.5">
            <animate attributeName="r" values="6;0.8;6" dur="6s" begin="3s" repeatCount="indefinite" />
          </circle>

          <circle cx="242" cy="139" r="6" fill="white" opacity="0.95" />
          <circle cx="228" cy="156" r="3" fill="white" opacity="0.5" />
          <circle cx="244" cy="145" r="1.5" fill="white" opacity="0.4" />
        </g>

        {/* ═══ BROW RIDGE — gives character expression ═══ */}
        <path
          d="M132 122 C142 116, 160 113, 175 118"
          stroke="#b0bfcf"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />
        <path
          d="M225 118 C240 113, 258 116, 268 122"
          stroke="#b0bfcf"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />

        {/* ═══ MOUTH — friendly glowing smile ═══ */}
        <path
          d="M170 195 Q185 210, 200 210 Q215 210, 230 195"
          stroke="#3b82f6"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          filter="url(#softGlow)"
        />
        {/* Smile inner glow */}
        <path
          d="M175 197 Q188 208, 200 208 Q212 208, 225 197"
          stroke="#93c5fd"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.4"
        />

        {/* ════════════════════════════════════════════════ */}
        {/* LEFT ARM — friendly wave gesture                */}
        {/* ════════════════════════════════════════════════ */}
        <g>
          {/* Shoulder sphere */}
          <circle cx="140" cy="284" r="16" fill="#d0dae6" />
          <ellipse cx="137" cy="280" rx="6" ry="5" fill="white" opacity="0.2" />

          {/* Upper arm */}
          <path
            d="M140 284 C118 268, 92 230, 82 200"
            stroke="#d0dae6"
            strokeWidth="28"
            strokeLinecap="round"
            fill="none"
          />
          {/* Arm highlight */}
          <path
            d="M136 278 C118 264, 95 230, 86 204"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
            opacity="0.15"
          />

          {/* Elbow joint */}
          <circle cx="82" cy="200" r="11" fill="#c5d0dc" stroke="#b0bfcf" strokeWidth="1" />
          <circle cx="80" cy="197" r="3" fill="white" opacity="0.15" />

          {/* Hand sphere */}
          <circle cx="75" cy="180" r="22" fill="url(#handGrad)" />
          <ellipse cx="71" cy="174" rx="8" ry="6" fill="white" opacity="0.2" />

          {/* Fingers — waving gesture */}
          <ellipse cx="58" cy="162" rx="6.5" ry="13" fill="url(#handGrad)" transform="rotate(-28, 58, 162)" />
          <ellipse cx="70" cy="155" rx="6" ry="14" fill="url(#handGrad)" transform="rotate(-12, 70, 155)" />
          <ellipse cx="82" cy="153" rx="6" ry="14" fill="url(#handGrad)" transform="rotate(5, 82, 153)" />
          <ellipse cx="93" cy="158" rx="6" ry="12" fill="url(#handGrad)" transform="rotate(20, 93, 158)" />
          {/* Thumb */}
          <ellipse cx="50" cy="175" rx="5.5" ry="10" fill="url(#handGrad)" transform="rotate(-45, 50, 175)" />

          {/* Finger joints */}
          <circle cx="58" cy="162" r="1.8" fill="#b0bfcf" opacity="0.3" />
          <circle cx="70" cy="155" r="1.8" fill="#b0bfcf" opacity="0.3" />
          <circle cx="82" cy="153" r="1.8" fill="#b0bfcf" opacity="0.3" />
          <circle cx="93" cy="158" r="1.8" fill="#b0bfcf" opacity="0.3" />

          {/* Wrist glow */}
          <circle cx="75" cy="194" r="4" fill="#3b82f6" opacity="0.3" filter="url(#softGlow)">
            <animate attributeName="opacity" values="0.15;0.35;0.15" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* ════════════════════════════════════════════════ */}
        {/* RIGHT ARM — holding golden scales of justice    */}
        {/* ════════════════════════════════════════════════ */}
        <g>
          {/* Shoulder */}
          <circle cx="260" cy="284" r="16" fill="#d0dae6" />
          <ellipse cx="257" cy="280" rx="6" ry="5" fill="white" opacity="0.2" />

          {/* Upper arm */}
          <path
            d="M260 284 C280 268, 298 235, 298 205"
            stroke="#d0dae6"
            strokeWidth="28"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M264 278 C282 264, 296 234, 296 208"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
            opacity="0.15"
          />

          {/* Elbow */}
          <circle cx="298" cy="205" r="11" fill="#c5d0dc" stroke="#b0bfcf" strokeWidth="1" />

          {/* Hand */}
          <circle cx="300" cy="188" r="18" fill="url(#handGrad)" />
          <ellipse cx="296" cy="183" rx="7" ry="5" fill="white" opacity="0.2" />

          {/* ═══ GOLDEN SCALES OF JUSTICE ═══ */}
          <g filter="url(#softGlow)">
            {/* Main post */}
            <rect x="298" y="128" width="4" height="52" rx="2" fill="url(#gold)" />

            {/* Crown ornament */}
            <circle cx="300" cy="122" r="8" fill="url(#gold)" />
            <circle cx="300" cy="122" r="5.5" fill="#f5d77a" />
            <ellipse cx="298" cy="120" rx="2" ry="1.5" fill="white" opacity="0.5" />

            {/* Balance beam */}
            <rect x="268" y="136" width="64" height="3.5" rx="1.8" fill="url(#gold)" />

            {/* Left chain + plate */}
            <line x1="272" y1="139" x2="272" y2="158" stroke="#d4a020" strokeWidth="1.5" />
            <line x1="268" y1="139" x2="268" y2="156" stroke="#d4a020" strokeWidth="1" />
            <line x1="276" y1="139" x2="276" y2="156" stroke="#d4a020" strokeWidth="1" />
            <ellipse cx="272" cy="160" rx="14" ry="5.5" fill="url(#gold)" />
            <ellipse cx="272" cy="159" rx="12" ry="4" fill="#f5d77a" />
            <ellipse cx="270" cy="158" rx="5" ry="2" fill="white" opacity="0.2" />

            {/* Right chain + plate */}
            <line x1="328" y1="139" x2="328" y2="158" stroke="#d4a020" strokeWidth="1.5" />
            <line x1="324" y1="139" x2="324" y2="156" stroke="#d4a020" strokeWidth="1" />
            <line x1="332" y1="139" x2="332" y2="156" stroke="#d4a020" strokeWidth="1" />
            <ellipse cx="328" cy="160" rx="14" ry="5.5" fill="url(#gold)" />
            <ellipse cx="328" cy="159" rx="12" ry="4" fill="#f5d77a" />
            <ellipse cx="326" cy="158" rx="5" ry="2" fill="white" opacity="0.2" />
          </g>
        </g>

        {/* ════════════════════════════════════════════════ */}
        {/* SCALE OF JUSTICE LAPEL PIN — on chest           */}
        {/* ════════════════════════════════════════════════ */}
        <g transform="translate(155, 395)">
          <circle cx="0" cy="0" r="9" fill="url(#gold)" />
          <circle cx="0" cy="0" r="7" fill="#f5d77a" />
          <line x1="0" y1="-4.5" x2="0" y2="3" stroke="#d4a020" strokeWidth="1" />
          <line x1="-5" y1="-3" x2="5" y2="-3" stroke="#d4a020" strokeWidth="1" />
          <path d="M-6 -3 Q-5 0, -3 0 Q0 0, 1 -3" stroke="#d4a020" strokeWidth="0.7" fill="none" />
          <path d="M-1 -3 Q0 0, 3 0 Q5 0, 6 -3" stroke="#d4a020" strokeWidth="0.7" fill="none" />
          <path d="M-3 3 L3 3 L2.5 5 L-2.5 5 Z" fill="#d4a020" />
          <ellipse cx="-1" cy="-1" rx="2" ry="1.5" fill="white" opacity="0.25" />
        </g>

      </g>

      {/* ════════════════════════════════════════════════ */}
      {/* FLOATING PARTICLES — subtle magic               */}
      {/* ════════════════════════════════════════════════ */}
      <g>
        <circle cx="95" cy="100" r="3" fill="#3b82f6" opacity="0.3">
          <animate attributeName="cy" values="100;88;100" dur="5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.15;0.35;0.15" dur="5s" repeatCount="indefinite" />
        </circle>
        <circle cx="310" cy="88" r="2.5" fill="#60a5fa" opacity="0.25">
          <animate attributeName="cy" values="88;76;88" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.1;0.3;0.1" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx="80" cy="200" r="2" fill="#93c5fd" opacity="0.2">
          <animate attributeName="cy" values="200;190;200" dur="6s" begin="1s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.08;0.22;0.08" dur="6s" begin="1s" repeatCount="indefinite" />
        </circle>
        <circle cx="330" cy="220" r="2" fill="#60a5fa" opacity="0.2">
          <animate attributeName="cy" values="220;210;220" dur="5.5s" begin="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.1;0.25;0.1" dur="5.5s" begin="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="108" cy="60" r="1.8" fill="#3b82f6" opacity="0.2">
          <animate attributeName="cy" values="60;50;60" dur="4.5s" begin="0.5s" repeatCount="indefinite" />
        </circle>
      </g>

    </svg>
  );
}
