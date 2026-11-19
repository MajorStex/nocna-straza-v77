/* V172 Character Voice Studio. Local IndexedDB blobs, bounded WebAudio bark mixer.
 * Recording only on explicit user click; never uses the multiplayer microphone or network.
 * Short mono speech, Opus preferred with browser-supported fallback.
 */
(function(){
'use strict';
if(window.NS172_VOICES)return;
const EVENTS={
 spawn:{label:'Pojava / ulazak',hint:'Stigao sam!',cool:12,priority:4,chance:1},
 far:{label:'Dobacivanje izdaleka',hint:'Vidim te!',cool:16,priority:1,chance:.55},
 near:{label:'Protivnik je blizu',hint:'Priđi ako smeš!',cool:10,priority:3,chance:.72},
 attack:{label:'Napad / borbeni poklič',hint:'Za stražu!',cool:3.8,priority:5,chance:.42},
 hurt:{label:'Primljen udarac',hint:'Ah!',cool:4.5,priority:6,chance:.5},
 kill:{label:'Pobeda nad protivnikom',hint:'Još jedan!',cool:5,priority:6,chance:.8},
 death:{label:'Smrt / poraz',hint:'Gotovo je…',cool:30,priority:9,chance:1},
 wave:{label:'Novi talas / nivo',hint:'Spreman sam!',cool:12,priority:4,chance:1},
 idle:{label:'Mirovanje / usputna replika',hint:'Nešto se sprema.',cool:25,priority:0,chance:.2}
};
const MAX_MS=5000,MAX_BYTES=192000,VARIANTS=3,MAX_ACTIVE=2,MAX_CACHE=24;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const profileScope=()=>String(window.__NS110_BRIDGE?.getActiveAccount?.()?.id||'offline').replace(/[^a-z0-9_-]/gi,'').slice(0,40)||'offline';
const scope=()=>{const uid=window.NS82_CLOUD?.user;return uid?'u:'+uid+':'+profileScope():profileScope()};
function valid(id,event,slot){return /^[-a-z0-9]{1,50}$/i.test(id||'')&&Object.hasOwn(EVENTS,event)&&Number.isInteger(slot)&&slot>=0&&slot<VARIANTS}
const key=(owner,id,event,slot)=>owner+'|'+id+'|'+event+'|'+slot;
let dbp=null;
function db(){if(!dbp)dbp=new Promise((resolve,reject)=>{const req=indexedDB.open('ns172-character-voice-v1',1);
 req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains('clips')){const store=d.createObjectStore('clips',{keyPath:'key'});store.createIndex('character','character',{unique:false})}};
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Voice storage is blocked'));}).catch(e=>{dbp=null;throw e});return dbp}
async function tx(mode,fn){const d=await db();return new Promise((res,rej)=>{const tr=d.transaction('clips',mode);let value;try{const req=fn(tr.objectStore('clips'));if(req){req.onsuccess=()=>{value=req.result};req.onerror=()=>rej(req.error)}}catch(e){rej(e);return}tr.oncomplete=()=>res(value);tr.onerror=()=>rej(tr.error);tr.onabort=()=>rej(tr.error||Error('Aborted'))})}
async function rawList(id,owner=scope()){if(!id)return [];return (await tx('readonly',s=>s.index('character').getAll(owner+'|'+id))||[]).filter(x=>valid(id,x.event,x.slot)&&(x.deleted===true||x.blob instanceof Blob&&x.blob.size<=MAX_BYTES))}
async function list(id,owner=scope()){return (await rawList(id,owner)).filter(x=>!x.deleted)}
async function put(id,event,slot,blob,ms,owner=scope(),updated=Date.now()){
 if(!valid(id,event,slot)||!(blob instanceof Blob)||!blob.size||blob.size>MAX_BYTES||!/^audio\//i.test(blob.type))throw Error('Neispravan ili prevelik audio snimak');
 const k=key(owner,id,event,slot);await tx('readwrite',s=>s.put({key:k,character:owner+'|'+id,id,owner,event,slot,blob,ms:clamp(ms||0,0,MAX_MS),updated}));decoded.delete(k);return true;
}
async function remove(id,event,slot,owner=scope(),updated=Date.now()){if(!valid(id,event,slot))return false;const k=key(owner,id,event,slot);await tx('readwrite',s=>s.put({key:k,character:owner+'|'+id,id,owner,event,slot,deleted:true,updated}));decoded.delete(k);return true}
async function removeCharacter(id,owner=scope()){if(!valid(id,'attack',0)||owner!==scope())return false;const stamp=Date.now();for(const event of Object.keys(EVENTS))for(let slot=0;slot<VARIANTS;slot++)await remove(id,event,slot,owner,stamp);if(owner===scope()&&window.NS82_CLOUD?.online)await syncCharacter(id);return true}
// V227: lazy account backup and portable character package, never on the frame/network tick.
const syncJobs=new Map(),syncedOnce=new Set();
async function encodeClip(row){
 if(row.deleted)return {event:row.event,slot:row.slot,updated:row.updated,deleted:true};
 const bytes=new Uint8Array(await row.blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return {event:row.event,slot:row.slot,updated:row.updated,deleted:false,mime:row.blob.type,ms:row.ms,data:btoa(binary)};
}
function decodeClip(row){if(!valid('character',row.event,row.slot)||typeof row.data!=='string'||row.data.length>256000||!/^audio\//i.test(row.mime||''))throw Error('Neispravan snimak');const data=atob(row.data);if(!data.length||data.length>MAX_BYTES)throw Error('Neispravan snimak');return new Blob([Uint8Array.from(data,x=>x.charCodeAt(0))],{type:row.mime})}
function syncCharacter(id){
 const owner=scope(),profile=profileScope(),cloud=window.NS82_CLOUD,jobKey=owner+'|'+id;
 if(!valid(id,'attack',0))return Promise.resolve({cloud:false,clips:0});
 if(syncJobs.has(jobKey))return syncJobs.get(jobKey);
 const job=(async()=>{
  const check=()=>{if(scope()!==owner)throw Error('Promenjen nalog')};
  let local=await rawList(id,owner);check();
  // Old browser recordings are matched by the existing random character ID, not by display name.
  if(owner!==profile&&window.NS171_CREATOR?.listCharacters().some(c=>c.id===id)){
   const existing=new Set(local.map(r=>r.event+':'+r.slot));
   for(const r of await rawList(id,profile)){check();if(existing.has(r.event+':'+r.slot))continue;if(r.deleted)await remove(id,r.event,r.slot,owner,r.updated||0);else await put(id,r.event,r.slot,r.blob,r.ms,owner,r.updated||0)}
   local=await rawList(id,owner);check();
  }
  if(!cloud?.online)return {cloud:false,clips:local.filter(r=>!r.deleted).length};
  const remote=await cloud.characterVoiceRead(profile,id);check();
  const map=new Map(local.map(r=>[r.event+':'+r.slot,r])),writes=[];
  for(const r of remote){const k=r.event+':'+r.slot,here=map.get(k);if(!here||r.updated>=here.updated){if(!here||r.updated>here.updated||!!r.deleted!==!!here.deleted){if(r.deleted)await remove(id,r.event,r.slot,owner,r.updated);else await put(id,r.event,r.slot,decodeClip(r),r.ms,owner,r.updated);check()}map.delete(k)}}
  for(const r of map.values()){writes.push(await encodeClip(r));check()}
  if(writes.length)await cloud.characterVoiceWrite(profile,id,writes);check();
  syncedOnce.add(jobKey);return {cloud:true,clips:(await list(id,owner)).length};
 })().finally(()=>{if(syncJobs.get(jobKey)===job)syncJobs.delete(jobKey)});
 syncJobs.set(jobKey,job);return job;
}
async function exportClips(id){const owner=scope(),rows=await list(id,owner),out=[];for(const r of rows){out.push(await encodeClip(r));if(scope()!==owner)throw Error('Promenjen nalog')}return out}
let context=null,master=null,active=[],lastGlobal=-Infinity,epoch=0,bank=new Map(),decoded=new Map(),lastVariant=new Map(),voiceEnabled=true,volume=.78;
const clock=()=>performance.now()/1000;
function contextReady(){if(!context){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;context=new AC();master=context.createGain();master.gain.value=volume;const comp=context.createDynamicsCompressor();comp.threshold.value=-20;comp.ratio.value=3;master.connect(comp);comp.connect(context.destination)}if(context.state==='suspended')context.resume().catch(()=>{});return context}
function mixAt(distance,dx){const d=Math.max(0,Number(distance)||0);return {gain:d>700?0:Math.max(.07,1/(1+Math.pow(d/170,1.55))),pan:clamp((Number(dx)||0)/270,-.85,.85)}}
function stopVoice(v){try{v.source.stop()}catch{}try{v.source.disconnect();v.gain.disconnect();v.pan?.disconnect()}catch{}active=active.filter(a=>a!==v)}
function stopAll(){epoch++;pendingActors.clear();pending=0;for(const v of [...active])stopVoice(v);active=[];lastGlobal=-Infinity;bank.clear();lastVariant.clear()}
function silence(){epoch++;pendingActors.clear();pending=0;for(const v of [...active])stopVoice(v);active=[];lastGlobal=-Infinity}
const decoding=new Map();
async function decode(clip){let b=decoded.get(clip.key);if(b){decoded.delete(clip.key);decoded.set(clip.key,b);return b}if(decoding.has(clip.key))return decoding.get(clip.key);const ac=context;if(!ac)return null;const job=(async()=>{try{const buffer=await ac.decodeAudioData(await clip.blob.arrayBuffer());decoded.set(clip.key,buffer);while(decoded.size>MAX_CACHE)decoded.delete(decoded.keys().next().value);return buffer}catch{return null}})();decoding.set(clip.key,job);try{return await job}finally{if(decoding.get(clip.key)===job)decoding.delete(clip.key)}}
async function prepare(ids){const e=epoch,owner=scope();const unique=[...new Set(ids.filter(Boolean))];const rows=[];for(const id of unique){if(!syncedOnce.has(owner+'|'+id)&&window.NS82_CLOUD?.online){try{await syncCharacter(id)}catch{}}if(epoch!==e||scope()!==owner)return false;rows.push(await list(id,owner).catch(()=>[]))}if(epoch!==e)return false;for(let i=0;i<unique.length;i++){const events=new Map();for(const c of rows[i]){if(!events.has(c.event))events.set(c.event,[]);events.get(c.event).push(c)}bank.set(unique[i],events)}if(context){let warm=0;for(const map of bank.values())for(const event of ['attack','near','spawn','hurt']){const clip=map.get(event)?.[0];if(clip&&warm++<6)decode(clip).catch(()=>{})}}return true}
function setVolume(v){volume=clamp(Number(v)||0,0,1);if(master)master.gain.value=volume}
function setEnabled(v){voiceEnabled=!!v;if(!voiceEnabled)silence()}
function emitter(){return {times:Object.create(null),last:-Infinity}}
function candidate(state,id,event,distance,dx,now=clock(),random=Math.random){
 const rule=EVENTS[event],clips=bank.get(id)?.get(event);
 if(!voiceEnabled||!rule||!clips?.length||!state||distance>700||now-(state.times[event]??-Infinity)<rule.cool||(rule.priority<8&&now-state.last<1.9))return null;
 if(rule.priority<8&&random()>rule.chance)return null;
 return {state,id,event,distance,dx,now,priority:rule.priority,clips};
}
let pending=0,played=0,playedEvents=Object.create(null);const pendingActors=new Map();
function play(c){
 if(!c||!context||context.state==='closed')return false;
 const now=clock();const priority=c.priority;
 if(now-lastGlobal<(priority>=8?.35:1.15))return false;
 if(pendingActors.has(c.state))return false;
 const speaking=active.find(v=>v.actor===c.state);if(speaking){if(priority<8||speaking.priority>=priority)return false;stopVoice(speaking)}
 if(active.length+pending>=MAX_ACTIVE){
  const weak=active.filter(v=>v.priority<priority).sort((a,b)=>a.priority-b.priority||a.started-b.started)[0];
  if(!weak||priority<6)return false;stopVoice(weak);
 }
 const at=mixAt(c.distance,c.dx);if(!at.gain)return false;
 c.state.times[c.event]=c.now;c.state.last=c.now;lastGlobal=now;
 const k=c.id+'|'+c.event,prev=lastVariant.get(k),alternatives=c.clips.filter(x=>x.slot!==prev),pool=alternatives.length?alternatives:c.clips,clip=pool[Math.floor(Math.random()*pool.length)];lastVariant.set(k,clip.slot);
 const gen=epoch;pending++;pendingActors.set(c.state,gen);
 decode(clip).then(buffer=>{
  if(!buffer||gen!==epoch||!voiceEnabled||active.length>=MAX_ACTIVE)return;
  const src=context.createBufferSource(),gain=context.createGain(),pan=context.createStereoPanner?.();
  src.buffer=buffer;gain.gain.value=at.gain*.92;src.connect(gain);if(pan){pan.pan.value=at.pan;gain.connect(pan);pan.connect(master)}else gain.connect(master);
  const voice={source:src,gain,pan,priority,actor:c.state,started:clock()};active.push(voice);
  src.onended=()=>{active=active.filter(v=>v!==voice);try{src.disconnect();gain.disconnect();pan?.disconnect()}catch{}};
  src.start(0,0,Math.min(buffer.duration,MAX_MS/1000));played++;playedEvents[c.event]=(playedEvents[c.event]||0)+1;
 }).catch(()=>{}).finally(()=>{if(gen===epoch){pending=Math.max(0,pending-1);if(pendingActors.get(c.state)===gen)pendingActors.delete(c.state)}});return true;
}
function dispatch(candidates){const best=candidates.filter(Boolean).sort((a,b)=>b.priority-a.priority||a.distance-b.distance);for(const c of best)if(play(c))return true;return false}
let panel=null,host=null,bridge=null,recording=null,recToken=0,previewAudio=null,previewURL=null,renderToken=0,chosenEvent='attack',chosenSlot=0,notice='',busy=false;
function stopPreview(){if(previewAudio){previewAudio.pause();previewAudio.src='';previewAudio=null}if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null}}
function tell(message){notice=message;if(panel){const o=panel.querySelector('[data-voice-status]');if(o)o.textContent=notice}}
function tracks(stream){stream?.getTracks().forEach(t=>t.stop())}
function discard(){recToken++;const r=recording;recording=null;if(r){clearTimeout(r.timer);clearInterval(r.tick);try{if(r.rec.state!=='inactive')r.rec.stop()}catch{}tracks(r.stream)}busy=false;stopPreview()}
function unmount(){renderToken++;discard();panel=null;host=null;bridge=null}
function preferredMime(){for(const m of ['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4','audio/webm'])if(window.MediaRecorder?.isTypeSupported?.(m))return m;return ''}
async function startRecord(){
 if(recording||busy||!bridge)return;
 const c=bridge.get();if(!c.id){tell('Prvo sačuvaj karakter, zatim snimi glas.');return}
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){tell('Ovaj pregledač ne podržava snimanje. Otvori HTTPS link u Chrome-u.');return}
 stopPreview();busy=true;const token=++recToken,owner=scope(),id=c.id,event=chosenEvent,slot=chosenSlot;let stream;
 tell('Dozvoli mikrofon za kratko snimanje.');
 try{
  stream=window.NS159_VOICE?.cloneMicForRecording?.()||await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  if(token!==recToken||!panel||scope()!==owner){tracks(stream);return}
  const type=preferredMime(),opts={audioBitsPerSecond:32000};if(type)opts.mimeType=type;
  let rec;try{rec=new MediaRecorder(stream,opts)}catch{rec=new MediaRecorder(stream,type?{mimeType:type}:{})}
  const parts=[],r={rec,stream,token,id,event,slot,owner,started:performance.now(),timer:0,tick:0};recording=r;busy=false;
  rec.ondataavailable=e=>{if(e.data?.size)parts.push(e.data)};
  rec.onerror=()=>{tracks(stream);if(recording===r){discard();tell('Greška mikrofona. Pokušaj ponovo.');refresh()}};
  rec.onstop=async()=>{clearTimeout(r.timer);clearInterval(r.tick);tracks(stream);if(recording===r)recording=null;if(token!==recToken)return;busy=true;const duration=performance.now()-r.started;const mime=rec.mimeType||parts[0]?.type||type||'audio/webm';const blob=new Blob(parts,{type:mime});
   try{if(duration<180)throw Error('Snimak je prekratak.');await put(id,event,slot,blob,duration,owner);if(token===recToken)tell('Snimak sačuvan uz karakter. '+Math.round(blob.size/1024)+' KB.')}catch(e){if(token===recToken)tell(String(e.message||e))}finally{if(token===recToken){busy=false;refresh()}}
  };
  rec.start();r.timer=setTimeout(()=>stopRecord(),MAX_MS);r.tick=setInterval(()=>{if(recording===r)tell('🔴 Snima se '+Math.min(5,(performance.now()-r.started)/1000).toFixed(1)+' / 5 s')},180);tell('🔴 Snima se — najviše 5 sekundi.');refresh();
 }catch(e){tracks(stream);if(token===recToken){busy=false;recording=null;tell('Mikrofon nije dostupan: '+(e.name==='NotAllowedError'?'dozvola nije odobrena':e.message||e.name||'greška'));refresh()}}
}
function stopRecord(){const r=recording;if(!r)return;clearTimeout(r.timer);clearInterval(r.tick);try{if(r.rec.state!=='inactive')r.rec.stop()}catch{discard();tell('Snimanje nije završeno.');refresh()}tracks(r.stream)}
async function listen(slot){const c=bridge?.get();if(!c?.id||recording||busy)return;const target=panel;try{const rows=await list(c.id);const clip=rows.find(x=>x.event===chosenEvent&&x.slot===slot);if(!clip||target!==panel)return;stopPreview();previewURL=URL.createObjectURL(clip.blob);previewAudio=new Audio(previewURL);previewAudio.volume=volume;previewAudio.onended=stopPreview;await previewAudio.play();tell('Preslušavanje snimka.');if(panel===target&&panel?.querySelector('[data-voice-share]')?.checked){const ok=await window.NS178_SOCIAL?.shareClip(clip.blob);if(!ok)tell('Preslušavanje lokalno · deljenje nije dostupno ili je snimak prevelik.')}}catch(e){tell('Ne mogu da pustim snimak: '+String(e.message||e))}}
async function refresh(){
 if(!panel||!bridge)return;const p=panel,t=++renderToken,c=bridge.get();const rows=await list(c.id).catch(()=>[]);if(!panel||p!==panel||t!==renderToken)return;
 const sel=p.querySelector('[data-voice-event]');if(sel)sel.value=chosenEvent;
 const slot=p.querySelector('[data-voice-slot]');if(slot)slot.value=String(chosenSlot);
 const rule=EVENTS[chosenEvent];p.querySelector('[data-voice-hint]').textContent='Primer: „'+rule.hint+'“ · razmak najmanje '+rule.cool+' s';
 p.querySelector('[data-voice-count]').textContent=rows.length+' / '+Object.keys(EVENTS).length*VARIANTS+' snimaka na ovom liku';
 p.querySelector('[data-voice-status]').textContent=notice||(c.id?'Izaberi situaciju i varijantu, pa snimi.':'Sačuvaj karakter pre snimanja.');
 const lines=p.querySelector('[data-voice-list]');lines.textContent='';
 for(let i=0;i<VARIANTS;i++){const clip=rows.find(x=>x.event===chosenEvent&&x.slot===i),row=document.createElement('div');row.className='ccVoiceRow';const txt=document.createElement('span');txt.textContent='Varijanta '+(i+1)+(clip?' · '+(clip.ms/1000).toFixed(1)+' s · '+Math.ceil(clip.blob.size/1024)+' KB':' · prazno');row.append(txt);
 for(const [action,caption] of [['listen','▶'],['delete','✕']]){const b=document.createElement('button');b.dataset.voiceAction=action;b.dataset.slot=String(i);b.textContent=caption;b.disabled=!clip||!!recording||busy;b.setAttribute('aria-label',action==='listen'?'Preslušaj varijantu '+(i+1):'Obriši varijantu '+(i+1));row.append(b)}lines.append(row)}
 p.querySelector('[data-voice-action=record]').disabled=!c.id||!!recording||busy;p.querySelector('[data-voice-action=stop]').disabled=!recording;p.querySelector('[data-voice-action=savechar]').hidden=!!c.id;
 p.querySelector('[data-voice-event]').disabled=!!recording||busy;p.querySelector('[data-voice-slot]').disabled=!!recording||busy;
}
function mount(element,api){
 unmount();host=element;bridge=api;notice='';chosenEvent='attack';chosenSlot=0;
 const p=document.createElement('div');p.className='ccVoiceStudio';p.innerHTML='<h3>VOICE STUDIO · GLAS KARAKTERA</h3><p>Glas je vezan za stalni ID karaktera. Snimci se čuvaju lokalno; dugme Sačuvaj u editoru sinhronizuje ih sa prijavljenim nalogom. Live mikrofon ostaje u svom režimu. Snima se samo tvoj glas, ne glasovi ekipe.</p><div class="ccGrid"><label>Situacija<select data-voice-event></select></label><label>Varijanta<select data-voice-slot><option value="0">1</option><option value="1">2</option><option value="2">3</option></select></label></div><p data-voice-hint></p><div class="ccRow"><button data-voice-action="savechar">Sačuvaj karakter</button><button data-voice-action="record">🔴 Snimi (5 s)</button><button data-voice-action="stop" disabled>■ Zaustavi</button></div><div class="ccNumbers" data-voice-status aria-live="polite"></div><p data-voice-count></p><div data-voice-list></div><div class="ccGrid"><label>Jačina glasova<input data-voice-volume type="range" min="0" max="100" value="78"></label><label>Glasovi tokom testa<select data-voice-enabled><option value="on">Uključeni</option><option value="off">Isključeni</option></select></label></div><p>Najviše dve replike istovremeno; udaljeni likovi su tiši. Smrt i povreda imaju prednost nad usputnim govorom.</p>';
 if(window.NS177_WORKSHOP?.active&&window.NS177_WORKSHOP.mode!=='solo'){const share=document.createElement('label');share.className='ccLabCheck';const check=document.createElement('input');check.type='checkbox';check.dataset.voiceShare='1';share.append(check,document.createTextNode(' Pusti preslušavanje i ekipi (tiho)'));p.append(share)}const select=p.querySelector('[data-voice-event]');for(const [k,v] of Object.entries(EVENTS)){const o=document.createElement('option');o.value=k;o.textContent=v.label;select.append(o)}
 p.querySelector('[data-voice-volume]').value=Math.round(volume*100);p.querySelector('[data-voice-enabled]').value=voiceEnabled?'on':'off';
 p.addEventListener('change',e=>{if(e.target.matches('[data-voice-event]')){chosenEvent=e.target.value;chosenSlot=0;stopPreview();notice='';refresh()}if(e.target.matches('[data-voice-slot]'))chosenSlot=Number(e.target.value);if(e.target.matches('[data-voice-enabled]'))setEnabled(e.target.value==='on')});
 p.addEventListener('input',e=>{if(e.target.matches('[data-voice-volume]'))setVolume(Number(e.target.value)/100)});
 p.addEventListener('click',async e=>{const b=e.target.closest('[data-voice-action]');if(!b)return;const a=b.dataset.voiceAction;if(a==='savechar'){api.save();return}if(a==='record')startRecord();if(a==='stop')stopRecord();if(a==='listen')listen(Number(b.dataset.slot));if(a==='delete'&&!recording&&!busy){const id=api.get().id;try{await remove(id,chosenEvent,Number(b.dataset.slot));tell('Snimak obrisan.');refresh()}catch(e){tell(String(e.message||e))}}});
 panel=p;element.append(p);refresh();
 if(!document.getElementById('ns172VoiceStyle')){const s=document.createElement('style');s.id='ns172VoiceStyle';s.textContent='#ns171Creator .ccVoiceRow{display:grid;grid-template-columns:minmax(0,1fr) 44px 44px;gap:6px;align-items:center;margin:6px 0;padding:5px;border:1px solid #52685d;border-radius:9px;font-size:12px}#ns171Creator .ccVoiceStudio button[hidden]{display:none!important}#ns171Creator .ccVoiceStudio button:disabled{opacity:.45}';document.head.append(s)}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){discard();silence();if(panel){tell('Snimanje je prekinuto jer je igra sklonjena.');refresh()}}});
window.NS172_VOICES={EVENTS,MAX_MS,MAX_ACTIVE,MAX_BYTES,VARIANTS,list,put,remove,removeCharacter,syncCharacter,exportClips,refresh,mount,unmount,prepare,unlock:contextReady,stopAll,silence,emitter,candidate,dispatch,mixAt,setEnabled,setVolume,test:{get played(){return played},get playedEvents(){return {...playedEvents}},get active(){return active.length},get pending(){return pending},get recording(){return !!recording},get busy(){return busy},get cacheSize(){return decoded.size},get scope(){return scope()},get bankSize(){return bank.size},get mime(){return preferredMime()}}};
})();