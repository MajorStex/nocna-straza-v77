# Noćna Straža v92 — Public Lobby Browser + dnevni/nedeljni izazovi

## Dnevni i nedeljni ciljevi
- Dnevni izazov: jedan od četiri mala cilja (40 ubistava, šesti talas, 5 crva ili 2 sanduka). Posle završetka **1 poen časti**, najviše jednom u kalendarskom danu po profilu.
- Nedeljni izazov: jedan od četiri teža cilja (220 ubistava, 16. talas, 2 trola ili 6 sanduka). Posle završetka **jedan običan (Common) predmet u postojećoj Oružarnici**, najviše jednom za kalendarsku nedelju po profilu.
- Osvežavanje ciljeva po kalendaru Europe/Belgrade (dnevni od 00:00; nedeljni ponedeljkom). Koji izazov se bira odlučuje se deterministički iz datuma.
- Solo i co-op: host autoritativno potvrđuje ostvarenje, gost vidi rezultat u sinhronizovanom snapshot-u. Nema dodatnih poruka na svakom ubistvu i nema retkih predmeta.
- Profil i ostvarene nagrade čuvaju se pod odvojenim ključevima, uključujući automatsku postojeću Firebase sinhronizaciju. Idempotentna dodela; nema dupliranja posle reconnect-a, resume-a ili promene domaćina.

## Lista javnih soba / Create Game / Join Game
- Nova mobilna lista prikazuje ime sobe, kod, broj igrača 1–6, status, težinu, režim i katanac.
- **Podrazumevano javno, bez šifre.** Host bira naziv, 2–6 maksimalno, javna/privatna i opciono šifru od 4 do 32 karaktera. Šifra se proverava samo server-side, TLS WebSocket, čuva se kao salted SHA-256.
- Stari kod od 6 karaktera i dalje radi; isti server može da se pronađe iz liste ili preko koda; kada je zaključan, u oba slučaja je potrebna šifra.
- Lista se traži samo dok je ekran otvoren i vidljiv; automatsko osvežavanje najviše jednom na 60 s; ručno osvežavanje najmanje 12 s razmaka. Nema novih per-frame ili per-hit mrežnih poziva.
- Cloudflare Durable Object čuva samo metapodatke, maksimalno 50 prikazanih soba, 85 s TTL, ograničenje broja konekcija, per-IP limiter i zaštitu od pogrešnih šifara. Stara relay mreža i FRNDSS prijatelji nisu menjani po protokolu.
- **Ograničenje trenutne objave:** frontend sa browserom može biti objavljen na GitHub Pages, ali trenutni Cloudflare relay još uvek nema v92 Directory nadogradnju. GitHub repozitorijum relaya ima kod i integracione testove; automatski Cloudflare deploy je preskočen jer `CLOUDFLARE_API_TOKEN` nije konfigurisan u GitHub Actions. Dok se server ne objavi, lista jasno pokazuje da nije dostupna, zaključavanje soba se ne dozvoljava, a ulazak preko koda ostaje ispravan. Ne objavljivati backend bez odgovarajućih credentials i smoke testova.

## Testovi
- GitHub Actions: lokalni Worker testovi (WebSocket, 8 prijatelja, šifre, punoća, čuvanje privatnosti, 429 limits), solo/MP simulacije 6 igrača, achievementi.
- Nije potvrđen višetelefonski test sa šest realnih uređaja niti stvarni FPS u produkciji.
- Igra: https://majorstex.github.io/nocna-straza-v92/
- Worker source: privatni repo MajorStex/nocna-straza-relay.

---

# Noćna Straža v91 — dostignuća i obični predmeti (7. novembar 2026.)

## Novi achievement sistem
12 timskih ciljeva (solo igrač je tim od jednog): ubij 100, 200, 350, 500, 750 i 1.000 protivnika u jednoj partiji; prvi Trol Goblin; 10 crva-pljuvača; 10. i 20. talas; 5 otvorenih sanduka; oživi saigrača u co-opu. Napredak i nazivi su dvojezični (engleski podrazumevano, srpski izbor).

Svako dostignuće daje **jedan trajno sačuvan predmet Common/Običan** u postojećoj Oružarnici, samo prvi put na nalogu. Tri nova skromna predmeta: Izviđački zavoj (+10 HP), Patrolni buzdovan (+3 damage i +4 range) i Lovčeva amajlija (+1% crit, +3 range). Preostale nagrade biraju se među postojećim običnim oklopima, oružjem i amajlijama. Nema retkih/legendarnih nagrada niti neograničenog farmanja.

U co-opu host potvrđuje timski napredak i šalje kompaktnu 12-bitnu masku nagrada; svih šest igrača zadržava odvojenu evidenciju vezanu za profil, a ponovno slanje snapshot-a / rejoin / rezervni host ne može da duplicira predmete. Nagrade iz Oružarnice mogu se opremiti pre sledeće partije.

Stari cloud save, Google login, stara dostignuća, statistika i prethodni v90 ostaju netaknuti. Solo nastavak čuva novi napredak i prihvata starije sačuvane partije.

## Testiranje
Automatski regresioni testovi za sintaksu sva četiri HTML skripta, 12 achievement uslova, granice za ubistva, Common item retkost, solo resume, 1 host + 5 simuliranih klijenata, host-migration, retransmisiju i odvojene korisničke profile.

Ovo nije merilo stvarnog FPS-a niti stvarni test šest fizičkih telefona. Pre velikog testa s drugarima preporučuje se provera na 4G/5G i povratak u sobu posle prekida.

Javni link: https://majorstex.github.io/nocna-straza-v91/

---

# Noćna Straža v90 — optimizovani HP barovi i pregled stabilnosti

## HP iznad neprijatelja
- **Trol:** HP bar kada je na ekranu i na ≤520 svetskih jedinica od heroja. Ime + HP / MAX HP na ≤290, bez teksta na većoj daljini.
- **Brute:** HP bar samo kada je povređen i udaljen ≤310; maksimum 4 Brute indikatora po kadru. Na `low` grafici i kada ima preko 45 neprijatelja Brute HP indikatori se preskaču.
- **Boss/Rotfiend:** zadržava raniji veliki HP HUD. Obični goblini nemaju stalne trake.
- Canvas fillRect bez novih HTML čvorova, senki i gradijenata u petlji; provera vidljivosti se koristi iz već postojećeg renderera; nema novih mrežnih paketa. Guest koristi `m.hp`/`m.maxHp` iz postojećeg host snapshot-a.
- Dvojezični TROL/TROLL, bez menjanja cloud-save ključeva ili inventara. Novi multiplayer handshake `v90` zahteva da svi učesnici otvore v90.

## Provere i ograničenja
- Automatski testovi: JS sintaksa, wave 10 spawn, limit trolova, različite vrste oružja i DPS, prikaz HP-a i multiplayer paket sa HP poljima.
- End-to-end automatska provera javnog GitHub Pages linka i Firebase statičkih fajlova.
- Stvarni FPS, multiplayer lag na šest različitih telefona i svi korisnički tokovi nisu potvrđeni realnim uređajima. Cloudflare relay podešavanje nije menjano.
- Javno objavljivanje: `https://majorstex.github.io/nocna-straza-v90/`; test trola bez čekanja ostaje u staroj v89 test putanji.

---

# Noćna Straža v89 — Trol od 10. talasa

- Novi **trol goblin**: proceduralni hod nogama i rukama, usporeno kretanje, veći ali ne ogroman, ograničen na 2 istovremeno pre talasa 20 i 3 kasnije. Garantovani prvi susret u talasu 10.
- **Balans**: bazni HP 132, brzina 69, osnovni udarac 15; postojeći sistem težina Easy / Normal / Hard / Nightmare automatski utiče na trola. Zamah se priprema 0,52 s i može se izbeći udaljavanjem.
- **Nagrade**: četiri XP fragmenta; 11% šanse da ispadne Trolov toljag ili Trolov teški malj (ako limit drops dozvoljava). Oružja daju jači udarac ali sporiji napad.
- **Poređenje**: kad igrač priđe oružju, bira Uzmi/Ostavi i upoređuje štetu, napade u sekundi, DPS, domet i širinu zamaha; staro aktivno oružje ostaje kao rezervno. Domaćin proverava mrežni zahtev gosta.
- Postojeće privatno čuvanje, Google prijava, jezici i druge funkcije ostaju. Stari profili nisu brisani.
- Testovi: automatizovani GitHub Actions sintaksni i simulirani testovi prošli. Nije testirano na 6 pravih telefona.
- Za objavljivanje koristi se `MajorStex/MajorStex.github.io/nocna-straza-v89/`, a ovaj repo čuva izvor.

---

# Noćna Straža v88 — mobilne optimizacije (7.11.2026)

v88 čuva sve postojeće naloge, sinhronizaciju, multiplayer protokol, karaktere i napredak. Ubrzano je crtanje rekvizita preko jednog izračunavanja vidljivog polja, keširan je prikaz veličine ekrana i vinjeta; uklonjena je nepotrebna linijska provera prepreka van dometa napada, usporavanje neprijatelja računa se samo jednom po kadru, a grafički efekti koji nisu vidljivi ne crtaju se.

- **Izvor:** `public/index.html`, verzija 88.
- **Verzionisana putanja:** `public/v88/index.html`, koja ostaje na istom domenu i preusmerava na ažurnu igru.
- **GitHub Pages:** dodat je `.github/workflows/publish-pages.yml` za automatski deploy na push.
- **Važno:** pri kreiranju v88 potvrđeno je da GitHub Pages nije prethodno aktiviran; podrazumevani GitHub Actions token nema pravo da ga prvi put uključi (Resource not accessible by integration). Posle jednokratnog uključivanja Pages -> Source: GitHub Actions, naredni push bi trebalo samostalno da objavljuje. Cloudflare Workers nije potvrđen kao automatski povezan.
- **Provera:** sva 4 interna JavaScript bloka parsiraju se bez sintaksnih grešaka; automatizovani check je prošao. Stvarni FPS i latency na 6 fizičkih telefona nisu mereni.

---

# Noćna Straža v87 — Cloud profil + Google prijava

Mobilna HTML igra (do 6 igrača u multiplayeru), sa dekorativnim kamenčićima iz v81, lobby chatom i optimizacijama iz v80.

**Prijava**: Firebase Authentication (email/lozinka, Google, verifikacija emaila, reset lozinke, zadržavanje prijave, povezivanje Google naloga).
**Napredak**: Cloud Firestore — po jedan bezbedan privatni direktorijum po korisniku, sinhronizacija lokalnih sačuvanih podataka u delovima, rezervne kopije JSON. Podaci su korisnički kontrolisani, ne dokazuju automatski poštene multiplayer nagrade.
**Hosting**: Cloudflare Workers Static Assets (ili postojeći GitHub Pages).

## Jedan klik: objavljivanje verzije

[**🚀 Deploy v87 to Cloudflare**](https://deploy.workers.cloudflare.com/?url=https://github.com/MajorStex/nocna-straza-v77)

Ovo objavljuje novu verziju koda, **ali samo po sebi NE aktivira Firebase prijavu**. Potreban je jednokratni vlasnički setup ispod. Cloudflare može da napravi novi Worker i dodeli novi `workers.dev` URL; ovo ne garantuje zamenu starog `pages.dev` sajta.

## Jednokratno podešavanje na telefonu (vlasnik igre)

1. Otvori https://console.firebase.google.com/ -> **Create project** -> izaberi **Spark / no-cost**. Projekat nazovi recimo `nocna-straza-accounts`.
2. Firebase -> **Build / Authentication** -> **Get started**, zatim u **Sign-in method** uključi **Email/Password** i **Google**. Za Google izaberi kontakt email. U **Settings -> Authorized domains** dodaj javni domen igre (npr. `majorstex.github.io`; kasnije i tačan `IME.wORKERS.dev`). Bez ovoga Google prijava neće raditi.
3. Firebase -> **Firestore Database** -> **Create database** -> izaberi standardni Firestore u **production mode**, podrazumevanu bazu, i lokaciju blizu korisnika. Otvori karticu **Rules**.
4. Kopiraj **celokupan tekst** datoteke [`firestore.rules`](./firestore.rules) u Firebase Rules i klikni **Publish**. Ovo je neophodno da svaki igrač može da čita i piše samo sopstvene podatke.
5. Firebase -> **Project settings** (zupčanik) -> **Your apps** -> **Web app (`</>`)** -> Register app. U prikazanom `firebaseConfig` kopiraj javna polja `apiKey`, `authDomain`, `projectId` i `appId`.
6. Otvori **[GitHub fajl za konfiguraciju](https://github.com/MajorStex/nocna-straza-v77/edit/main/public/firebase-config.js)** -> nalepi četiri vrednosti u navodnicima -> **Commit changes**. Ne ubacuj privatne server ključeve, JSON service account niti lozinke.
7. Objavi / ponovo objavi Cloudflare Worker koristeći link gore ili sačekaj GitHub integraciju ako je automatski deploy uključen. Poseti URL Workers projekta. Ako koristiš i GitHub Pages, iste javne Firebase vrednosti treba da budu u `nocna-straza-v87/firebase-config.js` u tom repozitorijumu.
8. U igri odaberi **SIGN UP / REGISTRACIJA**, probaj svoj email, proveri poruku za potvrdu, prijavi se na drugom telefonu i proveri vraćanje napretka. Onda probaj Google, reset lozinke i zadržavanje prijave.

**Korisnik ne čuva stvarnu lozinku u fajlu igre.** Opcija „Zapamti me” čuva Firebase sesiju, a čuvanje same lozinke nudi Chrome/Android password manager.

## Gde su podaci i ograničenja

- Primarni cloud zapis: Firebase Firestore `users/{uid}/saves/{encodedKey}~{part}`. Sigurnosna pravila ograničavaju pristup na sopstveni `uid`, uz ograničenja tipova/veličine.
- Firebase Authentication čuva naloge/lozinke; HTML igra **ne čuva lozinke**. Firebase Web config nije tajna, ali Firestore rules MORAJU biti objavljena.
- Svaki profil može da prebaci istorijski lokalni napredak **sa iste adrese/domena pregledača** pri prvom povezivanju. Drugi domen (`workers.dev` vs `github.io` vs `pages.dev`) ima odvojenu memoriju — za prelaz koristi JSON export/import, ako imaš pristup starom profilu na originalnom domenu.
- Neke stvari su lokalne dok se ne razvije poseban medijski backend: **snimljeni glasovi u IndexedDB nisu automatski deo cloud sinhronizacije**. Snimke treba ponovo importovati na novom telefonu. Igra i dalje čuva zvuk na uređaju.
- Pristup oblaku traži internet. Ako Cloud ne radi, lokalni napredak ostaje na telefonu; pre brisanja podataka preglednika izvezi JSON backup.
- Firebase Spark i Firestore besplatni nivo imaju kvote i ograničenja i mogu pauzirati cloud operacije kada se prekorače. Za ozbiljan produkcioni shop/prodaju i anti-cheat nagrade potreban je dodatni server-autoritativni sistem.

## Fajlovi

- `public/index.html` — kompletna HTML igra v87 sa novim ekranima naloga.
- `public/auth-v87.js` — klijentska autentifikacija, sinhronizacija i backup.
- `public/firebase-config.js` — Firebase javna konfiguracija, za uređivanje.
- `firestore.rules` — pravila privatnosti i veličine korisničkih zapisa.
- `wrangler.jsonc` — Cloudflare static assets configuration.
- `package.json` — deploy preko Wrangler-a.

## Testiranje

Browser simulacije sa lažnim Firebase servisom proveravaju UI, kreiranje naloga, reset lozinke, Google, import profila, cloud čuvanje u delovima, brisanje i slučaj kada Firebase projekat još nije podešen. **Nije izvršen stvarni produkcioni Firebase login** jer korisnički Firebase projekat još nije podešen.

## v87 mobile login UI fix
- When Firebase is not configured, hide the unusable email/password and Google buttons.
- Display a compact guest-play button, collapsible local-save export, and step-by-step owner setup guide.
- Email/Google/Forgot Password and cloud saves only become active after Firebase configuration and security rules are installed.

## Android Back / Nazad (v87)

- Sistemsku Android strelicu **Nazad** igra obrađuje unutar ekrana kroz History API (`popstate`).
- Ekran naloga: sa registracije na prijavu, zatim na lokalnu igru.
- Podešavanja, lobby, editor, mapa, profil i priprema partije: Back zatvara jedan nivo.
- Tokom borbe: prvi Back otvara pauzu, sledeći nastavlja igru.
- Na glavnom meniju: prvi Back prikazuje upozorenje, drugi u roku od 2.2 sekunde dopušta izlaz iz browsera. Android in-app browser može drugačije reagovati.
- Novo vidljivo dugme BACK / NAZAD je prisutno u podmenijima, ali ne zaklanja izbor jezika na glavnom meniju.

## v87: smanjen lag kod gostiju

- Na uskim mobilnim ekranima podloga se kešira u malim determinističkim Canvas pločicama; na velikim ekranima koristi se direktno crtanje da se izbegne usporenje usled skaliranja velikih slika.
- Keš čuva samo vizuelne piksele. Ne zamrzava neprijatelje, sudare, štetu ili multiplayer stanje.
- Rezervna migraciona slika celog sveta šalje se na oko 5,2 sekunde umesto na 3 sekunde; važi prozor svežine 9,5 sekundi.
- Položaji neprijatelja za mrežne snimke šalju se na desetinku piksela radi manje vidljivog poskakivanja.
- Prikaz ikonica sposobnosti kod gostiju ne rekreira se posle svakog nepromenjenog snimka.
- Browser testovi: 14/14 sa tri učesnika pri normalnom opterećenju u ranijem prolazu; 23/23 u protokolskom testu šest igrača sa simuliranim kašnjenjem i isključenim Canvas crtanjem. Uporedni lokalni Canvas test: 390×820 je ubrzan, dok je veliki ekran sačuvan na staroj metodi.
- Ovo nije test na šest fizičkih telefona ili javnom Cloudflare relay serveru. Pravi FPS i ping zavise od telefona, mreže i poslužitelja.

**Objavljivanje:** GitHub Pages: https://majorstex.github.io/nocna-straza-v87/ ; Cloudflare Workers: https://deploy.workers.cloudflare.com/?url=https://github.com/MajorStex/nocna-straza-v77

## v87: popravka Back dugmadi na telefonu

- Na pripremi partije, lobbyju, pauzi, podešavanjima i ostalim otvorenim panelima koristi se postojeće Back dugme bez plutajućeg duplikata preko sadržaja.
- Plutajuće Back dugme se prikazuje **samo u aktivnoj igri** (HUD vidljiv, bez modalnog panela).
- Android donja strelica nastavlja da koristi postojeću History API navigaciju, bez novog per-frame rada ili mrežnih paketa.
- Playwright Chromium test odvojene UI komponente: 28/28 provera vidljivosti na 360×740, 390×844, 412×915 i 1024×768.
- Test je simulacija prikaza, ne potvrda na fizičkom telefonu.

## v87 — Firebase cloud-save loop fix

- Zaustavljeno beskonačno reloadovanje nakon vraćanja zapisa iz Firestore baze (jedan kontrolisani reload po obnovi i fingerprint cloud stanja).
- Ako igra po učitavanju normalizuje lokalne podatke, cloud vrednosti se ponovo usklade **bez dodatnog osvežavanja stranice**.
- Novi prazan nalog više ne pita u krug da uveze postojeći profil; postojeći podaci se prethodno čuvaju kao lokalni backup.
- Očuvane su neotpremljene izmene na istom Firebase UID, kao i odvajanje profila na deljenom telefonu.
- Prikaz statusa cloud sinhronizacije ima rezervisanu visinu; poruke više ne pomeraju meni.
- Pozivi `safeSet` za nepromenjene vrednosti ne pokreću nepotrebnu cloud sinhronizaciju.
- 26/26 simuliranih testova: vraćanje napretka, ponovni ulazak, offline izmene, promena naloga, prazan cloud, greška servera, zaštita od osvežavanja.
- Stari GitHub Pages linkovi **v85** i **v86** takođe su dobili istu ispravku za naloge, bez promene multiplayer protokola.
- Testovi nisu obavljeni na stvarnom Firebase nalogu vlasnika niti na korisničkom Android browseru.

**Igra:** https://majorstex.github.io/nocna-straza-v87/

**Cloudflare Deploy:** https://deploy.workers.cloudflare.com/?url=https://github.com/MajorStex/nocna-straza-v77
