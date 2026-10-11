import { requireAdmin } from '@/lib/auth'
import { getSettingsFresh } from '@/lib/settings'
import { ActionForm, Field } from '@/components/Ui'
import { saveSettingsAction } from '../actions'

export const dynamic = 'force-dynamic'
const eur = (c: number) => (c / 100).toFixed(2).replace('.', ',')

export default async function SettingsPage() {
  await requireAdmin()
  const s = await getSettingsFresh()
  return (
    <div className="max-w-2xl space-y-10">
      <h1 className="h-display text-2xl">Postavke</h1>
      <ActionForm action={saveSettingsAction} submit="Spremi postavke" className="space-y-8">
        <details open className="card group/s">
          <summary className="flex items-center justify-between px-5 py-4 font-medium">Dostava<span className="font-mono text-mute transition group-open/s:rotate-45">+</span></summary>
          <div className="grid gap-4 border-t border-line p-5 sm:grid-cols-2">
          <Field label="Cijena dostave HR (€)" name="shipping" defaultValue={eur(s.shippingCents)} inputMode="decimal" />
          <Field label="Besplatna dostava od (€)" name="threshold" defaultValue={eur(s.freeThresholdCents)} inputMode="decimal" />
          <Field label="Rok dostave (HR)" name="deliveryHr" defaultValue={s.deliveryHr} />
          <Field label="Rok dostave (EN)" name="deliveryEn" defaultValue={s.deliveryEn} />
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="shipEu" defaultChecked={s.shipEu} className="size-4 accent-[#d08a2e]" /> Dostava u ostale države EU</label>
          <Field label="Cijena dostave EU (€)" name="euShipping" defaultValue={eur(s.euShippingCents)} inputMode="decimal" />
          </div>
        </details>
        <details className="card group/s">
          <summary className="flex items-center justify-between px-5 py-4 font-medium">Prijedlozi (staff)<span className="font-mono text-mute transition group-open/s:rotate-45">+</span></summary>
          <div className="border-t border-line p-5 text-sm">
            <label className="flex items-center gap-3">
              <input type="checkbox" name="autoAcceptProposals" defaultChecked={s.autoAcceptProposals} className="size-4 accent-[#d08a2e]" />
              Automatski prihvati — prijedlog na pregledu odmah postaje neobjavljeni proizvod (bez prodajne cijene)
            </label>
          </div>
        </details>
        <details className="card group/s">
          <summary className="flex items-center justify-between px-5 py-4 font-medium">Traka s obavijesti (vrh stranice)<span className="font-mono text-mute transition group-open/s:rotate-45">+</span></summary>
          <div className="grid gap-4 border-t border-line p-5 sm:grid-cols-2">
          <Field label="Tekst (HR)" name="announcementHr" defaultValue={s.announcementHr} hint="Prazno = poruka o besplatnoj dostavi." />
          <Field label="Tekst (EN)" name="announcementEn" defaultValue={s.announcementEn} />
          </div>
        </details>
        <details className="card group/s">
          <summary className="flex items-center justify-between px-5 py-4 font-medium">Računi (Solo)<span className="font-mono text-mute transition group-open/s:rotate-45">+</span></summary>
          <div className="border-t border-line p-5 text-sm text-mute">
            <p>Računi i fiskalizacija idu isključivo preko Solo API-ja (poslovni prostor WEB1, uređaj 1, operater Luka Kasalo).</p>
            <p className="mt-3">Env na Vercelu: <code className="text-flame-2">SOLO_API_TOKEN</code>, <code className="text-flame-2">SOLO_TIP_USLUGE</code> (ID iz Soloa → Usluge → Tipovi usluga), opcionalno <code className="text-flame-2">SOLO_TIP_RACUNA=4</code> (bez oznake, ne-PDV).</p>
          </div>
        </details>
      </ActionForm>
    </div>
  )
}
