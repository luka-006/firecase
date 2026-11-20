# Prijedlozi proizvoda i setova preko GitHuba

Ovdje se dodaju novi proizvodi i setovi bez ručnog unosa u `/staff`.

- `staff/proposals/<slug>.json` je prijedlog proizvoda (polja kao u `lib/staff/proposal-schema.ts`).
- `staff/sets/<slug>.json` je prijedlog seta (polja kao u `lib/staff/set-proposal-schema.ts`).
- Slike mogu biti URL-ovi ili datoteke pored JSON-a, npr. `"images": ["./atelier/1.jpg"]`. JPG, PNG, WebP ili AVIF, najviše 4 MB.
- Datoteke koje počinju s `_` su primjeri i nikad se ne šalju.

## Tijek

1. Novi prijedlog ide na zasebnu granu i u pull request. GitHub provjeri sva polja i slike, ništa ne šalje.
2. Spajanjem u `main` prijedlog odlazi u shop sa statusom "na pregledu". Proizvod i dalje treba objaviti u adminu.
3. Svaki poslani prijedlog nosi oznaku `[github:staff/...]`, pa se ista datoteka ne šalje dvaput.

## Postavljanje (jednom)

U GitHubu: Settings > Secrets and variables > Actions > New repository secret, ime `STAFF_API_TOKEN`, vrijednost ista kao u Vercelu. Token se nigdje drugdje ne upisuje.

Ručno pokretanje: Actions > Staff proposals > Run workflow.

Lokalna provjera: `npx tsx scripts/staff-sync.ts --dry-run`
