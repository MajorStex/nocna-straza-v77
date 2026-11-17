/* Workshop UI and small host-authoritative majority votes. No separate network connection. */
(function(){
'use strict';
if(window.NS178_SOCIAL)return;
const $=id=>document.getElementById(id),W=()=>window.NS177_WORKSHOP,N=()=>window.__NS110_BRIDGE?.NET,V=()=>window.NS159_VOICE;
let panel=null,anchor=null,prev=new Map(),notice='',noticeUntil=0,room='',lastUi=0,vote=null,serial=0,remoteVote=null,previewAudio=null,previewUrl='',previewUntil=0;
const now=()=>performance.now();
function reset(){debugClose();prev.clear();vote=remoteVote=null;notice='';noticeUntil=0;room='';lastUi=0;hide();stopPreview();if($('ns178Notice'))$('ns178Notice').hidden=true}
function hide(){if(panel)panel.hidden=true}
function button(label,fn){let b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b}
function mount(parent,onlyInvite=false){if(!parent||parent.querySelector('.ns178Invite'))return;const wrap=document.createElement('span');wrap.className='ns178Quick';wrap.style.cssText='display:inline-flex;gap:4px;flex-wrap:wrap;align-items:center';parent.append(wrap);parent=wrap;
 const b=button('＋ Invite',()=>{if(!W()?.active){W()?.open();if(!W()?.active)return}show(b,'invite')});b.className='ns178Invite';parent.append(b);if(onlyInvite){setup();return}
 const p=button('👥 1/6',()=>show(p,'players'));p.className='ns178Players';parent.append(p);
 const v=button('⚑ Vote',()=>show(v,'vote'));v.className='ns178Vote';parent.append(v);
 if(debugAllowed())parent.append(button('⚙ Diag',debugOpen));
 setup();tick(true)
}
// V179: opt-in, read-only device diagnostics. Never include room code, tickets,
// identity, microphone recordings, or raw network messages. This is not authentication.
const debugOptIn=new URLSearchParams(location.search).get('diagnostics')==='1';
function debugAllowed(){return debugOptIn&&(!N()?.role||N()?.role==='host')}
function debugReport(){
 const arena=window.NS140_ARENA?.stabilityDiagnostics;
 const active=arena&&arena.phase!=='idle';
 const d=W()?.diagnostics, classic=window.__NS112_MP_DIAG?.(), motion=window.__NS132_MP_DIAG?.();
 const voice=V();
 const num=x=>Number.isFinite(x)?Math.round(x):null;
 return {mode:active?'Nova zona':W()?.active?'Radionica':'Classic / Village',
  phase:active?arena.phase:N()?.phase||'offline',
  fps:active?num(arena.fps):num(classic?.fps),
  rttMs:active?num(arena.rttMs):num(classic?.hostPingMs),
  connected:active?arena.connected:(W()?.active?members().filter(p=>p.inside).length:(N()?.role==='host'?1+[...N().clients.values()].filter(c=>c.open).length:null)),
  snapshots:active?arena.snapshots:null, avgSnapshotChars:active?arena.avgSnapshotChars:null,
  snapshotAgeMs:active?arena.snapshotAgeMs:null, reconnectAttempts:active?arena.reconnectAttempts:null,
  motionHz:active?null:num(motion?.motionHz),
  relayBufferBytes:active?null:num(motion?.relayBufferedBytes),
  sceneRevision:W()?.active?num(d?.rev):null, sceneRows:W()?.active?num(d?.rows):null,
  serverBuild:active?arena.serverBuild:null,error:active?arena.error:null,voiceConnected:!!voice?.connected};
}
let debugPanel=null,debugTimer=null;
function debugClose(){if(debugTimer!==null){clearInterval(debugTimer);debugTimer=null}if(debugPanel)debugPanel.hidden=true}
function debugOpen(){
 if(!debugAllowed())return false;
 if(!debugPanel){debugPanel=document.createElement('section');debugPanel.id='ns179Diagnostics';
  debugPanel.style.cssText='position:fixed;z-index:110000;top:calc(55px + env(safe-area-inset-top));right:9px;width:min(320px,calc(100vw - 18px));max-height:72dvh;overflow:auto;background:#142f28f5;color:#e6ddbf;border:1px solid #a18c62;border-radius:12px;padding:12px;font:12px system-ui;box-shadow:0 8px 28px #0008;touch-action:pan-y';
  const title=document.createElement('strong');title.textContent='V179 · Developer Diagnostics';
  const output=document.createElement('pre');output.id='ns179DiagText';output.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.45';
  const copyBtn=button('Kopiraj izveštaj',async()=>{try{await navigator.clipboard.writeText(JSON.stringify(debugReport(),null,2));copyBtn.textContent='Kopirano'}catch{copyBtn.textContent='Kopiranje nije dostupno'}});
  const closeBtn=button('Zatvori',debugClose);
  debugPanel.append(title,output,copyBtn,closeBtn);document.body.append(debugPanel);
 }
 debugPanel.hidden=false;
 const refresh=()=>{if(!debugAllowed()||document.hidden){debugClose();return}const r=debugReport();$('ns179DiagText').textContent=Object.entries(r).map(([k,v])=>k+': '+(v===null?'—':v)).join('\n')};
 if(debugTimer!==null)clearInterval(debugTimer);refresh();if(!debugPanel.hidden)debugTimer=setInterval(refresh,1000);
 return true;
}
window.NS179_DIAGNOSTICS={allowed:debugAllowed,open:debugOpen,close:debugClose};
document.addEventListener('visibilitychange',()=>{if(document.hidden)debugClose()});
function setup(){if(panel)return;panel=document.createElement('section');panel.id='ns178Panel';panel.hidden=true;panel.innerHTML='<header><strong id="ns178Title">RADIONICA</strong><button id="ns178Close" type="button">✕</button></header><div id="ns178Body"></div>';document.body.append(panel);$('ns178Close').onclick=hide;
 const note=document.createElement('div');note.id='ns178Notice';note.hidden=true;note.setAttribute('role','status');document.body.append(note);
 const st=document.createElement('style');st.textContent='#ns178Panel[hidden],#ns178Notice[hidden]{display:none!important}#ns178Panel{position:fixed;z-index:100090;right:9px;top:calc(52px + env(safe-area-inset-top));width:min(330px,calc(100vw - 18px));max-height:72dvh;overflow:auto;padding:10px;background:#1a302c;border:1px solid #a18c62;border-radius:12px;color:#e9ddbe;font:12px system-ui;box-shadow:0 10px 28px #071310b5}#ns178Panel header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;color:#eccb91}#ns178Panel button,#ns178Panel input{min-height:37px;padding:7px 9px;border:1px solid #698576;border-radius:8px;background:#29453b;color:#f4e6c6;font:600 12px system-ui;max-width:100%}#ns178Panel input{width:100%;margin:5px 0}#ns178Panel button:disabled{opacity:.5}#ns178Panel p{margin:7px 0;line-height:1.4}#ns178Panel .ns178Row{display:flex;gap:6px;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #475f51}#ns178Panel .ns178Row span:first-child{overflow-wrap:anywhere}#ns178Notice{position:fixed;z-index:100089;left:50%;top:calc(92px + env(safe-area-inset-top));transform:translateX(-50%);max-width:90%;padding:6px 12px;background:#17372ee8;color:#f8dfab;border:1px solid #a68e61;border-radius:8px;font:700 11px system-ui;pointer-events:none;text-align:center}#ns177HostBar .ns178Invite,#ns177HostBar .ns178Players,#ns177HostBar .ns178Vote{min-height:32px;padding:4px 6px;font-size:11px}';document.head.append(st)
}
function members(){return W()?.members?.()||[]}
function link(code=N()?.code){if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code||''))return '';return location.origin+location.pathname+'?join='+encodeURIComponent(code)+'&workshop=1'}
function feedback(s){notice=s;noticeUntil=now()+3800;const el=$('ns178Notice');if(el){el.textContent=s;el.hidden=false}}
function show(b,kind){setup();anchor=kind;panel.dataset.sig='';panel.hidden=false;render()}
async function copy(value,el){try{await navigator.clipboard.writeText(value);feedback('Kopirano.')}catch{el?.focus();el?.select();feedback('Označen link/kod · kopiraj ručno.')}}
function micText(id){const v=V();if(!v?.connected)return 'Glas nedostupan';const m=v.badgeState(id);return m===2?'🔊 Govori':m===1?'🎙 Uključen':'🔇 Utišan'}
function render(){if(!panel||panel.hidden)return;const b=$('ns178Body');b.replaceChildren();$('ns178Title').textContent=anchor==='invite'?'POZOVI U RADIONICU':anchor==='players'?'IGRAČI U SOBI':'GLASANJE';
 if(anchor==='invite'){const code=N()?.code,url=link(code);if(W()?.mode==='solo'){b.append(button('🌐 Pokreni online sobu',()=>{hide();W().promote()}));b.append(document.createTextNode(' Tvoja slobodna scena se zadržava.'));const input=document.createElement('input');input.placeholder='Šest znakova koda sobe';input.maxLength=6;input.setAttribute('aria-label','Unesi kod sobe');b.append(input,button('Uđi preko koda',()=>{const code=input.value.trim().toUpperCase();if(!W().joinCode(code))feedback('Unesi ispravan kod od 6 znakova.')}));return}
 if(!url){b.textContent='Čekam kod sobe.';return}const k=document.createElement('input');k.readOnly=true;k.value=code;k.setAttribute('aria-label','Kod sobe');const u=document.createElement('input');u.readOnly=true;u.value=url;u.setAttribute('aria-label','Link za radionicu');b.append(k,button('Kopiraj kod',()=>copy(code,k)),u,button('Kopiraj link',()=>copy(url,u)),button('Podeli link',async()=>{try{if(navigator.share)await navigator.share({title:'Noćna Straža – radionica',text:'Uđi kod nas na poligon!',url});else await copy(url,u)}catch(e){if(e?.name!=='AbortError')await copy(url,u)}}));const tip=document.createElement('p');tip.textContent='Link otvara istu sobu i pokušava direktan ulazak u radionicu. Zaključana soba i prijava i dalje važe.';b.append(tip);if(N()?.role==='host'){const bridge=window.__NS110_BRIDGE,ids=new Set((bridge.currentLobbyRoster?.()||[]).map(p=>p.friendId));for(const [id,f] of Object.entries(bridge.SOCIAL?.db?.friends||{}).slice(0,50)){if(ids.has(id))continue;const row=document.createElement('div');row.className='ns178Row';const name=document.createElement('span');name.textContent=String(f.name||id).slice(0,30);const btn=button(bridge.SOCIAL?.conns?.get(id)?.open?'Pozovi':'Pozovi offline',()=>{if(bridge.NS96_INVITES?.invite(id)){btn.disabled=true;btn.textContent='Poslato / čeka'}else feedback('Poziv nije poslat. Proveri sobu. ')});btn.disabled=!!bridge.NS96_INVITES?.pending(id);row.append(name,btn);b.append(row)}}return}
 if(anchor==='players'){for(const p of members()){const r=document.createElement('div');r.className='ns178Row';const name=document.createElement('span');name.textContent=p.name+(p.id===N()?.localId?' · ti':'')+(p.host?' · host':'');const right=document.createElement('span');right.textContent=(p.inside?'⚒ Radionica':'🏠 Village')+' · '+micText(p.id);r.append(name,right);b.append(r)}return}
 const st=remoteVote|| (vote?{...describe(vote),until:vote.until}:null);if(st){const p=document.createElement('p');p.textContent=st.kind==='village'?'Povratak u Village':st.kind==='resume'?'Nastavak poligona':'Pauza poligona';const n=document.createElement('p');n.textContent=st.yes+' / '+st.need+' glasova ZA · '+Math.max(0,Math.ceil((st.until-now())/1000))+' s';b.append(p,n,button('ZA',()=>W().vote('yes')),button('PROTIV',()=>W().vote('no')))}else{b.append(button('Glasaj za pauzu / nastavak',()=>W().vote('pause')),button('Glasaj za Village',()=>W().vote('village')));const p=document.createElement('p');p.textContent='Potrebna je većina prisutnih u radionici. Sam možeš da se vratiš u Village bez glasanja.';b.append(p)}
}
function tick(force=false){if(!W()?.active){if(room)reset();return}setup();const t=now();if(!force&&t-lastUi<500)return;lastUi=t;const code=N()?.code||'solo';if(code!==room){prev.clear();room=code}const list=members();const current=new Map(list.filter(p=>p.inside).map(p=>[p.id,p.name]));if(prev.size){for(const [id,name] of current)if(!prev.has(id)&&id!==N()?.localId)feedback(name+' has joined the game');for(const [id,name] of prev)if(!current.has(id)&&id!==N()?.localId)feedback(name+' has left the game')}prev=current;
 for(const p of document.querySelectorAll('.ns178Players'))p.textContent='👥 '+current.size+'/6';
 for(const p of document.querySelectorAll('.ns178Vote'))p.textContent=(vote||remoteVote)?'⚑ Glasanje!':'⚑ Vote';
 if(noticeUntil<t&&$('ns178Notice'))$('ns178Notice').hidden=true;if(!panel.hidden&&anchor!=='invite'){const st=remoteVote|| (vote?{...describe(vote),until:vote.until}:null);const sig=JSON.stringify([anchor==='players'?list.map(p=>[p.id,p.inside,micText(p.id)]):st?[st.id,st.yes,st.need,Math.ceil((st.until-now())/1000)]:null]);if(panel.dataset.sig!==sig){panel.dataset.sig=sig;render()}}
}
function describe(v){return v?{id:v.id,kind:v.kind,yes:[...v.ballots.values()].filter(x=>x==='yes').length,need:Math.floor(v.ids.length/2)+1,left:Math.max(0,v.until-now())}:null}
function hostVote(action,id,ids,paused){if(!ids.includes(id))return false;if(action==='pause'||action==='village'){if(vote||!ids.length)return false;vote={id:++serial,kind:action==='pause'?(paused?'resume':'pause'):'village',ids:ids.slice(),ballots:new Map([[id,'yes']]),until:now()+15000};return true}
 if(!vote||!vote.ids.includes(id)||!['yes','no'].includes(action)||vote.ballots.has(id))return false;vote.ballots.set(id,action);return true}
function hostPoll(ids){if(!vote)return null;const v=vote;if(v.ids.length!==ids.length||v.ids.some(id=>!ids.includes(id))){vote=null;return {failed:true}}const d=describe(v);if(d.yes>=d.need){vote=null;return {kind:v.kind}}if(now()>=v.until||[...v.ballots.values()].filter(x=>x==='no').length>v.ids.length-d.need){vote=null;return {failed:true}}return null}
function receiveVote(raw){remoteVote=raw&&['pause','resume','village'].includes(raw.kind)&&Number.isFinite(raw.left)?{...raw,until:now()+Math.max(0,Math.min(15000,raw.left))}:null}
function stopPreview(){if(previewAudio){try{previewAudio.pause()}catch{}previewAudio=null}if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=''}}
function cleanClip(m){if(!m||!/^audio\/(?:webm|ogg|mp4)(?:;codecs=opus)?$/i.test(m.mime)||typeof m.data!=='string'||m.data.length<8||m.data.length>44000||!/^[A-Za-z0-9+/]+={0,2}$/.test(m.data))return null;return {mime:m.mime,data:m.data}}
async function shareClip(blob){if(!W()?.active||W()?.mode==='solo'||blob.size>33000)return false;const a=new Uint8Array(await blob.arrayBuffer());let str='';for(let i=0;i<a.length;i++)str+=String.fromCharCode(a[i]);const m=cleanClip({mime:blob.type,data:btoa(str)});return !!m&&W().preview(m)}
function playClip(m){const c=cleanClip(m);if(!c||document.hidden||now()<previewUntil)return false;try{stopPreview();const bytes=Uint8Array.from(atob(c.data),x=>x.charCodeAt(0));previewUrl=URL.createObjectURL(new Blob([bytes],{type:c.mime}));previewAudio=new Audio(previewUrl);previewAudio.volume=.20;previewAudio.onended=stopPreview;previewAudio.onerror=stopPreview;previewUntil=now()+6000;previewAudio.play().catch(stopPreview);return true}catch{stopPreview();return false}}
window.NS178_SOCIAL={mount,reset,tick,show,hide,feedback,link,hostVote,hostPoll,voteState:()=>describe(vote),receiveVote,cleanClip,shareClip,playClip};
})();