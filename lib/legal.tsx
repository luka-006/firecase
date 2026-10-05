import Link from 'next/link'
import { SELLER } from './config'
import { money } from './money'
import { href, type Locale } from './routes'
import type { Settings } from './settings'

export const LEGAL_DATE = { hr: '4. listopada 2026.', en: '4 October 2026' }
export const LEGAL_DOCS = ['terms', 'privacy', 'cookies', 'shipping', 'returns', 'withdrawal', 'contact'] as const
export type LegalDoc = (typeof LEGAL_DOCS)[number]

type Ctx = { s: Settings; locale: Locale }
type Doc = { title: string; body: (c: Ctx) => React.ReactNode }

const Seller = ({ en }: { en?: boolean }) => (
  <p>
    <b>{SELLER.legalName}</b><br />
    {SELLER.address}, {SELLER.postal} {SELLER.city}, {en ? SELLER.countryEn : SELLER.country}<br />
    OIB: {SELLER.oib}<br />
    {en ? 'Registered in the Croatian Register of Crafts (Obrtni registar)' : 'Upisan u Obrtni registar'}{SELLER.registryNumber ? `, MBO: ${SELLER.registryNumber}` : ''}<br />
    E-mail: <a href={`mailto:${SELLER.email}`}>{SELLER.email}</a>
  </p>
)
const Mail = () => <a href={`mailto:${SELLER.email}`}>{SELLER.email}</a>
const ReturnAddr = ({ en }: { en?: boolean }) => (
  <p><b>{SELLER.shortName}</b><br />{en ? 'BOX NOW or GLS parcel locker' : 'BOX NOW ili GLS paketomat'}, {SELLER.returnAddress}</p>
)

const hr: Record<LegalDoc, Doc> = {
  terms: {
    title: 'Uvjeti poslovanja',
    body: ({ s, locale }) => (
      <>
        <h2>1. Opće odredbe</h2>
        <p>Ovi Uvjeti poslovanja uređuju prodaju proizvoda putem internetske trgovine Firecase (dalje: Trgovina). Prodavatelj je:</p>
        <Seller />
        <p>Kupac je svaka osoba koja putem Trgovine naruči proizvod. Potrošač je kupac – fizička osoba koja sklapa ugovor za svrhe izvan svoje poslovne djelatnosti. Slanjem narudžbe kupac potvrđuje da je upoznat s ovim Uvjetima i da ih prihvaća. Ugovor se sklapa na hrvatskom jeziku. Engleska verzija Uvjeta služi informiranju, a u slučaju razlike mjerodavna je hrvatska verzija.</p>

        <h2>2. Proizvodi i cijene</h2>
        <p>Proizvodi su opisani i prikazani što je točnije moguće. Boje na fotografijama mogu se neznatno razlikovati od stvarnih zbog postavki zaslona.</p>
        <p>Sve cijene iskazane su u eurima (EUR) i konačne su. {SELLER.vatNoteHr}</p>
        <p>Troškovi dostave prikazuju se prije potvrde narudžbe. Kod sniženja uz sniženu cijenu navodi se i najniža cijena proizvoda u razdoblju od 30 dana prije sniženja. Za narudžbu vrijedi cijena važeća u trenutku slanja narudžbe. U slučaju očite pogreške u cijeni prodavatelj će kupca obavijestiti, a kupac može odustati od narudžbe uz povrat cjelokupnog plaćenog iznosa.</p>

        <h2>3. Narudžba i sklapanje ugovora</h2>
        <ol>
          <li>Kupac odabire proizvode i dodaje ih u košaricu.</li>
          <li>U blagajni upisuje podatke za dostavu i kontakt te provjerava narudžbu. Do slanja narudžbe sve podatke može ispraviti.</li>
          <li>Kupac potvrđuje da prihvaća ove Uvjete i klikom na gumb „Naruči s obvezom plaćanja” prelazi na plaćanje.</li>
          <li>Ugovor je sklopljen trenutkom potvrde uspješnog plaćanja. Kupac odmah prima potvrdu narudžbe e-mailom, zajedno s računom i informacijama o pravu na jednostrani raskid ugovora.</li>
        </ol>
        <p>Podaci o narudžbi pohranjuju se kod prodavatelja. Kupac ih ima u e-mailu s potvrdom, a ako ima korisnički račun, i u svom računu. Izrada korisničkog računa nije obavezna za kupnju.</p>

        <h2>4. Plaćanje</h2>
        <p>Plaćanje se obavlja putem usluge Stripe (Stripe Payments Europe Ltd., Irska): kreditnim i debitnim karticama (Visa, Mastercard, Maestro i druge), Apple Payem, Google Payem i PayPalom. Dostupnost pojedinih načina plaćanja može ovisiti o uređaju i pregledniku. Podatke o kartici kupac unosi izravno kod Stripea; prodavatelj nema pristup podacima o kartici.</p>
        <p>Iznos narudžbe tereti se u trenutku narudžbe. Račun se izdaje u elektroničkom obliku i dostavlja na e-mail kupca.</p>

        <h2>5. Dostava</h2>
        <p>Dostava je moguća na adrese u Republici Hrvatskoj{s.shipEu ? ' te u države članice Europske unije navedene u blagajni' : ''}. Cijena dostave unutar Hrvatske iznosi {money(s.shippingCents, locale)}, a za narudžbe od {money(s.freeThresholdCents, locale)} i više dostava je besplatna.{s.shipEu ? ` Dostava u ostale države EU iznosi ${money(s.euShippingCents, locale)}.` : ''}</p>
        <p>Očekivani rok dostave je {s.deliveryHr}. Proizvodi se mogu slati izravno iz skladišta naših dobavljača; za ispunjenje ugovora prema kupcu odgovoran je prodavatelj. Prodavatelj će robu isporučiti najkasnije u roku od 30 dana od sklapanja ugovora. Ako to ne bude moguće, kupca će obavijestiti, a kupac ima pravo raskinuti ugovor i dobiti povrat plaćenog iznosa bez odgode.</p>
        <p>Rizik od propasti ili oštećenja robe prelazi na potrošača kad on ili treća osoba koju je odredio (osim prijevoznika) preuzme robu. Ako je paket vidljivo oštećen, preporučujemo da to odmah prijavite dostavljaču i javite nam se na <Mail />.</p>

        <h2>6. Pravo na jednostrani raskid ugovora</h2>
        <p>Potrošač ima pravo jednostrano raskinuti ugovor u roku od 14 dana bez navođenja razloga. Rok počinje teći od dana kad potrošač ili treća osoba koju je odredio (osim prijevoznika) preuzme robu. Ako je više proizvoda iz jedne narudžbe isporučeno odvojeno, rok teče od preuzimanja posljednjeg proizvoda.</p>
        <p>Za ostvarivanje prava potrošač nas mora obavijestiti nedvosmislenom izjavom poslanom e-mailom na <Mail /> ili poštom na adresu sjedišta. Može se koristiti <Link href={href('hr', 'withdrawal')}>obrazac za jednostrani raskid ugovora</Link>, ali to nije obavezno. Rok je poštovan ako je obavijest poslana prije isteka roka.</p>
        <p>Robu treba vratiti bez odgađanja, a najkasnije u roku od 14 dana od dana slanja obavijesti o raskidu, na adresu:</p>
        <ReturnAddr />
        <p>Prije slanja javite nam se e-mailom kako bismo vam poslali upute za povrat. <b>Izravne troškove povrata robe snosi potrošač.</b></p>
        <p>Prodavatelj će bez odgađanja, a najkasnije u roku od 14 dana od dana zaprimanja obavijesti o raskidu, vratiti sve primljene uplate, uključujući troškove dostave. Povrat se izvršava istim sredstvom plaćanja kojim je plaćena narudžba. Prodavatelj može zadržati povrat dok ne primi robu ili dok potrošač ne dostavi dokaz da je robu poslao, ovisno o tome što nastupi prije.</p>
        <p>Potrošač odgovara za umanjenu vrijednost robe koja je posljedica rukovanja robom na način koji nije nužan za utvrđivanje prirode, obilježja i funkcionalnosti robe.</p>

        <h2>7. Odgovornost za materijalne nedostatke</h2>
        <p>Prodavatelj odgovara za materijalne nedostatke robe sukladno Zakonu o obveznim odnosima, za nedostatke koji se pokažu u roku od dvije godine od prijelaza rizika. Kupac je dužan obavijestiti prodavatelja o nedostatku u roku od dva mjeseca od dana kada ga je otkrio, a preporučujemo da to učini odmah. Kupac ima pravo zahtijevati uklanjanje nedostatka, zamjenu, sniženje cijene ili raskid ugovora, sukladno zakonu. Uz proizvode se ne daje komercijalno jamstvo, osim ako je izričito navedeno uz proizvod. Zakonska prava potrošača ne mogu se isključiti ni ograničiti.</p>

        <h2>8. Prigovori potrošača</h2>
        <p>Potrošač može podnijeti pisani prigovor e-mailom na <Mail /> ili poštom na adresu {SELLER.address}, {SELLER.postal} {SELLER.city}. Primitak prigovora potvrdit ćemo bez odgađanja, a pisani odgovor dostaviti najkasnije u roku od 15 dana od dana primitka prigovora.</p>

        <h2>9. Izvansudsko rješavanje sporova</h2>
        <p>Sve sporove nastojat ćemo riješiti sporazumno. Potrošač se može obratiti tijelima za alternativno rješavanje potrošačkih sporova čiji popis vodi ministarstvo nadležno za zaštitu potrošača. Prodavatelj nije preuzeo obvezu sudjelovanja u takvim postupcima, ali je spreman razmotriti sudjelovanje u svakom pojedinom slučaju. Potrošač se može obratiti i Državnom inspektoratu.</p>

        <h2>10. Zaštita osobnih podataka</h2>
        <p>Osobni podaci obrađuju se sukladno <Link href={href('hr', 'privacy')}>Politici privatnosti</Link>.</p>

        <h2>11. Mjerodavno pravo</h2>
        <p>Na ugovor se primjenjuje pravo Republike Hrvatske. Potrošači s uobičajenim boravištem u drugoj državi članici EU zadržavaju zaštitu koju im pružaju prisilni propisi te države. Za sporove je nadležan stvarno i mjesno nadležan sud sukladno propisima Republike Hrvatske.</p>

        <h2>12. Završne odredbe</h2>
        <p>Prodavatelj može izmijeniti ove Uvjete. Na pojedinu narudžbu primjenjuju se Uvjeti važeći u trenutku slanja narudžbe. Ovi Uvjeti vrijede od {LEGAL_DATE.hr}</p>
      </>
    ),
  },

  privacy: {
    title: 'Politika privatnosti',
    body: () => (
      <>
        <p>Ova Politika objašnjava kako prikupljamo i obrađujemo osobne podatke u skladu s Općom uredbom o zaštiti podataka (GDPR) i Zakonom o provedbi Opće uredbe o zaštiti podataka.</p>
        <h2>1. Voditelj obrade</h2>
        <Seller />
        <h2>2. Koje podatke obrađujemo</h2>
        <ul>
          <li><b>Narudžba:</b> ime i prezime, e-mail, broj mobitela, adresa dostave, naručeni proizvodi, iznos, način plaćanja (bez podataka o kartici).</li>
          <li><b>Korisnički račun (neobavezno):</b> e-mail, lozinka (pohranjena isključivo kao kriptografski sažetak), spremljeni podaci za dostavu, favoriti.</li>
          <li><b>Komunikacija:</b> sadržaj e-mailova koje nam pošaljete (npr. prigovori, povrati).</li>
          <li><b>Tehnički podaci:</b> anonimizirani statistički podaci o posjetima (Vercel Web Analytics, bez kolačića), sigurnosni zapisi poslužitelja te, samo uz vašu privolu, podaci o korištenju stranice putem Google Analyticsa (pseudonimizirani identifikator, stranice, uređaj, približna lokacija).</li>
        </ul>
        <h2>3. Svrhe i pravne osnove</h2>
        <ul>
          <li>Sklapanje i izvršenje ugovora – obrada narudžbe, dostava, povrati, reklamacije (čl. 6. st. 1. t. b GDPR-a).</li>
          <li>Ispunjenje zakonskih obveza – izdavanje i čuvanje računa, fiskalizacija, računovodstvo (čl. 6. st. 1. t. c).</li>
          <li>Legitimni interes – sigurnost stranice, sprječavanje prijevara, anonimna statistika posjeta (čl. 6. st. 1. t. f).</li>
          <li>Korisnički račun – na vaš zahtjev, radi pružanja usluge računa (čl. 6. st. 1. t. b).</li>
          <li>Analitika putem Google Analyticsa – na temelju vaše privole (čl. 6. st. 1. t. a), koju možete povući u svakom trenutku.</li>
        </ul>
        <p>Ne šaljemo promotivne poruke i ne koristimo podatke za automatizirano donošenje odluka.</p>
        <h2>4. Primatelji podataka</h2>
        <ul>
          <li>Vercel Inc., SAD – hosting stranice i anonimna statistika posjeta.</li>
          <li>Neon Inc. – baza podataka (podaci pohranjeni u EU).</li>
          <li>Stripe Payments Europe Ltd., Irska – obrada plaćanja; PayPal (Europe) S.à r.l. et Cie, S.C.A., Luksemburg – ako plaćate PayPalom.</li>
          <li>Google Ireland Ltd. – slanje e-mailova (potvrde narudžbi, računi) i, uz privolu, Google Analytics.</li>
          <li>Dobavljači i dostavne službe – ime, adresa i broj mobitela, isključivo radi dostave.</li>
          <li>Porezna uprava – podaci o računu radi fiskalizacije; knjigovodstveni servis – računi, ako ga koristimo.</li>
        </ul>
        <p>Kod prijenosa podataka izvan Europskog gospodarskog prostora (npr. SAD) primjenjuju se odgovarajuće zaštitne mjere, poput Okvira za privatnost podataka EU–SAD ili standardnih ugovornih klauzula Europske komisije.</p>
        <h2>5. Rok čuvanja</h2>
        <ul>
          <li>Računi i podaci o narudžbama – najmanje 11 godina, sukladno računovodstvenim i poreznim propisima.</li>
          <li>Korisnički račun – dok ga ne obrišete (brisanje je moguće u svakom trenutku u postavkama računa).</li>
          <li>Google Analytics – 14 mjeseci.</li>
          <li>Prepiska o prigovorima i povratima – do isteka zastarnih rokova.</li>
        </ul>
        <h2>6. Vaša prava</h2>
        <p>Imate pravo na pristup, ispravak, brisanje, ograničenje obrade, prenosivost podataka i prigovor na obradu temeljenu na legitimnom interesu. Zahtjev pošaljite na <Mail />; odgovorit ćemo u roku od mjesec dana. Pravo na brisanje ne odnosi se na podatke koje smo dužni čuvati po zakonu (npr. račune).</p>
        <p>Imate pravo podnijeti prigovor Agenciji za zaštitu osobnih podataka (AZOP), Selska cesta 136, 10000 Zagreb, <a href="https://azop.hr" target="_blank" rel="noopener noreferrer">azop.hr</a>.</p>
        <h2>7. Sigurnost</h2>
        <p>Stranica koristi šifriranu vezu (HTTPS). Lozinke se pohranjuju samo kao kriptografski sažetak, a podatke o karticama ne pohranjujemo.</p>
        <h2>8. Izmjene</h2>
        <p>Ova Politika vrijedi od {LEGAL_DATE.hr} O izmjenama ćemo obavijestiti objavom na ovoj stranici.</p>
      </>
    ),
  },

  cookies: {
    title: 'Kolačići',
    body: () => (
      <>
        <p>Kolačići su male datoteke koje stranica sprema u vaš preglednik. Nužni kolačići i lokalna pohrana potrebni su za rad stranice i za njih, sukladno Zakonu o elektroničkim komunikacijama, nije potrebna privola. Analitičke kolačiće (Google Analytics) postavljamo samo ako ih prihvatite u obavijesti o kolačićima. Ne koristimo kolačiće za oglašavanje.</p>
        <h2>Nužni</h2>
        <table>
          <thead><tr><th>Naziv</th><th>Svrha</th><th>Trajanje</th></tr></thead>
          <tbody>
            <tr><td>fc_session</td><td>Prijava u korisnički račun</td><td>30 dana</td></tr>
            <tr><td>fc_admin</td><td>Prijava administratora</td><td>12 sati</td></tr>
            <tr><td>fc_cart (lokalna pohrana)</td><td>Sadržaj košarice</td><td>Do brisanja</td></tr>
            <tr><td>fc_consent (lokalna pohrana)</td><td>Pamti vaš izbor u obavijesti o kolačićima</td><td>Do brisanja</td></tr>
          </tbody>
        </table>
        <h2>Analitički (samo uz privolu)</h2>
        <table>
          <thead><tr><th>Naziv</th><th>Svrha</th><th>Trajanje</th></tr></thead>
          <tbody>
            <tr><td>_ga</td><td>Google Analytics – razlikovanje posjetitelja</td><td>2 godine</td></tr>
            <tr><td>_ga_*</td><td>Google Analytics – stanje sesije</td><td>2 godine</td></tr>
          </tbody>
        </table>
        <p>Google Analytics pruža Google Ireland Ltd., Irska. Privolu možete u svakom trenutku povući putem poveznice „Postavke kolačića” u podnožju stranice. Uz to, osnovnu statistiku posjeta pratimo alatom Vercel Web Analytics, koji ne koristi kolačiće i ne identificira pojedine posjetitelje. Prilikom plaćanja preusmjeravamo vas na Stripe, koji koristi vlastite kolačiće prema svojoj politici privatnosti.</p>
        <p>Kolačiće možete obrisati ili blokirati u postavkama preglednika; u tom slučaju prijava i košarica možda neće raditi.</p>
      </>
    ),
  },

  shipping: {
    title: 'Dostava',
    body: ({ s, locale }) => (
      <>
        <ul>
          <li>Dostavljamo na adrese u Republici Hrvatskoj{s.shipEu ? ' i u države članice EU navedene u blagajni' : ''}.</li>
          <li>Cijena dostave: <b>{money(s.shippingCents, locale)}</b>. Za narudžbe od <b>{money(s.freeThresholdCents, locale)}</b> i više dostava je <b>besplatna</b>.{s.shipEu ? ` Dostava u ostale države EU: ${money(s.euShippingCents, locale)}.` : ''}</li>
          <li>Očekivani rok dostave: <b>{s.deliveryHr}</b>, a najkasnije 30 dana od sklapanja ugovora.</li>
          <li>Kad narudžba bude poslana, e-mailom vam šaljemo obavijest i, ako je dostupan, broj za praćenje pošiljke.</li>
          <li>Proizvodi se mogu slati izravno iz skladišta naših dobavljača, pa narudžba s više proizvoda može stići u više paketa.</li>
        </ul>
        <p>Za sva pitanja o dostavi pišite nam na <Mail />.</p>
      </>
    ),
  },

  returns: {
    title: 'Povrat i reklamacije',
    body: () => (
      <>
        <h2>Jednostrani raskid ugovora (14 dana)</h2>
        <p>Ugovor možete raskinuti u roku od 14 dana od dana primitka robe, bez navođenja razloga.</p>
        <ol>
          <li>Pošaljite nam izjavu o raskidu na <Mail />. Možete koristiti <Link href={href('hr', 'withdrawal')}>obrazac za jednostrani raskid</Link>.</li>
          <li>Poslat ćemo vam upute za povrat.</li>
          <li>Robu pošaljite najkasnije 14 dana nakon slanja izjave na adresu:</li>
        </ol>
        <ReturnAddr />
        <p>Izravne troškove povrata snosite vi. Povrat novca, uključujući trošak dostave, izvršavamo u roku od 14 dana od primitka izjave, istim sredstvom plaćanja, a možemo ga zadržati do primitka robe ili dokaza o slanju. Detalji su u <Link href={href('hr', 'terms')}>Uvjetima poslovanja</Link>.</p>
        <h2>Reklamacije (materijalni nedostaci)</h2>
        <p>Ako proizvod ima nedostatak, javite nam se na <Mail /> s brojem narudžbe, opisom i fotografijom nedostatka. Za materijalne nedostatke odgovaramo dvije godine od preuzimanja robe.</p>
        <h2>Pisani prigovor</h2>
        <p>Prigovor možete poslati e-mailom ili poštom na {SELLER.address}, {SELLER.postal} {SELLER.city}. Odgovaramo u roku od 15 dana.</p>
      </>
    ),
  },

  withdrawal: {
    title: 'Obrazac za jednostrani raskid ugovora',
    body: () => (
      <>
        <p>(Ispunite i pošaljite ovaj obrazac samo ako želite jednostrano raskinuti ugovor. Obrazac nije obavezan – dovoljna je bilo koja nedvosmislena izjava.)</p>
        <div className="card my-6 space-y-4 p-6 text-sm leading-loose print:border-black">
          <p>Za: {SELLER.legalName}, {SELLER.address}, {SELLER.postal} {SELLER.city}, e-mail: {SELLER.email}</p>
          <p>Ovim izjavljujem da jednostrano raskidam ugovor o kupoprodaji sljedeće robe:</p>
          <p>______________________________________________</p>
          <p>Broj narudžbe: ____________________</p>
          <p>Datum narudžbe / datum primitka robe: ____________________</p>
          <p>Ime i prezime potrošača: ____________________</p>
          <p>Adresa potrošača: ____________________</p>
          <p>Potpis potrošača (samo ako se obrazac šalje u papirnatom obliku): ____________________</p>
          <p>Datum: ____________________</p>
        </div>
      </>
    ),
  },

  contact: {
    title: 'Kontakt',
    body: () => (
      <>
        <p>Najbrže nas možete kontaktirati e-mailom: <Mail />. Odgovaramo u najkraćem mogućem roku, a najkasnije u roku od 15 dana za pisane prigovore.</p>
        <h2>Podaci o prodavatelju</h2>
        <Seller />
        <h2>Adresa za povrat robe</h2>
        <ReturnAddr />
      </>
    ),
  },
}

const en: Record<LegalDoc, Doc> = {
  terms: {
    title: 'Terms and Conditions',
    body: ({ s, locale }) => (
      <>
        <p><i>This is an English translation for information purposes. In case of any discrepancy, the Croatian version prevails.</i></p>
        <h2>1. General</h2>
        <p>These Terms govern the sale of products through the Firecase online shop (the “Shop”). The seller is:</p>
        <Seller en />
        <p>A buyer is any person who places an order in the Shop. A consumer is a buyer who is a natural person acting for purposes outside their trade or profession. By placing an order, the buyer confirms having read and accepted these Terms. Contracts are concluded in Croatian.</p>

        <h2>2. Products and prices</h2>
        <p>Products are described and shown as accurately as possible. Colours may differ slightly depending on your screen.</p>
        <p>All prices are in euro (EUR) and are final. {SELLER.vatNoteEn}</p>
        <p>Shipping costs are shown before the order is confirmed. For discounted products, the lowest price in the 30 days before the discount is also shown. The price valid at the time of the order applies. In case of an obvious pricing error, we will inform the buyer, who may cancel the order with a full refund.</p>

        <h2>3. Ordering and conclusion of the contract</h2>
        <ol>
          <li>The buyer adds products to the cart.</li>
          <li>At checkout, the buyer enters contact and delivery details and reviews the order. All details can be corrected before submitting.</li>
          <li>The buyer accepts these Terms and clicks “Order with obligation to pay” to proceed to payment.</li>
          <li>The contract is concluded once payment is confirmed. The buyer immediately receives an order confirmation by email, together with the invoice and information on the right of withdrawal.</li>
        </ol>
        <p>Order data is stored by the seller and is available to the buyer in the confirmation email and, if they have one, in their account. Creating an account is not required to buy.</p>

        <h2>4. Payment</h2>
        <p>Payments are processed by Stripe (Stripe Payments Europe Ltd., Ireland): credit and debit cards (Visa, Mastercard, Maestro and others), Apple Pay, Google Pay and PayPal. Availability may depend on your device and browser. Card details are entered directly with Stripe; the seller has no access to them. The order amount is charged when the order is placed. The invoice is issued electronically and sent by email.</p>

        <h2>5. Delivery</h2>
        <p>We deliver to addresses in Croatia{s.shipEu ? ' and to the EU member states listed at checkout' : ''}. Shipping within Croatia costs {money(s.shippingCents, locale)} and is free for orders of {money(s.freeThresholdCents, locale)} or more.{s.shipEu ? ` Shipping to other EU countries costs ${money(s.euShippingCents, locale)}.` : ''}</p>
        <p>Expected delivery time is {s.deliveryEn}. Products may be shipped directly from our suppliers’ warehouses; the seller remains responsible to the buyer for performance of the contract. Goods will be delivered no later than 30 days after the contract is concluded. If this is not possible, we will inform the buyer, who may terminate the contract and receive a refund without delay.</p>
        <p>The risk of loss or damage passes to the consumer when they, or a third party designated by them (other than the carrier), take possession of the goods. If a parcel is visibly damaged, please report it to the courier and contact us at <Mail />.</p>

        <h2>6. Right of withdrawal</h2>
        <p>Consumers may withdraw from the contract within 14 days without giving any reason. The period starts on the day the consumer, or a third party designated by them (other than the carrier), takes possession of the goods; for multiple goods delivered separately, from the day the last item is received.</p>
        <p>To withdraw, inform us by an unequivocal statement sent by email to <Mail /> or by post to our registered address. You may use the <Link href={href('en', 'withdrawal')}>withdrawal form</Link>, but it is not mandatory. The deadline is met if you send the notice before the period expires.</p>
        <p>Return the goods without undue delay and no later than 14 days after sending the withdrawal notice to:</p>
        <ReturnAddr en />
        <p>Please email us before sending so we can give you return instructions. <b>The consumer bears the direct cost of returning the goods.</b></p>
        <p>We will refund all payments received, including delivery costs, without undue delay and no later than 14 days from receiving the withdrawal notice, using the same payment method. We may withhold the refund until we have received the goods or proof that they have been sent back, whichever is earlier. The consumer is liable for any diminished value of the goods resulting from handling beyond what is necessary to establish their nature, characteristics and functioning.</p>

        <h2>7. Liability for defects</h2>
        <p>The seller is liable for material defects under the Croatian Civil Obligations Act for defects that appear within two years of the passing of risk. The buyer must notify the seller of a defect within two months of discovering it. The buyer may request repair, replacement, a price reduction or termination of the contract as provided by law. No commercial guarantee is given unless stated for a product. Statutory consumer rights cannot be excluded or limited.</p>

        <h2>8. Complaints</h2>
        <p>Consumers may file a written complaint by email to <Mail /> or by post to {SELLER.address}, {SELLER.postal} {SELLER.city}, Croatia. We will confirm receipt without delay and respond in writing within 15 days.</p>

        <h2>9. Out-of-court dispute resolution</h2>
        <p>We aim to resolve all disputes amicably. Consumers may contact the alternative dispute resolution bodies listed by the Croatian ministry responsible for consumer protection. The seller has not committed to participating in such proceedings but is willing to consider it case by case. Consumers may also contact the State Inspectorate.</p>

        <h2>10. Personal data</h2>
        <p>Personal data is processed in accordance with our <Link href={href('en', 'privacy')}>Privacy Policy</Link>.</p>

        <h2>11. Governing law</h2>
        <p>Croatian law applies. Consumers habitually resident in another EU member state keep the protection of the mandatory provisions of that state’s law. Disputes are subject to the competent court under Croatian law.</p>

        <h2>12. Final provisions</h2>
        <p>The seller may amend these Terms. Each order is governed by the Terms valid when it was placed. These Terms are valid from {LEGAL_DATE.en}.</p>
      </>
    ),
  },

  privacy: {
    title: 'Privacy Policy',
    body: () => (
      <>
        <p>This Policy explains how we collect and process personal data in accordance with the General Data Protection Regulation (GDPR) and Croatian law.</p>
        <h2>1. Controller</h2>
        <Seller en />
        <h2>2. Data we process</h2>
        <ul>
          <li><b>Orders:</b> name, email, mobile number, delivery address, products ordered, amount, payment method (no card data).</li>
          <li><b>Account (optional):</b> email, password (stored only as a cryptographic hash), saved delivery details, favorites.</li>
          <li><b>Communication:</b> content of emails you send us (e.g. complaints, returns).</li>
          <li><b>Technical data:</b> anonymised visit statistics (Vercel Web Analytics, cookieless), server security logs and, only with your consent, usage data via Google Analytics (pseudonymous identifier, pages, device, approximate location).</li>
        </ul>
        <h2>3. Purposes and legal bases</h2>
        <ul>
          <li>Performance of the contract – processing orders, delivery, returns, complaints (Art. 6(1)(b) GDPR).</li>
          <li>Legal obligations – issuing and keeping invoices, fiscalisation, accounting (Art. 6(1)(c)).</li>
          <li>Legitimate interest – site security, fraud prevention, anonymous visit statistics (Art. 6(1)(f)).</li>
          <li>User account – at your request, to provide the account service (Art. 6(1)(b)).</li>
          <li>Analytics via Google Analytics – based on your consent (Art. 6(1)(a)), which you may withdraw at any time.</li>
        </ul>
        <p>We do not send marketing messages and do not use your data for automated decision-making.</p>
        <h2>4. Recipients</h2>
        <ul>
          <li>Vercel Inc., USA – website hosting and anonymous statistics.</li>
          <li>Neon Inc. – database (data stored in the EU).</li>
          <li>Stripe Payments Europe Ltd., Ireland – payment processing; PayPal (Europe) S.à r.l. et Cie, S.C.A., Luxembourg – if you pay with PayPal.</li>
          <li>Google Ireland Ltd. – sending emails (order confirmations, invoices) and, with consent, Google Analytics.</li>
          <li>Suppliers and couriers – name, address and mobile number, for delivery only.</li>
          <li>Croatian Tax Administration – invoice data for fiscalisation; our accountant – invoices, if used.</li>
        </ul>
        <p>Transfers outside the European Economic Area (e.g. USA) are protected by appropriate safeguards such as the EU–US Data Privacy Framework or the European Commission’s standard contractual clauses.</p>
        <h2>5. Retention</h2>
        <ul>
          <li>Invoices and order data – at least 11 years, as required by accounting and tax law.</li>
          <li>User account – until you delete it (possible at any time in your account settings).</li>
          <li>Google Analytics – 14 months.</li>
          <li>Complaint and return correspondence – until limitation periods expire.</li>
        </ul>
        <h2>6. Your rights</h2>
        <p>You have the right of access, rectification, erasure, restriction, data portability and to object to processing based on legitimate interest. Send requests to <Mail />; we will reply within one month. Erasure does not apply to data we must keep by law (e.g. invoices).</p>
        <p>You may lodge a complaint with the Croatian Personal Data Protection Agency (AZOP), Selska cesta 136, 10000 Zagreb, <a href="https://azop.hr" target="_blank" rel="noopener noreferrer">azop.hr</a>, or with the supervisory authority in your country.</p>
        <h2>7. Security</h2>
        <p>The site uses an encrypted connection (HTTPS). Passwords are stored only as hashes and we do not store card data.</p>
        <h2>8. Changes</h2>
        <p>This Policy is valid from {LEGAL_DATE.en}. Changes will be published on this page.</p>
      </>
    ),
  },

  cookies: {
    title: 'Cookies',
    body: () => (
      <>
        <p>Cookies are small files a website stores in your browser. Necessary cookies and local storage are required for the site to work and, under Croatian law, do not require consent. Analytics cookies (Google Analytics) are only set if you accept them in the cookie notice. We do not use advertising cookies.</p>
        <h2>Necessary</h2>
        <table>
          <thead><tr><th>Name</th><th>Purpose</th><th>Duration</th></tr></thead>
          <tbody>
            <tr><td>fc_session</td><td>Customer login</td><td>30 days</td></tr>
            <tr><td>fc_admin</td><td>Administrator login</td><td>12 hours</td></tr>
            <tr><td>fc_cart (local storage)</td><td>Cart contents</td><td>Until deleted</td></tr>
            <tr><td>fc_consent (local storage)</td><td>Remembers your cookie choice</td><td>Until deleted</td></tr>
          </tbody>
        </table>
        <h2>Analytics (only with consent)</h2>
        <table>
          <thead><tr><th>Name</th><th>Purpose</th><th>Duration</th></tr></thead>
          <tbody>
            <tr><td>_ga</td><td>Google Analytics – distinguishes visitors</td><td>2 years</td></tr>
            <tr><td>_ga_*</td><td>Google Analytics – session state</td><td>2 years</td></tr>
          </tbody>
        </table>
        <p>Google Analytics is provided by Google Ireland Ltd., Ireland. You can withdraw consent at any time via the “Cookie settings” link in the footer. We also measure basic visit statistics with Vercel Web Analytics, which uses no cookies and does not identify individual visitors. At payment you are redirected to Stripe, which uses its own cookies under its privacy policy.</p>
        <p>You can delete or block cookies in your browser settings; login and cart may then not work.</p>
      </>
    ),
  },

  shipping: {
    title: 'Shipping',
    body: ({ s, locale }) => (
      <>
        <ul>
          <li>We deliver to addresses in Croatia{s.shipEu ? ' and to the EU member states listed at checkout' : ''}.</li>
          <li>Shipping: <b>{money(s.shippingCents, locale)}</b>. <b>Free</b> for orders of <b>{money(s.freeThresholdCents, locale)}</b> or more.{s.shipEu ? ` Other EU countries: ${money(s.euShippingCents, locale)}.` : ''}</li>
          <li>Expected delivery time: <b>{s.deliveryEn}</b>, and no later than 30 days after the contract is concluded.</li>
          <li>When your order ships we email you a notification and, if available, a tracking number.</li>
          <li>Products may ship directly from our suppliers’ warehouses, so an order with several products may arrive in several parcels.</li>
        </ul>
        <p>For any delivery questions, email us at <Mail />.</p>
      </>
    ),
  },

  returns: {
    title: 'Returns and complaints',
    body: () => (
      <>
        <h2>Right of withdrawal (14 days)</h2>
        <p>You may withdraw from the contract within 14 days of receiving the goods, without giving a reason.</p>
        <ol>
          <li>Send us a withdrawal statement at <Mail />. You may use the <Link href={href('en', 'withdrawal')}>withdrawal form</Link>.</li>
          <li>We will send you return instructions.</li>
          <li>Send the goods no later than 14 days after your statement to:</li>
        </ol>
        <ReturnAddr en />
        <p>You bear the direct cost of the return. We refund the full amount, including shipping, within 14 days of receiving your statement, using the same payment method; we may withhold it until we receive the goods or proof of sending. See our <Link href={href('en', 'terms')}>Terms and Conditions</Link>.</p>
        <h2>Defects</h2>
        <p>If a product is defective, email <Mail /> with your order number, a description and a photo. We are liable for material defects for two years from delivery.</p>
        <h2>Written complaints</h2>
        <p>Send complaints by email or by post to {SELLER.address}, {SELLER.postal} {SELLER.city}, Croatia. We respond within 15 days.</p>
      </>
    ),
  },

  withdrawal: {
    title: 'Withdrawal form',
    body: () => (
      <>
        <p>(Complete and return this form only if you wish to withdraw from the contract. Using the form is optional – any unequivocal statement is sufficient.)</p>
        <div className="card my-6 space-y-4 p-6 text-sm leading-loose">
          <p>To: {SELLER.legalName}, {SELLER.address}, {SELLER.postal} {SELLER.city}, Croatia, email: {SELLER.email}</p>
          <p>I hereby give notice that I withdraw from my contract of sale of the following goods:</p>
          <p>______________________________________________</p>
          <p>Order number: ____________________</p>
          <p>Ordered on / received on: ____________________</p>
          <p>Name of consumer: ____________________</p>
          <p>Address of consumer: ____________________</p>
          <p>Signature of consumer (only if this form is notified on paper): ____________________</p>
          <p>Date: ____________________</p>
        </div>
      </>
    ),
  },

  contact: {
    title: 'Contact',
    body: () => (
      <>
        <p>The fastest way to reach us is by email: <Mail />. We reply as soon as possible, and within 15 days for written complaints.</p>
        <h2>Seller details</h2>
        <Seller en />
        <h2>Return address</h2>
        <ReturnAddr en />
      </>
    ),
  },
}

export const LEGAL: Record<Locale, Record<LegalDoc, Doc>> = { hr, en }
