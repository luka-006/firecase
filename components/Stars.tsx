export function formatRating(value: number) {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path fill="currentColor" d="M10 1.5 12.47 6.8l5.78.5-4.4 3.78 1.36 5.67L10 13.9l-5.21 2.85 1.36-5.67L1.75 7.3l5.78-.5L10 1.5Z" />
    </svg>
  )
}

function StarRow({ className, icon }: { className: string; icon: string }) {
  return (
    <span className={`flex gap-0.5 ${className}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} className={icon} />
      ))}
    </span>
  )
}

export function Stars({ value, label, className = 'size-4' }: { value: number; label?: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100))
  return (
    <span className="relative inline-block align-middle leading-none" role="img" aria-label={label ?? `${formatRating(value)} / 5`}>
      <StarRow className="text-bone/25" icon={className} />
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>
        <StarRow className="w-max text-flame" icon={className} />
      </span>
    </span>
  )
}

export function StarInput({ name }: { name: string }) {
  return (
    <div className="star-input">
      {[5, 4, 3, 2, 1].flatMap((n) => {
        const id = `${name}-${n}`
        return [
          <input key={id} id={id} type="radio" name={name} value={n} required />,
          <label key={`${id}-l`} htmlFor={id}>
            <span className="sr-only">{n}</span>
            <StarIcon className="size-7" />
          </label>,
        ]
      })}
    </div>
  )
}
