/* Noćna Straža V165 · Classic lobby/Village/legacy co-op voice coordinator.
   Per-seat secret received over the existing authenticated game connection.
   Opus-independent small codec in V159 engine on its OWN WebSocket/DO.
   No PCM on the movement, room state or lobby transport. */
(()=>{
'use strict';
if(window.NS165_CLASSIC_VOICE)return;
const API='https://nocna-straza-relay.stefanstevic1996.workers.dev';
const SEAT=/^p[1-6]$/,ROOM=/^[A-HJ-NP-Z2-9]{6}$/,MATCH=/^[a-f0-9]{24}$/,TOKEN=/^[a-f0-9]{48}$/;
let config=null,sessionCode='',mode='toggle',suspended=false,busy=false,hostContext=null,enginePromise=null,generation=0;
let status='Nije povezan',ticker=0;
const ownVoice=()=>!!config&&window.NS159_VOICE?.classic===true&&
 window.NS159_VOICE?.activeMatch===config.match;
const $=id=>document.getElementById(id);
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function engine(){
 if(window.NS159_VOICE)return Promise.resolve(window.NS159_VOICE);
 if(enginePromise)return enginePromise;
 enginePromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='./v159-voice.js?v=166';script.async=true;
  script.addEventListener('load',()=>window.NS159_VOICE?resolve(window.NS159_VOICE):reject(Error('Voice engine unavailable')),{once:true});
  script.addEventListener('error',()=>reject(Error('Voice script unavailable')),{once:true});
  document.head.append(script);
 }).catch(err=>{enginePromise=null;throw err});
 return enginePromise;
}
function position(id){return hostContext?.position?.(id)||config?.position?.(id)||null}
function attach(){
 if(!config||suspended||document.hidden)return;
 const me=config;
 engine().then(voice=>{
  if(config!==me||suspended||document.hidden)return;
  voice.mount({match:me.match,ticket:me.ticket,id:me.id,classic:true,position});
  voice.setMode(mode);
  install();bind();refresh();
 }).catch(()=>{status='Glas nije dostupan; igra nastavlja normalno';refresh()});
}
function host({code,id,peers,sendTo,position:getPosition}={}){
 if(!ROOM.test(code||'')||!SEAT.test(id||'')||typeof sendTo!=='function')return false;
 if(hostContext?.code===code&&config?.host&&config.id===id){
  hostContext={code,id,peers,sendTo,position:getPosition};attach();syncAll();return true;
 }
 leave();const token=++generation;busy=true;sessionCode=code;
 hostContext={code,id,peers,sendTo,position:getPosition};
 status='Povezujem privatnu glasovnu sobu…';install();refresh();
 (async()=>{
  let data=null;
  for(let attempt=0;attempt<3;attempt++){
   if(generation!==token)return;
   try{
    const response=await fetch(API+'/classic-voice/create',{
     method:'POST',headers:{'content-type':'application/json'},
     body:JSON.stringify({code}),cache:'no-store',credentials:'omit'
    });
    const json=await response.json();
    if(response.ok&&json.ok===true&&MATCH.test(json.match)&&json.tickets&&
       Object.values(json.tickets).every(t=>TOKEN.test(t))) {data=json;break}
    if(response.status!==409||json.error!=='host_offline')break;
   }catch{}
   await delay((attempt+1)*450);
  }
  if(generation!==token)return;
  busy=false;
  if(!data){status='Glasovni server nije objavljen/povezan; klasična igra nastavlja bez glasa';refresh();return}
  config={match:data.match,ticket:data.tickets[id],tickets:data.tickets,host:true,id,code};
  if(!TOKEN.test(config.ticket)){status='Nije pronađen glasovni token';return}
  status='Glasovna soba spremna · odaberi Toggle ili PTT';attach();syncAll();refresh();
 })();
 return true;
}
function syncGuest(id,send){
 if(!config?.host||!SEAT.test(id||'')||id===config.id||!TOKEN.test(config.tickets[id]))return false;
 const packet={t:'ns165VoiceRoom',id,code:config.code,match:config.match,ticket:config.tickets[id]};
 try{
  if(typeof send==='function')return send(packet)!==false;
  return hostContext?.sendTo?.(id,packet)!==false;
 }catch{return false}
}
function syncAll(){
 if(!config?.host||!hostContext?.peers)return;
 for(const id of hostContext.peers())if(SEAT.test(id)&&id!==config.id)syncGuest(id);
}
function guest({code,id,match,ticket,position:getPosition}={}){
 if(!ROOM.test(code||'')||!SEAT.test(id||'')||!MATCH.test(match||'')||!TOKEN.test(ticket||''))return false;
 if(config?.host)return false;
 const same=config&&config.id===id&&config.match===match&&config.ticket===ticket;
 if(!same){leave();sessionCode=code;config={code,id,match,ticket,host:false,position:getPosition}}
 else config.position=getPosition;
 status='Povezujem glas sa drugarima…';install();attach();return true;
}
function receive(packet,{code,id,position:getPosition}={}){
 if(packet?.t!=='ns165VoiceRoom'||packet.code!==code||packet.id!==id)return false;
 return guest({code,id,match:packet.match,ticket:packet.ticket,position:getPosition});
}
function suspend(){
 suspended=true;
 if(ownVoice())try{window.NS159_VOICE?.stop()}catch{}
 refresh();
}
function resume(){suspended=false;if(config)attach();refresh()}
function leave(){
 generation++;busy=false;
 if(ownVoice())try{window.NS159_VOICE?.stop()}catch{}
 config=null;hostContext=null;sessionCode='';suspended=false;status='Nije povezan';
 refresh();
}
function toggleMode(){
 mode=mode==='toggle'?'ptt':'toggle';
 if(ownVoice()&&!suspended)window.NS159_VOICE?.setMode(mode);
 refresh();
}
function micOff(){if(ownVoice())window.NS159_VOICE?.disableMic();refresh()}
function bind(){
 const voice=window.NS159_VOICE;
 if(!voice)return;
 for(const node of document.querySelectorAll('.ns165Mic'))voice.bindControl(node);
}
function install(){
 if(!$('ns165VoiceStyle')){
  const st=document.createElement('style');st.id='ns165VoiceStyle';
  st.textContent='.ns165VoiceCard{display:grid;gap:6px;padding:10px;background:#193c32;border:1px solid #729d87;border-radius:10px;margin:10px 0;color:#e7edd8;font:12px system-ui}'+
   '.ns165VoiceCard strong{font-size:12px;color:#f9e5ad}.ns165VoiceCard button,.ns165VoiceVillageButton{min-height:38px;background:#285b48;color:#f4eccc;border:1px solid #98b79e;border-radius:8px;touch-action:none;user-select:none;-webkit-user-select:none;padding:7px;cursor:pointer}'+
   '.ns165VoiceCard small{font:11px/1.35 system-ui;color:#c9e0d2}.ns165VoiceCard .ns165VoiceActions{display:flex;gap:6px;flex-wrap:wrap}.ns165VoiceCard .ns165VoiceActions>*{flex:1;min-width:85px}'+
   '.ns165LobbySpeaker{display:inline-block;min-width:15px;margin-left:6px;font:11px system-ui;color:#9eaea1}.ns165LobbySpeaker.speaking{color:#b4ffad;text-shadow:0 0 6px #a7f18b}'+
   '#ns165VillagePopup{position:fixed;z-index:100085;right:10px;top:56px;width:min(290px,87vw);max-height:70dvh;overflow:auto;box-shadow:0 14px 30px #0009}'+
   '#ns165VillageVoice{min-height:32px;padding:5px 7px;font:700 10px system-ui}';
  document.head.append(st);
 }
 const create=(parent,id)=>{
  if(!parent||$(id))return;
  const card=document.createElement('div');card.id=id;card.className='ns165VoiceCard';
  const title=document.createElement('strong');title.textContent='🎙 GLASOVNI CHAT · KLASIČNI MP';
  const row=document.createElement('div');row.className='ns165VoiceActions';
  const modeBtn=document.createElement('button');modeBtn.type='button';modeBtn.className='ns165VoiceMode';
  modeBtn.onclick=toggleMode;
  const mic=document.createElement('button');mic.type='button';mic.className='ns165Mic';
  // The shared audio engine binds exactly one click/hold handler per button.
  const off=document.createElement('button');off.type='button';off.className='ns165Off';
  off.textContent='🔇 UGASI';off.onclick=micOff;
  const note=document.createElement('small');note.className='ns165VoiceNote';
  row.append(modeBtn,mic,off);card.append(title,row,note);
  parent.append(card);
 };
 create($('lobbyArea'),'ns165LobbyVoice');
 create($('pausePanel')?.querySelector('.modalBox'),'ns165PauseVoice');
 const villageTop=$('ns109Top');
 if(villageTop&&!$('ns165VillageVoice')){
  const button=document.createElement('button');button.id='ns165VillageVoice';button.type='button';
  button.className='ns165VoiceVillageButton';button.textContent='🎙 GLAS';
  button.onclick=()=>{
   const pop=$('ns165VillagePopup');if(!pop)return;
   pop.hidden=!pop.hidden;bind();refresh();
  };
  villageTop.append(button);
 }
 if(!$('ns165VillagePopup')){
  const pop=document.createElement('div');pop.id='ns165VillagePopup';pop.hidden=true;
  document.body.append(pop);create(pop,'ns165VillageVoiceCard');
 }
 bind();
 if(!ticker)ticker=setInterval(()=>{if(config)refresh();else if(ticker){clearInterval(ticker);ticker=0}},350);
}
function refresh(){
 const voice=window.NS159_VOICE;
 const live=ownVoice()&&!suspended&&voice?.connected;
 for(const card of document.querySelectorAll('.ns165VoiceCard')){
  const modeBtn=card.querySelector('.ns165VoiceMode'),mic=card.querySelector('.ns165Mic'),
   off=card.querySelector('.ns165Off'),note=card.querySelector('.ns165VoiceNote');
  modeBtn.textContent=mode==='toggle'?'🎙 REŽIM: TOGGLE · KLIK':'🎙 REŽIM: PTT · DRŽI';
  mic.textContent=mode==='toggle'?(voice?.microphoneOn?'🟢 MIC UKLJUČEN · UGASI':'🎙 UKLJUČI MIKROFON'):
   voice?.transmitting?'🟢 GOVORIŠ — PUSTI':'🎙 DRŽI ZA PRIČU (V)';
  mic.disabled=!live;off.disabled=!live||!voice?.microphoneOn;
  note.textContent=!config?status:suspended?'Glas za Novu Zonu je odvojen':!live?
   'Povezujem glas · igra radi i bez mikrofona':
   mode==='toggle'?'Klik uključi/isključi. Zvučnik se vidi iznad heroja.':
   'Drži dugme na telefonu ili V na PC-ju; puštanjem se utišava.';
 }
 const lobby=$('ns165LobbyVoice');
 if(lobby)lobby.hidden=!!($('lobbyArea')?.classList.contains('hidden')||!sessionCode);
 const menu=$('ns165PauseVoice');if(menu)menu.hidden=!config;
 const village=$('ns165VillageVoice');if(village)village.hidden=!config;
 const badge=$('ns165VillageVoice');if(badge)badge.textContent=voice?.transmitting?'🟢 GLAS':'🎙 GLAS';
 for(const el of document.querySelectorAll('[data-ns165-voice-seat]')){
  const state=live?voice?.badgeState?.(el.dataset.ns165VoiceSeat):0;
  el.textContent=state===2?'🔊':state===1?'🎙':'';
  el.classList.toggle('speaking',state===2);
 }
}
function decorateLobby(row,id){
 if(!row||!SEAT.test(id||''))return;
 let node=row.querySelector('[data-ns165-voice-seat]');
 if(!node){node=document.createElement('span');node.className='ns165LobbySpeaker';
  node.dataset.ns165VoiceSeat=id;node.title='Status glasovnog razgovora';row.append(node)}
}
function drawBadge(g,id,x,y){
 if(!config||suspended)return;
 const type=window.NS159_VOICE?.badgeState?.(id);
 if(!type)return;
 g.save();g.translate(x,y);
 g.fillStyle=type===2?'#267d4a':'#375c50';
 g.strokeStyle=type===2?'#b6ffc7':'#91aeb1';
 g.lineWidth=1.5;g.beginPath();g.rect(-9,-8,18,16);g.fill();g.stroke();
 g.fillStyle='#efffe6';g.beginPath();g.moveTo(-5,-2);g.lineTo(-2,-2);g.lineTo(1,-5);
 g.lineTo(1,5);g.lineTo(-2,2);g.lineTo(-5,2);g.closePath();g.fill();
 g.strokeStyle=type===2?'#efffc3':'#c2d7d2';g.beginPath();g.arc(1,0,4,-.85,.85);g.stroke();
 if(type===2){g.beginPath();g.arc(1,0,7,-.85,.85);g.stroke()}
 g.restore();
}
window.addEventListener('nsVoiceChanged',refresh);
window.addEventListener('ns159VoiceReady',()=>{bind();refresh()});
window.addEventListener('pagehide',()=>{if(ownVoice())window.NS159_VOICE?.disableMic()});
window.NS165_CLASSIC_VOICE={host,guest,receive,syncGuest,syncAll,suspend,resume,leave,install,refresh,decorateLobby,drawBadge,
 get active(){return ownVoice()&&!suspended},get room(){return sessionCode},get mode(){return mode},
 get status(){return status},get match(){return config?.match||''}};
})();
