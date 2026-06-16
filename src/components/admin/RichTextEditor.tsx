import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Image as ImageExt } from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import {
  ArrowUUpLeft,
  ArrowUUpRight,
  Image as ImageIcon,
  ListBullets,
  ListNumbers,
  Quotes,
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
  TextB,
  TextH,
  TextItalic,
  TextUnderline,
  X,
} from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageUploadField } from '../ui/ImageUploadField'

/**
 * Reusable Tiptap editor for the admin side.
 * - Headings (H2/H3), bold/italic/underline, lists, quote, align L/C/R, image embed, undo/redo.
 * - Emits HTML via onChange whenever the document mutates.
 *
 * Salles 2026-06-15: needs to be "muito muito muito rich, riquíssimo" — this
 * covers the editorial use-cases (milestone detail pages, future announcements).
 */
export interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = '320px',
}: RichTextEditorProps) {
  const { t } = useTranslation()
  const effectivePlaceholder = placeholder ?? t('admin.richTextEditor.placeholder')
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      ImageExt.configure({ inline: false, allowBase64: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: effectivePlaceholder }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          'prose prose-invert prose-headings:font-display-clean prose-headings:tracking-wider prose-headings:text-gold-shimmer prose-a:text-gold-soft max-w-none px-4 py-3 focus:outline-none',
      },
    },
  })

  // Inline image-insert popover state. Replaces the old `window.prompt('URL da imagem:')`
  // with a real upload + URL paste UI, scoped to the milestone-bodies/inline-images folder.
  const [imageInsertOpen, setImageInsertOpen] = useState(false)
  const [imageUrlValue, setImageUrlValue] = useState('')

  // Sync external value updates (e.g. when loading from server after mount).
  useEffect(() => {
    if (!editor) return
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  if (!editor) {
    return (
      <div className="rounded-lg border border-gold/20 bg-bg-card/60 animate-pulse" style={{ minHeight }} />
    )
  }

  return (
    <div className="rounded-lg border border-gold/25 bg-bg-card/60 overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-gold/15 bg-bg/40">
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title={t('admin.richTextEditor.title')}
        >
          <TextH size={14} weight="bold" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title={t('admin.richTextEditor.subtitle')}
        >
          <TextH size={12} weight="bold" />
        </ToolbarButton>
        <Sep />
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title={t('admin.richTextEditor.bold')}
        >
          <TextB size={14} weight="bold" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title={t('admin.richTextEditor.italic')}
        >
          <TextItalic size={14} weight="bold" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title={t('admin.richTextEditor.underline')}
        >
          <TextUnderline size={14} weight="bold" />
        </ToolbarButton>
        <Sep />
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title={t('admin.richTextEditor.bulletList')}
        >
          <ListBullets size={14} weight="bold" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title={t('admin.richTextEditor.orderedList')}
        >
          <ListNumbers size={14} weight="bold" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title={t('admin.richTextEditor.quote')}
        >
          <Quotes size={14} weight="bold" />
        </ToolbarButton>
        <Sep />
        <ToolbarButton
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title={t('admin.richTextEditor.alignLeft')}
        >
          <TextAlignLeft size={14} weight="bold" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title={t('admin.richTextEditor.alignCenter')}
        >
          <TextAlignCenter size={14} weight="bold" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title={t('admin.richTextEditor.alignRight')}
        >
          <TextAlignRight size={14} weight="bold" />
        </ToolbarButton>
        <Sep />
        <ToolbarButton
          active={imageInsertOpen}
          onClick={() => {
            setImageUrlValue('')
            setImageInsertOpen((v) => !v)
          }}
          title={t('admin.richTextEditor.insertImage')}
        >
          <ImageIcon size={14} weight="duotone" />
        </ToolbarButton>
        <div className="ml-auto flex items-center gap-1">
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title={t('admin.richTextEditor.undo')}>
            <ArrowUUpLeft size={14} weight="bold" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title={t('admin.richTextEditor.redo')}>
            <ArrowUUpRight size={14} weight="bold" />
          </ToolbarButton>
        </div>
      </div>
      {imageInsertOpen && (
        <div className="border-b border-gold/15 bg-bg/40 px-3 py-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] tracking-[0.28em] uppercase text-gold-soft">
              {t('admin.richTextEditor.insertImage')}
            </div>
            <button
              type="button"
              onClick={() => setImageInsertOpen(false)}
              className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase text-ink-mute hover:text-ink-cream"
            >
              <X size={11} weight="bold" /> {t('admin.richTextEditor.close')}
            </button>
          </div>
          <ImageUploadField
            bucket="milestone-bodies"
            pathPrefix="inline-images"
            value={null}
            onChange={(url) => {
              if (url) {
                editor.chain().focus().setImage({ src: url }).run()
                setImageInsertOpen(false)
              }
            }}
            label={t('admin.richTextEditor.uploadImage')}
          />
          <div className="relative flex items-center gap-2">
            <span className="h-px flex-1 bg-gold/15" />
            <span className="text-[10px] tracking-[0.28em] uppercase text-ink-mute">{t('admin.richTextEditor.or')}</span>
            <span className="h-px flex-1 bg-gold/15" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] tracking-[0.28em] uppercase text-gold-soft">
              {t('admin.richTextEditor.imageUrl')}
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrlValue}
                onChange={(e) => setImageUrlValue(e.target.value)}
                placeholder={t('admin.richTextEditor.imageUrlPlaceholder')}
                className="flex-1 rounded-md bg-bg-card border border-gold/25 px-3 py-1.5 text-xs text-ink-cream focus:border-gold/45 outline-none"
              />
              <button
                type="button"
                disabled={imageUrlValue.trim() === ''}
                onClick={() => {
                  const u = imageUrlValue.trim()
                  if (!u) return
                  editor.chain().focus().setImage({ src: u }).run()
                  setImageUrlValue('')
                  setImageInsertOpen(false)
                }}
                className="px-3 py-1.5 rounded-md text-[11px] tracking-widest uppercase bg-gold/15 border border-gold/40 text-gold-soft hover:bg-gold/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('admin.richTextEditor.insert')}
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center h-7 w-7 rounded-md border transition-colors ${
        active
          ? 'bg-gold/15 border-gold/45 text-gold-soft'
          : 'border-transparent text-ink-soft hover:border-gold/25 hover:text-ink-cream'
      }`}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <span className="h-5 w-px bg-gold/15 mx-1" />
}
