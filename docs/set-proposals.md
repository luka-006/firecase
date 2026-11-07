# Setovi

Prijedlozi setova (na primjer „Set Trio” ili „Set Penta”) šalje asistent preko staff API-ja. Vlasnik ih pregledava u adminu pod karticom **Setovi** (`/admin/setovi`): prihvaćeni postaju zeleni i prelaze na popis prihvaćenih, odbijeni crveni na popis odbijenih. Komentar uz odbijanje nije obavezan.

Naziv kartice je konstanta `SET_ENTITY_LABEL` u `lib/setovi.ts`. Promjena tog stringa preimenuje karticu i natpise koji je koriste.

Prihvat otvara **neobjavljen** proizvod (`active = false`, `kind = set`) s predloženom cijenom, slikama, uključenim futrolama i oznakom besplatne dostave. Vlasnik ga objavljuje u `/admin/products` kad upiše što treba (GPSR, stara cijena ako set snižava u odnosu na prijašnju cijenu seta).

Na stranici seta:

- „Zasebno X €” zbroj je **trenutnih** cijena uključenih futrola
- najniža cijena u zadnjih 30 dana prikazuje se samo kad je upisana stara cijena seta (isto pravilo kao kod ostalih proizvoda)
- set s uključenom besplatnom dostavom ne naplaćuje dostavu, ni ispod praga od 40 €

Narudžba koja sadrži set u adminu nabraja uključene futrole. Svaka ima svoj link **Naruči na AE**.

Slike se prvo učitaju na postojeći `POST /api/staff/upload` (Bearer `STAFF_API_TOKEN`), a dobiveni URL-ovi idu u prijedlog. Novi prijedlog se ne otvara kad treba samo zamijeniti slike: `PATCH /api/staff/set-proposals` mijenja isključivo `images` na postojećem prijedlogu koji je još na čekanju (`draft` ili `review`).

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

## Zamjena slika

`PATCH /api/staff/set-proposals` zamjenjuje cijeli popis slika. Naziv, opis, stavke, cijena, `freeShipping`, bilješke i status ostaju kakvi jesu. Prihvaćen ili odbijen prijedlog se ne dira, niti proizvod koji je iz njega nastao. Tijelo smije imati samo `id` i `images`.

```bash
curl -s -X PATCH https://firecase.net/api/staff/set-proposals \
  -H "Authorization: Bearer $STAFF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 4,
    "images": [
      "https://xxxx.public.blob.vercel-storage.com/proposals/set-trio-v4.jpg",
      "https://xxxx.public.blob.vercel-storage.com/proposals/set-trio-j5-v4.jpg"
    ]
  }'
```

Odgovor `200`:

```json
{
  "proposal": {
    "id": 4,
    "status": "review",
    "nameHr": "Set Trio",
    "shortHr": "Tri futrole u jednom setu.",
    "images": [
      "https://xxxx.public.blob.vercel-storage.com/proposals/set-trio-v4.jpg",
      "https://xxxx.public.blob.vercel-storage.com/proposals/set-trio-j5-v4.jpg"
    ],
    "priceCents": 3990,
    "freeShipping": true,
    "sizeMix": "2× J6, 1× J5",
    "notes": "",
    "productId": null
  }
}
```

`resolved`, `separateCents`, `savingsCents`, `costCents` i `marginCents` dolaze uz to, isto kao kod `POST`.

| Status | Kada |
| --- | --- |
| 401 | Nema ili ne valja `Authorization: Bearer` |
| 400 | JSON nije ispravan, nema `id`/`images`, URL nije `http(s)`, popis je prazan ili ima više od 12 slika, ili tijelo ima još koje polje |
| 404 | Prijedlog s tim `id` ne postoji |
| 409 | Status nije `draft` ni `review` (prihvaćeno ili odbijeno) |
