# Firecase

Webshop za futrole za upaljače. Next.js 16 + Postgres (Neon) + Stripe + Vercel.

- Hrvatski na `/`, engleski na `/en`
- Admin panel na `/admin` (proizvodi, narudžbe, računi, postavke)
- Plaćanje: kartice, Apple Pay, Google Pay, PayPal (Stripe Checkout)
- Računi u PDF-u s fiskalizacijom (CIS Porezne uprave), storno računi kod povrata
- Korisnički računi (favoriti, povijest narudžbi, spremljena adresa)
- Automatski prijevod opisa proizvoda s hrvatskog na engleski u adminu (DeepL)
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
- [ ] **E-mail:** Resend (`RESEND_API_KEY`), verificirana domena `firecase.net`, `MAIL_FROM=Firecase <info@firecase.net>` (bez toga kupci ne dobivaju potvrdu narudžbe ni račun)
- [ ] **Fiskalizacija:** FINA certifikat (`FISCAL_CERT_BASE64`, `FISCAL_CERT_PASSWORD`), interni akt s oznakama poslovnog prostora i naplatnog uređaja, test u TEST okruženju pa prebacivanje na PRODUKCIJU; s knjigovođom potvrditi oznaku plaćanja za PayPal (`O`) i format QR koda
- [ ] **Pravni tekstovi:** dati na pregled pravniku ili knjigovođi
- [ ] **Probna kupnja:** Stripe test kartica `4242 4242 4242 4242`, provjeriti e-mail, PDF račun i povrat novca iz admina

**Nakon toga**
- [ ] **Domena:** `firecase.net` spojiti u Vercelu, `NEXT_PUBLIC_SITE_URL`, Stripe webhook
- [ ] **Resend:** provjeri DNS (SPF/DKIM) na `firecase.net` i test pošiljatelja `info@firecase.net`
- [ ] **Google:** `NEXT_PUBLIC_GA_ID`, Search Console (`NEXT_PUBLIC_GSC_VERIFICATION`) i slanje `sitemap.xml`
- [ ] **Stripe live ključevi** umjesto test ključeva
- [ ] **Automatski prijevod:** račun na deepl.com/pro-api (plan *DeepL API Free*), ključ u `DEEPL_API_KEY`, Redeploy

**Moguće nadogradnje (nije napravljeno)**
- Kodovi za popust, newsletter, recenzije proizvoda
- Odabir BOX NOW paketomata u blagajni
- Automatsko slanje narudžbe na AliExpress (AliExpress DS API; zasad pomoćnik za ručno naručivanje)
- Izvoz računa za knjigovođu (CSV), dvostupanjska prijava za admin

## Kako obraditi narudžbu (AliExpress)

1. Stigne e-mail „Nova narudžba“. U `/admin` je vidiš pod **Za naručiti**.
2. Otvori narudžbu → **Otvori na AliExpressu** (link spremljen uz proizvod) → odaberi opciju koja piše uz stavku i količinu.
3. Na AliExpressu kao adresu dostave upiši kupčevu: klik na polje u adminu ga kopira (ime, mobitel, ulica, poštanski broj, grad, županija, država). Kopiraj i napomenu prodavaču.
4. Plati na AliExpressu i broj AliExpress narudžbe upiši u admin → narudžba prelazi u **Čeka slanje**.
5. Kad prodavač pošalje, u adminu **Potvrdi slanje** (dostavna služba, broj za praćenje, opcionalna poveznica) — kupac dobije e-mail „Vaša narudžba je poslana”.

Uz svaki proizvod u adminu upiši **link na AliExpressu** i **nabavnu cijenu** (za izračun zarade), a uz veličine opciju koju treba odabrati na AliExpressu (`HR naziv | EN naziv | AliExpress opcija`).

## GPSR (AliExpress)

Uz proizvod u adminu upiši **proizvođača** i **odgovornu osobu u EU** s oglasa (Compliance / EU responsible person). Bez toga artikl ne stavljaj u prodaju.

## Postavljanje na Vercel

1. **Import** – Vercel → Add New → Project → odaberi GitHub repo `firecase` → Deploy.
2. **Baza** – projekt → Storage → Create → **Neon (Postgres)**, regija **Frankfurt (eu-central-1)** → Connect. `DATABASE_URL` se postavi sam. Tablice se kreiraju automatski pri svakom deployu. Neon doda petnaestak varijabli (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `POSTGRES_URL`, `PGHOST`...); kod koristi samo `DATABASE_URL` (rezervno `POSTGRES_URL`), ostale ne diraj i ne briši.
3. **Slike** – Storage → Create → **Blob** (pristup **Public**) → Connect. Vercel postavi `BLOB_READ_WRITE_TOKEN` ili `BLOB_STORE_ID`; kod radi s oba.
4. **Analytics** – projekt → Analytics → Enable.
5. **Environment Variables** (Settings → Environment Variables), popis je u `.env.example`:
   - `AUTH_SECRET` – nasumičan niz, npr. `openssl rand -base64 32`
   - `ADMIN_PASSWORD` – lozinka za `/admin`
   - `CRON_SECRET` – nasumičan niz
   - `NEXT_PUBLIC_SITE_URL` – `https://firecase.net` (nakon spajanja domene)
   - `RESEND_API_KEY`, `MAIL_FROM` (default `Firecase <info@firecase.net>`), `ORDER_NOTIFY_EMAIL` – Resend dashboard → API Keys; verificiraj domenu prije produkcije
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` – vidi dolje
   - `NEXT_PUBLIC_GA_ID` – Google Analytics 4 Measurement ID (`G-...`); učitava se tek kad posjetitelj prihvati kolačiće
   - `NEXT_PUBLIC_GSC_VERIFICATION` – Google Search Console → HTML tag → vrijednost `content`
6. **Deployment Protection** – Settings → Deployment Protection: za **Production** isključi Vercel Authentication (shop mora biti javan na `firecase.net`). Za **Preview** može ostati uključeno.
7. **Redeploy** (Deployments → ⋯ → Redeploy) nakon dodavanja varijabli.

## SEO

Nakon spajanja domene: Google Search Console → dodaj domenu → pošalji `https://TVOJA-DOMENA/sitemap.xml`.

## Stripe (zaseban račun za Firecase)

Koristi **novi Stripe račun** vezan uz obrt / Firecase (ne miješaj s drugim projektima).

1. stripe.com → registracija kao **Kasalo Digital / Firecase** (podaci obrta, IBAN).
2. Settings → Business → public business name **Firecase**; Settings → Branding → logo/boje (opcionalno).
3. Settings → Payment methods: **Cards, Apple Pay, Google Pay, PayPal**.
4. Developers → API keys → **Restricted key** ili Secret key samo za ovaj Vercel projekt → `STRIPE_SECRET_KEY`.
5. Webhooks → endpoint `https://firecase.net/api/stripe/webhook`, događaji:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired` → `STRIPE_WEBHOOK_SECRET`.
6. Test: `sk_test_...`, kartica `4242 4242 4242 4242`. Na izvodu: descriptor **FIRECASE** (postavljeno u kodu).
7. Live: zamijeni test ključeve live ključevima i ažuriraj webhook URL na produkcijskoj domeni.

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
