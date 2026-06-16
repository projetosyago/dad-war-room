import { useEffect, useState } from 'react'

export interface Countdown {
  totalMs: number
  days: number
  hours: number
  minutes: number
  seconds: number
  /** True when target has passed. */
  past: boolean
}

/**
 * Live countdown to an ISO/Date target. Ticks every 1s.
 * Returns negative totals + past=true once the target is in the past.
 */
export function useCountdown(target: string | Date | null | undefined): Countdown | null {
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    if (!target) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [target])

  if (!target) return null
  const t = typeof target === 'string' ? new Date(target).getTime() : target.getTime()
  const totalMs = t - now
  const abs = Math.abs(totalMs)
  const seconds = Math.floor(abs / 1000) % 60
  const minutes = Math.floor(abs / 1000 / 60) % 60
  const hours = Math.floor(abs / 1000 / 60 / 60) % 24
  const days = Math.floor(abs / 1000 / 60 / 60 / 24)
  return { totalMs, days, hours, minutes, seconds, past: totalMs < 0 }
}
