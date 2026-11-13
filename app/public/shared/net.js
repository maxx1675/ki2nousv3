/* Couche commune : identité, réglages du hub, relais /api/rooms (SSE + REST)
   - reconnexion automatique (coupure réseau, téléphone verrouillé, redémarrage du serveur)
   - envois fiables : un message qui échoue est renvoyé tout seul (jusqu'à 20 s)
   - reprise de session : retrouver sa place après un rechargement ou une page fermée par erreur
   - passage de relais : si l'hôte disparaît, le serveur désigne un autre joueur (R.onPromote)            */
"use strict";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const pickR=a=>a[Math.floor(Math.random()*a.length)];
const CH="ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const mkCode=()=>Array.from({length:4},()=>CH[Math.floor(Math.random()*CH.length)]).join("");
const ME=(()=>{let v="";try{v=localStorage.getItem("soiree:id")||localStorage.getItem("lpv:id")||localStorage.getItem("qdn:id")||""}catch(e){}if(!v){v=(Math.random().toString(36)+"00000000").slice(2,10);}try{localStorage.setItem("soiree:id",v)}catch(e){}return v})();
(function(){try{const o=JSON.parse(localStorage.getItem("soiree:set")||"{}");document.documentElement.dataset.theme=o.theme==="dark"?"dark":"light";document.documentElement.dataset.anim=o.anim||"light"}catch(e){}})();
function toast(t){const e=document.createElement("div");e.className="toast";e.textContent=t;document.body.append(e);setTimeout(()=>e.remove(),2600)}

/* ---------- Session (reprendre sa place) ---------- */
const Sess={
  key:g=>"soiree:sess:"+g,
  save(g,o){try{localStorage.setItem(this.key(g),JSON.stringify({...o,ts:Date.now()}))}catch(e){}},
  load(g,maxAge){try{const s=JSON.parse(localStorage.getItem(this.key(g))||"null");if(!s||!/^[A-Z0-9]{4}$/.test(s.code||""))return null;if(Date.now()-(s.ts||0)>(maxAge||6*3600e3))return null;return s}catch(e){return null}},
  touch(g){const s=this.load(g,24*3600e3);if(s)this.save(g,s)},
  clear(g){try{localStorage.removeItem(this.key(g))}catch(e){}}
};
/* Paramètres d'URL : ?c=CODE (lien d'invitation), &go=1 (lancé depuis le salon de la soirée), &h=1 (hôte) */
function bootParams(){
  const q=new URLSearchParams(location.search);
  let c=(q.get("c")||"").toUpperCase();
  if(!c){const m=location.hash.match(/^#([A-Za-z0-9]{4})$/);if(m)c=m[1].toUpperCase()}
  return{code:/^[A-Z0-9]{4}$/.test(c)?c:"",go:q.get("go")==="1",host:q.get("h")==="1"};
}

/* ---------- Bandeau d'état de connexion ---------- */
let _bn=null,_bnT=0;
function netBanner(state){
  if(state==="online"){clearTimeout(_bnT);_bnT=0;if(_bn){_bn.remove();_bn=null}return}
  if(_bnT||_bn)return;
  _bnT=setTimeout(()=>{_bnT=0;if(_bn)return;_bn=document.createElement("div");_bn.setAttribute("role","status");
    _bn.style.cssText="position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:200;background:#ffc531;color:#1b1340;border:2.5px solid #1b1340;border-radius:99px;padding:6px 16px;font:800 .9rem system-ui,sans-serif;box-shadow:3px 3px 0 #1b1340;max-width:92vw";
    _bn.textContent="📶 Reconnexion en cours…";document.body.append(_bn)},2500);
}

const Net={clock:0,now(){return Date.now()+this.clock},
/* o: {create:true} pour créer le salon · {resume:true} pour revenir dans un salon déjà connu · {wasHost:true} si on y était hôte */
async join(room,o){
  o=o||{};
  const R={room,conn:"",isHost:false,hostCid:"",epoch:0,status:"connecting",closed:false,initSnap:null,
    peersSet:new Set(),cb:new Map(),es:null,lastRx:Date.now(),promCb:[],demCb:[],statCb:[],snapJ:"",snapT:0,snapPend:null,rj:null,tries:0};
  const t0=Date.now();
  const post=(path,body)=>fetch("/api/rooms/"+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const setStatus=s=>{if(R.status===s)return;R.status=s;netBanner(s);R.statCb.forEach(f=>{try{f(s)}catch(e){}})};

  async function connect(first){
    const jr=await post("join",{room,cid:ME,create:first?!!o.create:false,resume:first?!!o.resume:true,wasHost:R.isHost||!!o.wasHost});
    const j=await jr.json().catch(()=>({}));
    if(!jr.ok||!j.ok){const e=new Error(j.error||"Salon introuvable");e.status=jr.status;e.code=j.code;throw e}
    if(first)Net.clock=j.serverNow-(t0+Date.now())/2;
    R.conn=j.conn;const wasHost=R.isHost;
    R.hostCid=j.hostCid||"";R.isHost=!!j.host;R.epoch=j.epoch||0;
    if(first&&j.snap)R.initSnap=j.snap;
    if(!first){
      if(R.isHost&&!wasHost)R.promCb.forEach(f=>f(j.snap||null,true));
      else if(!R.isHost&&wasHost)R.demCb.forEach(f=>f());
    }
    openStream();
  }
  function openStream(){
    try{R.es&&R.es.close()}catch(e){}
    const es=R.es=new EventSource("/api/rooms/stream?room="+encodeURIComponent(room)+"&cid="+encodeURIComponent(ME)+"&conn="+encodeURIComponent(R.conn));
    es.onopen=()=>{R.lastRx=Date.now();R.tries=0;setStatus("online")};
    es.addEventListener("hb",()=>{R.lastRx=Date.now()});
    es.addEventListener("peers",e=>{R.lastRx=Date.now();R.peersSet.clear();try{JSON.parse(e.data).forEach(id=>R.peersSet.add(id))}catch(x){}const f=R.cb.get("__p");f&&f()});
    es.addEventListener("host",e=>{R.lastRx=Date.now();let d=null;try{d=JSON.parse(e.data)}catch(x){}if(!d)return;
      const was=R.isHost;R.hostCid=d.cid;R.isHost=d.cid===ME;
      if(R.isHost&&!was)R.promCb.forEach(f=>f(d.snap||null,false));
      else if(!R.isHost&&was)R.demCb.forEach(f=>f());
      R.epoch=d.epoch||R.epoch;const f=R.cb.get("__h");f&&f(d)});
    es.addEventListener("evt",e=>{R.lastRx=Date.now();let m=null;try{m=JSON.parse(e.data)}catch(x){}if(!m)return;Net.clock=m.serverNow-Date.now();const f=R.cb.get(m.topic);f&&f(m.data,{from:m.from})});
    es.onerror=()=>{
      if(R.closed)return;
      setStatus("reconnecting");
      if(es.readyState===2)scheduleRejoin(); // le serveur a répondu une erreur (salon recréé, 429…) : EventSource abandonne, on se reconnecte nous-mêmes
    };
  }
  function scheduleRejoin(delay){
    if(R.closed||R.rj)return;
    const d=delay??Math.min(8000,1000*2**Math.min(R.tries++,3));
    R.rj=setTimeout(async()=>{R.rj=null;if(R.closed)return;try{await connect(false)}catch(e){if(R.closed)return;setStatus("reconnecting");scheduleRejoin()}},d);
  }
  R.reconnectNow=()=>{if(R.closed)return;try{R.es&&R.es.close()}catch(e){}clearTimeout(R.rj);R.rj=null;setStatus("reconnecting");scheduleRejoin(50)};

  /* envois fiables */
  function trySend(it){
    if(R.closed)return it.res({ok:false});
    const later=ms=>{if(Date.now()-it.t0>20000)return it.res({ok:false});setTimeout(()=>trySend(it),ms)};
    if(!R.conn||R.status==="connecting")return later(500);
    post("event",{room,conn:R.conn,topic:it.topic,data:it.data,to:it.to||""}).then(async r=>{
      const j=await r.json().catch(()=>({}));
      if(r.ok&&j.ok){
        if(it.to==="host"&&!j.delivered&&!R.isHost)return later(1500); // l'hôte n'est pas joignable pour l'instant
        return it.res(j);
      }
      if(j.code==="noconn"){if(R.status==="online")R.reconnectNow();return later(1200)}
      if(j.code==="noroom"){R.reconnectNow();return later(1500)}
      if(r.status>=500||r.status===0)return later(1500);
      it.res(j);
    }).catch(()=>later(1500));
  }
  R.emit=(topic,data,to)=>new Promise(res=>trySend({topic,data,to,t0:Date.now(),res}));

  /* photo de la partie pour le passage de relais (hôte seulement) */
  R.snap=obj=>{
    if(!R.isHost||R.closed)return;
    R.snapPend=obj;
    if(R.snapT)return;
    R.snapT=setTimeout(()=>{R.snapT=0;const o2=R.snapPend;R.snapPend=null;if(!o2||!R.isHost||!R.conn)return;
      let j="";try{j=JSON.stringify(o2)}catch(e){return}
      if(j===R.snapJ||j.length>1.8e6)return;R.snapJ=j;
      post("snap",{room,conn:R.conn,data:o2}).catch(()=>{R.snapJ=""})},900);
  };

  R.on=(t,f)=>{R.cb.set(t,f)};R.onPeers=f=>{R.cb.set("__p",f)};R.onHostChange=f=>{R.cb.set("__h",f)};
  R.onPromote=f=>{R.promCb.push(f)};R.onDemote=f=>{R.demCb.push(f)};R.onStatus=f=>{R.statCb.push(f)};
  R.peers=()=>R.peersSet;
  Object.defineProperty(R,"host",{get:()=>R.isHost});
  R.leave=()=>{R.closed=true;clearTimeout(R.rj);clearTimeout(R.snapT);netBanner("online");
    try{R.es&&R.es.close()}catch(e){}
    try{navigator.sendBeacon("/api/rooms/leave",new Blob([JSON.stringify({room,conn:R.conn})],{type:"application/json"}))}catch(e){}
    Net._all.delete(R)};

  await connect(true);
  Net._all.add(R);
  return R;
},
_all:new Set(),
/* Connexion « tout-en-un » avec attentes et nouvelles tentatives.
   o: {game, room:(code)=>nom, create, code (imposé), joinCode, resume, wasHost, retry (nb d'attentes si le salon n'existe pas encore), onMsg}
   Retourne {R, code} ou null (après avoir appelé onMsg avec la raison). */
async enter(o){
  const say=o.onMsg||(()=>{}),sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let code=o.create?(o.code||mkCode()):o.joinCode,retry=o.retry||0,net=0;
  for(;;){
    try{
      const R=await Net.join(o.room(code),{create:!!o.create,resume:!!o.resume,wasHost:!!o.wasHost});
      if(o.create&&!R.host){R.leave();
        if(o.code){if(retry-->0){await sleep(1500);continue}say("Ce code est déjà utilisé, réessaie.");return null}
        code=mkCode();continue}
      return{R,code};
    }catch(e){
      if(retry>0&&(e.code==="noroom"||!e.status)){retry--;say("⏳ En attente de l’hôte…");await sleep(1500);continue}
      if(o.resume&&!e.status&&net++<5){say("📶 Reconnexion…");await sleep(2000);continue}
      if(o.resume)Sess.clear(o.game);
      say(o.resume?"La partie n’existe plus. Tu peux en créer une nouvelle.":(e.message||"Connexion impossible"));
      return null;
    }
  }
},
pub(o){return fetch("/api/rooms/public",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)}).catch(()=>{})},
async pubList(game){try{return(await(await fetch("/api/rooms/public?game="+game)).json()).rooms||[]}catch(e){return[]}},
async ice(){
  if(this._ice)return this._ice;
  try{const j=await(await fetch("/api/rooms/ice")).json();if(j&&Array.isArray(j.iceServers)&&j.iceServers.length){this._ice={iceServers:j.iceServers};this._turn=!!j.turn;return this._ice}}catch(e){}
  return{iceServers:[{urls:["stun:stun.l.google.com:19302","stun:stun1.l.google.com:19302"]}]};
}};

/* Quand l'appli revient au premier plan (téléphone déverrouillé, changement d'onglet) ou que le réseau revient :
   on vérifie tout de suite que les connexions sont vivantes, sans attendre. */
function _wake(){Net._all.forEach(R=>{if(R.closed)return;if(Date.now()-R.lastRx>30000||!R.es||R.es.readyState!==1)R.reconnectNow()})}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)_wake()});
addEventListener("online",_wake);
addEventListener("pageshow",e=>{if(e.persisted)_wake()});
setInterval(()=>{Net._all.forEach(R=>{if(!R.closed&&R.status==="online"&&Date.now()-R.lastRx>45000)R.reconnectNow()})},5000);

/* Appli installable (PWA) : enregistre le service worker aussi quand on arrive directement sur un jeu via un lien */
if("serviceWorker" in navigator&&location.protocol==="https:"){addEventListener("load",()=>{navigator.serviceWorker.register("/sw.js").catch(()=>{})})}
