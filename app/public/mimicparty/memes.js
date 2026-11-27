/* MIMIC PARTY — bibliothèque de mèmes officielle (v2 : de VRAIS sons avec paroles et chants).
 *
 * Principe : chaque entrée pointe vers un vrai extrait audio dans `sounds/v2/<id>.mp3`
 * (la voix, le cri, la chanson d'origine), plus aucun petit bip synthétique.
 * Tous les joueurs entendent le même fichier, donc la même référence pour tout le monde.
 *
 * Comment remplir `sounds/v2/` ?
 *   node tools/fetch-sounds.js          (télécharge tout seul, voir tools/LISEZ-MOI.md)
 *   ou dépose toi-même un MP3 nommé <id>.mp3 dans sounds/v2/ (il est prioritaire).
 * Un fichier absent n'est jamais joué : le mème est simplement ignoré.
 *
 * Champs d'un mème : id, name, emoji, cat, diff (1-3), kind, desc, say, q, file(s), start, max
 *   kind : "voice" (paroles / cri), "song" (chant, refrain, mélodie qu'on peut fredonner),
 *          "sfx" (effet sonore pur, plus dur à imiter)
 *   say  : ce que dit le mème, affiché aux joueurs (jamais pour les chansons)
 *   q    : mots-clés pour retrouver le son (tools/fetch-sounds.js)
 *   start/max : début du passage (s) et durée maximale (5 s par défaut). Le silence de
 *               début/fin est coupé automatiquement et le volume normalisé.
 */
"use strict";
(function (root) {
  var CATS = [
    { id: "fr", label: "Mèmes français", emoji: "🥖" },
    { id: "tiktok", label: "Mèmes TikTok", emoji: "📱" },
    { id: "youtube", label: "Mèmes YouTube", emoji: "▶️" },
    { id: "international", label: "Mèmes internationaux", emoji: "🌍" },
    { id: "gaming", label: "Mèmes gaming", emoji: "🎮" },
    { id: "repliques", label: "Répliques cultes", emoji: "💬" },
    { id: "absurde", label: "Sons absurdes", emoji: "🌀" },
    { id: "ancien", label: "Mèmes anciens", emoji: "📼" },
    { id: "recent", label: "Mèmes récents", emoji: "✨" },
    { id: "cris", label: "Cris et réactions", emoji: "😱" },
    { id: "animaux", label: "Mèmes animaux", emoji: "🐾" }
  ];

  var KINDS = {
    voice: { label: "Paroles", emoji: "🗣️" },
    song: { label: "Chant", emoji: "🎤" },
    sfx: { label: "Effet sonore", emoji: "🔊" }
  };

  function sound(id) { return "/mimicparty/sounds/v2/" + id + ".mp3"; }
  function legacy(id) { return "/mimicparty/sounds/" + id + ".mp3"; }

  /* Anciens identifiants dont le MP3 réel est peut-être déjà dans sounds/ (ancien outil). */
  var LEGACY = {};
  ("oof hitmarker wasted missionfailed clashlaugh wilhelm fnaf sheesh bingchilling wow chipi pedro tungtung lirili " +
   "sigmaboy nootnoot dramatic whatdog taco illuminati fartreverb uwu goofy yeet sadviolin badumtss hellothere noice " +
   "xpstartup nokia msn modem56k cpasfaux nonmaisallo ohlavache trucdeouf").split(" ").forEach(function (k) { LEGACY[k] = 1; });

  /* [id, nom, emoji, catégorie, difficulté, type, recherche, ce que ça dit, description, options] */
  var TABLE = [
    /* ---- français ---- */
    ["quoicoubeh", "Quoicoubeh", "🤨", "fr", 3, "voice", "quoicoubeh", "Quoi ? Coubeh !", "La blague qui rend fou. Réponds « quoi ? » et tu es piégé."],
    ["cpasfaux", "C’est pas faux", "🗡️", "fr", 2, "voice", "c'est pas faux kaamelott", "C’est pas faux.", "La réplique culte de Perceval dans Kaamelott."],
    ["nonmaisallo", "Non mais allô quoi", "📞", "fr", 2, "voice", "non mais allo quoi", "Non mais allô quoi !", "L’indignation la plus célèbre de la télé."],
    ["ohlavache", "Oh la vache !", "🐄", "fr", 1, "voice", "oh la vache", "Oh la vache !", "La surprise à la française."],
    ["trucdeouf", "Un truc de ouf", "🤯", "fr", 2, "voice", "un truc de ouf", "Un truc de ouf !", "Quand c’est vraiment incroyable."],
    ["atessouhaits", "À tes souhaits", "🤧", "fr", 2, "voice", "a tes souhaits", "À tes souhaits !", "L’éternuement suivi de la politesse."],
    ["connemara", "Les Lacs du Connemara", "🏞️", "fr", 2, "song", "les lacs du connemara", "", "Le refrain que toute la famille connaît en mariage."],
    ["alorsondanse", "Alors on danse", "💃", "fr", 2, "song", "alors on danse stromae", "", "Le tube de Stromae qui fait danser et pleurer."],
    ["djadja", "Djadja", "🎶", "fr", 3, "song", "djadja aya nakamura", "", "Le refrain d’Aya Nakamura."],

    /* ---- TikTok ---- */
    ["ohno", "Oh no, oh no, oh no no no", "😱", "tiktok", 2, "song", "oh no oh no oh no no no", "Oh no, oh no, oh no no no", "Le naufrage en accéléré, version chantée."],
    ["pedro", "Pedro Pedro Pedro", "🦝", "tiktok", 3, "song", "pedro pedro pedro", "", "Le raton laveur qui fait le tour du monde."],
    ["chipi", "Chipi Chipi Chapa Chapa", "🐱", "tiktok", 3, "song", "chipi chipi chapa chapa", "", "Le chat qui danse sur un air entêtant."],
    ["tungtung", "Tung Tung Tung Sahur", "🪵", "tiktok", 3, "voice", "tung tung tung sahur", "Tung tung tung sahur !", "Le brainrot italien armé d’un bâton."],
    ["lirili", "Lirili Larila", "🐘", "tiktok", 3, "song", "lirili larila", "", "L’éléphant-cactus du brainrot."],
    ["tralalero", "Tralalero Tralala", "🦈", "tiktok", 3, "song", "tralalero tralala", "", "Le requin en baskets du brainrot italien."],
    ["bombardiro", "Bombardiro Crocodilo", "🐊", "tiktok", 3, "voice", "bombardiro crocodilo", "Bombardiro Crocodilo !", "Le crocodile bombardier."],
    ["sigmaboy", "Sigma Boy", "🎶", "tiktok", 3, "song", "sigma boy", "", "La chanson qu’on entend partout."],
    ["skibidi", "Skibidi Toilet", "🚽", "tiktok", 2, "song", "skibidi toilet", "", "Le mème des toilettes qui chantent."],
    ["sheesh", "Sheeesh", "🥶", "tiktok", 2, "voice", "sheesh", "Sheeeesh !", "L’admiration étirée à l’extrême."],
    ["bingchilling", "Bing Chilling", "🍦", "tiktok", 2, "voice", "bing chilling john cena", "Bing chilling !", "Le mème glacé de John Cena."],
    ["siuuu", "Siuuu !", "⚽", "tiktok", 1, "voice", "siuuu ronaldo", "Siuuuu !", "Le cri de célébration de Ronaldo."],
    ["wow", "Anime Wow", "😮", "tiktok", 2, "voice", "anime wow", "Waaaow !", "Le « waaow » d’anime des edits."],

    /* ---- internationaux / YouTube / classiques ---- */
    ["rickroll", "Never Gonna Give You Up", "🕺", "international", 2, "song", "never gonna give you up rickroll", "", "Tu viens de te faire rickroller."],
    ["gangnam", "Gangnam Style", "🐴", "international", 2, "song", "gangnam style", "", "Le tube qui a explosé YouTube."],
    ["sandstorm", "Darude – Sandstorm", "🏜️", "international", 2, "song", "darude sandstorm", "", "Le « dou dou dou dou » des streamers."],
    ["babyshark", "Baby Shark", "🦈", "international", 1, "song", "baby shark", "", "La mélodie dont on ne guérit jamais."],
    ["coffin", "Coffin Dance (Astronomia)", "⚰️", "international", 2, "song", "astronomia coffin dance", "", "Les porteurs de cercueil qui dansent."],
    ["nyan", "Nyan Cat", "🌈", "youtube", 2, "song", "nyan cat song", "", "Le chat-pop-tart arc-en-ciel."],
    ["trololo", "Trololo", "🎤", "youtube", 2, "song", "trololo", "", "Le monsieur qui vocalise sans paroles."],
    ["leeroy", "Leeeeroy Jenkins", "🐔", "youtube", 2, "voice", "leeroy jenkins", "Leeeeroy Jenkins !", "Le cri de charge le plus catastrophique du jeu."],
    ["whatdog", "What the dog doin ?", "🐕", "youtube", 2, "voice", "what the dog doin", "What the dog doin ?", "La question existentielle du chien."],
    ["dramatic", "Dramatic Chipmunk", "🐿️", "youtube", 1, "sfx", "dramatic chipmunk", "", "Le regard de l’écureuil qui change tout."],
    ["numa", "Numa Numa", "📹", "ancien", 3, "song", "numa numa dragostea din tei", "", "Le gars devant sa webcam, 2004."],
    ["caramell", "Caramelldansen", "🥕", "ancien", 3, "song", "caramelldansen", "", "Le mème anime qui a hanté les années 2000."],
    ["crazyfrog", "Crazy Frog (Axel F)", "🐸", "ancien", 2, "song", "crazy frog axel f", "", "La sonnerie qui a envahi les téléphones."],
    ["macarena", "Macarena", "🕶️", "ancien", 2, "song", "macarena", "", "Le tube des mariages et des colonies."],
    ["hamster", "Hamster Dance", "🐹", "ancien", 2, "song", "hamster dance song", "", "Les hamsters qui dansent sur des sites des années 90."],
    ["nokia", "Sonnerie Nokia", "📱", "ancien", 1, "song", "nokia ringtone", "", "La sonnerie la plus jouée de l’histoire."],

    /* ---- gaming ---- */
    ["itsame", "It’s a-me, Mario !", "🍄", "gaming", 1, "voice", "it's a me mario", "It’s a-me, Mario !", "La salutation du plombier moustachu."],
    ["wahoo", "Wahoo !", "⭐", "gaming", 1, "voice", "mario wahoo", "Wahoo !", "Le cri de saut le plus célèbre."],
    ["mariotheme", "Super Mario Bros. (thème)", "🍄", "gaming", 1, "song", "super mario bros theme", "", "Le thème qu’on fredonne tous."],
    ["tetris", "Tetris (Korobeiniki)", "🧱", "gaming", 1, "song", "tetris theme", "", "La mélodie des blocs qui tombent."],
    ["megalovania", "Megalovania", "💀", "gaming", 2, "song", "megalovania", "", "Le thème de Sans, dans Undertale."],
    ["ahshit", "Ah shit, here we go again", "🚲", "gaming", 2, "voice", "ah shit here we go again", "Ah shit, here we go again.", "CJ, dans GTA San Andreas."],
    ["missionfailed", "Mission failed", "❌", "gaming", 2, "voice", "mission failed we'll get em next time", "Mission failed ! We’ll get ’em next time.", "Raté, on fera mieux la prochaine fois."],
    ["clashlaugh", "Rire du roi (Clash Royale)", "👑", "gaming", 2, "voice", "clash royale king laugh", "Hé hé hé hâw !", "Le rire le plus agaçant du jeu."],
    ["pika", "Pika Pika", "⚡", "gaming", 1, "voice", "pikachu pika pika", "Pika pika !", "La voix de Pikachu."],
    ["oof", "Oof (Roblox)", "😵", "gaming", 1, "voice", "roblox oof", "Ouf !", "Le grognement de mort de Roblox."],
    ["wasted", "Wasted (GTA)", "💀", "gaming", 2, "sfx", "gta wasted", "", "Le jingle de défaite de GTA."],
    ["fnaf", "Jumpscare FNAF", "🐻", "gaming", 2, "sfx", "fnaf jumpscare", "", "Le cri qui fait lâcher la souris."],
    ["hitmarker", "Hitmarker", "🎯", "gaming", 1, "sfx", "hitmarker", "", "Le tic des montages de snipers."],
    ["mcvillager", "Villageois Minecraft", "🧑‍🌾", "gaming", 2, "voice", "minecraft villager hmm", "Hmm. Hmmm. HMMMM.", "Le villageois qui n’est pas d’accord."],
    ["amongdrip", "Among Us Drip", "🕺", "gaming", 2, "song", "among us drip", "", "Le groove des imposteurs.", { start: 0.2 }],

    /* ---- répliques cultes ---- */
    ["hellothere", "Hello there !", "⚔️", "repliques", 2, "voice", "hello there obi wan", "Hello there !", "La salutation la plus polie de la galaxie."],
    ["highground", "J’ai l’avantage du terrain", "🌋", "repliques", 2, "voice", "it's over anakin i have the high ground", "It’s over, Anakin ! I have the high ground !", "Obi-Wan, sur la planète en fusion."],
    ["iamyourfather", "No, I am your father", "🖤", "repliques", 2, "voice", "no i am your father", "No, I am your father.", "La révélation de Dark Vador."],
    ["inevitable", "I am inevitable", "🫰", "repliques", 2, "voice", "thanos i am inevitable", "I am inevitable.", "Thanos et son claquement de doigts."],
    ["doordonot", "Do or do not", "🟢", "repliques", 2, "voice", "yoda do or do not there is no try", "Do or do not. There is no try.", "La sagesse de Yoda."],
    ["shrekswamp", "What are you doing in my swamp ?", "🧅", "repliques", 2, "voice", "shrek what are you doing in my swamp", "What are you doing in my swamp ?!", "Shrek, très mécontent."],
    ["emotional", "Emotional Damage", "💔", "repliques", 2, "voice", "emotional damage", "That’s emotional damage !", "La phrase qui fait toujours aussi mal."],
    ["noice", "Noice", "👌", "repliques", 2, "voice", "noice", "Noice.", "L’approbation parfaite."],
    ["titanic", "Titanic (la flûte)", "🚢", "repliques", 2, "song", "titanic flute my heart will go on", "", "La flûte la plus massacrée des écoles."],
    ["imperial", "La Marche impériale", "🤖", "repliques", 2, "song", "imperial march star wars", "", "Le thème de Dark Vador."],
    ["missionimp", "Mission: Impossible (thème)", "🧨", "repliques", 2, "song", "mission impossible theme", "", "Le thème qui s’autodétruit dans cinq secondes."],
    ["pinkpanther", "La Panthère rose", "🐆", "repliques", 2, "song", "pink panther theme", "", "Le thème le plus discret du monde."],

    /* ---- cris et réactions ---- */
    ["faaah", "Faaah", "😱", "cris", 1, "voice", "faaah", "Faaaah !", "Le cri de surprise viral."],
    ["wilhelm", "Wilhelm Scream", "😱", "cris", 2, "voice", "wilhelm scream", "Aaaaah !", "Le cri de film d’action utilisé depuis 1951."],
    ["mj", "Hee-hee (Michael Jackson)", "🧤", "cris", 2, "voice", "michael jackson hee hee", "Hii-hii !", "Le petit cri le plus imité du monde."],
    ["tarzan", "Cri de Tarzan", "🌴", "cris", 2, "voice", "tarzan yell", "Aaah-ah-ah-aaah !", "Le cri de la jungle."],
    ["evillaugh", "Rire diabolique", "😈", "cris", 1, "voice", "evil laugh", "Mouhahaha !", "Le rire de tous les méchants."],
    ["goofy", "Goofy ahh", "🤪", "cris", 2, "voice", "goofy ahh laugh", "Ah-hyuck !", "Le rire débile des edits."],
    ["yeet", "Yeet", "🏹", "absurde", 1, "voice", "yeet", "Yeeeet !", "Le cri du lancer parfait."],
    ["uwu", "UwU", "🥺", "absurde", 2, "voice", "uwu", "UwU~", "La petite voix kawaii."],
    ["ara", "Ara Ara", "😳", "absurde", 3, "voice", "ara ara anime", "Ara ara~", "La petite voix qui fait tourner les têtes."],
    ["nani", "Nani ?!", "😨", "absurde", 2, "voice", "nani omae wa mou shindeiru", "Nani ?!", "Le choc absolu, façon anime."],
    ["omae", "Omae wa mou shindeiru", "👊", "absurde", 3, "voice", "omae wa mou shindeiru", "Omae wa mou shindeiru.", "Tu es déjà mort."],
    ["kame", "Kamehameha", "🌀", "absurde", 2, "voice", "kamehameha goku", "Kaaa-méeeé-haaa-méééé… HAAA !", "La vague d’énergie de Goku."],
    ["dattebayo", "Dattebayo !", "🍥", "absurde", 3, "voice", "dattebayo naruto", "Dattebayo !", "Le tic de langage de Naruto."],
    ["illuminati", "Illuminati confirmed", "🔺", "absurde", 2, "song", "illuminati confirmed", "", "Le thème des triangles mystérieux."],

    /* ---- animaux ---- */
    ["nootnoot", "Noot noot (Pingu)", "🐧", "animaux", 2, "voice", "noot noot pingu", "Noot noot !", "Le cri du manchot le plus célèbre."],
    ["goat", "Chèvre qui hurle", "🐐", "animaux", 2, "voice", "goat scream", "Mèèèèh… aaaah !", "La chèvre qui crie comme un humain."],
    ["cocorico", "Cocorico", "🐓", "animaux", 1, "voice", "cocorico rooster", "Cocoricooo !", "Le coq à 6 heures du matin."],

    /* ---- effets sonores (mode « Tous les sons ») ---- */
    ["vineboom", "Vine Boom", "💥", "international", 1, "sfx", "vine boom", "", "Le boom qui ponctue absolument tout."],
    ["bruh", "Bruh", "😐", "international", 2, "sfx", "bruh", "Bruh.", "La réaction ultime face à une évidence."],
    ["metalpipe", "Metal Pipe", "🪈", "absurde", 1, "sfx", "metal pipe falling", "", "Un tuyau en métal qui tombe. C’est tout."],
    ["bonk", "Bonk", "🔨", "absurde", 1, "sfx", "bonk", "", "Le coup sur la tête qui règle tous les débats."],
    ["boing", "Boing", "🌀", "absurde", 2, "sfx", "boing spring", "", "Le ressort de cartoon par excellence."],
    ["airhorn", "Air Horn", "📯", "international", 1, "sfx", "mlg air horn", "", "L’air horn des montages MLG."],
    ["sadtrombone", "Trombone triste", "🎺", "repliques", 2, "sfx", "sad trombone", "", "Wah wah wah waaah."],
    ["sadviolin", "Violon triste", "🎻", "repliques", 1, "sfx", "sad violin", "", "Pour toutes les déceptions."],
    ["badumtss", "Ba dum tss", "🥁", "repliques", 1, "sfx", "ba dum tss", "", "La batterie qui souligne la blague."],
    ["winserror", "Windows Error", "💻", "ancien", 1, "sfx", "windows xp error", "", "Le drame absolu de Windows XP."],
    ["xpstartup", "Démarrage Windows XP", "🖥️", "ancien", 1, "sfx", "windows xp startup", "", "La mélodie de l’écran bleu paradis."],
    ["msn", "Notification MSN", "💬", "ancien", 1, "sfx", "msn messenger notification", "", "Quelqu’un se connecte sur MSN."],
    ["modem56k", "Modem 56k", "📠", "ancien", 3, "sfx", "dial up modem", "", "Le chant de la connexion à Internet."],
    ["discordping", "Discord Ping", "🔔", "recent", 1, "sfx", "discord notification", "", "Le ping qui fait toujours sursauter."],
    ["taco", "Taco Bell Bong", "🔔", "international", 1, "sfx", "taco bell bong", "", "Le gong de Taco Bell."],
    ["gameover", "Game Over", "🎮", "gaming", 1, "sfx", "game over", "", "La fin de la partie, version dramatique."],
    ["mcxp", "Minecraft : XP", "⛏️", "gaming", 1, "sfx", "minecraft xp orb", "", "Le petit ding de l’expérience qui monte."],
    ["buzzer", "Buzzer de quiz", "❌", "repliques", 1, "sfx", "wrong answer buzzer", "", "Mauvaise réponse. Encore."],
    ["fartreverb", "Pet avec écho", "💨", "absurde", 1, "sfx", "fart with reverb", "", "Subtil. Surtout avec de la réverb."]
  ];

  var OFFICIAL = TABLE.map(function (r) {
    var o = r[9] || {};
    var m = {
      id: r[0], name: r[1], emoji: r[2], cat: r[3], diff: r[4], kind: r[5], voc: r[5] !== "sfx",
      q: r[6], say: r[7] || "", desc: r[8] || "",
      auto: true, max: o.max || 5, start: o.start || 0,
      file: sound(r[0])
    };
    m.files = LEGACY[r[0]] ? [sound(r[0]), legacy(r[0])] : [sound(r[0])];
    return m;
  });

  var byId = {};
  OFFICIAL.forEach(function (m) { byId[m.id] = m; });

  var MimicBank = {
    CATS: CATS,
    KINDS: KINDS,
    OFFICIAL: OFFICIAL,
    byId: function (id) { return byId[String(id || "")] || null; },
    cat: function (id) {
      for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i];
      return { id: id, label: String(id || ""), emoji: "🎵" };
    },
    kind: function (k) { return KINDS[k] || { label: "Son", emoji: "🎵" }; },
    /** Filtre la banque (catégories vides = toutes, diff 0 = toutes, voc = seulement paroles/chants). */
    filter: function (o) {
      o = o || {};
      var cats = Array.isArray(o.cats) ? o.cats : [];
      var diff = Number(o.diff) || 0;
      var voc = !!o.voc;
      return OFFICIAL.filter(function (m) {
        if (cats.length && cats.indexOf(m.cat) < 0) return false;
        if (diff && m.diff > diff) return false;
        if (voc && !m.voc) return false;
        return true;
      });
    },
    /** Choisit un mème non encore joué. Renvoie null si le vivier est épuisé. */
    pick: function (pool, used, rnd) {
      var r = typeof rnd === "function" ? rnd : Math.random;
      var list = (pool || []).filter(function (m) { return !used || used.indexOf(m.id) < 0; });
      if (!list.length) return null;
      return list[Math.floor(r() * list.length)];
    }
  };

  root.MimicBank = MimicBank;
})(typeof window !== "undefined" ? window : globalThis);
