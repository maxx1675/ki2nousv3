/* Gages communs — item 36. Banque partagée par tous les jeux, intensité réglable, 18+ séparé.
   Réglages dans localStorage "soiree:gage" : { level: 1|2|3, adult: bool }.                          */
"use strict";
const Gages={
  BANK:{
    1:["Fais le cri d'un animal de ton choix pendant 10 secondes.","Parle avec un accent étranger jusqu'à ton prochain tour.","Fais 10 pompes (ou 10 squats si tu préfères).","Chante le refrain d'une chanson de ton choix, à fond.","Imite quelqu'un du groupe : les autres doivent deviner qui.","Garde une cuillère en équilibre sur le nez pendant 20 secondes.","Raconte une blague nulle avec un visage très sérieux.","Fais un compliment sincère à chaque joueur.","Danse sans musique pendant 15 secondes.","Mets un vêtement à l'envers jusqu'à la fin de la partie.","Dis l'alphabet à l'envers (au moins jusqu'à la lettre M).","Fais ton plus beau selfie grimace et montre-le à tout le monde.","Termine toutes tes phrases par « …mon capitaine » pendant 3 minutes.","Mime un film : le groupe a 1 minute pour le trouver.","Prends la pose de statue jusqu'à ce qu'on te dise de bouger."],
    2:["Laisse le groupe choisir ton nouveau surnom pour le reste de la soirée.","Envoie un emoji au hasard à la 5e personne de tes messages.","Raconte ton souvenir le plus gênant en moins d'une minute.","Fais un défilé de mode dans la pièce avec ce que tu as sur toi.","Montre la dernière photo de ta galerie et explique-la.","Laisse quelqu'un écrire un mot sur ton front au feutre lavable (ou à l'eau).","Appelle un proche et chante-lui « Joyeux anniversaire » (ce n'est pas son anniversaire).","Imite un animal en train de tomber amoureux.","Fais ton meilleur discours de remise de prix pour la personne à ta gauche.","Lis à voix haute ton dernier message envoyé (sans le modifier).","Parle en rimes jusqu'à ton prochain tour.","Fais un câlin de 10 secondes à la personne de ton choix.","Raconte une qualité et un défaut de chaque joueur.","Poste une story ridicule choisie par le groupe (supprime-la après si tu veux).","Fais le tour de la pièce à cloche-pied en chantant."],
    3:["Laisse le groupe choisir une personne à qui tu envoies « on doit parler » (et tu expliques que c'est un gage).","Mange une cuillère de moutarde, ou de condiment au choix du groupe.","Laisse les autres te maquiller (ou te coiffer) en 2 minutes chrono.","Appelle un numéro aléatoire de tes contacts et parle-lui en rimes pendant 1 minute.","Garde un glaçon dans la main jusqu'à ce qu'il fonde.","Fais le tour du quartier avec un accessoire ridicule choisi par le groupe.","Avoue un secret que personne ici ne connaît.","Laisse le groupe modifier ta photo de profil pour 24 h.","Chante à pleine voix une chanson choisie par le groupe, par la fenêtre.","Fais un strip-tease… de chaussettes, avec beaucoup trop de sérieux.","Lis à voix haute ta dernière conversation avec ta famille (3 messages max).","Donne ton téléphone au groupe 30 secondes (écran déverrouillé, pas de messages privés)."]
  },
  ADULT:{
    2:["Raconte ton pire râteau en détail.","Décris ton premier baiser, sans rien cacher.","Dis qui, dans la pièce, embrasse le mieux selon toi (et pourquoi).","Avoue le crush le plus inavouable de ta vie.","Envoie un message « tu me manques » à ton dernier ex (ou fais semblant, le groupe choisit).","Fais ta plus belle voix de séducteur ou de séductrice pour commander une pizza imaginaire.","Raconte ton pire rendez-vous galant.","Dis quelle célébrité tu choisirais pour un dîner en tête-à-tête.","Mime ta technique de drague, face à un joueur au choix.","Avoue ta pire habitude au lit… ou à défaut dans la salle de bain.","Donne une note sur 10 au dernier message de drague que tu as reçu.","Dis quel joueur te surprendrait le plus en couple, et pourquoi."],
    3:["Fais un massage des épaules de 30 secondes à la personne de ton choix (avec son accord).","Embrasse (sur la joue !) la personne que le groupe désigne.","Fais un lap dance… sur une chaise, très très sérieusement.","Raconte ta nuit la plus folle (version tout public).","Choisis une personne et dis-lui ce qui te plaît chez elle, les yeux dans les yeux.","Envoie un message coquin (mais drôle) choisi par le groupe à ton/ta partenaire — uniquement s'il/elle est d'accord pour ce genre de jeu.","Mime la scène de cinéma la plus romantique que tu connaisses, avec un partenaire consentant.","Avoue ton fantasme le plus sage devant tout le monde.","Laisse le groupe te poser une question indiscrète : tu réponds franchement ou tu bois/manges un gage au choix.","Fais ta plus belle déclaration d'amour… à un objet de la pièce.","Appelle quelqu'un et dis-lui « je pense à toi » sans autre explication (puis explique-toi).","Imite ton cri… de victoire le plus suggestif possible (sans aucune vulgarité)."]
  },
  cfg(){let o={};try{o=JSON.parse(localStorage.getItem("soiree:gage")||"{}")||{}}catch(e){}return{level:[1,2,3].includes(o.level)?o.level:2,adult:!!o.adult}},
  setCfg(p){const n={...this.cfg(),...p};try{localStorage.setItem("soiree:gage",JSON.stringify(n))}catch(e){}return n},
  /** Tire un gage selon l'intensité (1 doux · 2 piquant · 3 corsé). Avec adult=true, on mélange la banque 18+. */
  pick(level,adult,not){
    let pool=[...(this.BANK[level]||this.BANK[2])];
    if(adult)pool=pool.concat(this.ADULT[level>=3?3:2]||[]);
    pool=pool.filter(x=>x!==not);
    return pool[Math.floor(Math.random()*pool.length)];
  },
  /** Carte « gage » à afficher dans un conteneur. R = salon (pour que tout le monde voie le même gage), who = qui est le perdant.
      Peut être rappelée à chaque rendu de l'écran : le gage affiché est conservé. */
  cur:"",_el:null,_who:"",_R:null,
  _draw(){const el=this._el;if(!el||!el.isConnected)return;const c=this.cfg(),st=this.cur,who=this._who;
    el.innerHTML=`<div class="card sw-gage"><h2>😈 Gage${who?" pour "+esc(who):""}</h2>
      <div class="sw-gl" role="group" aria-label="Intensité"><span>Intensité</span>${[[1,"😇 Doux"],[2,"😏 Piquant"],[3,"😈 Corsé"]].map(([v,l])=>`<button type="button" class="pill ${c.level===v?"on":""}" data-gl="${v}">${l}</button>`).join("")}</div>
      <label class="sw-ga"><input type="checkbox" data-ga ${c.adult?"checked":""}> 🔞 Inclure les gages 18+ <small>(entre adultes consentants)</small></label>
      <div class="sw-gt" aria-live="polite">${st?esc(st):"Tire un gage au sort 🎲"}</div>
      <button type="button" class="btn primary big" data-gdraw>${st?"🔄 Un autre gage":"🎲 Tirer un gage"}</button></div>`},
  mount(el,o){
    el=typeof el==="string"?document.querySelector(el):el;if(!el)return;o=o||{};
    this._el=el;this._who=o.who||"";this._R=o.R||null;
    if(o.fresh)this.cur="";
    if(this._R&&!this._R._gg){this._R._gg=1;this._R.on("gage",d=>{if(d&&typeof d.t==="string"){Gages.cur=d.t.slice(0,200);Gages._draw()}})}
    el.onclick=e=>{const b=e.target.closest("button");if(!b)return;
      if(b.dataset.gl){Gages.setCfg({level:+b.dataset.gl});Gages._draw()}
      else if(b.hasAttribute("data-gdraw")){const c=Gages.cfg();Gages.cur=Gages.pick(c.level,c.adult,Gages.cur);Gages._draw();if(Gages._R)Gages._R.emit("gage",{t:Gages.cur}).catch(()=>{})}};
    el.onchange=e=>{if(e.target.matches("[data-ga]")){const on=e.target.checked;
      if(on&&!confirm("Les gages 18+ sont réservés aux adultes consentants. Tout le monde est d'accord ?")){e.target.checked=false;return}
      Gages.setCfg({adult:on});Gages._draw()}};
    this._draw();
  }
};
