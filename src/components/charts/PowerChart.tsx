import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { TrendUp } from '@phosphor-icons/react'
import type { MemberPowerSnapshot } from '../../types/domain'
import { formatPower } from '../../data/roster'

interface PowerChartProps {
  snapshots: MemberPowerSnapshot[]
  height?: number
}

interface ChartPoint {
  snapshot: MemberPowerSnapshot
  /** X coordinate in viewBox units. */
  x: number
  /** Y coordinate in viewBox units (lower y = higher power). */
  y: number
  /** Time as Date for tick labelling. */
  date: Date
}

const VIEWBOX_WIDTH = 800
const PADDING_LEFT = 60
const PADDING_RIGHT = 24
const PADDING_TOP = 16
const PADDING_BOTTOM = 32
const TICK_COUNT = 6

/**
 * Pure-SVG line chart for a member's power over time. No external chart lib —
 * the cost/benefit is unbeatable: ~150 lines for a fully themed visual with
 * tooltips via <title> and a gold area gradient.
 *
 * Conventions:
 *   • Snapshots come in DESC from the repo; we sort ASC here so left=oldest.
 *   • Y axis is auto-scaled with a 10% headroom so the line doesn't hug the
 *     top/bottom — feels less cramped at any zoom.
 *   • Tick labels show "MMM dd" — coarse enough to read on phones, precise
 *     enough that "10/05 ≠ 12/05" is unambiguous.
 *   • Empty / single-snapshot states render a friendly note instead of an
 *     empty SVG (which looks broken).
 */
export function PowerChart({ snapshots, height = 280 }: PowerChartProps) {
  const { t } = useTranslation()
  const points = useMemo<ChartPoint[]>(() => {
    if (snapshots.length < 2) return []
    const sorted = [...snapshots].sort((a, b) =>
      a.snapshotAt.localeCompare(b.snapshotAt),
    )
    const minTime = new Date(sorted[0].snapshotAt).getTime()
    const maxTime = new Date(sorted[sorted.length - 1].snapshotAt).getTime()
    const timeSpan = Math.max(1, maxTime - minTime)

    const powers = sorted.map((s) => s.powerM)
    const minPower = Math.min(...powers)
    const maxPower = Math.max(...powers)
    // 10% padding above/below the data band — handles flat-line series too.
    const headroom = Math.max(0.5, (maxPower - minPower) * 0.1)
    const yMin = Math.max(0, minPower - headroom)
    const yMax = maxPower + headroom
    const ySpan = Math.max(0.001, yMax - yMin)

    const plotWidth = VIEWBOX_WIDTH - PADDING_LEFT - PADDING_RIGHT
    const plotHeight = height - PADDING_TOP - PADDING_BOTTOM

    return sorted.map((s) => {
      const t = new Date(s.snapshotAt).getTime()
      const xRatio = (t - minTime) / timeSpan
      const yRatio = (s.powerM - yMin) / ySpan
      return {
        snapshot: s,
        x: PADDING_LEFT + xRatio * plotWidth,
        y: PADDING_TOP + (1 - yRatio) * plotHeight,
        date: new Date(s.snapshotAt),
      }
    })
  }, [snapshots, height])

  // Pre-compute ticks (X axis) and Y axis range labels — referenced both in
  // path generation below and in the JSX. Cheap, but worth a memo.
  const { xTicks, yMin, yMax } = useMemo(() => {
    if (points.length < 2) return { xTicks: [], yMin: 0, yMax: 0 }
    const firstX = points[0].x
    const lastX = points[points.length - 1].x
    const firstT = points[0].date.getTime()
    const lastT = points[points.length - 1].date.getTime()
    const span = Math.max(1, lastT - firstT)
    const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
      const ratio = i / (TICK_COUNT - 1)
      return {
        x: firstX + (lastX - firstX) * ratio,
        date: new Date(firstT + span * ratio),
      }
    })
    const powers = points.map((p) => p.snapshot.powerM)
    return {
      xTicks: ticks,
      yMin: Math.min(...powers),
      yMax: Math.max(...powers),
    }
  }, [points])

  // Path strings — line + area fill underneath. Computed in one go because
  // both consume the same point list and run cheaply.
  const { linePath, areaPath } = useMemo(() => {
    if (points.length < 2) return { linePath: '', areaPath: '' }
    const baseline = (height - PADDING_BOTTOM).toFixed(2)
    const line = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ')
    const area =
      `M ${points[0].x.toFixed(2)} ${baseline} ` +
      points.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') +
      ` L ${points[points.length - 1].x.toFixed(2)} ${baseline} Z`
    return { linePath: line, areaPath: area }
  }, [points, height])

  return (
    <div className="card-hero p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="icon-frame icon-frame--sm text-gold-soft">
          <TrendUp size={20} weight="duotone" />
        </span>
        <div>
          <div className="eyebrow">{t('members.powerChart.eyebrow')}</div>
          <h2 className="hero-title text-lg sm:text-xl mt-0.5">{t('members.powerChart.title')}</h2>
        </div>
      </div>

      {points.length < 2 ? (
        <div className="text-sm text-ink-mute py-10 text-center">
          {t('members.powerChart.notEnoughData')}
        </div>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${height}`}
            preserveAspectRatio="none"
            className="w-full"
            style={{ height: `${height}px` }}
            role="img"
            aria-label={t('members.powerChart.eyebrow')}
          >
            <defs>
              <linearGradient id="powerArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f4cf73" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#f4cf73" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="powerLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#c89934" />
                <stop offset="40%" stopColor="#ffdb8a" />
                <stop offset="50%" stopColor="#ffe9a3" />
                <stop offset="60%" stopColor="#ffdb8a" />
                <stop offset="100%" stopColor="#c89934" />
              </linearGradient>
            </defs>

            {/* Y axis baseline + top guide */}
            <line
              x1={PADDING_LEFT}
              x2={VIEWBOX_WIDTH - PADDING_RIGHT}
              y1={height - PADDING_BOTTOM}
              y2={height - PADDING_BOTTOM}
              stroke="rgba(244,207,115,0.18)"
              strokeWidth={1}
            />
            <line
              x1={PADDING_LEFT}
              x2={VIEWBOX_WIDTH - PADDING_RIGHT}
              y1={PADDING_TOP}
              y2={PADDING_TOP}
              stroke="rgba(244,207,115,0.08)"
              strokeDasharray="2 4"
              strokeWidth={1}
            />

            {/* Y axis labels (min/max) — left side */}
            <text
              x={PADDING_LEFT - 8}
              y={PADDING_TOP + 4}
              textAnchor="end"
              fontSize="11"
              fill="rgba(151,162,184,0.7)"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            >
              {formatPower(yMax)}
            </text>
            <text
              x={PADDING_LEFT - 8}
              y={height - PADDING_BOTTOM + 4}
              textAnchor="end"
              fontSize="11"
              fill="rgba(151,162,184,0.7)"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            >
              {formatPower(yMin)}
            </text>

            {/* X axis tick labels */}
            {xTicks.map((tick, i) => (
              <text
                key={i}
                x={tick.x}
                y={height - PADDING_BOTTOM + 18}
                textAnchor="middle"
                fontSize="10"
                fill="rgba(151,162,184,0.7)"
                style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                {format(tick.date, 'MMM dd')}
              </text>
            ))}

            {/* Area under line */}
            <path d={areaPath} fill="url(#powerArea)" />

            {/* Line itself */}
            <path
              d={linePath}
              fill="none"
              stroke="url(#powerLine)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Dot markers — each with a <title> for native hover tooltip */}
            {points.map((p) => (
              <g key={p.snapshot.id}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill="#0d1124"
                  stroke="#ffdb8a"
                  strokeWidth={1.5}
                  className="transition-all hover:r-6"
                >
                  <title>
                    {format(p.date, 'MMM dd, yyyy')} — {formatPower(p.snapshot.powerM)}
                    {p.snapshot.tgLevel != null ? ` · TG${p.snapshot.tgLevel}` : ''}
                  </title>
                </circle>
              </g>
            ))}
          </svg>

          <div className="flex items-center justify-between mt-3 text-[10px] tracking-[0.22em] uppercase text-ink-mute">
            <span>{t('members.powerChart.snapshotCount', { count: points.length })}</span>
            <span>
              {format(points[0].date, 'MMM dd, yyyy')} →{' '}
              {format(points[points.length - 1].date, 'MMM dd, yyyy')}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
