'use client'
import Image from 'next/image'
import { useActionState, useCallback, useEffect, useRef, useState } from 'react'
import { lookupSupplierVariant, saveProduct, translateToEn } from '@/app/admin/actions'
import { SupplierLink } from '@/components/SupplierLink'
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

function SupplierField({ defaultValue }: { defaultValue?: string }) {
  const [url, setUrl] = useState(defaultValue ?? '')
  return (
    <label className="block">
      <span className="label">Link dobavljača</span>
      <input name="supplierUrl" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className="input" />
      {url.trim() ? <span className="mt-2 block text-sm"><SupplierLink url={url} /></span> : null}
    </label>
  )
}
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

// Sklopiva sekcija obrasca
function Section({ title, open, children, grid = true }: { title: string; open?: boolean; children: React.ReactNode; grid?: boolean }) {
  return (
    <details open={open} className="card group/s">
      <summary className="flex items-center justify-between gap-4 px-5 py-4 font-medium">
        {title}
        <span className="font-mono text-sm text-mute transition-transform duration-300 group-open/s:rotate-45">+</span>
      </summary>
      <div className={`border-t border-line p-5 ${grid ? 'grid gap-4 md:grid-cols-2' : 'space-y-4'}`}>{children}</div>
    </details>
  )
}

function SupplierProbe({ vid, sku }: { vid: string; sku: string }) {
  const [pending, setPending] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState(false)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="btn-ghost btn-sm" disabled={pending || (!vid.trim() && !sku.trim())} onClick={async () => {
        setPending(true)
        setErr(false)
        const result = await lookupSupplierVariant(vid, sku)
        setPending(false)
        if (!result.ok) { setErr(true); setMsg(result.error); return }
        setMsg(`${result.priceUsd} · zaliha ${result.stock}`)
      }}>{pending ? '…' : 'Provjeri u CJ'}</button>
      {msg ? <span className={`text-sm ${err ? 'text-red-300' : 'text-mute'}`}>{msg}</span> : null}
    </div>
  )
}

export function ProductForm({ p, proposalId, initial }: { p: Product | null; proposalId?: number | null; initial?: Partial<Product> }) {
  const base = p ?? (initial ? ({ ...initial, id: 0 } as Product) : null)
  const [state, action, pending] = useActionState(saveProduct, null)
  const [images, setImages] = useState<string[]>(base?.images ?? [])
  const [variantText, setVariantText] = useState((base?.variants ?? []).map((v) => [v.hr, v.en, v.sup].filter(Boolean).join(' | ')).join('\n'))
  const [cjPid, setCjPid] = useState(base?.cjPid ?? '')
  const [cjVid, setCjVid] = useState(base?.cjVid ?? '')
  const [cjSku, setCjSku] = useState(base?.cjSku ?? '')
  const [cjRows, setCjRows] = useState(() => (base?.variants ?? []).map((v) => ({ pid: v.cjPid ?? '', vid: v.cjVid ?? '', sku: v.cjSku ?? '' })))
  const variantLines = variantText.split('\n').map((line) => line.trim()).filter(Boolean)
  useEffect(() => {
    setCjRows((prev) => variantLines.map((_, i) => prev[i] ?? { pid: '', vid: '', sku: '' }))
  }, [variantText]) // eslint-disable-line react-hooks/exhaustive-deps -- rows follow the variant line count
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
      <input type="hidden" name="id" value={p?.id ? String(p.id) : ''} />
      {proposalId ? <input type="hidden" name="proposalId" value={proposalId} /> : null}
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="cjPid" value={cjPid} />
      <input type="hidden" name="cjVid" value={cjVid} />
      <input type="hidden" name="cjSku" value={cjSku} />
      <input type="hidden" name="cjVariants" value={JSON.stringify(variantLines.map((_, i) => cjRows[i] ?? { pid: '', vid: '', sku: '' }))} />

      <Section title="Osnovno" open>
        <Pair label="Naziv" base="name" hr={base?.nameHr} en={base?.nameEn} required />
        <In label="Cijena (€) *" name="price" defaultValue={base?.priceCents ? eur(base.priceCents) : ''} inputMode="decimal" required={!!(base?.active ?? false)} placeholder="14,99" hint={!base?.priceCents ? 'Obavezno prije objave (Vidljiv na stranici).' : undefined} />
        <In label="Stara cijena (€)" name="compare" defaultValue={eur(base?.compareCents)} inputMode="decimal" hint="Samo za sniženja – prikazuje se prekriženo uz najnižu cijenu u 30 dana." />
        <label className="block md:col-span-2">
          <span className="label">Dostupne veličine</span>
          <textarea name="variants" rows={3} value={variantText} onChange={(e) => setVariantText(e.target.value)} className="input" />
          <span className="mt-1 block text-xs text-mute">Jedna po retku: HR naziv | EN naziv | opcija dobavljača (neobavezno). Npr. BIC J6 (standardni) | BIC J6 (regular) | Black J6. Prazno = bez izbora.</span>
        </label>
        <div className="flex flex-wrap gap-6 text-sm md:col-span-2">
          <label className="flex items-center gap-3"><input type="checkbox" name="active" defaultChecked={base?.active ?? false} className="size-4 accent-[#d08a2e]" /> Vidljiv na stranici</label>
          <label className="flex items-center gap-3"><input type="checkbox" name="featured" defaultChecked={base?.featured ?? false} className="size-4 accent-[#d08a2e]" /> Istaknut na naslovnici</label>
        </div>
      </Section>

      <Section title="Slike" open grid={false}>
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
      </Section>

      <Section title="Opis" open>
        <p className="-mt-2 text-xs text-mute md:col-span-2">Engleski se popunjava sam dok pišete hrvatski. Ako engleski uredite ručno, više se ne mijenja (gumb „Prevedi s HR” ga vraća na automatski).</p>
        <Pair label="Kratki opis" base="short" hr={base?.shortHr} en={base?.shortEn} rows={2} />
        <Pair label="Opis" base="desc" hr={base?.descHr} en={base?.descEn} rows={6} />
        <Pair label="Materijal" base="material" hr={base?.materialHr} en={base?.materialEn} placeholder="Aluminij" />
      </Section>

      <Section title="Dobavljač" open>
        <div className="md:col-span-2">
          <SupplierField defaultValue={base?.supplierUrl} />
        </div>
        <In label="Nabavna cijena po komadu (€)" name="cost" defaultValue={eur(base?.costCents)} inputMode="decimal" placeholder="4,20" />
        <label className="block md:col-span-2">
          <span className="label">PID</span>
          <input value={cjPid} onChange={(e) => setCjPid(e.target.value)} className="input" autoComplete="off" />
        </label>
        {variantLines.length === 0 ? (
          <div className="space-y-3 md:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="label">VID</span><input value={cjVid} onChange={(e) => setCjVid(e.target.value)} className="input" autoComplete="off" /></label>
              <label className="block"><span className="label">SKU</span><input value={cjSku} onChange={(e) => setCjSku(e.target.value)} className="input" autoComplete="off" /></label>
            </div>
            <SupplierProbe vid={cjVid} sku={cjSku} />
          </div>
        ) : (
          <div className="space-y-4 md:col-span-2">
            {variantLines.map((line, i) => {
              const row = cjRows[i] ?? { pid: '', vid: '', sku: '' }
              const set = (key: 'pid' | 'vid' | 'sku', value: string) => setCjRows((prev) => {
                const next = variantLines.map((_, idx) => prev[idx] ?? { pid: '', vid: '', sku: '' })
                next[i] = { ...next[i], [key]: value }
                return next
              })
              return (
                <div key={i} className="space-y-2 border border-line p-3">
                  <p className="text-sm">{line.split('|')[0]?.trim()}</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block"><span className="label">PID</span><input value={row.pid} onChange={(e) => set('pid', e.target.value)} className="input" autoComplete="off" /></label>
                    <label className="block"><span className="label">VID</span><input value={row.vid} onChange={(e) => set('vid', e.target.value)} className="input" autoComplete="off" /></label>
                    <label className="block"><span className="label">SKU</span><input value={row.sku} onChange={(e) => set('sku', e.target.value)} className="input" autoComplete="off" /></label>
                  </div>
                  <SupplierProbe vid={row.vid} sku={row.sku} />
                </div>
              )
            })}
          </div>
        )}
      </Section>

      <Section title="Napredno" grid>
        <In label="Zaliha" name="stock" defaultValue={base?.stock ?? ''} inputMode="numeric" hint="Prazno = neograničeno (dropshipping)." />
        <In label="Redoslijed" name="sort" defaultValue={base?.sort ?? 0} inputMode="numeric" hint="Manji broj = prikazuje se prije." />
        <In label="URL (slug)" name="slug" defaultValue={base?.slug} hint="Prazno = automatski iz naziva." />
        <In label="Šifra (SKU)" name="sku" defaultValue={base?.sku} />
      </Section>

      <Section title="Sigurnost proizvoda (GPSR)">
        <div className="md:col-span-2">
          <p className="mt-1 text-xs text-mute">Uredba (EU) 2023/988 traži da na stranici proizvoda budu podaci o proizvođaču, a za proizvođače izvan EU i o odgovornoj osobi u EU. Traži ih od dobavljača.</p>
        </div>
        <Ta label="Proizvođač (naziv, adresa, e-mail)" name="manufacturer" rows={3} defaultValue={base?.manufacturer} />
        <Ta label="Odgovorna osoba u EU (naziv, adresa, e-mail)" name="euResponsible" rows={3} defaultValue={base?.euResponsible} />
        <Pair label="Upozorenja" base="safety" hr={base?.safetyHr} en={base?.safetyEn} rows={3} />
      </Section>

      <div className="sticky bottom-4 flex items-center gap-4 rounded-sm border border-line bg-ink/90 p-4 backdrop-blur">
        <button className="btn" disabled={pending || uploading}>{pending ? 'Spremam…' : 'Spremi proizvod'}</button>
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        {state?.ok && <p className="text-sm text-emerald-400">{state.ok}</p>}
      </div>
    </form>
  )
}
