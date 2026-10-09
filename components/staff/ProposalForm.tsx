'use client'

import Image from 'next/image'
import { useActionState, useState } from 'react'
import { saveProposal } from '@/app/staff/actions'
import { QUALITY_TAGS, type ProductProposal } from '@/lib/types'

const eur = (c?: number | null) => (c ? (c / 100).toFixed(2).replace('.', ',') : '')

export function ProposalForm({ p }: { p: ProductProposal | null }) {
  const [state, action, pending] = useActionState(saveProposal, null)
  const [images, setImages] = useState<string[]>(p?.images ?? [])
  const [uploading, setUploading] = useState(false)
  const [upErr, setUpErr] = useState('')
  const [urlInput, setUrlInput] = useState('')

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setUpErr('')
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/staff/upload', { method: 'POST', body: fd })
        const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
        if (!res.ok || !data.url) throw new Error(data.error || `Upload ${res.status}`)
        setImages((prev) => [...prev, data.url!])
      }
    } catch (e) {
      setUpErr((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={p?.id ?? ''} />
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="status" value={p?.status === 'review' ? 'review' : 'draft'} />

      <section className="card space-y-4 p-5">
        <h2 className="font-medium">Osnovno</h2>
        <label className="block"><span className="label">Naziv (HR) *</span><input name="nameHr" defaultValue={p?.nameHr} required className="input" /></label>
        <label className="block"><span className="label">Naziv (EN)</span><input name="nameEn" defaultValue={p?.nameEn} className="input" /></label>
        <label className="block"><span className="label">Kratki opis (HR)</span><textarea name="shortHr" rows={2} defaultValue={p?.shortHr} className="input" /></label>
        <label className="block"><span className="label">Kratki opis (EN)</span><textarea name="shortEn" rows={2} defaultValue={p?.shortEn} className="input" /></label>
        <label className="block"><span className="label">Opis (HR)</span><textarea name="descHr" rows={5} defaultValue={p?.descHr} className="input" /></label>
        <label className="block"><span className="label">Opis (EN)</span><textarea name="descEn" rows={5} defaultValue={p?.descEn} className="input" /></label>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-medium">Slike</h2>
        <div className="flex flex-wrap gap-3">
          {images.map((src) => (
            <div key={src} className="relative size-24 overflow-hidden rounded border border-line">
              <Image src={src} alt="" fill sizes="96px" className="object-cover" unoptimized={src.startsWith('http') && !src.includes('vercel-storage')} />
              <button type="button" className="absolute inset-x-0 bottom-0 bg-black/70 text-xs" onClick={() => setImages((a) => a.filter((x) => x !== src))}>Ukloni</button>
            </div>
          ))}
          <label className="grid size-24 cursor-pointer place-items-center border border-dashed border-line text-xs text-mute">
            {uploading ? '…' : '+ Upload'}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
          </label>
        </div>
        <div className="flex gap-2">
          <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="URL slike dobavljača" className="input flex-1" />
          <button type="button" className="btn-ghost btn-sm" onClick={() => { if (urlInput.trim()) { setImages((a) => [...a, urlInput.trim()]); setUrlInput('') } }}>Dodaj URL</button>
        </div>
        {upErr && <p className="text-sm text-red-400">{upErr}</p>}
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <h2 className="font-medium md:col-span-2">Dobavljač i logistika</h2>
        <label className="block md:col-span-2"><span className="label">Link dobavljača</span><input name="supplierUrl" type="url" defaultValue={p?.supplierUrl} className="input" /></label>
        <label className="block"><span className="label">Nabavna cijena (€)</span><input name="cost" defaultValue={eur(p?.costCents)} className="input" inputMode="decimal" /></label>
        <label className="block"><span className="label">Težina / dimenzije</span><input name="weightDims" defaultValue={p?.weightDims} className="input" /></label>
        <label className="block"><span className="label">Procijenjena dostava (HR)</span><input name="estDeliveryHr" defaultValue={p?.estDeliveryHr} className="input" /></label>
        <label className="block"><span className="label">Procijenjena dostava (EN)</span><input name="estDeliveryEn" defaultValue={p?.estDeliveryEn} className="input" /></label>
        <label className="block md:col-span-2"><span className="label">Veličine (jedan red = HR | EN | opcija dobavljača)</span>
          <textarea name="variants" rows={3} className="input" defaultValue={(p?.variants ?? []).map((v) => [v.hr, v.en, v.sup].filter(Boolean).join(' | ')).join('\n')} />
        </label>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-medium">GPSR i materijal</h2>
        <label className="block"><span className="label">Materijal (HR)</span><input name="materialHr" defaultValue={p?.materialHr} className="input" /></label>
        <label className="block"><span className="label">Materijal (EN)</span><input name="materialEn" defaultValue={p?.materialEn} className="input" /></label>
        <label className="block"><span className="label">Proizvođač</span><textarea name="manufacturer" rows={3} defaultValue={p?.manufacturer} className="input" /></label>
        <label className="block"><span className="label">Odgovorna osoba u EU</span><textarea name="euResponsible" rows={3} defaultValue={p?.euResponsible} className="input" /></label>
        <label className="block"><span className="label">Sigurnost (HR)</span><textarea name="safetyHr" rows={3} defaultValue={p?.safetyHr} className="input" /></label>
        <label className="block"><span className="label">Sigurnost (EN)</span><textarea name="safetyEn" rows={3} defaultValue={p?.safetyEn} className="input" /></label>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-medium">Oznake kvalitete</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          {QUALITY_TAGS.map((tag) => (
            <label key={tag} className="flex items-center gap-2">
              <input type="checkbox" name="qualityTags" value={tag} defaultChecked={p?.qualityTags?.includes(tag)} className="size-4 accent-[#d08a2e]" />
              {tag}
            </label>
          ))}
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-medium">Bilješke i izvori</h2>
        <label className="block"><span className="label">Bilješke za provjeru</span><textarea name="notes" rows={4} defaultValue={p?.notes} className="input" /></label>
        <label className="block"><span className="label">Izvori / linkovi</span><textarea name="sources" rows={3} defaultValue={p?.sources} className="input" /></label>
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn" disabled={pending || uploading}>{pending ? '…' : 'Spremi skicu'}</button>
        <button type="submit" name="submitReview" value="on" className="btn-ghost" disabled={pending || uploading}>Pošalji na pregled</button>
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        {state?.ok && <p className="text-sm text-emerald-400">{state.ok}</p>}
      </div>
    </form>
  )
}
