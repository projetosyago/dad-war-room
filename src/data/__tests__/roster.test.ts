import { describe, it, expect } from 'vitest'
import { formatPower } from '../roster'

describe('formatPower', () => {
  it('formats values >= 1000 as B (billions, 2 decimals)', () => {
    expect(formatPower(6647)).toBe('6.65B')
    expect(formatPower(1234)).toBe('1.23B')
    expect(formatPower(1000)).toBe('1.00B')
  })

  it('formats values in [1, 1000) as M (millions, 1 decimal)', () => {
    expect(formatPower(155.4)).toBe('155.4M')
    expect(formatPower(999.9)).toBe('999.9M')
    expect(formatPower(1)).toBe('1.0M')
  })

  it('formats values < 1 as K (thousands, integer)', () => {
    expect(formatPower(0.5)).toBe('500K')
    expect(formatPower(0.1)).toBe('100K')
  })

  it('handles 0', () => {
    expect(formatPower(0)).toBe('0K')
  })
})
