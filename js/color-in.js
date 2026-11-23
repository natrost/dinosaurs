// Coloring in the T. rex. The drawing is images/art/trex-pencil.png; its transparent parts keep the crayon inside the lines.
{const $=i=>document.getElementById(i);
const cv=$("cv"),cx=cv.getContext("2d");let color=null,last=null;
const C=[["clay","#c8552f"],["amber","#e5a52c"],["moss","#5f8f45"],["mist","#5aa3a8"],["plum","#7c4a78"],["pink","#e58f93"],["ink","#1f322c"]];
$("crayons").innerHTML=C.map(([n,c])=>`<button class="crayon" aria-pressed="false" aria-label="${n} crayon" data-c="${c}"><svg viewBox="0 0 38 112"><path d="M13,26L17,4Q19,1 21,4L25,26Z" fill="${c}"/><path d="M8,27Q19,23 30,27L31,110Q19,113 7,110Z" fill="${c}"/><path d="M8,42Q19,39 30,42M8,96Q19,94 31,96" fill="none" stroke="#1f322c" stroke-width="2.2"/><path d="M13,26L17,4Q19,1 21,4L25,26M8,27Q19,23 30,27L31,110Q19,113 7,110Z" fill="none" stroke="#1f322c" stroke-width="1.6" stroke-linejoin="round"/></svg></button>`).join("");
function size(){const r=cv.getBoundingClientRect();const keep=cv.width?cx.getImageData(0,0,cv.width,cv.height):null;const w=Math.round(r.width),h=Math.round(r.height);if(w===cv.width&&h===cv.height)return;const tmp=document.createElement("canvas");if(keep&&keep.width){tmp.width=keep.width;tmp.height=keep.height;tmp.getContext("2d").putImageData(keep,0,0)}cv.width=w;cv.height=h;if(tmp.width)cx.drawImage(tmp,0,0,w,h)}
function dab(x,y,c,R){cx.fillStyle=c;for(let i=0;i<26;i++){const a=Math.random()*6.28,q=Math.sqrt(Math.random())*R;cx.globalAlpha=.25+Math.random()*.45;cx.fillRect(x+Math.cos(a)*q,y+Math.sin(a)*q,1+Math.random()*3.2,1+Math.random()*2)}}
function stroke(x0,y0,x1,y1,c,R=cv.width/55){const n=Math.max(1,Math.hypot(x1-x0,y1-y0)/(R*.34));for(let i=0;i<=n;i++)dab(x0+(x1-x0)*i/n,y0+(y1-y0)*i/n,c,R)}
const pos=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height]};
cv.addEventListener("pointerdown",e=>{if(!color)return;try{cv.setPointerCapture(e.pointerId)}catch{}last=pos(e);stroke(...last,...last,color)});
cv.addEventListener("pointermove",e=>{if(!color||!last)return;const p=pos(e);stroke(...last,...p,color);last=p});
["pointerup","pointercancel"].forEach(v=>cv.addEventListener(v,()=>last=null));
function pick(c){color=c;$("rex").classList.toggle("on",!!c);document.querySelectorAll(".crayon").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.c===c)))}
document.querySelectorAll(".crayon").forEach(b=>b.onclick=()=>{pick(color===b.dataset.c?null:b.dataset.c);if(color&&$("rex").getBoundingClientRect().bottom<innerHeight*.35)$("rex").scrollIntoView({block:"center"})});
$("put").onclick=()=>pick(null);$("wipe").onclick=()=>cx.clearRect(0,0,cv.width,cv.height);
$("auto").onclick=()=>{cx.clearRect(0,0,cv.width,cv.height);const p=C.slice(0,6).sort(()=>Math.random()-.5),W=cv.width,H=cv.height;for(let y=-H*.2;y<H*1.2;y+=W/75)stroke(0,y,W,y-H*.16+Math.random()*9,p[0][1],W/62);for(let x=W*.04;x<W;x+=W/15)stroke(x,H*.02,x-W*.05,H*.5+Math.random()*H*.14,p[1][1],W/75);for(let x=0;x<W;x+=W/40)stroke(x,H*.95,x+W*.02,H*.62,p[2][1],W/90)};
addEventListener("resize",size);size();

}
