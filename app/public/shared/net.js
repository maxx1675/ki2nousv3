/* Couche commune : identité, réglages du hub, relais /api/rooms (SSE + REST) */
"use strict";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const pickR=a=>a[Math.floor(Math.random()*a.length)];
const CH="ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const mkCode=()=>Array.from({length:4},()=>CH[Math.floor(Math.random()*CH.length)]).join("");
const ME=(()=>{let v="";try{v=localStorage.getItem("soiree:id")||localStorage.getItem("lpv:id")||""}catch(e){}if(!v){v=(Math.random().toString(36)+"00000000").slice(2,10);try{localStorage.setItem("soiree:id",v)}catch(e){}}return v})();
(function(){try{const o=JSON.parse(localStorage.getItem("soiree:set")||"{}");document.documentElement.dataset.theme=o.theme==="dark"?"dark":"light";document.documentElement.dataset.anim=o.anim||"light"}catch(e){}})();
function toast(t){const e=document.createElement("div");e.className="toast";e.textContent=t;document.body.append(e);setTimeout(()=>e.remove(),2600)}
const Net={clock:0,now(){return Date.now()+this.clock},
async join(room){
  const t0=Date.now();
  const jr=await fetch("/api/rooms/join",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({room,cid:ME})});
  const j=await jr.json().catch(()=>({}));
  if(!jr.ok||!j.ok)throw new Error(j.error||"Salon introuvable");
  this.clock=j.serverNow-(t0+Date.now())/2;
  const conn=j.conn,peers=new Set(),cb=new Map();
  const es=new EventSource("/api/rooms/stream?room="+encodeURIComponent(room)+"&cid="+encodeURIComponent(ME)+"&conn="+encodeURIComponent(conn));
  es.addEventListener("peers",e=>{peers.clear();try{JSON.parse(e.data).forEach(id=>peers.add(id))}catch(x){}const f=cb.get("__p");f&&f()});
  es.addEventListener("evt",e=>{let m=null;try{m=JSON.parse(e.data)}catch(x){}if(!m)return;Net.clock=m.serverNow-Date.now();const f=cb.get(m.topic);f&&f(m.data)});
  return{host:!!j.host,on:(t,f)=>cb.set(t,f),onPeers:f=>cb.set("__p",f),peers:()=>peers,
   emit:(topic,data,to)=>fetch("/api/rooms/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({room,conn,topic,data,to:to||""})}).then(r=>r.json()).catch(()=>({ok:false})),
   leave(){try{es.close()}catch(e){}try{navigator.sendBeacon("/api/rooms/leave",new Blob([JSON.stringify({room,conn})],{type:"application/json"}))}catch(e){}}};
},
pub(o){return fetch("/api/rooms/public",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)}).catch(()=>{})},
async pubList(game){try{return(await(await fetch("/api/rooms/public?game="+game)).json()).rooms||[]}catch(e){return[]}}};
