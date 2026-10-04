import Image from 'next/image'
import Link from 'next/link'
import { SELLER } from '@/lib/config'
import { href, type Locale } from '@/lib/routes'
import { t } from '@/lib/dict'

export function Footer({ locale }: { locale: Locale }) {
  const d = t(locale)
  const col = 'space-y-2.5 text-sm text-bone/65'
  const a = 'transition hover:text-bone'
  return (
    <footer className="mt-32 border-t border-line">
      <div className="container-x grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
        <div className="space-y-4">
          <Image src="/logo-word.svg" alt="Firecase" width={150} height={12} className="h-3 w-auto" />
          <p className="max-w-xs text-sm text-mute">{d.footerTag}</p>
          <p className="text-xs text-mute">{d.payments}</p>
        </div>
        <div>
          <p className="eyebrow mb-4">{d.footerShop}</p>
          <ul className={col}>
            <li><Link className={a} href={href(locale, 'shop')}>{d.allCases}</Link></li>
            <li><Link className={a} href={href(locale, 'cart')}>{d.cart}</Link></li>
            <li><Link className={a} href={href(locale, 'account')}>{d.account}</Link></li>
            <li><Link className={a} href={href(locale, 'contact')}>{d.contact}</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">{d.footerInfo}</p>
          <ul className={col}>
            <li><Link className={a} href={href(locale, 'terms')}>{d.terms}</Link></li>
            <li><Link className={a} href={href(locale, 'shipping')}>{d.shippingPage}</Link></li>
            <li><Link className={a} href={href(locale, 'returns')}>{d.returns}</Link></li>
            <li><Link className={a} href={href(locale, 'withdrawal')}>{d.withdrawal}</Link></li>
            <li><Link className={a} href={href(locale, 'privacy')}>{d.privacy}</Link></li>
            <li><Link className={a} href={href(locale, 'cookies')}>{d.cookies}</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">{d.footerCompany}</p>
          <address className="space-y-1 text-sm not-italic text-bone/65">
            <p>{SELLER.legalName}</p>
            <p>{SELLER.address}, {SELLER.postal} {SELLER.city}, {locale === 'en' ? SELLER.countryEn : SELLER.country}</p>
            <p>OIB: {SELLER.oib}</p>
            <p>{SELLER.registry}{SELLER.registryNumber ? `, MBO: ${SELLER.registryNumber}` : ''}</p>
            <p><a className={a} href={`mailto:${SELLER.email}`}>{SELLER.email}</a></p>
          </address>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="container-x py-6 text-xs text-mute">© {new Date().getFullYear()} Firecase · {SELLER.shortName}</p>
      </div>
    </footer>
  )
}
