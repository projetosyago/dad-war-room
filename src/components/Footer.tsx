import { useTranslation } from 'react-i18next'

/**
 * Tiny footer — one line, low contrast. Per Salles 2026-06-14:
 * "rodapé bem mais soft, menor, discreto".
 * Admin entry NEVER lives here; it's in /settings → Advanced.
 */
export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="mt-2 sm:mt-4">
      <div className="container-wide pb-3 pt-1 text-center">
        <p className="text-[10px] tracking-[0.24em] uppercase text-ink-dim/80">
          {t('footer.alliance')}
          <span className="mx-2 text-ink-dim/40">·</span>
          {t('footer.kingdom')}
          <span className="mx-2 text-ink-dim/40">·</span>
          {t('footer.creator')}{' '}
          <span className="text-gold-soft/80">{t('footer.creatorName')}</span>
        </p>
      </div>
    </footer>
  )
}
