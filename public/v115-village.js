/* Noćna Straža V115 optional village lobby. V114 game logic and save schema remain unchanged.
 * This peaceful scene is only a presentation of existing lobby/upgrade/chat/shop systems.
 * Multiplayer position packets are bounded, non-authoritative cosmetic movement only. */
(function(){
 'use strict';
 if(window.NS109_VILLAGE)return;
 // The original game is a private IIFE; consume only its explicit read/write bridge.
 const {NET,G,NSX,NS91,NS97_POST,NS76CHAT,CoopVoice,renderCoopForge,renderPreRun,
  currentLobbyRoster,currentProfileLevel,getActiveAccount,coopVoiceUpdatePreference,
  unlockSound,voiceLine,toast,meta,heroStyle,drawVillageHero,getVillageHeroLook,
 NS103_PARTY,NS96_INVITES,SOCIAL,startSocial,socialCheckFriends,showFriends,ensureSocialIdentity,safePlayerName,sendSocialStatus,NS92_DIR}=window.__NS110_BRIDGE||{};
 if(!NET||!G||!NS91||!NS97_POST){console.error('Village: game API not ready');return}
 const $=id=>document.getElementById(id);
 const tr=(en,sr)=>window.__gameLanguage?.value==='sr'?sr:en;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 // V138: larger, walkable map. Existing cottage IDs remain unchanged for lobby actions.
 const VILLAGE_W=1660,VILLAGE_H=960;
 const buildings=[
  {id:'shop',x:250,y:248,w:156,h:114,label:'SHOP',sr:'PRODAVNICA',roof:'#8d5651',wall:'#c0a481',icon:'🛒'},
  {id:'guardian',x:565,y:210,w:214,h:126,label:'GUARDIAN BASE',sr:'TRAJNA UNAPREĐENJA',roof:'#525b78',wall:'#ada9a0',icon:'✦'},
  {id:'armory',x:915,y:247,w:148,h:119,label:'ARMORY',sr:'ORUŽARNICA',roof:'#72594a',wall:'#c0ac87',icon:'⚒'},
  {id:'invite',x:1260,y:205,w:156,h:110,label:'INVITE HALL',sr:'KUĆA POZIVA',roof:'#456a70',wall:'#b9c4ad',icon:'✉'},
  {id:'academy',x:248,y:718,w:162,h:106,label:'HERO ACADEMY',sr:'AKADEMIJA',roof:'#485b70',wall:'#b7b6a6',icon:'⚔'},
  {id:'hall',x:566,y:717,w:178,h:106,label:'HALL OF FAME',sr:'DOSTIGNUĆA',roof:'#605a7d',wall:'#aaa8b8',icon:'🏆'},
  {id:'chat',x:954,y:717,w:178,h:110,label:'TAVERN / CHAT',sr:'KRČMA / ČET',roof:'#967255',wall:'#d0b385',icon:'💬'},
  {id:'ready',x:1312,y:713,w:145,h:105,label:'READY GATE',sr:'KAPIJA STARTA',roof:'#386d61',wall:'#b8ac84',icon:'✓'},
  {id:'barn',x:1452,y:429,w:194,h:130,label:'PVP BARN',sr:'ŠTALA ZA PVP',roof:'#845348',wall:'#bf9b72',icon:'⚔'}
 ];
 const avatars=new Map(),smoothAvatars=new Map(),limits=new Map(),emotes=new Map();
 // Ambient animals use deterministic clock-based patrols; no extra rAF or network movement packets.
 const NPCS=[
  ['sheep',350,400],['sheep',440,845],['sheep',720,391],['sheep',1073,425],
  ['sheep',1365,857],['sheep',1532,745],['sheep',132,441],
  ['pig',335,867],['pig',1050,858],['pig',1493,819],['pig',1456,558],['pig',590,417]
 ].map(([kind,x,y],id)=>({id,kind,x,y,hp:2,deadUntil:0}));
 // V141: lightweight, client-local training enemies; no XP, cloud saves or multiplayer damage.
 // The real lobby/relay continues to run independently while Village is open.
 const TRAINING_SPAWNS=[[1070,575],[1160,540],[1210,590]];
 const trainingMobs=TRAINING_SPAWNS.map(([x,y],id)=>({id,x,y,sx:x,sy:y,hp:3,deadUntil:0}));
 // V170 practice crates: three temporary targets, no XP, drops or persistent rewards.
 const VILLAGE_CRATES=[[880,420],[1215,550],[465,560]].map(([x,y],id)=>({id,x,y,hp:3,deadUntil:0}));
 let trainingOn=false,trainingKills=0,trainingCredit=0,lastRosterCount=0,joinNoticeUntil=0,lastResultsRoundShown=-1;
 let opened=false,soloPreview=false,focused=null,focusNode=null,returnPlace=null,walkTo=null,thenEnter=null,lastSent=0,frameAt=0,lastBroadcast=0,lastLeaderboard=0,lastLeaderRequest=0,leaderCache=null,leaderBusy=false;
 let originalShowLobby=null,originalStartMatch=null,originalSettle=null,originalAward=null,originalOnKill=null,musicCtx=null,musicTimer=null,musicOn=false;
 let villageAudioCtx=null,villageMusic=null,animalTicker=null,animalSamples=new Map(),lastAnimalCall=0,lastFX=0,noiseBuffer=null,animalAudioReady=false;
 const animalLast=new Map();let musicFallbackStep=0;
 const CC0_VILLAGE_AUDIO=Object.freeze({
  sheep:'https://upload.wikimedia.org/wikipedia/commons/2/28/Sheep_bleat.ogg',
  pig:'https://upload.wikimedia.org/wikipedia/commons/6/6f/618483_foleyhaven_piglet-squeal-01.flac',
  music:'https://opengameart.org/sites/default/files/peaceful_ville_2023.mp3'
 });
 const audioEnabled=()=>!document.hidden&&!!opened&&!root.classList.contains('ns109Hidden');
 const fxEnabled=()=>audioEnabled()&&($('sfxEnabled')?.checked!==false)&&!localStorage.getItem('ns144_village_fx_off');
 const fxLevel=()=>{const n=Number($('volume')?.value);return clamp(Number.isFinite(n)?n:.52,0,1)};
 const musicLevel=()=>{const n=Number($('musicVolume')?.value);return clamp(Number.isFinite(n)?n:.18,0,.4)};
 const preferMusic=()=>localStorage.getItem('ns144_village_music_off')!=='1'&&$('musicEnabled')?.checked!==false;
 // V118 profiling is local-only: no network packets or account writes.
 let villageLastTick=0,villageFrameCredit=0,sceneLayer=null,sceneLayerLang='';let route=[],routeIndex=0,doorLatch=null,doorLabel='';
 const houseLayers=new Map();let lastDepthOrder=[];let pendingAutoRoom='',pendingAutoUntil=0,lastInviteUiAt=0;
 // One shared rAF with the game's update loop; avoid a second timer and frame pacing drift.
 const VILLAGE_TARGET_MS=1000/60;
 let fpsStart=0,fpsFrames=0,drawMsSum=0,drawMsMax=0,lastStatsAt=0;
 const PERF={frames:0,staticBuilds:0,blockedMoves:0,paths:0,fps:0,averageDrawMs:0,maxDrawMs:0,targetFps:60};
 const SHOW_PERF=new URLSearchParams(location.search).has('village-fps');
 let fpsBadge=null;
 if(SHOW_PERF){
  fpsBadge=document.createElement('div');fpsBadge.id='ns119Fps';
  fpsBadge.setAttribute('role','status');
  fpsBadge.style.cssText='position:absolute;z-index:5;right:9px;top:6px;min-width:78px;padding:4px 7px;border-radius:8px;border:1px solid #739b87;background:#071d20db;color:#d0f8d8;font:700 11px monospace;pointer-events:none;text-align:right';
  fpsBadge.textContent='FPS --';
 }
 const stick={id:null,x:0,y:0,vx:0,vy:0,drag:false},keys=Object.create(null);let stepFrame=0,side=1,walking=false,dodgeUntil=0,dodgeReady=0;
 const my={x:840,y:506};
 const root=document.createElement('section');root.id='ns109Village';root.className='ns109Hidden';root.setAttribute('aria-label','Village lobby');
 root.innerHTML=
  '<div id="ns109Top"><strong>🏡 '+tr('VILLAGE','SELO')+' · V170</strong><span id="ns109Info" role="status" aria-live="polite">◇ OFFLINE SELO</span><button id="ns141Server" type="button">🌐 PODIGNI SERVER</button>'+
  '<button id="ns109Sound" type="button">♫</button><button id="ns109Classic" type="button">☷ CLASSIC LOBBY</button></div>'+
  '<div id="ns109Stage"><canvas id="ns109Scene" width="960" height="540" aria-label="Village with interactive buildings"></canvas><div id="ns117Stick" class="ns109Hidden" aria-hidden="true"><span id="ns117Knob"></span></div><button id="ns117Dodge" type="button" aria-label="Dodge / Izbegni">↝<small>DODGE</small></button><button id="ns120Door" type="button" class="ns109Hidden" aria-label="Enter building / Uđi u kućicu">↳ ENTER</button>'+


  '<div id="ns141Join" class="ns109Hidden" aria-live="polite"></div><div id="ns109Hint">Tap the ground to move, or a house to walk there. Enter the green gate when ready.</div></div>'+
  // V169 mobile toolbar: existing actions are preserved, secondary tools move to a menu.
  '<div id="ns169Scrim" hidden></div>'+
  '<div id="ns169Menu" hidden role="group" aria-label="Village options"><strong>🏡 VILLAGE · MENI</strong>'+
  '<button id="ns144Fx" type="button" aria-label="Toggle village sounds">🔊 FX</button>'+
  '<button id="ns109Results" type="button">🏆 RESULTS</button>'+
  '<button id="ns109Global" type="button">🌍 GLOBAL RANKINGS</button>'+
  '<button id="ns109Sparta" type="button">🛡 SPARTA</button>'+
  '<button id="ns109Voices" type="button">🎙 SNIMLJENI GLASOVI</button></div>'+
  '<div id="ns109Bottom"><button id="ns109Chat" type="button">💬 CHAT</button>'+
  '<button id="ns141Training" type="button">⚔ TRENING: OFF</button>'+
  '<button id="ns169More" type="button" aria-controls="ns169Menu" aria-expanded="false" aria-label="Više opcija">☰ MENI</button></div>'+
  '<div id="ns109Pane" class="ns109Hidden" role="dialog" aria-modal="false"><div class="ns109PaneBox"><div id="ns109PaneHead"><strong id="ns109PaneTitle"></strong><button id="ns109PaneBack" type="button">✕</button></div><div id="ns109PaneContent"></div></div></div>';
 const css=document.createElement('style');css.textContent=[
  '#ns109Village{position:fixed;inset:0;z-index:110;background:#101d24;color:#f3e7cc;display:flex;flex-direction:column;font-family:system-ui,sans-serif;overflow:hidden;touch-action:manipulation}',
  '.ns109Hidden{display:none!important}',
  '#ns109Village button{font-size:clamp(10px,2.5vw,13px);padding:8px 10px;border-radius:9px;white-space:nowrap;min-height:36px}',
  '#ns109Top{display:flex;gap:7px;align-items:center;flex-wrap:wrap;padding:calc(6px + env(safe-area-inset-top)) 8px 7px;background:#17292b;z-index:1}',
  '#ns109Top strong{font-size:clamp(12px,3vw,16px);color:#efc786;margin-right:auto}',
  '#ns109Destinations{max-width:125px;min-height:36px;font-size:11px;padding:5px;background:#233c3c;color:#f5d9a1}',
  '#ns109Info{font-size:10px;color:#a9c1b2;min-width:130px}',
  '#ns141Server{padding:7px 9px!important;background:#225345;border-color:#77b99b!important;color:#e9ffda;max-width:220px}',
  '#ns141Training{background:#25453f;border-color:#b59b64;color:#fae3aa}',
  '#ns141Join{position:absolute;z-index:7;top:12px;left:50%;transform:translateX(-50%);max-width:min(88vw,420px);padding:8px 12px;background:#153e32f2;color:#e7f6d3;border:1px solid #86cda3;border-radius:9px;font-size:12px;font-weight:750;pointer-events:none;text-align:center}',
  '@media(max-width:580px){#ns141Server{font-size:10px!important;padding:5px 7px!important}#ns109Info{font-size:9px;min-width:90px}}',
  '#ns109Stage{flex:1;min-height:0;position:relative;overflow:hidden;background:#1c3932}',
  '#ns109Scene{width:100%;height:100%;display:block;touch-action:none}',
  '#ns117Stick{position:absolute;z-index:4;pointer-events:none;width:112px;height:112px;border-radius:50%;border:2px solid #bddbcb98;background:radial-gradient(circle,#a7cab02b,#122a3699);box-shadow:0 4px 20px #020e1699;transform:translate(-50%,-50%)}',
  '#ns117Knob{position:absolute;width:48px;height:48px;left:30px;top:30px;border-radius:50%;border:2px solid #d0e8da98;background:linear-gradient(130deg,#8caf9b,#355f62);box-shadow:0 4px 8px #0018}',
  '#ns117Dodge{position:absolute;z-index:4;left:12px;bottom:58px;width:76px;height:76px;display:grid;place-content:center;border-radius:50%!important;border:2px solid #b7d9d0;background:#21474bde;color:#f6f0d7;font-size:22px!important;touch-action:manipulation}',
  '#ns117Dodge small{font-size:9px;letter-spacing:.04em}',
  '#ns117Dodge:disabled{opacity:.5;filter:grayscale(.7)}',
  '#ns120Door{position:absolute;z-index:6;right:12px;bottom:56px;padding:10px 12px!important;border-radius:12px!important;background:#23534de8;border:1.5px solid #efcc8d;color:#ffedbf;font:bold 12px system-ui!important;max-width:min(210px,58vw);white-space:normal!important;box-shadow:0 4px 18px #06181699;touch-action:manipulation}',
  '#ns109Hint{position:absolute;bottom:9px;left:50%;transform:translateX(-50%);text-align:center;max-width:96%;padding:5px 11px;border:1px solid #d3c18b64;border-radius:12px;background:#122522c8;font-size:clamp(9px,2.6vw,12px);pointer-events:none}',
  '#ns109Bottom{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px;padding:8px 6px calc(9px + env(safe-area-inset-bottom));background:#172b2a}',
  '#ns109Pane{position:absolute;inset:0;z-index:2;display:grid;place-items:center;padding:14px;background:#061016b5}',
  '.ns109PaneBox{width:min(540px,100%);max-height:85dvh;overflow-y:auto;overscroll-behavior:contain;background:linear-gradient(155deg,#1d3233,#122026);border:1px solid #b5a37891;border-radius:18px;padding:14px}',
  '#ns109PaneHead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px;color:#edcb8d}',
  '#ns109PaneContent{font-size:13px;line-height:1.5}',
  '#ns109PaneContent>button{display:block;margin:8px auto}',
  '#ns109PaneContent .ns76Chat{margin:0!important;max-height:54dvh;overflow:auto}',
  '#ns109PaneContent .coopForge{display:block!important;margin:0!important}',
  '#ns109PaneContent .coopForge button{white-space:normal;width:100%}',
  '.ns122Actions{display:flex;flex-wrap:wrap;gap:7px;margin:9px 0}',
  '.ns122Actions button{flex:1;min-width:110px;white-space:normal!important}',
  '.ns122Friends{max-height:40dvh;overflow-y:auto;display:grid;gap:7px;margin:10px 0;overscroll-behavior:contain}',
  '.ns122Friend{display:flex;align-items:center;justify-content:space-between;gap:9px;padding:9px;border:1px solid #78968165;border-radius:10px;background:#1a3533}',
  '.ns122Friend span{flex:1;min-width:0;overflow-wrap:anywhere}',
  '.ns122Friend button{min-width:83px;white-space:normal!important}',
  '#ns122Presence{font-weight:700;color:#c8e9d8}',
  '#ns122InviteAll{width:100%;white-space:normal!important}',
  'body.ns109External #nsShopPanel:not(.hidden),body.ns109External #nsArmoryPanel:not(.hidden),body.ns109External #nsGuidePanel:not(.hidden){z-index:150!important}',
  '@media(max-width:560px){#ns109Top{gap:5px}#ns109Info{display:none}#ns109Bottom{gap:4px}#ns109Bottom button{min-height:35px;padding:6px}}'
 ].join('');
 css.textContent += "\n/* V169 mobile HUD, presentation-only: no new loops or room packets */\n#ns169Scrim[hidden],#ns169Menu[hidden]{display:none!important}\n#ns169Scrim{position:absolute;inset:0;z-index:7;background:#05100e8c}\n#ns169Menu{position:absolute;right:10px;bottom:calc(65px + env(safe-area-inset-bottom));z-index:8;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;width:min(350px,calc(100% - 20px));max-height:min(64dvh,480px);overflow:auto;overscroll-behavior:contain;padding:12px;background:#152b2bf2;border:1px solid #c4ab7f9c;border-radius:18px;box-shadow:0 18px 45px #030b0cdd;backdrop-filter:blur(12px)}\n#ns169Menu strong{grid-column:1/-1;font:800 12px system-ui;color:#f1d6a5;padding:3px 2px 5px}\n#ns169Menu button{white-space:normal!important;text-align:left;min-width:0;min-height:44px!important;line-height:1.3!important;background:#223f3a;border:1px solid #62867b}\n#ns169Menu #ns109Global{grid-column:1/-1}\n#ns169More{background:#2f4545!important;border-color:#95b2a2!important;color:#f7e9ca!important}\n@media(max-width:600px){\n#ns109Village{--v169edge:10px}\n#ns109Village button{min-height:39px;border-radius:11px}\n#ns109Top{display:grid!important;grid-template-columns:minmax(0,1fr) auto auto;grid-template-areas:\"brand server music\" \"dest start voice\";gap:5px 6px;align-items:center;flex-wrap:nowrap;padding:calc(7px + env(safe-area-inset-top)) var(--v169edge) 7px;background:#12262a;border-bottom:1px solid #58786c55}\n#ns109Top strong{grid-area:brand;min-width:0;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:800 clamp(11px,3.1vw,14px) system-ui}\n#ns109Info{display:none!important}\n#ns141Server{grid-area:server;max-width:118px!important;min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:11px!important;min-height:36px!important;padding:6px 10px!important;border-radius:12px!important}\n#ns109Sound{grid-area:music;width:54px;min-width:54px;padding:6px 5px!important;min-height:36px!important;font-size:11px!important}\n#ns109Destinations{grid-area:dest;width:100%;max-width:100%!important;min-width:0;height:38px;min-height:38px;border-radius:11px;font-size:11px;padding:5px 7px;overflow:hidden;text-overflow:ellipsis}\n#ns109Classic{grid-area:start;min-width:0;max-width:139px!important;min-height:38px!important;padding:7px 9px!important;font-size:11px!important;background:#294148;border:1px solid #647b7b}\n#ns165VillageVoice{grid-area:voice;width:54px;min-width:54px;min-height:38px!important;padding:7px 4px!important;font-size:12px!important}\n#ns109Bottom{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr) minmax(0,.82fr);gap:7px;align-items:stretch;padding:7px var(--v169edge) calc(8px + env(safe-area-inset-bottom));background:#132b2b;border-top:1px solid #657f6c66}\n#ns109Bottom button{min-width:0;width:100%;min-height:42px!important;padding:7px 4px!important;font-size:clamp(10px,2.8vw,12px)!important;overflow:hidden;text-overflow:ellipsis;white-space:nowrap!important;letter-spacing:0}\n#ns117Dodge{left:12px;bottom:14px;width:64px;height:64px;font-size:21px!important;box-shadow:0 3px 16px #0006}\n#ns120Door{right:12px;bottom:24px;max-width:min(210px,calc(100vw - 110px));font-size:11px!important;min-height:36px}\n#ns109Hint{display:none}\n#ns141Join{top:9px;max-width:min(85vw,320px);font-size:11px}\n#ns169Menu{bottom:calc(59px + env(safe-area-inset-bottom))}\n}\n@media(max-width:360px){#ns109Top{grid-template-columns:minmax(0,1fr) 92px 46px}#ns109Sound,#ns165VillageVoice{width:46px;min-width:46px}#ns109Classic{max-width:118px!important;padding:6px!important}#ns109Top strong{font-size:11px!important}}\n@media(max-height:660px) and (max-width:600px){#ns109Top{padding-top:4px;row-gap:3px}#ns109Bottom{padding-top:4px;padding-bottom:4px}#ns109Bottom button{min-height:38px!important}}\n";
 document.head.append(css);document.body.append(root);if(fpsBadge)root.append(fpsBadge);
 const canvas=$('ns109Scene');let g=canvas.getContext('2d',{alpha:false});const pane=$('ns109Pane'),area=$('ns109PaneContent');
 const destinations=document.createElement('select');destinations.id='ns109Destinations';destinations.setAttribute('aria-label','Choose a village building');
 const first=document.createElement('option');first.value='';first.textContent=tr('🏠 HOUSES','🏠 KUĆICE');destinations.append(first);
 for(const b of buildings){const opt=document.createElement('option');opt.value=b.id;opt.textContent=tr(b.label,b.sr);destinations.append(opt)}
 destinations.onchange=()=>{const b=buildings.find(x=>x.id===destinations.value);destinations.value='';if(b)startVillageTravel(b.x,b.y+b.h/2+26,b.id)};
 $('ns109Top').insertBefore(destinations,$('ns109Classic'));
 // Pure DOM menu: original button IDs and click handlers stay intact.
 function setVillageMenu(open=false){
  const menu=$('ns169Menu'),scrim=$('ns169Scrim'),button=$('ns169More');
  if(!menu||!scrim||!button)return;
  const show=!!open&&opened&&!root.classList.contains('ns109Hidden');
  menu.hidden=!show;scrim.hidden=!show;
  button.setAttribute('aria-expanded',String(show));
  root.classList.toggle('ns169MenuOpen',show);
  if(show){window.NS165_CLASSIC_VOICE?.hideVillagePopup?.();menu.querySelector('button')?.focus({preventScroll:true})}
 }
 $('ns169More').onclick=()=>setVillageMenu($('ns169Menu').hidden);
 $('ns169Scrim').onclick=()=>setVillageMenu(false);
 for(const button of $('ns169Menu').querySelectorAll('button'))
  button.addEventListener('click',()=>setVillageMenu(false));

 function view(){
  const r=canvas.getBoundingClientRect(),portrait=r.height>r.width*1.28;
  const scale=portrait?Math.min(r.height/540,r.width/360):Math.min(r.width/960,r.height/540);
  const visibleW=r.width/Math.max(.1,scale),visibleH=r.height/Math.max(.1,scale);
  // Follow the hero on BOTH axes: landscape and portrait expose the larger map.
  const left=clamp(my.x-visibleW/2,0,Math.max(0,VILLAGE_W-visibleW));
  const top=clamp(my.y-visibleH/2,0,Math.max(0,VILLAGE_H-visibleH));
  return{rect:r,scale,ox:(r.width-VILLAGE_W*scale)/2+(VILLAGE_W-visibleW)*scale/2-left*scale,
    oy:(r.height-VILLAGE_H*scale)/2+(VILLAGE_H-visibleH)*scale/2-top*scale};
 }
 const ctxPoint=e=>{const {rect,scale,ox,oy}=view();return{x:(e.clientX-rect.left-ox)/scale,y:(e.clientY-rect.top-oy)/scale}};
 const ground=(x,y)=>({x:clamp(x,29,VILLAGE_W-29),y:clamp(y,62,VILLAGE_H-35)});
 const isLobby=()=>NET.phase==='lobby'&&!!NET.role;
 const canVisit=()=>isLobby()||(NET.role===''&&G.mode==='menu');
 const ownName=()=>{try{return String(getActiveAccount()?.name||'GUARDIAN').slice(0,20)}catch{return 'GUARDIAN'}};
 const getPlayers=()=>{try{return currentLobbyRoster()}catch{return []}};
 function closePane(){
  setVillageMenu(false);
  if(focusNode&&returnPlace){returnPlace.appendChild(focusNode);if(focusNode.id==='coopForge')focusNode.classList.add('hidden')}
  focusNode=null;returnPlace=null;focused=null;pane.classList.add('ns109Hidden');area.replaceChildren();
 }
 function panel(name){closePane();$('ns109PaneTitle').textContent=name;pane.classList.remove('ns109Hidden');}
 function putExisting(id,title){
  const el=$(id);if(!el){panel(title);const msg=document.createElement('p');msg.textContent=tr('This menu opens inside the full game.','Ovaj meni se otvara u glavnoj igri.');area.append(msg);return;}
  panel(title);focusNode=el;returnPlace=el.parentElement;area.appendChild(el);el.classList.remove('hidden');
 }
 function openOutside(panelId,triggerId,closeId){
  const trigger=$(triggerId),target=$(panelId);
  if(!trigger||!target){panel(tr('Village building preview','Prikaz seoske kućice'));const msg=document.createElement('p');msg.textContent=tr('Walk up to this building in the full game to use its menu.','Priđi ovoj kućici u glavnoj igri da otvoriš njen meni.');area.append(msg);return;}
  closePane();root.classList.add('ns109Hidden');document.body.classList.add('ns109External');trigger.click();
  let restored=false;const onClose=()=>{if(restored)return;restored=true;setTimeout(()=>{document.body.classList.remove('ns109External');if((isLobby()||soloPreview)&&opened){$('home')?.classList.add('hidden');root.classList.remove('ns109Hidden');}},20)};
  const btn=$(closeId);if(btn)btn.addEventListener('click',onClose,{once:true});
  const watcher=new MutationObserver(()=>{if(target.classList.contains('hidden')){watcher.disconnect();onClose()}});
  watcher.observe(target,{attributes:true,attributeFilter:['class']});
 }
 function enter(id){
  if(!opened||!canVisit())return;thenEnter=null;
  if(id==='shop'){openOutside('nsShopPanel','nsOpenShop','nsShopClose');return}
  if(id==='armory'){openOutside('nsArmoryPanel','nsArmoryBtn','nsArmoryClose');return}
  if(id==='academy'){renderPreRun();putExisting('preHeroUpgrades',tr('HERO ACADEMY · PERSONAL UPGRADES','AKADEMIJA HEROJA · LIČNA UNAPREĐENJA'));return}
  if(id==='guardian'){renderCoopForge();putExisting('coopForge',tr('GUARDIAN BASE · PERMANENT UPGRADES','BAZA STRAŽE · TRAJNE NADOGRADNJE'));return}
  if(id==='chat'){
   if(soloPreview){panel(tr('VILLAGE TAVERN','SEOSKA KRČMA'));const note=document.createElement('p');note.textContent=tr('Join a multiplayer room to chat with your friends.','Pridruži se multiplayer sobi da bi se dopisivao sa društvom.');area.append(note);const join=document.createElement('button');join.textContent=tr('MULTIPLAYER','MULTIPLAYER');join.onclick=()=>{closeVillage();$('coopBtn')?.click()};area.append(join);return}
   putExisting('ns76Chat',tr('VILLAGE TAVERN · CHAT','SEOSKA KRČMA · ČET'));return
  }
  if(id==='hall'){showAchievements();return}
  if(id==='invite'){showInviteHouse();return}
  if(id==='barn'){showBarnPvP();return}
  if(id==='ready'){
   if(soloPreview){closeVillage();$('coopBtn')?.click();return}
   if(NS97_POST.active){if(!NET.ns97Results?.votes?.[NET.localId])NS97_POST.vote('yes');else NS97_POST.vote('no')}
   else if(!NET.localReady)$('lobbyReadyBtn')?.click();
   else $('lobbyReadyBtn')?.click();
   $('ns109Hint').textContent=NET.localReady||NET.ns97Results?.votes?.[NET.localId]==='yes'?tr('Ready! Waiting for others.','Spreman! Čekamo ostale.'):tr('Not ready.','Nisi spreman.');return;
  }
 }

 // V138: completely separate village sparring state. NEVER touches G.hp, kills,
 // currency, XP, rankings, matchmaking, or an actual game session.
 const PVP=new Map(),PVP_HP=100,PVP_RANGE=84;
 const hitFX=[];let pvpSeq=0,lastPvpSync=0,localRespawnSeq=0,lastSoloHit=0;
 const getPvP=id=>{if(!PVP.has(id))PVP.set(id,{opted:false,hp:PVP_HP,respawnAt:0,invulnerableUntil:0,seq:0,x:0,y:0,lastHit:0});return PVP.get(id)};
 const villageHeroPos=id=>id===NET.localId||!NET.role&&id==='p1'?my:avatars.get(id);
 const barnDoor=()=>doorPoint(buildings.find(b=>b.id==='barn'));
 function nearBarn(id){
  const p=villageHeroPos(id),door=barnDoor();
  return !!p&&Math.hypot(p.x-door.x,p.y-door.y)<96;
 }
 function villageBroadcastPvp(){
  if(NET.role!=='host'||NET.phase!=='lobby')return;
  const pvp=[...PVP].slice(0,6).map(([id,p])=>({id,opted:p.opted,hp:p.hp,seq:p.seq,x:p.x,y:p.y,respawnAt:p.respawnAt,invulnerableUntil:p.invulnerableUntil}));
  const animals=NPCS.map(a=>[a.id,a.hp,a.deadUntil]);
  const crates=VILLAGE_CRATES.map(c=>[c.id,c.hp,c.deadUntil]);
  const data={t:'ns138State',pvp,animals,crates};
  for(const c of NET.clients.values())if(c?.open)try{c.send(data)}catch{}
 }
 function applyVillageState(data){
  if(!Array.isArray(data.pvp)||data.pvp.length>6||!Array.isArray(data.animals)||data.animals.length>20||
   (data.crates!==undefined&&(!Array.isArray(data.crates)||data.crates.length>8)))return;
  for(const p of data.pvp){
   if(!/^p[1-6]$/.test(String(p?.id||''))||!Number.isFinite(p.hp)||!Number.isFinite(p.seq))continue;
   const prev=getPvP(p.id);
   const next={...prev,opted:p.opted===true,hp:clamp(p.hp,0,PVP_HP),
    seq:Math.max(0,Math.min(1e7,p.seq)),x:clamp(Number(p.x)||0,29,VILLAGE_W-29),
    y:clamp(Number(p.y)||0,62,VILLAGE_H-35),respawnAt:Math.max(0,Number(p.respawnAt)||0),
    invulnerableUntil:Math.max(0,Number(p.invulnerableUntil)||0)};
   PVP.set(p.id,next);
   if(next.hp<prev.hp){const hit=villageHeroPos(p.id);if(hit)hitFX.push({x:hit.x,y:hit.y-30,until:Date.now()+280})}
   // The host alone orders respawn; it does not use a client-supplied teleport.
   if(p.id===NET.localId&&NET.role==='guest'&&next.seq>localRespawnSeq){
    localRespawnSeq=next.seq;my.x=next.x;my.y=next.y;
    route=[];walkTo=null;thenEnter=null;resetStick();
   }
  }
  for(const q of data.animals)if(Array.isArray(q)&&q.length===3&&Number.isInteger(q[0])&&NPCS[q[0]]&&Number.isFinite(q[1])&&Number.isFinite(q[2])){
   const animal=NPCS[q[0]],oldHp=animal.hp,oldDead=animal.deadUntil;
   animal.hp=clamp(q[1],0,2);animal.deadUntil=Math.max(0,q[2]);
   if(NET.role==='guest'&&(animal.hp<oldHp||(animal.deadUntil>Date.now()&&animal.deadUntil>oldDead+1000))){
    const at=animalPos(animal,Date.now());
    if(soundDistance(at.x,at.y,270)>.1){playVillageHit(at.x,at.y,animal.kind);playAnimalCall(animal.kind,at.x,at.y,true)}
   }
  }
  for(const q of data.crates||[])if(Array.isArray(q)&&q.length===3&&Number.isInteger(q[0])&&VILLAGE_CRATES[q[0]]&&Number.isFinite(q[1])&&Number.isFinite(q[2])){
   const crate=VILLAGE_CRATES[q[0]],oldHp=crate.hp,oldDead=crate.deadUntil;
   crate.hp=clamp(q[1],0,3);crate.deadUntil=Math.max(0,q[2]);
   if(NET.role==='guest'&&(crate.hp<oldHp||(crate.deadUntil>Date.now()&&crate.deadUntil>oldDead+1000)))
    playVillageHit(crate.x,crate.y,'wood');
  }
  if(focused==='barn'&&!pane.classList.contains('ns109Hidden'))showBarnPvP();
 }
 function toggleVillagePvp(id){
  if(!isLobby()||NET.role!=='host'||!/^p[1-6]$/.test(String(id||''))||!nearBarn(id))return false;
  const state=getPvP(id);state.opted=!state.opted;state.hp=PVP_HP;state.respawnAt=0;state.invulnerableUntil=Date.now()+1100;
  villageBroadcastPvp();if(focused==='barn')showBarnPvP();return true;
 }
 function randomVillageRespawn(near){
  // Respawn at a safe doorway close to the defeat, never on the far side of the map.
  const candidates=buildings.filter(b=>b.id!=='barn').map(b=>({door:doorPoint(b),
   dist:Math.hypot(b.x-near.x,b.y+b.h/2+26-near.y)})).sort((a,b)=>a.dist-b.dist);
  const nearby=candidates.filter(q=>q.dist<=420).slice(0,3);
  const choices=nearby.length?nearby:candidates.slice(0,2);
  const d=choices[(pvpSeq++)%choices.length].door;
  return blockedVillage(d.x,d.y)?{x:840,y:506}:d;
 }
 function villageRespawn(id,seq){
  if(NET.role!=='host'||!isLobby())return;
  const state=getPvP(id);if(!state.opted||state.seq!==seq||state.hp>0)return;
  const pos=randomVillageRespawn(villageHeroPos(id)||{x:840,y:506});
  state.hp=PVP_HP;state.respawnAt=0;state.invulnerableUntil=Date.now()+2000;
  state.seq++;state.x=pos.x;state.y=pos.y;
  if(id===NET.localId){my.x=pos.x;my.y=pos.y;route=[];walkTo=null}
  else{
   avatars.set(id,{...pos,walking:false,side:1,lastMoveAt:performance.now()});
   const prev=limits.get(id)||{at:0,emote:0};
   limits.set(id,{...prev,x:pos.x,y:pos.y,at:performance.now()});
  }
  villageBroadcastPvp();
 }
 function villageStrike(id){
  if(!canVisit()||(!opened&&id===NET.localId))return false;
  const now=Date.now(),pos=villageHeroPos(id);
  if(!pos)return false;
  const state=getPvP(id);
  if(now-(state.lastHit||0)<640)return false;
  if(state.opted&&state.hp<=0)return false;
  // Only mutually opted-in, living players in the SAME lobby can hurt one another.
  let victimId=null,best=PVP_RANGE;
  if(isLobby()&&state.opted){
   for(const p of getPlayers()){
    if(p.id===id)continue;
    const other=getPvP(p.id),at=villageHeroPos(p.id);
    if(!other.opted||other.hp<=0||now<other.invulnerableUntil||!at)continue;
    const d=Math.hypot(pos.x-at.x,pos.y-at.y);
    if(d<best){best=d;victimId=p.id}
   }
  }
  if(victimId){
   state.lastHit=now;
   const target=getPvP(victimId);
   target.hp=Math.max(0,target.hp-34);
   hitFX.push({x:villageHeroPos(victimId).x,y:villageHeroPos(victimId).y-25,until:now+280});
   if(target.hp===0){
    target.respawnAt=now+1650;
    const seq=target.seq; // ignore timers from prior deaths / resets
    setTimeout(()=>villageRespawn(victimId,seq),1700);
   }
   if(id===NET.localId)playVillageHit(villageHeroPos(victimId).x,villageHeroPos(victimId).y,'armor');
   villageBroadcastPvp();
   return true;
  }
  // Farm animals have separate temporary HP. Killing them gives zero rewards.
  let closest=null,nearest=72;
  for(const a of NPCS){
   if(!animalAlive(a,now))continue;
   const v=animalPos(a,now),d=Math.hypot(pos.x-v.x,pos.y-v.y);
   if(d<nearest){nearest=d;closest=a}
  }
  if(closest){
   state.lastHit=now;
   closest.hp=Math.max(0,closest.hp-1);
   const v=animalPos(closest,now);
   hitFX.push({x:v.x,y:v.y-12,until:now+270});
   if(closest.hp===0){closest.deadUntil=now+16000;closest.hp=2}
   if(id===NET.localId){playVillageHit(v.x,v.y,closest.kind);playAnimalCall(closest.kind,v.x,v.y,true)}
   if(NET.role==='host')villageBroadcastPvp();
   return true;
  }
  let crate=null,nearestCrate=82;
  for(const c of VILLAGE_CRATES){
   if(now<c.deadUntil)continue;
   const d=Math.hypot(pos.x-c.x,pos.y-c.y);
   if(d<nearestCrate){crate=c;nearestCrate=d}
  }
  if(!crate)return false;
  state.lastHit=now;crate.hp=Math.max(0,crate.hp-1);
  hitFX.push({x:crate.x,y:crate.y-14,until:now+270});
  if(crate.hp===0){crate.deadUntil=now+12000;crate.hp=3}
  if(id===NET.localId)playVillageHit(crate.x,crate.y,'wood');
  if(NET.role==='host')villageBroadcastPvp();
  return true;
 }
 function resetVillageTraining(){
  trainingCredit=0;trainingKills=0;
  for(const m of trainingMobs){m.x=m.sx;m.y=m.sy;m.hp=3;m.deadUntil=0}
 }
 function trainingStrike(now){
  if(!trainingOn)return false;
  let nearest=null,best=83;
  for(const m of trainingMobs){
   if(m.hp<=0)continue;
   const d=Math.hypot(my.x-m.x,my.y-m.y);
   if(d<best){nearest=m;best=d}
  }
  if(!nearest)return false;
  nearest.hp--;
  playVillageHit(nearest.x,nearest.y,'training');
  hitFX.push({x:nearest.x,y:nearest.y-24,until:now+280});
  if(nearest.hp===0){nearest.deadUntil=now+3800;trainingKills++}
  return true;
 }
 function stepTraining(dt,now){
  if(!trainingOn)return;
  trainingCredit=Math.min(.1,trainingCredit+dt);
  if(trainingCredit<.05)return;
  const elapsed=trainingCredit;trainingCredit=0;
  for(const m of trainingMobs){
   if(m.hp<=0){
    if(now>=m.deadUntil){m.hp=3;m.x=m.sx;m.y=m.sy}
    continue;
   }
   const d=Math.hypot(my.x-m.x,my.y-m.y);
   // Only move if the local player approaches. Never run combat on the host server.
   if(d<180&&d>45){
    const nx=m.x+(my.x-m.x)/d*38*elapsed,ny=m.y+(my.y-m.y)/d*38*elapsed;
    if(!blockedVillage(nx,m.y))m.x=nx;
    if(!blockedVillage(m.x,ny))m.y=ny;
   }
  }
 }
 function drawTrainingMob(m,now){
  if(m.hp<=0)return;
  g.save();g.translate(m.x,m.y+Math.sin(now/280+m.id)*1.4);
  g.fillStyle='#10241b99';g.beginPath();g.ellipse(0,11,15,6,0,0,7);g.fill();
  g.fillStyle='#263c2c';g.fillRect(-12,-8,24,19);
  g.fillStyle='#71934b';g.beginPath();g.moveTo(-13,-11);g.lineTo(-14,-24);g.lineTo(-6,-20);
  g.quadraticCurveTo(0,-35,7,-20);g.lineTo(15,-25);g.lineTo(13,-11);g.closePath();g.fill();
  g.fillStyle='#eac077';g.fillRect(-7,-16,4,3);g.fillRect(4,-16,4,3);
  g.strokeStyle='#a6cf7d';g.lineWidth=3;g.beginPath();g.moveTo(-12,-31);g.lineTo(-12+24*m.hp/3,-31);g.stroke();
  g.restore();
 }
 function villageOnline(){
  if(!isLobby())return false;
  return NET.role==='host'?(NET.peer?.open===true||(NET.peer?._connected===true&&NET.peer?._socket?.readyState===1)):NET.conn?.open===true;
 }
 function startVillageOnlineRoom(){
  if(isLobby()){copyVillageText(NET.code);return true}
  if(NET.role||NET.phase!=='idle'||(pendingAutoRoom==='HOST'&&Date.now()<pendingAutoUntil)){
   toast(tr('Room connection already in progress','Povezivanje sa sobom je već u toku'));return false;
  }
  const host=$('hostBtn'),coop=$('coopBtn');
  if(!host||!coop){toast(tr('Online lobby is unavailable','Online lobi nije dostupan'));return false}
  pendingAutoRoom='HOST';pendingAutoUntil=Date.now()+45000;
  localStorage.setItem('ns109_village_pref','village');
  closeVillage();
  coop.click();
  if($('mpNameInput'))$('mpNameInput').value=ownName();
  if($('ns92Public'))$('ns92Public').checked=true;
  if($('ns92Locked')){$('ns92Locked').checked=false;$('ns92Locked').dispatchEvent(new Event('change'))}
  if($('ns92Max'))$('ns92Max').value='6';
  host.click(); // Existing host flow creates the room and confirms relay before re-opening Village.
  return true;
 }
 // Target selection runs only when cooldown is ready; no empty attack packets.
 function villageAutoTarget(now=Date.now()){
  if(!opened||!pane.classList.contains('ns109Hidden'))return null;
  const own=getPvP(NET.localId||'p1');
  if(own.opted&&own.hp<=0)return null;
  let best=null;
  if(trainingOn)for(const m of trainingMobs)if(m.hp>0){
   const d=Math.hypot(my.x-m.x,my.y-m.y);
   if(d<83&&(!best||d<best.distance))best={kind:'training',x:m.x,y:m.y,distance:d};
  }
  if(best)return best;
  if(isLobby()&&own.opted)for(const p of getPlayers()){
   if(p.id===(NET.localId||'p1'))continue;
   const other=getPvP(p.id),pos=villageHeroPos(p.id);
   if(other.opted&&other.hp>0&&now>=other.invulnerableUntil&&pos){
    const d=Math.hypot(my.x-pos.x,my.y-pos.y);
    if(d<PVP_RANGE&&(!best||d<best.distance))best={kind:'pvp',x:pos.x,y:pos.y,distance:d};
   }
  }
  if(best)return best;
  for(const a of NPCS)if(animalAlive(a,now)){
   const p=animalPos(a,now),d=Math.hypot(my.x-p.x,my.y-p.y);
   if(d<72&&(!best||d<best.distance))best={kind:'animal',x:p.x,y:p.y,distance:d};
  }
  if(best)return best;
  for(const c of VILLAGE_CRATES)if(now>=c.deadUntil){
   const d=Math.hypot(my.x-c.x,my.y-c.y);
   if(d<82&&(!best||d<best.distance))best={kind:'crate',x:c.x,y:c.y,distance:d};
  }
  return best;
 }
 function villageTryStrike(){
  if(!opened||!canVisit()||!pane.classList.contains('ns109Hidden'))return false;
  const now=Date.now();if(now-lastSoloHit<650)return false;
  lastSoloHit=now;
  primeVillageAudio();playWeaponSwing();
  if(trainingStrike(now))return true;
  if(isLobby()&&NET.role==='guest'){
   if(!NET.conn?.open)return false;
   try{NET.conn.send({t:'ns138Strike'});return true}catch{return false}
  }
  const id=NET.localId||'p1';return villageStrike(id);
 }
 function drawVillageCrate(c){
  if(Date.now()<c.deadUntil)return;
  g.save();g.translate(c.x,c.y);
  g.fillStyle='#081d17aa';g.beginPath();g.ellipse(0,13,19,6,0,0,Math.PI*2);g.fill();
  g.fillStyle='#8f6842';g.fillRect(-17,-18,34,33);
  g.strokeStyle='#d5af71';g.lineWidth=2.5;g.strokeRect(-16,-17,32,31);
  g.strokeStyle='#69482d';g.lineWidth=3;g.beginPath();g.moveTo(-13,-13);g.lineTo(13,10);
  g.moveTo(13,-13);g.lineTo(-13,10);g.stroke();
  if(c.hp<3){g.strokeStyle='#f8db9f';g.lineWidth=1.5;g.beginPath();g.moveTo(-4,-15);g.lineTo(1,-6);g.lineTo(-3,2);g.stroke()}
  g.restore();
 }
 function drawVillageHits(){
  const now=Date.now();
  for(let i=hitFX.length-1;i>=0;i--){
   const e=hitFX[i];if(e.until<now){hitFX.splice(i,1);continue}
   g.save();g.globalAlpha=(e.until-now)/280;g.strokeStyle='#fff0bd';g.lineWidth=4;
   g.beginPath();g.moveTo(e.x-17,e.y-16);g.lineTo(e.x+14,e.y+8);g.stroke();g.restore();
  }
 }
 function drawVillagePvpHp(id,x,y){
  const p=PVP.get(id);if(!p?.opted)return;
  g.save();g.fillStyle='#211c1dbb';g.fillRect(x-26,y-94,52,6);
  g.fillStyle=p.hp>35?'#a9d7aa':'#e09276';g.fillRect(x-25,y-93,50*clamp(p.hp/PVP_HP,0,1),4);
  g.font='bold 11px sans-serif';g.textAlign='center';g.fillStyle='#f6dab1';g.fillText('⚔',x+38,y-78);
  g.restore();
 }
 function showBarnPvP(){
  panel(tr('⚔ BARN · FRIENDLY PVP','⚔ ŠTALA · PRIJATELJSKI PVP'));focused='barn';
  const hint=document.createElement('p');
  hint.textContent=tr('Opt in here to spar with friends. Both players must activate PvP. No XP, no coins, no rankings. After defeat you respawn at a nearby house. You can attack sheep and pigs without PvP.','Ovde uključi PvP za zezanje sa društvom. Oba igrača moraju da uključe PvP. Nema XP, novca ni statistike. Posle poraza se vraćaš kod neke kućice. Ovce i prasiće možeš da napadneš i bez PvP-a.');
  area.append(hint);
  const status=document.createElement('p');const own=getPvP(NET.localId||'p1');
  status.textContent=own.opted?tr('PVP ACTIVE · HP ','PVP UKLJUČEN · HP ')+own.hp+'/'+PVP_HP:tr('PVP OFF','PVP ISKLJUČEN');area.append(status);
  const btn=document.createElement('button');btn.className='primary';
  btn.textContent=own.opted?tr('DISABLE PVP','ISKLJUČI PVP'):tr('ENABLE PVP','UKLJUČI PVP');
  btn.disabled=!isLobby();
  btn.onclick=()=>{
   if(!isLobby()){toast(tr('Invite a friend to an online room first','Prvo pozovi prijatelja u online sobu'));return}
   if(NET.role==='host')toggleVillagePvp(NET.localId);
   else if(NET.role==='guest'&&NET.conn?.open){NET.conn.send({t:'ns138PvpToggle'});toast(tr('PVP request sent','Zahtev za PvP poslat'))}
  };
  area.append(btn);
  const note=document.createElement('p');note.textContent=isLobby()?tr('Attacks start automatically near a valid target. PvP still requires mutual opt-in.','Napad počinje automatski čim priđeš meti. PvP i dalje zahteva saglasnost oba igrača.'):tr('Animals are attacked automatically in solo Village.','Životinje se automatski napadaju u solo selu.');
  area.append(note);
 }

 function inviteRosterText(){
  if(!isLobby())return tr('SOLO VILLAGE · Room starts when you invite an online friend','SOLO SELO · Online soba se pokreće kada pozoveš prijatelja');
  const roster=getPlayers();
  return tr('ONLINE ROOM ','ONLINE SOBA ')+NET.code+' · '+roster.length+'/'+NS92_DIR.maxPlayers()+
   tr(' PLAYERS',' IGRAČA')+' · '+roster.map(p=>safePlayerName(p.name)).join(', ');
 }
 function inviteRoomLink(){
  const room=String(NET.code||'');
  return /^[A-HJ-NP-Z2-9]{6}$/.test(room)&&isLobby()?
   location.origin+location.pathname+'?join='+encodeURIComponent(room):'';
 }
 async function copyVillageText(value){
  try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);toast(tr('Copied','Kopirano'));return}}
  catch{}
  // Clipboard is blocked on some embedded Android browsers; show the value so
  // the player can still pass the code without creating a second room.
  toast(value);
 }
 function startVillageInvites(ids){
  const targets=[...new Set(ids)].filter(id=>SOCIAL?.db?.friends?.[id]).slice(0,5);
  if(!targets.length){toast(tr('No friends selected','Nema izabranih prijatelja'));return false}
  if(NET.phase==='lobby'&&NET.role){
   if(getPlayers().length>=NS92_DIR.maxPlayers()){toast(tr('Room is full','Soba je puna'));return false}
   let sent=0;for(const id of targets)if(NS96_INVITES?.invite(id))sent++;
   if(sent){lastInviteUiAt=0;showInviteHouse()}return sent>0;
  }
  if(NET.role||NET.phase!=='idle'){
   toast(tr('Connecting to a room already.','Već se povezuješ sa sobom.'));return false;
  }
  if(pendingAutoRoom==='HOST'&&Date.now()<pendingAutoUntil){
   toast(tr('Online room creation is already in progress','Pravljenje online sobe je već u toku'));return false;
  }
  if(!NS103_PARTY?.start){toast(tr('Online invitations unavailable','Online pozivi nisu dostupni'));return false}
  // Reuse the existing host/relay creation exactly once. Auto-return to Village
  // only AFTER the original lobby is confirmed online.
  pendingAutoRoom='HOST';pendingAutoUntil=Date.now()+45000;
  const started=NS103_PARTY.start(targets);
  if(!started){pendingAutoRoom='';pendingAutoUntil=0;return false}
  closePane();
  toast(tr('Creating room; offline invites will wait for friends to launch the game…','Pravim sobu · offline pozivi će čekati da prijatelji pokrenu igru…'));
  return true;
 }
 function showInviteHouse(){
  panel(tr('INVITATION HALL · ONLINE PARTY','KUĆA POZIVA · ONLINE DRUŠTVO'));
  focused='invite';
  const headline=document.createElement('p');headline.id='ns122Presence';headline.textContent=inviteRosterText();
  area.append(headline);
  const intro=document.createElement('p');intro.textContent=tr(
   'Invite up to five friends, even if offline. Keep your room open; friends receive Accept/Decline as soon as they start the game.',
   'Pozovi do pet prijatelja, čak i kad su offline. Ostavi sobu uključenu; čim pokrenu igru dobijaju Prihvati/Odbij.');
  area.append(intro);
  const actions=document.createElement('div');actions.className='ns122Actions';
  const refresh=document.createElement('button');refresh.type='button';refresh.textContent=tr('↻ REFRESH','↻ OSVEŽI');
  refresh.onclick=()=>{if(SOCIAL?.connected)socialCheckFriends?.();else startSocial?.();showInviteHouse()};
  actions.append(refresh);
  const friendBtn=document.createElement('button');friendBtn.type='button';friendBtn.textContent=tr('＋ ADD FRIEND','＋ DODAJ PRIJATELJA');
  friendBtn.onclick=()=>{closeVillage();showFriends?.()};actions.append(friendBtn);
  if(isLobby()){
   const code=document.createElement('button');code.type='button';code.id='ns122RoomCode';
   code.textContent=tr('COPY ROOM CODE: ','KOPIRAJ KOD SOBE: ')+NET.code;
   code.onclick=()=>copyVillageText(NET.code);actions.append(code);
   const share=document.createElement('button');share.type='button';share.id='ns122ShareLink';
   share.textContent=tr('COPY JOIN LINK','KOPIRAJ LINK ZA ULAZ');
   share.onclick=()=>copyVillageText(inviteRoomLink());actions.append(share);
  }
  area.append(actions);
  const ids=Object.keys(SOCIAL?.db?.friends||{}).sort((a,b)=>(!!SOCIAL.conns.get(b)?.open)-(!!SOCIAL.conns.get(a)?.open)||
   String(SOCIAL.db.friends[a].name).localeCompare(String(SOCIAL.db.friends[b].name)));
  const list=document.createElement('div');list.id='ns122Friends';list.className='ns122Friends';
  const inRoom=new Set(getPlayers().map(p=>p.friendId));
  const full=isLobby()&&getPlayers().length>=NS92_DIR.maxPlayers();
  let eligibleCount=0;const selected=[];
  for(const id of ids){
   const f=SOCIAL.db.friends[id],online=!!SOCIAL.conns.get(id)?.open,joined=inRoom.has(id);
   if(!joined)eligibleCount++;
   const row=document.createElement('div');row.className='ns122Friend';
   const text=document.createElement('span');text.textContent=safePlayerName(f.name)+(joined?tr(' · ✓ HERE',' · ✓ OVDE'):online?' · ● ONLINE':' · ○ OFFLINE');
   const btn=document.createElement('button');btn.type='button';btn.dataset.friendId=id;
   btn.disabled=joined||full||NS96_INVITES?.pending(id)||(!isLobby()&&NET.phase!=='idle');
   btn.textContent=joined?tr('IN ROOM','U SOBI'):NS96_INVITES?.pending(id)?tr('QUEUED','ČEKA'):full?tr('FULL','PUNO'):online?tr('INVITE','POZOVI'):tr('INVITE OFFLINE','POZOVI OFFLINE');
   btn.onclick=()=>startVillageInvites([id]);row.append(text,btn);list.append(row);
   if(!joined)selected.push(id);
  }
  if(!ids.length){
   const hint=document.createElement('p');hint.textContent=tr('No friends yet. Add them by their in-game Friend ID.',
    'Još nema prijatelja. Dodaj ih preko ID-a prijatelja iz igre.');list.append(hint);
  }
  area.append(list);
  if(eligibleCount>1){
   const all=document.createElement('button');all.id='ns122InviteAll';all.type='button';
   all.textContent=tr('✉ INVITE FRIENDS','✉ POZOVI PRIJATELJE')+' ('+Math.min(5,selected.length)+')';
   all.disabled=full;all.onclick=()=>startVillageInvites(selected.slice(0,5));area.append(all);
  }
  if(isLobby()){
   const controls=document.createElement('div');controls.className='ns122Actions';
   const ready=document.createElement('button');ready.id='ns122Ready';ready.type='button';
   ready.textContent=tr('✓ READY / UNREADY','✓ SPREMAN / NISAM SPREMAN');
   ready.onclick=()=>{$('lobbyReadyBtn')?.click();headline.textContent=inviteRosterText()};controls.append(ready);
   if(NET.role==='host'){
    const start=document.createElement('button');start.id='ns122Start';start.type='button';
    start.textContent=tr('▶ START MATCH','▶ POKRENI PARTIJU');
    start.onclick=()=>{
     if(!getPlayers().length||getPlayers().length<2){toast(tr('At least two players needed','Potrebna su bar dva igrača'));return}
     // Original start handler enforces READY, world loading and host authority.
     $('lobbyStartBtn')?.click();
    };
    controls.append(start);
   }
   area.append(controls);
  }else if(NET.phase==='idle'){
   const guide=document.createElement('small');guide.textContent=tr('An online room is created only when you send an invite. No duplicate server is opened.',
    'Online soba se kreira tek kad pošalješ poziv. Ne pravi se dupli server.');
   area.append(guide);
  }
  lastInviteUiAt=performance.now();
  if(!SOCIAL?.peer&&!SOCIAL?.starting)startSocial?.();
 }
 function onVillageLobbyReady(){
  const expected=pendingAutoRoom;
  if(expected&&Date.now()>pendingAutoUntil){pendingAutoRoom='';pendingAutoUntil=0}
  if(pendingAutoRoom&&isLobby()&&(pendingAutoRoom==='HOST'?NET.role==='host':NET.code===pendingAutoRoom)){
   pendingAutoRoom='';pendingAutoUntil=0;
   if(!opened)showVillage();
   else if(root.classList.contains('ns109Hidden'))root.classList.remove('ns109Hidden');
   toast(tr('Connected! Welcome to the online Village.','Povezano! Dobro došli u online selo.'));
   return;
  }
  scheduleAutoVillage();
 }
 function expectVillageJoin(room){
  if(!/^[A-HJ-NP-Z2-9]{6}$/.test(String(room||'')))return false;
  pendingAutoRoom=room;pendingAutoUntil=Date.now()+45000;return true;
 }
 function showMatchBoard(){
  panel(tr('MATCH SCOREBOARD · LAST ROUND','STATISTIKA EKIPE · POSLEDNJA PARTIJA'));
  const r=NET.ns97Results;
  if(!r||!Array.isArray(r.players)||!r.players.length){
   const empty=document.createElement('p');empty.textContent=tr('No completed multiplayer round yet. Finish a match to see team results.','Još nema završene multiplayer partije. Odigrajte partiju pa će ovde biti učinak svih igrača.');area.append(empty);return;
  }
  const summary=document.createElement('p');
  const seconds=Math.min(86400,Math.max(0,Number(r.seconds)||0));
  summary.textContent=(r.win?'🏆 POBEDA · ':'☠ KRAJ PARTIJE · ')+'TALAS '+(Number(r.wave)||0)+' · '+Math.floor(seconds/60)+'m '+Math.floor(seconds%60)+'s · '+(Number(r.kills)||0)+' UBISTAVA';
  summary.style.cssText='font-size:12px;font-weight:800;color:#e7c688';area.append(summary);
  const scroll=document.createElement('div');scroll.style.cssText='max-width:100%;overflow-x:auto;overscroll-behavior:contain';
  const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:11px;min-width:515px;font-variant-numeric:tabular-nums';
  const columns=[['Igrač','name'],['Kill','kills'],['Pao','downs'],['Revive','revives'],['Šteta','weaponDamage'],['Nivo','level'],['Čvorišta','shards']];
  const header=table.insertRow();for(const [title] of columns){const th=document.createElement('th');th.textContent=title;th.style.cssText='padding:9px 6px;text-align:left;color:#eed19a;border-bottom:1px solid #86a998';header.append(th);}
  for(const p of [...r.players].sort((a,b)=>(Number(b.kills)||0)-(Number(a.kills)||0))){
   const row=table.insertRow();
   for(const [,key] of columns){const cell=row.insertCell();cell.textContent=key==='name'?String(p.name||p.id||'STRAŽAR').slice(0,25):String(Math.max(0,Math.floor(Number(p[key])||0)));cell.style.cssText='padding:9px 6px;border-bottom:1px solid #48655b';if(p.id===NET.localId)cell.style.color='#f5cc7c';}
  }
  scroll.append(table);area.append(scroll);
  const tip=document.createElement('p');tip.textContent=tr('Falls count knockdowns. Revives count rescued teammates. Results are the final host snapshot.','Pao = broj obaranja. Revive = koliko puta si oživeo saigrača. Podaci dolaze od domaćina partije.');tip.style.cssText='font-size:11px;color:#9ec5ad';area.append(tip);
}
function showAchievements(){
  panel(tr('HALL OF FAME','DOM SLAVE'));const p=document.createElement('p');
  p.textContent=tr('Your existing achievements and the new cosmetic Sparta prize.','Postojeća dostignuća i nova kozmetička nagrada Sparta.');area.append(p);
  const item=document.createElement('p');item.textContent=spartaOwned()?tr('🏆 SPARTA UNLOCKED · golden armor (visual only).','🏆 SPARTA OSVOJENA · zlatni oklop (samo izgled).'):tr('◇ SPARTA · 300 personal kills in one qualifying run.','◇ SPARTA · 300 ličnih ubistava u jednoj pravoj partiji.');area.append(item);
  const mpBtn=document.createElement('button');mpBtn.textContent=tr('🏆 LAST MATCH SCOREBOARD','🏆 STATISTIKA POSLEDNJE PARTIJE');mpBtn.onclick=showMatchBoard;area.append(mpBtn);
  const btn=document.createElement('button');btn.textContent=tr('ALL ACHIEVEMENTS','SVA DOSTIGNUĆA');btn.onclick=()=>openOutside('nsGuidePanel','nsAchievementsBtn','nsGuideClose');area.append(btn);
 }
 function showVoice(){
  panel(tr('RECORDED VOICE BUTTONS','DUGMAD ZA SNIMLJEN GLAS'));const p=document.createElement('p');
  p.textContent=tr('Only your saved recordings are shared when voice sharing is enabled. Never a live microphone. Limit: one clip per 5.4 seconds.','Šalju se samo prethodno snimljene replike ako je deljenje uključeno, nikada mikrofon uživo. Najviše jedna replika na 5,4 s.');area.append(p);
  const toggle=document.createElement('label');toggle.textContent=tr('Share recorded voice','Deli snimljeni glas')+' ';
  const input=document.createElement('input');input.type='checkbox';input.checked=CoopVoice.share;input.onchange=()=>coopVoiceUpdatePreference('share',input.checked);toggle.append(input);area.append(toggle);
  const level=currentProfileLevel();
  for(const [kind,en,sr,minLevel] of [['start','Ready!','Spreman!',1],['victory','Well played!','Odigrano!',5],['wave','Here they come!','Stižu!',10]]){
   const btn=document.createElement('button');btn.textContent='🎙 '+tr(en,sr)+(minLevel>1?' · LV '+minLevel:'');btn.disabled=level<minLevel;
   btn.title=level<minLevel?tr('Unlock at permanent account level ','Otključava se na trajnom nivou ')+minLevel:'';
   btn.onclick=()=>{if(currentProfileLevel()<minLevel)return;unlockSound();voiceLine(kind,true)};area.append(btn);
  }
 }
 function personalKey(){return 'ns109_local_rank_'+String(getActiveAccount()?.id||'default').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)}
 function personalStats(){try{const v=JSON.parse(localStorage.getItem(personalKey())||'{}');return {kills:Math.max(0,Number(v.kills)||0),wave:Math.max(0,Number(v.wave)||0)}}catch{return {kills:0,wave:0}}}
 function recordPersonalMP(packet){
  if(!packet||!Number.isInteger(packet.round)||!Number.isFinite(packet.kills)||packet.kills<0||packet.kills>1000000)return;
  const id=String(packet.session||'').slice(0,90)+'_'+packet.round;if(!packet.session)return;
  const key=personalKey();let old;try{old=JSON.parse(localStorage.getItem(key)||'{}')}catch{old={}}
  const seen=Array.isArray(old.seen)?old.seen:[];if(seen.includes(id))return;
  const record={kills:Math.max(0,Number(old.kills)||0)+Math.floor(packet.kills),wave:Math.max(0,Number(old.wave)||0,Math.floor(Number(packet.wave)||0)),seen:[...seen.slice(-149),id]};
  try{localStorage.setItem(key,JSON.stringify(record))}catch{}
 }
 function showRankings(force=false){
  panel(tr('GLOBAL RANKINGS','GLOBALNA RANG-LISTA'));
  const personal=personalStats(),self=document.createElement('p');
  const solo=typeof meta==='object'&&meta?meta:{};
  self.textContent=tr('YOUR STORED RECORD (local / cloud, not verified): ','TVOJA SAČUVANA STATISTIKA (lokalno / cloud, nije verifikovana): ')+ownName()+' · '+(Math.max(0,Number(solo.totalKills)||0)+personal.kills)+' '+tr('kills','ubistava')+' · LV '+currentProfileLevel()+' · '+tr('best wave ','najbolji talas ')+Math.max(Number(solo.bestWave)||0,personal.wave);
  area.append(self);
  const heading=document.createElement('p');heading.textContent=tr('Kills, permanent account level and best wave. Only verified data will count.','Ubistva, trajni nivo profila i najbolji talas. Samo provereni rezultati će se računati.');area.append(heading);
  const display=document.createElement('div');area.append(display);
  const refresh=document.createElement('button');refresh.textContent=tr('↻ REFRESH (once per minute)','↻ OSVEŽI (jednom u minutu)');refresh.onclick=()=>readRankings(display,true);area.append(refresh);
  readRankings(display,force);
 }
 async function readRankings(display,force){
  const now=Date.now();
  if(leaderCache&&now-lastLeaderboard<300000&&!force){paintRanking(display,leaderCache);return}
  if(leaderBusy){display.textContent=tr('Loading…','Učitavanje…');return}
  if(force&&now-lastLeaderRequest<60000){display.textContent=tr('Try refreshing in a minute.','Pokušaj osvežavanje za minut.');return}
  lastLeaderRequest=now;leaderBusy=true;display.textContent=tr('Checking rankings…','Proveravam rang-listu…');
  try{
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),4500);
   let resp;try{resp=await fetch('https://nocna-straza-relay.stefanstevic1996.workers.dev/api/leaderboard?period=all',{signal:ctrl.signal,cache:'no-store'})}finally{clearTimeout(timer)}
   if(!resp.ok)throw Error('Ranking verification service not available');
   const payload=await resp.json();if(!payload||payload.verified!==true||!Array.isArray(payload.players))throw Error('Unverified ranking');
   leaderCache=payload.players.slice(0,50).filter(x=>typeof x.name==='string'&&Number.isSafeInteger(x.kills)&&x.kills>=0&&Number.isSafeInteger(x.level)&&x.level>=1);lastLeaderboard=Date.now();
   paintRanking(display,leaderCache);
  }catch{
   display.textContent=tr('The verified global leaderboard is not online yet. No invented scores or insecure uploads will be shown. Existing match results still work.','Proverena globalna rang-lista još nije aktivna. Ne prikazujemo lažne rezultate i ne prihvatamo nezaštićene uplate skorova. Statistika partije i dalje radi.');
  }finally{leaderBusy=false}
 }
 function paintRanking(node,data){
  node.replaceChildren();if(!data.length){node.textContent=tr('No verified scores yet.','Još nema proverenih rezultata.');return}
  for(const [i,p] of data.entries()){const row=document.createElement('p');row.textContent=(i+1)+'. '+p.name.slice(0,24)+' · '+p.kills+' '+tr('kills','ubistava')+' · LV '+p.level;node.append(row)}
 }
 function spartaKey(){return 'ns109_sparta_'+String(getActiveAccount()?.id||'default').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)}
 function spartaOwned(){try{return JSON.parse(localStorage.getItem(spartaKey())||'null')?.owned===true}catch{return false}}
 function spartaEquipped(){try{const v=JSON.parse(localStorage.getItem(spartaKey())||'null');return v?.owned===true&&v?.equipped!==false}catch{return false}}
 function spartaSave(owned,equipped){try{localStorage.setItem(spartaKey(),JSON.stringify({owned:!!owned,equipped:!!equipped}))}catch{}}
 function spartaClaim(kills){
  if(!Number.isFinite(kills)||kills<300||spartaOwned())return false;
  spartaSave(true,true);toast(tr('🏆 SPARTA UNLOCKED! Gold armor is cosmetic only.','🏆 SPARTA OTKLJUČANA! Zlatni oklop je samo kozmetika.'));return true;
 }
 function showSparta(){
  panel(tr('SPARTA ACHIEVEMENT','DOSTIGNUĆE SPARTA'));const text=document.createElement('p');text.textContent=spartaOwned()?tr('🏆 Won: golden Spartan-style helmet and armor. No HP, damage or speed advantage.','🏆 Osvojeno: zlatni šlem i oklop spartanskog stila. Bez dodatnog HP-a, štete ili brzine.'):tr('Get 300 personal kills in one real match. Test/editor runs do not count.','Napravi 300 ličnih ubistava tokom jedne stvarne partije. Test i editor se ne računaju.');area.append(text);
  const btn=document.createElement('button');btn.textContent=spartaEquipped()?tr('✓ WEARING · REMOVE','✓ OBUČENO · SKINI'):tr('WEAR GOLD ARMOR','OBUCI ZLATNI OKLOP');btn.disabled=!spartaOwned();btn.onclick=()=>{spartaSave(true,!spartaEquipped());showSparta()};area.append(btn);
 }
 function decorate(look,e){
  if(!look||typeof look!=='object')return look;
  const isMine=!e||!NET.role||e.id===NET.localId||e.id==='p1'&&NET.role!=='guest';
  if(!look.ns109Sparta&&!(isMine&&spartaEquipped()))return look;
  return {...look,accent:'#e4c16a',gear:'armor',wardrobe:{...look.wardrobe,top:'armor',bottom:'armored',hat:'plume',topColor:'#e0ad4c',hatColor:'#e7cb76',torso:'#b98b36',glovesColor:'#bd984d',bottomColor:'#705b43',shoesColor:'#8d7953'}};
 }
 function networkAppearance(style){
  if(!style)return style;
  if(style.ns109Sparta)return style;
  if(style===heroStyle&&spartaEquipped())return {...style,ns109Sparta:true};
  return style;
 }
 const background=()=>{
  g.fillStyle='#29493e';g.fillRect(0,0,VILLAGE_W,VILLAGE_H);
  // Wide garden squares, independent of interactive buildings.
  for(let i=0;i<34;i++){
   const x=(i*271+73)%VILLAGE_W,y=(i*193+81)%VILLAGE_H;
   g.fillStyle=i%3?'#355747':'#3b654c';g.beginPath();g.arc(x,y,20+(i%5)*15,0,7);g.fill();
  }
  g.lineCap='round';
  for(const [ax,ay,bx,by,w] of [[0,513,VILLAGE_W,513,76],[828,0,828,VILLAGE_H,80],[250,513,250,625,32],[565,513,565,621,32],[957,513,957,618,32],[1312,513,1312,625,32],[1452,513,1452,520,28]]){
   g.strokeStyle='#84755e';g.lineWidth=w+13;g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke();
   g.strokeStyle='#bb9c75';g.lineWidth=w;g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke();
  }
  // Trees are drawn into a cached background, so no per-frame foliage cost.
  const trees=[[53,77,33],[140,80,28],[359,73,31],[695,81,36],[1020,75,34],[1520,65,32],
   [55,366,30],[347,400,28],[1085,383,34],[1582,300,30],[52,675,32],[370,865,33],
   [750,877,36],[1090,866,30],[1537,861,37],[1570,680,31],[96,876,28],[1170,414,26]];
  for(const [x,y,r] of trees){
   g.fillStyle='#10251c77';g.beginPath();g.ellipse(x+7,y+16,r,r*.43,0,0,7);g.fill();
   g.fillStyle='#735337';g.fillRect(x-5,y-17,10,40);
   for(const [dx,dy,rr,col] of [[0,-24,r,'#386847'],[-r*.43,-16,r*.7,'#487650'],[r*.40,-22,r*.65,'#345d43']]){
    g.fillStyle=col;g.beginPath();g.arc(x+dx,y+dy,rr,0,7);g.fill();
   }
  }
  // Sheep meadow / pig pen, a bench, flower patches and a little pond.
  g.fillStyle='#3b6847';g.beginPath();g.ellipse(1467,727,117,107,-.1,0,7);g.fill();
  g.strokeStyle='#92714e';g.lineWidth=5;
  for(let k=0;k<7;k++){const x=1390+k*30;g.beginPath();g.moveTo(x,827);g.lineTo(x,847);g.stroke()}
  g.fillStyle='#367d87';g.beginPath();g.ellipse(350,512,57,21,.1,0,7);g.fill();
  g.strokeStyle='#a4c1ad';g.lineWidth=2;for(let i=1;i<4;i++){g.beginPath();g.ellipse(350,512,i*13,i*4,0,0,7);g.stroke()}
  for(let i=0;i<90;i++){
   const x=(i*197+39)%VILLAGE_W,y=(i*317+28)%VILLAGE_H;
   if(Math.abs(x-828)<55||Math.abs(y-513)<53)continue;
   g.fillStyle=i%3===0?'#dfaa94':i%3===1?'#d1a4d6':'#e6d49c';
   g.fillRect(x,y,3,4);g.fillRect(x+3,y-3,3,3);
  }
  g.fillStyle='#5e4634';g.fillRect(1040,460,72,9);g.fillRect(1050,470,8,18);g.fillRect(1098,470,8,18);
 };
 function house(b){
  g.save();g.translate(b.x,b.y);g.fillStyle='#14211d88';g.fillRect(-b.w/2+7,-b.h/2+11,b.w,b.h);
  g.fillStyle=b.wall;g.fillRect(-b.w/2,-b.h/2+16,b.w,b.h-20);
  g.fillStyle=b.roof;g.beginPath();g.moveTo(-b.w/2-12,-b.h/2+20);g.lineTo(0,-b.h/2-31);g.lineTo(b.w/2+12,-b.h/2+20);g.closePath();g.fill();
  if(b.id==='barn'){
    // Distinct red timber barn with huge double doors and an upper hay-loft.
    g.strokeStyle='#ead0a3';g.lineWidth=5;
    for(let x=-b.w/2+12;x<b.w/2-8;x+=29){g.beginPath();g.moveTo(x,-b.h/2+24);g.lineTo(x,b.h/2-12);g.stroke()}
    g.fillStyle='#472d27';g.fillRect(-35,b.h/2-64,70,60);
    g.strokeStyle='#d9b77e';g.lineWidth=4;g.strokeRect(-35,b.h/2-64,70,60);
    g.beginPath();g.moveTo(-33,b.h/2-62);g.lineTo(33,b.h/2-6);g.moveTo(33,b.h/2-62);g.lineTo(-33,b.h/2-6);g.stroke();
    g.fillStyle='#b68b54';g.fillRect(-18,-b.h/2+5,36,24);
  }
  g.fillStyle='#483d35';g.fillRect(-14,b.h/2-37,28,34);
  // Distinct cottage front: solid timber framing, glowing windows, entrance and roof tiles.
  g.strokeStyle='#7b5739';g.lineWidth=3;g.strokeRect(-b.w/2+6,-b.h/2+21,b.w-12,b.h-25);
  g.fillStyle='#f3c977';g.fillRect(-b.w/2+18,-7,25,21);g.fillRect(b.w/2-43,-7,25,21);
  g.strokeStyle='#553f32';g.lineWidth=2;
  for(const wx of [-b.w/2+18,b.w/2-43]){g.strokeRect(wx,-7,25,21);g.beginPath();g.moveTo(wx+12,-7);g.lineTo(wx+12,14);g.moveTo(wx,3);g.lineTo(wx+25,3);g.stroke()}
  g.fillStyle='#594134';g.fillRect(-14,b.h/2-38,28,35);
  g.fillStyle='#eccb8a';g.beginPath();g.arc(9,b.h/2-20,2.6,0,7);g.fill();
  g.fillStyle='#6d5240';g.fillRect(b.w/2-32,-b.h/2-41,13,27);
  g.strokeStyle='#d0ae83';g.lineWidth=1.4;
  for(let x=-b.w/2+11;x<b.w/2-6;x+=20){g.beginPath();g.moveTo(x,-b.h/2+12);g.lineTo(x+11,-b.h/2+23);g.stroke()}
  g.fillStyle='#233b37db';g.fillRect(-b.w/2+6,-b.h/2+24,b.w-12,24);
  g.font='bold 15px system-ui';g.textAlign='center';g.fillStyle='#f7e5a9';g.shadowColor='#071414';g.shadowBlur=3;
  g.fillText(b.icon+' '+tr(b.label,b.sr),0,-b.h/2+41,b.w-18);
  g.shadowBlur=0;g.restore();
 }
 // V121: depth ordering. The road/landscape is cached separately from the houses.
 // Each cottage has a small cached transparent sprite which is placed in the same
 // y-sorted drawing queue as player characters. When behind a cottage, the roof
 // and wall cover the hero; when in front of the doorway, the hero stays visible.
 function villageHouseSprite(b){
  if(houseLayers.has(b.id))return houseLayers.get(b.id);
  const left=Math.floor(b.x-b.w/2-17),top=Math.floor(b.y-b.h/2-51);
  const right=Math.ceil(b.x+b.w/2+17),bottom=Math.ceil(b.y+b.h/2+20);
  const img=document.createElement('canvas');
  img.width=right-left;img.height=bottom-top;
  const off=img.getContext('2d',{alpha:true});
  if(!off)return null;
  off.setTransform(1,0,0,1,-left,-top);
  const prev=g;
  try{g=off;house(b)}finally{g=prev}
  const sprite={img,left,top};
  houseLayers.set(b.id,sprite);
  return sprite;
 }
 function drawDepthHouse(b){
  const sprite=villageHouseSprite(b);
  if(sprite)g.drawImage(sprite.img,sprite.left,sprite.top);else house(b);
 }
 function villageStaticLayer(){
  const lang=window.__gameLanguage?.value||'en';
  if(sceneLayer&&sceneLayerLang===lang)return sceneLayer;
  const img=document.createElement('canvas');img.width=VILLAGE_W;img.height=VILLAGE_H;
  const off=img.getContext('2d',{alpha:false});if(!off)return null;
  const prev=g;
  try{
   g=off;background();
   g.fillStyle='#467d55';g.beginPath();g.arc(1312,802,37,0,7);g.fill();
   g.strokeStyle='#c5c38b';g.lineWidth=5;g.stroke();
   g.font='bold 13px system-ui';g.textAlign='center';g.fillStyle='#f5e5a4';g.fillText('READY',1312,812);
  }finally{g=prev}
  houseLayers.clear();
  sceneLayer=img;sceneLayerLang=lang;PERF.staticBuilds++;
  return sceneLayer;
 }
 function animalPos(o,ms=Date.now()){
  const t=ms/1000,oPhase=o.id*2.27;
  return {x:o.x+Math.sin(t*.36+oPhase)*23,
   y:o.y+Math.cos(t*.29+oPhase*.72)*15,side:Math.cos(t*.36+oPhase)>=0?1:-1};
 }
 function animalAlive(o,now=Date.now()){return now>=o.deadUntil}
 function drawVillageAnimals(time){
  const now=Date.now();
  for(const o of NPCS){
   if(!animalAlive(o,now))continue;
   const p=animalPos(o,now),t=time/280+o.id*1.6;
   g.save();g.translate(p.x,p.y+Math.sin(t)*.7);g.scale(p.side,1);
   g.fillStyle='#071e1a77';g.beginPath();g.ellipse(0,12,19,5,0,0,7);g.fill();
   g.strokeStyle=o.kind==='sheep'?'#705e54':'#a16f6d';g.lineWidth=4;g.lineCap='round';
   for(const lx of [-12,-5,6,14]){
    g.beginPath();g.moveTo(lx,3);g.lineTo(lx+Math.sin(t+lx)*1.6,16);g.stroke();
   }
   if(o.kind==='sheep'){
    g.fillStyle='#f2ead8';
    for(const [wx,wy,r] of [[-11,0,9],[-4,-5,10],[5,-6,10],[12,1,9],[-2,7,9]]){
     g.beginPath();g.arc(wx,wy,r,0,7);g.fill();
    }
    g.fillStyle='#c5ad95';g.beginPath();g.ellipse(20,-2,9,8,0,0,7);g.fill();
    g.beginPath();g.ellipse(15,-10,4,3,-.5,0,7);g.ellipse(25,-10,4,3,.5,0,7);g.fill();
    g.fillStyle='#282b29';g.fillRect(24,-6,2.5,2.5);
   }else{
    // Pink pigs: wobbling body, floppy ears, round snout and curled tail.
    g.fillStyle='#dc9d95';g.beginPath();g.ellipse(0,-1,20,13,0,0,7);g.fill();
    g.fillStyle='#e6aaa2';g.beginPath();g.ellipse(17,-4,11,10,0,0,7);g.fill();
    g.beginPath();g.moveTo(11,-11);g.lineTo(9,-22);g.lineTo(19,-13);g.fill();
    g.fillStyle='#b97c7b';g.beginPath();g.ellipse(25,-1,7,5,0,0,7);g.fill();
    g.fillStyle='#7e5252';g.fillRect(23,-3,1.5,3);g.fillRect(27,-3,1.5,3);
    g.fillStyle='#302323';g.fillRect(18,-9,2,2);
    g.strokeStyle='#d99d99';g.lineWidth=3;g.beginPath();
    g.moveTo(-19,-5);g.quadraticCurveTo(-29,-16,-24,-13);g.stroke();
   }
   if(o.hp===1){g.fillStyle='#e9d8ad';g.font='bold 11px system-ui';g.fillText('✦',-9,-24)}
   g.restore();
  }
 }

 function avatar(id,x,y,name,ready,sparta,animation={}){
  if(typeof drawVillageHero==='function'){
   const look=typeof getVillageHeroLook==='function'?getVillageHeroLook(id):heroStyle;
   const ko=PVP.get(id)?.opted&&PVP.get(id)?.hp<=0;
   g.save();if(ko)g.globalAlpha*=.38;
   drawVillageHero(g,x,y,{id,look,frame:animation.frame||0,walking:!!animation.walking,visualSide:animation.side||1});
   g.restore();
   if(ko){g.save();g.textAlign='center';g.font='18px sans-serif';g.fillText('💀',x,y-103);g.restore()}
   g.save();g.textAlign='center';g.font='bold 12px system-ui';g.lineWidth=3;g.strokeStyle='#0b191d';
   g.strokeText(name,x,y-74);g.fillStyle=ready?'#a4efbd':'#f2d29c';g.fillText(name,x,y-74);
   if(ready){g.font='bold 14px system-ui';g.fillStyle='#c2ffc5';g.fillText('✓',x+27,y-60)}
   const emote=emotes.get(id);if(emote&&Date.now()<emote.until){g.font='22px system-ui';g.fillText(emote.text,x+30,y-75)}
   drawVillagePvpHp(id,x,y);window.NS165_CLASSIC_VOICE?.drawBadge?.(g,id,x+44,y-86);g.restore();return;
  }
  g.save();if(PVP.get(id)?.opted&&PVP.get(id)?.hp<=0)g.globalAlpha*=.38;g.translate(x,y);g.textAlign='center';g.font='bold 12px system-ui';g.strokeStyle='#0b191d';g.lineWidth=3;g.strokeText(name,0,-36);g.fillStyle=ready?'#a4efbd':'#f2d29c';g.fillText(name,0,-36);
  g.fillStyle='#061a21a1';g.beginPath();g.ellipse(0,15,15,5,0,0,7);g.fill();
  g.fillStyle=sparta?'#d8ac4f':id===NET.localId?'#8abfba':'#9ba8cc';g.fillRect(-11,-18,22,29);
  g.fillStyle='#e3b58e';g.beginPath();g.arc(0,-24,9,0,7);g.fill();
  g.fillStyle=sparta?'#f7d778':'#304a4d';g.fillRect(-10,-34,20,6);
  g.fillStyle='#303c3d';g.fillRect(-11,10,8,15);g.fillRect(3,10,8,15);
  if(ready){g.font='bold 18px system-ui';g.fillStyle='#c2ffc5';g.fillText('✓',18,-22)}
  g.restore();drawVillagePvpHp(id,x,y);window.NS165_CLASSIC_VOICE?.drawBadge?.(g,id,x+38,y-60);
 }
 // V118: physics shared by joystick, dash and tap-to-walk.
 const COLLISION_PAD=12;
 function blockedVillage(x,y,margin=0){
  if(x<29||x>VILLAGE_W-29||y<62||y>VILLAGE_H-35)return true;
  return buildings.some(b=>x>b.x-b.w/2-COLLISION_PAD-margin&&x<b.x+b.w/2+COLLISION_PAD+margin&&
   y>b.y-b.h/2-COLLISION_PAD-margin&&y<b.y+b.h/2+COLLISION_PAD+margin);
 }
 function moveVillage(dx,dy){
  // Sweep in short segments, so dropped frames cannot tunnel through houses.
  const n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/6)),sx=dx/n,sy=dy/n;
  let moved=false;
  for(let i=0;i<n;i++){
   if(!blockedVillage(my.x+sx,my.y)){my.x+=sx;moved=true}
   else if(Math.abs(sx)>.02)PERF.blockedMoves++;
   if(!blockedVillage(my.x,my.y+sy)){my.y+=sy;moved=true}
   else if(Math.abs(sy)>.02)PERF.blockedMoves++;
  }
  return moved;
 }
 const PATH_CELL=20,PATH_COLS=Math.floor(VILLAGE_W/PATH_CELL)+1,PATH_ROWS=Math.floor(VILLAGE_H/PATH_CELL)+1;
 const tile=(x,y)=>({x:Math.max(0,Math.min(PATH_COLS-1,Math.round(x/PATH_CELL))),
                    y:Math.max(0,Math.min(PATH_ROWS-1,Math.round(y/PATH_CELL)))});
 const pathIdx=(x,y)=>y*PATH_COLS+x;
 // Navigation uses extra clearance so floating-point edge contact cannot trap the hero.
 const validTile=(x,y)=>!blockedVillage(x*PATH_CELL,y*PATH_CELL,5);
 function findVillagePath(from,to){
  PERF.paths++;
  const start=tile(from.x,from.y),end=tile(to.x,to.y);
  const source=pathIdx(start.x,start.y),target=pathIdx(end.x,end.y);
  const prev=new Int32Array(PATH_COLS*PATH_ROWS);prev.fill(-1);
  const queue=new Int32Array(PATH_COLS*PATH_ROWS);
  let head=0,tail=0;queue[tail++]=source;prev[source]=source;
  for(;head<tail&&prev[target]<0;){
   const id=queue[head++],x=id%PATH_COLS,y=Math.floor(id/PATH_COLS);
   for(const [dx,dy] of [[0,1],[1,0],[-1,0],[0,-1]]){
    const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=PATH_COLS||ny>=PATH_ROWS)continue;
    const ni=pathIdx(nx,ny);if(prev[ni]>=0||!validTile(nx,ny))continue;
    prev[ni]=id;queue[tail++]=ni;
   }
  }
  if(prev[target]<0)return null;
  const points=[];
  for(let id=target;id!==source;id=prev[id])points.push({x:id%PATH_COLS*PATH_CELL,y:Math.floor(id/PATH_COLS)*PATH_CELL});
  points.reverse();
  const compact=[];
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[i+1],c=points[i+2];
   if(b&&c&&(b.x-a.x)*(c.y-b.y)===(b.y-a.y)*(c.x-b.x))continue;
   compact.push(a);
  }
  if(!blockedVillage(to.x,to.y))compact.push(to);
  return compact;
 }
 // V120: physical door interaction shared by manual movement and tap-to-visit.
 const doorPoint=b=>({x:b.x,y:b.y+b.h/2+26});
 function closestDoor(){
  let best=null,dist=Infinity;
  for(const b of buildings){
   const p=doorPoint(b),d=Math.hypot(my.x-p.x,my.y-p.y);
   if(d<dist){dist=d;best=b}
  }
  return dist<=45?best:null;
 }
 function updateDoorInteraction(manual){
  const b=closestDoor(),btn=$('ns120Door');
  const active=opened&&pane.classList.contains('ns109Hidden')&&!root.classList.contains('ns109Hidden');
  if(doorLatch){
   const previous=buildings.find(x=>x.id===doorLatch);
   if(!previous||Math.hypot(my.x-doorPoint(previous).x,my.y-doorPoint(previous).y)>65)doorLatch=null;
  }
  btn.classList.toggle('ns109Hidden',!active||!b);
  const label=b?tr('↳ ENTER ','↳ UĐI U ')+tr(b.label,b.sr):'';
  if(b&&doorLabel!==label){btn.textContent=label;doorLabel=label}
  if(!active||!b||doorLatch===b.id)return;
  if(manual||(thenEnter===b.id&&!walkTo)){
   doorLatch=b.id;walkTo=null;route=[];thenEnter=null;enter(b.id);
  }
 }
 $('ns120Door').onclick=()=>{
  const b=closestDoor();if(!b||!opened||!pane.classList.contains('ns109Hidden'))return;
  doorLatch=b.id;walkTo=null;route=[];thenEnter=null;enter(b.id);
 };
 function startVillageTravel(x,y,entry=null){
  const p=ground(x,y);if(blockedVillage(p.x,p.y))return false;
  const path=findVillagePath(my,p);if(!path)return false;
  route=path;routeIndex=0;walkTo=route[0]||null;thenEnter=entry;
  if(!walkTo&&entry){doorLatch=entry;thenEnter=null;enter(entry)}
  return true;
 }
 function updateVillageTravel(dt){
  if(!walkTo)return;
  let remaining=150*dt,loops=0;
  while(remaining>.01&&walkTo&&loops++<16){
   const dx=walkTo.x-my.x,dy=walkTo.y-my.y,d=Math.hypot(dx,dy);
   if(d<=2.5){routeIndex++;walkTo=route[routeIndex]||null;
    if(!walkTo){const entry=thenEnter;thenEnter=null;route=[];if(entry){doorLatch=entry;enter(entry)}}
    continue;
   }
   const distance=Math.min(d,remaining),oldX=my.x,oldY=my.y;
   moveVillage(dx/d*distance,dy/d*distance);
   const actual=Math.hypot(my.x-oldX,my.y-oldY);
   if(actual<.03){walkTo=null;route=[];thenEnter=null;return}
   remaining-=actual;
   if(d-actual<=2.5){routeIndex++;walkTo=route[routeIndex]||null;
    if(!walkTo){const entry=thenEnter;thenEnter=null;route=[];if(entry){doorLatch=entry;enter(entry)}}
   }
  }
 }
 function resetStick(){stick.id=null;stick.vx=0;stick.vy=0;stick.drag=false;$('ns117Stick').classList.add('ns109Hidden');$('ns117Knob').style.transform='translate(0,0)'}
 function moveStick(e){
  if(e.pointerId!==stick.id)return;
  const dx=e.clientX-stick.x,dy=e.clientY-stick.y,d=Math.hypot(dx,dy);
  if(d>11)stick.drag=true;if(!stick.drag)return;
  const power=clamp((d-11)/57,0,1);stick.vx=d?dx/d*power:0;stick.vy=d?dy/d*power:0;
  $('ns117Knob').style.transform='translate('+clamp(dx,-28,28)+'px,'+clamp(dy,-28,28)+'px)';
 }
 canvas.addEventListener('pointerdown',e=>{
  if(!opened||!canVisit()||!pane.classList.contains('ns109Hidden')||stick.id!==null)return;
  if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();
  stick.id=e.pointerId;stick.x=e.clientX;stick.y=e.clientY;stick.drag=false;
  const b=$('ns109Stage').getBoundingClientRect(),el=$('ns117Stick');
  el.style.left=(e.clientX-b.left)+'px';el.style.top=(e.clientY-b.top)+'px';el.classList.remove('ns109Hidden');
  try{canvas.setPointerCapture(e.pointerId)}catch{}
 });
 canvas.addEventListener('pointermove',e=>{if(e.pointerId===stick.id){e.preventDefault();moveStick(e)}});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{
  if(e.pointerId!==stick.id)return;
  const tapOnly=type==='pointerup'&&!stick.drag;resetStick();if(tapOnly)tap(e);
 });
 for(const kind of ['keydown','keyup'])window.addEventListener(kind,e=>{
  if(!opened||/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||''))return;
  const k=e.key.length===1?e.key.toLowerCase():e.key;
  if(kind==='keydown'&&(k==='j'||k==='f')&&!e.repeat&&pane.classList.contains('ns109Hidden')){e.preventDefault();villageTryStrike();return}
  if(k===' '||k==='Spacebar'){e.preventDefault();if(kind==='keydown'&&!e.repeat&&!pane.classList.contains('ns109Hidden'))return;if(kind==='keydown'&&!e.repeat)$('ns117Dodge')?.click();return;}
  keys[k]=kind==='keydown';
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d'].includes(k))e.preventDefault();
 });
 window.addEventListener('blur',()=>{for(const k of Object.keys(keys))delete keys[k];resetStick()});
 $('ns117Dodge').onclick=()=>{const now=performance.now();if(!opened||now<dodgeReady)return;dodgeUntil=now+260;dodgeReady=now+2800};
 function step(time){
  if(!opened||!canVisit()){if(opened)closeVillage();return}
  if(document.hidden)return;
  const dt=clamp((time-frameAt)/1000,0,.14);frameAt=time;
  if(focused==='invite'&&time-lastInviteUiAt>=1600){lastInviteUiAt=time;const status=$('ns122Presence');if(status)status.textContent=inviteRosterText()}
  stepTraining(dt,Date.now());
  const roster=getPlayers();
  if(isLobby()&&lastRosterCount>0&&roster.length>lastRosterCount){
   const joined=roster.find(p=>p.id!==NET.localId&&!smoothAvatars.has(p.id));
   $('ns141Join').textContent='✓ '+tr('Player joined · ','Igrač se pridružio · ')+String(joined?.name||'GUARDIAN').slice(0,20);
   joinNoticeUntil=Date.now()+3900;
  }
  lastRosterCount=isLobby()?roster.length:0;
  $('ns141Join').classList.toggle('ns109Hidden',Date.now()>joinNoticeUntil);
  const live=villageOnline();
  const server=$('ns141Server');
  server.textContent=isLobby()?'📋 '+(NET.code||'SOBА'):pendingAutoRoom==='HOST'?'⏳ OTVARAM...':tr('🌐 START SERVER','🌐 PODIGNI SERVER');
  server.disabled=pendingAutoRoom==='HOST'&&!isLobby();
  $('ns109Classic').textContent=isLobby()?tr('☷ LOBBY / START','☷ LOBI / START'):tr('☷ BACK','☷ NAZAD');
  $('ns141Training').textContent=trainingOn?tr('⚔ PRACTICE ','⚔ TRENING ')+trainingKills:tr('⚔ PRACTICE: OFF','⚔ TRENING: OFF');
  const stateText=isLobby()?
   (live?tr('● SERVER UP · ','● SERVER UP · '):tr('○ RECONNECTING · ','○ POVEZUJEM · '))+NET.code+' · '+roster.length+'/'+NS92_DIR.maxPlayers():
   tr('◇ OFFLINE VILLAGE','◇ OFFLINE SELO');
  if($('ns109Info').textContent!==stateText)$('ns109Info').textContent=stateText;
  const oldX=my.x,oldY=my.y;
  const keyX=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0);
  const keyY=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);
  const vx=stick.vx+keyX,vy=stick.vy+keyY,magnitude=Math.hypot(vx,vy);
  const ko=getPvP(NET.localId||'p1');
  const knockedOut=ko.opted&&ko.hp<=0;
  if(knockedOut){walkTo=null;thenEnter=null;route=[]}
  if(!knockedOut&&magnitude>.05){
   walkTo=null;thenEnter=null;route=[];
   const speed=150*(time<dodgeUntil?2.25:1)*dt;
   moveVillage(vx/Math.max(1,magnitude)*speed,vy/Math.max(1,magnitude)*speed);
  }else if(!knockedOut&&walkTo){updateVillageTravel(dt)}
  walking=Math.hypot(my.x-oldX,my.y-oldY)>.15;
  if(walking){stepFrame+=dt*8;if(my.x<oldX-.1)side=-1;if(my.x>oldX+.1)side=1}
  updateDoorInteraction(magnitude>.05&&walking);
  $('ns117Dodge').disabled=knockedOut||time<dodgeReady;
  // Reuse the existing shared 60 FPS Village frame; no extra timers.
  if(!knockedOut&&Date.now()-lastSoloHit>=650){
   const target=villageAutoTarget();
   if(target&&(target.kind==='training'||NET.role!=='guest'||NET.conn?.open)&&villageTryStrike())
    side=target.x<my.x?-1:1;
  }
  if(NET.phase==='lobby'&&NET.role==='guest'&&NET.conn?.open&&time-lastSent>110){
   lastSent=time;try{NET.conn.send({t:'ns109Move',x:Math.round(my.x),y:Math.round(my.y)})}catch{}
  }
  if(NET.role==='host'&&isLobby()&&time-lastPvpSync>700){lastPvpSync=time;villageBroadcastPvp()}
  if(NET.role==='host'&&time-lastBroadcast>125){
   lastBroadcast=time;const players=[...avatars.entries()].filter(([id])=>getPlayers().some(p=>p.id===id)).slice(0,6).map(([id,a])=>({id,x:Math.round(a.x),y:Math.round(a.y),walking:!!a.walking&&time-a.lastMoveAt<360,side:a.side||1}));
   players.push({id:NET.localId,x:Math.round(my.x),y:Math.round(my.y),walking,side});
   const packet={t:'ns109State',players};for(const c of NET.clients.values())if(c?.open)try{c.send(packet)}catch{}
  }
  const screen=view(),ratio=Math.min(1.5,window.devicePixelRatio||1),w=Math.max(1,Math.round(screen.rect.width*ratio)),h=Math.max(1,Math.round(screen.rect.height*ratio));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  g.setTransform(ratio,0,0,ratio,0,0);g.fillStyle='#1d342d';g.fillRect(0,0,screen.rect.width,screen.rect.height);
  g.setTransform(ratio*screen.scale,0,0,ratio*screen.scale,ratio*screen.ox,ratio*screen.oy);
  const layer=villageStaticLayer();if(layer)g.drawImage(layer,0,0);else background();
  drawVillageAnimals(time);PERF.frames++;
  const depthItems=buildings.map(b=>({y:b.y+b.h/2,kind:'house',id:b.id,paint:()=>drawDepthHouse(b)}));
  for(const c of VILLAGE_CRATES)if(Date.now()>=c.deadUntil)
   depthItems.push({y:c.y,kind:'crate',id:c.id,paint:()=>drawVillageCrate(c)});
  if(trainingOn)for(const m of trainingMobs)if(m.hp>0){
   depthItems.push({y:m.y,kind:'training',id:'dummy'+m.id,paint:()=>drawTrainingMob(m,time)});
  }
  for(const p of roster){
   if(p.id===NET.localId)continue;
   const dest=avatars.get(p.id)||{x:800+Number(p.id?.slice(1)||2)*27,y:506};
   let a=smoothAvatars.get(p.id);
   if(!a){a={x:dest.x,y:dest.y};smoothAvatars.set(p.id,a)}
   const t=Math.min(1,dt*10);a.x+=(dest.x-a.x)*t;a.y+=(dest.y-a.y)*t;
   const moving=Math.hypot(a.x-dest.x,a.y-dest.y)>1;
   depthItems.push({y:a.y,kind:'hero',id:p.id,paint:()=>avatar(p.id,a.x,a.y,String(p.name||'GUARDIAN').slice(0,14),p.ready,false,{walking:moving||!!dest.walking,frame:time/145,side:dest.side||1})});
  }
  const me=roster.find(p=>p.id===NET.localId);
  depthItems.push({y:my.y,kind:'hero',id:NET.localId,paint:()=>avatar(NET.localId,my.x,my.y,ownName(),!!me?.ready||NET.ns97Results?.votes?.[NET.localId]==='yes',spartaEquipped(),{walking,frame:stepFrame,side})});
  depthItems.sort((a,b)=>a.y-b.y||(a.kind===b.kind?0:(a.kind==='house'?-1:1)));
  lastDepthOrder=depthItems.map(item=>item.kind+':'+item.id);
  for(const item of depthItems)item.paint();
  drawVillageHits();
  if(opened&&!pane.classList.contains('ns109Hidden')&&focused==='leaderboard')return;
 }
 function onMessage(data,assigned){
  if(!data||!['ns109Move','ns109State','ns109Emote','ns138State','ns138PvpToggle','ns138PvpLeave','ns138Strike'].includes(data.t))return false;
  if(!isLobby())return true;
  if(NET.role==='host'){
   if(!/^p[2-6]$/.test(String(assigned||''))||!NET.clients.get(assigned)?.open)return true;
   if(data.t==='ns138State'||data.t==='ns109State')return true;
   if(data.t==='ns138PvpLeave'){
    const state=getPvP(assigned);state.opted=false;state.hp=PVP_HP;state.respawnAt=0;
    villageBroadcastPvp();return true;
   }
   // Guest actions use the peer id and host-observed position, never client damage.
   if(data.t==='ns138PvpToggle'||data.t==='ns138Strike'){
    const seen=limits.get(assigned);
    if(!seen||performance.now()-seen.at>1700||!avatars.has(assigned))return true;
    if(data.t==='ns138PvpToggle')toggleVillagePvp(assigned);
    else villageStrike(assigned);
    return true;
   }
   const now=performance.now(),prev=limits.get(assigned)||{at:0,x:840,y:506,emote:0};
   if(now-prev.at<85)return true;
   if(data.t==='ns109Emote'){
    if(now-prev.emote>5000&&['👋','⚔','🍻'].includes(data.emote)){prev.emote=now;emotes.set(assigned,{text:data.emote,until:Date.now()+2500});
      for(const c of NET.clients.values())if(c?.open)try{c.send({t:'ns109Emote',id:assigned,emote:data.emote})}catch{}}
    limits.set(assigned,prev);return true;
   }
   if(Number.isFinite(data.x)&&Number.isFinite(data.y)){
    if(getPvP(assigned).opted&&getPvP(assigned).hp<=0)return true;
    const p=ground(data.x,data.y);const dt=clamp((now-prev.at)/1000,.16,1.5),max=155*dt+16;
    const d=Math.hypot(p.x-prev.x,p.y-prev.y),t=d>max?max/d:1;
    prev.x+=((p.x-prev.x)*t);prev.y+=((p.y-prev.y)*t);prev.at=now;
    const old=avatars.get(assigned);avatars.set(assigned,{x:prev.x,y:prev.y,walking:d>2,side:d>2?(p.x<prev.x?-1:1):(old?.side||1),lastMoveAt:d>2?now:(old?.lastMoveAt||0)});limits.set(assigned,prev);
    if(!opened&&now-lastBroadcast>750){
     lastBroadcast=now;const peers=[...avatars.entries()].filter(([id])=>getPlayers().some(p=>p.id===id)).slice(0,6).map(([id,a])=>({id,x:Math.round(a.x),y:Math.round(a.y)}));
     for(const c of NET.clients.values())if(c?.open)try{c.send({t:'ns109State',players:peers})}catch{}
    }
   }
   return true;
  }
  if(data.t==='ns138State'){
   if(NET.role==='guest')applyVillageState(data);return true;
  }
  if(data.t==='ns109State'){
   if(!Array.isArray(data.players)||data.players.length>8)return true;
   for(const p of data.players)if(/^p[1-6]$/.test(String(p?.id||''))&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.id!==NET.localId)avatars.set(p.id,{...ground(p.x,p.y),walking:!!p.walking,side:p.side===-1?-1:1});
   return true;
  }
  if(data.t==='ns109Emote'&&/^p[1-6]$/.test(String(data.id||''))&&['👋','⚔','🍻'].includes(data.emote))emotes.set(data.id,{text:data.emote,until:Date.now()+2500});
  return true;
 }
 function tap(e){
  if(!opened||!canVisit()||!pane.classList.contains('ns109Hidden'))return;
  if(getPvP(NET.localId||'p1').opted&&getPvP(NET.localId||'p1').hp<=0)return;
  const p=ctxPoint(e);if(p.x<0||p.y<0||p.x>VILLAGE_W||p.y>VILLAGE_H)return;
  const b=buildings.find(x=>Math.abs(p.x-x.x)<x.w/2+25&&Math.abs(p.y-x.y)<x.h/2+30);
  if(b){if(!startVillageTravel(b.x,b.y+b.h/2+26,b.id))toast(tr('Path blocked. Walk closer.','Put je blokiran. Priđi bliže.'));}
  else if(Math.hypot(p.x-1312,p.y-789)<44){startVillageTravel(1312,789,'ready');}
  else{startVillageTravel(p.x,p.y)}
 }
 function showVillage(){
  setVillageMenu(false);
  if(!canVisit()){toast(tr('Open the village from the main menu or multiplayer lobby.','Otvori selo iz glavnog menija ili multiplayer lobija.'));return false;}
  soloPreview=!isLobby();
  if(!soloPreview){$('coopPanel')?.classList.remove('hidden');$('lobbyArea')?.classList.remove('hidden')}
  opened=true;walkTo=null;thenEnter=null;route=[];doorLatch=null;doorLabel='';resetStick();stepFrame=0;walking=false;closePane();my.x=840;my.y=506;localRespawnSeq=0;PVP.clear();trainingOn=isLobby();resetVillageTraining();lastRosterCount=trainingOn?getPlayers().length:0;joinNoticeUntil=0;
  frameAt=performance.now();villageLastTick=0;villageFrameCredit=VILLAGE_TARGET_MS;
  fpsStart=0;fpsFrames=0;drawMsSum=0;drawMsMax=0;PERF.fps=0;
  root.classList.remove('ns109Hidden');$('home')?.classList.add('hidden');
  if(NET.ns97Results?.players?.length&&lastResultsRoundShown!==NET.ns97Results.round){lastResultsRoundShown=NET.ns97Results.round;showMatchBoard();}
  $('ns109Hint').textContent=tr('Walk to a doorway to enter · tap a house to visit','Priđi vratima za ulaz · dodirni kućicu da priđeš');
  primeVillageAudio();startVillageAmbience();if(preferMusic())playMusic();else refreshVillageAudioButtons();
  return true;
 }
 function closeVillage(){
  setVillageMenu(false);window.NS165_CLASSIC_VOICE?.hideVillagePopup?.();
  // Opt-out on exit (game starts, lobby closes or player leaves); no persistent arena state.
  if(isLobby()&&getPvP(NET.localId).opted){
   if(NET.role==='host'){getPvP(NET.localId).opted=false;villageBroadcastPvp()}
   else if(NET.role==='guest'&&NET.conn?.open)try{NET.conn.send({t:'ns138PvpLeave'})}catch{}
  }
  if(!isLobby())PVP.clear();
  const wasSolo=soloPreview;resetStick();opened=false;trainingOn=false;trainingCredit=0;villageLastTick=0;villageFrameCredit=0;soloPreview=false;walkTo=null;route=[];doorLatch=null;thenEnter=null;closePane();root.classList.add('ns109Hidden');smoothAvatars.clear();avatars.clear();limits.clear();stopMusic();stopVillageAmbience();document.body.classList.remove('ns109External');if(wasSolo&&NET.role===''&&G.mode==='menu')$('home')?.classList.remove('hidden')}
 // V144: Village SFX has its own low-cost AudioContext. No audio work runs in the render loop.
 function primeVillageAudio(){
  if(!opened||document.hidden)return null;
  try{
   if(!villageAudioCtx){
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
    villageAudioCtx=new C();
   }
   if(villageAudioCtx.state==='suspended')void villageAudioCtx.resume().catch(()=>{});
   animalAudioReady=villageAudioCtx.state==='running';
   return villageAudioCtx;
  }catch{return null}
 }
 function refreshVillageAudioButtons(){
  if($('ns144Fx'))$('ns144Fx').textContent=fxEnabled()?'🔊 FX':'🔇 FX';
  if($('ns109Sound'))$('ns109Sound').textContent=musicOn?'♫ ON':'♫ OFF';
 }
 function soundDistance(x,y,max=540){
  if(!audioEnabled())return 0;
  const d=Math.hypot(my.x-x,my.y-y);
  return d>=max?0:Math.pow(1-d/max,1.4);
 }
 function villageWeaponKind(){
  const a=getActiveAccount?.()||{},k=String(a.equippedWeapon||a.legendaryWeapon||'').toLowerCase();
  if(/bow|crossbow|arrow|archer/.test(k))return 'bow';
  if(/axe|hammer|mace|club|maul/.test(k))return 'heavy';
  if(/staff|wand|magic|frost|fire|spell/.test(k))return 'magic';
  return 'sword';
 }
 // A single short noise buffer serves all blade swings, impacts and snorts.
 function villageNoise(ctx){
  if(noiseBuffer&&noiseBuffer.sampleRate===ctx.sampleRate)return noiseBuffer;
  const b=ctx.createBuffer(1,Math.max(2048,Math.round(ctx.sampleRate*.42)),ctx.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  noiseBuffer=b;return b;
 }
 function villageBurst(kind,gain=.15,pitch=1){
  if(!fxEnabled())return false;
  const c=primeVillageAudio();if(!c||c.state!=='running')return false;
  const now=c.currentTime;
  try{
   const len=kind==='pig'?.34:kind==='sheep'?.53:kind==='heavy'?.29:.19;
   const n=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain();
   n.buffer=villageNoise(c);n.playbackRate.value=.88+Math.random()*.24;
   filter.type=kind==='sword'?'bandpass':'lowpass';
   filter.frequency.value=kind==='sword'?1700:kind==='heavy'?450:kind==='pig'?420:kind==='sheep'?1100:1400;
   filter.Q.value=.7;
   g.gain.setValueAtTime(.0001,now);
   g.gain.exponentialRampToValueAtTime(Math.max(.0002,Math.min(.25,gain*fxLevel())),now+.018);
   g.gain.exponentialRampToValueAtTime(.0001,now+len);
   n.connect(filter);filter.connect(g);g.connect(c.destination);
   n.start(now);n.stop(now+len+.015);
   if(kind==='pig'||kind==='sheep'||kind==='magic'||kind==='bow'||kind==='sword'){
    const osc=c.createOscillator(),env=c.createGain(),band=c.createBiquadFilter();
    osc.type=kind==='pig'?'sawtooth':kind==='sheep'?'triangle':kind==='bow'?'triangle':'sine';
    const freq=kind==='pig'?175:kind==='sheep'?340:kind==='bow'?250:kind==='magic'?520:820;
    osc.frequency.setValueAtTime(freq*pitch,now);
    osc.frequency.exponentialRampToValueAtTime(freq*(kind==='pig'?1.65:kind==='sheep'?.77:kind==='bow'?.48:.55)*pitch,now+len*.7);
    if(kind==='pig')osc.frequency.exponentialRampToValueAtTime(freq*.72*pitch,now+len);
    band.type='lowpass';band.frequency.value=kind==='pig'?1300:kind==='sheep'?1350:3300;
    env.gain.setValueAtTime(.0001,now);env.gain.exponentialRampToValueAtTime(Math.max(.0002,gain*fxLevel()*.6),now+.045);
    env.gain.exponentialRampToValueAtTime(.0001,now+len);
    osc.connect(band);band.connect(env);env.connect(c.destination);
    osc.start(now);osc.stop(now+len+.015);
   }
   return true;
  }catch{return false}
 }
 function playWeaponSwing(){
  const kind=villageWeaponKind();
  villageBurst(kind==='heavy'?'heavy':kind==='magic'?'magic':kind==='bow'?'bow':'sword',
    kind==='heavy'?.24:.13,.92+Math.random()*.16);
 }
 function playVillageHit(x,y,target){
  const volume=soundDistance(x,y,260);if(!volume)return;
  villageBurst(target==='armor'?'sword':villageWeaponKind()==='heavy'?'heavy':'hit',.17*volume);
 }
 function playAnimalCall(kind,x,y,hit=false){
  if(!fxEnabled())return false;
  const now=Date.now(),dist=soundDistance(x,y,hit?310:590);
  if(!dist||(!hit&&now-lastAnimalCall<4700))return false;
  lastAnimalCall=now;
  if(kind==='sheep'||kind==='pig'){
   try{
    let sample=animalSamples.get(kind);
    if(!sample){
     sample=new Audio(CC0_VILLAGE_AUDIO[kind]);sample.preload='none';
     sample.addEventListener('error',()=>{sample.dataset.failed='1'},{once:true});
     animalSamples.set(kind,sample);
    }
    if(sample.dataset.failed!=='1'){
     sample.pause();sample.currentTime=0;
     sample.volume=Math.min(.33,dist*fxLevel()*(hit?.53:.28));
     sample.playbackRate=.91+Math.random()*.18;
     const promise=sample.play();
     if(promise?.catch)promise.catch(()=>{sample.dataset.failed='1';villageBurst(kind,.2*dist)});
     return true;
    }
   }catch{}
   // When the CC0 recording is unreachable on mobile, the original synth still works.
   return villageBurst(kind,.23*dist,.85+Math.random()*.3);
  }
  return false;
 }
 function tickVillageAnimals(){
  if(!fxEnabled()||!animalAudioReady)return;
  const now=Date.now(),candidates=NPCS.filter(a=>animalAlive(a,now)&&now-(animalLast.get(a.id)||0)>9000)
   .map(a=>({a,pos:animalPos(a,now)}))
   .filter(q=>soundDistance(q.pos.x,q.pos.y,450)>.12);
  if(!candidates.length)return;
  if(villageMusic&&musicOn)villageMusic.volume=Math.min(.16,musicLevel()*.58);
  const item=candidates[Math.floor(Math.random()*candidates.length)];
  if(Math.random()>.75)return;
  if(playAnimalCall(item.a.kind,item.pos.x,item.pos.y)){animalLast.set(item.a.id,now)}
 }
 function startVillageAmbience(){
  if(animalTicker)clearInterval(animalTicker);
  animalAudioReady=!!primeVillageAudio();
  animalTicker=setInterval(tickVillageAnimals,3600);
  refreshVillageAudioButtons();
 }
 function stopVillageAmbience(){
  if(animalTicker)clearInterval(animalTicker);animalTicker=null;
  for(const sample of animalSamples.values())try{sample.pause()}catch{}
  const c=villageAudioCtx;villageAudioCtx=null;noiseBuffer=null;animalAudioReady=false;
  try{if(c?.state!=='closed')void c?.close().catch(()=>{})}catch{}
 }
 function startMusicFallback(){
  if(musicTimer)return;
  const notes=[196,246.94,293.66,392,220,261.63,329.63,392,174.61,220,261.63,349.23,196,246.94,293.66,370];
  musicFallbackStep=0;
  function note(){
   const c=musicCtx;
   if(!musicOn||!audioEnabled()||!c||c.state!=='running')return;
   const now=c.currentTime,root=notes[musicFallbackStep++%notes.length];
   for(const [freq,amp,duration] of [[root,.028,1.38],[root*1.5,.008,1.1]]){
    const osc=c.createOscillator(),gain=c.createGain(),filter=c.createBiquadFilter();
    osc.type='sine';osc.frequency.value=freq;
    filter.type='lowpass';filter.frequency.value=680;
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.linearRampToValueAtTime(amp*musicLevel()/.18,now+.20);
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(filter);filter.connect(gain);gain.connect(c.destination);
    osc.start(now);osc.stop(now+duration+.02);
   }
  }
  note();musicTimer=setInterval(note,1450);
 }
 function playMusic(){
  if(musicOn){stopMusic();localStorage.setItem('ns144_village_music_off','1');refreshVillageAudioButtons();return}
  localStorage.removeItem('ns144_village_music_off');
  if(!opened||$('musicEnabled')?.checked===false){refreshVillageAudioButtons();return}
  const ctx=primeVillageAudio();musicCtx=ctx;musicOn=true;
  try{
   if(!villageMusic){villageMusic=new Audio(CC0_VILLAGE_AUDIO.music);villageMusic.loop=true;villageMusic.preload='none';villageMusic.addEventListener('error',()=>{if(musicOn)startMusicFallback()});}
   villageMusic.volume=Math.min(.16,musicLevel()*.58);
   const p=villageMusic.play();
   if(p?.catch)p.catch(()=>{if(musicOn&&ctx?.state==='running')startMusicFallback()});
  }catch{startMusicFallback()}
  refreshVillageAudioButtons();
 }
 function stopMusic(){
  musicOn=false;clearInterval(musicTimer);musicTimer=null;
  try{villageMusic?.pause();if(villageMusic)villageMusic.currentTime=0}catch{}
  musicCtx=null;refreshVillageAudioButtons();
 }
 function scheduleAutoVillage(){
  if(!isLobby()||NET.round<1||localStorage.getItem('ns109_village_pref')==='classic')return;
  setTimeout(()=>{if(isLobby()&&NET.round>=1&&!opened&&!document.hidden&&pane.classList.contains('ns109Hidden'))showVillage()},3800);
 }
 $('ns109PaneBack').onclick=closePane;
 $('ns109Classic').onclick=()=>{pendingAutoRoom='';pendingAutoUntil=0;localStorage.setItem('ns109_village_pref','classic');closeVillage()};
 $('ns109Sound').onclick=playMusic;
 $('ns144Fx').onclick=()=>{if(fxEnabled())localStorage.setItem('ns144_village_fx_off','1');else localStorage.removeItem('ns144_village_fx_off');primeVillageAudio();refreshVillageAudioButtons()};
 // Pausing audio does not affect the relay: hosted Village still stays online.
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
   try{villageMusic?.pause()}catch{}
   for(const sample of animalSamples.values())try{sample.pause()}catch{}
  }else if(opened){
   primeVillageAudio();
   if(musicOn&&villageMusic?.paused){
    try{const p=villageMusic.play();if(p?.catch)p.catch(()=>{})}catch{}
   }
  }
 });
 $('ns109Results').onclick=showMatchBoard;
 $('ns109Global').onclick=()=>{focused='leaderboard';showRankings()};
 $('ns109Sparta').onclick=showSparta;
 $('ns109Voices').onclick=showVoice;
 $('ns109Chat').onclick=()=>enter('chat');
 $('ns141Server').onclick=()=>startVillageOnlineRoom();
 $('ns141Training').onclick=()=>{
  trainingOn=!trainingOn;resetVillageTraining();
  toast(trainingOn?tr('Training only · no XP or rewards','Samo trening · bez XP-a i nagrada'):tr('Training paused','Trening pauziran'));
 };
 // V117 pointer handlers above distinguish tap-to-enter from drag-to-move.
 document.addEventListener('keydown',e=>{if(!opened||!canVisit())return;if(e.key==='Escape'&&!$('ns169Menu').hidden){e.stopImmediatePropagation();setVillageMenu(false)}else if(e.key==='Escape'&&!pane.classList.contains('ns109Hidden')){e.stopImmediatePropagation();closePane()}else if(e.key==='Escape'){e.stopImmediatePropagation();closeVillage()}},true);
 const homeVillage=document.createElement('button');homeVillage.id='ns110VillageHome';homeVillage.type='button';homeVillage.textContent='🏡 '+tr('EXPLORE VILLAGE · CHILL HUB','ISTRAŽI SELO · CHILL LOBI');homeVillage.onclick=()=>{if(G.mode!=='menu'){toast(tr('Village is available between runs.','Selo je dostupno između partija.'));return}localStorage.setItem('ns109_village_pref','village');showVillage()};($('ns50MenuPlay')||$('coopBtn'))?.insertAdjacentElement('beforebegin',homeVillage);
 const enterButton=document.createElement('button');enterButton.id='ns109Visit';enterButton.type='button';enterButton.textContent='🏡 '+tr('ENTER VILLAGE','UĐI U SELO');enterButton.onclick=()=>{localStorage.setItem('ns109_village_pref','village');showVillage()};
 $('lobbyArea')?.insertBefore(enterButton,$('roomCode'));
 const postButton=document.createElement('button');postButton.id='ns109PostButton';postButton.type='button';postButton.textContent='🏡 '+tr('VISIT VILLAGE','POSĒTI SELO');postButton.onclick=enterButton.onclick;
 $('ns97Results')?.append(postButton);
 // Rematch/lobby hooks run inside the original game scope, not a disconnected wrapper.
 // Match-start hook is provided by the original engine.
 // Solo completion hook is provided by the original engine.
 // Host-attested co-op reward hook is provided by the original engine.
 if(typeof NS91?.onKill==='function'){
  originalOnKill=NS91.onKill;NS91.onKill=function(){const result=originalOnKill.apply(this,arguments);
   if(!G.debugRun&&G.mode==='play'&&(G.runType==='default'||G.runType==='network')&&NET.role!=='guest'){
    const count=NET.role==='host'?(G.players.find(p=>p.id===NET.localId)?.runKills||0):(G.kills||0);spartaClaim(count);
   }return result;
  };
 }
 // Cosmetic looks are now transported by the original engine's networkHeroStyle.
 // Lifecycle: detached village only; classic lobby and legacy game engine continue unchanged.
 // V119: share the main game's rAF clock and target 60 displayed frames/second.
 // Fractional credit yields ~60 at 90/120Hz instead of skipping down to 45/30.
 function villageFrame(now){
  if(!opened)return;
  if(!canVisit()){closeVillage();return}
  if(document.hidden||root.classList.contains('ns109Hidden')){
   villageLastTick=0;villageFrameCredit=0;frameAt=now;return;
  }
  if(!villageLastTick){
   villageLastTick=now;villageFrameCredit=VILLAGE_TARGET_MS;
  }else{
   villageFrameCredit=Math.min(VILLAGE_TARGET_MS*2,villageFrameCredit+Math.max(0,Math.min(70,now-villageLastTick)));
   villageLastTick=now;
  }
  if(villageFrameCredit+0.35<VILLAGE_TARGET_MS)return;
  villageFrameCredit=Math.max(0,villageFrameCredit-VILLAGE_TARGET_MS);
  const started=performance.now();
  step(now);
  const spent=performance.now()-started;
  fpsFrames++;drawMsSum+=spent;drawMsMax=Math.max(drawMsMax,spent);
  if(!fpsStart)fpsStart=now;
  if(now-fpsStart>=1050){
   const duration=now-fpsStart;
   PERF.fps=Math.round(fpsFrames*1000/duration);
   PERF.averageDrawMs=Math.round(drawMsSum/fpsFrames*100)/100;
   PERF.maxDrawMs=Math.round(drawMsMax*100)/100;
   fpsFrames=0;drawMsSum=0;drawMsMax=0;fpsStart=now;
   if(fpsBadge)fpsBadge.textContent=PERF.fps+' FPS · '+PERF.averageDrawMs.toFixed(1)+'ms';
  }
 }
 window.NS109_VILLAGE={open:showVillage,close:closeVillage,frame:villageFrame,onMessage,enter,onLobbyUI:onVillageLobbyReady,expectJoin:expectVillageJoin,
 voicePosition:id=>{
  if(!opened||!isLobby())return null;
  if(id===NET.localId)return {x:my.x,y:my.y};
  const a=smoothAvatars.get(id)||avatars.get(id);
  return a&&Number.isFinite(a.x)&&Number.isFinite(a.y)?{x:a.x,y:a.y}:null;
 },openInvites:()=>{if(!opened&&canVisit())showVillage();if(!opened)return false;showInviteHouse();return true},
 get serverUp(){return villageOnline()},get roomCode(){return isLobby()?NET.code:''},
 startServer:startVillageOnlineRoom,
 onSoloResult:run=>{if(run&&NET.role===''&&G.runType==='default'&&!G.debugRun)spartaClaim(run.kills)},
 onMPAward:packet=>{if(packet&&Number.isFinite(packet.kills)&&!G.debugRun){spartaClaim(packet.kills);recordPersonalMP(packet)}},
 get opened(){return opened},test:{spartaClaim,spartaOwned,spartaEquipped,spartaKey,buildings,ground,readRankings,personalStats,recordPersonalMP,
   get animals(){return NPCS.map(o=>({...o,...animalPos(o)}))},get crates(){return VILLAGE_CRATES.map(c=>({...c}))},get autoTarget(){return villageAutoTarget()},get practice(){return {on:trainingOn,kills:trainingKills,mobs:trainingMobs.map(m=>({...m}))}},
   get serverUp(){return villageOnline()},startServer:startVillageOnlineRoom,
   get pvp(){return [...PVP].map(([id,p])=>({id,...p}))},
   get world(){return {width:VILLAGE_W,height:VILLAGE_H}},animalPos,attack:villageTryStrike,
   barn:()=>{if(!opened)return false;showBarnPvP();return true},
   togglePvp:()=>NET.role==='host'&&toggleVillagePvp(NET.localId),
   testHit:(id)=>NET.role==='host'&&villageStrike(id),get soloPreview(){return soloPreview},get sheepCount(){return NPCS.filter(a=>a.kind==='sheep').length},get pigCount(){return NPCS.filter(a=>a.kind==='pig').length},get position(){return {x:my.x,y:my.y}},get scene(){return root},get debug(){return {...PERF,routeLength:route.length,routeIndex,coords:{...my},nearDoor:closestDoor()?.id||null,doorLatch,depthOrder:lastDepthOrder.slice(),cachedHouses:houseLayers.size,pendingAutoRoom}},blocked:blockedVillage,route:(x,y)=>findVillagePath(my,ground(x,y)),go:(x,y)=>opened&&startVillageTravel(x,y),visit:(id)=>{const b=buildings.find(x=>x.id===id);return opened&&!!b&&startVillageTravel(doorPoint(b).x,doorPoint(b).y,b.id)},testMove:(x,y)=>{if(!new URLSearchParams(location.search).has('village-test')||!opened)return false;const p=ground(x,y);if(blockedVillage(p.x,p.y))return false;my.x=p.x;my.y=p.y;return true}}};
 window.NS109_SPARTA={appearance:decorate,owned:spartaOwned,equipped:spartaEquipped,claim:spartaClaim};
 // Real engine preview: preserve the current selected character and input.
 if(new URLSearchParams(location.search).get('village-test')==='1'){
  const launch=()=>{
   const ok=showVillage();
   window.__VILLAGE_PREVIEW_STATUS={open:ok,buildings:buildings.length,sheep:NPCS.filter(a=>a.kind==='sheep').length,pigs:NPCS.filter(a=>a.kind==='pig').length,authenticHero:typeof drawVillageHero==='function'};
   if(ok&&!$('return')){
    const link=document.createElement('a');link.id='return';link.href='./';link.textContent=tr('← FULL GAME','← IGRA');
    link.style.cssText='position:absolute;z-index:3;right:9px;bottom:calc(78px + env(safe-area-inset-bottom));padding:8px;border-radius:9px;background:#123832;border:1px solid #9fc3ad;color:#f6e4b8;text-decoration:none;font:bold 11px system-ui';
    root.append(link);
   }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',launch,{once:true});else launch();
 }

})();
