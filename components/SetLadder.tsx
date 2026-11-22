import { TruckIcon } from './icons'
import { BUILD_SET_MIN, BUILD_SET_TIERS } from '@/lib/set-builder'
import { t } from '@/lib/dict'
import type { Locale } from '@/lib/routes'

/** The steps of "Napravi svoj set": the smallest set, then every discount tier. */
export const SET_STEPS = [{ min: BUILD_SET_MIN, percent: 0, freeShipping: false }, ...[...BUILD_SET_TIERS].sort((a, b) => a.min - b.min).map((tier) => ({ ...tier, freeShipping: !!tier.freeShipping }))]

/** Share of the rail to fill: the steps sit at equal distances, counts between them fill part of the way. */
export function ladderFill(count: number) {
  const n = SET_STEPS.length
  if (count <= 0) return 0
  let prev = 0
  for (let i = 0; i < n; i++) {
    const min = SET_STEPS[i].min
    if (count < min) return (i + (count - prev) / (min - prev)) / n
    prev = min
  }
  return 1
}

/**
 * Rail with the set steps (2 / 3 / 5 / 8) and their discounts. `burst` lights a ring on the step that was
 * just reached; change `burstKey` to play it again.
 */
export function SetLadder({ locale, count, compact, burst, burstKey }: { locale: Locale; count: number; compact?: boolean; burst?: number | null; burstKey?: number }) {
  const d = t(locale)
  const fill = ladderFill(count)
  const free = SET_STEPS.find((s) => s.freeShipping)
  return (
    <div className={compact ? 'pr-1' : 'pr-1.5'}>
      <div className="grid grid-cols-4">
        {SET_STEPS.map((step) => {
          const on = count >= step.min
          const hit = burst === step.min
          return (
            <div key={step.min} className={`flex items-baseline justify-end gap-1.5 text-right ${compact ? 'pb-1.5' : 'pb-2.5'}`}>
              <span key={hit ? `n${burstKey}` : 'n'} className={`font-mono tabular-nums transition-colors duration-500 ${compact ? 'text-[10px]' : 'text-sm'} ${on ? 'text-bone' : 'text-mute'} ${hit ? 'tier-pop' : ''}`}>{step.min}</span>
              <span className={`font-mono uppercase tracking-[0.08em] transition-colors duration-500 ${compact ? 'text-[10px]' : 'text-[11px]'} ${on ? 'text-flame-2' : 'text-mute/70'}`}>
                {step.percent ? `−${step.percent}%` : d.buildStepSet}
              </span>
              {compact && step.freeShipping && <TruckIcon className={`size-3.5 self-center transition-colors duration-500 ${on ? 'text-flame-2' : 'text-mute/70'}`} />}
            </div>
          )
        })}
      </div>
      <div className="relative h-[2px] bg-line">
        <div className="ladder-fill absolute inset-0 origin-left bg-gradient-to-r from-flame to-flame-2" style={{ transform: `scaleX(${fill})` }} />
        {SET_STEPS.map((step, i) => {
          const on = count >= step.min
          return (
            <span key={step.min} className="absolute top-1/2" style={{ left: `${((i + 1) / SET_STEPS.length) * 100}%` }}>
              <span className={`absolute left-0 top-0 block -translate-x-1/2 -translate-y-1/2 rotate-45 border transition-[background-color,border-color,box-shadow] duration-500 ${compact ? 'size-[7px]' : 'size-[9px]'} ${on ? 'border-flame-2 bg-flame shadow-[0_0_0_3px_rgb(208_138_46/0.22)]' : 'border-mute/50 bg-ink'}`} />
              {burst === step.min && <span key={burstKey} className="tier-burst" aria-hidden />}
            </span>
          )
        })}
      </div>
      {!compact && free && (
        <p className={`mt-3 flex items-center justify-end gap-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-500 ${count >= free.min ? 'text-flame-2' : 'text-mute/70'}`}>
          <TruckIcon className="size-4" />
          {free.min}+ · {d.buildFreeShip}
        </p>
      )}
      <span className="sr-only">{SET_STEPS.map((s) => `${s.min}: ${s.percent ? `${s.percent}%` : d.buildStepSet}${s.freeShipping ? `, ${d.buildFreeShip}` : ''}`).join('; ')}</span>
    </div>
  )
}
