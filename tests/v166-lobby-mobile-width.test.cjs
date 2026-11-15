'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const voice=fs.readFileSync(path.join(__dirname,'../public/v165-classic-voice.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
new Function(voice);
assert.match(html,/name="viewport"/,'native mobile viewport is preserved');
assert.match(html,/id="coopPanel"/);
assert.match(html,/id="lobbyHeroRow"/);
assert.match(html,/id="lobbyModeRow"/);
assert.match(html,/id="ns142MpModes"/);
for(const feature of ['#coopPanel .lobbyBox','#coopPanel #lobbyArea','#coopPanel .settingRow',
 '#coopPanel .ns142MpModes','#coopPanel .ns165VoiceCard','#coopPanel .ns165VoiceCard .ns165VoiceActions'])
 assert(voice.includes(feature),'responsive CSS missing: '+feature);
assert(voice.includes('grid-template-columns:minmax(0,1fr)'),'dialog grid must be able to shrink');
assert(voice.includes('repeat(2,minmax(0,1fr))'),'mode selector and mic actions must wrap to phone width');
assert(voice.includes('width:100%!important;max-width:100%!important'),'dialog must respect viewport');
assert(!/zoom\s*:|scale\s*\(/.test(voice.match(/st\.textContent\+=`([\s\S]*?)`;/)?.[1]||''),'do not fake the fix with zoom/scale');
assert.match(voice,/window\.NS159_VOICE/);
assert.match(voice,/function toggleMode/);
assert.match(voice,/function install/);
console.log('V166 LOBBY MOBILE FIT PASS: constrained grid, safe responsive modes+voice, unchanged microphone and viewport');
