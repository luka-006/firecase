/**
 * Sends the product and set proposals kept in staff/ to the shop's staff API.
 *
 *   npx tsx scripts/staff-sync.ts --dry-run   checks every file, sends nothing
 *   npx tsx scripts/staff-sync.ts             sends new proposals
 *
 * Env: STAFF_API_TOKEN (needed to send), SITE_URL (default https://firecase.net).
 * Each proposal is tagged with its file path, so a file that was already sent is skipped.
 * Files whose name starts with "_" are examples and are never sent.
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { proposalCreateSchema } from '../lib/staff/proposal-schema'
import { setProposalCreateSchema } from '../lib/staff/set-proposal-schema'

type Kind = 'product' | 'set'
type Job = { kind: Kind; file: string; rel: string; marker: string; body: Record<string, unknown> }

const ROOT = path.resolve(import.meta.dirname, '..')
const DRY = process.argv.includes('--dry-run')
const SITE = (process.env.SITE_URL || 'https://firecase.net').replace(/\/$/, '')
const TOKEN = process.env.STAFF_API_TOKEN || ''

const DIRS: Record<Kind, string> = { product: 'staff/proposals', set: 'staff/sets' }
const ENDPOINT: Record<Kind, string> = { product: '/api/staff/proposals', set: '/api/staff/set-proposals' }
// field on the proposal that carries the "already sent" tag
const TAG_FIELD: Record<Kind, 'sources' | 'notes'> = { product: 'sources', set: 'notes' }

const IMAGE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
}
const MAX_IMAGE = 4 * 1024 * 1024

const markerFor = (rel: string) => `[github:${rel}]`

async function listJson(dir: string) {
  try {
    return (await readdir(path.join(ROOT, dir)))
      .filter((name) => name.endsWith('.json') && !name.startsWith('_'))
      .sort()
  } catch {
    return []
  }
}

async function loadJobs(): Promise<Job[]> {
  const jobs: Job[] = []
  for (const kind of ['product', 'set'] as const) {
    for (const name of await listJson(DIRS[kind])) {
      const rel = `${DIRS[kind]}/${name}`
      const file = path.join(ROOT, rel)
      let body: unknown
      try {
        body = JSON.parse(await readFile(file, 'utf8'))
      } catch (e) {
        throw new Error(`${rel}: neispravan JSON (${(e as Error).message})`)
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error(`${rel}: očekujem JSON objekt`)
      jobs.push({ kind, file, rel, marker: markerFor(rel), body: body as Record<string, unknown> })
    }
  }
  return jobs
}

function headers(extra: Record<string, string> = {}) {
  return { authorization: `Bearer ${TOKEN}`, ...extra }
}

async function api(pathname: string, init: RequestInit = {}) {
  const res = await fetch(SITE + pathname, init)
  const text = await res.text()
  let data: unknown = null
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${pathname} ${res.status}: ${typeof data === 'string' ? data.slice(0, 300) : JSON.stringify(data)}`)
  return data as Record<string, unknown>
}

async function sentMarkers(kind: Kind) {
  const data = await api(ENDPOINT[kind], { headers: headers() })
  const rows = (data.proposals as Record<string, unknown>[] | undefined) ?? []
  return rows.map((row) => String(row[TAG_FIELD[kind]] ?? ''))
}

/** Local image paths are relative to the JSON file. Returns a URL for every image. */
async function resolveImages(job: Job) {
  const list = Array.isArray(job.body.images) ? (job.body.images as unknown[]) : []
  const out: string[] = []
  for (const entry of list) {
    if (typeof entry !== 'string') throw new Error(`${job.rel}: slika mora biti tekst (URL ili putanja)`)
    if (/^https?:\/\//i.test(entry)) {
      out.push(entry)
      continue
    }
    const local = path.resolve(path.dirname(job.file), entry)
    if (!local.startsWith(path.join(ROOT, 'staff') + path.sep)) throw new Error(`${job.rel}: slika ${entry} mora biti unutar staff/`)
    const type = IMAGE_TYPES[path.extname(local).toLowerCase()]
    if (!type) throw new Error(`${job.rel}: ${entry} nije JPG, PNG, WebP ni AVIF`)
    let size: number
    try {
      size = (await stat(local)).size
    } catch {
      throw new Error(`${job.rel}: ne postoji slika ${entry}`)
    }
    if (size > MAX_IMAGE) throw new Error(`${job.rel}: ${entry} je veća od 4 MB`)
    if (DRY) {
      out.push(`https://example.invalid/${encodeURIComponent(path.basename(local))}`)
      continue
    }
    const form = new FormData()
    form.append('file', new Blob([await readFile(local)], { type }), path.basename(local))
    try {
      const res = await api('/api/staff/upload', { method: 'POST', headers: headers(), body: form })
      out.push(String(res.url))
    } catch (e) {
      throw new Error(`${job.rel}: upload ${entry} nije uspio (${(e as Error).message})`)
    }
  }
  return out
}

function payload(job: Job, images: string[]) {
  const field = TAG_FIELD[job.kind]
  const prev = typeof job.body[field] === 'string' ? (job.body[field] as string).trim() : ''
  return {
    status: 'review',
    ...job.body,
    images,
    [field]: prev ? `${prev}\n${job.marker}` : job.marker,
  }
}

function validate(job: Job, body: Record<string, unknown>) {
  const schema = job.kind === 'product' ? proposalCreateSchema : setProposalCreateSchema
  const parsed = schema.safeParse(body)
  if (parsed.success) return
  const issues = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
  throw new Error(`${job.rel}: ${issues}`)
}

async function main() {
  const jobs = await loadJobs()
  if (!jobs.length) {
    console.log('Nema prijedloga u staff/.')
    return
  }
  if (!DRY && !TOKEN) throw new Error('STAFF_API_TOKEN nije postavljen.')

  const already: Record<Kind, string[]> = { product: [], set: [] }
  if (!DRY) {
    for (const kind of ['product', 'set'] as const) {
      if (jobs.some((j) => j.kind === kind)) already[kind] = await sentMarkers(kind)
    }
  }

  let failed = 0
  for (const job of jobs) {
    try {
      if (already[job.kind].some((tag) => tag.includes(job.marker))) {
        console.log(`preskačem   ${job.rel} (već poslano)`)
        continue
      }
      const images = await resolveImages(job)
      const body = payload(job, images)
      validate(job, body)
      if (DRY) {
        console.log(`ispravno    ${job.rel}`)
        continue
      }
      const res = await api(ENDPOINT[job.kind], {
        method: 'POST',
        headers: headers({ 'content-type': 'application/json' }),
        body: JSON.stringify(body),
      })
      const proposal = res.proposal as { id?: number; status?: string } | undefined
      console.log(`poslano     ${job.rel} -> prijedlog #${proposal?.id} (${proposal?.status})`)
    } catch (e) {
      failed++
      console.error(`greška      ${(e as Error).message}`)
    }
  }
  if (failed) process.exit(1)
}

main().catch((e) => {
  console.error((e as Error).message)
  process.exit(1)
})
