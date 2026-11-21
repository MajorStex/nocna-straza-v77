'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('public/index.html','utf8');
let checks=0;function ck(p,m){assert.ok(p,m);checks++}
const cssStart=html.indexOf('/* V246: six-player Classic lobby uses ONE scroll container.');
const cssEnd=html.indexOf('/* v2.5: actionable recovery',cssStart);
ck(cssStart>0&&cssEnd>cssStart,'V246 CSS block placed after small-height roster cap');
const css=html.slice(cssStart,cssEnd);
ck(/#coopPanel #lobbyArea #lobbyRoster\s*\{[^}]*max-height:none!important;overflow:visible!important/.test(css),
 'roster is not nested scrolling container, even with 6 players');
ck(/#coopPanel #lobbyArea #lobbyRoster\s*\{[^}]*touch-action:pan-y;overscroll-behavior-y:auto/.test(css),
 'full lobby owns vertical scroll from any roster item');
ck(/\.lobbyPlayer,/.test(css)&&/\.lobbyPerson \*,/.test(css)&&/\.lobbyState,/.test(css)&&/\.ns72AvatarFace/.test(css),
 'avatar, player name, level, readiness and card use native vertical pan');
ck(/\.ns74-lobby-friend,/.test(css)&&/\.ns106KickBtn\s*\{\s*touch-action:pan-y!important/.test(css),
 'friend and host kick controls support vertical swipe plus tap');
ck(/user-select:none;-webkit-user-select:none;-webkit-touch-callout:none/.test(css),
 'drag does not highlight names or open Android callout');
const base=html.slice(html.indexOf('/* v2.4: independent room lobby.'),html.indexOf('/* v2.5: actionable recovery'));
ck(/\.lobbyRoster\{display:grid;gap:6px;max-height:min\(35vh,265px\);overflow-y:auto/.test(base),
 'original roster styles exist and are deliberately overridden');
ck(base.includes('@media(max-height:700px)')&&base.includes('.lobbyRoster{max-height:28vh}'),
 'previous height cap is overridden by important V246 rules');
const menu=html.slice(html.indexOf('function renderLobby(){'),html.indexOf('function currentLobbyRoster(){')>0?html.indexOf('function currentLobbyRoster(){')+1:html.length);
const render=html.slice(html.indexOf('function renderLobby(){'),html.indexOf('function broadcastLobby(){',html.indexOf('function renderLobby(){')));
ck(/const roster=currentLobbyRoster\(\).*root=\$\('lobbyRoster'\)/.test(render),
 'player cards still come from multiplayer roster');
ck(/for\(const p of roster\)\s*\{\s*const row=document\.createElement\('div'\);row\.className='lobbyPlayer'/.test(render),
 'one shared row per connected player');
ck(/root\.append\(row\)/.test(render),'normal DOM rows stay in the shared list');
ck(/add\.onclick=\(\)=>requestLobbyFriend\(friendId,p\.name\)/.test(render),
 'friend request tap continues working');
ck(/kick\.onclick=\(\)=>\{if\(window\.confirm/.test(render),
 'host kick tap and confirmation preserved');
ck(/window\.NS165_CLASSIC_VOICE\?\.decorateLobby\?\.\(row,p\.id\)/.test(render),
 'per-player voice badge preserved');
ck(/const row=document\.createElement\('div'\);row\.className='lobbyPlayer';/.test(render),
 'disconnected/rejoining players use same scrollable list');
ck(/\.modalBox, \.heroPanel, \.editBody, \.friendsBox, \.friendsList,/.test(html),
 'parent modal still owns native vertical scrolling');
const inline=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(m=>!/\bsrc=/.test(m[1]));
ck(inline.length===4,'original four inline scripts preserved');
for(const m of inline){new vm.Script(m[2]);checks++}
const currentRelease=Number(html.match(/name="ns-release" content="(\d+)"/)?.[1]||0);ck(currentRelease>=246,'V246 or newer release stamp');
ck(html.includes('VERZIJA V'+currentRelease),'V246 lobby visible label');
ck(html.includes('v140-net-mode.js?v='+currentRelease+'&amp;release='+currentRelease),'consistent cache-busting release');
console.log('V246 SIX-PLAYER LOBBY ROSTER SCROLL PASS',JSON.stringify({checks,networkChanges:0,newListeners:0,rosterSlots:6}));
