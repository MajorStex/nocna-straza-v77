/* Noćna Straža — development handoff, lazy-loaded only on request. */
(function(){
'use strict';
if(window.NS_DEVLOG)return;
let panel=null,raw='',pending=null;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n};
function projectPage(text,query=''){
 const marker='<!-- HISTORY -->',i=text.indexOf(marker);
 if(!query.trim())return text;
 const term=query.trim().toLocaleLowerCase('sr'),sections=(i<0?text:text.slice(i+marker.length)).split(/(?=^### V\d+\b)/m);
 const hits=sections.filter(s=>s.toLocaleLowerCase('sr').includes(term));
 return hits.length?hits.join('\n'):'Nema rezultata / No matching versions.';
}
async function load(){if(raw)return raw;if(!pending)pending=fetch(new URL('./development-log.md',location.href),{cache:'no-cache',credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.text()}).then(t=>{if(!/^# NOĆNA STRAŽA/.test(t)||t.length>2000000)throw Error('Invalid log');raw=t;return raw}).finally(()=>pending=null);return pending}
function create(){
 const css=el('style');css.textContent='#nsDevLog{width:min(900px,94vw);max-height:92dvh;margin:auto;background:#12212a;color:#f3eddf;border:1px solid #8eac9c;border-radius:12px;box-sizing:border-box;padding:12px;overflow:hidden;touch-action:pan-y;z-index:100000}#nsDevLog::backdrop{background:#000b}#nsDevLog [hidden]{display:none!important}#nsDevLog .nsDevActions{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:6px 0}#nsDevLog button{min-height:36px;padding:7px 10px}#nsDevLog input{width:100%;min-height:38px;touch-action:auto}#nsDevLog pre{white-space:pre-wrap;overflow-wrap:anywhere;user-select:text;touch-action:pan-y;overscroll-behavior:contain;overflow:auto;height:min(54dvh,560px);margin:6px 0;padding:8px;background:#0b151c;border-radius:8px;font:13px/1.5 system-ui}#nsDevLog h2{font-size:16px;margin:0}#nsDevLog p{font:12px/1.4 system-ui;margin:4px 0}@media(max-height:450px){#nsDevLog{padding:7px;max-height:98dvh}#nsDevLog pre{height:42dvh}#nsDevLog button{min-height:30px;padding:5px}#nsDevLog input{min-height:30px}}';document.head.append(css);
 panel=el('dialog');panel.id='nsDevLog';panel.setAttribute('aria-labelledby','nsDevTitle');const title=el('h2','DEVELOPMENT LOG / RAZVOJ IGRE');title.id='nsDevTitle';panel.append(title,el('p','Jedan fajl za nastavak projekta na drugom nalogu. / One file for project handoff.'));
 const bar=el('div','','nsDevActions'),copy=el('button','COPY ALL / KOPIRAJ SVE'),save=el('button','DOWNLOAD .MD'),brief=el('button','BRZI PRESEK'),full=el('button','SVE VERZIJE'),close=el('button','✕');for(const b of [copy,save,brief,full,close]){b.type='button';bar.append(b)}panel.append(bar);
 const search=el('input');search.type='search';search.placeholder='V199, boss, revive, MP…';search.setAttribute('aria-label','Search versions / Pretraži verzije');panel.append(search);
 const msg=el('p','Učitavanje…');msg.setAttribute('aria-live','polite');const pre=el('pre');pre.tabIndex=0;panel.append(msg,pre);
 let short=false;const render=()=>{if(!raw)return;pre.textContent=search.value.trim()?projectPage(raw,search.value):short?raw.split('<!-- HISTORY -->')[0]:raw;pre.scrollTop=0;msg.textContent='Prikaz '+(search.value.trim()?'rezultata':short?'preseka':'celog dnevnika')+' · '+raw.length.toLocaleString()+' znakova; izvoz uvek sadrži sve.'};
 search.oninput=render;brief.onclick=()=>{short=true;search.value='';render()};full.onclick=()=>{short=false;search.value='';render()};close.onclick=()=>panel.close();panel.addEventListener('cancel',()=>{});
 copy.onclick=async()=>{if(!raw)return;try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(raw);else throw Error('fallback');msg.textContent='Kopirano sve / All copied.'}catch{const ta=el('textarea');ta.value=raw;panel.append(ta);ta.select();let ok=false;try{ok=document.execCommand('copy')}catch{}ta.remove();msg.textContent=ok?'Kopirano sve / All copied.':'Kopiranje nije dozvoljeno; koristi DOWNLOAD .MD.'}};
 save.onclick=()=>{if(!raw)return;const version=raw.match(/current-release:\s*(\d+)/)?.[1]||'history';const url=URL.createObjectURL(new Blob([raw],{type:'text/markdown;charset=utf-8'}));const a=el('a');a.href=url;a.download='Nocna_Straza_Development_V'+version+'.md';panel.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);msg.textContent='Jedan kompletan fajl / One complete file.'};
 panel.addEventListener('close',()=>{search.value='';short=false;pre.textContent=''});document.body.append(panel);
 return {render,msg,controls:[copy,save,brief,full]};
}
let view=null;
async function open(){if(!panel)view=create();if(!panel.open)panel.showModal();for(const b of view.controls)b.disabled=true;view.msg.textContent='Učitavanje…';try{await load();if(!panel.open)return;for(const b of view.controls)b.disabled=false;view.render();const build=document.querySelector('meta[name="ns-release"]')?.content,logged=raw.match(/current-release:\s*(\d+)/)?.[1];if(build&&logged&&build!==logged)view.msg.textContent='Upozorenje: build V'+build+' i dnevnik V'+logged+' se razlikuju.'}catch(e){view.msg.textContent='Dnevnik nije dostupan. Zatvori i pokušaj ponovo. / Log unavailable.'}}
window.NS_DEVLOG={open,projectPage};
})();
