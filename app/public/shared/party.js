/* Partage (QR code + bouton Partager) — item 14, et salon unique / classement de la soirée — items 37 et 38.
   Le CODE du salon sert de « code de soirée » : même code = même soirée, quel que soit le jeu.            */
"use strict";
const Share={
  url(code,path){return location.origin+(path||location.pathname)+"?c="+code},
  _lq(){return new Promise(r=>{if(window.qrcode)return r();const s=document.createElement("script");s.src="/shared/qr.js";s.onload=r;s.onerror=r;document.head.append(s)})},
  _qc:{},
  async qrImg(text,px){
    const key=text+"|"+px;if(this._qc[key])return this._qc[key];
    await this._lq();if(!window.qrcode)return"";
    const q=qrcode(0,"M");q.addData(text);q.make();const n=q.getModuleCount(),cell=Math.max(2,Math.floor((px||180)/(n+2)));
    return this._qc[key]=q.createDataURL(cell,cell);
  },
  /** Affiche dans `el` : QR code, lien, bouton Partager et bouton Copier. */
  async mount(el,o){
    el=typeof el==="string"?document.querySelector(el):el;if(!el)return;
    const url=o.url||this.url(o.code),title=o.title||"Rejoins ma partie !",text=o.text||("Code du salon : "+(o.code||""));
    if(el.dataset.swUrl===url&&el.firstChild)return; // déjà affiché : pas de clignotement
    el.dataset.swUrl=url;
    el.innerHTML=`<div class="sw-share"><div class="sw-qr" aria-hidden="true"></div><div class="sw-sbtn"><button type="button" class="btn primary" data-sw="share">📤 Partager</button> <button type="button" class="btn" data-sw="copy">🔗 Copier le lien</button></div><p class="hint">Scanne le QR code avec un autre téléphone, ou envoie le lien.</p></div>`;
    const img=await this.qrImg(url,190);
    const box=el.querySelector(".sw-qr");if(img&&box)box.innerHTML=`<img src="${img}" alt="QR code du salon" width="190" height="190">`;
    el.onclick=async e=>{const b=e.target.closest("[data-sw]");if(!b)return;
      if(b.dataset.sw==="share"&&navigator.share){try{await navigator.share({title,text,url})}catch(x){}return}
      try{await navigator.clipboard.writeText(url);toast("Lien copié ✔")}catch(x){prompt("Copie ce lien :",url)}};
  }
};

const Party={
  salon(code){return"/soiree/index.html"+(code?"?c="+code:"")},
  codeOf(room){const m=/^(?:[a-z]{2,4}-)?([A-Za-z0-9]{4})$/.exec(room||"");return m?m[1].toUpperCase():""},
  /** Hôte : envoie les résultats du jeu au classement de la soirée (points selon le rang, dédoublonnés par `sid`). */
  async report(R,game,sid,players){
    if(!R||!R.isHost||!sid||!players||players.length<2)return null;
    try{
      const r=await fetch("/api/rooms/score",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({room:R.room,conn:R.conn,sid,game,scores:players.map(p=>({cid:p.id,n:p.n,e:"",c:"",s:p.s}))})});
      const j=await r.json().catch(()=>null);return j&&j.ok?j.board:null;
    }catch(e){return null}
  },
  async board(code){try{const j=await(await fetch("/api/rooms/board?code="+code)).json();return j&&j.ok?j:null}catch(e){return null}},
  boardHtml(b,meCid){
    if(!b||!b.rows||!b.rows.length)return"";
    const med=["🥇","🥈","🥉"];
    return`<h2>🏆 Classement de la soirée <small class="hint" style="display:inline">· ${b.games} jeu${b.games>1?"x":""}</small></h2>`+b.rows.map((r,i)=>`<div class="prow ${r.cid===meCid?"me":""}"><span>${med[i]||(i+1)+"."} ${esc((r.e?r.e+" ":"")+r.n)}</span><small class="hint" style="margin:0">${r.wins?"🏅"+r.wins:""}</small><span class="pts">${r.total}</span></div>`).join("")+`<p class="hint">Points par jeu : 10 · 7 · 5 · 4 · 3 · 2, puis 1 pour la participation.</p>`;
  },
  _bc:{},
  /** Écran de fin de jeu : classement de la soirée + retour au salon (l'hôte peut enchaîner sur un autre jeu).
      Rappelable à chaque rendu : le classement est mis en cache pour éviter les clignotements. */
  endCard(el,o){
    el=typeof el==="string"?document.querySelector(el):el;if(!el)return;
    const code=o.code,c=this._bc[code]||(this._bc[code]={html:"",ts:0,busy:false});
    const paint=()=>{if(!el.isConnected)return;
      el.innerHTML=(c.html?`<div class="card sw-board">${c.html}</div>`:"")+
      `<div class="card center"><h2>🎪 La soirée continue ?</h2><p class="hint" style="margin-top:0">${o.isHost?"Retourne au salon : tout le monde te suit, et tu choisis le prochain jeu.":"Retourne au salon de la soirée pour enchaîner sur un autre jeu."}</p><button type="button" class="btn primary big" data-pt="back">🎪 Retour au salon de la soirée</button></div>`};
    el.onclick=e=>{if(!e.target.closest("[data-pt=back]"))return;
      if(o.isHost&&o.R)o.R.emit("back",{code}).catch(()=>{});
      setTimeout(()=>{(o.onLeave&&o.onLeave());location.href=Party.salon(code)},o.isHost?250:0)};
    paint();
    if(!c.busy&&Date.now()-c.ts>6000){c.busy=true;
      const go=()=>this.board(code).then(b=>{c.busy=false;c.ts=Date.now();const h=b&&b.rows.length?this.boardHtml(b,ME):"";if(h!==c.html){c.html=h;paint()}});
      setTimeout(go,o.isHost?900:1800)} // laisse le temps à l'hôte d'envoyer les résultats
  },
  /** À appeler une fois après la connexion : quand l'hôte ramène tout le monde au salon. */
  listen(R,code,onLeave){R.on("back",()=>{onLeave&&onLeave();location.href=Party.salon(code)})}
};
