import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD, STAGES, clamp, radius, stageFor, createGame, tick, pulse, setTarget, spawn } from './engine.mjs';

test('deterministic safe starting state', () => {
  const a=createGame(123),b=createGame(123);
  assert.deepEqual(a,b);
  assert.equal(a.player.hp,3);
  assert.equal(a.status,'playing');
  assert.ok(a.entities.filter(e=>e.kind==='mote').length>=70);
  assert.ok(a.entities.filter(e=>e.kind==='maw').every(e=>Math.hypot(e.x-a.player.x,e.y-a.player.y)>400));
});
test('radius and growth tiers are monotonic', () => {
  assert.ok(radius(100)>radius(64));
  assert.deepEqual(STAGES.map(stageFor),[1,2,3,4,5]);
  assert.equal(stageFor(64),0);
  assert.equal(clamp(-1,0,1),0);
});
test('movement is bounded and framerate independent within tolerance', () => {
  const a=createGame(4),b=createGame(4);
  a.entities=[];b.entities=[];
  setTarget(a,WORLD.width,WORLD.height);setTarget(b,WORLD.width,WORLD.height);
  for(let i=0;i<120;i++)tick(a,1/60);
  for(let i=0;i<240;i++)tick(b,1/120);
  assert.ok(Math.abs(a.player.x-b.player.x)<4);
  assert.ok(Math.abs(a.player.y-b.player.y)<4);
  assert.ok(a.player.x<=WORLD.width-radius(a.player.mass));
});
test('absorbing smaller entities grows and scores, combo resets', () => {
  const s=createGame(8);s.entities=[{id:1,kind:'mote',x:s.player.x,y:s.player.y,mass:12,vx:0,vy:0,hue:50,phase:0,stun:0}];
  tick(s,.016);
  assert.ok(s.player.mass>64);assert.ok(s.score>=12);assert.equal(s.entities.length,0);
  assert.equal(s.combo,1);
  tick(s,2.5);
  for(let i=0;i<60;i++)tick(s,.05);
  assert.equal(s.combo,0);
});
test('larger predator hurts once during invulnerability window', () => {
  const s=createGame(10);s.invincible=0;
  const e={id:1,kind:'maw',x:s.player.x,y:s.player.y,mass:400,vx:0,vy:0,hue:350,phase:0,stun:0};
  s.entities=[e];
  tick(s,.016);assert.equal(s.player.hp,2);
  e.x=s.player.x;e.y=s.player.y;tick(s,.016);assert.equal(s.player.hp,2);
});
test('pulse costs mass, repels threats and respects cooldown', () => {
  const s=createGame(2);s.entities=[{id:1,kind:'maw',x:s.player.x+60,y:s.player.y,mass:180,vx:0,vy:0,hue:340,phase:0,stun:0}];
  assert.equal(pulse(s),true);assert.ok(s.player.mass<64);
  assert.ok(s.entities[0].vx>0);assert.ok(s.entities[0].stun>0);
  assert.equal(pulse(s),false);
  for(let i=0;i<105;i++)tick(s,.05);
  assert.equal(s.pulseCooldown,0);
});
test('win and loss are terminal and do not mutate on further tick', () => {
  const w=createGame(5);w.entities=[];w.player.mass=1750;tick(w,.016);
  assert.equal(w.status,'won');const time=w.time;tick(w,.016);assert.equal(w.time,time);
  const l=createGame(6);l.entities=[];l.player.hp=1;l.invincible=0;
  l.entities.push({id:1,kind:'maw',x:l.player.x,y:l.player.y,mass:900,vx:0,vy:0,hue:350,phase:0,stun:0});
  tick(l,.016);assert.equal(l.status,'lost');
});
test('safe spawning avoids player and remains inside world', () => {
  const s=createGame(17);
  for(let i=0;i<50;i++){
    const e=spawn(s,'maw',300);
    if(e){assert.ok(Math.hypot(e.x-s.player.x,e.y-s.player.y)>=300);assert.ok(e.x>=0&&e.x<=WORLD.width);}
  }
});
