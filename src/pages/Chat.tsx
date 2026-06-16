import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, BellRinging, ChatCircle, Image, Megaphone, Sparkle } from '@phosphor-icons/react'

/**
 * Public Chat page — placeholder until the live channel ships.
 * Locked teaser content (per Salles): mentions image upload, ally chip,
 * cross-alliance coordination. Until then, push notifications cover the
 * urgent broadcasts — we point folks at Settings so they don't miss them.
 */
export function Chat() {
  const { t } = useTranslation()
  return (
    <div className="container-narrow pt-7 sm:pt-12 pb-16">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 text-center"
      >
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/30 bg-gold/8 mb-3">
          <ChatCircle size={22} weight="duotone" className="text-gold-soft" />
        </span>
        <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft mb-1">{t('chat.eyebrow')}</div>
        <h1 className="font-display text-2xl sm:text-3xl text-ink-cream tracking-wider leading-none">
          {t('chat.title')}
        </h1>
        <p className="text-sm text-ink-paper mt-3 leading-relaxed max-w-md mx-auto">
          {t('chat.tagline')}
        </p>
        <p className="text-xs text-ink-mute mt-2 leading-relaxed max-w-md mx-auto">
          {t('chat.pushHint')}
        </p>
        <Link
          to="/settings"
          className="btn-gold mt-4 inline-flex"
        >
          <BellRinging size={16} weight="duotone" />
          {t('chat.enablePush')}
          <ArrowRight size={14} weight="bold" />
        </Link>
      </motion.header>

      <ul className="space-y-3">
        <FeatureCard
          icon={Image}
          title={t('chat.features.images.title')}
          text={t('chat.features.images.text')}
        />
        <FeatureCard
          icon={Megaphone}
          title={t('chat.features.crossAlliance.title')}
          text={t('chat.features.crossAlliance.text')}
        />
        <FeatureCard
          icon={Sparkle}
          title={t('chat.features.historyReactions.title')}
          text={t('chat.features.historyReactions.text')}
        />
      </ul>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ChatCircle
  title: string
  text: string
}) {
  return (
    <li className="card p-4 sm:p-5 flex items-start gap-3">
      <span className="h-10 w-10 rounded-xl border border-gold/25 bg-bg-card flex items-center justify-center shrink-0">
        <Icon size={16} weight="duotone" className="text-gold-soft" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-display-clean text-sm text-ink-cream tracking-wider uppercase">
          {title}
        </div>
        <p className="text-[11px] text-ink-mute mt-0.5 leading-snug">{text}</p>
      </div>
    </li>
  )
}
