import { supabase } from '../lib/supabase'

/**
 * Storage repository — uploads to the three public buckets:
 *
 *   - 'avatars'             → per-user profile pictures. pathPrefix MUST be auth.uid().
 *   - 'notification-images' → admin-supplied images for push/notification cards.
 *   - 'milestone-bodies'    → admin-supplied images embedded in milestone body_html
 *                             (also used for inline rich-text editor images and
 *                             milestone icon overrides).
 *
 * All buckets are public — `getPublicUrl()` returns a stable, cacheable URL with
 * no expiry. RLS on storage.objects already gates writes (auth-only for
 * notification-images/milestone-bodies; auth + own-folder for avatars).
 *
 * Bucket limits (enforced server-side by Supabase, but we check client-side too
 * so the user gets an immediate, readable error):
 *   - avatars:             2 MB,  jpeg/png/webp/gif
 *   - notification-images: 5 MB,  jpeg/png/webp
 *   - milestone-bodies:    5 MB,  jpeg/png/webp/gif
 */

export type ImageBucket = 'avatars' | 'notification-images' | 'milestone-bodies'

interface BucketConfig {
  maxBytes: number
  allowedTypes: ReadonlyArray<string>
}

const BUCKETS: Record<ImageBucket, BucketConfig> = {
  avatars: {
    maxBytes: 2 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  'notification-images': {
    maxBytes: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  'milestone-bodies': {
    maxBytes: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
}

export function getBucketConfig(bucket: ImageBucket): BucketConfig {
  return BUCKETS[bucket]
}

function fileExtension(file: File): string {
  // Prefer extension from filename; fall back to content-type subtype.
  const dot = file.name.lastIndexOf('.')
  if (dot > -1 && dot < file.name.length - 1) {
    const ext = file.name.slice(dot + 1).toLowerCase()
    if (/^[a-z0-9]{1,5}$/.test(ext)) return ext
  }
  const sub = file.type.split('/')[1] ?? 'bin'
  return sub === 'jpeg' ? 'jpg' : sub
}

function sanitizePrefix(prefix: string): string {
  // Storage paths can't start/end with slashes, and we want to keep things
  // predictable so admin uploads don't escape their intended folder.
  return prefix
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.{2,}/g, '.')
}

export interface UploadResult {
  publicUrl: string
  path: string
}

/**
 * Uploads `file` to `bucket` under `${pathPrefix}/<uuid>.<ext>`, then returns
 * the public URL and storage path.
 *
 * Throws a readable Error on validation failure, network error, or RLS denial.
 */
export async function uploadImage(
  bucket: ImageBucket,
  file: File,
  pathPrefix: string,
): Promise<UploadResult> {
  const config = BUCKETS[bucket]
  if (!config) {
    throw new Error(`Unknown bucket: ${bucket}`)
  }

  if (!file) throw new Error('Nenhum arquivo selecionado.')

  if (!config.allowedTypes.includes(file.type)) {
    const human = config.allowedTypes
      .map((t) => t.replace('image/', '').toUpperCase())
      .join(', ')
    throw new Error(`Formato não suportado. Use ${human}.`)
  }

  if (file.size > config.maxBytes) {
    const mb = (config.maxBytes / (1024 * 1024)).toFixed(0)
    throw new Error(`Arquivo muito grande. Máximo ${mb} MB.`)
  }

  const cleanPrefix = sanitizePrefix(pathPrefix)
  if (cleanPrefix.length === 0) {
    throw new Error('Caminho de upload inválido.')
  }

  const ext = fileExtension(file)
  const path = `${cleanPrefix}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: false,
      contentType: file.type,
    })

  if (uploadError) {
    // Supabase returns RLS denials as "new row violates row-level security policy"
    // — rewrite to something the user can act on.
    const msg = uploadError.message ?? 'Falha no upload.'
    if (/row-level security|permission/i.test(msg)) {
      throw new Error('Sem permissão para enviar este arquivo.')
    }
    throw new Error(msg)
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  if (!data?.publicUrl) {
    throw new Error('Upload concluído mas não foi possível resolver a URL pública.')
  }
  return { publicUrl: data.publicUrl, path }
}
