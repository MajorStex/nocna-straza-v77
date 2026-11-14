# Third-party audio sources — Noćna Straža V137

## Werewolf howl (Wave 40)
- Source: U.S. Fish and Wildlife Service audio recording, *Wolf howls.ogg*
- Licensing: U.S. federal government work, **public domain (PD-USGov-FWS)**.
- Wikimedia Commons source and public-domain statement: https://commons.wikimedia.org/wiki/File:Wolf_howls.ogg
- Remote media source used by the game: https://upload.wikimedia.org/wikipedia/commons/8/87/Wolf_howls.ogg
- Playback extracts from the 28.32-second recording: approx. 13.35–17.55 and 20.05–23.65 seconds.
- Original synthetic audio remains a fallback when the public-domain sample is unavailable or browser audio has not been unlocked. Requires Internet on first sample load.
- This source is not copyrighted third-party music; do not replace it with an unlicensed clip.

## Reversibility
- V136 original Git branch: `backup/v136-original-werewolf-2026-11-13`
- Original wolf drawing retained as `drawWerewolfLegacy()`; test the original look by adding `&wolf-look=old` to a URL with existing query parameters.
- No changes to the actual wave-40 timing, slow/no-damage attack, multiplayer networking, or rewards.

## Village V144 — verified public-domain / CC0 sounds

**All referenced recordings are CC0 or public domain; no copyrighted commercial
song or unlicensed sound sample is used.** Credits are listed for provenance even
though CC0 does not require attribution.

- Sheep bleat, real sheep recording, 0.48s, 9KB, `Sheep_bleat.ogg`, author Eviatar Bach, **CC0 1.0**:
  https://commons.wikimedia.org/wiki/File:Sheep_bleat.ogg
  Browser audio: https://upload.wikimedia.org/wikipedia/commons/2/28/Sheep_bleat.ogg
- Piglet squeal, real farm animal recording, 1.4s, 284KB FLAC, original Foleyhaven / Freesound #618483, **CC0 1.0**:
  https://commons.wikimedia.org/wiki/File:618483_foleyhaven_piglet-squeal-01.flac
  Browser audio: https://upload.wikimedia.org/wikipedia/commons/6/6f/618483_foleyhaven_piglet-squeal-01.flac
- *peacefull ville* (2023 edition), peaceful loop by Bobjt, **CC0 1.0**:
  https://opengameart.org/content/peacefull-ville
  Browser audio: https://opengameart.org/sites/default/files/peaceful_ville_2023.mp3

The game loads them **on demand** via native browser audio elements, rather than
spawning decoders for every animal or adding work to the shared 60-FPS render
loop. A synthesized, original fallback bleat/oink and gentle chord music still
works if the remote media cannot be played. The original programmatic sword,
axe/hammer, bow, magic and impact sounds use short Web Audio oscillators and
one cached noise buffer with no third-party samples.

- Animal voices are audible only near the player's avatar, with a global ambient
  cooldown and per-animal cooldown; hits can play a more urgent sound.
- The persistent FX toggle and the music button respect the original sound/music
  settings and browser restrictions on autoplay.
- No additional multiplayer packets, rewards or gameplay timers are introduced.
- Remote recordings require internet for first playback; playing a previously
  cached file depends on the browser's normal HTTP cache policy.
