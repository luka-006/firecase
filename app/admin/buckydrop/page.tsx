import { requireAdmin } from '@/lib/auth'
import { buckydropBalance, buckydropConfig } from '@/lib/buckydrop'
import { BuckydropProductLookup, BuckydropSearch, BuckydropShippingEstimate } from '@/components/admin/BuckydropTools'

export const dynamic = 'force-dynamic'

export default async function BuckydropPage() {
  await requireAdmin()
  const cfg = buckydropConfig()
  const balance = await buckydropBalance()
  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="h-display text-2xl">BuckyDrop</h1>
        <p className="mt-2 text-sm text-mute">Samo provjere: ovdje se ništa ne naručuje i ne plaća.</p>
      </div>

      <section className="card space-y-2 p-5 text-sm">
        <p className="label">Veza</p>
        <p>Način rada: <span className="font-mono text-flame-2">{cfg.mode === 'live' ? 'LIVE' : 'SANDBOX'}</span></p>
        {balance.ok ? (
          <p className="text-emerald-400">Spojeno. Stanje računa: <span className="font-mono">{typeof balance.data?.availableBalance === 'number' ? balance.data.availableBalance.toFixed(2) : '?'} {balance.data?.currency ?? 'CNY'}</span></p>
        ) : (
          <p className="text-red-400">{balance.error}</p>
        )}
        <p className="text-mute">Ključevi se čitaju iz Vercela (<code className="text-flame-2">BUCKYDROP_APP_CODE</code>, <code className="text-flame-2">BUCKYDROP_APP_SECRET</code>).</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-mute">Pretraga (1688 / Taobao)</h2>
        <BuckydropSearch />
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-mute">Proizvod preko BuckyDropa</h2>
        <BuckydropProductLookup />
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-mute">Poštarina do kupca</h2>
        <BuckydropShippingEstimate />
      </section>
    </div>
  )
}
