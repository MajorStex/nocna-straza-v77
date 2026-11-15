'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const client=fs.readFileSync(path.join(__dirname,'../public/v140-net-mode.js'),'utf8');
assert.match(html,/<title>Night Watch v157 — Noćna Straža<\/title>/);
assert.match(html,/v140-net-mode\.js\?v=157/,'fresh client asset on PWA homescreen');
assert.match(client,/ws\.send\(JSON\.stringify\(\{t:'hello',id,ticket,protocol:140\}\)\)/,
 'legacy-compatible handshake is small');
assert.match(client,/N\.lookSyncEnabled=Number\(m\.serverBuild\)>=153/,
 'appearance sync is enabled only on V153 server');
assert.match(client,/ws\.send\(JSON\.stringify\(\{t:'look',look\}\)\)/,
 'appearance is sent once after capability negotiation');
assert.match(client,/if\(m\.t==='look'\)\{rememberLook\(m\.id,m\.revision,m\.look\);renderPresence\(\);return\}/);
assert.match(client,/N\.looks\.get\(p\.id\)\?\.look/);
assert.match(client,/N\.lastLookCheck>=850/,'cosmetics not transmitted on every frame');
assert.match(client,/p\.hp\/\(p\.maxHp\|\|100\)/,'scaled look does not change health');
new Function(client);
const start=client.indexOf('function localArenaLook(){'),end=client.indexOf('function input(){',start);
assert.ok(start>=0&&end>start);
const hero={skin:'#334455',weapon:'spear',visualSize:1.08,wardrobe:{topColor:'#223344'}};
const game={heroStyle:hero,networkHeroStyle:look=>({...look})};
const context={window:{__nightWatch:game},B:()=>({}),N:{looks:new Map()},Number};
vm.createContext(context);
vm.runInContext(client.slice(start,end),context,{timeout:1000});
assert.equal(context.localArenaLook().visualSize,1.08);
game.heroStyle={skin:'#ffeedd',weapon:'axe',visualSize:.71};
assert.equal(context.localArenaLook().visualSize,.71,'reads current hero, not frozen lobby bridge');
assert.equal(context.localArenaLook().skin,'#ffeedd','skin changes reach outgoing metadata');
assert.equal(context.rememberLook('p2',1,{skin:'#ff0000',visualSize:1.12}),true);
assert.equal(context.rememberLook('p2',0,{skin:'#0000ff',visualSize:.7}),false,
 'delayed older server update cannot overwrite current look');
assert.equal(context.N.looks.get('p2').look.visualSize,1.12);
assert.equal(context.rememberLook('p3',2,{skin:'#aaa111',visualSize:.7}),true);
assert.equal(context.N.looks.get('p2').look.skin,'#ff0000','cosmetics are keyed by seat');
console.log('V153 appearance PASS: current skin+size, per-seat rendering, reliable revision order, limited bandwidth');
