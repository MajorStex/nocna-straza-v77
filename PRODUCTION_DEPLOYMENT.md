# Noćna Straža — produkcija na postojećem Cloudflare Worker-u

**Primarna adresa koju vlasnik igre otvara na telefonu:** https://nocna-straza-v77.stefanstevic1996.workers.dev/

**Worker name:** `nocna-straza-v77`; izvor `public/`; deploy konfiguracija `wrangler.jsonc`; release grana `main`.

**Ispravan GitHub Actions workflow:** `.github/workflows/worker-existing-production.yml`. Pokreće se pri izmeni igre na `main`, ima ručni `workflow_dispatch`, izričito proverava da je live Worker stariji ili iste verzije pre objave, koristi `wrangler deploy` za **isti Worker** i proverava live HTML naslov posle objave. Ne izdaje lažnu potvrdu ako nije uspeo deploy.

## Rešavanje automatske objave

U Cloudflare kontrolnoj tabli, za Worker `nocna-straza-v77`, pogledati **Settings > Builds** i poslednji neuspeli build; Cloudflare Git integracija postoji ali je na commitovima V138 i V140 prijavljivala **Build: Failed**. Proveriti Build i Deploy command i njegov log. Ako se koristi GitHub Actions kao alternativni put, podesi u repozitorijumu (nikad u kodu):
- `CLOUDFLARE_API_TOKEN`: token ograničen na ovaj nalog, sa **Workers Scripts: Edit** dozvolom.
- `CLOUDFLARE_ACCOUNT_ID`: ID istog Cloudflare naloga.

Secrets: https://github.com/MajorStex/nocna-straza-v77/settings/secrets/actions

**Važno:** izmena u GitHub repozitorijumu nije dokaz da je Worker live. Trenutna glavna grana ima V138. Razvojna V140 grana nije produkcija; odvojeni `nocna-straza-relay` V140 backend mora biti posebno testiran i objavljen pre nego što multiplayer bude proglašen spremnim. Ne prepisivati produkciju nedovršenim testnim modom.

---

## Sekundarni Cloudflare Pages sajt (nije korisnikov stalni link)

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
