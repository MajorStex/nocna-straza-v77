'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.resolve(__dirname,'../public/index.html'),'utf8');
const village=fs.readFileSync(path.resolve(__dirname,'../public/v115-village.js'),'utf8');
assert.match(html,/<title>Night Watch v(14[3-9]|1[5-9][0-9]|[2-9][0-9]{2}) — Noćna Straža<\/title>/);
assert.match(html,/function flushPending\(onlyId=''/);
assert.match(html,/NS96_INVITES\.flushPending\(id\)/);
assert.match(html,/NS96_INVITES\.flushPending\(\)/);
assert.match(html,/POZOVI OFFLINE/);
assert.match(village,/POZOVI OFFLINE/);
assert.match(village,/const targets=\[\.\.\.new Set\(ids\)\]/);
new Function(village);
for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
 if(!/\bsrc=/.test(match[1]))new Function(match[2]);
}
const start=html.indexOf('const NS96_INVITES=(()=>{');
const end=html.indexOf('window.__NS96_INVITES=NS96_INVITES;',start);
assert.ok(start>0&&end>start,'invitation module found');
const storage=new Map(),sent=[],messages=[];
const target='ABCD2345';
const env={
 window:{__gameLanguage:{value:'sr'}},
 NET:{role:'host',phase:'lobby',code:'ABCDEF'},
 SOCIAL:{db:{friends:{[target]:{name:'Drug',level:1}}},conns:new Map()},
 FRIEND_CODE_RE:/^[A-Z2-9]{8}$/,
 NS92_DIR:{maxPlayers:()=>6,options:{password:''}},
 $:()=>null,
 getActiveAccount:()=>({id:'test-user'}),
 currentLobbyRoster:()=>[],
 socialFriend:id=>env.SOCIAL.db.friends[id]||null,
 socialPacket:t=>({t,id:'HOST5678',name:'Host'}),
 socialSend:(id,p)=>{if(!env.SOCIAL.conns.get(id)?.open)return false;sent.push({id,p});return true},
 toast:m=>messages.push(m),
 localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
 Date,Map,JSON,Object,Array,Number,String,Math,Set,
};
vm.runInNewContext(html.slice(start,end+'window.__NS96_INVITES=NS96_INVITES;'.length),env);
const api=env.window.__NS96_INVITES;
assert.ok(api.invite(target),'can queue invite for OFFLINE friend');
assert.equal(api.pending(target),true,'queued status visible');
assert.equal(api.queuedCount,1,'exactly one queued invite');
assert.ok(api.invite(target),'duplicate click is idempotent');
assert.equal(api.queuedCount,1,'duplicates never create extra entries');
assert.equal(api.flushPending(),0,'offline friend receives no false delivery');
env.SOCIAL.conns.set(target,{open:true});
assert.equal(api.flushPending(target),1,'automatically sends when friend starts');
assert.equal(sent.length,1,'exactly one live invite delivered');
assert.equal(sent[0].p.t,'invite');
assert.equal(sent[0].p.room,'ABCDEF');
assert.equal(api.pending(target),false);
assert.equal(api.flushPending(target),0,'no duplicate invitation on later heartbeat');
api.reset();assert.equal(api.queuedCount,0,'leaving lobby expires pending queue');
env.SOCIAL.conns.clear();
assert.ok(api.invite(target),'can queue new intent');
env.NET.code='BCDEFG';
assert.equal(api.pending(target),false,'old room invite cannot leak to a new room');
assert.equal(api.flushPending(),0,'no stale room replay');
console.log('PASS V143 offline invite: queue, duplicate protection, reconnect delivery, room invalidation and syntax.');
