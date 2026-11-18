const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('public/index.html','utf8'),src=fs.readFileSync('public/v140-net-mode.js','utf8');
const section=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i+1);assert(i>=0&&j>i);return s.slice(i,j)};
const reward=section(html,'function earnMPReward(','function awardMP('),bridge=section(html,'let ns206SoloSession=null;','window.__NS110_BRIDGE=');
const env={account:'a',hero:'hero1',uid:'u',active:true,role:'',saved:0,dirty:0};
const tracks=new Map(),wallet={coins:0,earned:0,runs:0};
const window={NS140_ARENA:{get active(){return env.active}},NS82_CLOUD:{get user(){return env.uid},markDirty(){env.dirty++}}};
const getHeroTrack=id=>{if(!tracks.has(id))tracks.set(id,{xp:0,branches:{health:0,damage:0,speed:0}});return tracks.get(id)};
const heroLevelStats=id=>{let xp=getHeroTrack(id).xp,level=1;while(level<100){const need=34+level*23+level*level*3;if(xp<need)return {level,inside:xp,need};xp-=need;level++}return {level,inside:0,need:0}};
const heroFreePoints=id=>heroLevelStats(id).level-1-Object.values(getHeroTrack(id).branches).reduce((a,b)=>a+b,0);
const api=new Function('env','window','getHeroTrack','heroLevelStats','heroFreePoints','mpProgress',
 'let activeHeroProfile=env.hero;const getActiveAccount=()=>({id:env.account}),NET={get role(){return env.role}},heroStyle={name:"Hero"};const saveMP=()=>env.saved++;const levelHeroAfterRun=(n,id)=>getHeroTrack(id).xp+=Math.min(70,Math.floor(n));\n'+reward+'\n'+bridge+'\nreturn {start(){activeHeroProfile=env.hero;return ns206SoloBegin()},finish(t,run){activeHeroProfile=env.hero;return ns206SoloFinish(t,run)},cancel:ns206SoloCancel,talent:ns206SoloTalent,earnMPReward};')(env,window,getHeroTrack,heroLevelStats,heroFreePoints,wallet);
const run=(kills,seconds,wave=1,blocked=false,reason='dead')=>({kills,seconds,wave,blocked,reason,mode:'normal'});
let checks=0;const ck=(v,m)=>{checks++;assert(v,m)};
for(let n=0;n<100;n++){ck(api.finish(api.start(),run(0,0)).heroXp===0,'quick deaths');ck(api.finish(api.start(),run(100,59)).coins===0,'time gate');ck(api.finish(api.start(),run(9,600)).coins===0,'kill gate')}
ck(wallet.coins===0&&wallet.runs===0&&env.saved===0,'no farming');
const token=api.start(),small=api.finish(token,run(18,75));ck(small.heroXp>0&&small.coins>0,'qualified loss');ck(api.finish(token,run(1000,900,20))===null,'duplicate blocked');
const big=api.finish(api.start(),run(200,600,10));ck(big.heroXp>small.heroXp&&big.heroXp<=70&&big.coins<=45,'better run, bounded');ck(heroLevelStats('hero1').level>=2,'permanent level');
const before=wallet.coins;ck(api.finish(api.start(),run(1000,900,20,true)).coins===0,'sandbox');ck(wallet.coins===before,'no sandbox currency');
let t=api.start();env.account='b';ck(api.finish(t,run(200,600,5))===null,'account switch');env.account='a';
t=api.start();env.hero='hero2';ck(api.finish(t,run(200,600,5))===null,'hero switch');env.hero='hero1';t=api.start();api.cancel(t);ck(api.finish(t,run(200,600,5))===null,'cancel');
env.role='guest';ck(api.start()===null,'MP cannot use offline grant');env.role='';
getHeroTrack('hero1').branches={health:2,damage:3,speed:4};t=api.start();let p={maxHp:100,hp:100,damage:22,speedMult:1};ck(api.talent(t,p)&&p.hp===104&&p.damage>22&&p.speedMult>1,'same hero talents in solo');api.cancel(t);
for(let k=10;k<200;k++)ck(api.earnMPReward(k+1,300,4)>=api.earnMPReward(k,300,4),'monotone kills');
const resultCode=section(src,'function arenaSoloResultStats(','function showSoloResults(');
const N={solo:true,phase:'running',me:{hp:0,kills:18,level:2,xpCollected:16},soloWave:1,resultActiveTicks:2250,resultBosses:0,explore:{chests:1},rule:{mode:'normal'},keys:new Set(['w']),stick:{},soloResultToken:{}};
let displays=0,settlements=0;const resultAPI=new Function('N','LAB','B','syncArenaAccount','closeArenaMenu','A','status','showSoloResults','window','console','arenaRuleMode',resultCode+'\nreturn {finishSoloRun,arenaSoloResultStats}')(N,{enabled:false},()=>({arenaSoloFinish(){settlements++;return {heroXp:15}}}),()=>{},()=>{},()=>({stop(){}}),()=>{},()=>{displays++},{},console,v=>v||'normal');
ck(resultAPI.finishSoloRun('dead'),'death terminal');ck(N.phase==='solo_ended'&&N.keys.size===0&&displays===1,'results and stop input');ck(!resultAPI.finishSoloRun('dead')&&settlements===1,'only once');ck(N.soloResult.stats.seconds===75&&N.soloResult.stats.kills===18,'stats from current run');
for(const reason of ['defeat','victory']){N.phase='running';N.soloResult=null;ck(resultAPI.finishSoloRun(reason)&&N.soloResult.stats.reason===reason,'terminal '+reason)}
ck(src.includes("finishSoloRun('defeat')")&&src.includes("finishSoloRun(N.me.hp<=0?'dead':'victory')"),'wired death and victories');ck(src.includes('N.soloRewardBlocked=true;')&&src.includes('N.resultActiveTicks=(N.resultActiveTicks||0)+1'),'sticky lab exclusion and active ticks');
const release=html.match(/name="ns-release" content="(\d+)"/)?.[1],menuRelease=html.match(/id="ns102MenuVersion"[^>]*>[^<]*VERZIJA V(\d+)\b/)?.[1],titleRelease=html.match(/<title>Night Watch v(\d+)\b/)?.[1];
ck(!!release&&release===menuRelease&&release===titleRelease,'menu, browser title and release marker must agree');
ck(!/id="ns102MenuVersion"[^>]*>[^<]*IZDANJE V\d+/.test(html),'no second stale release label');
console.log('V206 SOLO RESULTS PASS',checks,'checks');

;(()=>{
 const i=src.indexOf('N.world={"w":4200')+'N.world='.length,j=src.indexOf(';\n',i);
 const W=JSON.parse(src.slice(i,j)),helpers=section(src,'// BEGIN V207 MAP XP','// END V207 MAP XP');
 const N={me:{hp:100,maxHp:100,level:1,xp:0,xpNeed:160,xpCollected:0,queuedUpgrades:0},soloTick:1,soloDrops:[],soloChoice:null,soloUpgradeSeq:0,soloChestSeq:0};
 const api=new Function('N','A','announceArena','xpNeeded',helpers+'\n'+section(src,'function addSoloRunXp(','function soloDamageRule(')+'\nreturn {arenaSeedMapXp,arenaPushXp,stepSoloXpCrystals}')(N,()=>({play(){}}),()=>{},()=>197);
 const gems=api.arenaSeedMapXp(W);ck(gems.length===31,'all 31 map gems registered');N.soloDrops=JSON.parse(JSON.stringify(gems));
 for(const gem of gems){N.me.x=gem.x;N.me.y=gem.y;const before=N.me.xp;api.stepSoloXpCrystals();ck(N.me.xp===before+5,'collect map XP');ck(!N.soloDrops.some(d=>d.id===gem.id),'remove collected crystal')}
 ck(N.me.xpCollected===31&&N.me.xp===155&&N.soloDrops.length===0,'each gem awards once');
 api.stepSoloXpCrystals();ck(N.me.xp===155,'no duplicate pickup');
 N.soloDrops=JSON.parse(JSON.stringify(gems));for(let n=32;n<=3000;n++)api.arenaPushXp(N.soloDrops,{id:n,value:7,expires:1800},160);
 ck(N.soloDrops.length===160&&N.soloDrops.filter(d=>d.mapXp).length===31,'bounded map gem retention');
 ck(src.includes("if(o.classic||o.kind==='tree'||o.kind==='rock'||o.kind==='expWall')continue;"),'do not double draw classic colliders');
 ck(src.includes("if(p.type==='crystal')continue;"),'no duplicate static crystal art');ck(src.includes('if(Math.min(w,h)<72)'),'small collider gets crate sprite');
 console.log('V207 SOLO MAP AND SCENERY PASS',checks,'cumulative checks');
})();

{const source=src,i=source.indexOf('N.world={"w":4200')+"N.world=".length,W=JSON.parse(source.slice(i,source.indexOf(";\n",i)));

;(()=>{
 const begin=source.indexOf('// BEGIN V208 OBJECTIVES'),end=source.indexOf('// END V208 OBJECTIVES',begin),clearStart=source.indexOf('function arenaAcidClear('),clearEnd=source.indexOf('\nfunction ',clearStart+1);
 assert(begin>=0&&end>begin&&clearEnd>clearStart);
 const api=new Function(source.slice(clearStart,clearEnd)+'\n'+source.slice(begin,end)+'\nreturn {fieldObjectiveInit,fieldObjectiveStep,fieldObjectiveSpec,fieldObjectiveRestore}')();
 const fences=W.classicProps.filter(p=>p.type==='fence');assert(fences.length>=10);
 for(const f of fences){assert(W.obstacles.some(o=>o.kind==='fence'&&o.classic===1&&Math.abs(o.x+o.w/2-f.x)<=1&&Math.abs(o.y+o.h/2-f.y)<=1));}
 let checks=0;const ck=(v,m)=>{checks++;assert(v,m)};
 const ps=new Map(Array.from({length:6},(_,i)=>['p'+i,{id:'p'+i,x:2100,y:2100,online:true,hp:60,maxHp:100,xpCollected:0,arenaKeys:0,xp:0}]));
 let e={kills:0,worms:0,field:api.fieldObjectiveInit()},tick=10;const reward=(p,n)=>p.xp+=n;
 ck(!api.fieldObjectiveStep(e,ps,W,tick++,reward),'no initial reward');e.kills=19;ck(!api.fieldObjectiveStep(e,ps,W,tick++,reward),'19 insufficient');e.kills=20;ck(api.fieldObjectiveStep(e,ps,W,tick++,reward),'20 done');ck([...ps.values()].every(p=>p.arenaKeys===1&&p.hp===72),'one initial key each');ck(!api.fieldObjectiveStep(e,ps,W,tick++,reward),'no repeat');
 for(let stage=1;stage<=24;stage++){
  tick=e.field.next;api.fieldObjectiveStep(e,ps,W,tick++,reward);ck(e.field.stage===stage,'next stage');
  const [type,target]=api.fieldObjectiveSpec(e.field),p=ps.values().next().value;
  if(type==='wormhunt'){e.worms+=target;ck(api.fieldObjectiveStep(e,ps,W,tick++,reward),'worm hunt')}
  else if(type==='collect'){p.xpCollected+=target;ck(api.fieldObjectiveStep(e,ps,W,tick++,reward),'crystal count')}
  else if(type==='hold'){const o=e.field.objects[0];for(const q of ps.values()){q.x=o.x;q.y=o.y}for(let n=0;n<target*30-1;n++)ck(!api.fieldObjectiveStep(e,ps,W,tick++,reward),'hold not early');ck(api.fieldObjectiveStep(e,ps,W,tick++,reward),'hold done')}
  else{const arr=e.field.objects;ck(arr.length===target,'placed objects');for(let i=0;i<arr.length;i++){for(const q of ps.values()){q.x=arr[i].x;q.y=arr[i].y}ck(api.fieldObjectiveStep(e,ps,W,tick++,reward)===(i===arr.length-1),'shared pickup once')}}
  ck(e.field.completed===stage+1,'completion count');e.field=api.fieldObjectiveRestore(JSON.parse(JSON.stringify(e.field)));const prev=p.xp;
  ck(!api.fieldObjectiveStep(e,ps,W,tick++,reward),'no replay after restore');ck(p.xp===prev,'no repeated reward');
 }
 e.invalid=true;const before=e.field.completed;ck(!api.fieldObjectiveStep(e,ps,W,e.field.next+10000,reward),'editor blocked');ck(e.field.completed===before,'no editor progress');
 console.log('V208 OBJECTIVES PASS',checks,'checks, 25 mission completions, 6 players, fence colliders');
})();

}
