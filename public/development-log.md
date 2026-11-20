# NOĆNA STRAŽA — prenos projekta / development handoff
<!-- current-release: 240 -->
<!-- reviewed: 2026-11-20 -->
Ovaj dokument je jedan prenosivi Markdown fajl namenjen nastavku razvoja, ne izvoz razgovora ili rezervna kopija izvornog koda. Verzija navedena u dokumentu je razvojna verzija; ne dokaz produkcione objave. Ne sadrži pristupne tokene, lozinke, korisničke profile ni privatne razgovore.

## BRZI PRESEK — prvo pročitaj ovo
- Projekat: Noćna Straža / Night Watch, HTML/JavaScript mobilni browser, landscape i desktop. Glavni stalni URL: https://nocna-straza-v77.stefanstevic1996.workers.dev/
- Razvoj: V240 Stara kovnica ima SOLO pauzu i MP glasanje sa ograničenom timskom pauzom; V239 kameni bunari zamenjuju plava jezerca; V238 goblini oko kaveza, V237 glas i V236 saveznik ostaju. Relay V240; LIVE tek proveriti.
- Prioritet: zadržati izgled i gameplay klasičnog moda; Nova zona je izdvojeni SOLO/MP mod. Cilj 60 FPS, stabilna sinhronizacija, 0 EUR mesečno. NEMA dinamičkog menjanja grafike, efekata, rezolucije likova. Engleski default + srpski u meniju.
- Pristup: Nova zona planirano opšti nivo 7; privremeno otvoreno od nivoa 0. MP 2–6, Ready svih, host-independent server, reconnect istog slota, PC tastatura + mobilni joystick.
- Sada se radi: odvajanje browser background statusa od timske pauze i provera glasanja.
- Blokade: GitHub Actions nema Cloudflare kredencijale. Dodat je režim provere postojeće nativne Workers Builds objave kada oba secreta nedostaju; bez lažno zelenog statusa. Zahteva identičan LIVE HTML i runtime fajlove, kompatibilni relay V221 i QA 13/13. GitHub push nije potvrda objave; Cloudflare dashboard/autorizacija i stvarni LIVE još moraju biti provereni.
- Sledeće: završni V205 CI, kompatibilnost relay/klijent, LIVE i fizički test 2 pa 6 Android uređaja; V206 balans težine, V207 kompletna optimizacija. Plan nije implementacija.

## Arhitektura i pravila rada
- GitHub klijent: MajorStex/nocna-straza-v77; relay: MajorStex/nocna-straza-relay. Izvornu datoteku i status grane proveriti direktno kroz povezani GitHub; novi ChatGPT nalog mora dobiti ovlašćen pristup od vlasnika.
- Klijent: public/index.html (Classic + menu), public/v140-net-mode.js (Nova zona), public/v115-village.js, v171-character-creator.js, v172-character-voices.js, v173-ability-forge.js, v174-independent-ai.js, v175-faction-relations.js, v176-scenes.js, v177-workshop.js, v178-workshop-social.js.
- Relay: arena-v140.js, arena-steering.js, arena-scenery.js, arena-lab-v160.js, arena-troll-v162.js, arena-xp-v168.js, arena-spells-v189.js. Cloudflare Workers / Durable Objects; nova zona autoritativna 30 Hz, 15 Hz snapshot. Protokol 140, serverBuild 168 uz capability flagove po funkciji (ne mešati sa UI brojem verzije).
- Server odlučuje HP, štetu, XP, drop, upgrade, revive, pozicije i prelaz zone. Klijent šalje nameru, predviđa sopstveno kretanje i interpolira ostale. Stari Classic MP nije u celosti autoritativno portovan. Voice odvojen od gameplay paketa, opt-in mikrofon i prostorni zvuk.
- Ograničenja: 160 aktivnih neprijatelja (talas se deli u pakete), do 160 XP dropova, 85 bliskih kristala po snapshotu, do 12 istorijskih snapshotova, 26 pending kretanja, 18 prikazanih efekata, max 6 taktičkih oznaka. Ne smanjivati vizuelni kvalitet zbog FPS.
- Editor / Sandbox: spawn, AI/fakcije, freeze, boss faze, save scena, kuće/props, zoom in/out, sakrivanje alata, invite, beskonačni revive u editoru; bez permanentnih nagrada iz testnih režima.
- Classic pravila za port: 1) ista mapa i izgled likova/oružja, 2) auto-attack, mana i svih 8 magija, 3) XP kristali i chestovi, 4) bossovi/posebni napadi i animacije, 5) Temple/pećina, 6) Village/prijatelji/voice, 7) revive max 3 u regularnoj borbi, 8) nagrade i ekonomija server-authoritative gde implementirano; nikad duple nagrade.
- Svaka naredna verzija: ažurirati ovaj fajl, dodati novi zapis sa jasnim statusom (KOD / TEST / LIVE / PLAN), testovima, otvorenim problemima i sledećim korakom. Ne prepisivati istoriju. CI i stvarna HTTP provera su različite stvari. Ne tvrditi da fizički test ili deploy radi ako nije izvršen.

## Trenutni testovi i dokazi
- Pre najnovijih izmena: klijentski V199 PR 19/19 workflow; Chromium 60 FPS sa 200 protivnika i 6 prikazanih igrača; prosečan trošak frejma 1,45 ms; 4.000 collision probes. Simuliranih 6 peerova, kašnjenje inputa 50–300 ms, reconnect istog slota i kontinuitet hosta. Nije fizičkih šest telefona.
- Izolovani relay V199: 44.004 provere taktičkih oznaka i kolizije; 44.000 provera verzije zone/izbora, 43 provere sobe sa šest mock WebSocket konekcija. Tri prethodno nepristupačna serverska paketa lokalno preko JS simulacije: horde 1.704, world/XP 121, spells 42 provere. Ne označavati Cloudflare runtime potvrđenim.
- Ubrzani transport soak: 60 simuliranih minuta, 54.000 snapshotova, 324.000 mogućih pošiljki, 313.667 poslato, 10.333 namerno preskočeno, 1.402 uzorkovane provere, svih 6 se oporavilo (mock konekcije, 160 protivnika, nije 60 minuta stvarne borbe).
- Watchdog: posle 3 s bez stanja zamrzava predikciju; od 8 s pokušava reconnect sa 30 s cooldownom; 9 izolovanih provera.
- Najnovije izolovane V199 provere: 11.000 prostornih i lossless-kompresionih provera; redovi 160 običnih goblina 8.281 → 5.721 znakova (−30,9% samo za redove neprijatelja). 200 simuliranih rundi, 1.200 magija, 1.200 snapshotova, 4.800 jedinstvenih killova i XP dropova, 3.600 provera, tri boss tipa. 13.000 provera memorijskih ograničenja i fiksnog kvaliteta: 3.000 mernih prozora, 10.000 događaja, max 512 dedupe/18 efekata. Nije stvarna borba na šest telefona.
- Dnevnik: 71 istorijski zapis, jedan MD fajl, pretraga, Copy All; 19 provera formata i ugovora izvoza. Release gate zahteva podudaranje ns-release i current-release; fizički UI/download i završni CI/live tek proveriti. Memorijska dijagnostika meri brojeve objekata; heap je dostupan samo u browseru koji podržava performance.memory.
- Test fajlovi: tests/v179-stability.test.cjs, tests/v180-browser-stress.test.cjs, tests/v199-network-watchdog.test.mjs, relay tests/v199-tactical-regression.test.mjs, v199-sync-hardening.test.mjs, v199-snapshot-soak.test.mjs, v199-spatial-spell-stress.test.mjs; klijent v199-fixed-memory.test.mjs i v199-development-log.test.cjs; stari v154-horde, v168-world-xp, arena-spells-v189.

<!-- HISTORY -->
### V240 — 20.11.2026 (KOD; LIVE tek proveriti)
- SOLO Stara kovnica: namerno otvaranje zaustavlja simulaciju; BACK trenutno nastavlja. Nema promena obračuna resursa ni save podataka.
- MULTIPLAYER Stara kovnica: 7 s za jednoglasni pristanak svih prisutnih, server zamrzava sve borbene tikove najviše 28 s; BACK/Nastavi dostupno svima, automatski nastavak, trenutni prekid pri izlasku inicijatora ili promeni prisutnih.
- Provere na serveru: igrač mora da je živ i blizu kovnice i da ima ključ; 20 s zaštita od ponavljanja zahteva, 45 s globalni razmak nakon pauze, najviše 2 pauze po talasu i po 1 po inicijatoru; jedino inicijator kupuje tokom pauze, troškovi se obrađuju autoritativno i potvrda osvežava klijenta; vreme pauze ne ubrzava talas.
- Novi WebSocket kontrolni događaji i vezivanje uz postojeći relay; ne menjaju se neprijateljski paketi ili broj simulacionih koraka. Stare pauze iz editor moda ostaju odvojene.
- V240 regresije: 38 izolovanih serverskih provera (šest igrača, kupovina, restart budžeta), 35 klijentskih i umetničkih provera, V238 čuvari 20 provera. Detekcija prekida veze tokom odobrene pauze ne prijavljuje lažni timeout. Klasična jezerca su netaknuta; kameni bunari prikazuju se samo u Novoj zoni.
### V239 — 20.11.2026 (kod uključen u V240)
- Neprepoznatljiva plava jezerca zamenjena su ručno nacrtanim srednjovekovnim kamenim bunarima (drveni krov, kofa, čekrk), koristeći prethodno keširanje grafike i nepromenjene prepreke/kolizije (9 objekata u Novoj zoni). Mini-mapa označava kamenim tonom, bez novih tekstura/asset requestova.

### V238 — 20.11.2026 (KOD; LIVE tek proveriti)
- Na početku petog talasa četiri obična goblina iz *postojećeg talasa* postaju čuvari kaveza (deterministička slobodna mesta 84 px od stražara, bez kolizija), njihov HP je 71, imaju individualni AI i čekaju igrača.
- Prilazak na 265 px pokreće odbranu. Nakon udaljavanja igrača vraćaju se na svoje položaje; bez pojedinačnog respawna. Oslobađanje saveznika moguće je tek kada sva četiri padnu.
- SOLO i Cloudflare MP koriste isti kod postavljanja i AI na 10 Hz; MP nastavlja sa starim mob snapshotovima, bez dodatnih entiteta, poruka ili novih payload polja. V154 keširani goblin atlas čuva originalni izgled, 60 FPS cilj.
- V237 tri originalna glasovna snimka i glasovni balans ostaju netaknuti. Novi test stvarne mape, svih šest igrača, checkpointa i oslobađanja. Potvrdu Cloudflare objave i test realnih telefona raditi zasebno.

### V237 — 19.11.2026 (KOD; LIVE tek proveriti)
- Iz tačnog izvoza karaktera `cc-mwmurfo8-i81d` ugrađena tri originalna WebM/Opus snimka (attack, hurt, death; ukupno 10.840 bajtova), bez čitanja naloga ili dodatnih MP paketa.
- SOLO/MP zvuk izveden iz postojeće autoritativne faze, HP-a i attackTick; lokalni WebAudio, prostorna jačina i stereo, ograničenje ponavljanja. Na oslobađanju zvučni signal, jer izvoz ne sadrži govornu repliku za taj događaj.
- Relay ostaje V236, protokol nepromenjen. Testovi proveravaju originalne bajtove i prelaze stanja; stvarno slušanje na telefonima još nije potvrđeno.

### V236 — 19.11.2026 (KOD / izolovan TEST; LIVE tek proveriti)
- Globalni originalni model `cc-mwmurfo8-i81d` iz korisnikovog kataloga, bez pristupa njegovom nalogu; mač i štit samo nakon oslobađanja. Originalni izgled i proporcije, 140 HP, 24 štete, osnovna brzina 145, napad na 27 tickova (0,9 s, kvantizovano na 10 Hz), sustizanje i zaštita vođe do završetka spoljašnje partije; nagrada spasavanja samo jednom. Zadržan režim od 5. talasa, van Cave/Temple/Defense/Sandbox. Server autoritativan u MP, isti SOLO kod; postojeći 7-elementni rescue paket ostaje kompatibilan, dodatna 4 polja u postojećem snapshotu, nema novih periodičnih poruka. Stari model se više ne iscrtava u ažuriranom klijentu. Katalog nema glasove: audio snimci nisu uključeni. 2059 provera stvarnih rescue funkcija u simulaciji (uključujući realnu geometriju i 6 klijenata), ne fizički FPS. Sejv profila netaknut. LIVE tek proveriti.

### V235 — 19.11.2026 (KOD / simuliran TEST; LIVE tek proveriti)
- Nova zona SOLO/MP: jedna deterministička 1536×1536 tekstura cele mape umesto ponavljanja 768px pločice. 23 nepravilne zone zemlje, mahovine, kamenja i lišća, tri diskretne izgažene staze, promenljiva gustina dekoracije. Jedno iscrtavanje vidljivog dela po frejmu; keš 9 MiB RGBA, priprema u browser idle kada je moguće. 610 mock Canvas provera (600 frejmova, cache i clipping) i JS sintaksa prošli. Stvarni prikaz i FPS nisu potvrđeni. Bez izmena mreže, sejva, servera, kolizija ili kvaliteta karaktera.

### V234 — 19.11.2026 (KOD / simuliran TEST; LIVE tek proveriti)
- Nova zona SOLO/MP, spoljašnja mapa: uklonjen raster kvadrata, uvedena deterministička seamless tekstura 768×768 (oko 2,25 MiB RGBA) sa zemljom, kamenčićima, lišćem i sitnom travom. Jednom se generiše i kešira; jedan fill vidljivog dela po frejmu, bez novih entiteta, kolizija ili mrežnih paketa. Temple/Cave, sejv i serverska mehanika netaknuti. 612 provera mock Canvas-a (600 frejmova, cache, clipping) i JS sintaksa prošli. Stvarni vizuelni prikaz, FPS i LIVE nisu potvrđeni. Kompatibilan V233 relay bez izmena.

### V233 — 19.11.2026 (KOD / izolovan TEST; LIVE tek proveriti)
- Nova zona: Guardian Base iz ekrana rezultata koristi originalne `meta.ranks`, `meta.points` i `buyMetaUpgrade`; ne menja ključ `ns_stats_meta_v23`, format sejva, postojeće profile ni cloud sync. Pet bonusa primenjuju se jednom (HP, damage, speed, mana i arcana), u SOLO i na serveru pre početka MP. MP rangovi su ograničeni na 0–3 i preuzeti iz postojećeg klijentskog sejva; nisu nezavisno verifikovani kod Firebase-a. Honor koristi klasičnu formulu (60 s/12 kill), hero XP postojeću formulu. MP obračun isključivo po eksplicitnom V233 server end paketu; bez fallback nagrade i bez Sandbox-a; token vezan za nalog, heroja, sobu i slot, potroši se jednom. Stari checkpoint bez progression flag-a ne isplaćuje MP nagradu. Postojeći model lokalnog/cloud sejva zadržan; nema nove periodične mrežne poruke ni nove baze. 8.193 izolovane provere rangova/mane, 198 provera obračuna i očuvanja simuliranog sejva, sintaksa prošla. Stvarni Firebase sync, CI, LIVE, fizički uređaji nisu potvrđeni.

### V232 — 19.11.2026 (KOD / izolovan TEST; LIVE tek proveriti)
- Normal Nova zona SOLO/MP: 4 početna neprijatelja, 12 ukupno u prvom talasu; rast +8 po talasu do 180, cap aktivnih ostaje 38; interval 96 tickova (3,2 s) do 36 (1,2 s), batch 1–4, približavanje iz osam sektora, ciljna udaljenost 690 umesto 790 uz bezbedni minimum 620. Classic referenca je kod (4 početna, 27s vremenski talas), ne ponovni pregled videa. Zadržan kill-based završetak, bossovi i mrežna frekvencija. MP: normalno pojačanje ne briše istoriju postojećih protivnika/heroja; na promeni talasa brišu se samo stare mob pozicije uz isti render clock, da reciklirani ID ne vuče stari položaj. 94.266 izolovanih server provera u 54 scenarija (1–6 simuliranih igrača), 80 izolovanih interpolation provera; nisu fizički FPS/testovi. CI i LIVE tek proveriti.

### V231 — 19.11.2026 (KOD / izolovan TEST; LIVE tek proveriti)
- Nova zona SOLO/MP: poruke pri promeni postojećeg stanja inventara: ključ za kovnicu, ključ trola za Temple, dijamanti i kanap za pećinu. Baseline pri ulasku/reconnectu sprečava lažne duplikate obaveštenja. Kanap jednokratni bonus iz map chest #3/#6/#9 ili sanduka posle talasa 3+ ako ranije nije nabavljen; postojeći izbor nagrade i kupovina u kovnici (58 XP) ostaju. Server potvrđuje isključivo pri zaključenju izbora i čuva postojeće expedition.rope kroz checkpoint; XP upgrade, sandbox, unutrašnja zona i defense isključeni. Nema novih periodičnih paketa. 16814 izolovanih provera eligibility, dedupe, SOLO/server pariteta i labela; klijentska sintaksa prošla. CI, LIVE i fizički telefoni nisu potvrđeni.

### V230 — 19.11.2026 (KOD / statičke provere; LIVE tek proveriti)
- Nova zona SOLO/MP: postojeći HUD elementi preseljeni u jedinstveni gornji grid, mini-mapa gore desno, talas i resursi zajedno, kompaktnije FPS/ping i XP, ciljevi ispod u istom panelu. Zadržani klikovi na mapu/nagrade, originalna grafika i intervali osvežavanja, nema novih mrežnih paketa. Usklađen Village cache marker (prethodna V229 CI greška). Fizički prikaz i LIVE tek proveriti.

### V229 — 19.11.2026 (KOD / izolovan TEST; LIVE tek proveriti)
- Nova zona: minimiziranje samo oslobađa joystick/tastaturu/revive i prijavljuje presence; nema pause paketa. P i menu šalju eksplicitan glas, server pauzira samo jednoglasno za aktivni roster; promena presence ili disconnect otkazuje tekuće glasanje, NE otkazuje već izglasanu pauzu. Glas protiv otkazuje zahtev; nastavak ostaje postojeća komanda. Classic: uklonjen automatski hostSleeping freeze; host-authoritative browser može biti suspendovan od operativnog sistema (ne garantuje neprekidan Classic sim). Zadržane postojeće kratke pauze za chest/upgrade. 60 izolovanih provera glasanja (2–6 mesta), sintaksa oba klijentska fajla prošla. CI i fizički telefoni tek proveriti. Bez novog kanala ili periodičnih paketa.

### V228 — 19.11.2026 (KOD / izolovan TEST; LIVE tek proveriti)
- Nova zona MP: downed bez vremenskog isteka; 3 uspešna podizanja, četvrti pad eliminacija. Hold 75 server tickova (2.5s), domet 78, line of sight, reset napretka pri prekidu ili drugom pomagaču; dopušten i između talasa. Team wipe završava regularnu partiju kada nema živog člana; živi reconnect seat dobija postojeći grace (do 120s), Sandbox izuzet. End packet nosi statistiku do 6 igrača, klijent zadržava ekran rezultata do klika Ponovo igraj → ista lobby soba, bez novih trajnih nagrada. Spectate menja samo kameru; povratak na svoj avatar i auto povratak pri revive; crvena offscreen strelica i ime za downed saigrače. Izbor kamere je opcioni podatak postojećeg input paketa za culling XP, bez novog kanala ili frekvencije. Mikrofon HUD sakriven samo u Novoj zoni, postojeće kontrole u meniju. 11050 izolovanih provera (no bleed, hold, 3/4 pad, disconnect grace, team wipe, spectate, statistika); sintaksa klijent/relay proverena; fizički telefoni, stvarni multiplayer i LIVE još nisu potvrđeni.

### V227 — 19.11.2026 (KOD / izolovan TEST; LIVE tek proveriti)
- Footer Novi / Učitaj / Sačuvaj / Testiraj. Biblioteka svih sačuvanih likova po profilu, pretraga imena/ID, kopiranje reference, izvoz kataloga definicija ili pojedinačnog JSON sa punim clean spec, proceduralnim NS171 rigom (animacije), magijama, AI i stvarnim audio podacima (base64). API resolveCharacter odbija dvosmisleno ime, characterPackage vraća kompletan paket; postojeći map editor nije menjan. Definicije koriste postojeći privatni Firebase save. Voice IndexedDB po UID/profilu, migracija lokalnih snimaka po postojećem ID-u; zasebni dokumenti voice-v1: u postojećoj UID-only saves kolekciji preko ograničenih upita, transakcijska provera novijeg timestamp-a, tombstone, bez slanja glasa u GitHub. Sync na Save/Load i lazy preload, ne po frame-u; pri guest/offline ostaje lokalni zapis. Za ChatGPT korisnik izveze i podeli katalog/paket; nema direktnog autorizovanog čitanja privatnog Firebase naloga iz četa. 275 izolovanih provera sa mock IDB/cloudom (rezolucija ID/ime, audio bajtovi, account isolation, restore/deletion, package, ograničenja). Nisu potvrđeni stvarni Firebase login/write, telefon, CI ili LIVE. Offline voice izmene zahtevaju naknadni Save/Load; cloud konflikt po vremenu izmene. Offline brisanje lika sa glasovima nije potvrđeno na drugom uređaju.

### V226 — 19.11.2026 (KOD / izolovan TEST; LIVE tek proveriti)
- Testiraj i Reset celog testa vraćaju neprijatelje (uključujući ubijene i ručno dodate) na sačuvane početne pozicije; vraćaju HP, MP, cooldown, XP, kill, predmete i vreme borbe. Čuvaju raspored, frakcije i Ignore Players. U režimu talasa čuva se raspored tekućeg talasa, uključujući ručno dodate. Respawn ostaje zasebna komanda samo za heroja. Igrači se raspoređuju oko centra uz proveru prepreka i razmaka; ako je početna tačka blokirana, traži se bezbedna alternativa. Host jedini resetuje stanje i povećava round; gosti dobijaju postojeći 10 Hz snapshot sa oznakom runde, brišu stare interpolacije i komande. Stari Input/Cast/Rescue/UseProp/Proposal/Hero/Vote se odbacuju, bez novog socketa. Manifest receive limit 96k zbog 24 NPC (prethodno 48k). Izolovani test: 1003 provere reseta (81 reset poziv, 405 teleportova gostiju; uključuje scene i wave, 24 NPC/6 igrača), 3704 mrežne provere tokom 100 resetova, odbacivanje starog snapshot-a, dedupe magije i tačna pozicija. Nije test fizičkih telefona ili potvrda LIVE.

### V225 — 19.11.2026 (KOD / izolovan TEST; LIVE tek proveriti)
- Character Creator čuva do 30 likova lokalno po nalogu u ns171_creator_v1_<account>. Nova komanda Koristi u regularnoj igri kopira podržani izgled i standardno oružje u postojeći hero profil; ne prenosi custom HP/štetu/magije, niti custom neprijatelje u standardne talase. Testiraj nastavlja postojeći poligon i postavljene NPC; Reset celog testa je zaseban. Ignore Players isključuje igrače iz meta i napada, zadržava frakcije. Smrt ne zaustavlja vreme; hunt NPC patrolira bez mete uz kratke determinističke waypoint-e i raspoređeno opažanje, eksplicitni guard/still ostaju. Instant Respawn vraća samo mrtvog igrača uz 2s zaštite; MP host jedini odobrava zahtev i šalje postojeće 10Hz stanje. Limit 24 NPC u creator/scena/workshop, 12 default za auto spawn. 1087 izolovanih provera, 24/24 patroliralo posle smrti, 9s simulacija, manifest 49553 karaktera za test. Fizički test 6 uređaja, ceo CI i LIVE nisu potvrđeni. Cloud sync likova i proizvoljni NPC u regularnim talasima nisu implementirani.

### V224 — 19.11.2026 (KOD / izolovani TEST; LIVE tek proveriti)
- Zatvorena rupa kod x264–330/y953 u spoljašnjoj ogradi; vidljivi segment i collider, kutija pomerena na y1004, originalna kapija ostaje funkcionalna. Solo i relay imaju identičnu mapu i algoritam. Flow fields koriste 36px mrežu, stvarni poluprečnik, swept-circle proveru segmenata i postupnu izgradnju (najviše 384 proširena čvora po AI koraku, dva nova polja po koraku, keš do 40). Kripovi uključujući trolove zaobilaze prepreke; 30Hz kretanje, 15Hz grupni AI sa naizmeničnim težim proračunom; nema novih mrežnih poruka. Obični kontakt napadi ne prolaze kroz zid. Test: 160/160 malih, 40/40 srednjih i 10/10 velikih zaobišlo izolovanu prepreku; 126000 provera pozicija. Cela mapa: 160 neprijatelja/6 simuliranih igrača, 38400 provera bez prodora; 24 polja umesto 240 ponovnih izgradnji, 7ms medijana / 10ms p95 u izolovanom JS okruženju, nije FPS ili Cloudflare CPU dokaz. Kapija zatvorena/otvorena i invalidacija keša proverene. Fizički uređaji, CI i LIVE tek potvrditi.

### V223 — 19.11.2026 (KOD / izolovani TEST; LIVE tek proveriti)
- Nova zona Solo/MP: zlatna brojka stvarno skinutog HP, 600ms podizanje/fade, čestice smrti, originalni Classic zamah i postojeća foley biblioteka za oružje, pogodak, smrt, XP i korake. Relay šalje ograničeni niz kozmetičkih HP-loss događaja kroz postojeći snapshot (48, poslednjih 9 tickova), dedupe 512, viewport culling, lokalni zvuk sa prostornim stišavanjem. Istovremeni udarci u istom ticku sabiraju se po meti. 1402 izolovane provere; nije fizički test ili dokaz LIVE. Grafički asseti i borbena pravila ostaju isti. Potvrditi CI i Cloudflare.

### V222 — 19.11.2026 (KOD / izolovani TEST; LIVE tek proveriti)
- Kristali od killova ostaju na mestu smrti 12 tickova (400 ms) pre privlačenja. Classic domet 120 px, sa magnetom 180 px, dodela tek na 25 px. Daleki kill ne daje automatski XP; posebne nagrade objektiva ostaju odvojene. Magnet i ostale pasivne sposobnosti ostaju u sanducima, osnovne XP nadogradnje nepromenjene. Server sprečava duplu dodelu i skupljanje nezdravih/neaktivnih igrača; bez novih mrežnih poruka, isti cap 160. Prošlo 3911 izolovanih provera pariteta i šest mock igrača. Fizički uređaji, završni CI i produkcija nisu potvrđeni.

### V221 — 19.11.2026 (SOLO/MP Temple kolizija; LIVE tek proveriti)
- Stalna prepreka na realnom položaju Temple 2270,2360, dimenzije 112×98; isti obstacle sistem i AI navigacija, ne crta dodatnu kuću. Ulaz ključem, povratak šest igrača ispred vrata i bez dupliranja prepreke posle prelaska zone. Stari checkpoint: samo preklopljeni akteri se premeštaju na slobodno mesto. 1623 izolovane provere servera/pariteta; regresije dodate u CI. V220 prethodno potvrđen LIVE.

### V220 — 19.11.2026 (Nova zona, vizuelni hotfix; LIVE tek proveriti)
- Temple spolja: originalna kamena vektorska ilustracija na osnovu opštih referenci drevnih hramova, lučni ulaz, stubovi, stepenice, reljef, mahovina. Dve keširane varijante 288×312, postojeća 3/4 perspektiva, depth sort i view culling; ključ menja izgled vrata. Stara pozicija portala, lavirint, čuvari, nagrade i pravila ulaska ostaju isti. 23 izolovane provere prošle; Chromium piksel test uključen u produkcioni CI. V219 prethodno potvrđen LIVE, relay V218 QA 13/13.

### V219 — 19.11.2026 (UI hotfix; LIVE tek proveriti)
- Nova zona MENI premešten dole desno, panel se otvara iznad. Dodge iznad menija; swap i revive pomereni uz rezervisan prostor, voice kontrola sklonjena od glavnih dugmadi. Safe-area, scroll i isti događaji menija. Grafika, gameplay, relay i napredak nepromenjeni.

### V218 — 19.11.2026 (produkcioni hotfix na osnovi V211; LIVE tek proveriti)
- Crv gleda prema autoritativno izabranom igraču pri kretanju, punjenju, ispaljivanju i mirovanju. Render više ne koristi smer brzine. Relay dodaje opcioni indeks mete samo za crva, kompatibilno sa starim klijentom. 8280 izolovanih provera za 360 uglova i tri faze; bez promene kolizije, brzine, napada, grafike i ekonomije. V212–V217 nisu deo ovog hotfixa.

### V211 — 18.11.2026 (KOD; objavu proveriti)
- Nova zona normal: 3 protivnika na početku, prvi talas ukupno 24, pojačanja do 7 na 36 tickova, rast broja i brzine sa talasima; prostorno raspoređivanje po 8 sektora, najmanje 620 px od živih igrača, ograničen broj aktivnih protivnika 12–38, jedinstveni ID i zadržavanje mrtvih do isteka interpolacije. Direktna simulacija 24 spawna, 8 sektora, bez duplikata. Nove vektorske šargarepe i pečurke; postojeći sinhronizovani zadaci. Hero voice: deljeni Classic editor, nova situacija malo HP, lokalne replike Nova zona iz potvrđenog stanja, bez slanja audio snimaka kroz gameplay. V209 online log pokazao 6 povezanih, jedan bez start poruke; V210 preview relay još bio na V209. V211 potvrda start poruke, ograničen resend i fallback iz autentifikovanog snapshot-a. Usklađeni release i Village cache, strogo pinovan preview release test. CI i produkcija još nisu potvrđeni.

### V210 — 18.11.2026 (KOD; objavu proveriti)
- Nova zona: originalna donja kapija sa kolizijom i četiri zatvorena bočna otvora, 535 propova i 351 collider, isti svet Solo/MP. Kapija se otvara na spawn matrijarha ili truležnog kolosa; server čuva stanje kroz breakables snapshot/checkpoint. Kutije 60–78 HP, faze pukotina u keširanim spriteovima, ograničen efekat drvenih krhotina, jedan XP drop pri uništenju, bez dupliranja kroz reconnect. Direktne provere zatvaranja/otvaranja, kolizije, prenosa stanja i nagrade prošle. CI i šest online igrača još nisu potvrđeni; ne označavati produkciju V210 bez dokaza.

### V209 — 18.11.2026 (KOD; testovi i objava još nisu potvrđeni)
- Originalni teren, pećina na originalnoj lokaciji, isti 528 objekata i 344 prepreke u Solo i MP. Prostorni indeks proveren na 121 prikazu kamere, LRU grafički keš ograničen na 24 MiB. Usklađeni V209 release markeri i tačan preview relay SHA, šest stvarnih WebSocket klijenata na isključivo testnom Worker-u; provere ACK, istog slota, kontinuiteta i dijagnostika timeout-a. Poslednja neuspešna provera koristila je zastareli preview URL. Ne tvrditi da je novi test prošao dok CI ne potvrdi. Produkcija ostaje V189 dok se ne potvrde oba deploy-a.

### V208 — 18.11.2026 (KOD; objavu proveriti)
- Classic: 44 drvena segmenta ograde u severozapadnom delu mape, sa otvorenim prolazom; isti fizički colliders u Solo i MP. Nova zona normal: početni cilj 20 ubistava, potom rotacija 6 Classic sporednih zadataka, sakupljanje 10 XP kristala i odbrana kontrolne tačke 20 s. Nagrade jednokratne, samo u partiji, bez Sandboxa; cilj, predmeti i napredak deo postojećeg snapshot / checkpoint stanja. HUD: najbliži cilj, zarobljenik/čuvari, pećina/kanap; oznake na minimapi. Classic zaključana kapija, evakuacija i preostali nasumični exploration događaji nisu preneti u ovom izdanju. Classic pauza: lokalni zoom, prikaz cele mape, reset, stvarni PNG 2400×2400 i JSON rasporeda aktivne mape. Za veliki zoom-out keširan teren. Temple: ključ trola ostaje zajednički, dijamant budi uspavane čuvare, izlaz nakon čišćenja i nagrada jednom; core deo postojećeg snapshot-a i checkpoint-a. Classic mapa rekonstruiše isti osnovni raspored, nije još identična svim objektima aktivne Classic instance.

### V207 — 18.11.2026 (KOD; objavu proveriti)
- Nova zona: uklonjen dvostruki render klasičnih prepreka kao kućica; mali nasleđeni colliders crtaju se kao crate, originalni veći objekti ostaju na istim koordinatama. 31 dekorativni plavi kristal postaje jednokratni 5 XP drop po Classic pravilima, jedan nepristupačan položaj automatski korigovan; identično Solo/server, 160 maksimalno dropova, rezervisani kristali do sakupljanja, postojeći snapshot / checkpoint, bez novih mrežnih poruka. HUD i naslov koriste V207.

### V206 — 18.11.2026 (KOD; završni CI / LIVE nepotvrđeno)
- Nova zona Solo: kraj partije otvara ekran rezultata pri smrti, porazu odbrane ili pobedi, sa ubistvima, aktivnim vremenom, talasom, nivoom, bossovima, kristalima i zasebnim trajnim napretkom. Ponovo igraj, nadogradi heroja, glavni meni. Isti račun i originalni talenti heroja HP/šteta/brzina; bez posebnog novčanika. Classic earnMPReward: minimum 60 s aktivne borbe i 10 ubistava; do 45 profilnih poena i 70 XP heroja po partiji; poeni za talente kroz stvarni trajni nivo heroja. Izlazak, Sandbox ili izmenjena partija bez ove nagrade. Jednom po sesiji; vezano za heroja i profil sa starta. Offline zaštita ne garantuje bezbednost protiv manipulacije JavaScriptom. Multiplayer nagrade nisu uvedene ovom izmenom; poseban autoritativni završetak na serveru je sledeći zadatak. Ne tvrditi LIVE dok se ne potvrdi.
## ISTORIJA VERZIJA — od novijih ka starijim
### V205 — 18.11.2026 (KOD / simulirani TEST; LIVE nije potvrđen)
- Dodatna QA provera V205: na commitu 80366447 klijent 18/19 workflowa; jedan pao zbog starog doslovnog poziva u v151-mob-motion.test.cjs nakon podele grupa za odbranu sela. Provera 30 Hz fizike i 15 Hz usmeravanja za obe grupe dopunjena bez izmena gameplay-a (commit b63c8e18). Izolovana interpolacija stvarne funkcije: 207 konačnih pozicija, 163/163 uzorkovanih frejmova sa pomeranjem, 0 velikih skokova, 0 obrnutih frejmova u simulaciji. Tri serverska workflowa ponovo pokrenuta; ranije logovi nedostupni (HTTP 404). Novi CI, stvarni uređaji i LIVE nisu potvrđeni.
- Tri legendarne varijante: Zorina oštrica (longsword, +5 HP pri udarcu na 5 s ako nedostaje HP), Gromovnik (warhammer, talas 135 px, najviše 5 neprijatelja po 55% direktne štete na 6 s), Zmajev očnjak (glaive, vatrena linija 225 px, do 4 neprijatelja po 65% direktne štete na 6 s). Potreban aktivni odgovarajući tip +3, otključana kovnica, 30 metala i 4 esencije. Jednom po tipu tokom partije, bez trajne profilne valute. Zajednički cooldown sprečava zaobilaženje promenom oružja. Postojeći izgled oružja, animacije i efekti; nisu dodati novi sprite-ovi.
- Server proverava udaljenost, materijal, tip, stanje igrača, reviziju zone i cooldown; privatni bitmask inventara (0–7), postojeći spellFx i kill/drop put, prepreke blokiraju proc, checkpoint posle kovanja. Solo koristi ista pravila. Bez nagrada u editoru, bez novih mrežnih kanala. Test tests/v205-legend.test.mjs: 3.315/3.315 simuliranih provera, 300 scenarija, svih šest odvojenih inventara, cooldown, replay zaštita, zidovi, kill i checkpoint. Fizički test, završni CI i objava nisu potvrđeni.
### V204 — 18.11.2026 (KOD / simulirani TEST; LIVE nije potvrđen)
- Odbrana sela kao odvojena pravila Nove zone, Solo/MP do šest igrača, 20 talasa sa postojećim trolom na 10. i rotfiendom na 20. Tri branjena objekta (kuća, kapija, sklonište; 180 HP po objektu), vizuelna oznaka HP i ruševine; uništenje svih znači poraz. Dva stražara kod preostalih objekata pružaju podršku napadom koji ne može zadati poslednji udarac. Nema zasebnog AI-ja stanovnika ili fizički novih barikada; stanovnici su predstavljeni skloništem. Najviše 12 goblina cilja objekte odjednom, postojeći steering, postojeći snapshot. Popravka +30 HP za 2 metala u pripremi između talasa, bez obnove potpuno uništenog objekta. Pauza za pripremu 20 s posle izbora nagrade; server omogućava kretanje i ACK u toj fazi. Pobednička nagrada je 2+2 po sačuvanom objektu (4–8 shards) po živom prisutnom igraču, samo u partiji. Ekspedicije i rescue nisu aktivni u ovom modu. Mirno selo i klasični mod nisu menjani.
- Server potvrđuje HP, pogotke, popravke, materijale, nagrade, reviziju zone i checkpoint; identične Solo funkcije. Test tests/v204-defense.test.mjs: 1.310/1.310 simuliranih provera, 100 scenarija, 160 mobova, 12 napadača maksimalno, tri pozicije potvrđene na stvarnoj geometriji, dva boss talasa, šest istih snapshotova, inter-wave movement, duplikat popravke, zastarela komanda i trajanje checkpointa. Dodatna izolovana provera pariteta. Fizički uređaji, kompletan CI i produkcija i dalje nepotvrđeni. Balans težine tek V206. V203 klijentski CI 18/19: stari test ekonomije nije uključio arenaForgeLoot; V204 dopunjen test stvarnim forge kodom, direktno 184/184 prethodnih provera prošlo. Relay V203 3/3 neuspešna; V204 završni CI pokrenut, rezultat još nepotvrđen.
### V203 — 18.11.2026 (KOD / simulirani TEST; LIVE nije potvrđen)
- Kovanje u postojećoj Staroj kovnici u Novoj zoni. Metal: 1 na svako četvrto priznato ubistvo, 4 za teškog bossa; esencija: 1 za trola/rotfienda/bossa/alpha vukodlaka, 3 za zmaja. Inventar ograničen na 99 metala i 30 esencija. +1 košta 8 metala, +2 16 metala i 1 esenciju, +3 24 metala i 2 esencije. Svaki stepen +8% direktne štete oružjem, najviše +24%. Potreban ključ za prvo otključavanje kovnice. Svih 17 postojećih tipova oružja. Nadogradnja vezana za tip oružja i igrača u toj partiji, ne za fizički predmet ili trajni profil. Crafting novih unikatnih oružja ostaje V205.
- Server proverava udaljenost, aktivno oružje, očekivani stepen, materijale, reviziju zone, cooldown i validan režim. Ponavljanje komande ne troši materijale drugi put. Snapshot inventara je privatan za sedište (12 znakova u osnovnom testu), nema novih objekata/streamova; checkpoint nakon uspešnog kovanja. Solo identična pravila. Editor ne daje materijale. Grafika ostaje ista.
- Direktno izvršene 21.677 provere sa mock platformom uključujući identična pravila Solo/server, 300 simuliranih unapređenja, 17 tipova oružja, šest odvojenih inventara, checkpoint i odbijanje zastarelih komandi. Regresija sačuvana kao tests/v203-forge.test.mjs. Završni CI, fizički uređaji i produkcijska objava još nisu potvrđeni.
### V202 — 18.11.2026 (KOD / simulirani TEST; LIVE nije potvrđen)
- Jedan zarobljenik po partiji od 5. talasa, oslobađanje kada igrač priđe kavezu i očisti okolinu. NPC ima 100 HP, prati dostupnog saigrača, prebacuje vođstvo pri gubitku veze, wall-safe kretanje, HP i status na HUD-u, markeri na minimapi. Odredište je seoska straža na istoj mapi, ne prelazak u zaseban Village mod. NPC može nastradati i misija tada propada.
- Nagrada: +3 arena shards svakom živom prisutnom članu tima, jednokratno. Ne dodaje trajnu profilsku valutu. Pauzira se u Temple/pećini, globalnoj pauzi, izboru nadogradnje, između talasa; deaktivirano u editoru. Faze i nagrada čuvaju se u server checkpointu. Solo koristi isto pravilo lokalno.
- Ograničen rad: jedan NPC, update 10 Hz, bez novog mrežnog kanala, zajednički snapshot sa 7 vrednosti (32 znaka u testu), postojeći renderer, fiksna grafika. Test v202-rescue.test.mjs: 1.997 provera, 100 simuliranih pratnji, 8.900 koraka, provera stvarne geometrije mape i 6 identičnih mock snapshotova. Ne znači fizički test, novi završni CI i LIVE nisu potvrđeni. Lokalno izbegavanje prepreka, nije kompletan globalni NPC pathfinding.
### V201 — 18.11.2026 (KOD / simulirani TEST; LIVE nije potvrđen)
- Zmaj u Nova Zone normalnoj progresiji od 50. talasa: jedan po prvom paketu talasa, bez dodatnog broja aktivnih neprijatelja; tri faze, vatrena linija i udar krilima, vidljivo upozorenje, zaključan smer, kolizija vatre sa zidom. Fiksna vektorska grafika novog bossa, van ekrana se ne crta. Postojeća umetnost ostaje netaknuta.
- Server odlučuje HP, fazu, pogodak i nagrade; postojeći snapshot nosi koordinatu, fazu i upozorenje. Samo offline Solo izračunava lokalno. Zmaj daje XP kristal 120 i postojeći retki glaive ako ima mesta u svetskom weapon pool-u. Nije dodato novo legendarno oružje.
- Test v201-dragon.test.mjs: 4.009 provera, 100 scenarija spawna, 300 rundi, 1.800 pogodaka, šest mock konekcija dobija identičan snapshot bossa; test je simulacija, nije fizička borba na telefonima. V200 poslednji klijentski commit 33e00663: svih 19 GitHub workflowa prošlo; 7 serverskih paketa direktno nad izvorom sa mock platformom prošlo, formalni relay CI i Cloudflare nisu potvrđeni. V201 nije objavljen, mora se proveriti kompatibilnost uparenih verzija.
### V200 — 18.11.2026 (KOD / izolovani TEST; LIVE nije potvrđen)
- Periodični checkpoint na 30 s, odmah na startu, novom talasu i dodeli nadogradnje. Oporavak 6 slotova, HP/XP/drop/choice, odbijanje ponovljenog izbora, čišćenje starog inputa i istek prazne sobe. 21/21 simuliranih provera oporavka, uključujući opoziv starog socket-a i svež autentifikovani reconnect nakon rekreacije Durable Object-a. U slučaju pada nezaštićeni trenutni borbeni napredak može da se vrati do poslednjeg checkpointa; nema garancije punog kontinuiteta.
- Dijagnostika: brojači za mrežu, reconnect, greške checkpointa i memoriju; bez tokena, ID naloga i privatnih poruka. Izvoz JSON. V200 meta, meni i runtime naslov; legacy bazni HTML naslov V166 ostavljen zbog postojećih regresija.
- V199 poslednji CI: 16/19 klijentskih workflowa, tri greške na istom zastarelom regexu za throttle; test prilagođen dodatnoj zaštiti; direktna V200 provera 27/27, dnevnik 19/19 (72 zapisa). Na klijentskom commitu 06fbf81b sva tri prethodno crvena workflowa prošla, 16/19 ukupno završeno uspešno i 3 u toku u trenutku provere; završni rezultat tek potvrditi. Relay CI i dalje 3/3 neuspešna, bez izvršenih koraka prikazanih u API-ju; novi recovery test je sačuvan i uključen u CI, izolovano prošao 21/21. Cloudflare kredencijali i fizički telefoni i dalje blokada.
### V199 — 18.11.2026 (KOD / delimično TEST; LIVE nije potvrđen)
- Taktičke oznake svim igračima, zone generation, kolizije i napadi kroz zid, pravila mraka; sprečavanje zakašnjelih komandi, starog socket-a i izbora nagrada; reconnect baseline; watchdog, dijagnostika laga, fiksni vizuelni kvalitet, prostorni grid kristala i kompaktni snapshotovi; memorijski brojači.
- Dodaje razvojni dnevnik, pretragu i jedan MD izvoz. Status novih izmena: razvoj, završni CI nije potvrđen.
### V198 — KOD / raniji regresioni test
- Night/Rush/campaign, pećinski posebni napadi, account reward packet; proveriti realni relay.
### V197 — KOD
- Pravila Nova Zone mode-ova (normal/night/rush/campaign), dnevno/noćni ciklus i ciljevi.
### V196 — KOD / simulacija
- Temple, pećina, ključ trola, zajednički ulazak, uspavani čuvari, povratak na prethodnu mapu, jednokratna nagrada.
### V195 — KOD / regresioni test
- Ekonomija, trgovina, kovnica, guild key, relikvije, ciljevi partije, dnevni/nedeljni zadaci.
### V194 — KOD / regresioni test
- Lomljivi objekti, kolizije, checkpoint, jednokratni field kit.
### V193 — KOD / regresioni test
- Pasivne veštine i četiri evolucije oružja, determinističke provere borbe.
### V192 — KOD / regresioni test
- Dodge, loadout, loot, SOS, boss summon, broj neprijatelja ograničen.
### V191 — KOD / regresioni test
- Classic roster, masivne jedinice, Matriarch, alpha vukodlak, faze i posebni napadi.
### V190 — KOD / simulacija
- Strelice ka saigračima i poslednjim neprijateljima, revive, spectator, progresija talasa.

### V189 — Git istorija
- V189: Classic abilities in Nova Zone Test (commit 2418b916; nije dokaz LIVE objave).
### V188 — Git istorija
- V188: expandable world editor, terrain and ambient life (commit 71492c5a; nije dokaz LIVE objave).
### V187 — Git istorija
- V187: destructible obstacles, teleport pairs, traps and spawn points (commit 7a0b30f3; nije dokaz LIVE objave).
### V186 — Git istorija
- V186: interactive workshop supplies and synchronized chests (commit 2e1bf5a2; nije dokaz LIVE objave).
### V185 — Git istorija
- V185: unlimited workshop revive and independent camera zoom (commit a0488d1f; nije dokaz LIVE objave).
### V184 — Git istorija
- V184: sandbox world editor, guest combat and smoother multiplayer (commit 142daf8c; nije dokaz LIVE objave).
### V182 — Git istorija
- V182: workshop battle commands and immersive multiplayer camera (commit 08853e32; nije dokaz LIVE objave).
### V181 — Git istorija
- V181: stable multiplayer, visual fidelity and performance QA (commit 53f96039; nije dokaz LIVE objave).
### V178 — Git istorija
- V178: workshop invites, votes, roster and concurrent voice recording (commit 68b7ed79; nije dokaz LIVE objave).
### V177 — Git istorija
- V177: shared creative workshop in Village (commit d601638d; nije dokaz LIVE objave).
### V176 — Git istorija
- V176: saved scenes, editor optimization and six-client live sync QA (commit 2d8da32b; nije dokaz LIVE objave).
### V175 — Git istorija
- V175: editor-only faction relationships and observer scene (commit 6bc900d0; nije dokaz LIVE objave).
### V174 — Git istorija
- V174: Independent AI, boss phases and reusable character placement (commit aaf95cd8; nije dokaz LIVE objave).
### V173 — Git istorija
- V173: Ability Forge and character editor combat and voice fixes (commit e1748d72; nije dokaz LIVE objave).
### V172 — Git istorija
- V172: Character Voice Studio and dual-role character combat (commit 0e683f2f; nije dokaz LIVE objave).
### V171 — Git istorija
- V171: Create My Hero and Create Character with tested solo editor arena (commit 90bc5438; nije dokaz LIVE objave).
### V170 — Git istorija
- V170: repair deployment and verify the actual existing Cloudflare Worker (commit a12c02f5; nije dokaz LIVE objave).
### V169 — Git istorija
- V169 Village mobile UI: compact HUD, accessible tools and lightweight voice popover (commit efe00608; nije dokaz LIVE objave).
### V168 — Git istorija
- V168 publish verification on same permanent Worker via independent SHA-256 live checks (commit 23ce02a6; nije dokaz LIVE objave).
### V167 — raniji projektni izveštaj
- Serverski revive (najviše 3), plavi dijamanti i više trolova. Razvoj, fizički test i live nisu potvrđeni.
### V166 — Git istorija
- Gate Cloudflare release on V166 320-412px real Chromium lobby fit and current voice/Village regression (commit f8e7f85c; nije dokaz LIVE objave).
- Mobilni lobi širina 320–412 px, razdvojeni Classic/New Zone voice, zaštita starih paketa; raniji izveštaj potvrdio live V166; ne znači da je još danas live.
### V165 — Git istorija
- V165 authorize classic voice guest tokens via private co-op handshake, start voice room on host creation/host migration and keep independent of Arena (commit 1a1c2905; nije dokaz LIVE objave).
### V164 — Git istorija
- V164 verify both mode chooser and original lobby dropdown publicly label level-0 New Zone test access (commit 3d75b15f; nije dokaz LIVE objave).
### V163 — Git istorija
- V163 mobile CI includes PTT hold/release, menu mic mode and speaking badge privacy regressions (commit d380880a; nije dokaz LIVE objave).
### V162 — raniji projektni izveštaj
- Originalni trol na talasu 10, compact Sandbox i asset order.
### V161 — raniji projektni izveštaj
- Aktivni govornik, speaker znak iznad glave, voice ID ispravka; mock test.
### V160 — raniji projektni izveštaj
- Sandbox, AI/spawn/freeze, save/undo, globalno glasanje za pauzu, solo auto pause, kontrola heroja.
### V159 — raniji projektni izveštaj
- Zaseban autentifikovan voice kanal, udaljenost, mute; stvarna dva telefona nepotvrđena.
### V157 — raniji projektni izveštaj
- Determinističko drveće/kamenje, zajedničke kolizije.
### V154 — raniji projektni izveštaj
- Horde goblina, renderer i stres-test; skaliranje i bezbedniji spawn.
### V152 — raniji projektni izveštaj
- Proširen arena prostor, zvuk, chestovi, wave HUD.
### V142 — raniji projektni izveštaj
- MP modovi, promene zone posle smrti, ispadanje oružja/ključa, Temple, Village scoreboard; objava bila blokirana.
### V140 — raniji projektni izveštaj
- Izdvojeni novi multiplayer, postepeni pristup 2 pa 6 igrača.
### V138 — raniji projektni izveštaj
- Village 1660×960, 9 objekata, 7 ovaca, 5 prasića, PvP štala bez stalnih nagrada i respawn.
### V130 — raniji projektni izveštaj
- Workflow stalnog Cloudflare deploya i verifikacije, 57 provera; objava tada blokirana.
### V129 — raniji projektni izveštaj
- Diskretna oznaka verzije u igri i Village-u.
### V128 — raniji projektni izveštaj
- Optimizacije 30–144 Hz i cilj 60 simulacija/s; 27 provera, fizički test nepotvrđen.
### V124 — raniji projektni izveštaj
- WASD/strelice i spawn fix.
### V114 — raniji projektni izveštaj
- Goblin sa tamnocrvenim šlemom, kompatibilni ID; kapija i prolaz.
### V113 — raniji projektni izveštaj
- Ally napada neprijatelje za 8 štete, može biti meta crva/bossova.
### V105 — raniji projektni izveštaj
- Temple preview, ključ trola, lavirint, 14 dekoracija, uspavani čuvari.
### V104 — raniji projektni izveštaj
- Pauza skriva mana/magic HUD, resume vraća; raniji izveštaj live i mobilni test.
### V99 — raniji projektni izveštaj
- Dve burger trake, zajednički level izbor i pause/resume vote; nova MP provera tada otvorena.
### V98 — raniji projektni izveštaj
- Solo prelaz pećine posle disconnecta, mana samo u borbi.
### V97 — raniji projektni izveštaj
- Zajedničke post-game statistike, revanš i auto start; prethodno potvrđeno testnim browserima.
### V94 — raniji projektni izveštaj
- Nagrade/checkout zaštita, adaptivni efekti tada; korisnik sada NE želi adaptivne efekte u Nova Zone.
### V93 — raniji projektni izveštaj
- Osam magija, mana, Mage klasa i drag targeting.
### V92 — raniji projektni izveštaj
- Javne sobe / Create-Join, refresh, password/anti spam; raniji izveštaj live.
### V89 — raniji projektni izveštaj
- Troll Goblin od 10. talasa, telegraph, weapon drop 11%, uzmi/odbaci UI.
### V88 — raniji projektni izveštaj
- GitHub Pages objava, osnovni testovi.
### V81 — raniji projektni izveštaj
- Deterministički dekorativni kamenčići, 62 lokalne provere.
### V80 — raniji projektni izveštaj
- Congestion zaštita, preskakanje zastarelih stanja, 48 simuliranih provera.
### V79 — raniji projektni izveštaj
- MP smoothing i lobby chat, 54 lokalne provere.
### V78 — raniji projektni izveštaj
- Brži host update i manje kopije, 6 simuliranih klijenata.
### V75 — raniji projektni izveštaj
- 20 uništivih buradi, poljski zavoj, limit dropova i sinhronizacija.
### V74 — raniji projektni izveštaj
- Prijatelji i profil u lobby-u, 82 provere; fizički 5G nepotvrđen.
### V70 — raniji projektni izveštaj
- Heartbeat WebSocket PING/PONG, backoff reconnect, sačuvan room code, JOIN retry; mock relay i browser; ne potvrđuje live.
### V69 — raniji projektni izveštaj
- Rani javni HTML build / shop sandbox; demo vlasništvo nije pravo plaćeno vlasništvo.
### V63 — raniji projektni izveštaj
- Glasovi heroja prema udaljenosti, mute i pristanak; mock test.
### V61 — raniji projektni izveštaj
- JOIN retry fix i WebSocket relay.
### V3 — raniji projektni izveštaj
- Početni HTML, izbor heroja, XP, Classic/Noćni plamen, prijatelji, do šest igrača; rane simulacije.

## Napomena o potpunosti
Ovo je rekonstruisana istorija iz dostupnih GitHub commitova i ranijih projektnih izveštaja. Za preskočene verzije nema dovoljno pouzdanih zapisa u trenutnom izvozu; ne izmišljati ih. Istorija nije kopija svih starih poruka. Za novi ChatGPT nalog pošalji ovaj fajl i reci: „Nastavi razvoj Noćne Straže po ovom dokumentu. Prvo potvrdi stanje na GitHub-u i LIVE, ne ponavljaj završene funkcije i ne menjaj izgled. Ažuriraj ovaj dnevnik pri svakoj verziji.”
