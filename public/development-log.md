# NOĆNA STRAŽA — prenos projekta / development handoff
<!-- current-release: 208 -->
<!-- reviewed: 2026-11-18 -->
Ovaj dokument je jedan prenosivi Markdown fajl namenjen nastavku razvoja, ne izvoz razgovora ili rezervna kopija izvornog koda. Verzija navedena u dokumentu je razvojna verzija; ne dokaz produkcione objave. Ne sadrži pristupne tokene, lozinke, korisničke profile ni privatne razgovore.

## BRZI PRESEK — prvo pročitaj ovo
- Projekat: Noćna Straža / Night Watch, HTML/JavaScript mobilni browser, landscape i desktop. Glavni stalni URL: https://nocna-straza-v77.stefanstevic1996.workers.dev/
- Razvoj: V208 (razvojna grana, ne LIVE); GitHub main je ranije proveren na V189 (klijent) i V168 (relay). Razvojne grane: v190-arena-arrows-revive (klijent) i v189-arena-abilities (relay), nazivi grana nisu brojevi trenutnih izdanja. PR klijenta #37 i relay #6. GitHub push nije dokaz LIVE objave.
- Prioritet: zadržati izgled i gameplay klasičnog moda; Nova zona je izdvojeni SOLO/MP mod. Cilj 60 FPS, stabilna sinhronizacija, 0 EUR mesečno. NEMA dinamičkog menjanja grafike, efekata, rezolucije likova. Engleski default + srpski u meniju.
- Pristup: Nova zona planirano opšti nivo 7; privremeno otvoreno od nivoa 0. MP 2–6, Ready svih, host-independent server, reconnect istog slota, PC tastatura + mobilni joystick.
- Sada se radi: V205 tri legendarne varijante postojećeg oružja, otključavanje u kovnici posle +3; server autoritativan, fiksna grafika.
- Blokade: Cloudflare Actions objava prijavila nedostajuće kredencijale; serverski CI je ranije vraćao failure bez logova. Ne pretpostavljati da je to rešeno. Neophodno je proveriti konačan CI, upareni relay i klijent, stvarni LIVE URL i fizičke telefone.
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
### V208 — 18.11.2026 (KOD; objavu proveriti)
- Classic: drvene ograde u severozapadnom delu mape, sa otvorenim prolazom; isti fizički colliders u Solo i MP. Nova zona normal: početni cilj 20 ubistava, potom rotacija 6 Classic sporednih zadataka, sakupljanje 10 XP kristala i odbrana kontrolne tačke 20 s. Nagrade jednokratne, samo u partiji, bez Sandboxa; cilj, predmeti i napredak deo postojećeg snapshot / checkpoint stanja. HUD: najbliži cilj, zarobljenik/čuvari, pećina/kanap; oznake na minimapi. Classic zaključana kapija, evakuacija i preostali nasumični exploration događaji nisu preneti u ovom izdanju.

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
