import Image from 'next/image'
import Link from 'next/link'
import { CookieSettingsButton } from './Ui'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'

export function Footer({ locale }: { locale: Locale }) {
  const d = t(locale)
  const a = 'transition hover:text-bone'
  const ul = 'space-y-3 text-sm text-bone/60'
  return (
    <footer className="mt-32 border-t border-line md:mt-48">
      <div className="container-x grid gap-14 py-16 md:grid-cols-12 md:py-20">
        <p className="h-display text-3xl leading-[1.02] sm:text-4xl md:col-span-6">{d.footerTag}</p>
        <div className="md:col-span-3">
          <p className="eyebrow mb-5">{d.footerShop}</p>
          <ul className={ul}>
            <li><Link className={a} href={href(locale, 'shop')}>{d.allCases}</Link></li>
            <li><Link className={a} href={href(locale, 'account')}>{d.account}</Link></li>
            <li><Link className={a} href={href(locale, 'favorites')}>{d.favorites}</Link></li>
            <li><Link className={a} href={href(locale, 'contact')}>{d.contact}</Link></li>
          </ul>
        </div>
        <div className="md:col-span-3">
          <p className="eyebrow mb-5">{d.footerInfo}</p>
          <ul className={ul}>
            <li><Link className={a} href={href(locale, 'shipping')}>{d.shippingPage}</Link></li>
            <li><Link className={a} href={href(locale, 'returns')}>{d.returns}</Link></li>
            <li><Link className={a} href={href(locale, 'terms')}>{d.terms}</Link></li>
            <li><Link className={a} href={href(locale, 'privacy')}>{d.privacy}</Link></li>
            <li><Link className={a} href={href(locale, 'cookies')}>{d.cookies}</Link></li>
            <li><CookieSettingsButton label={d.cookieSettings} /></li>
          </ul>
        </div>
      </div>
      <div className="overflow-hidden px-5 sm:px-8" data-reveal>
        <Image src="/logo-word.svg" alt="" width={6067} height={501} className="wm-rise h-auto w-full" />
      </div>
      <div className="mt-10 border-t border-line">
        <p className="container-x py-6 font-mono text-[10px] uppercase tracking-[0.2em] text-mute">© {new Date().getFullYear()} Firecase</p>
      </div>
    </footer>
  )
}
