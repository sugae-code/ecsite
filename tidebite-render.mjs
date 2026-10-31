export const W=960,H=540;
const TAU=Math.PI*2;
function shape(c,f,clock,hero=false){
 const r=f.r;
 c.save();c.translate(f.x,f.y);c.scale(f.dir||1,1);
 c.fillStyle=hero?"#5cf1d5":f.color;
 c.shadowColor=hero?"#9cfff3":"#06243c";c.shadowBlur=hero?21:10;
 c.beginPath();c.moveTo(-r,-r*.3);
 c.lineTo(-r*1.72,Math.sin(clock*14+f.x)*r*.25);
 c.lineTo(-r,r*.5);c.closePath();c.fill();
 c.beginPath();c.ellipse(0,0,r*1.25,r*.85,0,0,TAU);c.fill();
 c.shadowBlur=0;c.fillStyle="#ffffff5c";c.beginPath();
 c.ellipse(-r*.09,-r*.34,r*.65,r*.15,0,0,TAU);c.fill();
 c.fillStyle=hero?"#1d98a8":"#1f5a73";
 c.beginPath();c.moveTo(-r*.18,0);c.lineTo(-r*.35,r*.6);c.lineTo(r*.35,r*.31);c.closePath();c.fill();
 c.fillStyle="#fff";c.beginPath();c.arc(r*.66,-r*.17,r*.16,0,TAU);c.fill();
 c.fillStyle="#06334a";c.beginPath();c.arc(r*.71,-r*.17,r*.08,0,TAU);c.fill();
 c.strokeStyle="#0b355caa";c.lineWidth=Math.max(1, r*.05);c.beginPath();c.arc(r*.65,r*.12,r*.22,.2,1.2);c.stroke();
 if(hero){c.strokeStyle="#b0fff0";c.lineWidth=3;c.beginPath();c.ellipse(0,0,r*1.25+3,r*.85+3,0,0,TAU);c.stroke();}
 c.restore();
}
export function render(c,s){
 const {clock,p,fish,bubbles,fx,playing,paused,energy}=s;
 const bg=c.createLinearGradient(0,0,0,H);
 bg.addColorStop(0,"#095277");bg.addColorStop(.7,"#07546b");bg.addColorStop(1,"#062a48");
 c.fillStyle=bg;c.fillRect(0,0,W,H);
 c.globalAlpha=.10;c.fillStyle="#caffff";
 for(let i=0;i<7;i++){const x=i*167+Math.sin(clock*.55+i)*30;
 c.beginPath();c.moveTo(x,0);c.lineTo(x-95,H);c.lineTo(x+55,H);c.closePath();c.fill();}
 c.globalAlpha=1;
 for(const b of bubbles){c.strokeStyle="#aef2f84f";c.lineWidth=1.2;c.beginPath();c.arc(b.x,b.y,b.r,0,TAU);c.stroke();}
 c.fillStyle="#0b3e55";c.beginPath();c.moveTo(0,H);
 for(let x=0;x<=W;x+=16)c.lineTo(x,H-20-Math.sin(x*.023+clock*.3)*9);
 c.lineTo(W,H);c.closePath();c.fill();
 for(let i=0;i<27;i++){const x=18+i*36,height=14+(i%5)*12;
 c.strokeStyle=i%2?"#2f888b":"#306d86";c.lineWidth=4;
 c.beginPath();c.moveTo(x,H);c.quadraticCurveTo(x+11,H-height*.55,x+Math.sin(clock*1.6+i)*9,H-height);c.stroke();}
 for(const f of [...fish].sort((a,b)=>a.r-b.r))shape(c,f,clock);
 if(playing&&!(p.inv>0&&Math.sin(clock*22)>0))shape(c,p,clock,true);
 for(const e of fx){c.globalAlpha=Math.max(0,e.life/.6);c.fillStyle=e.color;c.beginPath();c.arc(e.x,e.y,e.r,0,TAU);c.fill();}
 c.globalAlpha=1;
 if(playing){c.fillStyle="#073449";c.fillRect(390,H-27,180,9);
 c.fillStyle="#86ffe3";c.fillRect(390,H-27,180*energy/100,9);}
 if(paused){c.fillStyle="#021f34bb";c.fillRect(0,0,W,H);
 c.textAlign="center";c.fillStyle="#e9ffff";c.font="bold 60px system-ui";c.fillText("PAUSED",W/2,H/2);}
}
