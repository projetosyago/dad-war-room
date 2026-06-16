import { useEffect, useRef } from 'react'

interface EmbersBackgroundProps {
  /** Override particle count (mobile: 36 default, desktop: 60 default). */
  particleCount?: number
}

/**
 * Canvas-based fire embers simulation for the login screen.
 * Real physics: each particle has position, velocity, drift (sin wave),
 * thermal acceleration upward, life decay, and per-particle flicker phase.
 * Additive blending so overlapping embers glow stronger — like real fire.
 *
 * Performance: respects prefers-reduced-motion (pauses) and DPR (capped at 2).
 * Mobile gets 36 particles, desktop 60. ~1KB CSS already in index.css.
 */
export function EmbersBackground({ particleCount }: EmbersBackgroundProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const isMobile = matchMedia('(max-width: 600px)').matches
    const count = particleCount ?? (isMobile ? 36 : 60)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let W = 0
    let H = 0
    let rafId = 0

    function resize() {
      if (!canvas || !ctx) return
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    interface Particle {
      x: number
      y: number
      baseVx: number
      vx: number
      vy: number
      r: number
      life: number
      decay: number
      color: [number, number, number]
      flickerPhase: number
      flickerSpeed: number
    }

    function spawn(p: Particle, initial = false) {
      p.x = Math.random() * W
      p.y = initial ? Math.random() * H : H + 10
      p.baseVx = (Math.random() - 0.5) * 0.4
      p.vx = p.baseVx
      p.vy = -(0.3 + Math.random() * 0.9)
      p.r = 0.6 + Math.random() * 1.8
      p.life = 1
      p.decay = 0.0012 + Math.random() * 0.0028
      const v = Math.random()
      if (v < 0.5) p.color = [255, 175 + Math.random() * 30, 60 + Math.random() * 40]
      else if (v < 0.85) p.color = [255, 220 + Math.random() * 30, 120 + Math.random() * 40]
      else p.color = [255, 100 + Math.random() * 40, 40 + Math.random() * 20]
      p.flickerPhase = Math.random() * Math.PI * 2
      p.flickerSpeed = 0.05 + Math.random() * 0.08
    }

    const pool: Particle[] = Array.from({ length: count }, () => {
      const p: Particle = {
        x: 0, y: 0, baseVx: 0, vx: 0, vy: 0, r: 0, life: 1, decay: 0,
        color: [255, 200, 100], flickerPhase: 0, flickerSpeed: 0,
      }
      spawn(p, true)
      return p
    })

    function update(p: Particle) {
      p.vx = p.baseVx + Math.sin(p.y * 0.01 + p.flickerPhase) * 0.15
      p.x += p.vx
      p.y += p.vy
      p.vy -= 0.0015
      p.life -= p.decay
      if (p.life <= 0 || p.y < -20 || p.x < -20 || p.x > W + 20) spawn(p)
    }

    function draw(p: Particle, t: number) {
      if (!ctx) return
      const flicker = 0.65 + 0.35 * Math.sin(t * p.flickerSpeed + p.flickerPhase)
      const opacity = p.life * flicker
      const [r, g, b] = p.color
      const x = p.x
      const y = p.y
      const size = p.r
      const glowSize = size * 6
      const grad = ctx.createRadialGradient(x, y, 0, x, y, glowSize)
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity * 0.6})`)
      grad.addColorStop(
        0.3,
        `rgba(${r}, ${Math.floor(g * 0.7)}, ${Math.floor(b * 0.5)}, ${opacity * 0.25})`,
      )
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
      ctx.fillStyle = grad
      ctx.fillRect(x - glowSize, y - glowSize, glowSize * 2, glowSize * 2)
      ctx.fillStyle = `rgba(255, 245, 220, ${opacity})`
      ctx.beginPath()
      ctx.arc(x, y, size * 0.5, 0, Math.PI * 2)
      ctx.fill()
    }

    function frame(t: number) {
      if (!ctx) return
      ctx.clearRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'lighter'
      for (const p of pool) {
        update(p)
        draw(p, t)
      }
      rafId = requestAnimationFrame(frame)
    }

    if (!reduced) {
      rafId = requestAnimationFrame(frame)
    } else {
      // Single static frame so the canvas isn't fully empty.
      for (const p of pool) draw(p, 0)
    }

    return () => {
      window.removeEventListener('resize', resize)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [particleCount])

  return <canvas ref={canvasRef} className="login-embers" aria-hidden="true" />
}
