'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('public/v140-net-mode.js','utf8'),html=fs.readFileSync('public/index.html','utf8');let checks=0;
const ck=(v,m)=>{assert.ok(v,m);checks++};
new vm.Script(code);
const from=code.indexOf('// V241 exact original Classic cave coordinates');
const to=code.indexOf('function expWorld(base,id,layout=0){',from);
ck(from>0&&to>from,'V241 shared historic cave layout embedded');
const geo=new Function(code.slice(from,to)+';return{expClassicCave241,EXP_CAVE_START,EXP_CAVE_EXIT,EXP_CAVE_REST,EXP_CAVE_RELIC,expCaveSecretOpen}')();
ck(geo.EXP_CAVE_START.x===110&&geo.EXP_CAVE_START.y===130,'original cave entry');
ck(geo.EXP_CAVE_EXIT.x===852&&geo.EXP_CAVE_EXIT.y===718,'original cave exit');
ck(geo.EXP_CAVE_REST.x===128&&geo.EXP_CAVE_REST.y===558,'historic safe alcove');
ck(geo.EXP_CAVE_RELIC.x===1120&&geo.EXP_CAVE_RELIC.y===564,'historic secret relic');
for(let layout=0;layout<3;layout++){
 const w=geo.expClassicCave241(layout),w2=geo.expClassicCave241(layout);
 ck(w.w===1280&&w.h===860,'correct vintage world dimensions '+layout);
 ck(JSON.stringify(w)===JSON.stringify(w2),'client world deterministic '+layout);
 ck(w.classicProps.filter(p=>p.type==='crate'||p.type==='barrel').length===15,'all old crates and barrels '+layout);
 ck(w.classicProps.filter(p=>p.type==='torch').length===6,'all original lights '+layout);
 ck(w.classicProps.some(p=>p.secret==='secret'&&p.x===540&&p.y===554),'old marked crate '+layout);
 ck(w.classicProps.some(p=>p.secretWall&&p.x===916&&p.y===565),'old eastern sealed passage '+layout);
 ck(w.obstacles.length>100,'solid maze collisions '+layout);
}
ck(/arenaBreakRestore\(N\.breakState,N\.world,packet\)/.test(code)||/arenaBreakRestore\(N\.breakState,N\.world,old\.breakables\)/.test(code),'network/persistent breakable state retained');
ck(/z\.layout=Number\.isInteger\(v\[7\]\)/.test(code),'layout synchronized from server expedition packet');
ck(/z\.restUsed=v\[8\]===1;z\.secretClaimed=v\[9\]===1/.test(code),'one-time bonus receipts synchronized');
ck(/N\.world=expWorld\(N\.expBase,z\.id,z\.layout\|\|0\)/.test(code),'MP reconstructs exact authoritative layout');
ck(/N\.world=expWorld\(N\.expBase,id,z\.layout\|\|0\)/.test(code),'SOLO uses same cave generator');
ck(/if\(expCaveStep\(N\.expedition,N\.players,N\.breakState\)\)/.test(code),'solo alcove and secret rewards');
ck(/const point=z\?\.id\?\(z\.id===2\?EXP_CAVE_EXIT:EXP_EXIT\)/.test(code),'interactive exit at original coordinates');
ck(/if\(z\.id===2\)\{\s*\/\/ Original fixed exit arch/.test(code),'original cave exit visual');
ck(/N\.expedition\?\.id===2&&\['caveWall','caveSecret','crate','barrel','obelisk'\]/.test(code),'never render duplicate building sprites for cave colliders');
ck(/N\.expedition\?\.id===2&&drawClassicCaveGround\(g,N\.world,visible\)/.test(code),'cached cave floor selected instead of outdoor grass');
ck(/const bridge=cave\?drawClassicCaveProp241:B\(\)\.arenaClassicProp/.test(code),'redrawn cave assets only, old mode remains intact');
ck(/classicSpriteBytes\+bytes>24\*1024\*1024/.test(code),'existing 24 MiB LRU artwork budget');
const artStart=code.indexOf('let caveFloor241=null;'),artEnd=code.indexOf('// Classic map visuals:',artStart);
ck(artStart>0&&artEnd>artStart,'V241 cached floor and original-color sprite code exists');
let creations=0,calls=0,images=0;
const surface=()=>new Proxy({createRadialGradient(){return{addColorStop(){}}}},{
 get(target,k){if(k in target)return target[k];return (...v)=>{calls++;if(k==='drawImage')images++}},
 set(target,k,v){target[k]=v;return true}});
const doc={createElement(name){ck(name==='canvas','only pre-rendered canvases created');creations++;return{width:0,height:0,getContext:()=>surface()}}};
const art=new Function('document',code.slice(artStart,artEnd)+';return{floor:buildCaveFloor241,render:drawClassicCaveGround,prop:drawClassicCaveProp241}')(doc);
ck(!!art.floor()&&art.floor().width===1280&&art.floor().height===860,'correct single baked native-resolution floor');
const g=surface(),world={w:1280,h:860};art.render(g,world,{left:10,top:20,right:400,bottom:300});art.render(g,world,{left:30,top:40,right:300,bottom:250});
ck(creations===1&&images===2,'one 1280x860 cached floor, viewport crop per frame');
const sample=geo.expClassicCave241(0).classicProps;for(const type of ['rock','torch','crate','barrel','obelisk','caveRest','caveRelic']){
 const p=sample.find(x=>x.type===type);ck(!!p&&art.prop(surface(),p)===true,'new static asset renders: '+type);
}
ck(calls>200,'full visual art has multiple stone, torch, crate and relic details');
ck(/name="ns-release" content="247"/.test(html),'client release version');
ck(/v140-net-mode\.js\?v=247&amp;release=247/.test(html),'new UI asset cache busted');
console.log('V241 CLIENT CAVE PASS',JSON.stringify({checks,layouts:3,props:sample.length,renderCalls:calls,createdCanvases:creations,viewportCrops:images,relayPacketsAdded:0}));
