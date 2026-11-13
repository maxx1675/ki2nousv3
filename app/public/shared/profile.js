/* Profil commun (pseudo, avatar emoji, couleur) gardé d'un jeu à l'autre — item 35.
   Stocké dans localStorage "soiree:profile". Dans les jeux, le nom affiché est « 😎 Pseudo » (Profile.tag). */
"use strict";
const Profile={
  EMOJIS:["😎","🤠","🥳","😈","🤡","👻","🦊","🐸","🐼","🦄","🐙","🦖","🐧","🦁","🐯","🐵","🍕","🍔","🌶️","🍉","⚡","🔥","🌈","🎸","👑","💎","🚀","🎲","🕵️","🧙"],
  COLORS:["#6a47ff","#ff4f8b","#ffc531","#19c7b0","#ff7a3d","#3d8bff","#8bd13b","#e23a6e"],
  get(){
    let o={};try{o=JSON.parse(localStorage.getItem("soiree:profile")||"{}")||{}}catch(e){}
    let name=o.name;if(!name){try{name=localStorage.getItem("soiree:name")||localStorage.getItem("lpv:name")||localStorage.getItem("qdn:name")||""}catch(e){name=""}}
    return{name:name||"",emoji:o.emoji||"",color:/^#[0-9a-f]{6}$/i.test(o.color||"")?o.color:""};
  },
  set(p){
    const cur=this.get(),n={...cur,...p};
    try{localStorage.setItem("soiree:profile",JSON.stringify(n));
      if(n.name){["soiree:name","lpv:name","qdn:name"].forEach(k=>localStorage.setItem(k,n.name))}}catch(e){}
    this.apply();return n;
  },
  /** Nom affiché dans les parties : emoji + pseudo (max 20 caractères). */
  tag(name){const p=this.get(),n=String(name??p.name??"").trim().slice(0,16);return((p.emoji?p.emoji+" ":"")+n).slice(0,22)},
  apply(){const c=this.get().color;if(c)document.documentElement.style.setProperty("--mycolor",c);else document.documentElement.style.removeProperty("--mycolor")},
  /** Ajoute le sélecteur d'avatar/couleur à côté d'un champ pseudo existant. */
  attach(sel){
    const inp=typeof sel==="string"?document.querySelector(sel):sel;if(!inp||inp.dataset.swProf)return;inp.dataset.swProf="1";
    const p=this.get();if(!inp.value&&p.name)inp.value=p.name;
    const row=document.createElement("div");row.className="sw-prof";
    const btn=document.createElement("button");btn.type="button";btn.className="sw-emo";btn.setAttribute("aria-label","Choisir mon avatar et ma couleur");
    const draw=()=>{const q=Profile.get();btn.textContent=q.emoji||"🙂";btn.style.background=q.color||""};
    inp.parentNode.insertBefore(row,inp);row.append(btn,inp);draw();
    const pop=document.createElement("div");pop.className="sw-pop";pop.hidden=true;
    pop.innerHTML='<div class="sw-grid">'+this.EMOJIS.map(e=>`<button type="button" data-e="${e}">${e}</button>`).join("")+'</div><div class="sw-cols">'+this.COLORS.map(c=>`<button type="button" data-c="${c}" style="background:${c}" aria-label="Couleur ${c}"></button>`).join("")+'</div><button type="button" class="sw-none" data-e="">Sans avatar</button>';
    row.after(pop);
    btn.addEventListener("click",()=>{pop.hidden=!pop.hidden});
    pop.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
      if(b.dataset.e!==undefined){Profile.set({emoji:b.dataset.e});draw();pop.hidden=true}
      else if(b.dataset.c){Profile.set({color:b.dataset.c});draw()}});
    const save=()=>{const v=inp.value.trim();if(v)Profile.set({name:v})};
    inp.addEventListener("change",save);inp.addEventListener("blur",save);
  }
};
Profile.apply();
