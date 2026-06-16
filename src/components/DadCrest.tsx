interface DadCrestProps {
  size?: number
  className?: string
  withRibbon?: boolean
  ariaLabel?: string
}

/**
 * The DAD alliance crest — refined for DAD CODEX Inkwell Vault palette.
 * Crimson banner-shield with gold trinity flame emblem. Inline SVG so it
 * scales perfectly and tints follow currentColor when needed.
 */
export function DadCrest({
  size = 48,
  className = '',
  withRibbon = false,
  ariaLabel = 'DAD alliance crest',
}: DadCrestProps) {
  const idSuffix = String(size)
  return (
    <svg
      viewBox="0 0 240 280"
      width={size}
      height={(size * 280) / 240}
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id={`dad-gold-${idSuffix}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe9a3" />
          <stop offset="50%" stopColor="#f4cf73" />
          <stop offset="100%" stopColor="#c89934" />
        </linearGradient>
        <linearGradient id={`dad-crimson-${idSuffix}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b13838" />
          <stop offset="100%" stopColor="#6d1818" />
        </linearGradient>
      </defs>

      {withRibbon && (
        <g transform="translate(120, 22)">
          <rect
            x="-46"
            y="-14"
            width="92"
            height="22"
            rx="3"
            fill="#13172a"
            stroke={`url(#dad-gold-${idSuffix})`}
            strokeWidth="1.5"
          />
          <text
            x="0"
            y="2"
            textAnchor="middle"
            fontFamily="'Cinzel Decorative', Cinzel, Georgia, serif"
            fontSize="13"
            fontWeight="700"
            fill={`url(#dad-gold-${idSuffix})`}
            letterSpacing="4"
          >
            DAD
          </text>
        </g>
      )}

      {/* Outer banner-shield (crimson) */}
      <path
        d="M 20 60 L 220 60 L 220 175 Q 220 220 120 268 Q 20 220 20 175 Z"
        fill={`url(#dad-crimson-${idSuffix})`}
        stroke={`url(#dad-gold-${idSuffix})`}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Inner border (subtle gold tracing) */}
      <path
        d="M 32 72 L 208 72 L 208 172 Q 208 212 120 254 Q 32 212 32 172 Z"
        fill="none"
        stroke="#ffdb8a"
        strokeWidth="1"
        opacity="0.55"
      />

      {/* Trinity emblem */}
      <g transform="translate(120, 158)">
        <path
          d="M 0 -70 Q -22 -38 -12 -10 Q 0 -28 12 -10 Q 22 -38 0 -70 Z"
          fill="#fff5d8"
          stroke="#f4cf73"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M -58 5 Q -58 38 -32 50 Q -40 26 -22 18 Q -46 9 -58 5 Z"
          fill="#fff5d8"
          stroke="#f4cf73"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 58 5 Q 58 38 32 50 Q 40 26 22 18 Q 46 9 58 5 Z"
          fill="#fff5d8"
          stroke="#f4cf73"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 0 5 L 14 32 L 0 60 L -14 32 Z"
          fill={`url(#dad-gold-${idSuffix})`}
          stroke="#876318"
          strokeWidth="1"
        />
      </g>
    </svg>
  )
}
