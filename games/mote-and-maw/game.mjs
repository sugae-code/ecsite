import { WORLD, STAGES, createGame, tick, pulse, setTarget, radius, stageFor, clamp } from './engine.mjs';
import { createCrazyGamesBridge, loadCrazyGamesSdk } from './crazygames-bridge.mjs';
// Change only after CrazyGames formally approves a monetized Full Launch.
const CRAZYGAMES_FULL_LAUNCH_APPROVED = false;
const $ = id => document.getElementById(id);
const canvas = $('scene');
const ctx = canvas.getContext('2d', { alpha: false });
let game = createGame();
let view = { width: 1, height: 1, scale: 1, cx: game.player.x, cy: game.player.y, dpr: 1 };
let last = performance.now();
let particles = [];
let waves = [];
let soundOn = false, audio = null, platformMuted = false;
const platform = createCrazyGamesBridge({
  hostname: window.location.hostname,
  loadSdk: () => loadCrazyGamesSdk(window),
  onMute: muted => {
    platformMuted = muted;
    if (muted && audio?.state === 'running') void audio.suspend().catch(() => {});
    if (!muted && soundOn && audio?.state === 'suspended') void audio.resume().catch(() => {});
  },
});
let toastUntil = 0, firstMove = false, best = 0;
const stageNames = ['SPARK', 'SHIMMER', 'GLIDER', 'RADIANT', 'STARLING', 'BLOOM'];
try { best = Number(localStorage.getItem('mote-maw-best-v1')) || 0; } catch (_) { /* Private mode. */ }
$('best').textContent = best.toLocaleString('en-US');
const starfield = Array.from({ length: 185 }, (_, i) => {
  const x = ((i * 137.508 + 37) % 1000) / 1000;
  const y = ((i * 269.341 + 71) % 1000) / 1000;
  return { x: x * WORLD.width, y: y * WORLD.height, r: .5 + (i % 5) * .27, a: .14 + (i % 7) * .045 };
});
function resize() {
  const rect = canvas.getBoundingClientRect();
  view.width = Math.max(1, rect.width); view.height = Math.max(1, rect.height);
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(view.width * view.dpr);
  canvas.height = Math.round(view.height * view.dpr);
  view.scale = clamp(Math.max(Math.min(view.width / 1050, view.height / 690), view.height / WORLD.height * 1.08), .48, 1.55);
}
window.addEventListener('resize', resize);
resize();
function worldFromClient(x, y) {
  const r = canvas.getBoundingClientRect();
  return { x: view.cx + (x - r.left - view.width / 2) / view.scale,
           y: view.cy + (y - r.top - view.height / 2) / view.scale };
}
function movePointer(e) {
  if (e.pointerType === 'touch' && e.type === 'pointermove' && e.buttons === 0) return;
  const t = worldFromClient(e.clientX, e.clientY);
  setTarget(game, t.x, t.y);
  firstMove = true;
}
canvas.addEventListener('pointerdown', e => { e.preventDefault(); canvas.setPointerCapture(e.pointerId); movePointer(e); });
canvas.addEventListener('pointermove', movePointer);
const keys = new Set();
function updateKeys() {
  game.keyboard.x = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
  game.keyboard.y = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
}
window.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key)) e.preventDefault();
  if (key === ' ' && !e.repeat) triggerPulse();
  if (key === 'enter' && game.status !== 'playing') restart();
  keys.add(key); updateKeys();
});
window.addEventListener('keyup', e => { keys.delete(e.key.toLowerCase()); updateKeys(); });
window.addEventListener('blur', () => { keys.clear(); updateKeys(); last = performance.now(); });
function tone(freq = 360, duration = .07, type = 'sine', gain = .045) {
  if (!soundOn || platformMuted) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const osc = audio.createOscillator(), volume = audio.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * .72, audio.currentTime + duration);
    volume.gain.setValueAtTime(gain, audio.currentTime);
    volume.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + duration);
    osc.connect(volume).connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
  } catch (_) { soundOn = false; $('sound').classList.remove('on'); }
}
$('sound').addEventListener('click', () => { soundOn = !soundOn; $('sound').classList.toggle('on', soundOn); $('sound').setAttribute('aria-label', soundOn ? 'Turn sound off' : 'Turn sound on'); if (soundOn) tone(520); });
function triggerPulse() { if (pulse(game)) { processEvents(); game.events = []; tone(170, .27, 'triangle', .12); updateHud(); } }
$('pulse').addEventListener('click', e => { e.preventDefault(); triggerPulse(); });
$('restart').addEventListener('click', restart);
function restart() {
  platform.start();
  game = createGame((Math.random() * 4294967295) >>> 0);
  particles = []; waves = []; keys.clear(); firstMove = false;
  view.cx = game.player.x; view.cy = game.player.y;
  $('result').hidden = true; updateKeys(); updateHud(); last = performance.now();
}
function toast(text) {
  $('toast').textContent = text; $('toast').classList.add('show'); toastUntil = performance.now() + 1600;
}
function updateHud() {
  const p = game.player, stage = stageFor(p.mass);
  $('score').textContent = game.score.toLocaleString('en-US');
  $('hearts').textContent = Array.from({ length: 3 }, (_, i) => i < p.hp ? '♥' : '♡').join(' ');
  $('hearts').setAttribute('aria-label', `${p.hp} lives`);
  $('stage').textContent = stageNames[stage];
  const prev = STAGES[Math.max(0, stage - 1)], next = STAGES[Math.min(stage, STAGES.length - 1)];
  $('mass').textContent = stage >= STAGES.length ? 'FULL BLOOM' : `${Math.floor(p.mass)} / ${next}`;
  $('growth-fill').style.width = `${stage >= STAGES.length ? 100 : clamp((p.mass - prev) / (next - prev) * 100, 0, 100)}%`;
  $('pulse').disabled = game.pulseCooldown > 0 || game.status !== 'playing' || p.mass < 36;
  $('cooldown').textContent = game.pulseCooldown > 0 ? `${game.pulseCooldown.toFixed(1)}s RECHARGE` : 'SPACE · -13% SIZE';
}
function finish() {
  platform.stop();
  best = Math.max(best, game.score);
  try { localStorage.setItem('mote-maw-best-v1', String(best)); } catch (_) { /* Storage optional. */ }
  $('best').textContent = best.toLocaleString('en-US');
  $('outcome').textContent = game.status === 'won' ? 'FULL BLOOM' : 'THE TIDE RESTS';
  $('result-title').textContent = game.status === 'won' ? 'You lit the deep.' : 'One more glow?';
  $('result-detail').textContent = game.status === 'won' ? 'A tiny spark became its own sunrise.' : 'Every small light makes the next run brighter.';
  $('final-score').textContent = game.score.toLocaleString('en-US');
  $('final-best').textContent = best.toLocaleString('en-US');
  $('result').hidden = false;
  tone(game.status === 'won' ? 700 : 190, .4, 'triangle', .09);
  // An interstitial is allowed only at a real round break, never during play.
  // CrazyGames Basic Launch is not monetized, so this remains inactive until approval.
  if (CRAZYGAMES_FULL_LAUNCH_APPROVED && game.time >= 180) {
    $('restart').disabled = true;
    void platform.midgameAd({
      approved: true,
      onStart: () => { if (audio?.state === 'running') void audio.suspend().catch(() => {}); },
      onFinish: () => {
        if (soundOn && !platformMuted && audio?.state === 'suspended') void audio.resume().catch(() => {});
        $('restart').disabled = false;
      },
    }).then(() => { $('restart').disabled = false; });
  }
}
function processEvents() {
  for (const e of game.events) {
    if (e.type === 'eat') {
      const count = e.big ? 16 : 6;
      for (let i = 0; i < count; i++) {
        const a = i / count * Math.PI * 2;
        const s = 35 + Math.random() * (e.big ? 110 : 65);
        particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .5 + Math.random() * .35, max: .85, hue: e.hue });
      }
      if (game.combo % 5 === 0) tone(470 + game.combo * 20, .11);
      else if (e.big) tone(520, .15);
    } else if (e.type === 'pulse') waves.push({ x: e.x, y: e.y, age: 0, life: .52, hue: 166 });
    else if (e.type === 'hit') { waves.push({ x: e.x, y: e.y, age: 0, life: .7, hue: 350 }); tone(125, .25, 'sawtooth', .07); }
    else if (e.type === 'evolve') { waves.push({ x: e.x, y: e.y, age: 0, life: 1.2, hue: 55 }); toast(stageNames[stageFor(game.player.mass)] + ' ✦'); tone(700, .24); }
    else if (e.type === 'end') finish();
  }
}
function drawBackground(time) {
  const { width:w, height:h, dpr } = view;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const g = ctx.createRadialGradient(w*.53,h*.4,10,w*.5,h*.5,Math.max(w,h)*.82);
  g.addColorStop(0,'#143846'); g.addColorStop(.5,'#0c2435'); g.addColorStop(1,'#06131f');
  ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
  ctx.save(); ctx.translate(w/2-view.cx*view.scale,h/2-view.cy*view.scale); ctx.scale(view.scale,view.scale);
  for (const s of starfield) {
    ctx.globalAlpha = s.a * (.7 + .3 * Math.sin(time*.8 + s.x));
    ctx.fillStyle = '#c5fff3'; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = .07; ctx.strokeStyle = '#64b2c1'; ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD.width; x += 90) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,WORLD.height); ctx.stroke(); }
  for (let y = 0; y <= WORLD.height; y += 90) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(WORLD.width,y); ctx.stroke(); }
  ctx.globalAlpha = .3; ctx.strokeStyle = '#6aebd7'; ctx.lineWidth = 5; ctx.strokeRect(0,0,WORLD.width,WORLD.height);
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawMote(e, time) {
  const r = radius(e.mass) * .65;
  const pulse = 1 + .1 * Math.sin(time * 3 + e.phase * 2);
  ctx.save(); ctx.translate(e.x,e.y); ctx.rotate(e.phase * .25);
  ctx.shadowColor = `hsla(${e.hue}, 90%, 70%, .9)`; ctx.shadowBlur = 18;
  const g = ctx.createRadialGradient(-r*.3,-r*.3,1,0,0,r*pulse);
  g.addColorStop(0,'#fffdec'); g.addColorStop(.38,`hsl(${e.hue}, 90%, 74%)`); g.addColorStop(1,`hsla(${e.hue}, 88%, 48%, .25)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0,0,r*pulse,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawMaw(e, time) {
  const r = radius(e.mass);
  ctx.save(); ctx.translate(e.x,e.y); ctx.rotate(Math.atan2(e.vy,e.vx));
  ctx.shadowColor = '#ff497e'; ctx.shadowBlur = 16;
  ctx.fillStyle = '#9e385c'; ctx.beginPath();
  for(let i=0;i<20;i++){ const a=i/20*Math.PI*2,rr=r*(i%2 ? .91 : 1.12); if(i===0)ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);else ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr); }
  ctx.closePath();ctx.fill();ctx.shadowBlur=0;
  const g=ctx.createRadialGradient(-r*.2,-r*.2,1,0,0,r);
  g.addColorStop(0,'#ffb4ae');g.addColorStop(.35,'#f26d87');g.addColorStop(1,'#702c56');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r*.88,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#2c1b36';ctx.beginPath();ctx.arc(r*.26,-r*.25,r*.13,0,Math.PI*2);ctx.arc(r*.26,r*.25,r*.13,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(r*.30,-r*.28,r*.045,0,Math.PI*2);ctx.arc(r*.30,r*.22,r*.045,0,Math.PI*2);ctx.fill();
  if(e.stun>0){ctx.strokeStyle='#c2fff9';ctx.globalAlpha=e.stun;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r+8+Math.sin(time*9)*3,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
}
function drawPlayer(time) {
  const p=game.player, r=radius(p.mass), stage=stageFor(p.mass);
  ctx.save();ctx.translate(p.x,p.y);
  if(game.invincible>0 && Math.floor(time*12)%2===0)ctx.globalAlpha=.62;
  for(let i=0;i<3+stage;i++){
    const a=i/(3+stage)*Math.PI*2+time*.6;
    const dist=r*(1.38+stage*.02);
    ctx.fillStyle=`hsla(${165+stage*14},95%,78%,.55)`;
    ctx.beginPath();ctx.arc(Math.cos(a)*dist,Math.sin(a)*dist,3+stage*.4,0,Math.PI*2);ctx.fill();
  }
  ctx.shadowColor='#62ffe3';ctx.shadowBlur=32;
  const g=ctx.createRadialGradient(-r*.25,-r*.34,2,0,0,r);
  g.addColorStop(0,'#faffea');g.addColorStop(.37,'#9cf8dd');g.addColorStop(.72,stage>2?'#56d9e6':'#3fc4b9');g.addColorStop(1,'#277d98');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.strokeStyle='#dbffebaa';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r*.83,-1.8,.7);ctx.stroke();
  const eyeX=Math.cos(time*.8)*r*.09;
  ctx.fillStyle='#12374b';ctx.beginPath();ctx.arc(-r*.22+eyeX,-r*.07,r*.095,0,Math.PI*2);ctx.arc(r*.22+eyeX,-r*.07,r*.095,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#12374b';ctx.lineWidth=Math.max(1.5,r*.065);ctx.lineCap='round';ctx.beginPath();ctx.arc(eyeX,r*.08,r*.21,.18,Math.PI-.18);ctx.stroke();
  if(game.pulseCooldown<=0){ctx.strokeStyle='#aaffed66';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r+9+Math.sin(time*3)*3,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
}
function draw(time) {
  drawBackground(time);
  const {width:w,height:h,dpr}=view;
  ctx.save();ctx.setTransform(dpr*view.scale,0,0,dpr*view.scale,dpr*(w/2-view.cx*view.scale),dpr*(h/2-view.cy*view.scale));
  for(const e of game.entities) if(e.kind==='mote')drawMote(e,time);
  for(const e of game.entities) if(e.kind==='maw')drawMaw(e,time);
  for(const wave of waves){ctx.globalAlpha=(1-wave.age/wave.life)*.7;ctx.strokeStyle=`hsl(${wave.hue},95%,75%)`;ctx.lineWidth=5;ctx.beginPath();ctx.arc(wave.x,wave.y,20+wave.age/wave.life*245,0,Math.PI*2);ctx.stroke();}
  ctx.globalAlpha=1;
  for(const part of particles){ctx.globalAlpha=clamp(part.life/part.max,0,1);ctx.fillStyle=`hsl(${part.hue},95%,76%)`;ctx.beginPath();ctx.arc(part.x,part.y,2.6,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;drawPlayer(time);ctx.restore();
}
function frame(now) {
  const dt=Math.min((now-last)/1000,.05);last=now;
  if(game.status==='playing'){
    tick(game,dt);processEvents();
    const p=game.player;
    view.cx+=(p.x-view.cx)*Math.min(1,dt*7);
    view.cy+=(p.y-view.cy)*Math.min(1,dt*7);
    updateHud();
    if(!firstMove && game.time>5) $('hint').style.opacity='.72';
  }
  particles=particles.filter(p=>p.life>0);
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
  waves=waves.filter(w=>w.age<w.life);
  for(const w of waves)w.age+=dt;
  if(now>toastUntil)$('toast').classList.remove('show');
  draw(now/1000);requestAnimationFrame(frame);
}
updateHud();
platform.start();
void platform.init();
requestAnimationFrame(frame);
Object.defineProperty(window,'moteMawQA',{get:()=>Object.freeze({status:game.status,score:game.score,mass:game.player.mass,health:game.player.hp,entities:game.entities.length,time:game.time,canvas:{width:canvas.width,height:canvas.height}})});
