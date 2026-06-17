import { describe, it, expect } from 'vitest'
import { markdownToHtml } from '../markdown'

describe('markdownToHtml', () => {
  it('returns empty string for null / undefined / empty', () => {
    expect(markdownToHtml(null)).toBe('')
    expect(markdownToHtml(undefined)).toBe('')
    expect(markdownToHtml('')).toBe('')
  })

  it('escapes HTML characters in plain text', () => {
    expect(markdownToHtml('<script>alert(1)</script>')).toContain('&lt;script&gt;')
    expect(markdownToHtml('<script>alert(1)</script>')).not.toContain('<script>')
  })

  it('converts **bold** to <strong>', () => {
    expect(markdownToHtml('**hello**')).toContain('<strong>hello</strong>')
  })

  it('converts *italic* to <em>', () => {
    expect(markdownToHtml('*hello*')).toContain('<em>hello</em>')
  })

  it('converts inline code with backticks', () => {
    expect(markdownToHtml('use `npm install`')).toContain('<code>npm install</code>')
  })

  it('converts http(s) links with rel="noopener"', () => {
    const out = markdownToHtml('[link](https://example.com)')
    expect(out).toContain('href="https://example.com"')
    expect(out).toContain('rel="noopener noreferrer"')
    expect(out).toContain('target="_blank"')
  })

  it('rejects javascript: URLs (does not produce anchor)', () => {
    const out = markdownToHtml('[bad](javascript:alert(1))')
    expect(out).not.toContain('<a href="javascript:')
    expect(out).not.toContain('<a ')
  })

  it('converts bulleted lists', () => {
    const out = markdownToHtml('- one\n- two\n- three')
    expect(out).toContain('<ul>')
    expect(out).toContain('<li>one</li>')
    expect(out).toContain('<li>three</li>')
  })

  it('handles paragraphs from blank-line splits', () => {
    const out = markdownToHtml('first para\n\nsecond para')
    expect(out).toMatch(/<p>first para<\/p>.*<p>second para<\/p>/)
  })
})
