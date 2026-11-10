# Noćna Straža — jedina produkciona adresa i automatska objava

Produkcija: https://nocna-straza-igra.pages.dev/

Izvor: public/ direktorijum ovog repozitorijuma, branch main.
Automatska objava: .github/workflows/cloudflare-existing-pages.yml.

Svaka izmena u public/ pokreće: test verzije/JS/assets, regresione testove,
objavu *postojećeg* Cloudflare Pages projekta `nocna-straza-igra`
i HTTP proveru da li je novi build zaista live. Zajednički URL se ne menja.
Nove /vNNN/ GitHub Pages putanje nisu zvanična produkcija.

## Jednokratno povezivanje Cloudflare-a sa GitHub Actions

1. U Cloudflare dashboard-u izaberi odgovarajući account i kreiraj
   API token sa **Account > Cloudflare Pages > Edit** za taj account.
   https://dash.cloudflare.com/profile/api-tokens
2. U Cloudflare dashboard-u pronađi **Account ID** za isti account koji
   poseduje projekat `nocna-straza-igra`.
3. U GitHub repozitorijumu otvori:
   https://github.com/MajorStex/nocna-straza-v77/settings/secrets/actions
   Kreiraj **dva** repository Actions secrets:
   - `CLOUDFLARE_API_TOKEN` = token iz koraka 1
   - `CLOUDFLARE_ACCOUNT_ID` = account ID iz koraka 2
4. Samo za trenutno čekajuću objavu, idi na:
   https://github.com/MajorStex/nocna-straza-v77/actions/workflows/cloudflare-existing-pages.yml
   i klikni **Run workflow** na main.

Posle ove jednokratne veze, svaki sledeći push u public/ automatski
objavljuje igru bez ručnog deploya. Nikada ne lepiti token u chat, commit,
README, Pages fajl ili u kod igre.

## Provera

Workflow **mora** biti zelen tek posle objave i HTTP potvrde produkcione
verzije. Ako secrets nisu podešeni, workflow namerno pada, umesto da
lažno prijavi uspeh kao što se ranije dešavalo. Artifakt ZIP nije deployment.

Trenutna pozicija oznake verzije: mala sivo-zelena oznaka u dnu igre i
iznad donje trake Village-a. Broj potiče iz <title> HTML-a.
Samo promena broja u GitHub kodu ne dokazuje da je javni sajt ažuriran.

Za mobilni shortcut koristi se *uvek ista* produkciona adresa, bez /v130/
ili drugih verzionisanih direktorijuma. `public/_headers` zahteva
revalidaciju HTML-a pri narednom otvaranju shortcut-a.

Posebni Cloudflare Worker/relay projekti imaju odvojene deploy tokove;
njih ne treba prisilno deployovati pre objave Pages frontenda.
