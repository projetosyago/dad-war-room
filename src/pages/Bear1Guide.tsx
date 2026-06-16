import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Hourglass, ArrowRight } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { heroImage } from '../data/events'

const JOINER_HEROES = [
  { id: 'amadeus', slot: 'B1' },
  { id: 'chenko', slot: 'B2' },
  { id: 'amane', slot: 'B3' },
  { id: 'yeonwoo', slot: 'B4' },
] as const

export function Bear1Guide() {
  const { t } = useTranslation()
  return (
    <div className="container-narrow pt-6 pb-12 sm:pt-10 sm:pb-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 bg-bg-card/60 backdrop-blur-sm mb-4 text-[10px] tracking-[0.3em] uppercase text-gold-soft">
          <Hourglass size={11} weight="duotone" className="text-gold-soft" />
          Guide preview
        </div>
        <h1 className="font-display text-3xl sm:text-5xl tracking-wider uppercase mb-2 leading-tight">
          <span className="text-gold-shimmer">Bear Hunt 1</span>
        </h1>
        <p className="text-ink-paper text-base sm:text-lg text-balance mb-6">
          {t('events.bear1.title')}
        </p>

        <div className="divider-gold mb-6" />

        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.1 } },
          }}
          className="grid grid-cols-4 gap-2 sm:gap-3 max-w-md mx-auto"
        >
          {JOINER_HEROES.map((h) => (
            <motion.div
              key={h.id}
              variants={{
                hidden: { opacity: 0, y: 16, scale: 0.95 },
                show: { opacity: 1, y: 0, scale: 1 },
              }}
              className="group relative"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden border border-gold/30 bg-bg-card">
                <img
                  src={heroImage(h.id)}
                  alt={h.id}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg/95 to-transparent" />
                <span className="absolute top-1.5 left-1.5 text-[9px] tracking-widest uppercase bg-bg/80 border border-gold/40 text-gold-soft rounded-md px-1.5 py-0.5">
                  {h.slot}
                </span>
                <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-display-clean tracking-wider uppercase text-gold-soft">
                  {h.id}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <p className="mt-8 text-sm text-ink-paper max-w-md mx-auto leading-relaxed">
          The full visual guide is being built — wave timeline, the 7 saved formations with real
          screenshots, the golden rule, and copy-ready chat commands.
        </p>

        <Link
          to="/events"
          className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-gold-soft hover:text-gold transition-colors"
        >
          See all events
          <ArrowRight size={13} weight="bold" />
        </Link>
      </motion.div>
    </div>
  )
}
