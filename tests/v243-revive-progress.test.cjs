'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('public/index.html','utf8'),arena=fs.readFileSync('public/v140-net-mode.js','utf8');
let checks=0;
const ck=(ok,msg)=>{assert.ok(ok,msg);checks++};
const pick=(source,from,to)=>{const a=source.indexOf(from),b=source.indexOf(to,a+from.length);ck(a>=0&&b>a,'source section '+from);return source.slice(a,b)};
const grab=(s,p)=>s.includes(p);
const block=pick(html,'/* V243: keep the authoritative revive progress ABOVE the thumb','/* v3.8 - SOS');
ck(grab(block,'.reviveDock *{user-select:none!important;-webkit-user-select:none!important;-webkit-touch-callout:none!important}'),'Classic all labels nonselectable');
ck(grab(block,'.reviveProgress{')&&grab(block,'pointer-events:none'),'Classic progress is nonblocking');
ck(grab(block,'.reviveProgressRing'),'Classic progress ring');
ck(grab(html,'id="reviveProgress"')&&grab(html,'id="revivePct"'),'Classic progress separate nodes');
ck(html.indexOf('id="reviveProgress"')<html.indexOf('id="reviveBtn"'),'Classic progress sits ABOVE button in flex column');
ck(grab(html,'b.addEventListener(\'contextmenu\',e=>e.preventDefault())'),'Classic hold blocks long press context menu');
const arenaBlock=pick(arena,'// V243 thumb-safe shared revive HUD:','\'#ns152Hurt');
ck(grab(arenaBlock,'#ns243ReviveDock *{user-select:none!important;-webkit-user-select:none!important;-webkit-touch-callout:none!important}'),'New Zone text nonselectable');
ck(grab(arenaBlock,'#ns243ReviveProgress')&&grab(arenaBlock,'pointer-events:none'),'New Zone icon cannot steal finger');
ck(arena.indexOf('id="ns243ReviveProgress"')<arena.indexOf('id="ns190Revive"'),'New Zone progress ABOVE button');
ck(grab(arena,'e.pointerId!==arenaRevivePointer')&&grab(arena,'arenaRevivePointer=null'),'New Zone pointer ownership and release');
ck(grab(arena,'window.addEventListener(\'blur\',releaseArenaRevive)'),'Android background interrupts hold');
new vm.Script(arena);checks++;
const inline=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(m=>!/\bsrc=/.test(m[1]));
ck(inline.length===4,'Classic inline scripts retained');
for(const m of inline){new vm.Script(m[2]);checks++}
const cls=new Map();
const element=()=>({hidden:true,textContent:'',style:{props:{},setProperty(k,v){this.props[k]=v}},classList:{items:new Set(),add(k){this.items.add(k)},remove(k){this.items.delete(k)},toggle(k,value){if(value)this.items.add(k);else this.items.delete(k)}}});
const $=(id)=>{if(!cls.has(id))cls.set(id,element());return cls.get(id)};
const NET={role:'guest',phase:'playing',localId:'p2',round:1,conn:{open:false}};
const savior={id:'p2',dead:false},victim={id:'p1',dead:true,reviveCount:0};
const G={mode:'play',players:[savior,victim],reviveHeld:true,reviveRemoteProgress:{target:'p1',progress:1.75},reviveActive:{p2:{progress:2.1}}};
const classicSource=pick(html,'function updateReviveHUD(){','(function setupReviveTouch(){');
const classic=new Function('NET','G','$','reviveCandidate','multiplayerDisplayName','window','REVIVE_SECONDS','REVIVE_MAX','setReviveHeld','performance',
 'let ns106ReviveSentAt=100;'+classicSource+'return updateReviveHUD;')(
 NET,G,$,()=>victim,id=>id,{__gameLanguage:{value:'sr'}},3.5,2,()=>{}, {now:()=>100}
);
classic();
ck($('reviveProgress').hidden===false,'guest sees floating percentage while holding');
ck($('revivePct').textContent==='50%','guest uses host snapshot progress');
ck($('reviveProgress').style.props['--revive-arc']==='180deg','guest ring follows progress');
ck($('reviveBtn').classList.items.has('holding'),'guest sees pressed button');
NET.role='host';classic();
ck($('revivePct').textContent==='60%','host uses authoritative live progress');
G.reviveHeld=false;classic();
ck($('reviveProgress').hidden===true,'percent disappears on release');
ck($('revivePct').textContent==='0%','stale percentage reset after release');
NET.phase='lobby';classic();ck($('reviveDock').classList.items.has('hidden'),'badge hides after returning to lobby');
const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)};
const near={id:'p1',reviveProgress:37.5},messages=[];
const N={reviveHeld:'p1',reviveAt:0,reviveHudAt:-500,ws:{readyState:1,bufferedAmount:0,send(message){messages.push(JSON.parse(message))}},expedition:{rev:4}};
const newZone=pick(arena,'function releaseArenaRevive(){','// Screen-space arrows reuse existing snapshot positions.');
const functions=new Function('N','el','nearArenaRevive','clamp',
 'let arenaRevivePointer=1;'+newZone+'return {releaseArenaRevive,tickArenaRevive};')(
 N,el,()=>near,(v,min,max)=>Math.max(min,Math.min(max,v))
);
functions.tickArenaRevive(500);
ck(el('ns243ReviveProgress').hidden===false,'New Zone progress floating while holding');
ck(el('ns243RevivePercent').textContent==='50%','New Zone displays server progress');
ck(el('ns243ReviveProgress').style.props['--revive-arc']==='180deg','New Zone ring reflects progress');
ck(!el('ns190Revive').textContent.includes('%'),'New Zone thumb does NOT cover percentage');
ck(el('ns190Revive').classList.items.has('holding'),'New Zone hold state visible');
ck(messages.length===1&&messages[0].hold===1,'New Zone sends existing authoritative hold intent');
functions.releaseArenaRevive();
ck(el('ns243ReviveProgress').hidden===true,'New Zone release hides icon');
ck(!el('ns190Revive').classList.items.has('holding'),'New Zone release clears pressed state');
ck(messages.length===2&&messages[1].hold===0,'New Zone release sends stop intent');
N.reviveHeld='p1';near.reviveProgress=75;functions.tickArenaRevive(800);
ck(el('ns243RevivePercent').textContent==='100%','New Zone full progress clamps at 100');
console.log('V243 REVIVE THUMB-SAFE HUD PASS',JSON.stringify({checks,classic:'host/guest',newZone:'server/hold/release',newNetworkFields:0}));
