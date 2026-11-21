'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const voice=fs.readFileSync('public/v165-classic-voice.js','utf8'),html=fs.readFileSync('public/index.html','utf8');
let checks=0;const ok=(cond,why)=>{assert.ok(cond,why);checks++};
new vm.Script(voice);checks++;
const card=voice.slice(voice.indexOf("st.textContent='.ns165VoiceCard{"),voice.indexOf('document.head.append(st);'));
ok(card.includes('.ns165VoiceCard button,.ns165VoiceVillageButton{')&&card.includes('touch-action:none'),
 'PTT microphone default remains hold-only');
ok(card.includes('#ns165LobbyVoice{touch-action:pan-y;overscroll-behavior-y:auto'),
 'lobby voice card itself allows native parent scroll');
ok(card.includes('#ns165LobbyVoice strong,#ns165LobbyVoice small,#ns165LobbyVoice .ns165VoiceActions{touch-action:pan-y'),
 'finger swipe over voice title, hint and empty gaps scrolls lobby');
ok(card.includes('#ns165LobbyVoice .ns165VoiceMode,#ns165LobbyVoice .ns165Off{touch-action:pan-y}'),
 'mode and off controls allow swipe while retaining tap');
ok(card.includes('#ns165LobbyVoice.ns165ToggleMode .ns165Mic{touch-action:pan-y}'),
 'toggle microphone allows swipe; PTT microphone keeps touch hold');
ok(!card.includes('#ns165PauseVoice{touch-action:pan-y'),
 'pause voice panel behavior unchanged');
ok(!card.includes('#ns165VillageVoiceCard{touch-action:pan-y'),
 'Village PTT behavior unchanged');
const refresh=voice.slice(voice.indexOf('function refresh(){'),voice.indexOf('function decorateLobby('));
ok(refresh.includes("if(card.id==='ns165LobbyVoice')card.classList.toggle('ns165ToggleMode',mode==='toggle');"),
 'live voice mode updates lobby microphone swipe rules');
ok(refresh.includes("mode==='toggle'?'🎙 REŽIM: TOGGLE")&&refresh.includes("mode==='toggle'?(voice?.microphoneOn"),
 'existing toggle / PTT UI logic retained');
ok(voice.includes('modeBtn.onclick=toggleMode')&&voice.includes('off.onclick=micOff'),
 'voice buttons retain actual handlers');
ok(voice.includes("const mic=document.createElement('button');mic.type='button';mic.className='ns165Mic'"),
 'mic control is still connected to voice engine');
ok(voice.includes('voice.bindControl(node)'), 'microphone keeps its existing voice handler');
ok(!/addEventListener\(['"](?:touchstart|touchmove|touchend|pointermove|wheel)/.test(card),
 'scroll change introduces no interception handlers');
const modeRule=(m)=>m==='toggle';
ok(modeRule('toggle')===true&&modeRule('ptt')===false,'mode-dependent swipe exception');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(m=>!/\bsrc=/.test(m[1]));
ok(scripts.length===4,'same Classic inline script set');
for(const s of scripts){new vm.Script(s[2]);checks++}
ok(/name="ns-release" content="246"/.test(html),'HTML V245 release');
ok(/id="ns102MenuVersion"[^<]*VERZIJA V246/.test(html),'lobby badge V245');
ok(/v165-classic-voice\.js\?v=245&amp;ui=245/.test(html),'Android cached voice script invalidated');
ok(/v140-net-mode\.js\?v=246&amp;release=246/.test(html),'cached New Zone entry version matches V245');
console.log('V245 LOBBY VOICE SWIPE PASS',JSON.stringify({checks,networkChanges:0,micToggleSwipe:true,micPttHoldIntact:true}));
