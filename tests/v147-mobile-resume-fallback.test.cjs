'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const arena=fs.readFileSync(path.join(__dirname,'../public/v140-net-mode.js'),'utf8');
const start=html.indexOf('function lobbyPendingReturn(){');
const end=html.indexOf('function renderLobby(){',start);
assert.ok(start>=0&&end>start,'lobby reconnection reservation must exist');
const context={
 NET:{role:'host',phase:'lobby',clients:new Map(),profiles:new Map([['p2',{name:'Milan'}]])},
 NETLAB:{tokens:new Map([['p2',{until:6000}]])},
 performance:{now:()=>1000}
};
vm.createContext(context);
vm.runInContext(html.slice(start,end),context,{timeout:1000});
assert.equal(context.lobbyPendingReturn().length,1,'background guest remains reserved');
assert.equal(context.lobbyPendingReturn()[0].name,'Milan','ghost retains original nickname');
context.NET.clients.set('p2',{open:true});
assert.equal(context.lobbyPendingReturn().length,0,'same seat rejoining clears reserved ghost');
context.NET.clients.delete('p2');
context.performance.now=()=>7000;
assert.equal(context.lobbyPendingReturn().length,0,'expired reservation is no longer blocking a match');
context.NET.role='guest';
assert.equal(context.lobbyPendingReturn().length,0,'guests never authoritatively reserve peers');
assert.match(html,/NET\.phase==='lobby'\?300000:180000/,'lobby seat is reserved for five minutes');
assert.match(html,/lobbyPendingReturn\(\)\.length===0&&roster\.every/,'all-ready start excludes offline reserved seats');
assert.match(html,/lobbyPendingReturn\(\)\.length>0\|\|!latest\.every/,'pending start cancels when player backgrounds');
assert.match(html,/lobbyPendingReturn\(\)\.length>0\|\|\(!NET\.forceRequest/,'force start cannot abandon reserved phone');
assert.match(html,/function ns147ResumeMobileRoom\(\)/,'foreground resumes same room');
assert.match(html,/document\.addEventListener\('resume',ns147ResumeMobileRoom\)/,'Android resume lifecycle covered');
assert.match(html,/NET\.phase='connecting';NET\.worldReady=false;NET\.roster=\[\];\s*\/\/ Keep backgrounded Android players in the same lobby/,'lobby UI remains open on brief disconnect');
assert.match(html,/arena\?\.fallbackAllowed&&NET\.role==='host'/,'quota fallback is host only');
assert.match(html,/arena\.stop\(\);selectedMode='normal'/,'quota fallback closes failed overlay');
assert.match(html,/NET\.lastRoundText=note;netStatus\(note\);toast\(note\);broadcastLobby\(\);\s*startLobbyMatch\(\);return/,'fallback starts the existing multiplayer');
assert.match(arena,/N\.fallbackAllowed=!offerSent&&/,'never fallback after issuing match tickets');
assert.match(arena,/free_test_budget_reached/,'quota error is explicitly recognized');
assert.match(html,/<title>Night Watch v147 — Noćna Straža<\/title>/);
console.log('V147 PASS: background seat reservation, identity, ready gating, foreground recovery and safe 429 classic fallback');
