import Image from 'next/image'
import Link from 'next/link'
import { CartButton, HeaderShell, LangSwitch, MobileMenu } from './HeaderClient'
import { HeartIcon, UserIcon } from './icons'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'

export function Header({ locale, announcement }: { locale: Locale; announcement: string }) {
  const d = t(locale)
  const links = [
    { href: href(locale, 'shop'), label: d.allCases },
    { href: href(locale, 'home') + '#prica', label: d.story },
    { href: href(locale, 'contact'), label: d.contact },
  ]
  return (
    <>
      {announcement && (
        <div className="border-b border-line bg-ink px-4 py-2.5 text-center text-[10px] uppercase tracking-[0.14em] sm:tracking-[0.28em] text-bone/55">{announcement}</div>
      )}
      <HeaderShell>
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-2 md:gap-8">
            <MobileMenu locale={locale} links={[...links, { href: href(locale, 'account'), label: d.account }, { href: href(locale, 'favorites'), label: d.favorites }]} />
            <Link href={href(locale, 'home')} className="flex items-center gap-2.5" aria-label="Firecase">
              <Image src="/logo-mark.svg" alt="" width={14} height={27} priority className="h-7 w-auto" />
              <Image src="/logo-word.svg" alt="Firecase" width={120} height={10} priority className="h-[11px] w-auto" />
            </Link>
            <nav className="hidden items-center gap-7 md:flex">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="text-[11px] uppercase tracking-[0.22em] text-bone/65 transition hover:text-bone">{l.label}</Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-1">
            <span className="hidden md:inline-flex"><LangSwitch locale={locale} /></span>
            <Link href={href(locale, 'favorites')} className="hidden p-2 text-bone/80 transition hover:text-bone sm:inline-flex" aria-label={d.favorites}><HeartIcon /></Link>
            <Link href={href(locale, 'account')} className="p-2 text-bone/80 transition hover:text-bone" aria-label={d.account}><UserIcon /></Link>
            <CartButton locale={locale} />
          </div>
        </div>
      </HeaderShell>
    </>
  )
}
