'use client'
import { useActionState } from 'react'
import { estimateBuckydropShipping, lookupBuckydropProduct, searchBuckydrop, type ProductState, type SearchState, type ShippingState } from '@/app/admin/buckydrop/actions'

const cny = (m?: { price?: number } | null) => (m?.price != null ? `${m.price.toFixed(2)} CNY` : '—')

export function BuckydropProductLookup() {
  const [state, action, pending] = useActionState<ProductState, FormData>(lookupBuckydropProduct, null)
  const p = state?.product
  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-col gap-3 sm:flex-row">
        <input name="link" className="input" placeholder="Link proizvoda (1688, Taobao, Alibaba, AliExpress…)" required />
        <button className="btn shrink-0" disabled={pending}>{pending ? '…' : 'Provjeri'}</button>
      </form>
      {state?.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      {p && (
        <div className="space-y-3 text-sm">
          <p className="font-medium">{p.productName || 'Bez naziva'}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-mute">
            <dt>Platforma</dt><dd className="text-bone">{p.platform || '—'}</dd>
            <dt>SPU</dt><dd className="break-all font-mono text-bone">{p.spuCode || '—'}</dd>
            <dt>Cijena</dt><dd className="text-bone">{cny(p.proPrice)}{p.price?.price != null && p.price.price !== p.proPrice?.price ? ` (bilo ${cny(p.price)})` : ''}</dd>
            <dt>Poštarina u Kini</dt><dd className="text-bone">{cny(p.freight)}</dd>
            <dt>Min. količina</dt><dd className="text-bone">{p.beginCount ?? '—'}</dd>
            <dt>Trgovina</dt><dd className="text-bone">{p.shop?.shopName || '—'}</dd>
          </dl>
          {!!p.skuList?.length && (
            <ul className="divide-y divide-line border-y border-line">
              {p.skuList.map((s, i) => (
                <li key={s.skuCode || i} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                  <span>{s.skuName || s.props?.map((x) => x.valueName).join(' / ') || '—'}</span>
                  <span className="font-mono text-xs text-mute">SKU {s.skuCode || '—'} · {cny(s.proPrice ?? s.price)} · zaliha {s.quantity ?? '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export function BuckydropShippingEstimate() {
  const [state, action, pending] = useActionState<ShippingState, FormData>(estimateBuckydropShipping, null)
  return (
    <div className="space-y-4">
      <form action={action} className="grid gap-3 sm:grid-cols-5">
        <label className="block"><span className="label">Država</span><input name="country" className="input" defaultValue="HR" maxLength={2} /></label>
        <label className="block"><span className="label">Težina paketa (g)</span><input name="grams" className="input" defaultValue="150" inputMode="numeric" /></label>
        <label className="block"><span className="label">Komada</span><input name="count" className="input" defaultValue="1" inputMode="numeric" /></label>
        <label className="block"><span className="label">Cijena komada (CNY)</span><input name="cny" className="input" defaultValue="20" inputMode="decimal" /></label>
        <button className="btn self-end" disabled={pending}>{pending ? '…' : 'Izračunaj'}</button>
      </form>
      {state?.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      {state?.channels && (state.channels.length ? (
        <ul className="divide-y divide-line border-y border-line text-sm">
          {state.channels.map((c, i) => (
            <li key={c.serviceCode || i} className={`flex flex-wrap items-baseline justify-between gap-2 py-2 ${c.available === false ? 'text-mute line-through' : ''}`}>
              <span>{c.serviceName || c.serviceCode}</span>
              <span className="font-mono text-xs">
                {c.totalPrice != null ? `${c.totalPrice.toFixed(2)} CNY` : '—'}
                {c.minTimeInTransit != null ? ` · ${c.minTimeInTransit}–${c.maxTimeInTransit ?? c.minTimeInTransit} radnih dana` : ''}
                {c.available === false && c.unavailableReason ? ` · ${c.unavailableReason}` : ''}
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-mute">Nema dostupnih linija za te podatke.</p>)}
    </div>
  )
}

export function BuckydropSearch() {
  const [state, action, pending] = useActionState<SearchState, FormData>(searchBuckydrop, null)
  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-col gap-3 sm:flex-row">
        <input name="keyword" className="input" placeholder="npr. lighter case J6 ili 打火机壳" required />
        <select name="platform" className="input sm:w-40" defaultValue="ALIBABA">
          <option value="ALIBABA">1688</option>
          <option value="TB">Taobao</option>
        </select>
        <button className="btn shrink-0" disabled={pending}>{pending ? '…' : 'Traži'}</button>
      </form>
      {state?.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      {state?.items && (state.items.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {state.items.map((it, i) => (
            <li key={it.spuCode || i} className="card flex gap-3 p-3 text-sm">
              {it.picUrl ? <img src={it.picUrl} alt="" className="size-20 shrink-0 object-cover" loading="lazy" referrerPolicy="no-referrer" /> : null}
              <div className="min-w-0">
                <p className="line-clamp-2">{it.productName || '—'}</p>
                <p className="mt-1 font-mono text-xs text-mute">{cny(it.proPrice ?? it.price)} · {it.platform || '—'}{it.shop?.shopName ? ` · ${it.shop.shopName}` : ''}</p>
                {it.productLink && <a href={it.productLink} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-flame-2 underline">Otvori</a>}
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-mute">Nema rezultata.</p>)}
    </div>
  )
}
