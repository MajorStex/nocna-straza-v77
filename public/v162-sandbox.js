/* Noćna Straža V162: accessible, non-blocking compact Spawn Palette.
 * Tiny cached previews share real new-world boss art. UI has zero per-frame work.
 * Game continues at 60 FPS under the overlay. Server alone owns MP NPC changes.
 */
(()=>{
'use strict';
if(window.NS160_LAB)return;
const $=id=>document.getElementById(id);
const tabs=[['mobs','👹 Neprijatelji'],['waves','🌊 Talasi'],['allies','🛡 Saveznici'],['items','📦 Predmeti'],['hero','⚔ Heroj'],['pause','⚙ Kontrole']];
const enemyNames={goblin:'Goblin',troll:'Trol',worm:'Kiseli crv',elephant:'Oklopljeni slon',rotfiend:'Truležni kolos',crawler:'FemMech tamna',skeleton:'FemMech crvena',brute:'FemMech oklop',boss:'Matrijarh',werewolf:'Vukodlak',werewolfAlpha:'Alfa vukodlak'},enemyHp={goblin:35,troll:900,worm:81,elephant:240,rotfiend:1475,crawler:48,skeleton:67,brute:155,boss:900,werewolf:130,werewolfAlpha:1120};
const weapons=['sword','longsword','axe','spear','halberd','warhammer','mace','dagger','falchion','flail','rapier','glaive','greataxe','scimitar','morningstar','trollclub','trollmaul'];
const clamp=(v,a,b,d)=>Number.isFinite(Number(v))?Math.max(a,Math.min(b,Math.round(Number(v)))):d;
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let adapter=null,root=null,shell=null,tab='mobs',minimized=false,selected='goblin',flash='';
const settings={quantity:1,hp:35,wave:1,count:60,mobId:0,singleHp:35,enemyHp:35,damage:22,skin:'#d7b28f',heroClass:'warrior',bodyStyle:'classic',visualSize:79,weapon:'sword',prop:'torch'};
const st=()=>adapter?.getState?.()||{};
const editable=()=>!!adapter&&(adapter.solo||adapter.host);
const row=x=>'<div class="ns162Row">'+x+'</div>';
const btn=(label,cmd)=>'<button type="button" data-cmd="'+cmd+'">'+label+'</button>';
const num=(id,label,value,min,max)=>'<label class="ns162Field">'+label+'<input id="ns162'+id+'" data-setting="'+id+'" type="number" inputmode="numeric" value="'+clamp(value,min,max,min)+'" min="'+min+'" max="'+max+'"></label>';
function thumbnails(){
 for(const canvas of root.querySelectorAll('canvas[data-preview]')){
  const kind=canvas.dataset.preview;if(kind==='goblin'||kind==='troll')window.NS162_TROLL?.drawIcon?.(canvas,kind);else window.__NS110_BRIDGE?.arenaClassicEnemy?.(canvas.getContext('2d'),kind,{x:32,y:38,angle:-Math.PI/2,frame:0,scale:['boss','rotfiend','werewolfAlpha'].includes(kind)?.38:.72});
 }
}
function header(){
 $('ns162Title').textContent=adapter?.solo?'SOLO TEST LAB':adapter?.host?'SERVER TEST LAB · HOST':'SERVER TEST LAB · GOST';
 $('ns162MiniText').textContent=enemyNames[selected];
 $('ns162MiniSpawn').disabled=!editable()||(selected==='troll'&&st().trollAlive===true);
 $('ns162MiniSpawn').textContent='＋ '+enemyNames[selected];
 root.querySelector('.ns162Dock')?.classList.toggle('collapsed',minimized);
 shell?.classList.toggle('collapsed',minimized);
}
function render(){
 if(!adapter||!root)return;
 header();
 const s=st(),wave=clamp(s.wave,1,99,1),def=clamp(s.defaultCount,1,2080,100),boss=wave===10;
 $('ns162Tabs').innerHTML=tabs.map(([key,label])=>'<button type="button" data-tab="'+key+'" class="'+(key===tab?'active':'')+'">'+label+'</button>').join('');
 let content='';
 if(tab==='mobs'){
  const available=s.bossAvailable!==false;
  content='<h3>Izaberi koga stvaraš</h3><p>Dodirni sličicu, zatim pritisni <b>STVORI</b>. Dok je ovaj panel otvoren, igra teče normalno.</p>'+
  '<div class="ns162Picker">'+
   '<button type="button" data-enemy="goblin" class="'+(selected==='goblin'?'active':'')+'"><canvas data-preview="goblin" width="64" height="64"></canvas><b>Goblin</b><small>Običan neprijatelj</small></button>'+
   '<button type="button" data-enemy="troll" '+(!available?'disabled':'')+' class="'+(selected==='troll'?'active':'')+'"><canvas data-preview="troll" width="64" height="64"></canvas><b>🧌 Trol</b><small>BOSS · talas 10</small></button>'+
  (s.rosterAvailable?Object.entries(enemyNames).filter(([k])=>!['goblin','troll'].includes(k)).map(([k,n])=>'<button type="button" data-enemy="'+k+'" class="'+(selected===k?'active':'')+'"><canvas data-preview="'+k+'" width="64" height="64"></canvas><b>'+n+'</b></button>').join(''):'')+
  '</div>'+
  (!available?'<p>Server još nema potvrđenu podršku za novog trola. Solo radi samostalno.</p>':'')+
  '<div class="ns162Summary">Na mapi: <b>'+clamp(s.alive,0,160,0)+' živih</b> od '+clamp(s.total,0,160,0)+' neprijatelja · najviše 160 aktivnih'+(s.trollAlive?' · 🧌 Trol je već tu (1/1)':'')+'</div>'+
  row(num('quantity','Broj komada',selected==='troll'?1:settings.quantity,1,selected==='troll'?1:10)+num('hp','Život (HP)',selected==='troll'?(settings.hp===35?900:settings.hp):settings.hp,1,10000))+
  row(btn('＋ STVORI '+(enemyNames[selected]),'spawnMob')+btn('🧹 Očisti neprijatelje','clearMobs'))+
  '<details><summary>🔧 Napredna podešavanja neprijatelja</summary>'+
  row(btn(s.freezeAI?'▶ Odmrzni sve':'❄ Zamrzni sve','freezeAI')+btn('▶ Vrati talas','resetWave'))+
  row(num('mobId','ID neprijatelja (trol 95)',settings.mobId,0,160)+num('singleHp','Njegov HP',settings.singleHp,1,2000))+
  row(btn('Izmeni HP','setMob')+btn('Obriši izabranog','removeMob'))+
  row(btn('❄ Zamrzni izabranog','toggleMobFreeze'))+
  row(num('enemyHp','HP svima',settings.enemyHp,1,2000)+btn('Primeni svima','enemyHp'))+
  '</details>';
 }else if(tab==='waves'){
  content='<h3>Testiranje talasa</h3><div class="ns162Summary"><strong>DEFAULT · talas '+wave+'</strong><b>'+
   (def+' neprijatelja ukupno')+'</b>'+
   '<small>'+(s.customCount==null?'Originalni raspored, bez izmena':'TEST IZMENA · '+s.customCount+' neprijatelja')+'</small></div>'+
   row(num('wave','Idi na talas',wave,1,99)+btn('▶ POKRENI','wave'))+
   row(num('count','Test broj neprijatelja',s.customCount??def,1,80)+btn('Primeni test broj','count'))+
   row(btn('↻ Ponovi talas','resetWave')+btn('✓ Vrati DEFAULT','resetCount'))+
   '<p>Talas 1: 100 · svaki sledeći +20. Najviše 160 aktivnih; kasnije dolaze pojačanja.</p>';
 }else if(tab==='allies'){
  content='<h3>🛡 Saveznici</h3><p>Testni čuvar sa mačem i štitom automatski prati igrača i napada neprijatelje. Maksimum 3.</p>'+
  '<div class="ns162Summary">Aktivno: '+clamp(s.allies?.length,0,3,0)+'/3</div>'+
  row(btn('＋ Stvori saveznika','spawnAlly')+btn('🧹 Ukloni saveznike','clearAllies'));
 }else if(tab==='items'){
  content='<h3>📦 Predmeti</h3><p>Sanduk koristi originalni izbor nadogradnje. Ostalo su samo testni ukrasi.</p>'+
  row(btn('＋ Classic sanduk','spawnChest')+btn('＋ Postojeći sanduk','spawnArenaChest')+btn('🧹 Ukloni sanduke','clearChests'))+
  '<label class="ns162Field">Testni predmet<select id="ns162Prop" data-setting="prop">'+
  [['torch','🔥 Baklja'],['banner','🚩 Zastava'],['target','🎯 Meta']].map(([id,name])=>'<option value="'+id+'"'+(settings.prop===id?' selected':'')+'>'+name+'</option>').join('')+'</select></label>'+
  row(btn('＋ Dodaj predmet','spawnProp')+btn('🧹 Očisti testne predmete','clearProps'));
 }else if(tab==='hero'){
  content='<h3>⚔ Test heroja</h3><label class="ns162Field">Oružje<select id="ns162Weapon" data-setting="weapon">'+
  weapons.map(w=>'<option value="'+w+'"'+((settings.weapon||s.weapon)===w?' selected':'')+'>'+w+'</option>').join('')+'</select></label>'+
  row(btn('Opremi oružje','weapon')+btn('❤️ Izleči igrače','heal'))+
  row(num('damage','Jačina napada',settings.damage,1,250)+btn('Primeni','damage'))+
  row(btn(s.godMode?'Isključi besmrtnost':'🛡 Uključi besmrtnost','godMode'))+
  '<details><summary>🎨 Izgled samo tokom testiranja</summary>'+
  '<label class="ns162Field">Koža<input type="color" data-setting="skin" value="'+safe(settings.skin)+'"></label>'+
  '<label class="ns162Field">Klasa<select data-setting="heroClass">'+['warrior','ranger','mage','support'].map(c=>'<option value="'+c+'"'+(settings.heroClass===c?' selected':'')+'>'+c+'</option>').join('')+'</select></label>'+
  '<label class="ns162Field">Građa<select data-setting="bodyStyle">'+['classic','slim','strong'].map(c=>'<option value="'+c+'"'+(settings.bodyStyle===c?' selected':'')+'>'+c+'</option>').join('')+'</select></label>'+
  row(num('visualSize','Veličina (%)',settings.visualSize,70,112)+btn('Presvuci','heroLook'))+'</details>';
 }else{
  content='<h3>⚙ Kontrole partije</h3><p>Igra normalno teče i kada je ovaj panel otvoren ili spušten.</p>'+
  (adapter.solo?'<div class="ns162Summary">SOLO · pauziraj iz glavnog MENI-ja.</div>':
  '<div class="ns162Summary">'+(s.globalPaused?'Zajednička pauza aktivna':'Svi nastavljaju da igraju')+' · Glasovi '+clamp(s.votes?.length,0,6,0)+' / '+clamp(s.needed,1,6,1)+'</div>'+
  row(btn('🗳 Glasaj za pauzu','pauseVote')+btn('▶ Nastavi svima','resumeAll')))+
  row(btn('↶ Poništi poslednju izmenu','undo')+btn('↩ Originalna podešavanja','resetLab'));
 }
 if(!editable())content='<p>Gost može da gleda. Samo host uređuje server. Svi mogu da glasaju za pauzu.</p>'+content;
 $('ns162Content').innerHTML=content;
 for(const el of $('ns162Content').querySelectorAll('[data-cmd]'))
  if(!editable()&&!['pauseVote','resumeAll'].includes(el.dataset.cmd))el.disabled=true;
 if(flash)$('ns162Message').textContent=flash;
 thumbnails();
}
function dispatch(command){
 if(!adapter)return;
 const s=st();let packet={action:command};
 if(command==='spawnMob')packet={action:command,kind:selected,quantity:selected==='troll'?1:clamp(settings.quantity,1,10,1),
  hp:clamp(settings.hp,1,selected==='troll'?2000:500,enemyHp[selected]||35)};
 else if(command==='wave')packet.value=clamp(settings.wave,1,99,1);
 else if(command==='count')packet.value=clamp(settings.count,1,80,60);
 else if(command==='setMob'||command==='removeMob'||command==='toggleMobFreeze'){
  packet.id=clamp(settings.mobId,0,95,0);
  if(command==='setMob')packet.hp=clamp(settings.singleHp,1,2000,35);
 }else if(command==='enemyHp'||command==='damage')packet.value=clamp(settings[command],1,2000,35);
 else if(command==='freezeAI')packet.value=!s.freezeAI;
 else if(command==='godMode')packet.value=!s.godMode;
 else if(command==='weapon')packet.value=settings.weapon;
 else if(command==='spawnArenaChest'){packet.action='spawnChest';packet.style='arena'}
 else if(command==='spawnChest')packet.style='classic';
 else if(command==='spawnProp')packet.kind=settings.prop;
 else if(command==='heroLook')packet.look={skin:settings.skin,heroClass:settings.heroClass,
  bodyStyle:settings.bodyStyle,visualSize:clamp(settings.visualSize,70,112,79)/100};
 if(command==='pauseVote'){adapter.vote?.();flash='Glas poslat serveru';}
 else if(command==='resumeAll'){adapter.resumeAll?.();flash='Zahtev za nastavak poslat';}
 else if(editable()){
  if(selected==='troll'&&command==='spawnMob'&&s.bossAvailable===false)flash='Novi server još ne podržava trola';
  else if(selected==='troll'&&command==='spawnMob'&&s.trollAlive)flash='Trol je već na mapi. Ukloni ga pre novog spawnovanja.';
  else {adapter.command?.(packet);flash='✓ '+(command==='spawnMob'?('Stvaram '+enemyNames[selected]):'Test komanda poslata')}
 }else flash='Samo host može da menja svet';
 $('ns162Message').textContent=flash; // no per-command full DOM rebuild
 if(!minimized&&['wave','count','resetCount','resetWave','undo','resetLab','spawnMob'].includes(command))
  setTimeout(()=>{if(adapter&&!minimized)render()},250);
}
function setMini(value){
 minimized=!!value;
 header();
 if(root){
  root.classList.toggle('mini',minimized);
  $('ns162Expand').textContent=minimized?'▢ OTVORI':'▁ SPUSTI';
 }
}
function open(next){
 adapter=next;tab='mobs';minimized=false;flash='';
 if(!root){
  const style=document.createElement('style');
  style.textContent=`
#ns162Lab[hidden]{display:none!important}
#ns162Lab{position:fixed;inset:0;z-index:100020;pointer-events:none;color:#f8ebcb;font:12px/1.45 system-ui}
#ns162Shell{pointer-events:auto;position:absolute;right:8px;top:calc(62px + env(safe-area-inset-top));width:min(318px,calc(100vw - 124px));height:calc(100dvh - 72px - env(safe-area-inset-top));max-height:590px;background:#19372edc;border:1px solid #9aab8d;border-radius:13px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 24px #0009}
#ns162Shell button{background:#315849;border:1px solid #829c8b;color:#fff3d2;border-radius:7px;min-height:34px;padding:6px;cursor:pointer;font:700 11px system-ui}
#ns162Shell button:disabled{opacity:.4}#ns162Head{display:flex;align-items:center;gap:5px;padding:5px 7px;background:#213e34}
#ns162Head strong{flex:1;font-size:10px;letter-spacing:.05em}#ns162Head button{white-space:nowrap}
#ns162Tabs{display:flex;flex-shrink:0;gap:4px;overflow:auto;padding:5px;touch-action:pan-x;background:#112c25}
#ns162Tabs button{min-width:max-content;flex-shrink:0}#ns162Tabs .active{background:#59775e;border-color:#e7c68c}
#ns162Content{overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;padding:9px;flex:1;min-height:0}
#ns162Content h3{font-size:14px;margin:0 0 4px;color:#ffdaa0}#ns162Content p{font-size:11px;color:#d3e2d4;margin:5px 0 9px}
#ns162Content button{flex:1;min-width:95px}#ns162Content .ns162Row{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;align-items:end}
#ns162Content .ns162Field{display:grid;gap:3px;flex:1;min-width:100px;font-size:11px;color:#f4ddad}
#ns162Content input,#ns162Content select{min-width:0;max-width:100%;width:100%;box-sizing:border-box;border:1px solid #809b89;border-radius:7px;background:#102a23;color:white;padding:7px;min-height:35px}
#ns162Content details{border-top:1px solid #638572;padding:8px 0;margin-top:9px}#ns162Content summary{font-weight:800;cursor:pointer;padding:5px}
#ns162Content .ns162Summary{background:#284936;border:1px solid #7f9d71;border-radius:9px;padding:9px;display:grid;gap:4px}
#ns162Content .ns162Summary strong{color:#ffe0a7;font-size:12px}#ns162Content .ns162Summary small{font-size:10px;color:#cadfc6}
#ns162Content .ns162Picker{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:9px 0}
#ns162Content .ns162Picker button{display:grid;place-items:center;gap:3px;min-width:0;padding:6px}
#ns162Content .ns162Picker button.active{background:#48644e;border:2px solid #f1d18a}
#ns162Content .ns162Picker canvas{width:60px;height:60px;image-rendering:auto}
#ns162Content .ns162Picker small{font-size:9px;font-weight:500}
#ns162Message{padding:5px 8px;background:#0d281f;color:#ddf0d7;font-size:10px;min-height:16px}
#ns162Dock{display:none}
#ns162Lab.mini #ns162Shell{width:min(236px,calc(100vw - 110px));height:auto;max-height:unset}
#ns162Lab.mini #ns162Tabs,#ns162Lab.mini #ns162Content,#ns162Lab.mini #ns162Message{display:none}
#ns162Lab.mini #ns162Head{padding:6px}
#ns162Lab.mini #ns162Head strong,#ns162Lab.mini #ns162Close{display:none}
#ns162Lab.mini #ns162Dock{display:flex;gap:5px;align-items:center}
#ns162Lab.mini #ns162Dock button{white-space:nowrap}
@media(max-height:450px){#ns162Shell{top:55px;height:calc(100dvh - 62px);max-height:unset}}
`;
  document.head.append(style);
  root=document.createElement('section');root.id='ns162Lab';root.hidden=true;
  root.innerHTML='<div id="ns162Shell"><div id="ns162Head"><strong id="ns162Title">TEST LAB</strong>'+
   '<div id="ns162Dock"><span id="ns162MiniText">Goblin</span><button type="button" id="ns162MiniSpawn">＋ Goblin</button></div>'+
   '<button type="button" id="ns162Expand">▁ SPUSTI</button><button type="button" id="ns162Close">✕</button></div>'+
   '<nav id="ns162Tabs" aria-label="Kategorije Sandboxa"></nav><div id="ns162Content"></div>'+
   '<small id="ns162Message">Sandbox: nema XP ni trajnih promena</small></div>';
  document.body.append(root);shell=$('ns162Shell');
  $('ns162Expand').onclick=()=>setMini(!minimized);
  $('ns162Close').onclick=close;
  $('ns162MiniSpawn').onclick=()=>dispatch('spawnMob');
  $('ns162Tabs').onclick=e=>{const key=e.target.closest('[data-tab]')?.dataset.tab;if(key){tab=key;render()}};
  $('ns162Content').addEventListener('click',e=>{
   const enemy=e.target.closest('[data-enemy]')?.dataset.enemy;
   if(enemy){if(enemy==='troll'&&st().bossAvailable===false)return;
    selected=enemy;settings.hp=enemyHp[enemy]||35;render();return}
   const command=e.target.closest('[data-cmd]')?.dataset.cmd;
   if(command)dispatch(command);
  });
  const save=e=>{const key=e.target.dataset.setting;if(!key)return;
   if(key==='skin'||['heroClass','bodyStyle','weapon','prop'].includes(key))settings[key]=e.target.value;
   else settings[key]=Number(e.target.value);
  };
  $('ns162Content').addEventListener('input',save);
  $('ns162Content').addEventListener('change',save);
 }
 root.hidden=false;setMini(false);render();
 settings.wave=clamp(st().wave,1,99,1);
}
function close(){
 if(root)root.hidden=true;
 const prior=adapter;adapter=null;prior?.onClose?.();
}
function refresh(){if(adapter&&!minimized)render()}
window.NS160_LAB={open,close,refresh,minimize:()=>setMini(true),get active(){return !!adapter},
 get minimized(){return minimized},get blocksInput(){return false}};
})();
