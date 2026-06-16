/**
 * Tiny safe markdown → HTML converter for admin-authored descriptions.
 *
 * Scope (only what we promised admins):
 *   - **bold**, *italic*, `inline code`
 *   - [text](https://url)   — http/https only, opens new tab with rel="noopener"
 *   - Paragraphs from blank-line splits
 *   - Single-line breaks become <br>
 *   - Lines starting with "- " become a bulleted list
 *
 * Everything else is escaped as text — there's no raw HTML passthrough, so
 * XSS surface is zero even though we ship the result via dangerouslySetInnerHTML.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function applyInline(s: string): string {
  // Order matters — bold first (so ** wins over *).
  let out = s
  // Inline code first so we don't apply other formatting inside.
  out = out.replace(/`([^`]+?)`/g, (_, c: string) => `<code>${escapeHtml(c)}</code>`)
  // Bold
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Italic (avoid eating the trailing *)
  out = out.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>')
  // Links — strict http(s) only.
  out = out.replace(
    /\[([^\]]+?)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, text: string, url: string) =>
      `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`,
  )
  return out
}

export function markdownToHtml(md: string | null | undefined): string {
  if (!md) return ''
  const escaped = escapeHtml(md)
  // Split into paragraphs on blank lines.
  const blocks = escaped.split(/\n{2,}/)
  const rendered = blocks.map((block) => {
    const lines = block.split(/\n/).map((line) => line.replace(/\s+$/, ''))
    // Bullet list — every line starts with "- " or "* "
    if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
      const items = lines.map((line) => `<li>${applyInline(line.replace(/^\s*[-*]\s+/, ''))}</li>`)
      return `<ul>${items.join('')}</ul>`
    }
    // Otherwise paragraph with <br> for single line breaks.
    return `<p>${applyInline(lines.join('<br>'))}</p>`
  })
  return rendered.join('')
}
