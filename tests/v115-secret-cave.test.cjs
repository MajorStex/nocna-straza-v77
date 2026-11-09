'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../public/v115/index.html'),'utf8');
const vjs=fs.readFileSync(path.resolve(__dirname,'../public/v115-village.js'),'utf8');
const preview=fs.readFileSync(path.resolve(__dirname,'../public/village-test/index.html'),'utf8');
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi))if(!/\bsrc=/.test(m[1]))new Function(m[2]);
new Function(vjs);
assert.ok(html.includes('../v115-village.js?v=115'),'game loads updated Village module');
assert.ok(vjs.includes('if(!opened||!canVisit()'),'solo Village tap uses canVisit');
assert.ok(vjs.includes('get sheepCount(){return NPCS.length}'),'Village exposes four-sheep diagnostic');
assert.ok(preview.includes('window.NS109_VILLAGE?.open()'),'standalone Village auto-opens');
assert.ok(html.includes('startCaveTest'),'isolated test route exists');
const find=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i+1);assert.ok(i>=0&&j>i,a);return html.slice(i,j)};
const fx=find('function generateCaveProps(seed=1){','function syncCavePropStates(');
const makeProp=(type,x,y,size=1)=>({type,x,y,r:Math.round(size*({rock:29,crate:16,barrel:15,obelisk:30,torch:12}[type]||13))});
const makeDestructible=(type,x,y,hits=1,extra={})=>({...makeProp(type,x,y,.85),destructible:true,hp:hits,maxHp:hits,...extra});
const seeded=n=>{const a=Math.sin(n)*10000;return a-Math.floor(a)};
const caveLayoutId=n=>Math.abs(Math.floor(n))%3;
const generate=new Function('makeProp','makeDestructible','seeded','caveLayoutId',fx+'\nreturn generateCaveProps')(makeProp,makeDestructible,seeded,caveLayoutId);
function reachable(props,open,goal){
 const solids=props.filter(p=>['rock','crate','barrel','obelisk'].includes(p.type)&&(!open||!p.secretWall));
 const cell=14,w=Math.ceil(1280/cell),h=Math.ceil(860/cell),r=12.2;
 const valid=(x,y)=>x>47&&y>47&&x<1232&&y<816&&!solids.some(p=>(p.x-x)**2+(p.y-y)**2<(p.r*.83+r)**2);
 const start=[Math.floor(110/cell),Math.floor(130/cell)],i=(x,y)=>y*w+x;
 const seen=new Uint8Array(w*h),q=[start];seen[i(...start)]=1;
 for(let k=0;k<q.length;k++){const [x,y]=q[k];for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h||seen[i(nx,ny)])continue;const px=(nx+.5)*cell,py=(ny+.5)*cell;if(!valid(px,py))continue;seen[i(nx,ny)]=1;q.push([nx,ny]);}}
 return q.some(([x,y])=>Math.hypot(x*cell-goal[0],y*cell-goal[1])<44);
}
for(let seed=0;seed<3;seed++){
 const props=generate(seed);
 assert.ok(props.some(p=>p.secret==='secret'),'secret trigger exists in cave layout '+seed);
 assert.ok(props.some(p=>p.secretWall),'sealed eastern door exists '+seed);
 assert.equal(reachable(props,false,[1120,564]),false,'reward inaccessible before breaking wall '+seed);
 assert.equal(reachable(props,true,[1120,564]),true,'reward reachable after opening '+seed);
 assert.equal(reachable(props,false,[540,554]),true,'trigger accessible '+seed);
}
const rewardSrc=find('function caveSecretRewardTick(){','function drawCaveSecret(){');
function rewardFixture(test=false){
 const cave={active:true,seed:7,secretFound:true,secretClaimed:false},progress={cave,caveTestMode:test};
 const player={id:'p1',dead:false,x:1120,y:564,hp:20,maxHp:100,runShards:0};
 const G={players:[player],xp:0};
 let grants=0,fxs=0;
 const reward=new Function('progress','authority','G','ns98CaveParticipant','caveRewardOnce','seeded','NET','coopXP','effect','sfx','toast','lang',rewardSrc+'\nreturn caveSecretRewardTick')(
  progress,()=>true,G,p=>!p.dead,()=>{grants++;return true},seeded,{role:''},()=>{},()=>{fxs++},()=>{},()=>{},(en)=>en);
 return {reward,cave,player,G,grants:()=>grants,fxs:()=>fxs};
}
const normal=rewardFixture();
normal.reward();assert.equal(normal.cave.secretClaimed,true);
assert.equal(normal.grants(),1,'one physical cave loot claim');
assert.equal(normal.player.runShards,1,'one shard');
assert.equal(normal.player.hp,35,'healing on pickup');
assert.equal(normal.G.xp,55,'55 XP on pickup');
normal.reward();assert.equal(normal.grants(),1,'no repeated loot on subsequent ticks');
const demo=rewardFixture(true);
demo.reward();assert.equal(demo.cave.secretClaimed,true);
assert.equal(demo.grants(),0,'no permanent armory item in test');
assert.equal(demo.G.xp,0,'no XP saved in test');
assert.equal(demo.player.runShards,0,'no shards in test');
console.log('V115 PASS: 3 cave layouts sealed/open, reward once, test-only safety, Village preview source, JS syntax');
