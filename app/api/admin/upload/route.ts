import { put } from '@vercel/blob'
import { isAdmin } from '@/lib/auth'

export const runtime = 'nodejs'

// Upload slike preko servera: radi i sa BLOB_READ_WRITE_TOKEN i s novijim spajanjem (BLOB_STORE_ID + OIDC)
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }
const MAX = 4 * 1024 * 1024 // Vercel funkcije primaju najviše ~4,5 MB

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: 'Niste prijavljeni kao admin.' }, { status: 401 })
  let file: FormDataEntryValue | null = null
  try {
    file = (await req.formData()).get('file')
  } catch {}
  if (!file || typeof file === 'string') return Response.json({ error: 'Datoteka nije poslana.' }, { status: 400 })
  const ext = TYPES[file.type]
  if (!ext) return Response.json({ error: 'Dozvoljeni formati: JPG, PNG, WebP, AVIF.' }, { status: 400 })
  if (file.size > MAX) return Response.json({ error: 'Slika je veća od 4 MB.' }, { status: 413 })
  const base = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'slika'
  try {
    const blob = await put(`products/${base}.${ext}`, file, { access: 'public', addRandomSuffix: true, contentType: file.type })
    return Response.json({ url: blob.url })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
