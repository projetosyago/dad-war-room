import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  BookOpen,
  CaretRight,
  PawPrint,
  Shield,
  Sword,
  UsersThree,
} from '@phosphor-icons/react'

/**
 * Catalogue hub — entry point for all admin CRUD over the 5 game-data tables
 * (heroes / pets / masters / troop tiers). Mirrors the AdminAlliance CTA card
 * pattern so the chrome feels native (eyebrow + title + 4 cards + CaretRight).
 */
export function AdminCatalogue() {
  const { t } = useTranslation()
  return (
    <div className="container-wide pt-6 sm:pt-12 pb-28 sm:pb-12">
      <Link
        to="/admin/alliance"
        className="inline-flex items-center gap-1.5 text-xs text-ink-mute hover:text-gold mb-4"
      >
        <ArrowLeft size={14} weight="bold" /> {t('admin.catalogue.backToAlliance')}
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <span className="h-10 w-10 rounded-lg bg-gold/12 border border-gold/35 flex items-center justify-center">
          <BookOpen size={18} weight="duotone" className="text-gold-soft" />
        </span>
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft">
            {t('admin.catalogue.eyebrow')}
          </div>
          <h1 className="font-display-clean text-2xl sm:text-3xl text-ink-cream tracking-wider leading-none">
            {t('admin.catalogue.title')}
          </h1>
        </div>
      </header>

      <p className="text-sm text-ink-mute mb-6">
        <Trans
          i18nKey="admin.catalogue.intro"
          components={{ c: <code className="text-gold-soft" /> }}
        />
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CatalogueCta
          to="/admin/alliance/catalogue/heroes"
          icon={UsersThree}
          title={t('admin.catalogue.cards.heroes.title')}
          subtitle={t('admin.catalogue.cards.heroes.subtitle')}
        />
        <CatalogueCta
          to="/admin/alliance/catalogue/pets"
          icon={PawPrint}
          title={t('admin.catalogue.cards.pets.title')}
          subtitle={t('admin.catalogue.cards.pets.subtitle')}
        />
        <CatalogueCta
          to="/admin/alliance/catalogue/masters"
          icon={Shield}
          title={t('admin.catalogue.cards.masters.title')}
          subtitle={t('admin.catalogue.cards.masters.subtitle')}
        />
        <CatalogueCta
          to="/admin/alliance/catalogue/troop-tiers"
          icon={Sword}
          title={t('admin.catalogue.cards.troopTiers.title')}
          subtitle={t('admin.catalogue.cards.troopTiers.subtitle')}
        />
      </div>
    </div>
  )
}

function CatalogueCta({
  to,
  icon: Icon,
  title,
  subtitle,
}: {
  to: string
  icon: typeof BookOpen
  title: string
  subtitle: string
}) {
  return (
    <Link
      to={to}
      className="card-elev p-4 sm:p-5 flex items-center gap-3 hover:border-gold/40 hover:-translate-y-0.5 transition-all group"
    >
      <span className="h-11 w-11 rounded-xl border border-gold/30 bg-gold/8 flex items-center justify-center shrink-0">
        <Icon size={18} weight="duotone" className="text-gold-soft" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-display-clean text-sm sm:text-base text-ink-cream tracking-wider uppercase">
          {title}
        </div>
        <p className="text-[11px] text-ink-mute mt-0.5 leading-snug">{subtitle}</p>
      </div>
      <CaretRight
        size={15}
        weight="bold"
        className="text-ink-dim group-hover:text-gold-soft group-hover:translate-x-0.5 transition-all shrink-0"
      />
    </Link>
  )
}
