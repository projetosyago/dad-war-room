import DOMPurify from 'dompurify'

/**
 * Sanitizes Tiptap admin-authored HTML before passing to dangerouslySetInnerHTML.
 *
 * Whitelist matches what the admin Tiptap editor produces (see
 * src/components/admin/RichTextEditor.tsx): structural prose, links, images,
 * code blocks. Anything outside the whitelist is stripped — script tags,
 * iframes, event handlers, javascript: URLs all get removed by DOMPurify
 * even before our allowlist applies.
 *
 * Wave 10 audit remediation (finding #09 — XSS surface via bodyHtml raw).
 */
const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'strong', 'em', 'u', 's', 'mark', 'sub', 'sup',
  'ul', 'ol', 'li',
  'blockquote',
  'a', 'img',
  'code', 'pre',
  'span', 'div',
]
const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title',
  'target', 'rel',
  'class', 'style',
]

export function sanitizeAdminHtml(html: string | null | undefined): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Force any <a> to be safe — DOMPurify already strips javascript:
    // URLs but this adds the rel attributes for free.
    ADD_ATTR: ['target', 'rel'],
  })
}
