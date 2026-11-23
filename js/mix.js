// The mixed-up bones: swap tails, bodies and heads.
{const PC={triassic:"--clay",jurassic:"--moss",cretaceous:"--amber"};
// id: [where the tail ends, where the head starts, name in three parts]
const CUT={herrerasaurus:[33,79,"Her|rera|saurus"],coelophysis:[50,84,"Coelo|phy|sis"],plateosaurus:[52,82,"Pla|teo|saurus"],dilophosaurus:[46,80,"Dilo|pho|saurus"],stegosaurus:[26,87,"Steg|o|saurus"],allosaurus:[50,79,"Al|lo|saurus"],brachiosaurus:[36,74,"Bra|chio|saurus"],diplodocus:[60,83,"Dip|lo|docus"],archaeopteryx:[40,83,"Archae|op|teryx"],iguanodon:[36,85,"Igua|no|don"],spinosaurus:[46,83,"Spi|no|saurus"],parasaurolophus:[38,81,"Para|sauro|lophus"],velociraptor:[58,83,"Velo|ci|raptor"],ankylosaurus:[38,86,"Anky|lo|saurus"],pachycephalosaurus:[46,79,"Pachy|cephalo|saurus"],triceratops:[30,68,"Tri|cera|tops"],tyrannosaurus:[50,79,"Tyran|no|saurus"]};
const ids=Object.keys(CUT),$=i=>document.getElementById(i),ctx=document.createElement("canvas").getContext("2d");
const P2={};ids.forEach(i=>P2[i]=new Path2D(PATHS[i]));
// The slice of body at x: [middle, thickness]. Uses the thickest run so legs are ignored.
const slice=(id,x)=>{let best=[0,0],a=null;for(let y=-1;y<=SILHOUETTES[id].h+1;y+=.1){const on=ctx.isPointInPath(P2[id],x,y);if(on&&a===null)a=y;if(!on&&a!==null){if(y-a>best[1])best=[(a+y)/2,y-a];a=null}}return best};
const S={};ids.forEach(i=>{const[a,b]=CUT[i];S[i]={a,b,A:slice(i,a),B:slice(i,b),n:CUT[i][2].split("|")}});
const box=(id,x0,x1)=>{let t=1e9,b=-1e9;for(let x=x0;x<=x1;x+=1)for(let y=0;y<=SILHOUETTES[id].h;y+=.5)if(ctx.isPointInPath(P2[id],x,y)){t=Math.min(t,y);b=Math.max(b,y)}return[t,b]};
ids.forEach(i=>{S[i].t=[box(i,0,S[i].a),box(i,S[i].a,S[i].b),box(i,S[i].b,100)]});
const Q=new URLSearchParams(location.search).get("m");let pick=Q?Q.split(","):["stegosaurus","triceratops","tyrannosaurus"];
function draw(changed=[0,1,2]){
 const[T,B,H]=pick,s=S[B],kt=s.A[1]/S[T].A[1],kh=s.B[1]/S[H].B[1];
 // Positions in body units: tail and head are scaled so the cut edges match.
 const tail={k:kt,x:s.a-S[T].a*kt,y:s.A[0]-S[T].A[0]*kt},head={k:kh,x:s.b-S[H].b*kh,y:s.B[0]-S[H].B[0]*kh};
 const x0=tail.x,x1=head.x+100*kh,ys=[tail.y+S[T].t[0][0]*kt,s.t[1][0],head.y+S[H].t[2][0]*kh],yb=[tail.y+S[T].t[0][1]*kt,s.t[1][1],head.y+S[H].t[2][1]*kh];
 const top=Math.min(...ys),bot=Math.max(...yb),st=$("stage"),W=st.clientWidth,HH=st.clientHeight,padT=HH*.08,padB=70;
 const k=Math.min(W*.93/(x1-x0),(HH-padT-padB)/(bot-top)),ox=(W-(x1-x0)*k)/2-x0*k,oy=HH-padB-bot*k;
 const part=(id,m,a,b,n)=>`<clipPath id="c${n}"><rect x="${a-(n===0?20:.06)}" y="-90" width="${b-a+(n===1?.12:20)}" height="300"/></clipPath><g class="${changed.includes(n)?"part":""}"><g transform="translate(${ox+m.x*k} ${oy+m.y*k}) scale(${m.k*k})"><path clip-path="url(#c${n})" d="${PATHS[id]}" fill="#1f322c"/></g></g>`;
 $("beast").innerHTML=part(T,tail,-20,S[T].a+.06,0).replace('width="40.12"','')+part(B,{x:0,y:0,k:1},s.a,s.b,1)+part(H,head,S[H].b,100,2);
 const e1=ox+s.a*k,e2=ox+s.b*k,w=[e1,e2-e1,W-e2];
 document.querySelectorAll(".col").forEach((c,i)=>{const d=findDino(pick[i]);c.style.width=w[i]+"px";c.style.setProperty("--c2",`var(${PC[periodOf(d).id]})`);c.firstElementChild.textContent=["Next tail","Next body","Next head"][i];c.setAttribute("aria-label",`${["Tail","Body","Head"][i]}: ${d.name}. Change it.`)});
 const real=T===B&&B===H,d=pick.map(findDino);$("first").classList.toggle("real",real);
 $("mixname").innerHTML=real&&T==="tyrannosaurus"?"<i style='--u:var(--amber)'>Tyrannosaurus</i>":pick.map((p,i)=>`<i style="--u:var(${PC[periodOf(d[i]).id]})">${i?S[p].n[i].toLowerCase():S[p].n[i]}</i>`).join("");
 if(real)$("verdict").innerHTML=`<b>That one’s real.</b> It lived ${d[0].start}–${d[0].end} million years ago. <a href="dino.html?id=${T}" style="text-decoration:underline">Meet ${d[0].name}</a>.`;
 else{const u=[...new Set(d)],o=Math.max(...u.map(x=>x.end)),n=Math.min(...u.map(x=>x.start)),gap=Math.round(o-n);$("verdict").innerHTML=`<b>Never existed.</b> ${d[0].name} tail, ${d[1].name} body, ${d[2].name} head. `+(gap>0?`Its parts lived at least ${gap} million years apart.`:"At least its parts lived at the same time.")}
 fitName()}
function fitName(){const n=$("mixname"),w=n.parentElement.clientWidth-parseFloat(getComputedStyle(n.parentElement).paddingLeft)*2;n.style.fontSize="100px";n.style.fontSize=Math.min(100*w/n.offsetWidth,240)+"px"}
document.querySelectorAll(".col").forEach(c=>c.onclick=()=>{const i=+c.dataset.k;pick[i]=ids[(ids.indexOf(pick[i])+1)%ids.length];draw([i])});
$("go").onclick=()=>{pick=pick.map(()=>ids[Math.floor(Math.random()*ids.length)]);draw()};
$("odds").textContent=`${(ids.length**3).toLocaleString("en-US")} possible creatures. Only ${ids.length} were real.`;
document.fonts.ready.then(()=>draw());addEventListener("resize",()=>draw([]));draw();}
