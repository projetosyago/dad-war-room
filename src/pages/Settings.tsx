import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  GearSix,
  ShieldCheck,
  CaretRight,
  SignIn,
  SignOut,
  UserCircle,
} from '@phosphor-icons/react'
import { useAuth } from '../hooks/useAuth'
import { useAdminMode } from '../contexts/AdminModeContext'
import { AllyChip } from '../components/ui/AllyChip'
import { LanguagePicker } from '../components/settings/LanguagePicker'
import { PwaInstallButton } from '../components/settings/PwaInstallButton'
import { PushNotificationsToggle } from '../components/settings/PushNotificationsToggle'
import { ProfileEditor } from '../components/settings/ProfileEditor'
import { cn } from '../lib/cn'

export function Settings() {
  const { t } = useTranslation()
  const auth = useAuth()
  const navigate = useNavigate()
  const { enter: enterAdminMode } = useAdminMode()

  function openAdminMode() {
    enterAdminMode()
    navigate('/admin/events')
  }

  return (
    <div className="container-narrow pt-5 pb-12 sm:pt-10 sm:pb-16">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-5 sm:mb-6 flex items-center gap-3"
      >
        <span className="h-10 w-10 rounded-xl border border-gold/30 bg-gold/8 flex items-center justify-center">
          <GearSix size={17} weight="duotone" className="text-gold-soft" />
        </span>
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft">{t('settings.eyebrow')}</div>
          <h1 className="font-display text-2xl sm:text-3xl text-ink-cream tracking-wider leading-none">
            {t('settings.title')}
          </h1>
        </div>
      </motion.header>

      <div className="space-y-3 sm:space-y-4">
        <LanguagePicker />
        <PwaInstallButton />
        <PushNotificationsToggle />

        <div className="mt-7 mb-3 text-[10px] tracking-[0.32em] uppercase text-ink-mute px-1">
          {t('settings.account.heading')}
        </div>

        {auth.status === 'signed-in' && <ProfileEditor />}

        {auth.status === 'signed-in' ? (
          <div className="card p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'h-10 w-10 rounded-xl border flex items-center justify-center shrink-0',
                  auth.isAdmin
                    ? 'border-gold/30 bg-gold/8'
                    : auth.isAlly
                      ? 'border-steel/40 bg-steel/10'
                      : 'border-gold/25 bg-bg-card',
                )}
              >
                {auth.isAdmin ? (
                  <ShieldCheck size={16} weight="duotone" className="text-gold-soft" />
                ) : (
                  <UserCircle
                    size={16}
                    weight="duotone"
                    className={auth.isAlly ? 'text-steel-soft' : 'text-gold-soft'}
                  />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-display-clean text-sm text-ink-cream tracking-wider uppercase truncate">
                    {auth.account?.displayName ??
                      auth.user?.email?.split('@')[0] ??
                      t('settings.account.signedInFallback')}
                  </div>
                  {auth.isAlly && <AllyChip />}
                  {auth.isAdmin && (
                    <span className="inline-flex items-center text-[9px] font-bold tracking-[0.20em] uppercase rounded px-1.5 py-0.5 leading-none bg-gold/15 text-gold-glow border border-gold/35">
                      {auth.role?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-ink-mute mt-0.5 truncate">
                  @{auth.account?.username ?? auth.user?.email?.split('@')[0]}
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              {auth.isAdmin && (
                <button
                  onClick={openAdminMode}
                  className="btn-gold flex-1 text-xs !min-h-[38px]"
                  title={t('settings.account.openAdminTooltip')}
                >
                  <ShieldCheck size={13} weight="duotone" />
                  {t('settings.account.openAdmin')}
                </button>
              )}
              <button
                onClick={() => auth.signOut()}
                className={cn(
                  'btn-ghost text-xs !min-h-[38px] !px-3',
                  !auth.isAdmin && 'flex-1',
                )}
              >
                <SignOut size={13} weight="duotone" />
                {t('auth.signOut')}
              </button>
            </div>
          </div>
        ) : auth.status === 'loading' ? (
          <div className="card p-4 sm:p-5 text-[11px] text-ink-mute">{t('auth.checkingSession')}</div>
        ) : (
          <Link
            to="/login"
            className="card p-4 sm:p-5 flex items-center gap-3 hover:border-gold/40 transition-colors group"
          >
            <span className="h-10 w-10 rounded-xl border border-gold/25 bg-bg-card flex items-center justify-center shrink-0">
              <SignIn size={16} weight="duotone" className="text-gold-soft" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-display-clean text-sm text-ink-cream tracking-wider uppercase">
                {t('auth.signIn')}
              </div>
              <div className="text-[11px] text-ink-mute mt-0.5">
                {t('settings.account.signInHint')}
              </div>
            </div>
            <CaretRight
              size={15}
              weight="bold"
              className="text-ink-dim group-hover:text-gold-soft transition-colors"
            />
          </Link>
        )}
      </div>
    </div>
  )
}
