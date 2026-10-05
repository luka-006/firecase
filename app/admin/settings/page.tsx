import { requireAdmin } from '@/lib/auth'
import { getSettingsFresh } from '@/lib/settings'
import { ActionForm, Field } from '@/components/Ui'
import { checkCertificate, saveSettingsAction } from '../actions'

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
          <summary className="flex items-center justify-between px-5 py-4 font-medium">Traka s obavijesti (vrh stranice)<span className="font-mono text-mute transition group-open/s:rotate-45">+</span></summary>
          <div className="grid gap-4 border-t border-line p-5 sm:grid-cols-2">
          <Field label="Tekst (HR)" name="announcementHr" defaultValue={s.announcementHr} hint="Prazno = poruka o besplatnoj dostavi." />
          <Field label="Tekst (EN)" name="announcementEn" defaultValue={s.announcementEn} />
          </div>
        </details>
        <details className="card group/s">
          <summary className="flex items-center justify-between px-5 py-4 font-medium">Računi i fiskalizacija<span className="font-mono text-mute transition group-open/s:rotate-45">+</span></summary>
          <div className="grid gap-4 border-t border-line p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="mt-1 text-xs text-mute">Certifikat se postavlja u Vercelu kao FISCAL_CERT_BASE64 i FISCAL_CERT_PASSWORD. Prvo testiraj u TEST okruženju, zatim prebaci na PRODUKCIJU.</p>
          </div>
          <Field label="Oznaka poslovnog prostora" name="premises" defaultValue={s.premises} />
          <Field label="Oznaka naplatnog uređaja" name="device" defaultValue={s.device} />
          <label className="block"><span className="label">Slijednost brojeva</span>
            <select name="seqMode" defaultValue={s.seqMode} className="input"><option value="P">Na razini poslovnog prostora (P)</option><option value="N">Na razini naplatnog uređaja (N)</option></select>
          </label>
          <label className="block"><span className="label">Okruženje</span>
            <select name="fiscalEnv" defaultValue={s.fiscalEnv} className="input"><option value="test">TEST (cistest)</option><option value="prod">PRODUKCIJA</option></select>
          </label>
          <label className="flex items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" name="fiscalEnabled" defaultChecked={s.fiscalEnabled} className="size-4 accent-[#d08a2e]" /> Fiskalizacija uključena</label>
          </div>
        </details>
      </ActionForm>
      <section className="card p-5">
        <h2 className="mb-3 font-medium">Provjera certifikata</h2>
        <ActionForm action={checkCertificate} submit="Provjeri certifikat" />
      </section>
    </div>
  )
}
