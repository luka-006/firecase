# Setovi

Prijedlozi setova (na primjer „Set Trio” ili „Set Penta”) šalje asistent preko staff API-ja. Vlasnik ih pregledava u adminu pod karticom **Setovi** (`/admin/setovi`): prihvaćeni postaju zeleni i prelaze na popis prihvaćenih, odbijeni crveni na popis odbijenih. Komentar uz odbijanje nije obavezan.

Naziv kartice je konstanta `SET_ENTITY_LABEL` u `lib/setovi.ts`. Promjena tog stringa preimenuje karticu i natpise koji je koriste.

Prihvat otvara **neobjavljen** proizvod (`active = false`, `kind = set`) s predloženom cijenom, slikama, uključenim futrolama i oznakom besplatne dostave. Vlasnik ga objavljuje u `/admin/products` kad upiše što treba (GPSR, stara cijena ako set snižava u odnosu na prijašnju cijenu seta).

Na stranici seta:

- „Zasebno X €” zbroj je **trenutnih** cijena uključenih futrola
- najniža cijena u zadnjih 30 dana prikazuje se samo kad je upisana stara cijena seta (isto pravilo kao kod ostalih proizvoda)
- set s uključenom besplatnom dostavom ne naplaćuje dostavu, ni ispod praga od 40 €

Narudžba koja sadrži set u adminu nabraja uključene futrole. Svaka ima svoj link **Naruči na AE**.

Slike se prvo učitaju na postojeći `POST /api/staff/upload` (Bearer `STAFF_API_TOKEN`), a dobiveni URL-ovi idu u prijedlog.

## Primjer

```bash
# 1. Slika (ista ruta kao za prijedloge proizvoda)
curl -s -X POST https://firecase.net/api/staff/upload \
  -H "Authorization: Bearer $STAFF_API_TOKEN" \
  -F "file=@set-trio.jpg"

# 2. Prijedlog. 3 do 5 postojećih futrola, po id-u ili slugu.
curl -s -X POST https://firecase.net/api/staff/set-proposals \
  -H "Authorization: Bearer $STAFF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Set Trio",
    "shortHr": "Tri futrole u jednom setu.",
    "items": [
      { "slug": "zephyr" },
      { "productId": 12 },
      { "slug": "noir" }
    ],
    "images": ["https://xxxx.public.blob.vercel-storage.com/proposals/set-trio-abc.jpg"],
    "priceCents": 3990,
    "freeShipping": true,
    "sizeMix": "2× J6, 1× J5",
    "notes": "Prva slika je složeni kadar."
  }'

# 3. Popis (opcionalno ?status=review|draft|accepted|rejected)
curl -s https://firecase.net/api/staff/set-proposals \
  -H "Authorization: Bearer $STAFF_API_TOKEN"
```

`priceCents` je u centima (3990 = 39,90 €). `freeShipping` je pretpostavljeno `true`.

Odgovor računa žive iznose iz trenutnih cijena futrola:

- `resolved` — svaka uključena futrola s `nameHr`, `image`, `priceCents`, `costCents`; `missing: true` ako više ne postoji
- `separateCents` — zbroj zasebnih cijena, ili `null` ako neka futrola nedostaje
- `savingsCents` — `separateCents` minus cijena seta
- `costCents` — zbroj nabavnih cijena, ili `null` ako nekoj futroli nije upisana
- `marginCents` — cijena seta minus nabava
