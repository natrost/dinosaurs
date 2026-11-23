// The homepage dig: what is buried where. x, y and widths are in vw (hundredths of the page width).
const I="var(--ink)",V="var(--ivory)";
// x, y, width in vw; r = how it lies in the rock. Listed youngest (top) to oldest (bottom).
const BEDS=[
{id:"cretaceous",c:"--amber",t:"var(--clay)",h:254,from:66,to:145,bands:["--clay","--ivory","--amber"],type:{top:3,sx:62,sy:2.1},
 items:[["tyrannosaurus",4,17,84,0,I,"img"],["ankylosaurus",2,92,42,-168,V],["triceratops",50,92,47,13,I],["pachycephalosaurus",5,124,36,28,I],["velociraptor",50,124,46,-24,V],["parasaurolophus",2,164,52,7,"var(--clay)"],["spinosaurus",39,172,59,-10,I],["iguanodon",3,208,50,13,V]],
 stickers:[[3,24,-5,"--ivory","T. rex lived closer in time to you than to the Stegosaurus below it."],[62,232,4,"--clay","Argentinosaurus is down here too. Nobody has found a whole one."]],
 notes:[[60,217,-3,"longer than T. rex,<br>maybe happier in a river","M70,216C74,212 74,207 71,202M71,202l-.6,2.4M71,202l2.2,1.3"]]},
{id:"jurassic",c:"--moss",t:"var(--ink)",h:188,from:145,to:201.4,bands:["--amber","--ink","--ivory","--moss"],type:{top:7,sx:88,sy:1.2},
 items:[["archaeopteryx",64,35,33,18,V],["stegosaurus",2,34,58,-9,I],["allosaurus",44,64,54,163,V],["brachiosaurus",1,88,58,5,"var(--amber)"],["diplodocus",26,124,73,-6,I],["dilophosaurus",3,152,50,17,"var(--pink)"]],
 stickers:[[68,106,-6,"--ivory","Brachiosaurus may have munched leaves 30 feet up."]],
 notes:[[3,75,-3,"tail spikes = thagomizer.<br>it started as a cartoon joke","M7,74C4,70 5,64 8,60M8,60l-2.2,1.1M8,60l.2,2.5"],[61,168,-3,"no frill. no venom.<br>sorry, movies","M60,170C57,170 55,168 53,164M53,164l-.2,2.5M53,164l2.3,1"]]},
{id:"triassic",c:"--clay",t:"var(--ivory)",h:130,from:201.4,to:251.9,bands:["--moss","--pink","--ink","--clay"],type:{top:8,sx:125,sy:.6},
 items:[["plateosaurus",40,25,58,8,I],["coelophysis",2,32,44,-16,"var(--amber)"],["herrerasaurus",44,62,54,-12,V],["eoraptor",5,70,33,20,I]],
 stickers:[],notes:[[27,114,-4,"about as long<br>as a big dog","M31,112C33,108 32,104 28,100M28,100l.4,2.4M28,100l2.5,.5"],[70,113,-2,"found by a goat herder","M84,112C87,107 87,102 85,97M85,97l-.6,2.4M85,97l2.2,1.2"]]}];
const BOX=`<div class="crayonbox"><p class="pen">what color was it? nobody knows. you pick.</p><div class="crayons" id="crayons"></div><div><button class="tool" id="auto">Color it for me</button><button class="tool" id="wipe">Start over</button><button class="tool" id="put">Put the crayon down</button></div></div>`;
const edge=b=>{const n=b.length;let o="";b.forEach((c,k)=>{let d="M0,100 ";for(let i=0;i<=40;i++){const y=10+k*(78/n)+Math.sin(i*.55+k*1.7)*7+Math.sin(i*1.31+k*.6)*4;d+=`L${i*2.5},${y.toFixed(1)} `}o+=`<path d="${d}L100,100Z" fill="var(${c})"/>`});return `<svg class="edge" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${o}</svg>`};
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
document.getElementById("beds").innerHTML=BEDS.map(b=>{
 const P=PERIODS.find(p=>p.id===b.id);
 const specks=Array.from({length:Math.round(b.h/3)},()=>{const w=.4+rnd()*1.6;return `<i class="speck" style="left:${rnd()*98}%;top:${8+rnd()*90}%;width:${w}vw;height:${w*.7}vw;--s:var(${b.bands[Math.floor(rnd()*b.bands.length)]});transform:rotate(${rnd()*180}deg)"></i>`}).join("");
 const items=b.items.map(([id,x,y,w,r,f,img])=>{const d=findDino(id),s=SILHOUETTES[id];if(img)return `<div class="bone rex" id="rex" data-ma="67" style="left:${x}vw;top:${y}vw;width:${w}vw"><div class="fig"><canvas id="cv"></canvas><img src="images/art/trex-pencil.png" alt="Tyrannosaurus rex, a pencil drawing you can color in"></div></div><p class="tag"><a href="dino.html?id=${id}">${d.name}<small>${d.start}–${d.end} million years</small></a></p>`;return `<a class="bone later" data-ma="${(d.start+d.end)/2}" href="dino.html?id=${id}" aria-label="${d.name}" style="left:${x}vw;--y:${y}vw;top:${y}vw;width:${w}vw;--r:${r}deg"><svg class="${f===V?"chalk":""}" viewBox="0 0 100 ${s.h}"><path d="${PATHS[id]}" fill="${f}"/></svg></a><p class="tag">${d.name}<small>${d.start}–${d.end} million years</small></p>`}).join("");
 const st=b.stickers.map(([x,y,r,bg,t,k])=>`<p class="sticker ${y>60?"later":""}" style="left:${x}vw;--y:${y}vw;top:${y}vw;--r:${r}deg;--b:var(${bg});${k?`--k:var(${k})`:""}">${t}</p>`).join("");
 const nt=`<svg class="pens" viewBox="0 0 100 ${b.h}" preserveAspectRatio="xMidYMin meet" style="${b.id==="cretaceous"?"top:var(--x,0vw)":""}" aria-hidden="true">${b.notes.map(n=>`<path pathLength="1" d="${n[4]}"/>`).join("")}</svg>`+b.notes.map(([x,y,r,tx])=>`<p class="note pen later" style="left:${x}vw;--y:${y}vw;--r:${r}deg">${tx}</p>`).join("");return `<section class="layer bed" data-id="${b.id}" data-from="${b.from}" data-to="${b.to}" style="--c:var(${b.c});--t:${b.t};--h:${b.h}vw">${edge(b.bands)}${specks}<h2 class="period" data-sy="${b.type.sy}" style="top:${b.type.top}vw;font-stretch:${b.type.sx}%"><span>${P.name}</span></h2>${items}${st}${nt}${b.id==="cretaceous"?BOX:""}</section>`}).join("");
document.querySelector(".since").insertAdjacentHTML("afterbegin",edge(["--moss","--ink","--sand"]));
document.querySelector(".bedrock").insertAdjacentHTML("afterbegin",edge(["--pink","--amber","--ink"]));
document.getElementById("marq").textContent="Asteroid · 66 million years ago · The end of the line · ".repeat(8);
function tags(){document.querySelectorAll('.bone').forEach(e=>{const bed=e.parentElement.getBoundingClientRect(),r=(e.querySelector('path:not(.x)')||e).getBoundingClientRect(),g=e.nextElementSibling;g.style.left=Math.min(r.left-bed.left+r.width*.3,document.documentElement.clientWidth*.97-g.offsetWidth)+'px';g.style.top=r.bottom-bed.top+document.documentElement.clientWidth*.006+'px'})}
function keepOnPage(){document.querySelectorAll('.note,.sticker').forEach(e=>{e.style.translate='none';const r=e.getBoundingClientRect(),W=document.documentElement.clientWidth-8;if(r.right>W)e.style.translate=(W-r.right)+'px 0'});}
function fit(){const L=document.querySelector('.title span');L.style.cssText='display:inline-block;font-size:20vw';const k=20*document.documentElement.clientWidth*.71/L.offsetWidth;L.style.fontSize=k+'vw';tags();keepOnPage();document.querySelectorAll(".period").forEach(h=>{const s=h.firstElementChild;h.style.transform="none";s.style.cssText="display:inline-block";const sx=document.documentElement.clientWidth*.965/s.getBoundingClientRect().width;h.style.transform=`translateX(1.6vw) scale(${sx},${sx*h.dataset.sy})`})}
document.getElementById("rays").innerHTML=Array.from({length:26},(_,i)=>{const a=i/26*6.283,r0=72+(i%3)*2,r1=84+(i%2)*10,c=Math.cos(a),q=Math.sin(a),m=(r0+r1)/2;return `<path d="M${c*r0},${q*r0}Q${c*m-q*1.6},${q*m+c*1.6} ${c*r1},${q*r1}"/>`}).join("");
document.querySelectorAll(".pens").forEach(e=>{const o=new IntersectionObserver(x=>x[0].isIntersecting&&e.classList.add("in"));o.observe(e)});
document.fonts.ready.then(fit);addEventListener('load',()=>{fit();gauge()});addEventListener("resize",()=>{fit();gauge()});fit();
function gauge(){const y=scrollY+innerHeight*.6,pts=[[0,0]];const at=(e,f=0)=>{const r=e.getBoundingClientRect();return r.top+scrollY+r.height*f};
 pts.push([at(document.querySelector(".since")),0],[at(document.querySelector(".impact")),66]);
 document.querySelectorAll(".bed").forEach(b=>{pts.push([at(b)+document.documentElement.clientWidth*.06,+b.dataset.from]);b.querySelectorAll(".bone").forEach(e=>pts.push([at(e,.5),+e.dataset.ma]))});
 pts.push([at(document.querySelector(".bedrock")),252]);
 pts.sort((a,b)=>a[0]-b[0]);let m=0;pts.forEach(p=>{m=p[1]=Math.max(m,p[1])});
 let v=252;for(let i=1;i<pts.length;i++)if(y<pts[i][0]){const[a,A]=pts[i-1],[b,B]=pts[i];v=A+(B-A)*Math.max(0,(y-a)/(b-a||1));break}
 document.getElementById("ma").textContent=Math.round(v);document.querySelector('.gauge').style.opacity=document.querySelector('.bedrock').getBoundingClientRect().top<innerHeight*.75?0:1}
addEventListener("scroll",()=>requestAnimationFrame(gauge),{passive:true});gauge();
