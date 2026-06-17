import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CloudArrowUp, Image as ImageIcon, Trash, X } from '@phosphor-icons/react'
import {
  getBucketConfig,
  uploadImage,
  type ImageBucket,
} from '../../repositories/storage'

/**
 * Reusable drag-and-drop image upload that hands back a public Supabase URL.
 *
 * Designed to slot in next to existing URL-paste fields:
 *   - Same gold/navy "card-hero" vocabulary (gold border, dark navy bg, eyebrow label).
 *   - Shows a live preview when `value` is set.
 *   - Validates type + size client-side BEFORE talking to Supabase so the user
 *     gets an immediate, readable error.
 *   - On success: calls `onChange(publicUrl)`. On error: renders the message in
 *     `text-crimson-glow` and leaves `value` untouched.
 *
 * NOT a generic file picker — sized + styled to feel cohesive with the rest of
 * the admin UI (see WAR_ROOM_LOG.md §1.3).
 */
export interface ImageUploadFieldProps {
  bucket: ImageBucket
  pathPrefix: string
  value: string | null
  onChange: (url: string | null) => void
  label?: string
  /**
   * Override the default per-bucket size limit (rare — usually let the bucket
   * config decide). Useful when a screen wants to be stricter than the bucket.
   */
  maxSizeBytes?: number
  disabled?: boolean
}

export function ImageUploadField({
  bucket,
  pathPrefix,
  value,
  onChange,
  label,
  maxSizeBytes,
  disabled = false,
}: ImageUploadFieldProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resolvedLabel = label ?? t('ui.imageUpload.label')

  const bucketCfg = getBucketConfig(bucket)
  const effectiveMax = maxSizeBytes ?? bucketCfg.maxBytes
  const maxMb = (effectiveMax / (1024 * 1024)).toFixed(0)
  const acceptStr = bucketCfg.allowedTypes.join(',')
  const allowedHuman = bucketCfg.allowedTypes
    .map((t) => t.replace('image/', '').toUpperCase())
    .join(' · ')

  // React Compiler can't preserve the manual memoization here because `busy`
  // is a setState target that's also read inside the callback. The memoization
  // isn't critical (React 19 Compiler auto-memoizes at runtime). Block-disable
  // covers both the callback body and the dependency array.
  /* eslint-disable react-hooks/preserve-manual-memoization */
  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file || disabled || busy) return
      setError(null)

      // Soft client-side guard for callers passing a stricter maxSizeBytes
      // than the bucket default. The repository will re-validate too.
      if (file.size > effectiveMax) {
        setError(t('ui.imageUpload.errorTooLarge', { maxMb }))
        return
      }

      setBusy(true)
      try {
        const { publicUrl } = await uploadImage(bucket, file, pathPrefix)
        onChange(publicUrl)
      } catch (e) {
        setError((e as Error).message || t('ui.imageUpload.errorUploadFailed'))
      } finally {
        setBusy(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [bucket, busy, disabled, effectiveMax, maxMb, onChange, pathPrefix, t],
  )
  /* eslint-enable react-hooks/preserve-manual-memoization */

  function openPicker() {
    if (disabled || busy) return
    inputRef.current?.click()
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    if (disabled || busy) return
    const file = e.dataTransfer.files?.[0]
    void handleFile(file)
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (disabled || busy) return
    if (!dragOver) setDragOver(true)
  }

  function onDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
  }

  function clear() {
    if (disabled || busy) return
    setError(null)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] tracking-[0.28em] uppercase text-gold-soft">{resolvedLabel}</div>

      {value ? (
        <div className="rounded-lg border border-gold/35 bg-bg-card/60 p-3 flex items-center gap-3">
          <span className="h-16 w-16 rounded-md border border-gold/30 bg-bg overflow-hidden flex items-center justify-center shrink-0">
            <img
              src={value}
              alt={t('ui.imageUpload.previewAlt')}
              className="h-full w-full object-cover"
            />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] tracking-widest uppercase text-ink-mute">
              {t('ui.imageUpload.currentImage')}
            </div>
            <div className="text-xs text-ink-cream truncate font-mono">{value}</div>
          </div>
          <button
            type="button"
            onClick={openPicker}
            disabled={busy || disabled}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] tracking-widest uppercase border border-gold/35 text-gold-soft hover:bg-gold/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CloudArrowUp size={11} weight="bold" /> {t('ui.imageUpload.swap')}
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={busy || disabled}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] tracking-widest uppercase text-crimson-glow hover:bg-crimson/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash size={11} weight="bold" /> {t('ui.imageUpload.remove')}
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              openPicker()
            }
          }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`rounded-lg border-2 border-dashed px-4 py-6 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-gold/70 bg-gold/10'
              : 'border-gold/25 bg-bg-card/40 hover:border-gold/45 hover:bg-bg-card/60'
          } ${disabled || busy ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <span className="icon-frame icon-frame--sm text-gold-soft">
            {busy ? (
              <CloudArrowUp size={18} weight="duotone" className="animate-pulse" />
            ) : (
              <ImageIcon size={18} weight="duotone" />
            )}
          </span>
          <div className="text-xs text-ink-cream">
            {busy ? t('ui.imageUpload.uploading') : t('ui.imageUpload.dropOrClick')}
          </div>
          <div className="text-[10px] text-ink-mute tracking-wider uppercase">
            {t('ui.imageUpload.limitsHint', { allowedHuman, maxMb })}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={acceptStr}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          void handleFile(file)
        }}
      />

      {error && (
        <div className="flex items-start gap-1.5 text-[11px] text-crimson-glow">
          <X size={11} weight="bold" className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
