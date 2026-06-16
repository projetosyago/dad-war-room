interface TroopGemIconProps {
  size?: number
  className?: string
  /** When true, draws crossed swords inside the gem (default true). */
  withSwords?: boolean
}

/**
 * Steel "troop gem" badge used for pre-Truegold members (T1..T10).
 * Same visual mass as the gold TG gems on /images/tiers/tg{N}.png, but in
 * steel/silver colors with crossed swords inside — signals "still climbing,
 * no Truegold yet" while keeping the in-game tier-badge aesthetic.
 *
 * Per Salles' explicit feedback: NOT the town center building icon.
 */
export function TroopGemIcon({
  size = 18,
  className,
  withSwords = true,
}: TroopGemIconProps) {
  const idSuffix = String(size)
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Pre-Truegold troop tier"
    >
      <defs>
        <linearGradient id={`steel-gem-${idSuffix}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4cbd9" />
          <stop offset="50%" stopColor="#8d97aa" />
          <stop offset="100%" stopColor="#5c6679" />
        </linearGradient>
        <linearGradient id={`steel-gem-inner-${idSuffix}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#aab3c4" />
          <stop offset="100%" stopColor="#3f4658" />
        </linearGradient>
      </defs>
      {/* 8-point gem outline (matches the visual mass of the TG gold gems) */}
      <path
        d="M32 2 L40 12 L52 8 L54 22 L62 32 L54 42 L52 56 L40 52 L32 62 L24 52 L12 56 L10 42 L2 32 L10 22 L12 8 L24 12 Z"
        fill={`url(#steel-gem-${idSuffix})`}
        stroke="#252b42"
        strokeWidth="1.5"
      />
      {/* Inner facet shadow */}
      <path
        d="M32 10 L46 22 L46 42 L32 54 L18 42 L18 22 Z"
        fill={`url(#steel-gem-inner-${idSuffix})`}
        opacity="0.85"
      />
      {withSwords && (
        <>
          {/* Crossed swords */}
          <g stroke="#eef2f7" strokeWidth="3" strokeLinecap="round" fill="none">
            <line x1="22" y1="22" x2="42" y2="42" />
            <line x1="42" y1="22" x2="22" y2="42" />
          </g>
          {/* Sword hilts */}
          <circle cx="22" cy="22" r="2.2" fill="#876318" />
          <circle cx="42" cy="22" r="2.2" fill="#876318" />
          {/* Center jewel */}
          <circle cx="32" cy="32" r="3" fill="#f4cf73" stroke="#876318" strokeWidth="1" />
        </>
      )}
    </svg>
  )
}
