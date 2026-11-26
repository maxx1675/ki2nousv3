/* MIMIC PARTY — bibliothèque de mèmes officielle.
 *
 * Chaque entrée pointe vers un vrai extrait audio dans `sounds/`.
 * `start` et `dur` décrivent le passage exact envoyé à tous les joueurs :
 * le même fichier, le même extrait, donc la même référence pour tout le monde.
 * Pour enrichir la banque, il suffit d'ajouter un MP3 dans `sounds/` et une
 * entrée dans OFFICIAL : le jeu n'a pas besoin d'être modifié.
 *
 * Champs : id, name, emoji, cat, dur, diff, desc (facultatif), file, start.
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
      desc: "Le meme où le saxophone devient de plus en plus fort.",
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
      id: "etcestok", name: "Et c'est ok !", emoji: "👌", cat: "fr", dur: 2.2, diff: 1,
      desc: "Le « et c'est ok ! » qui valide absolument tout.",
      file: sound("etcestok")
    },
    {
      id: "cestvrai", name: "C'est vrai ?", emoji: "🤨", cat: "fr", dur: 0.9, diff: 1,
      desc: "La petite question qui relance le débat.",
      file: sound("cestvrai")
    },
    {
      id: "toctoc", name: "Toc toc, on frappe", emoji: "🚪", cat: "fr", dur: 5.5, diff: 2, start: 0.1,
      desc: "Toc toc : on frappe à ma porte.",
      file: sound("toctoc")
    },
    {
      id: "mickeyfr", name: "Mickey français", emoji: "🐭", cat: "fr", dur: 4.5, diff: 2, start: 0.4,
      desc: "La voix de Mickey, version française.",
      file: sound("mickeyfr")
    },
    {
      id: "petitponey", name: "Petit Poney", emoji: "🐴", cat: "fr", dur: 5.0, diff: 1, start: 0.2,
      desc: "La chanson qui reste dans la tête pendant trois jours.",
      file: sound("petitponey")
    },
    {
      id: "sncf", name: "Remix SNCF", emoji: "🚆", cat: "fr", dur: 5.0, diff: 2, start: 0.4,
      desc: "Le remix SNCF qui annonce les galères du voyage.",
      file: sound("sncf")
    },
    {
      id: "gta", name: "Notification GTA V", emoji: "🚔", cat: "recent", dur: 1.6, diff: 1,
      desc: "La notification de mission de GTA V.",
      file: sound("gta")
    },
    {
      id: "applepay", name: "Apple Pay", emoji: "💳", cat: "recent", dur: 1.5, diff: 1,
      desc: "Le petit ding du paiement sans contact.",
      file: sound("applepay")
    },
    {
      id: "animewow", name: "Anime Wow", emoji: "😮", cat: "international", dur: 4.3, diff: 2,
      desc: "Le « wow » des animes, parfait pour une révélation.",
      file: sound("animewow")
    },
    {
      id: "undertaker", name: "Cloche de l'Undertaker", emoji: "🔔", cat: "international", dur: 4.3, diff: 1,
      desc: "La cloche qui annonce le tombé.",
      file: sound("undertaker")
    },
    {
      id: "bonecrack", name: "Craquement d'os", emoji: "🦴", cat: "absurde", dur: 1.1, diff: 1,
      desc: "Un craquement d'os très satisfaisant.",
      file: sound("bonecrack")
    },
    {
      id: "capcut", name: "Explosion CapCut", emoji: "💣", cat: "recent", dur: 3.3, diff: 1,
      desc: "L'explosion des edits CapCut.",
      file: sound("capcut")
    },
    {
      id: "spongebob", name: "Échec de SpongeBob", emoji: "🧽", cat: "international", dur: 3.5, diff: 1,
      desc: "Le petit échec de SpongeBob, toujours au bon moment.",
      file: sound("spongebob")
    },
    {
      id: "huhcat", name: "Huh ? du chat", emoji: "🐱", cat: "animaux", dur: 0.5, diff: 1,
      desc: "Le « huh ? » du chat qui n'a rien compris.",
      file: sound("huhcat")
    },
    {
      id: "mjhehee", name: "Michael Jackson : Hee hee", emoji: "🕴️", cat: "international", dur: 1.5, diff: 2,
      desc: "Le « hee hee » le plus célèbre de la pop.",
      file: sound("mjhehee")
    },
    {
      id: "rizz", name: "Rizz", emoji: "😏", cat: "recent", dur: 1.9, diff: 2,
      desc: "Le petit son qui accompagne un moment de charme.",
      file: sound("rizz")
    }
  ];

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
