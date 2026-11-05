# Noćna Straža v79

Mobilna HTML multiplayer igra sa optimizovanom sinhronizacijom gostiju i chatom u čekaonici. Spremna je za Cloudflare Workers (Static Assets).

[**🚀 Deploy v79 to Cloudflare**](https://deploy.workers.cloudflare.com/?url=https://github.com/MajorStex/nocna-straza-v77)

Klikni na link, prijavi se na Cloudflare i GitHub ako traži, potvrdi ime projekta i klikni **Deploy**. Cloudflare će objaviti `public/index.html` (sada v79) i dodeliti `*.workers.dev` adresu. Ako već imaš Worker povezan sa ovim GitHub repozitorijumom, push na `main` pokreće automatski deploy na taj Worker kada je Git integracija aktivna.

Napomena: Cloudflare Deploy dugme može napraviti **novi** Workers projekat, ne mora da zameni postojeći Pages ili Workers projekat. Multiplayer koristi postojeću peer/relay logiku unutar igre; HTML deploy ne postavlja poseban relay servis.
