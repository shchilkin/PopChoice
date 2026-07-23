interface PopcornMascotProps {
  size?: number;
  animated?: boolean;
}

export function PopcornMascot({ size = 120, animated = false }: PopcornMascotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={animated ? { animation: 'mascot-bob 2.5s ease-in-out infinite' } : undefined}
    >
      <style>{`
        @keyframes mascot-bob {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-6px) rotate(1deg); }
        }
        @keyframes pop-1 { 0%, 100% { transform: translate(0,0) scale(1); } 30% { transform: translate(-2px, -4px) scale(1.05); } }
        @keyframes pop-2 { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(2px, -5px) scale(1.08); } }
        @keyframes pop-3 { 0%, 100% { transform: translate(0,0) scale(1); } 70% { transform: translate(-1px, -3px) scale(1.04); } }
      `}</style>

      {/* Shadow */}
      <ellipse cx="60" cy="138" rx="28" ry="4" fill="rgba(0,0,0,0.3)" />

      {/* Bucket body */}
      <path d="M22 68 L28 122 Q28 128 34 128 L86 128 Q92 128 92 122 L98 68 Z" fill="#D42B2B" />

      {/* Bucket stripes */}
      <path d="M32 68 L36 128" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity="0.9" />
      <path d="M52 68 L56 128" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity="0.9" />
      <path d="M72 68 L68 128" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity="0.9" />

      {/* Bucket rim */}
      <path
        d="M18 64 Q18 56 26 56 L94 56 Q102 56 102 64 L102 68 Q102 76 94 76 L26 76 Q18 76 18 68 Z"
        fill="#B22222"
      />
      <path
        d="M20 64 Q20 60 26 60 L94 60 Q100 60 100 64 L100 68 Q100 72 94 72 L26 72 Q20 72 20 68 Z"
        fill="#CC2828"
      />

      {/* Popcorn pieces */}
      {/* Left popcorn */}
      <g style={animated ? { animation: 'pop-1 2s ease-in-out infinite' } : undefined}>
        <ellipse cx="36" cy="52" rx="16" ry="13" fill="#FFE066" />
        <ellipse cx="28" cy="46" rx="10" ry="8" fill="#FFD700" />
        <ellipse cx="44" cy="44" rx="9" ry="7" fill="#FFF0A0" />
        <ellipse cx="34" cy="40" rx="8" ry="6" fill="#FFE566" />
      </g>

      {/* Center popcorn */}
      <g style={animated ? { animation: 'pop-2 2.2s ease-in-out infinite' } : undefined}>
        <ellipse cx="60" cy="46" rx="18" ry="15" fill="#FFF0A0" />
        <ellipse cx="52" cy="38" rx="11" ry="9" fill="#FFE066" />
        <ellipse cx="68" cy="36" rx="10" ry="8" fill="#FFD700" />
        <ellipse cx="60" cy="30" rx="9" ry="7" fill="#FFF8CC" />
      </g>

      {/* Right popcorn */}
      <g style={animated ? { animation: 'pop-3 1.8s ease-in-out infinite' } : undefined}>
        <ellipse cx="84" cy="52" rx="16" ry="13" fill="#FFD700" />
        <ellipse cx="92" cy="46" rx="10" ry="8" fill="#FFE566" />
        <ellipse cx="76" cy="44" rx="9" ry="7" fill="#FFF0A0" />
        <ellipse cx="86" cy="40" rx="8" ry="6" fill="#FFD700" />
      </g>

      {/* Face on bucket */}
      {/* Eyes */}
      <circle cx="46" cy="98" r="5" fill="white" />
      <circle cx="74" cy="98" r="5" fill="white" />
      <circle cx="47.5" cy="96.5" r="2.5" fill="#1a1a2e" />
      <circle cx="75.5" cy="96.5" r="2.5" fill="#1a1a2e" />
      <circle cx="48.5" cy="95.5" r="1" fill="white" />
      <circle cx="76.5" cy="95.5" r="1" fill="white" />

      {/* Smile */}
      <path
        d="M48 110 Q60 120 72 110"
        stroke="white"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* Rosy cheeks */}
      <ellipse cx="38" cy="106" rx="6" ry="4" fill="#FF6B6B" opacity="0.5" />
      <ellipse cx="82" cy="106" rx="6" ry="4" fill="#FF6B6B" opacity="0.5" />

      {/* Stars around */}
      <path
        d="M8 30 L10 25 L12 30 L17 32 L12 34 L10 39 L8 34 L3 32 Z"
        fill="#F5C518"
        opacity="0.8"
      />
      <path
        d="M108 20 L109.5 16 L111 20 L115 21.5 L111 23 L109.5 27 L108 23 L104 21.5 Z"
        fill="#F5C518"
        opacity="0.6"
      />
      <path
        d="M14 10 L15 7 L16 10 L19 11 L16 12 L15 15 L14 12 L11 11 Z"
        fill="#F5C518"
        opacity="0.5"
      />
    </svg>
  );
}
