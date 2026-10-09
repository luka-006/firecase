'use server'

import crypto from 'node:crypto'
import { redirect } from 'next/navigation'
// redirect used after create proposal
import { revalidatePath } from 'next/cache'
import { clearStaffSession, isStaff, requireStaff, setStaffSession } from '@/lib/auth'
import { checkRateLimit, clearRateLimit, hitRateLimit } from '@/lib/auth/rate-limit'
import { sql } from '@/lib/db'
import { maybeAutoAcceptProposal } from '@/lib/proposals'
import type { ProductProposal, Variant } from '@/lib/types'

type State = { error?: string; ok?: string } | null
const str = (f: FormData, k: string, max = 8000) => String(f.get(k) ?? '').trim().slice(0, max)
const cents = (v: string) => {
  const n = parseFloat(v.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

export async function staffLogin(_: State, f: FormData): Promise<State> {
  const bucket = 'staff'
  const lock = await checkRateLimit('staff_login', bucket, { maxHits: 5, windowSec: 900, lockoutSec: 1800 })
  if (!lock.ok) return { error: `Previše pokušaja. Pokušajte za ${lock.retryAfterSec ?? 900} s.` }

  const expected = process.env.STAFF_PASSWORD
  const given = str(f, 'password')
  const ok = !!expected && given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  if (!ok) {
    await hitRateLimit('staff_login', bucket, { maxHits: 5, windowSec: 900, lockoutSec: 1800 })
    await new Promise((r) => setTimeout(r, 600))
    return { error: expected ? 'Pogrešna lozinka.' : 'STAFF_PASSWORD nije postavljen u Vercelu.' }
  }
  await clearRateLimit('staff_login', bucket)
  await setStaffSession()
  redirect('/staff/proposals')
}

export async function staffLogout() {
  await clearStaffSession()
  redirect('/staff/login')
}

function parseVariants(raw: string): Variant[] {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [hr, en, sup] = l.split('|').map((x) => x.trim())
      return sup ? { hr, en: en || hr, sup } : { hr, en: en || hr }
    })
}

function parseTags(f: FormData) {
  return [...f.getAll('qualityTags')].map(String).slice(0, 12)
}

function parseImages(raw: string) {
  try {
    const a = JSON.parse(raw || '[]')
    return Array.isArray(a) ? a.filter((x) => typeof x === 'string').slice(0, 20) : []
  } catch {
    return []
  }
}

export async function saveProposal(_: State, f: FormData): Promise<State> {
  await requireStaff()
  const id = Number(f.get('id')) || null
  const nameHr = str(f, 'nameHr')
  if (!nameHr) return { error: 'Naziv (HR) je obavezan.' }
  const submitReview = f.get('submitReview') === 'on'
  const status = submitReview ? 'review' : str(f, 'status') || 'draft'
  if (!['draft', 'review'].includes(status)) return { error: 'Staff može spremiti samo skicu ili poslati na pregled.' }

  const data = {
    status,
    nameHr,
    nameEn: str(f, 'nameEn'),
    shortHr: str(f, 'shortHr'),
    shortEn: str(f, 'shortEn'),
    descHr: str(f, 'descHr'),
    descEn: str(f, 'descEn'),
    images: sql.json(parseImages(str(f, 'images'))),
    variants: sql.json(parseVariants(str(f, 'variants')) as never),
    supplierUrl: str(f, 'supplierUrl'),
    costCents: str(f, 'cost') ? cents(str(f, 'cost')) : null,
    estDeliveryHr: str(f, 'estDeliveryHr'),
    estDeliveryEn: str(f, 'estDeliveryEn'),
    weightDims: str(f, 'weightDims'),
    materialHr: str(f, 'materialHr'),
    materialEn: str(f, 'materialEn'),
    manufacturer: str(f, 'manufacturer'),
    euResponsible: str(f, 'euResponsible'),
    safetyHr: str(f, 'safetyHr'),
    safetyEn: str(f, 'safetyEn'),
    qualityTags: sql.json(parseTags(f)),
    notes: str(f, 'notes', 8000),
    sources: str(f, 'sources', 8000),
  }

  let proposalId = id
  if (id) {
    const [cur] = await sql<{ status: string }[]>`select status from product_proposals where id = ${id}`
    if (!cur) return { error: 'Prijedlog ne postoji.' }
    if (['accepted', 'rejected'].includes(cur.status)) return { error: 'Prijedlog se više ne može uređivati.' }
    await sql`update product_proposals set ${sql(data)}, updated_at = now() where id = ${id}`
  } else {
    const [row] = await sql<{ id: number }[]>`insert into product_proposals ${sql(data)} returning id`
    proposalId = row.id
  }

  if (status === 'review' && proposalId) await maybeAutoAcceptProposal(proposalId)

  revalidatePath('/staff/proposals')
  if (proposalId) revalidatePath(`/staff/proposals/${proposalId}`)
  revalidatePath('/admin/prijedlozi')
  if (!id && proposalId) redirect(`/staff/proposals/${proposalId}`)
  return { ok: submitReview ? 'Poslano na pregled.' : 'Spremljeno.' }
}

export async function deleteProposal(f: FormData) {
  await requireStaff()
  const id = Number(f.get('id'))
  const [p] = await sql<{ status: string }[]>`select status from product_proposals where id = ${id}`
  if (!p || p.status === 'accepted') return
  await sql`delete from product_proposals where id = ${id} and status in ('draft', 'review', 'rejected')`
  revalidatePath('/staff/proposals')
  redirect('/staff/proposals')
}
