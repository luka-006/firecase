import Image from 'next/image'
import Link from 'next/link'
import { CookieSettingsButton } from './Ui'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'

export function Footer({ locale }: { locale: Locale }) {
  const d = t(locale)
  const a = 'transition hover:text-bone'
  return (
    <footer className="mt-32 border-t border-line md:mt-44">
      <div className="container-x grid gap-14 py-20 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Image src="/logo-word.svg" alt="Firecase" width={160} height={12} className="h-3 w-auto" />
          <p className="h-display mt-6 text-3xl italic text-bone/80">{d.footerTag}</p>
        </div>
        <div>
          <p className="eyebrow mb-5">{d.footerShop}</p>
          <ul className="space-y-3 text-sm text-bone/60">
            <li><Link className={a} href={href(locale, 'shop')}>{d.allCases}</Link></li>
            <li><Link className={a} href={href(locale, 'account')}>{d.account}</Link></li>
            <li><Link className={a} href={href(locale, 'favorites')}>{d.favorites}</Link></li>
            <li><Link className={a} href={href(locale, 'contact')}>{d.contact}</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-5">{d.footerInfo}</p>
          <ul className="space-y-3 text-sm text-bone/60">
            <li><Link className={a} href={href(locale, 'shipping')}>{d.shippingPage}</Link></li>
            <li><Link className={a} href={href(locale, 'returns')}>{d.returns}</Link></li>
            <li><Link className={a} href={href(locale, 'terms')}>{d.terms}</Link></li>
            <li><Link className={a} href={href(locale, 'privacy')}>{d.privacy}</Link></li>
            <li><Link className={a} href={href(locale, 'cookies')}>{d.cookies}</Link></li>
            <li><CookieSettingsButton label={d.cookieSettings} /></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="container-x py-7 text-[10px] uppercase tracking-[0.28em] text-mute">© {new Date().getFullYear()} Firecase</p>
      </div>
    </footer>
  )
}
