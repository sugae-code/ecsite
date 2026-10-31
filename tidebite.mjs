import {W,H,render} from "./tidebite-render.mjs";
import {tideNumber,secondsToNextTide,fishRadiusRange} from "./tidebite-rules.mjs";
const $=id=>document.getElementById(id);
const canvas=$("game"),ctx=canvas.getContext("2d",{alpha:false});
const rnd=(a,b)=>a+Math.random()*(b-a);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const colors=["#f4b979","#ff9aab","#92f4d9","#a7b7fa","#d6a4f4","#82c7fa"];
let state="menu",elapsed=0,tide=1,score=0,combo=0,comboLeft=0,spawnTimer=0,clock=0,toastLeft=0;
let fish=[],bubbles=[],fx=[],pointer=false,keys=new Set(),sound=false,audio=null;
let best=0,last=performance.now();
try{best=Number(localStorage.getItem("tidebite-best")||0)||0;}catch(e){}
let p={x:W/2,y:H/2,r:21,dir:1,vx:0,vy:0,tx:W/2,ty:H/2,hp:3,inv:0,energy:100};
function ping(freq=450,sec=.09,kind="sine"){
 if(!sound)return;
 try{
  audio=audio||new (window.AudioContext||window.webkitAudioContext)();
  const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;
  o.type=kind;o.frequency.setValueAtTime(freq,t);
  o.frequency.exponentialRampToValueAtTime(Math.max(85,freq*.54),t+sec);
  g.gain.setValueAtTime(.042,t);g.gain.exponentialRampToValueAtTime(.001,t+sec);
  o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+sec+.01);
 }catch(e){}
}
function spawn(initial=false){
 if(fish.length>=44)return;
 const side=Math.floor(rnd(0,4));
 const [minRadius,maxRadius]=fishRadiusRange(p.r,elapsed,Math.random());
 const r=rnd(minRadius,maxRadius);
 const x=initial?rnd(20,W-20):(side===0?-r*2:side===1?W+r*2:rnd(0,W));
 const y=initial?rnd(78,H-15):(side===2?-r*2:side===3?H+r*2:rnd(65,H-10));
 if(initial&&Math.hypot(x-p.x,y-p.y)<150)return;
 const dir=side===0?1:side===1?-1:(Math.random()<.5?-1:1);
 const speed=rnd(27,63);
 fish.push({x,y,r,dir,color:colors[Math.floor(rnd(0,colors.length))],vx:dir*speed,vy:rnd(-20,20),speed,phase:rnd(0,6.28),brain:rnd(.5,1.6),dead:false});
}
function particles(x,y,color,n=12){
 for(let i=0;i<n;i++)fx.push({x,y,vx:rnd(-145,145),vy:rnd(-145,145),r:rnd(2,5),life:rnd(.28,.6),color});
}
function showToast(t){$("toast").textContent=t;toastLeft=1;}
function hud(){
 $("score").textContent=score.toLocaleString("en-US");
 $("size").textContent=(p.r/21).toFixed(1)+"×";
 $("time").textContent=secondsToNextTide(elapsed);
 $("tide").textContent=tide;
 $("lives").textContent="♥".repeat(p.hp)+"♡".repeat(3-p.hp);
 $("energybar").style.width=Math.floor(p.energy)+"%";
}
function reset(){
 state="play";elapsed=score=combo=comboLeft=spawnTimer=clock=toastLeft=0;tide=1;
 pointer=false;fish=[];fx=[];bubbles=[];
 p={x:W/2,y:H/2,r:21,dir:1,vx:0,vy:0,tx:W/2,ty:H/2,hp:3,inv:0,energy:100};
 for(let i=0;i<34;i++)bubbles.push({x:rnd(0,W),y:rnd(0,H),r:rnd(1,4),v:rnd(8,30),phase:rnd(0,6.28)});
 for(let i=0;i<30;i++)spawn(true);
 $("overlay").hidden=true;$("pause").textContent="PAUSE";
 hud();last=performance.now();ping(680);
}
function finish(){
 state="over";pointer=false;
 if(score>best){best=score;try{localStorage.setItem("tidebite-best",String(best))}catch(e){}}
 const title="The ocean <em>wins.</em>";
 $("overlay").querySelector("h1").innerHTML=title;
 $("overlay").querySelector("p").innerHTML="Score: <b>"+score.toLocaleString("en-US")+"</b> · Best: <b>"+best.toLocaleString("en-US")+"</b><br>One more dive?";
 $("result").textContent="Eat the smaller fish and keep your streak alive!";
 $("play").textContent="PLAY AGAIN";
 $("overlay").hidden=false;ping(250,.3);
}
function pause(){
 if(state==="play"){state="paused";$("pause").textContent="RESUME";}
 else if(state==="paused"){state="play";$("pause").textContent="PAUSE";last=performance.now();}
}
function dash(){
 if(state!=="play"||p.energy<35)return;
 p.energy-=35;
 let dx=p.tx-p.x,dy=p.ty-p.y;
 if(keys.has("ArrowLeft")||keys.has("KeyA"))dx=-1;
 if(keys.has("ArrowRight")||keys.has("KeyD"))dx=1;
 if(keys.has("ArrowUp")||keys.has("KeyW"))dy=-1;
 if(keys.has("ArrowDown")||keys.has("KeyS"))dy=1;
 const len=Math.hypot(dx,dy)||1;
 p.vx+=dx/len*340;p.vy+=dy/len*340;
 particles(p.x,p.y,"#90ffec",14);ping(780,.11,"triangle");
}
function tick(dt){
 clock+=dt;
 for(const b of bubbles){
  b.y-=b.v*dt;b.x+=Math.sin(clock+b.phase)*3*dt;
  if(b.y<0){b.y=H;b.x=rnd(0,W);}
 }
 for(const e of fx){e.x+=e.vx*dt;e.y+=e.vy*dt;e.life-=dt;}
 fx=fx.filter(x=>x.life>0);
 toastLeft=Math.max(0,toastLeft-dt);$("toast").style.opacity=Math.min(1,toastLeft*2);
 if(state!=="play")return;
 elapsed+=dt;
 const newTide=tideNumber(elapsed);
 if(newTide>tide){
  tide=newTide;
  score+=tide*120;
  p.energy=100;
  if(tide%2===0)p.hp=Math.min(3,p.hp+1);
  showToast("TIDE "+tide+" · BONUS!");
  ping(690,.17,"triangle");
 }
 p.inv=Math.max(0,p.inv-dt);p.energy=clamp(p.energy+dt*11,0,100);
 comboLeft-=dt;if(comboLeft<=0)combo=0;
 let dx=0,dy=0;
 if(keys.has("ArrowLeft")||keys.has("KeyA"))dx--;
 if(keys.has("ArrowRight")||keys.has("KeyD"))dx++;
 if(keys.has("ArrowUp")||keys.has("KeyW"))dy--;
 if(keys.has("ArrowDown")||keys.has("KeyS"))dy++;
 if(dx||dy){pointer=false;const l=Math.hypot(dx,dy);dx/=l;dy/=l;}
 else if(pointer){const x=p.tx-p.x,y=p.ty-p.y,l=Math.hypot(x,y);if(l>8){dx=x/l;dy=y/l;}}
 const speed=190-Math.min(46,(p.r-21)*.6);
 p.vx=p.vx*.83+dx*speed*.17;
 p.vy=p.vy*.83+dy*speed*.17;
 p.x=clamp(p.x+p.vx*dt,p.r+10,W-p.r-10);
 p.y=clamp(p.y+p.vy*dt,p.r+65,H-p.r-15);
 if(Math.abs(p.vx)>4)p.dir=p.vx>0?1:-1;
 spawnTimer+=dt;
 if(spawnTimer>Math.max(.37,.78-elapsed*.003)){spawnTimer=0;spawn();}
 for(const f of fish){
  f.phase+=dt*3;
  const deltaX=p.x-f.x,deltaY=p.y-f.y,d=Math.hypot(deltaX,deltaY)||1;
  const intent=d<230&&f.r>p.r*1.2?1:d<165&&f.r<p.r*.83?-1:0;
  const vx=(f.dir*f.speed*.65+intent*deltaX/d*f.speed*.9);
  const vy=(Math.sin(f.phase)*15+intent*deltaY/d*f.speed*.7);
  f.vx+=(vx-f.vx)*dt*f.brain;f.vy+=(vy-f.vy)*dt*f.brain;
  f.x+=f.vx*dt;f.y+=f.vy*dt;
  if(Math.abs(f.vx)>2)f.dir=f.vx>0?1:-1;
  if(f.y<f.r+66)f.vy+=45*dt;
  if(f.y>H-f.r-20)f.vy-=45*dt;
  if(f.x<-130||f.x>W+130||f.y<-140||f.y>H+130){f.dead=true;continue;}
  if(Math.hypot(f.x-p.x,f.y-p.y)>(p.r+f.r)*.71)continue;
  if(f.r<=p.r*.91){
   f.dead=true;combo++;comboLeft=2.7;
   const value=Math.round((12+f.r*3)*Math.min(8,combo));
   score+=value;p.r=clamp(p.r+.35+f.r*.017,21,86);
   p.energy=clamp(p.energy+3.5,0,100);
   particles(f.x,f.y,f.color,8);ping(340+Math.min(combo*55,500),.07);
   if(combo>=4&&combo%4===0)showToast(combo+"× COMBO!");
  }else if(f.r>p.r*1.17&&p.inv===0){
   p.hp--;p.inv=1.65;p.r=Math.max(21,p.r-3);
   particles(p.x,p.y,"#ff8299",23);ping(155,.25,"sawtooth");
   showToast("WATCH OUT!");
   if(p.hp<=0){finish();break;}
  }
 }
 fish=fish.filter(x=>!x.dead);
 hud();
}
function animate(now){
 const dt=Math.max(0,Math.min(.033,(now-last)/1000||.016));last=now;
 tick(dt);
 render(ctx,{clock,p,fish,bubbles,fx,playing:state!=="menu",paused:state==="paused",energy:p.energy});
 requestAnimationFrame(animate);
}
function aim(e){
 const rect=canvas.getBoundingClientRect();
 p.tx=clamp((e.clientX-rect.left)/rect.width*W,0,W);
 p.ty=clamp((e.clientY-rect.top)/rect.height*H,0,H);
 pointer=true;
}
canvas.addEventListener("pointermove",e=>{if(state==="play"&&(e.pointerType==="mouse"||e.buttons))aim(e);});
canvas.addEventListener("pointerdown",e=>{if(state==="play"){aim(e);if(e.pointerType!=="mouse")canvas.setPointerCapture(e.pointerId);}});
window.addEventListener("keydown",e=>{
 if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space","KeyW","KeyA","KeyS","KeyD"].includes(e.code))e.preventDefault();
 if(e.code==="Enter"&&(state==="menu"||state==="over"))reset();
 if(e.code==="KeyP"&&!e.repeat)pause();
 if(e.code==="Space"&&!e.repeat)dash();
 keys.add(e.code);
});
window.addEventListener("keyup",e=>keys.delete(e.code));
window.addEventListener("blur",()=>{keys.clear();if(state==="play")pause();});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&state==="play")pause();});
$("play").addEventListener("click",reset);
$("pause").addEventListener("click",pause);
$("dash").addEventListener("pointerdown",e=>{e.preventDefault();dash();});
$("sound").addEventListener("click",()=>{sound=!sound;$("sound").textContent=sound?"🔊 SOUND":"🔇 SOUND";if(sound)ping(700,.08);});
$("result").textContent+=" · Best: "+best.toLocaleString("en-US");
for(let i=0;i<28;i++)bubbles.push({x:rnd(0,W),y:rnd(0,H),r:rnd(1,4),v:rnd(8,30),phase:rnd(0,6.28)});
requestAnimationFrame(animate);
