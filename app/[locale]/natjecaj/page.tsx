import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PageHead } from '@/components/PageHead'
import { LegalToc } from '@/components/LegalToc'
import { SELLER } from '@/lib/config'
import { t } from '@/lib/dict'
import { href } from '@/lib/routes'

const TITLE = 'Pravila nagradnog natječaja'

function Instagram() {
  return <a href="https://www.instagram.com/firecase2026/" target="_blank" rel="noopener noreferrer">@firecase2026</a>
}

function TikTok() {
  return <a href="https://www.tiktok.com/@firecase1" target="_blank" rel="noopener noreferrer">@firecase1</a>
}

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (locale !== 'hr') return {}
  const canonical = href('hr', 'contest')
  return {
    title: TITLE,
    description: 'Pravila Firecase nagradnog natječaja „Komu biste ga poklonili?“. Sudjelovanje je besplatno, bez obveze kupnje.',
    alternates: { canonical, languages: { hr: canonical, 'x-default': canonical } },
  }
}

export default async function ContestRulesPage({ params }: Props) {
  const { locale } = await params
  if (locale !== 'hr') notFound()
  const home = href('hr', 'home')
  return (
    <>
      <PageHead
        eyebrow={t('hr').footerInfo}
        title={TITLE}
        intro="Firecase natječaj „Komu biste ga poklonili?“. Dobitnike organizator bira prema kvaliteti odgovora. Ovo nije nagradna igra."
      />
      <div className="container-x grid gap-16 pt-12 lg:grid-cols-[1fr_15rem]">
        <div>
          <div className="prose-legal">
            <h2>1. Organizator</h2>
            <p>Organizator natječaja je obrt koji vodi internetsku trgovinu Firecase (<Link href={home}>firecase.net</Link>):</p>
            <p>
              <b>{SELLER.legalName}</b><br />
              {SELLER.address}, {SELLER.postal} {SELLER.city}, {SELLER.country}<br />
              OIB: {SELLER.oib}<br />
              Upisan u Obrtni registar{SELLER.registryNumber ? `, MBO: ${SELLER.registryNumber}` : ''}<br />
              Paušalni obrt. Nije u sustavu PDV-a.<br />
              E-mail: <a href={`mailto:${SELLER.email}`}>{SELLER.email}</a>
            </p>

            <h2>2. Naziv i narav natječaja</h2>
            <p>Naziv natječaja je: Firecase natječaj „Komu biste ga poklonili?“.</p>
            <p>Riječ je o nagradnom natječaju. Organizator bira dobitnike prema kvaliteti odgovora, na temelju mjerila iz ovih Pravila. Ovo nije nagradna igra.</p>

            <h2>3. Trajanje</h2>
            <p>Natječaj traje od 18. 11. 2026. u 10:00 sati do 2. 12. 2026. u 21:00 sati (vrijeme u Republici Hrvatskoj).</p>
            <p>Dobitnici se objavljuju 4. 12. 2026. na Instagramu <Instagram /> i na TikToku <TikTok />.</p>

            <h2>4. Tko može sudjelovati</h2>
            <p>Sudjelovati možete ako ste navršili 18 godina i imate adresu za dostavu u Republici Hrvatskoj.</p>
            <p>Sudjelovanje je besplatno. Kupnja nije potrebna.</p>

            <h2>5. Kako sudjelovati</h2>
            <p>Sudjelovati možete na Instagramu, na TikToku ili na obje platforme.</p>
            <h3>Instagram</h3>
            <p>Na profilu <Instagram />:</p>
            <ol>
              <li>zapratite profil <Instagram />,</li>
              <li>u komentaru ispod objave natječaja napišite kome biste set poklonili i zašto,</li>
              <li>u tom komentaru označite tu osobu ili prijatelja.</li>
            </ol>
            <h3>TikTok</h3>
            <p>Na profilu <TikTok />, u komentaru ispod videa natječaja napišite kome biste set poklonili i zašto.</p>
            <p>Možete ostaviti više komentara. Jedna osoba može osvojiti samo jednu nagradu.</p>

            <h2>6. Komentari koji se ne uzimaju u obzir</h2>
            <p>U odabir ne ulaze uvredljivi komentari, neželjene poruke (spam) ni komentari koji krše ova Pravila.</p>

            <h2>7. Nagrade</h2>
            <ol>
              <li><b>1. mjesto:</b> Set Trio J5 (tri metalne futrole Ornament, Tiger i Sorbet za BIC J5), u vrijednosti 32,99 €. Dostava je besplatna.</li>
              <li><b>2. mjesto:</b> kod za popust od 50 % na sljedeću narudžbu na <Link href={home}>firecase.net</Link>. Kod se može iskoristiti samo jednom i vrijedi do 31. 12. 2026.</li>
              <li><b>3. mjesto:</b> kod za popust od 30 % na sljedeću narudžbu na <Link href={home}>firecase.net</Link>. Kod se može iskoristiti samo jednom i vrijedi do 31. 12. 2026.</li>
            </ol>
            <p>Nagrade se ne mogu zamijeniti za novac.</p>

            <h2>8. Odabir dobitnika</h2>
            <p>Organizator (Firecase) odabire tri najbolja odgovora prema izvornosti, kreativnosti i usklađenosti s temom natječaja. Odluka organizatora je konačna.</p>

            <h2>9. Objava dobitnika i preuzimanje nagrade</h2>
            <p>Dobitnici se objavljuju javno, pod imenom profila, 4. 12. 2026. na Instagramu <Instagram /> i na TikToku <TikTok />.</p>
            <p>Ako ste među dobitnicima, javite se Firecaseu privatnom porukom (DM) u roku od 7 dana od objave. Ako se ne javite, nagrada pripada sljedećem najboljem odgovoru.</p>
            <p>Ako osvojite prvo mjesto, dostavite ime i prezime, adresu dostave i broj telefona. Ti podaci služe samo za slanje nagrade.</p>
            <p>Ako osvojite drugo ili treće mjesto, kod za popust primate privatnom porukom.</p>

            <h2>10. Osobni podaci</h2>
            <p>Osobne podatke koristimo samo radi provedbe natječaja i dostave nagrade. Nakon toga ih brišemo.</p>
            <p>
              Imate prava iz Opće uredbe o zaštiti podataka (GDPR): pravo na pristup, ispravak, brisanje, ograničenje obrade, prenosivost podataka i prigovor. Zahtjev pošaljite na <a href={`mailto:${SELLER.email}`}>{SELLER.email}</a>. Odgovorit ćemo u roku od mjesec dana. Imate i pravo podnijeti prigovor Agenciji za zaštitu osobnih podataka (AZOP), Selska cesta 136, 10000 Zagreb, <a href="https://azop.hr" target="_blank" rel="noopener noreferrer">azop.hr</a>.
            </p>
            <p>Obrada podataka pri kupnji u webshopu opisana je u <Link href={href('hr', 'privacy')}>Politici privatnosti</Link>.</p>

            <h2>11. Porez</h2>
            <p>Nagrada za dobitnika nije oporeziva. Prema stajalištu Porezne uprave riječ je o primicima koji se ne smatraju dohotkom.</p>

            <h2>12. Instagram i TikTok</h2>
            <p>Ovaj natječaj ni na koji način nije sponzoriran, podržan ni organiziran od strane Instagrama (Meta) ni TikToka, niti je s njima povezan. Sudionici oslobađaju Instagram i TikTok svake odgovornosti.</p>

            <h2>13. Izmjene pravila</h2>
            <p>Organizator može izmijeniti ova Pravila iz opravdanih razloga. Izmjenu će objaviti na ovoj stranici.</p>
          </div>
        </div>
        <LegalToc label={t('hr').contents} />
      </div>
    </>
  )
}
