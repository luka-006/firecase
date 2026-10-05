// Zajedničko zaglavlje unutarnjih stranica
export function PageHead({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro?: string }) {
  return (
    <div className="container-x pt-14 md:pt-20">
      {eyebrow && <p className="eyebrow rise">{eyebrow}</p>}
      <h1 className="h-display rise mt-4 text-4xl leading-[1] sm:text-6xl" style={{ ['--d' as string]: '80ms' }}>{title}</h1>
      {intro && <p className="rise mt-6 max-w-xl text-[15px] leading-relaxed text-bone/60" style={{ ['--d' as string]: '160ms' }}>{intro}</p>}
      <span aria-hidden="true" className="rule-draw mt-10 block h-px bg-line" />
    </div>
  )
}
