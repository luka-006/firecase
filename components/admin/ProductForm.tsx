'use client'
import Image from 'next/image'
import { useActionState, useState } from 'react'
import { upload } from '@vercel/blob/client'
import { saveProduct } from '@/app/admin/actions'
import type { Product } from '@/lib/types'

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
        const blob = await upload(`products/${file.name}`, file, { access: 'public', handleUploadUrl: '/api/admin/upload' })
        setImages((prev) => [...prev, blob.url])
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
            <div key={src} className="group relative size-28 overflow-hidden rounded-xl border border-line bg-ink-3">
              <Image src={src} alt="" fill sizes="112px" className="object-cover" />
              {i === 0 && <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-[10px]">Glavna</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/70 p-1 text-xs opacity-0 transition group-hover:opacity-100">
                <button type="button" onClick={() => move(i, -1)} className="px-1">←</button>
                <button type="button" onClick={() => setImages((a) => a.filter((x) => x !== src))} className="px-1 text-red-300">✕</button>
                <button type="button" onClick={() => move(i, 1)} className="px-1">→</button>
              </div>
            </div>
          ))}
          <label className="grid size-28 cursor-pointer place-items-center rounded-xl border border-dashed border-line text-center text-xs text-mute hover:border-bone/50 hover:text-bone">
            {uploading ? 'Učitavam…' : '+ Dodaj slike'}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} disabled={uploading} />
          </label>
        </div>
        {upErr && <p className="text-sm text-red-400">{upErr}</p>}
        <p className="text-xs text-mute">Preporuka: kvadratne ili 4:5 fotografije, min. 1200 px, tamna/neutralna pozadina. Prva slika je glavna.</p>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <h2 className="font-medium md:col-span-2">Osnovno</h2>
        <In label="Naziv (HR) *" name="nameHr" defaultValue={p?.nameHr} required />
        <In label="Naziv (EN)" name="nameEn" defaultValue={p?.nameEn} />
        <In label="Cijena (€) *" name="price" defaultValue={eur(p?.priceCents)} inputMode="decimal" required placeholder="14,99" />
        <In label="Stara cijena (€)" name="compare" defaultValue={eur(p?.compareCents)} inputMode="decimal" hint="Samo za sniženja – prikazuje se prekriženo uz najnižu cijenu u 30 dana." />
        <In label="Odgovara modelu" name="fits" defaultValue={p?.fits} placeholder="BIC J6" hint="Koristi se za filtere u trgovini (npr. BIC J6, BIC J3)." />
        <In label="Zaliha" name="stock" defaultValue={p?.stock ?? ''} inputMode="numeric" hint="Prazno = neograničeno (dropshipping)." />
        <In label="URL (slug)" name="slug" defaultValue={p?.slug} hint="Prazno = automatski iz naziva." />
        <In label="Šifra (SKU)" name="sku" defaultValue={p?.sku} />
        <In label="Redoslijed" name="sort" defaultValue={p?.sort ?? 0} inputMode="numeric" hint="Manji broj = prikazuje se prije." />
        <div className="flex flex-col justify-center gap-3 text-sm">
          <label className="flex items-center gap-3"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} className="size-4 accent-[#d08a2e]" /> Vidljiv na stranici</label>
          <label className="flex items-center gap-3"><input type="checkbox" name="featured" defaultChecked={p?.featured ?? false} className="size-4 accent-[#d08a2e]" /> Istaknut na naslovnici</label>
        </div>
        <div className="md:col-span-2">
          <Ta label="Varijante (boje / izvedbe)" name="variants" rows={3} defaultValue={(p?.variants ?? []).map((v) => `${v.hr} | ${v.en}`).join('\n')} hint="Jedna po retku, format: Crna | Black. Prazno = bez varijanti." />
        </div>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <h2 className="font-medium md:col-span-2">Opis</h2>
        <Ta label="Kratki opis (HR)" name="shortHr" rows={2} defaultValue={p?.shortHr} />
        <Ta label="Kratki opis (EN)" name="shortEn" rows={2} defaultValue={p?.shortEn} />
        <Ta label="Opis (HR)" name="descHr" rows={6} defaultValue={p?.descHr} />
        <Ta label="Opis (EN)" name="descEn" rows={6} defaultValue={p?.descEn} />
        <In label="Materijal (HR)" name="materialHr" defaultValue={p?.materialHr} placeholder="Aluminij" />
        <In label="Materijal (EN)" name="materialEn" defaultValue={p?.materialEn} placeholder="Aluminium" />
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="font-medium">Sigurnost proizvoda (GPSR)</h2>
          <p className="mt-1 text-xs text-mute">Uredba (EU) 2023/988 traži da na stranici proizvoda budu podaci o proizvođaču, a za proizvođače izvan EU i o odgovornoj osobi u EU. Traži ih od dobavljača.</p>
        </div>
        <Ta label="Proizvođač (naziv, adresa, e-mail)" name="manufacturer" rows={3} defaultValue={p?.manufacturer} />
        <Ta label="Odgovorna osoba u EU (naziv, adresa, e-mail)" name="euResponsible" rows={3} defaultValue={p?.euResponsible} />
        <Ta label="Upozorenja (HR)" name="safetyHr" rows={3} defaultValue={p?.safetyHr} />
        <Ta label="Upozorenja (EN)" name="safetyEn" rows={3} defaultValue={p?.safetyEn} />
      </section>

      <div className="sticky bottom-4 flex items-center gap-4 rounded-2xl border border-line bg-ink/90 p-4 backdrop-blur">
        <button className="btn" disabled={pending || uploading}>{pending ? 'Spremam…' : 'Spremi proizvod'}</button>
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        {state?.ok && <p className="text-sm text-emerald-400">{state.ok}</p>}
      </div>
    </form>
  )
}
