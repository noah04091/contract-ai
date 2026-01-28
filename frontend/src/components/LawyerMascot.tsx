// 📁 frontend/src/components/LawyerMascot.tsx
// Fun 3D-style AI Lawyer Mascot for Contract AI

export default function LawyerMascot({ size = 120 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 4px 12px rgba(30, 64, 175, 0.25))' }}
    >
      {/* Body / Suit */}
      <ellipse cx="100" cy="175" rx="52" ry="28" fill="#1e3a5f" />
      <path
        d="M58 150 C58 130, 142 130, 142 150 L142 175 C142 185, 58 185, 58 175 Z"
        fill="url(#suitGradient)"
      />
      {/* Suit Lapels */}
      <path d="M88 130 L100 160 L80 175" fill="#152d4a" opacity="0.7" />
      <path d="M112 130 L100 160 L120 175" fill="#152d4a" opacity="0.7" />
      {/* White Shirt / Collar */}
      <path d="M90 130 L100 155 L110 130" fill="#f0f4ff" />
      {/* Tie */}
      <path d="M97 140 L100 165 L103 140 Z" fill="#3b82f6" />
      <rect x="96" y="135" width="8" height="5" rx="1" fill="#2563eb" />

      {/* Head */}
      <ellipse cx="100" cy="90" rx="45" ry="48" fill="url(#headGradient)" />
      {/* Face highlight (3D effect) */}
      <ellipse cx="92" cy="78" rx="28" ry="30" fill="url(#faceHighlight)" opacity="0.4" />

      {/* Hair */}
      <path
        d="M55 80 C55 50, 70 30, 100 28 C130 30, 145 50, 145 80 C145 65, 130 45, 100 43 C70 45, 55 65, 55 80 Z"
        fill="#1a1a2e"
      />
      {/* Hair shine */}
      <path
        d="M70 55 C75 45, 90 38, 105 40 C95 42, 80 48, 73 58 Z"
        fill="#2a2a4e"
        opacity="0.6"
      />

      {/* Eyes - friendly */}
      <ellipse cx="82" cy="88" rx="10" ry="11" fill="white" />
      <ellipse cx="118" cy="88" rx="10" ry="11" fill="white" />
      {/* Pupils */}
      <ellipse cx="85" cy="89" rx="5.5" ry="6" fill="#1e3a5f" />
      <ellipse cx="121" cy="89" rx="5.5" ry="6" fill="#1e3a5f" />
      {/* Eye sparkle */}
      <circle cx="87" cy="86" r="2" fill="white" />
      <circle cx="123" cy="86" r="2" fill="white" />

      {/* Glasses */}
      <rect x="68" y="78" width="28" height="22" rx="6" stroke="#1e40af" strokeWidth="2.5" fill="none" />
      <rect x="104" y="78" width="28" height="22" rx="6" stroke="#1e40af" strokeWidth="2.5" fill="none" />
      <line x1="96" y1="88" x2="104" y2="88" stroke="#1e40af" strokeWidth="2.5" />
      <line x1="68" y1="88" x2="58" y2="84" stroke="#1e40af" strokeWidth="2" />
      <line x1="132" y1="88" x2="142" y2="84" stroke="#1e40af" strokeWidth="2" />

      {/* Eyebrows - friendly raised */}
      <path d="M72 74 Q82 68, 92 73" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M108 73 Q118 68, 128 74" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Nose */}
      <ellipse cx="100" cy="100" rx="4" ry="3" fill="#d4956b" opacity="0.5" />

      {/* Mouth - big friendly smile */}
      <path
        d="M82 110 Q92 122, 100 122 Q108 122, 118 110"
        stroke="#c0392b"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Teeth hint */}
      <path
        d="M88 112 Q94 118, 100 118 Q106 118, 112 112"
        fill="white"
        opacity="0.8"
      />

      {/* Cheeks - blush */}
      <circle cx="70" cy="105" r="7" fill="#ff9999" opacity="0.25" />
      <circle cx="130" cy="105" r="7" fill="#ff9999" opacity="0.25" />

      {/* Left hand waving */}
      <g transform="translate(-12, 8)">
        <ellipse cx="52" cy="145" rx="10" ry="8" fill="url(#skinGradient)" transform="rotate(-15, 52, 145)" />
        {/* Fingers */}
        <rect x="42" y="133" width="5" height="12" rx="2.5" fill="url(#skinGradient)" transform="rotate(-20, 44, 139)" />
        <rect x="48" y="130" width="5" height="14" rx="2.5" fill="url(#skinGradient)" transform="rotate(-10, 50, 137)" />
        <rect x="54" y="129" width="5" height="14" rx="2.5" fill="url(#skinGradient)" transform="rotate(0, 56, 136)" />
        <rect x="60" y="131" width="5" height="12" rx="2.5" fill="url(#skinGradient)" transform="rotate(10, 62, 137)" />
      </g>

      {/* Right hand holding document */}
      <g transform="translate(10, 5)">
        {/* Document */}
        <rect x="138" y="130" width="22" height="28" rx="2" fill="white" stroke="#d1d5db" strokeWidth="1" transform="rotate(8, 149, 144)" />
        <line x1="142" y1="137" x2="155" y2="135" stroke="#93c5fd" strokeWidth="1.5" transform="rotate(8, 149, 144)" />
        <line x1="142" y1="142" x2="155" y2="140" stroke="#93c5fd" strokeWidth="1.5" transform="rotate(8, 149, 144)" />
        <line x1="142" y1="147" x2="150" y2="146" stroke="#93c5fd" strokeWidth="1.5" transform="rotate(8, 149, 144)" />
        {/* Checkmark on doc */}
        <path d="M146 150 L149 154 L157 145" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" transform="rotate(8, 149, 144)" />
        {/* Hand */}
        <ellipse cx="148" cy="148" rx="10" ry="8" fill="url(#skinGradient)" transform="rotate(8, 148, 148)" />
      </g>

      {/* Scale of justice badge on lapel */}
      <circle cx="85" cy="142" r="6" fill="#3b82f6" opacity="0.9" />
      <text x="85" y="145" textAnchor="middle" fontSize="8" fill="white">⚖</text>

      {/* Gradients */}
      <defs>
        <linearGradient id="suitGradient" x1="58" y1="130" x2="142" y2="175">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#152d4a" />
        </linearGradient>
        <linearGradient id="headGradient" x1="55" y1="50" x2="145" y2="138">
          <stop offset="0%" stopColor="#fcd5b0" />
          <stop offset="100%" stopColor="#e8b88a" />
        </linearGradient>
        <radialGradient id="faceHighlight" cx="0.4" cy="0.35" r="0.6">
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="skinGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fcd5b0" />
          <stop offset="100%" stopColor="#e8b88a" />
        </linearGradient>
      </defs>
    </svg>
  );
}
