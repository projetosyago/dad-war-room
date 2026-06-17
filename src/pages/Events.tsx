import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { AllEventsCard } from '../components/dashboard/AllEventsCard'
import { UpcomingEventsSlider } from '../components/dashboard/UpcomingEventsSlider'

export function Events() {
  const { t } = useTranslation()
  return (
    <div className="container-wide pt-5 pb-12 sm:pt-10 sm:pb-16 space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-1"
      >
        <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft mb-1 text-center">
          {t('events.page.eyebrow')}
        </div>
        <h1 className="font-display text-2xl sm:text-3xl text-ink-cream tracking-wider leading-none text-center">
          {t('events.page.title')}
        </h1>
        <p className="text-xs sm:text-sm text-ink-mute mt-1.5">
          {t('events.page.subtitle')}
        </p>
      </motion.div>

      {/* Hero: next 5 occurrences (swipe horizontally) */}
      <UpcomingEventsSlider />

      <AllEventsCard />
    </div>
  )
}
