'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('public/index.html','utf8');
let checked=0;
const ok=(truth,message)=>{assert.ok(truth,message);checked++};
const eq=(a,b,message)=>{assert.equal(a,b,message);checked++};
for(const script of [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!m[1].includes('src='))){
 new vm.Script(script[2]);checked++;
}
ok(html.includes("\x3ctitle>Night Watch v97 — Match Stats & Vote (Night Watch v95 compatible)</title>"),'v95 title');
ok(html.includes("NET.sessionToken=typeof data.session==='string'?data.session:null"),'guest receives scoped run token');
ok(html.includes("session:NET.sessionToken,difficulty:NSX.opt.difficulty"),'host sends scoped run token');
ok(html.includes('NS94_ECON.pay(s.price)'),'spell purchases use safe debit');
ok(html.includes('NS94_ECON.pay(mpCost(id,r))'),'upgrades use safe debit');
ok(html.includes('if(!NS94_ECON.rewardValid(packet))return false;'),'all multiplayer awards validated');
ok(html.includes("NS94_FX.observe(ts)"),'adaptive FX sampled with render loop');
ok(html.includes('if(!NS94_FX.shouldDraw(e))continue;'),'minor effects skipped at lower FPS');
ok(html.includes("if(e.type==='ns93Magic'){NS93_MAGIC.drawSpell"),'essential casting remains visible');
const slice=(head,tail)=>{
 const a=html.indexOf(head),b=html.indexOf(tail,a);
 ok(a>0&&b>a,'found '+head);return html.slice(a,b+tail.length);
};
const economy=slice('const NS94_ECON=(()=>{','window.__NS94_ECON=NS94_ECON;');
const fx=slice('const NS94_FX=(()=>{','window.__NS94_FX=NS94_FX;');
const MP_SKILLS={vitality:{max:35},strength:{max:35}};
const mpProgress={
 coins:1e30,earned:Infinity,shards:NaN,runs:12,ranks:{vitality:99999,strength:-1},
 spells:{comet:1,fake:1,spark:1,heal:true},awarded:{'session-old:1':1}
};
const NET={role:'guest',phase:'playing',round:2,sessionToken:'session-newrun'};
const G={mode:'play'};
const window={};
vm.runInNewContext(economy,{mpProgress,NET,MP_SKILLS,Math,Number,Object,Set,window});
const ledger=window.__NS94_ECON;
eq(mpProgress.coins,2000000,'invalid giant balance capped safely');
eq(mpProgress.earned,0,'infinite earnings sanitized');
eq(mpProgress.shards,0,'NaN shards sanitized');
eq(mpProgress.ranks.vitality,35,'rank upper bound');
eq(mpProgress.ranks.strength,0,'rank floor');
eq(Object.keys(mpProgress.spells).join(','),'comet','valid spell only');
ok(!ledger.pay(Infinity),'infinite price rejected');
ok(!ledger.pay(-1),'negative price rejected');
ok(!ledger.pay(NaN),'NaN price rejected');
ok(!ledger.pay(0),'zero price rejected');
mpProgress.coins=30;ok(!ledger.pay(31),'insufficient funds fail closed');
eq(mpProgress.coins,30,'failed debit leaves funds intact');
ok(ledger.pay(17),'valid purchase debit');
eq(mpProgress.coins,13,'exact purchase price');
const packet={session:'session-newrun',round:2,kills:35,seconds:85,wave:4,shards:1};
ok(ledger.rewardValid(packet),'valid room-scoped reward');
ok(ledger.reward(packet,15),'credit once');
eq(mpProgress.coins,28,'reward applied once');
eq(mpProgress.shards,1,'shards bounded');
ok(!ledger.reward(packet,15),'duplicate reward rejected');
eq(mpProgress.coins,28,'duplicate did not credit');
ok(!ledger.reward({...packet,round:1},10),'wrong round rejected');
ok(!ledger.reward({...packet,session:'session-other'},10),'old/other room rejected');
ok(!ledger.reward({...packet,round:3,kills:Infinity},10),'infinite combat data rejected');
ok(!ledger.reward({...packet,round:3,kills:100000},10),'implausible kills rejected');
NET.role='';
ok(!ledger.reward({...packet,round:3},10),'solo mode cannot claim multiplayer reward');
NET.role='guest';
const document={hidden:false};
const fxc=vm.runInNewContext(fx,{G,document,Math,Number,window});
const engine=window.__NS94_FX;
eq(engine.tier(),2,'starts high quality');
let ts=100;
for(let i=0;i<320;i++){ts+=41;engine.observe(ts);}
eq(engine.tier(),0,'low FPS lowers quality to lite FX');
ok(engine.spikes(true)<=3,'lite FX has at most 3 sparkle strokes');
ok(engine.shouldDraw({type:'ns93Magic',id:1}),'magic never disappears');
ok(engine.shouldDraw({type:'hit',id:1}),'damage cue never disappears');
ok(!engine.shouldDraw({type:'puff',id:1}),'cosmetic puff capped at slow FPS');
const slowStats=engine.stats();ok(slowStats.changes>=2,'stable degradations');
for(let i=0;i<1000;i++){ts+=16.67;engine.observe(ts);}
eq(engine.tier(),2,'good FPS restores full cosmetic fidelity');
ok(engine.shouldDraw({type:'puff',id:1}),'all FX restored at good FPS');
document.hidden=true;G.mode='menu';
for(let i=0;i<100;i++){ts+=100;engine.observe(ts);}
eq(engine.tier(),2,'menu and background do not force FX downgrades');
console.log('PASS '+checked+' v95 checks: JS syntax, scoped rewards, replay safety, expense validation, sanitation, adaptive FPS hysteresis, essential magic FX.');
