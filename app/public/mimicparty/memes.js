/* MIMIC PARTY — bibliothèque de mèmes officielle.
 *
 * Chaque entrée pointe vers un vrai extrait audio dans `sounds/`.
 * `start` et `dur` décrivent le passage exact envoyé à tous les joueurs :
 * le même fichier, le même extrait, donc la même référence pour tout le monde.
 * Pour enrichir la banque, il suffit d'ajouter un MP3 dans `sounds/` et une
 * entrée dans OFFICIAL : le jeu n'a pas besoin d'être modifié.
 *
 * Champs : id, name, emoji, cat, dur, diff, desc (facultatif), file, start.
 *
 * Mèmes « auto » (liste VIRAL plus bas) : pas de `dur` à renseigner. Le jeu mesure
 * le fichier au chargement et garde ses `max` premières secondes (5 s par défaut).
 * `q` = mots-clés de recherche utilisés par tools/fetch-sounds.js pour télécharger
 * le MP3 dans sounds/. Un fichier absent n'est jamais joué : le mème est ignoré.
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

  function sound(id) { return "/mimicparty/sounds/" + id + ".mp3"; }

  var OFFICIAL = [
    {
      id: "vineboom", name: "Vine Boom", emoji: "💥", cat: "international", dur: 1.2, diff: 1,
      desc: "Le boom qui ponctue absolument tout.",
      file: sound("vineboom")
    },
    {
      id: "bruh", name: "Bruh", emoji: "😐", cat: "international", dur: 0.8, diff: 2,
      desc: "La réaction ultime face à une évidence.",
      file: sound("bruh")
    },
    {
      id: "trollface", name: "Rire de Trollface", emoji: "😈", cat: "international", dur: 1.7, diff: 2, start: 0.6,
      desc: "Le rire qui annonce une bonne vieille embrouille.",
      file: sound("trollface")
    },
    {
      id: "winserror", name: "Windows Error", emoji: "💻", cat: "ancien", dur: 0.9, diff: 1,
      desc: "Le drame absolu de Windows XP.",
      file: sound("winserror")
    },
    {
      id: "metalpipe", name: "Metal Pipe", emoji: "🪈", cat: "international", dur: 1.8, diff: 1, start: 0.1,
      desc: "Un tuyau en métal qui tombe. C'est tout.",
      file: sound("metalpipe")
    },
    {
      id: "amongus", name: "Among Us", emoji: "🚀", cat: "gaming", dur: 3.0, diff: 2, start: 0.3,
      desc: "Le son de rôle qui déclenche les pires accusations.",
      file: sound("amongus")
    },
    {
      id: "mcxp", name: "Minecraft : XP", emoji: "⛏️", cat: "gaming", dur: 0.7, diff: 1,
      desc: "Le petit ding de l'expérience qui monte.",
      file: sound("mcxp")
    },
    {
      id: "mcvillager", name: "Villageois Minecraft", emoji: "🧑‍🌾", cat: "gaming", dur: 1.1, diff: 2, start: 0.2,
      desc: "Hmm. Hmmm. HMMMM.",
      file: sound("mcvillager")
    },
    {
      id: "mcwood", name: "Clic bois Minecraft", emoji: "🪵", cat: "gaming", dur: 0.5, diff: 1,
      desc: "Le clic satisfaisant du bois qui casse.",
      file: sound("mcwood")
    },
    {
      id: "coin", name: "Pièce de jeu vidéo", emoji: "🪙", cat: "gaming", dur: 1.5, diff: 1, start: 0.3,
      desc: "Le bruit de la pièce que tout le monde connaît.",
      file: sound("coin")
    },
    {
      id: "gameover", name: "Game Over", emoji: "🎮", cat: "gaming", dur: 3.0, diff: 1,
      desc: "La fin de la partie, version dramatique.",
      file: sound("gameover")
    },
    {
      id: "discordping", name: "Discord Ping", emoji: "🔔", cat: "recent", dur: 0.3, diff: 1, start: 0.3,
      desc: "Le ping qui fait toujours sursauter.",
      file: sound("discordping")
    },
    {
      id: "retro-ring", name: "Sonnerie rétro", emoji: "📞", cat: "ancien", dur: 3.0, diff: 2, start: 0.1,
      desc: "Le téléphone fixe qui n'arrête jamais.",
      file: sound("retro-ring")
    },
    {
      id: "airhorn", name: "Air Horn", emoji: "📯", cat: "international", dur: 2.5, diff: 1,
      desc: "L'air horn des montages MLG.",
      file: sound("airhorn")
    },
    {
      id: "sadtrombone", name: "Trombone triste", emoji: "🎺", cat: "repliques", dur: 3.0, diff: 2, start: 0.2,
      desc: "Wah wah wah waaah.",
      file: sound("sadtrombone")
    },
    {
      id: "scratch", name: "Scratch de disque", emoji: "💿", cat: "ancien", dur: 0.6, diff: 1,
      desc: "Le stop brutal d'un DJ.",
      file: sound("scratch")
    },
    {
      id: "bassdrop", name: "Bass Drop", emoji: "🔊", cat: "recent", dur: 3.0, diff: 1,
      desc: "Le drop qui fait trembler les murs.",
      file: sound("bassdrop")
    },
    {
      id: "skrrt", name: "Skrrt (pneus)", emoji: "🚗", cat: "cris", dur: 3.0, diff: 2,
      desc: "Le freinage à main qui sent le caoutchouc brûlé.",
      file: sound("skrrt")
    },
    {
      id: "boing", name: "Boing", emoji: "🌀", cat: "absurde", dur: 1.5, diff: 2,
      desc: "Le ressort de cartoon par excellence.",
      file: sound("boing")
    },
    {
      id: "bonk", name: "Bonk", emoji: "🔨", cat: "absurde", dur: 0.4, diff: 1,
      desc: "Le coup sur la tête qui règle tous les débats.",
      file: sound("bonk")
    },
    {
      id: "buzzer", name: "Buzzer de quiz", emoji: "❌", cat: "repliques", dur: 1.1, diff: 1,
      desc: "Mauvaise réponse. Encore.",
      file: sound("buzzer")
    },
    {
      id: "dingding", name: "Ding ding ding !", emoji: "✅", cat: "repliques", dur: 2.0, diff: 1, start: 0.1,
      desc: "Bonne réponse, applaudissez.",
      file: sound("dingding")
    },
    {
      id: "applause", name: "Applaudissements", emoji: "👏", cat: "cris", dur: 3.0, diff: 1, start: 0.1,
      desc: "La foule en délire.",
      file: sound("applause")
    },
    {
      id: "laugh", name: "Rire en boucle", emoji: "😂", cat: "cris", dur: 2.0, diff: 2, start: 0.1,
      desc: "Le rire contagieux des mèmes.",
      file: sound("laugh")
    },
    {
      id: "pigeon", name: "Roucoulement de pigeon", emoji: "🐦", cat: "animaux", dur: 3.0, diff: 3,
      desc: "Le pigeon qui roucoule sans complexe.",
      file: sound("pigeon")
    },
    {
      id: "meow", name: "Miaou", emoji: "🐱", cat: "animaux", dur: 0.7, diff: 3,
      desc: "Un petit miaou venu d'ailleurs.",
      file: sound("meow")
    },
    {
      id: "dogbark", name: "Wouf wouf", emoji: "🐶", cat: "animaux", dur: 2.0, diff: 2, start: 0.3,
      desc: "Le chien qui défend son territoire.",
      file: sound("dogbark")
    },
    {
      id: "quoicoubeh", name: "Quoicoubeh", emoji: "🤨", cat: "fr", dur: 1.6, diff: 3, start: 0.1,
      desc: "La réplique française qui rend fou.",
      file: sound("quoicoubeh")
    },
    {
      id: "atessouhaits", name: "À tes souhaits", emoji: "🤧", cat: "fr", dur: 0.9, diff: 2,
      desc: "L'éternuement suivi de la politesse.",
      file: sound("atessouhaits")
    },
    {
      id: "ohcigaret", name: "C'est carré !", emoji: "✅", cat: "fr", dur: 3.0, diff: 2,
      desc: "La punchline « c'est carré » lâchée avec assurance.",
      file: sound("ohcigaret")
    },
    {
      id: "wesh", name: "Wesh alors", emoji: "🇫🇷", cat: "fr", dur: 3.0, diff: 2,
      desc: "Le ton qui veut tout dire.",
      file: sound("wesh")
    },
    {
      id: "maisnan", name: "Mais nan !", emoji: "🙅", cat: "fr", dur: 3.0, diff: 2, start: 0.1,
      desc: "L'incrédulité à la française.",
      file: sound("maisnan")
    },
    {
      id: "ohno", name: "Oh no, oh no no no", emoji: "😱", cat: "tiktok", dur: 3.0, diff: 2, start: 0.1,
      desc: "Le naufrage en accéléré.",
      file: sound("ohno")
    },
    {
      id: "sax", name: "Saxophones qui montent", emoji: "🎷", cat: "tiktok", dur: 5.0, diff: 1,
      desc: "Le mème où le saxophone devient de plus en plus fort.",
      file: sound("sax")
    },
    {
      id: "sigma", name: "Sigma Phonk", emoji: "🗿", cat: "tiktok", dur: 4.0, diff: 2,
      desc: "Le phonk des edits de sigma.",
      file: sound("sigma")
    },
    {
      id: "hello", name: "Hello ?", emoji: "📞", cat: "repliques", dur: 0.9, diff: 2, start: 0.2,
      desc: "Allô ? Il n'y a plus personne ?",
      file: sound("hello")
    },
    {
      id: "ara", name: "Ara Ara", emoji: "😳", cat: "absurde", dur: 1.3, diff: 3,
      desc: "La petite voix qui fait tourner les têtes.",
      file: sound("ara")
    },
    {
      id: "emotional", name: "Emotional Damage", emoji: "💔", cat: "repliques", dur: 2.9, diff: 2, start: 0.4,
      desc: "La phrase qui fait toujours aussi mal.",
      file: sound("emotional")
    },
    {
      id: "levelup", name: "Level Up", emoji: "⬆️", cat: "youtube", dur: 2.0, diff: 1,
      desc: "La montée de niveau la plus satisfaisante.",
      file: sound("levelup")
    },
    {
      id: "amongdrip", name: "Among Drip", emoji: "🕺", cat: "youtube", dur: 4.0, diff: 2, start: 0.2,
      desc: "Le groove des imposteurs.",
      file: sound("amongdrip")
    },
    {
      id: "faaah", name: "Faaah", emoji: "😱", cat: "cris", dur: 1.2, diff: 1, start: 0,
      desc: "Le cri de surprise viral.",
      file: sound("faaah")
    },
    {
      id: "emotionaldamage", name: "Emotional Damage", emoji: "💔", cat: "repliques", dur: 2.5, diff: 2, start: 0,
      desc: "La réplique culte.",
      file: sound("emotional-damage")
    },
    {
      id: "rizz", name: "Rizz", emoji: "😏", cat: "tiktok", dur: 2.0, diff: 2, start: 0,
      desc: "Le son du charisme.",
      file: sound("rizz")
    },
    {
      id: "skibidi", name: "Skibidi", emoji: "🚽", cat: "tiktok", dur: 2.0, diff: 2, start: 0,
      desc: "Le mème Skibidi Toilet.",
      file: sound("skibidi")
    },
    {
      id: "spongebobfail", name: "SpongeBob Fail", emoji: "🧽", cat: "youtube", dur: 2.0, diff: 1, start: 0,
      desc: "L’échec de Bob l’éponge.",
      file: sound("spongebob-fail")
    },
    {
      id: "bonecrack", name: "Bone Crack", emoji: "🦴", cat: "cris", dur: 1.0, diff: 1, start: 0,
      desc: "Le craquement d’os.",
      file: sound("bone-crack")
    },
    {
      id: "discordnotif", name: "Discord Notification", emoji: "🔔", cat: "gaming", dur: 0.8, diff: 1, start: 0,
      desc: "La notification Discord.",
      file: sound("discord-notification")
    },
    {
      id: "mlgairhorn", name: "MLG Air Horn", emoji: "📢", cat: "gaming", dur: 1.5, diff: 1, start: 0,
      desc: "L’air horn des montages MLG, version intense.",
      file: sound("mlg-airhorn")
    }
  ];

  /* ---- Mèmes viraux « auto » : MP3 à déposer dans sounds/<id>.mp3 (voir tools/fetch-sounds.js) ---- */
  var VIRAL = [
    // [id, nom, emoji, catégorie, difficulté, recherche, description]
    ["oof", "Oof (Roblox)", "😵", "gaming", 1, "roblox oof", "Le grognement de mort le plus célèbre de Roblox."],
    ["hitmarker", "Hitmarker", "🎯", "gaming", 1, "hitmarker", "Le tic des montages de snipers."],
    ["wasted", "Wasted (GTA)", "💀", "gaming", 2, "gta wasted", "Le jingle de défaite de GTA."],
    ["missionfailed", "Mission failed", "❌", "gaming", 2, "mission failed we'll get em next time", "Raté, on fera mieux la prochaine fois."],
    ["clashlaugh", "Rire du roi (Clash Royale)", "👑", "gaming", 2, "clash royale king laugh", "Le « hehehe » le plus agaçant du jeu."],
    ["wilhelm", "Wilhelm Scream", "😱", "cris", 2, "wilhelm scream", "Le cri de film d’action utilisé depuis 1951."],
    ["fnaf", "Jumpscare FNAF", "🐻", "cris", 2, "fnaf jumpscare", "Le cri qui vous fait lâcher la souris."],
    ["sheesh", "Sheeesh", "🥶", "tiktok", 2, "sheesh", "L’admiration étirée à l’extrême."],
    ["bingchilling", "Bing Chilling", "🍦", "tiktok", 2, "bing chilling john cena", "Le mème glacé de John Cena."],
    ["wow", "Anime Wow", "😮", "tiktok", 2, "anime wow", "Le « waaow » d’anime des edits."],
    ["chipi", "Chipi Chipi Chapa Chapa", "🐱", "tiktok", 3, "chipi chipi chapa chapa", "Le chat qui danse sur un air entêtant."],
    ["pedro", "Pedro Pedro Pedro", "🦝", "tiktok", 3, "pedro pedro pedro", "Le raton laveur qui fait le tour du monde."],
    ["tungtung", "Tung Tung Tung Sahur", "🪵", "tiktok", 3, "tung tung tung sahur", "Le brainrot italien à bâton."],
    ["lirili", "Lirili Larila", "🐘", "tiktok", 3, "lirili larila", "L’éléphant-cactus du brainrot."],
    ["sigmaboy", "Sigma Boy", "🎶", "tiktok", 3, "sigma boy", "La chanson qu’on entend partout en 2025."],
    ["nootnoot", "Noot noot (Pingu)", "🐧", "animaux", 2, "noot noot pingu", "Le cri du manchot le plus célèbre."],
    ["dramatic", "Dramatic Chipmunk", "🐿️", "youtube", 1, "dramatic chipmunk", "Le regard de l’écureuil qui change tout."],
    ["whatdog", "What the dog doin ?", "🐕", "youtube", 2, "what the dog doin", "La question existentielle du chien."],
    ["taco", "Taco Bell Bong", "🔔", "international", 1, "taco bell bong", "Le gong de Taco Bell."],
    ["illuminati", "Illuminati confirmed", "🔺", "absurde", 2, "illuminati confirmed", "Le thème des triangles mystérieux."],
    ["fartreverb", "Pet avec écho", "💨", "absurde", 1, "fart with reverb", "Subtil. Surtout avec de la réverb."],
    ["uwu", "UwU", "🥺", "absurde", 2, "uwu", "La petite voix kawaii."],
    ["goofy", "Goofy ahh", "🤪", "absurde", 2, "goofy ahh laugh", "Le rire débile des edits."],
    ["yeet", "Yeet", "🏹", "absurde", 1, "yeet", "Le cri du lancer parfait."],
    ["sadviolin", "Violon triste", "🎻", "repliques", 1, "sad violin", "Pour toutes les déceptions."],
    ["badumtss", "Ba dum tss", "🥁", "repliques", 1, "ba dum tss", "La batterie qui souligne la blague."],
    ["hellothere", "Hello there", "⚔️", "repliques", 2, "hello there obi wan", "La salutation la plus polie de la galaxie."],
    ["noice", "Noice", "👌", "repliques", 2, "noice", "L’approbation parfaite."],
    ["xpstartup", "Démarrage Windows XP", "🖥️", "ancien", 1, "windows xp startup", "La mélodie de l’écran bleu paradis."],
    ["nokia", "Sonnerie Nokia", "📱", "ancien", 1, "nokia ringtone", "La sonnerie la plus jouée de l’histoire."],
    ["msn", "Notification MSN", "💬", "ancien", 1, "msn messenger notification", "Quelqu’un se connecte sur MSN."],
    ["modem56k", "Modem 56k", "📠", "ancien", 3, "dial up modem", "Le chant de la connexion à Internet."],
    ["cpasfaux", "C’est pas faux", "🗡️", "fr", 2, "c'est pas faux kaamelott", "La réplique culte de Perceval."],
    ["nonmaisallo", "Non mais allô quoi", "📞", "fr", 2, "non mais allo quoi", "La réplique culte de l’indignation."],
    ["ohlavache", "Oh la vache !", "🐄", "fr", 1, "oh la vache", "La surprise à la française."],
    ["trucdeouf", "Un truc de ouf", "🤯", "fr", 2, "un truc de ouf", "Quand c’est vraiment incroyable."]
  ];
  VIRAL.forEach(function (v) {
    OFFICIAL.push({
      id: v[0], name: v[1], emoji: v[2], cat: v[3], diff: v[4], q: v[5], desc: v[6],
      auto: true, max: 5, start: 0, file: sound(v[0])
    });
  });

  var byId = {};
  OFFICIAL.forEach(function (m) { byId[m.id] = m; });

  var MimicBank = {
    CATS: CATS,
    OFFICIAL: OFFICIAL,
    byId: function (id) { return byId[String(id || "")] || null; },
    cat: function (id) {
      for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i];
      return { id: id, label: String(id || ""), emoji: "🎵" };
    },
    /** Filtre la banque officielle (catégories vides = toutes, diff 0 = toutes). */
    filter: function (o) {
      o = o || {};
      var cats = Array.isArray(o.cats) ? o.cats : [];
      var diff = Number(o.diff) || 0;
      return OFFICIAL.filter(function (m) {
        if (cats.length && cats.indexOf(m.cat) < 0) return false;
        if (diff && m.diff > diff) return false;
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
