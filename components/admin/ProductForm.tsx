'use client'
import Image from 'next/image'
import { useActionState, useCallback, useEffect, useRef, useState } from 'react'
import { saveProduct, translateToEn } from '@/app/admin/actions'
import type { Product } from '@/lib/types'

// Smanji fotografiju u pregledniku (najviše 2000 px) da upload ostane ispod Vercelovog limita
async function shrink(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * scale)
    c.height = Math.round(bmp.height * scale)
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
    const type = file.type === 'image/png' ? 'image/webp' : 'image/jpeg'
    const out = await new Promise<Blob | null>((r) => c.toBlob(r, type, 0.88))
    if (!out || out.type !== type || (out.size >= file.size && scale === 1)) return file
    return new File([out], file.name.replace(/\.[^.]+$/, type === 'image/webp' ? '.webp' : '.jpg'), { type })
  } catch {
    return file
  }
}

const eur = (c?: number | null) => (c ? (c / 100).toFixed(2).replace('.', ',') : '')

function In({ label, name, defaultValue, hint, ...rest }: { label: string; name: string; defaultValue?: string | number | null; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input name={name} defaultValue={defaultValue ?? ''} className="input" {...rest} />
      {hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}
    </label>
  )
}
function Ta({ label, name, defaultValue, rows = 4, hint }: { label: string; name: string; defaultValue?: string; rows?: number; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea name={name} defaultValue={defaultValue ?? ''} rows={rows} className="input" />
      {hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}
    </label>
  )
}

// Par polja HR/EN: engleski se prevodi automatski dok pišete hrvatski.
// Čim engleski uredite ručno, više se ne dira (hrvatski se nikad ne mijenja).
function Pair({ label, base, hr: hr0, en: en0, rows, required, placeholder }: {
  label: string; base: string; hr?: string; en?: string; rows?: number; required?: boolean; placeholder?: string
}) {
  const [hr, setHr] = useState(hr0 ?? '')
  const [en, setEn] = useState(en0 ?? '')
  const [auto, setAuto] = useState(!(en0 ?? '').trim())
  const [status, setStatus] = useState<'idle' | 'busy' | 'error' | 'off'>('idle')
  const [err, setErr] = useState('')
  const req = useRef(0)
  const translate = useCallback(async (text: string) => {
    const id = ++req.current
    if (!text.trim()) { setEn(''); setStatus('idle'); return }
    setStatus('busy')
    const r = await translateToEn(text)
    if (id !== req.current) return
    if (r.ok) { setEn(r.text); setStatus('idle') }
    else if (r.disabled) { setAuto(false); setStatus('off') }
    else { setStatus('error'); setErr(r.error) }
  }, [])
  useEffect(() => {
    if (!auto) return
    const t = setTimeout(() => translate(hr), 900)
    return () => clearTimeout(t)
  }, [hr, auto, translate])
  const field = (name: string, value: string, onChange: (v: string) => void, req?: boolean, ph?: string) =>
    rows ? (
      <textarea name={name} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} required={req} placeholder={ph} className="input" />
    ) : (
      <input name={name} value={value} onChange={(e) => onChange(e.target.value)} required={req} placeholder={ph} className="input" />
    )
  return (
    <>
      <label className="block">
        <span className="label">{label} (HR){required && ' *'}</span>
        {field(`${base}Hr`, hr, setHr, required, placeholder)}
      </label>
      <label className="block">
        <span className="label flex items-center justify-between gap-2">
          <span>{label} (EN)</span>
          <span className={`normal-case tracking-normal ${status === 'error' ? 'text-red-400' : 'text-mute'}`}>
            {status === 'busy' ? 'Prevodim…' : status === 'error' ? 'Greška prijevoda' : status === 'off' ? 'Prijevod isključen' : auto ? 'Automatski' : (
              <button type="button" onClick={() => { setAuto(true); translate(hr) }} className="link">↻ Prevedi s HR</button>
            )}
          </span>
        </span>
        {field(`${base}En`, en, (v) => { setEn(v); setAuto(false); req.current++ })}
        {status === 'error' && <span className="mt-1 block text-xs text-red-400">{err}</span>}
      </label>
    </>
  )
}

export function ProductForm({ p }: { p: Product | null }) {
  const [state, action, pending] = useActionState(saveProduct, null)
  const [images, setImages] = useState<string[]>(p?.images ?? [])
  const [uploading, setUploading] = useState(false)
  const [upErr, setUpErr] = useState('')

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setUpErr('')
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', await shrink(file))
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
        const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
        if (!res.ok || !data.url) throw new Error(data.error || `Upload nije uspio (${res.status})`)
        setImages((prev) => [...prev, data.url!])
      }
    } catch (e) {
      setUpErr((e as Error).message)
    } finally {
      setUploading(false)
    }
  }
  const move = (i: number, d: number) => setImages((prev) => {
    const a = [...prev]; const j = i + d
    if (j < 0 || j >= a.length) return a
    ;[a[i], a[j]] = [a[j], a[i]]; return a
  })

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="id" value={p?.id ?? ''} />
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      <section className="card space-y-4 p-5">
        <h2 className="font-medium">Slike</h2>
        <div className="flex flex-wrap gap-3">
          {images.map((src, i) => (
            <div key={src} className="group relative size-28 overflow-hidden rounded-sm border border-line bg-ink-3">
              <Image src={src} alt="" fill sizes="112px" className="object-cover" />
              {i === 0 && <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-[10px]">Glavna</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/70 p-1 text-xs opacity-0 transition group-hover:opacity-100">
                <button type="button" onClick={() => move(i, -1)} className="px-1">←</button>
                <button type="button" onClick={() => setImages((a) => a.filter((x) => x !== src))} className="px-1 text-red-300">✕</button>
                <button type="button" onClick={() => move(i, 1)} className="px-1">→</button>
              </div>
            </div>
          ))}
          <label className="grid size-28 cursor-pointer place-items-center rounded-sm border border-dashed border-line text-center text-xs text-mute hover:border-bone/50 hover:text-bone">
            {uploading ? 'Učitavam…' : '+ Dodaj slike'}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} disabled={uploading} />
          </label>
        </div>
        {upErr && <p className="text-sm text-red-400">{upErr}</p>}
        <p className="text-xs text-mute">Preporuka: kvadratne ili 4:5 fotografije, min. 1200 px, tamna/neutralna pozadina. Prva slika je glavna.</p>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <h2 className="font-medium md:col-span-2">Osnovno</h2>
        <Pair label="Naziv" base="name" hr={p?.nameHr} en={p?.nameEn} required />
        <In label="Cijena (€) *" name="price" defaultValue={eur(p?.priceCents)} inputMode="decimal" required placeholder="14,99" />
        <In label="Stara cijena (€)" name="compare" defaultValue={eur(p?.compareCents)} inputMode="decimal" hint="Samo za sniženja – prikazuje se prekriženo uz najnižu cijenu u 30 dana." />
        <In label="Zaliha" name="stock" defaultValue={p?.stock ?? ''} inputMode="numeric" hint="Prazno = neograničeno (dropshipping)." />
        <In label="URL (slug)" name="slug" defaultValue={p?.slug} hint="Prazno = automatski iz naziva." />
        <In label="Šifra (SKU)" name="sku" defaultValue={p?.sku} />
        <In label="Redoslijed" name="sort" defaultValue={p?.sort ?? 0} inputMode="numeric" hint="Manji broj = prikazuje se prije." />
        <div className="flex flex-col justify-center gap-3 text-sm">
          <label className="flex items-center gap-3"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} className="size-4 accent-[#d08a2e]" /> Vidljiv na stranici</label>
          <label className="flex items-center gap-3"><input type="checkbox" name="featured" defaultChecked={p?.featured ?? false} className="size-4 accent-[#d08a2e]" /> Istaknut na naslovnici</label>
        </div>
        <div className="md:col-span-2">
          <Ta label="Dostupne veličine" name="variants" rows={3} defaultValue={(p?.variants ?? []).map((v) => `${v.hr} | ${v.en}`).join('\n')} hint="Jedna po retku, format: HR naziv | EN naziv, npr. BIC J6 (standardni) | BIC J6 (regular). Kupac bira veličinu na stranici proizvoda. Prazno = bez izbora." />
        </div>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <h2 className="font-medium md:col-span-2">Opis</h2>
        <p className="-mt-2 text-xs text-mute md:col-span-2">Engleski se popunjava sam dok pišete hrvatski. Ako engleski uredite ručno, više se ne mijenja (gumb „Prevedi s HR” ga vraća na automatski).</p>
        <Pair label="Kratki opis" base="short" hr={p?.shortHr} en={p?.shortEn} rows={2} />
        <Pair label="Opis" base="desc" hr={p?.descHr} en={p?.descEn} rows={6} />
        <Pair label="Materijal" base="material" hr={p?.materialHr} en={p?.materialEn} placeholder="Aluminij" />
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="font-medium">Sigurnost proizvoda (GPSR)</h2>
          <p className="mt-1 text-xs text-mute">Uredba (EU) 2023/988 traži da na stranici proizvoda budu podaci o proizvođaču, a za proizvođače izvan EU i o odgovornoj osobi u EU. Traži ih od dobavljača.</p>
        </div>
        <Ta label="Proizvođač (naziv, adresa, e-mail)" name="manufacturer" rows={3} defaultValue={p?.manufacturer} />
        <Ta label="Odgovorna osoba u EU (naziv, adresa, e-mail)" name="euResponsible" rows={3} defaultValue={p?.euResponsible} />
        <Pair label="Upozorenja" base="safety" hr={p?.safetyHr} en={p?.safetyEn} rows={3} />
      </section>

      <div className="sticky bottom-4 flex items-center gap-4 rounded-sm border border-line bg-ink/90 p-4 backdrop-blur">
        <button className="btn" disabled={pending || uploading}>{pending ? 'Spremam…' : 'Spremi proizvod'}</button>
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        {state?.ok && <p className="text-sm text-emerald-400">{state.ok}</p>}
      </div>
    </form>
  )
}
