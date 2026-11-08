'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.resolve(__dirname,'../public/index.html'),'utf8');
const markers=[
 'VERZIJA V106','function ns106Identity','sessionIdentity:ns106Identity()',
 'function ns106Kick(id)','id="ns106KickGuests"','id="ns106SpellToggle"',
 'ns106Closed','id="ns106WhoUpgrades"','CHOOSES UPGRADE',
 'ns106ReviveSentAt>=230',"t:'reviveHold',held:true",
 'identity:ns106Identity()',"t:'sessionReplaced'","t:'kicked'",
 "data.t==='alreadyHere'","NET.kickedIdentities.clear()"
];
for(const marker of markers)assert.ok(html.includes(marker),'Missing '+marker);
const tags=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
const scripts=tags.filter(x=>!/(?:\bsrc=|type=['"]module|type=['"]application\/json)/i.test(x[1])).map(x=>x[2]).filter(Boolean);
assert.ok(scripts.length>0,'No inline scripts found');
for(const [i,script] of scripts.entries())assert.doesNotThrow(()=>new vm.Script(script,{filename:'game-inline-'+i+'.js'}),'Syntax error in inline script '+i);
assert.match(html, /temple-preview/);
assert.match(html, /NS105_TEMPLE/);
console.log('PASS V106 '+scripts.length+' inline JS scripts parse; required multiplayer, HUD, revive and Temple code present');
