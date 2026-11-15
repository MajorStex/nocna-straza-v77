/* Noćna Straža V160 — lightweight runtime Spawn Menu / Test Lab.
 * Zero saved progression. Actions run in local SOLO simulation or authoritative MP server.
 * Rebuilds DOM only when opened/changed, never in the 60FPS render loop.
 */
(()=>{
 'use strict';
 if(window.NS160_LAB)return;
 const $=id=>document.getElementById(id);
 let adapter=null,tab='waves',root=null,flash='';
 const weapons=['sword','longsword','axe','spear','halberd','warhammer','mace','dagger','falchion','flail','rapier','glaive','greataxe','scimitar','morningstar','trollclub','trollmaul'];
 const tabs=[['waves','🌊 Talasi'],['mobs','👹 Neprijatelji'],['allies','🛡 Saveznici'],['items','📦 Predmeti'],['hero','🗡 Igrač'],['pause','⏸ Pauza']];
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const n=(v,d=0)=>Number.isFinite(Number(v))?Math.round(Number(v)):d;
 const val=(id,defaultValue=0)=>n($(id)?.value,defaultValue);
 const state=()=>adapter?.getState?.()||{};
 const editable=()=>!!adapter?.solo||!!adapter?.host;
 function input(id,label,value,min,max){return '<label class="ns160Field">'+esc(label)+'<input id="'+id+'" type="number" inputmode="numeric" value="'+n(value)+'" min="'+min+'" max="'+max+'"></label>'}
 function button(text,cmd,extra=''){return '<button type="button" data-cmd="'+cmd+'" '+extra+'>'+text+'</button>'}
 function row(body){return '<div class="ns160Row">'+body+'</div>'}
 function render(){
  if(!root||!adapter)return;
  const s=state(),wave=n(s.wave,1),def=n(s.defaultCount,60),alive=n(s.alive),total=n(s.total);
  const override=s.customCount===null||s.customCount===undefined?null:n(s.customCount);
  $('ns160Tabs').innerHTML=tabs.map(([id,title])=>'<button type="button" data-tab="'+id+'" class="'+(id===tab?'active':'')+'">'+title+'</button>').join('');
  $('ns160Header').textContent=adapter.solo?'SOLO SANDBOX · 0 XP':adapter.host?'SERVER SANDBOX · HOST · 0 XP':'SERVER SANDBOX · PREGLED · 0 XP';
  let content='';
  if(tab==='waves'){
   content='<h3>🌊 Talasi</h3><p>Originalni broj neprijatelja ostaje podrazumevan. Svaka izmena važi samo u ovoj testnoj partiji.</p>'+
    '<div class="ns160Default"><b>DEFAULT · TALAS '+wave+'</b><strong>'+def+' goblina</strong><small>'+(override===null?'Koristi se ORIGINALNI broj':'TEST OVERRIDE · trenutno '+override+' neprijatelja')+'</small></div>'+
    row(input('ns160Wave','Broj talasa',wave,1,99)+input('ns160Count','Test broj goblina',override??def,1,80))+
    row(button('▶ Idi na talas','wave')+button('↻ Ponovi talas','resetWave'))+
    row(button('✎ Primeni test broj','count')+button('✓ Vrati DEFAULT','resetCount'))+
    '<p>Formula u Novoj Zoni: talas 1 = 60, talas 2 = 70, talas 3 i kasniji = 80 (maksimum). Odabir talasa sam po sebi zadržava DEFAULT.</p>';
  } else if(tab==='mobs'){
   content='<h3>👹 Neprijatelji</h3><p>Trenutni katalog Nove Zone: <b>Goblin</b> sa postojećim animacijama, zvukom i AI. Stari bossovi nisu ubačeni pod lažnim nazivima.</p>'+
    '<div class="ns160Default">Na mapi: <b>'+alive+' živih</b> / '+total+' ukupno · maksimum 80</div>'+
    row(input('ns160Qty','Koliko da stvorim',1,1,10)+input('ns160MobHp','HP novih goblina',35,1,500))+
    row(button('➕ Stvori pored mene','spawnMob')+button('🧹 Obriši sve gobline','clearMobs'))+
    row(input('ns160EnemyHp','HP svim živim goblinima',35,1,500)+button('Primeni HP','enemyHp'))+
    row(button(s.freezeAI?'▶ Pokreni neprijatelje':'⏸ Zamrzni neprijatelje','freezeAI'))+
    '<p>Za detaljno podešavanje pojedinačnog neprijatelja koristi identifikator:</p>'+
    row(input('ns160MobId','ID goblina (0–95)',0,0,95)+input('ns160SingleHp','Njegov HP',35,1,500))+
    row(button('Primeni na jednog','setMob')+button('Obriši jednog','removeMob'))+
    row(button('❄ Zamrzni / odmrzni izabranog','toggleMobFreeze'))+
    '<p>Prilikom zamrzavanja goblini prestaju da se kreću i napadaju. Saveznik i igrač i dalje mogu da testiraju udarce.</p>';
  }else if(tab==='allies'){
   content='<h3>🛡 Saveznici</h3><p>Jednostavan testni čovečuljak sa štitom i mačem, server ga vodi, prati saigrača i napada gobline. Najviše 3.</p>'+
    '<div class="ns160Default">Aktivno: <b>'+n(s.allies?.length)+'/3</b></div>'+
    row(button('➕ Dodaj čuvara','spawnAlly')+button('🧹 Ukloni saveznike','clearAllies'))+
    '<p>Nema nagrada niti napredovanja; saveznik služi samo za simulaciju borbe i proveru sinhronizacije.</p>';
  }else if(tab==='items'){
   content='<h3>📦 Sanduci i predmeti</h3><p>Sanduk koristi postojeći sistem za izbor nadogradnje (oštrica, srce, čizme). Ostali predmeti služe kao lagani testni ukrasi.</p>'+
    row(button('📦 Dodaj sanduk','spawnChest')+button('🧹 Obriši sanduke','clearChests'))+
    '<label class="ns160Field">Testni objekat<select id="ns160Prop"><option value="torch">Baklja</option><option value="banner">Zastava</option><option value="target">Meta za gađanje</option></select></label>'+
    row(button('➕ Postavi objekat','spawnProp')+button('🧹 Obriši testne objekte','clearProps'))+
    '<p>Postojeća kućica, drvo i kamen ostaju deo originalne mape. Testni predmeti ne menjaju server-hitboxove.</p>';
  }else if(tab==='hero'){
   content='<h3>🗡 Oprema i igrač</h3><p>Oružja su postojeći modeli/animacije; u Test Lab-u menja se izgled oružja, dok šteta ima svoje testno podešavanje.</p>'+
    '<label class="ns160Field">Oružje<select id="ns160Weapon">'+weapons.map(w=>'<option value="'+w+'"'+(s.weapon===w?' selected':'')+'>'+esc(w)+'</option>').join('')+'</select></label>'+
    row(button('⚔ Opremi oružje','weapon')+button('❤️ Izleči sve igrače','heal'))+
    row(input('ns160Damage','Test šteta napada',n(s.damage,22),1,250)+button('Primeni štetu','damage'))+
    row(button(s.godMode?'🛡 Isključi besmrtnost':'🛡 Uključi besmrtnost','godMode'))+
    '<label class="ns160Field">Boja kože <input id="ns160Skin" type="color" value="'+esc(/^#[a-fA-F0-9]{6}$/.test(s.skin||'')?s.skin:'#d7b28f')+'"></label>'+
    '<label class="ns160Field">Test klasa<select id="ns160HeroClass">'+['warrior','ranger','mage','support'].map(c=>'<option value="'+c+'"'+(s.heroClass===c?' selected':'')+'>'+c+'</option>').join('')+'</select></label>'+
    '<label class="ns160Field">Građa<select id="ns160BodyStyle">'+['classic','slim','strong'].map(c=>'<option value="'+c+'"'+(s.bodyStyle===c?' selected':'')+'>'+c+'</option>').join('')+'</select></label>'+
    row(input('ns160Size','Veličina izgleda (%)',n((s.visualSize||.79)*100),70,112)+button('🎨 Presvuci heroja','heroLook'))+
    '<p>Boje i garderoba u trajnom Hero Editoru ostaju nepromenjene. Sve gore je samo testni izgled ove partije.</p>';
  }else if(tab==='pause'){
   content='<h3>⏸ Kontrola simulacije</h3>'+(adapter.solo?
     '<div class="ns160Default">SOLO · simulacija je zaustavljena dok je Test Lab otvoren. Zatvori meni za nastavak.</div>':
     '<div class="ns160Default">'+(s.globalPaused?'SVI IGRAČI SU PAUZIRANI':'IGRA U POZADINI NASTAVLJA DA RADI')+
     '<small>Glasovi: '+n(s.votes?.length)+' / '+n(s.needed,1)+' · za pauzu je potrebna saglasnost svih povezanih igrača.</small></div>'+
     row(button('🗳 Glasaj ZA pauzu','pauseVote')+button('▶ Nastavi svima','resumeAll')))+
    row(button('↶ Poništi poslednju izmenu','undo')+button('↩ Vrati standardna podešavanja','resetLab'))+
    '<p>Izmene ne utiču na nalog, XP, stare modove ni stalna podešavanja talasa.</p>';
  }
  if(!editable()){
   content='<p>U multiplayeru samo domaćin (igrač p1) menja server. Možeš da pregledaš sadržaj i glasaš za pauzu.</p>'+content;
  }
  $('ns160Content').innerHTML=content;
  for(const item of $('ns160Content').querySelectorAll('[data-cmd]')){
   if(!editable()&&!['pauseVote','resumeAll'].includes(item.dataset.cmd))item.disabled=true;
  }
  if(flash)$('ns160Message').textContent=flash;
 }
 function run(cmd){
  if(!adapter)return;
  const s=state();let packet={action:cmd};
  if(cmd==='wave')packet.value=val('ns160Wave',1);
  else if(cmd==='count')packet.value=val('ns160Count',60);
  else if(cmd==='spawnMob'){packet.quantity=val('ns160Qty',1);packet.hp=val('ns160MobHp',35)}
  else if(cmd==='enemyHp'||cmd==='damage')packet.value=val(cmd==='enemyHp'?'ns160EnemyHp':'ns160Damage',35);
  else if(cmd==='setMob'){packet.id=val('ns160MobId',0);packet.hp=val('ns160SingleHp',35)}
  else if(cmd==='removeMob')packet.id=val('ns160MobId',0);
  else if(cmd==='toggleMobFreeze')packet.id=val('ns160MobId',0);
  else if(cmd==='weapon')packet.value=$('ns160Weapon')?.value;
  else if(cmd==='heroLook')packet.look={skin:$('ns160Skin')?.value,heroClass:$('ns160HeroClass')?.value,bodyStyle:$('ns160BodyStyle')?.value,visualSize:val('ns160Size',79)/100};
  else if(cmd==='spawnProp')packet.kind=$('ns160Prop')?.value;
  else if(cmd==='freezeAI')packet.value=!s.freezeAI;
  else if(cmd==='godMode')packet.value=!s.godMode;
  if(cmd==='pauseVote'){adapter.vote?.();flash='Glas poslat serveru.'}
  else if(cmd==='resumeAll'){adapter.resumeAll?.();flash='Zahtev za nastavak poslat.'}
  else if(editable()){adapter.command?.(packet);flash='Zahtev: '+cmd+' · SOLO odmah / MP posle potvrde servera.'}
  else flash='Samo host može da menja testni svet.';
  render();
 }
 function open(next){
  adapter=next;
  if(!root){
   const style=document.createElement('style');style.textContent=
    '#ns160Lab{position:fixed;inset:0;z-index:100030;background:#061710cf;display:grid;place-items:center;padding:10px;color:#f4e6c5;font:13px system-ui}'+
    '#ns160Lab[hidden]{display:none!important}#ns160Shell{width:min(680px,100%);height:min(630px,94dvh);display:flex;flex-direction:column;background:#17362f;border:1px solid #afc5a0;border-radius:14px;overflow:hidden;box-shadow:0 15px 36px #000a}'+
    '#ns160Head{display:flex;align-items:center;gap:8px;padding:9px;background:#24483b}#ns160Head b{flex:1;font-size:12px}#ns160Head button{padding:8px 12px}'+
    '#ns160Tabs{display:flex;gap:4px;overflow-x:auto;flex-shrink:0;padding:7px;background:#143028;touch-action:pan-x}#ns160Tabs button{white-space:nowrap;font-size:11px;padding:8px 10px;flex-shrink:0}#ns160Tabs .active{background:#65784d;color:#fff}'+
    '#ns160Content{overflow-y:auto;flex:1;padding:14px;touch-action:pan-y;overscroll-behavior:contain}#ns160Content h3{margin:0 0 7px;color:#f5d69a}#ns160Content p{font-size:12px;line-height:1.48;color:#d0dfcf}'+
    '#ns160Content button,#ns160Head button,#ns160Tabs button{border:1px solid #8baf9b;background:#315748;color:#f9edd1;border-radius:9px;cursor:pointer;min-height:40px}'+
    '#ns160Content button:disabled{opacity:.36;cursor:default}#ns160Content .ns160Row{display:flex;align-items:end;gap:8px;margin:10px 0;flex-wrap:wrap}#ns160Content .ns160Row>*{flex:1;min-width:110px}'+
    '#ns160Content .ns160Field{display:grid;gap:4px;font-size:11px;color:#e6dcb9}#ns160Content input,#ns160Content select{max-width:100%;min-height:41px;padding:7px;background:#0e2c26;color:#fff;border:1px solid #819c8e;border-radius:8px}'+
    '#ns160Content .ns160Default{display:grid;gap:5px;border:1px solid #d6bc83;padding:13px;border-radius:10px;background:#244535;font-size:13px}#ns160Content .ns160Default strong{font-size:20px;color:#ffe1a5}'+
    '#ns160Content .ns160Default small{color:#c9e4c9;font-size:11px}#ns160Message{padding:7px 12px;background:#122b25;color:#d7e6bd;font-size:10px;min-height:29px}';
   document.head.append(style);
   root=document.createElement('section');root.id='ns160Lab';root.hidden=true;
   root.innerHTML='<div id="ns160Shell"><div id="ns160Head"><b id="ns160Header">TEST LAB</b><button id="ns160Close" type="button">✕ NAZAD</button></div>'+
    '<nav id="ns160Tabs"></nav><div id="ns160Content"></div><small id="ns160Message">Samo testna partija · nema nagrada ni trajnih izmena.</small></div>';
   document.body.append(root);
   $('ns160Close').onclick=close;
   $('ns160Tabs').addEventListener('click',event=>{const key=event.target?.closest('[data-tab]')?.dataset.tab;if(key){tab=key;flash='';render()}});
   $('ns160Content').addEventListener('click',event=>{const cmd=event.target?.closest('[data-cmd]')?.dataset.cmd;if(cmd)run(cmd)});
  }
  root.hidden=false;tab='waves';flash='';render();
 }
 function close(){if(root)root.hidden=true;const a=adapter;adapter=null;a?.onClose?.()}
 function refresh(){if(root&&!root.hidden)render()}
 window.NS160_LAB={open,close,refresh,get active(){return !!root&&!root.hidden}};
})();
