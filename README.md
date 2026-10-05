# Firecase

Webshop za futrole za upaljače. Next.js 16 + Postgres (Neon) + Stripe + Vercel.

- Hrvatski na `/`, engleski na `/en`
- Admin panel na `/admin` (proizvodi, narudžbe, računi, postavke)
- Plaćanje: kartice, Apple Pay, Google Pay, PayPal (Stripe Checkout)
- Računi u PDF-u s fiskalizacijom (CIS Porezne uprave), storno računi kod povrata
- Korisnički računi (favoriti, povijest narudžbi, spremljena adresa)
- Pravne stranice: uvjeti poslovanja, privatnost, kolačići, dostava, povrat, obrazac za raskid

## Što još treba napraviti

Redom kojim bi trebalo ići. Detaljni koraci za svaku stavku su niže u ovom dokumentu.

**Obavezno prije prve prodaje**
- [ ] **Obrt:** upisati djelatnost trgovine na malo putem interneta; MBO upisati u `lib/config.ts` (`registryNumber`)
- [ ] **Vercel:** spojiti Neon (Frankfurt) i Blob, postaviti `AUTH_SECRET`, `ADMIN_PASSWORD`, `CRON_SECRET`, napraviti Redeploy i provjeriti da je zadnji deploy *Ready*
- [ ] **Baza:** u `/admin` ne smije biti žutog okvira s greškom; ako piše da tablice ne postoje, kliknuti *Kreiraj tablice u bazi*
- [ ] **Dobavljač:** odabrati (Temu ne dopušta dropshipping), dogovoriti rok dostave i dobiti GPSR podatke (proizvođač, odgovorna osoba u EU)
- [ ] **Proizvodi:** obrisati primjere, dodati prave fotografije, opise, veličine i cijene; rok dostave u `/admin/settings`
- [ ] **Stripe:** otvoriti račun kao obrt, uključiti kartice, Apple Pay, Google Pay i PayPal, postaviti `STRIPE_SECRET_KEY` i webhook (`STRIPE_WEBHOOK_SECRET`)
- [ ] **E-mail:** Gmail app password u `SMTP_PASS` (bez toga kupci ne dobivaju potvrdu narudžbe ni račun)
- [ ] **Fiskalizacija:** FINA certifikat (`FISCAL_CERT_BASE64`, `FISCAL_CERT_PASSWORD`), interni akt s oznakama poslovnog prostora i naplatnog uređaja, test u TEST okruženju pa prebacivanje na PRODUKCIJU; s knjigovođom potvrditi oznaku plaćanja za PayPal (`O`) i format QR koda
- [ ] **Pravni tekstovi:** dati na pregled pravniku ili knjigovođi
- [ ] **Probna kupnja:** Stripe test kartica `4242 4242 4242 4242`, provjeriti e-mail, PDF račun i povrat novca iz admina

**Nakon toga**
- [ ] **Domena:** registrirati (npr. `firecase.hr`), spojiti u Vercelu, promijeniti `NEXT_PUBLIC_SITE_URL` i URL webhooka u Stripeu
- [ ] **E-mail na domeni** (npr. `info@firecase.hr`) umjesto Gmaila
- [ ] **Google:** `NEXT_PUBLIC_GA_ID`, Search Console (`NEXT_PUBLIC_GSC_VERIFICATION`) i slanje `sitemap.xml`
- [ ] **Stripe live ključevi** umjesto test ključeva

**Moguće nadogradnje (nije napravljeno)**
- Kodovi za popust, newsletter, recenzije proizvoda
- Odabir BOX NOW paketomata u blagajni
- Automatsko slanje narudžbe dobavljaču
- Izvoz računa za knjigovođu (CSV), dvostupanjska prijava za admin

## Postavljanje na Vercel

1. **Import** – Vercel → Add New → Project → odaberi GitHub repo `firecase` → Deploy.
2. **Baza** – projekt → Storage → Create → **Neon (Postgres)**, regija **Frankfurt (eu-central-1)** → Connect. `DATABASE_URL` se postavi sam. Tablice se kreiraju automatski pri svakom deployu. Neon doda petnaestak varijabli (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `POSTGRES_URL`, `PGHOST`...); kod koristi samo `DATABASE_URL` (rezervno `POSTGRES_URL`), ostale ne diraj i ne briši.
3. **Slike** – Storage → Create → **Blob** → Connect. `BLOB_READ_WRITE_TOKEN` se postavi sam.
4. **Analytics** – projekt → Analytics → Enable.
5. **Environment Variables** (Settings → Environment Variables), popis je u `.env.example`:
   - `AUTH_SECRET` – nasumičan niz, npr. `openssl rand -base64 32`
   - `ADMIN_PASSWORD` – lozinka za `/admin`
   - `CRON_SECRET` – nasumičan niz
   - `NEXT_PUBLIC_SITE_URL` – npr. `https://firecase.hr` (nakon spajanja domene)
   - `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `ORDER_NOTIFY_EMAIL` – Gmail: Google račun → Sigurnost → uključi 2FA → *App passwords* → generiraj lozinku i stavi je u `SMTP_PASS`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` – vidi dolje
   - `NEXT_PUBLIC_GA_ID` – Google Analytics 4 Measurement ID (`G-...`); učitava se tek kad posjetitelj prihvati kolačiće
   - `NEXT_PUBLIC_GSC_VERIFICATION` – Google Search Console → HTML tag → vrijednost `content`
6. **Redeploy** (Deployments → ⋯ → Redeploy) nakon dodavanja varijabli.

## SEO

Nakon spajanja domene: Google Search Console → dodaj domenu → pošalji `https://TVOJA-DOMENA/sitemap.xml`.

## Stripe

1. Otvori račun na stripe.com kao obrt i završi aktivaciju.
2. Settings → Payment methods: uključi **Cards, Apple Pay, Google Pay, PayPal**.
3. Developers → API keys → `Secret key` → `STRIPE_SECRET_KEY`.
4. Developers → Webhooks → Add endpoint: `https://TVOJA-DOMENA/api/stripe/webhook`, događaji
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired` → `Signing secret` → `STRIPE_WEBHOOK_SECRET`.
5. Za testiranje koristi test ključeve (`sk_test_...`) i karticu `4242 4242 4242 4242`.

## Fiskalizacija

1. Nabavi FINA aplikacijski certifikat za fiskalizaciju (`.p12`).
2. `base64 -w0 certifikat.p12` → vrijednost u `FISCAL_CERT_BASE64`, lozinka u `FISCAL_CERT_PASSWORD` → Redeploy.
3. `/admin/settings` → **Provjeri certifikat**.
4. Upiši oznaku poslovnog prostora i naplatnog uređaja (kako je određeno internim aktom), okruženje **TEST**, uključi fiskalizaciju.
5. Napravi testnu narudžbu i provjeri da račun ima JIR (`/admin/invoices`).
6. Prebaci okruženje na **PRODUKCIJA**.

Računi koji se ne uspiju fiskalizirati (npr. CIS nedostupan) dobivaju ZKI i automatski se šalju ponovno (Vercel Cron jednom dnevno) ili ručno gumbom *Ponovi fiskalizaciju*.

## Domena

Vercel → Settings → Domains → dodaj domenu i postavi DNS zapise kako Vercel pokaže. Zatim promijeni `NEXT_PUBLIC_SITE_URL` i webhook URL u Stripeu.

## Prije puštanja u rad

- [ ] Djelatnost trgovine na malo putem interneta upisana u obrt
- [ ] MBO upisan u `lib/config.ts` (`registryNumber`)
- [ ] Obrisani primjeri proizvoda, dodani pravi proizvodi, fotografije i GPSR podaci (proizvođač / odgovorna osoba u EU)
- [ ] Rok dostave u `/admin/settings` prema stvarnom dobavljaču
- [ ] Fiskalizacija u PRODUKCIJI i testirana
- [ ] Stripe live ključevi, testna narudžba i povrat novca
- [ ] Pravne tekstove pregledao pravnik/knjigovođa

## Lokalni razvoj

```bash
cp .env.example .env.local   # upiši DATABASE_URL itd.
npm install
npm run migrate
npm run dev
```
