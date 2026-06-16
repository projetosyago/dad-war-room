interface OrnamentStampProps {
  /** Words to show in the stamp (default: DAD acronym — Dominate · Ally · Defend). */
  words?: readonly [string, string, string]
}

/**
 * The DAD acronym stamp under the title: `─── Dominate · Ally · Defend ───`.
 * Decorative — the aria-label reads it as a full sentence; visual spans are hidden.
 * Animates in 1.65s after page load (after the forge-reveal of the title finishes).
 */
export function OrnamentStamp({
  words = ['Dominate', 'Ally', 'Defend'] as const,
}: OrnamentStampProps = {}) {
  return (
    <div className="login-ornament" aria-label={`${words.join('. ')}.`}>
      <span className="login-ornament-line" aria-hidden="true" />
      <span className="login-ornament-stamp" aria-hidden="true">
        {words.map((word, i) => (
          <span key={word}>
            {word}
            {i < words.length - 1 && <span className="login-ornament-sep">{' · '}</span>}
          </span>
        ))}
      </span>
      <span className="login-ornament-line" aria-hidden="true" />
    </div>
  )
}
