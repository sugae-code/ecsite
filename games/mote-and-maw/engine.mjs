// Mote & Maw — original deterministic simulation, no dependencies.
export const WORLD = { width: 1760, height: 1120 };
export const STAGES = [160, 330, 620, 1050, 1750];
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const radius = mass => 8 + Math.sqrt(Math.max(1, mass)) * 1.45;
export const stageFor = mass => STAGES.reduce((n, threshold) => n + Number(mass >= threshold), 0);

function random(state) {
  let x = state.seed >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  state.seed = x >>> 0;
  return state.seed / 4294967296;
}
const between = (s, a, b) => a + (b - a) * random(s);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function spawn(state, type = 'mote', safe = 170) {
  const p = state.player;
  let x = 0, y = 0;
  for (let i = 0; i < 40; i++) {
    x = between(state, 55, WORLD.width - 55);
    y = between(state, 55, WORLD.height - 55);
    if (Math.hypot(x - p.x, y - p.y) > safe) break;
  }
  if (Math.hypot(x - p.x, y - p.y) < safe) return null;
  const dangerous = type === 'maw';
  const mass = dangerous
    ? between(state, Math.max(115, p.mass * 0.85), Math.max(240, p.mass * 2.1))
    : between(state, 8, Math.min(100, 34 + p.mass * 0.075));
  const angle = between(state, 0, Math.PI * 2);
  const e = {
    id: ++state.nextId, kind: type, x, y, mass,
    vx: Math.cos(angle) * between(state, 8, 34),
    vy: Math.sin(angle) * between(state, 8, 34),
    hue: dangerous ? between(state, 328, 359) : between(state, 38, 185),
    phase: between(state, 0, Math.PI * 2),
    stun: 0
  };
  state.entities.push(e);
  return e;
}

export function createGame(seed = 0x9e3779b9) {
  const state = {
    seed: seed >>> 0 || 1, nextId: 0, time: 0, score: 0,
    combo: 0, comboTimer: 0, pulseCooldown: 0, invincible: 1.5,
    status: 'playing', events: [], entities: [],
    player: { x: WORLD.width / 2, y: WORLD.height / 2, mass: 64, hp: 3, vx: 0, vy: 0 },
    target: null, keyboard: { x: 0, y: 0 },
  };
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const d = between(state, 85, 410);
    const e = spawn(state, 'mote', 0);
    if (e) {
      e.x = clamp(state.player.x + Math.cos(a) * d, 35, WORLD.width - 35);
      e.y = clamp(state.player.y + Math.sin(a) * d, 35, WORLD.height - 35);
    }
  }
  for (let i = 0; i < 60; i++) spawn(state, 'mote', 125);
  for (let i = 0; i < 7; i++) spawn(state, 'maw', 410);
  return state;
}

export function setTarget(state, x, y) {
  if (Number.isFinite(x) && Number.isFinite(y)) {
    state.target = { x: clamp(x, 0, WORLD.width), y: clamp(y, 0, WORLD.height) };
  }
}

export function pulse(state) {
  if (state.status !== 'playing' || state.pulseCooldown > 0 || state.player.mass < 36) return false;
  const p = state.player;
  p.mass *= 0.87;
  state.pulseCooldown = 5.2;
  state.invincible = Math.max(state.invincible, 0.4);
  for (const e of state.entities) {
    const dx = e.x - p.x, dy = e.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 250) {
      const force = (1 - d / 250) * 760;
      e.vx += dx / d * force;
      e.vy += dy / d * force;
      e.stun = 1.1;
    }
  }
  state.events.push({ type: 'pulse', x: p.x, y: p.y });
  return true;
}

export function tick(state, dt) {
  if (state.status !== 'playing') return state;
  dt = clamp(dt, 0, 0.05);
  state.events = [];
  state.time += dt;
  state.comboTimer = Math.max(0, state.comboTimer - dt);
  if (!state.comboTimer) state.combo = 0;
  state.pulseCooldown = Math.max(0, state.pulseCooldown - dt);
  state.invincible = Math.max(0, state.invincible - dt);
  const p = state.player;
  const speed = clamp(265 - radius(p.mass) * 0.9, 150, 250);
  let dx = state.keyboard.x, dy = state.keyboard.y;
  if (!dx && !dy && state.target) {
    dx = state.target.x - p.x; dy = state.target.y - p.y;
    if (Math.hypot(dx, dy) < 10) { dx = 0; dy = 0; }
  }
  const len = Math.hypot(dx, dy);
  const desiredX = len ? dx / len * speed : 0;
  const desiredY = len ? dy / len * speed : 0;
  const smooth = 1 - Math.exp(-dt * 9);
  p.vx += (desiredX - p.vx) * smooth;
  p.vy += (desiredY - p.vy) * smooth;
  p.x = clamp(p.x + p.vx * dt, radius(p.mass), WORLD.width - radius(p.mass));
  p.y = clamp(p.y + p.vy * dt, radius(p.mass), WORLD.height - radius(p.mass));

  for (let i = state.entities.length - 1; i >= 0; i--) {
    const e = state.entities[i];
    e.phase += dt;
    e.stun = Math.max(0, e.stun - dt);
    const dist = distance(e, p);
    if (e.kind === 'maw' && !e.stun && dist < 350) {
      const towards = e.mass > p.mass * 1.15 ? 1 : -1;
      const aim = clamp((350 - dist) / 350, 0, 1);
      e.vx += (p.x - e.x) / Math.max(1, dist) * towards * aim * 55 * dt;
      e.vy += (p.y - e.y) / Math.max(1, dist) * towards * aim * 55 * dt;
    }
    if (e.kind === 'mote' && dist < 95) {
      e.vx += (e.x - p.x) / Math.max(1, dist) * 45 * dt;
      e.vy += (e.y - p.y) / Math.max(1, dist) * 45 * dt;
    }
    const maxSpeed = e.kind === 'maw' ? 110 : 46;
    const velocity = Math.hypot(e.vx, e.vy);
    if (velocity > maxSpeed) { e.vx *= maxSpeed / velocity; e.vy *= maxSpeed / velocity; }
    e.x += e.vx * dt; e.y += e.vy * dt;
    if (e.x < 22 || e.x > WORLD.width - 22) e.vx *= -1;
    if (e.y < 22 || e.y > WORLD.height - 22) e.vy *= -1;
    e.x = clamp(e.x, 22, WORLD.width - 22);
    e.y = clamp(e.y, 22, WORLD.height - 22);
    if (distance(e, p) >= radius(e.mass) + radius(p.mass) - 5) continue;
    if (p.mass > e.mass * 1.17) {
      const oldStage = stageFor(p.mass);
      p.mass += e.mass * (e.kind === 'maw' ? 0.16 : 0.42);
      state.combo = state.comboTimer > 0 ? Math.min(8, state.combo + 1) : 1;
      state.comboTimer = 2.4;
      state.score += Math.round(e.mass * (1 + (state.combo - 1) * 0.15));
      state.events.push({ type: 'eat', x: e.x, y: e.y, hue: e.hue, big: e.kind === 'maw' });
      state.entities.splice(i, 1);
      if (stageFor(p.mass) > oldStage) state.events.push({ type: 'evolve', x: p.x, y: p.y });
    } else if (e.mass > p.mass * 1.17 && state.invincible === 0) {
      p.hp -= 1;
      p.mass = Math.max(32, p.mass * 0.76);
      state.combo = 0;
      state.invincible = 2;
      const awayX = (p.x - e.x) / Math.max(1, dist), awayY = (p.y - e.y) / Math.max(1, dist);
      p.x = clamp(p.x + awayX * 35, 25, WORLD.width - 25);
      p.y = clamp(p.y + awayY * 35, 25, WORLD.height - 25);
      state.events.push({ type: 'hit', x: p.x, y: p.y });
      if (p.hp <= 0) { state.status = 'lost'; state.events.push({ type: 'end' }); }
    }
  }
  if (p.mass >= STAGES[STAGES.length - 1]) {
    state.status = 'won'; state.events.push({ type: 'end' });
  }
  const foodCount = state.entities.filter(e => e.kind === 'mote').length;
  const predatorCount = state.entities.length - foodCount;
  if (foodCount < 88 && random(state) < dt * 8) spawn(state, 'mote', 170);
  if (predatorCount < 10 + Math.floor(state.time / 50) && random(state) < dt * 0.6) spawn(state, 'maw', 390);
  return state;
}
