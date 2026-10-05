import { Mark } from './Mark'

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="container-x grid gap-16 pt-14 md:grid-cols-2 md:items-center md:pt-20">
      <div className="frame hidden aspect-[4/5] md:block" style={{ ['--c' as string]: '28px' }}>
        <div className="frame-in">
          <div className="gridlines absolute inset-0" />
          <Mark outline animated body="#3a3a3a" strokeWidth={50} className="absolute left-1/2 top-1/2 h-[60%] w-auto -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-sm md:mx-0 md:justify-self-center">
        <h1 className="h-display rise mb-10 text-4xl leading-[1] sm:text-5xl">{title}</h1>
        {children}
      </div>
    </div>
  )
}
