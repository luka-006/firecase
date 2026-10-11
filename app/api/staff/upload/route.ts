import { put } from '@vercel/blob'
import { isStaff, staffApiAuthorized } from '@/lib/auth'

export const runtime = 'nodejs'

const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }
const MAX = 4 * 1024 * 1024

async function authorized(req: Request) {
  if (await isStaff()) return true
  return staffApiAuthorized(req)
}

export async function POST(req: Request) {
  if (!(await authorized(req))) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  let file: FormDataEntryValue | null = null
  try {
    file = (await req.formData()).get('file')
  } catch {}
  if (!file || typeof file === 'string') return Response.json({ error: 'Datoteka nije poslana.' }, { status: 400 })
  const ext = TYPES[file.type]
  if (!ext) return Response.json({ error: 'Dozvoljeni formati: JPG, PNG, WebP, AVIF.' }, { status: 400 })
  if (file.size > MAX) return Response.json({ error: 'Slika je veća od 4 MB.' }, { status: 413 })
  const base = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'slika'
  try {
    const blob = await put(`proposals/${base}.${ext}`, file, { access: 'public', addRandomSuffix: true, contentType: file.type })
    return Response.json({ url: blob.url })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
