import { ActionForm } from './Ui'
import { StarInput } from './Stars'
import { submitReview } from '@/app/review-actions'
import { t } from '@/lib/dict'
import type { Locale } from '@/lib/routes'
import { safeImageSrc, type ReviewTarget } from '@/lib/review-util'

export function ReviewForm({
  locale,
  token,
  targets,
  defaultName,
}: {
  locale: Locale
  token: string
  targets: ReviewTarget[]
  defaultName: string
}) {
  const d = t(locale)
  return (
    <ActionForm action={submitReview} submit={d.reviewSubmit} locale={locale} className="space-y-6">
      <input type="hidden" name="token" value={token} />
      <ul className="space-y-4">
        {targets.map((item) => {
          const img = safeImageSrc(item.image)
          return (
            <li key={item.itemIndex} className="border border-line p-4">
              <div className="flex items-center gap-3">
                {img ? <img src={img} alt="" width={64} height={64} className="size-16 bg-ink-3 object-cover" /> : null}
                <div>
                  <p className="font-medium">{item.name}</p>
                  {item.variant ? <p className="text-sm text-mute">{item.variant}</p> : null}
                  {item.qty > 1 ? <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-mute">{d.qty}: {item.qty}</p> : null}
                </div>
              </div>
              <fieldset className="mt-4 border-0 p-0">
                <legend className="label">{d.reviewRating}</legend>
                <StarInput name={`rating_${item.itemIndex}`} />
              </fieldset>
              <label className="mt-4 block">
                <span className="label">{d.reviewComment}</span>
                <textarea name={`body_${item.itemIndex}`} maxLength={1000} rows={4} placeholder={d.reviewCommentPh} className="input min-h-28" />
              </label>
            </li>
          )
        })}
      </ul>
      <label className="block">
        <span className="label">{d.reviewName}</span>
        <input name="displayName" defaultValue={defaultName} maxLength={40} autoComplete="off" className="input" />
        <span className="mt-1 block text-xs text-mute">{d.reviewNameHint}</span>
      </label>
    </ActionForm>
  )
}
