/* Banque musicale du Blind Test.
   Chaque entrée a été vérifiée via YouTube oEmbed (vidéo disponible).
   Les thèmes sont des filtres sur les tags : aucun contenu n'est chargé au hasard
   depuis YouTube, ce qui permet de jouer sans clé d'API. */
(function () {
  "use strict";

  var SONGS = [
    // ---------- Chanson française ----------
    { id: "-0KvBnIvTFs", title: "La vie en rose", artist: "Édith Piaf", year: 1947, tags: ["fr", "classic"] },
    { id: "fVfnEyLOkrM", title: "La bohème", artist: "Charles Aznavour", year: 1965, tags: ["fr", "classic", "60s"] },
    { id: "bb-DKKRN4o8", title: "Les Champs-Élysées", artist: "Joe Dassin", year: 1969, tags: ["fr", "classic", "60s"] },
    { id: "e0esAGxzP6Y", title: "Ne me quitte pas", artist: "Jacques Brel", year: 1959, tags: ["fr", "classic"] },
    { id: "JIQiGN-vO-g", title: "Je t'aime... moi non plus", artist: "Serge Gainsbourg", year: 1969, tags: ["fr", "classic", "60s"] },
    { id: "kJl2ICLpj00", title: "Comme d'habitude", artist: "Claude François", year: 1967, tags: ["fr", "classic", "60s"] },
    { id: "LYAvhujK4nA", title: "Paroles, paroles", artist: "Dalida & Alain Delon", year: 1973, tags: ["fr", "classic", "70s"] },
    { id: "aW3e2knvaE0", title: "Le Sud", artist: "Nino Ferrer", year: 1975, tags: ["fr", "classic", "70s"] },
    { id: "BzA6mnM3dfg", title: "Lettre à France", artist: "Michel Polnareff", year: 1977, tags: ["fr", "classic", "70s"] },
    { id: "HXdP15Ubu6M", title: "Le chanteur", artist: "Daniel Balavoine", year: 1978, tags: ["fr", "classic", "70s"] },
    { id: "hrahPhIu3Oc", title: "Je l'aime à mourir", artist: "Francis Cabrel", year: 1979, tags: ["fr", "classic", "70s"] },
    { id: "X0kS-ZGNVl8", title: "Les Lacs du Connemara", artist: "Michel Sardou", year: 1981, tags: ["fr", "classic", "80s"] },
    { id: "NrQnuMnL2ac", title: "Un autre monde", artist: "Téléphone", year: 1982, tags: ["fr", "80s", "rock"] },
    { id: "M7X6oYg6iro", title: "L'aventurier", artist: "Indochine", year: 1982, tags: ["fr", "80s", "rock"] },
    { id: "_YqzuE-5RE8", title: "Mistral gagnant", artist: "Renaud", year: 1985, tags: ["fr", "80s"] },
    { id: "493R05ifNsI", title: "Je te donne", artist: "Jean-Jacques Goldman", year: 1985, tags: ["fr", "80s"] },
    { id: "OQXbcf9dflw", title: "Place des grands hommes", artist: "Patrick Bruel", year: 1989, tags: ["fr", "80s"] },
    { id: "vkiyW0vqat8", title: "Désenchantée", artist: "Mylène Farmer", year: 1991, tags: ["fr", "90s"] },
    { id: "VHoT4N43jK8", title: "Alors on danse", artist: "Stromae", year: 2009, tags: ["fr", "2000s", "electro"] },
    { id: "oiKj0Z_Xnjc", title: "Papaoutai", artist: "Stromae", year: 2013, tags: ["fr", "2010s"] },
    { id: "K5KAc5CoCuk", title: "Dernière danse", artist: "Indila", year: 2014, tags: ["fr", "2010s"] },
    { id: "59Q_lhgGANc", title: "Makeba", artist: "Jain", year: 2015, tags: ["fr", "2010s"] },
    { id: "niyGWxVE-e4", title: "Avenir", artist: "Louane", year: 2014, tags: ["fr", "2010s"] },
    { id: "Hi7Rx3En7-k", title: "Balance ton quoi", artist: "Angèle", year: 2018, tags: ["fr", "2010s"] },
    { id: "iPGgnzc34tY", title: "Djadja", artist: "Aya Nakamura", year: 2018, tags: ["fr", "2010s", "rap"] },
    { id: "rMltoD1jCGI", title: "Bella", artist: "Gims", year: 2013, tags: ["fr", "2010s"] },
    { id: "5NV6Rdv1a3I", title: "Get Lucky", artist: "Daft Punk", year: 2013, tags: ["fr", "2010s", "electro", "disco"] },
    { id: "FGBhQbmPwH8", title: "One More Time", artist: "Daft Punk", year: 2000, tags: ["fr", "2000s", "electro", "disco"] },
    { id: "JRfuAukYTKg", title: "Titanium", artist: "David Guetta feat. Sia", year: 2011, tags: ["fr", "2010s", "electro"] },
    { id: "NUVCQXMUVnI", title: "Memories", artist: "David Guetta feat. Kid Cudi", year: 2009, tags: ["fr", "2000s", "electro"] },
    { id: "HMUDVMiITOU", title: "Turn Down for What", artist: "DJ Snake & Lil Jon", year: 2013, tags: ["fr", "2010s", "electro", "rap"] },

    // ---------- Classiques internationaux ----------
    { id: "fJ9rUzIMcZQ", title: "Bohemian Rhapsody", artist: "Queen", year: 1975, tags: ["classic", "70s", "rock"] },
    { id: "HgzGwKwLmgM", title: "Don't Stop Me Now", artist: "Queen", year: 1978, tags: ["classic", "70s", "rock"] },
    { id: "xFrGuyw1V8s", title: "Dancing Queen", artist: "ABBA", year: 1976, tags: ["classic", "70s", "disco", "pop"] },
    { id: "I_izvAbhExY", title: "Stayin' Alive", artist: "Bee Gees", year: 1977, tags: ["classic", "70s", "disco"] },
    { id: "Gs069dndIYk", title: "September", artist: "Earth, Wind & Fire", year: 1978, tags: ["classic", "70s", "disco"] },
    { id: "CS9OO0S5w2k", title: "YMCA", artist: "Village People", year: 1978, tags: ["classic", "70s", "disco"] },

    // ---------- Années 80 ----------
    { id: "Zi_XLOBDo_Y", title: "Billie Jean", artist: "Michael Jackson", year: 1982, tags: ["80s", "pop"] },
    { id: "sOnqjkJTMaA", title: "Thriller", artist: "Michael Jackson", year: 1983, tags: ["80s", "pop"] },
    { id: "oRdxUFDoQe0", title: "Beat It", artist: "Michael Jackson", year: 1982, tags: ["80s", "pop", "rock"] },
    { id: "79fzeNUqQbQ", title: "Like a Prayer", artist: "Madonna", year: 1989, tags: ["80s", "pop"] },
    { id: "djV11Xbc914", title: "Take On Me", artist: "a-ha", year: 1985, tags: ["80s", "pop"] },
    { id: "pIgZ7gMze7A", title: "Wake Me Up Before You Go-Go", artist: "Wham!", year: 1984, tags: ["80s", "pop"] },
    { id: "dQw4w9WgXcQ", title: "Never Gonna Give You Up", artist: "Rick Astley", year: 1987, tags: ["80s", "pop"] },
    { id: "qeMFqkcPYcg", title: "Sweet Dreams (Are Made of This)", artist: "Eurythmics", year: 1983, tags: ["80s", "pop", "electro"] },
    { id: "eH3giaIzONA", title: "I Wanna Dance with Somebody", artist: "Whitney Houston", year: 1987, tags: ["80s", "pop", "disco"] },
    { id: "PIb6AZdTr-A", title: "Girls Just Want to Have Fun", artist: "Cyndi Lauper", year: 1983, tags: ["80s", "pop", "disco"] },
    { id: "pAgnJDJN4VA", title: "Back in Black", artist: "AC/DC", year: 1980, tags: ["80s", "rock"] },
    { id: "1w7OgIMMRc4", title: "Sweet Child O' Mine", artist: "Guns N' Roses", year: 1987, tags: ["80s", "rock"] },
    { id: "btPJPFnesV4", title: "Eye of the Tiger", artist: "Survivor", year: 1982, tags: ["80s", "rock"] },
    { id: "9jK-NcRmVcw", title: "The Final Countdown", artist: "Europe", year: 1986, tags: ["80s", "rock"] },
    { id: "lDK9QqIzhwk", title: "Livin' on a Prayer", artist: "Bon Jovi", year: 1986, tags: ["80s", "rock"] },
    { id: "OMOGaugKpzs", title: "Every Breath You Take", artist: "The Police", year: 1983, tags: ["80s", "rock", "pop"] },
    { id: "FTQbiNvZqaY", title: "Africa", artist: "Toto", year: 1982, tags: ["80s", "pop"] },
    { id: "1k8craCGpgs", title: "Don't Stop Believin'", artist: "Journey", year: 1981, tags: ["80s", "rock"] },

    // ---------- Années 90 ----------
    { id: "hTWKbfoikeg", title: "Smells Like Teen Spirit", artist: "Nirvana", year: 1991, tags: ["90s", "rock"] },
    { id: "bx1Bh8ZvH84", title: "Wonderwall", artist: "Oasis", year: 1995, tags: ["90s", "rock"] },
    { id: "SSbBvKaM6sk", title: "Song 2", artist: "Blur", year: 1997, tags: ["90s", "rock"] },
    { id: "XFkzRNyygfk", title: "Creep", artist: "Radiohead", year: 1992, tags: ["90s", "rock"] },
    { id: "6Ejga4kJUts", title: "Zombie", artist: "The Cranberries", year: 1994, tags: ["90s", "rock"] },
    { id: "GLvohMXgcBo", title: "Under the Bridge", artist: "Red Hot Chili Peppers", year: 1991, tags: ["90s", "rock"] },
    { id: "C-u5WLJ9Yk4", title: "...Baby One More Time", artist: "Britney Spears", year: 1998, tags: ["90s", "pop"] },
    { id: "4fndeDfaWCg", title: "I Want It That Way", artist: "Backstreet Boys", year: 1999, tags: ["90s", "pop"] },
    { id: "6M6samPEMpM", title: "Everybody (Backstreet's Back)", artist: "Backstreet Boys", year: 1997, tags: ["90s", "pop"] },
    { id: "gJLIiF15wjQ", title: "Wannabe", artist: "Spice Girls", year: 1996, tags: ["90s", "pop"] },
    { id: "ZyhrYis509A", title: "Barbie Girl", artist: "Aqua", year: 1997, tags: ["90s", "pop", "electro"] },
    { id: "68ugkg9RePc", title: "Blue (Da Ba Dee)", artist: "Eiffel 65", year: 1999, tags: ["90s", "electro"] },
    { id: "nZXRV4MezEw", title: "Believe", artist: "Cher", year: 1998, tags: ["90s", "pop", "electro"] },
    { id: "p47fEXGabaY", title: "Livin' la Vida Loca", artist: "Ricky Martin", year: 1999, tags: ["90s", "pop"] },
    { id: "fPO76Jlnz6c", title: "Gangsta's Paradise", artist: "Coolio feat. L.V.", year: 1995, tags: ["90s", "rap"] },
    { id: "GibiNy4d4gc", title: "Circle of Life", artist: "Carmen Twillie & Lebo M.", year: 1994, tags: ["90s", "film"] },

    // ---------- Années 2000 ----------
    { id: "LOZuxwVk7TU", title: "Toxic", artist: "Britney Spears", year: 2003, tags: ["2000s", "pop"] },
    { id: "_Yhyp-_hX2s", title: "Lose Yourself", artist: "Eminem", year: 2002, tags: ["2000s", "rap"] },
    { id: "5qm8PH4xAss", title: "In Da Club", artist: "50 Cent", year: 2003, tags: ["2000s", "rap"] },
    { id: "PWgvGjAhvIw", title: "Hey Ya!", artist: "Outkast", year: 2003, tags: ["2000s", "rap", "pop"] },
    { id: "ViwtNLUqkMY", title: "Crazy in Love", artist: "Beyoncé feat. Jay-Z", year: 2003, tags: ["2000s", "rap", "pop"] },
    { id: "CvBfHwUxHIk", title: "Umbrella", artist: "Rihanna feat. Jay-Z", year: 2007, tags: ["2000s", "pop", "rap"] },
    { id: "qrO4YZeyl0I", title: "Bad Romance", artist: "Lady Gaga", year: 2009, tags: ["2000s", "pop", "electro"] },
    { id: "uSD4vsh1zDA", title: "I Gotta Feeling", artist: "The Black Eyed Peas", year: 2009, tags: ["2000s", "pop", "electro"] },
    { id: "DUT5rEU6pqM", title: "Hips Don't Lie", artist: "Shakira feat. Wyclef Jean", year: 2006, tags: ["2000s", "pop"] },
    { id: "3gOHvDP_vCs", title: "SexyBack", artist: "Justin Timberlake", year: 2006, tags: ["2000s", "pop", "rap"] },
    { id: "k85mRPqvMbE", title: "Axel F", artist: "Crazy Frog", year: 2005, tags: ["2000s", "electro"] },
    { id: "kXYiU_JCYtU", title: "Numb", artist: "Linkin Park", year: 2003, tags: ["2000s", "rock"] },
    { id: "3YxaaGgTQYM", title: "Bring Me to Life", artist: "Evanescence", year: 2003, tags: ["2000s", "rock"] },
    { id: "0J2QdDbelmY", title: "Seven Nation Army", artist: "The White Stripes", year: 2003, tags: ["2000s", "rock"] },
    { id: "HyHNuVaZJ-k", title: "Feel Good Inc.", artist: "Gorillaz", year: 2005, tags: ["2000s", "rock", "pop"] },
    { id: "d020hcWA_Wg", title: "Clocks", artist: "Coldplay", year: 2002, tags: ["2000s", "rock", "pop"] },
    { id: "yKNxeF4KMsY", title: "Yellow", artist: "Coldplay", year: 2000, tags: ["2000s", "rock", "pop"] },
    { id: "KUmZp8pR1uc", title: "Rehab", artist: "Amy Winehouse", year: 2006, tags: ["2000s", "pop"] },
    { id: "gGdGFtwCNBE", title: "Mr. Brightside", artist: "The Killers", year: 2004, tags: ["2000s", "rock"] },
    { id: "eVTXPUF4Oz4", title: "In the End", artist: "Linkin Park", year: 2001, tags: ["2000s", "rock"] },
    { id: "8DyziWtkfBw", title: "Can't Stop", artist: "Red Hot Chili Peppers", year: 2002, tags: ["2000s", "rock"] },
    { id: "h_L4Rixya64", title: "Best of You", artist: "Foo Fighters", year: 2005, tags: ["2000s", "rock"] },
    { id: "dvgZkm1xWPE", title: "Viva la Vida", artist: "Coldplay", year: 2008, tags: ["2000s", "pop", "rock"] },

    // ---------- Années 2010 / 2020 ----------
    { id: "QGJuMBdaqIw", title: "Firework", artist: "Katy Perry", year: 2010, tags: ["2010s", "pop"] },
    { id: "CevxZvSJLk8", title: "Roar", artist: "Katy Perry", year: 2013, tags: ["2010s", "pop"] },
    { id: "OPf0YbXqDm0", title: "Uptown Funk", artist: "Mark Ronson feat. Bruno Mars", year: 2014, tags: ["2010s", "pop", "disco"] },
    { id: "ZbZSe6N_BXs", title: "Happy", artist: "Pharrell Williams", year: 2013, tags: ["2010s", "pop", "disco"] },
    { id: "9bZkp7q19f0", title: "Gangnam Style", artist: "PSY", year: 2012, tags: ["2010s", "pop", "electro"] },
    { id: "kJQP7kiw5Fk", title: "Despacito", artist: "Luis Fonsi feat. Daddy Yankee", year: 2017, tags: ["2010s", "pop"] },
    { id: "pRpeEdMmmQ0", title: "Waka Waka", artist: "Shakira", year: 2010, tags: ["2010s", "pop"] },
    { id: "JGwWNGJdvx8", title: "Shape of You", artist: "Ed Sheeran", year: 2017, tags: ["2010s", "pop"] },
    { id: "2Vv-BfVoq4g", title: "Perfect", artist: "Ed Sheeran", year: 2017, tags: ["2010s", "pop"] },
    { id: "lp-EO5I60KA", title: "Thinking Out Loud", artist: "Ed Sheeran", year: 2014, tags: ["2010s", "pop"] },
    { id: "YQHsXMglC9A", title: "Hello", artist: "Adele", year: 2015, tags: ["2010s", "pop"] },
    { id: "rYEDA3JcQqw", title: "Rolling in the Deep", artist: "Adele", year: 2010, tags: ["2010s", "pop"] },
    { id: "hLQl3WQQoQ0", title: "Someone Like You", artist: "Adele", year: 2011, tags: ["2010s", "pop"] },
    { id: "4NRXx6U8ABQ", title: "Blinding Lights", artist: "The Weeknd", year: 2019, tags: ["2010s", "pop", "electro"] },
    { id: "XXYlFuWEuKI", title: "Save Your Tears", artist: "The Weeknd", year: 2020, tags: ["2020s", "pop", "electro"] },
    { id: "KEI4qSrkPAs", title: "Can't Feel My Face", artist: "The Weeknd", year: 2015, tags: ["2010s", "pop"] },
    { id: "TUVcZfQe-Kw", title: "Levitating", artist: "Dua Lipa", year: 2020, tags: ["2020s", "pop", "disco"] },
    { id: "LjhCEhWiKXk", title: "Just the Way You Are", artist: "Bruno Mars", year: 2010, tags: ["2010s", "pop"] },
    { id: "7wtfhZwyrcc", title: "Believer", artist: "Imagine Dragons", year: 2017, tags: ["2010s", "rock", "pop"] },
    { id: "ktvTqknDobU", title: "Radioactive", artist: "Imagine Dragons", year: 2012, tags: ["2010s", "rock", "pop"] },
    { id: "hT_nvWreIhg", title: "Counting Stars", artist: "OneRepublic", year: 2013, tags: ["2010s", "pop"] },
    { id: "2vjPBrBU-TM", title: "Chandelier", artist: "Sia", year: 2014, tags: ["2010s", "pop"] },
    { id: "nYh-n7EOtMA", title: "Cheap Thrills", artist: "Sia", year: 2016, tags: ["2010s", "pop"] },
    { id: "8UVNT4wvIGY", title: "Somebody That I Used to Know", artist: "Gotye feat. Kimbra", year: 2011, tags: ["2010s", "pop"] },
    { id: "nlcIKh6sBtc", title: "Royals", artist: "Lorde", year: 2013, tags: ["2010s", "pop"] },
    { id: "PVjiKRfKpPI", title: "Take Me to Church", artist: "Hozier", year: 2013, tags: ["2010s", "pop"] },
    { id: "7PCkvCPvDXk", title: "All About That Bass", artist: "Meghan Trainor", year: 2014, tags: ["2010s", "pop"] },
    { id: "nfWlot6h_JM", title: "Shake It Off", artist: "Taylor Swift", year: 2014, tags: ["2010s", "pop"] },
    { id: "e-ORhEE9VVg", title: "Blank Space", artist: "Taylor Swift", year: 2014, tags: ["2010s", "pop"] },
    { id: "tg00YEETFzg", title: "We Found Love", artist: "Rihanna feat. Calvin Harris", year: 2011, tags: ["2010s", "pop", "electro"] },
    { id: "DyDfgMOUjCI", title: "bad guy", artist: "Billie Eilish", year: 2019, tags: ["2010s", "pop"] },
    { id: "wXhTHyIgQ_U", title: "Circles", artist: "Post Malone", year: 2019, tags: ["2010s", "pop", "rap"] },
    { id: "E07s5ZYygMg", title: "Watermelon Sugar", artist: "Harry Styles", year: 2019, tags: ["2010s", "pop"] },
    { id: "H5v3kku4y6Q", title: "As It Was", artist: "Harry Styles", year: 2022, tags: ["2020s", "pop"] },
    { id: "w2Ov5jzm3j8", title: "Old Town Road", artist: "Lil Nas X feat. Billy Ray Cyrus", year: 2019, tags: ["2010s", "rap", "pop"] },
    { id: "moSFlvxnbgk", title: "Let It Go", artist: "Idina Menzel", year: 2013, tags: ["2010s", "film"] },

    // ---------- Électro ----------
    { id: "_ovdm2yX4MA", title: "Levels", artist: "Avicii", year: 2011, tags: ["2010s", "electro"] },
    { id: "gCYcHz2k5x0", title: "Animals", artist: "Martin Garrix", year: 2013, tags: ["2010s", "electro"] },
    { id: "ebXbLfLACGM", title: "Summer", artist: "Calvin Harris", year: 2014, tags: ["2010s", "electro", "pop"] }
  ];

  function has(tag) {
    return function (s) { return s.tags.indexOf(tag) !== -1; };
  }

  var THEMES = [
    { id: "tout", name: "Tout le répertoire", emoji: "🎲", desc: "Un peu de tout, pour les groupes qui n'arrivent pas à choisir.", where: function () { return true; } },
    { id: "fr", name: "Chanson française", emoji: "🇫🇷", desc: "De Piaf à Aya Nakamura, en passant par Stromae.", where: has("fr") },
    { id: "classic", name: "Classiques 60s-70s", emoji: "📻", desc: "Les tubes qui passent encore en boucle chez mamie.", where: has("classic") },
    { id: "80s", name: "Années 80", emoji: "🕺", desc: "Synthés, clips chelous et refrains indestructibles.", where: has("80s") },
    { id: "90s", name: "Années 90", emoji: "📼", desc: "Boy bands, grunge et dancefloor.", where: has("90s") },
    { id: "2000s", name: "Années 2000", emoji: "💿", desc: "Le retour du rap US, de l'électro et des sonneries.", where: has("2000s") },
    { id: "2010s", name: "Années 2010-2020", emoji: "📱", desc: "Les tubes des réseaux sociaux et des festivals.", where: function (s) { return s.tags.indexOf("2010s") !== -1 || s.tags.indexOf("2020s") !== -1; } },
    { id: "rock", name: "Rock", emoji: "🎸", desc: "Riffs, refrains et air guitar obligatoire.", where: has("rock") },
    { id: "electro", name: "Électro & dance", emoji: "🎛️", desc: "Basses qui piquent et mains en l'air.", where: has("electro") },
    { id: "rap", name: "Rap & R'n'B", emoji: "🎤", desc: "Flow, punchlines et gros refrains.", where: has("rap") },
    { id: "disco", name: "Disco & funk", emoji: "🪩", desc: "Boule à facettes et pas de danse approximatifs.", where: has("disco") },
    { id: "film", name: "Films & dessins animés", emoji: "🎬", desc: "Les chansons qu'on connaît par cœur sans l'avouer.", where: has("film") }
  ];

  function pick(themeId, count) {
    var theme = null;
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === themeId) theme = THEMES[i];
    if (!theme) theme = THEMES[0];
    var pool = SONGS.filter(theme.where);
    // Melange de Fisher-Yates.
    pool = pool.slice();
    for (var j = pool.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var t = pool[j]; pool[j] = pool[k]; pool[k] = t;
    }
    var n = Math.max(1, Math.min(count || pool.length, pool.length));
    return pool.slice(0, n);
  }

  // Comparaison souple : accents, casse, articles, featuring et ponctuation
  // sont ignorés. Les fautes de frappe courantes sont tolérées, mais un mot
  // isolé trop court (« e », « the ») ne peut plus valider un long titre.
  var NUMS = { zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
    deux: "2", trois: "3", quatre: "4", cinq: "5", sept: "7", huit: "8", neuf: "9", dix: "10" };
  function norm(v) {
    var out = String(v == null ? "" : v)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/['’`]/g, "")
      .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
      .replace(/\b(feat|featuring|ft)\b\.?/g, " ")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    // « B.I.G. » devient « b i g » après ponctuation : on recolle les
    // initiales pour que « Notorious BIG » retrouve « Notorious B.I.G. ».
    out = out.replace(/\b([a-z])\s+(?=[a-z]\b)/g, "$1");
    out = out.replace(/\b([a-z])\s+(?=[a-z]\b)/g, "$1");
    out = out.replace(/\b[a-z]+\b/g, function (w) { return NUMS.hasOwnProperty(w) ? NUMS[w] : w; });
    return out.trim();
  }
  function strip(v) {
    var out = v;
    for (var i = 0; i < 3; i++) {
      var next = out.replace(/^(the|les|le|la|los|las|a|an|un|une|des|de|du)\s+/, "");
      if (next === out) break;
      out = next;
    }
    return out;
  }
  // Distance d'édition avec transpositions adjacentes (OSA), suffisante pour
  // les noms de chansons et d'artistes.
  function editDistance(a, b) {
    var rows = [], i, j;
    for (i = 0; i <= a.length; i++) rows[i] = [i];
    for (j = 0; j <= b.length; j++) rows[0][j] = j;
    for (i = 1; i <= a.length; i++) {
      for (j = 1; j <= b.length; j++) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        var d = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) {
          d = Math.min(d, rows[i - 2][j - 2] + 1);
        }
        rows[i][j] = d;
      }
    }
    return rows[a.length][b.length];
  }
  function near(a, b) {
    if (a === b) return true;
    if (a.length < 4 || b.length < 4) return false;
    // Une faute de frappe conserve presque toujours la première lettre ;
    // l'exiger évite de confondre deux mots différents (« station »/« nation »).
    if (a.charAt(0) !== b.charAt(0)) return false;
    var max = Math.max(a.length, b.length);
    var allowed = max >= 12 ? 2 : 1;
    if (Math.abs(a.length - b.length) > allowed) return false;
    return editDistance(a, b) <= allowed;
  }
  function wordMatch(a, b) {
    if (a === b) return true;
    if (a.length < 4 || b.length < 4) return false;
    if (a.charAt(0) !== b.charAt(0)) return false;
    var max = Math.max(a.length, b.length);
    var allowed = max >= 8 ? 2 : 1;
    if (Math.abs(a.length - b.length) > allowed) return false;
    return editDistance(a, b) <= allowed;
  }
  function containsWords(haystack, needle) {
    var h = haystack.split(" ").filter(Boolean);
    var n = needle.split(" ").filter(Boolean);
    if (!n.length || n.length > h.length || needle.length < 4) return false;
    for (var i = 0; i <= h.length - n.length; i++) {
      var ok = true;
      for (var j = 0; j < n.length; j++) {
        if (!wordMatch(n[j], h[i + j])) { ok = false; break; }
      }
      if (ok) return true;
    }
    return false;
  }
  var NOISE_WORDS = /^(and|the|of|a|an|to|in|on|at|by|for|or|de|la|le|les|un|une|des|du|et)$/;
  function allWordsPresent(guess, answer) {
    var aw = answer.split(" ").filter(function (w) { return w.length > 2 && !NOISE_WORDS.test(w); });
    if (aw.length < 2) return false;
    var gw = guess.split(" ").filter(Boolean);
    return aw.every(function (w) {
      return gw.some(function (g) { return wordMatch(g, w); });
    });
  }
  /* Variantes acceptées pour une réponse attendue :
     - « Blue (Da Ba Dee) » accepte aussi « Da Ba Dee » ;
     - pour un artiste, chaque nom d'une collaboration compte séparément. */
  function variants(answer, kind) {
    var raw = String(answer == null ? "" : answer);
    var out = [{ s: raw, exact: false }];
    var re = /[\(\[]([^)\]]+)[\)\]]/g, m;
    while ((m = re.exec(raw))) {
      var inner = m[1].trim(), whole = m[0];
      if (!inner || /^(feat|featuring|ft|with|avec|live|remix|version|edit|remaster|official|audio|video|clip|lyrics?)\b/i.test(inner)) continue;
      out.push({ s: inner, exact: false });
      out.push({ s: raw.replace(whole, function () { return " " + inner + " "; }), exact: false });
    }
    if (kind === "artist") {
      var segs = raw.split(/\s*(?:&|,|\+)\s*|\s+(?:feat\.?|featuring|ft\.?|x|vs\.?|and|et|with|avec)\s+/i);
      if (segs.length > 1) segs.forEach(function (x) { x = x.trim(); if (x.length >= 3) out.push({ s: x, exact: true }); });
    }
    return out;
  }
  function exactish(g, a) {
    if (g === a || g.replace(/ /g, "") === a.replace(/ /g, "")) return true;
    var x = strip(g), y = strip(a);
    return x === y || near(x, y);
  }
  function matchOne(g, a) {
    if (g === a) return true;
    if (g.replace(/ /g, "") === a.replace(/ /g, "")) return true; // « aha » = « a-ha »
    var gs = strip(g), as = strip(a);
    if (gs === as) return true;
    var gc = gs.replace(/ /g, ""), ac = as.replace(/ /g, "");
    if (near(gs, as) || near(gc, ac)) return true;
    var gw = gs.split(" ").filter(Boolean), aw = as.split(" ").filter(Boolean);
    // La réponse est contenue dans ce que le joueur a tapé (« Daft Punk Get Lucky ») :
    // les mots en trop sont limités pour refuser les listes de mots au hasard.
    if (gw.length <= aw.length + 2 && (containsWords(gs, as) || allWordsPresent(gs, as))) return true;
    // Réponse partielle : elle doit couvrir une vraie partie de la réponse
    // (« Queen » ne valide plus « Dancing Queen »).
    if (aw.length >= 2 && containsWords(as, gs)) {
      if (gc.length / Math.max(1, ac.length) >= 0.5) return true;
      if (gw.length >= 3 && as.indexOf(gs) === 0) return true; // début du titre
    }
    return false;
  }
  function match(guess, answer, kind) {
    var g = norm(guess);
    if (!g) return false;
    var vs = variants(answer, kind);
    for (var i = 0; i < vs.length; i++) {
      var a = norm(vs[i].s);
      if (!a) continue;
      if (vs[i].exact ? exactish(g, a) : matchOne(g, a)) return true;
    }
    return false;
  }
  function cleanTitle(v) {
    var t = String(v || "");
    t = t.replace(/[【「『]/g, "[").replace(/[】」』]/g, "]");
    t = t.replace(/[\u2600-\u27BF\u{1F300}-\u{1FAFF}]/gu, " ");
    // Crochets et parenthèses : presque toujours des mentions de version.
    t = t.replace(/\s*[\(\[]([^)\]]*)[\)\]]/g, function (all, inner) {
      return /\b(official|oficial|officiel|officielle|videoclip|video|vidéo|clip|audio|lyrics?|paroles|letra|legendado|tradu[cç][aã]o|sub|remaster|hd|hq|4k|8k|\d{3,4}p|live|version|visuali[sz]er|performance|m\/?v|explicit|clean|full\s+song|high\s+quality|edit|extended|instrumental|karaoke)\b/i.test(inner) ? " " : all;
    });
    // « feat. » / « ft. » : on retire l'invité du titre affiché.
    t = t.replace(/\s*[\(\[]\s*(feat\.?|featuring|ft\.?)\s+[^)\]]*[\)\]]/gi, " ");
    t = t.replace(/\s+(feat\.?|featuring|ft\.?)\s+.*$/i, " ");
    // Suffixes de version après un tiret. On reste prudent : « - Video »,
    // « - Audio », « - Live » ou « - Version » seuls peuvent être le titre.
    t = t.replace(/\s*[-–—]\s*(official|officiel(?:le)?|clip|lyrics?|paroles|letra|legendado|tradu[cç][aã]o|sub|remaster(?:ed)?|visuali[sz]er|performance|m\/?v|hd|hq|4k|8k|\d{3,4}p|explicit|clean|radio\s+edit|album\s+version|single\s+version|extended|instrumental|karaoke|full\s+song|high\s+quality)\b.*$/i, " ");
    t = t.replace(/\s*[-–—]\s*live\s+(?:at|from|in|@)\s+.*$/i, " ");
    t = t.replace(/\s*[\(\[]\s*[\)\]]\s*/g, " ");
    t = t.replace(/^[\s\-–—|:]+|[\s\-–—|:]+$/g, "");
    return t.replace(/\s+/g, " ").trim();
  }
  function cleanArtist(v) {
    var t = String(v || "");
    t = t.replace(/\s*-\s*topic$/i, "");
    t = t.replace(/\s*vevo$/i, "");
    t = t.replace(/\s*official(\s+channel)?$/i, "");
    return t.replace(/\s+/g, " ").trim();
  }
  var GENERIC_ARTIST = /^(various artists?|various|va|unknown|unknown artist|artiste inconnu|official|album(?:s)?(?: fr| français| francais| anglais| us| uk)?|playlist|compilation|best of|hits?|chansons?|songs?|musique|music|topic|french music|chansons françaises|chansons francaises)$/;
  /* Chaînes de compilation : « Album fr », « Album Français », « Best of 80s »…
     Elles ne sont pas l'artiste du morceau. On préfère alors lire le titre
     « Artiste - Titre » plutôt que d'afficher le nom de la chaîne. */
  // Chaînes de labels / de paroles : le nom de la chaîne n'est pas l'artiste.
  var LABEL_WORDS = /\b(records?|recordings|music|musique|entertainment|label|vevo|tv|channel|chaine|network|studios?|productions?|media|lyrics?|clips?|universal|sony|warner|nation|official)\b/;
  function isGenericArtist(v) {
    var n = norm(cleanArtist(v));
    if (!n) return true;
    if (GENERIC_ARTIST.test(n)) return true;
    if (LABEL_WORDS.test(n)) return true;
    return /^(album|playlist|compilation|best of)\b/.test(n);
  }
  function sameSegment(a, b) {
    var x = strip(norm(a)), y = strip(norm(b));
    if (!x || !y) return false;
    return x === y || near(x, y);
  }
  function segmentHasArtist(segment, artist) {
    var seg = cleanArtist(String(segment || ""));
    var s = norm(seg), a = norm(artist);
    if (!s || !a) return false;
    if (s === a || s.replace(/ /g, "") === a.replace(/ /g, "")) return true;
    // Un segment qui contient juste le nom de l'artiste au milieu d'un titre
    // (« Dancing Queen » pour l'artiste Queen) ne doit pas être pris pour
    // l'artiste. On n'accepte la contenance que pour les collaborations.
    if (!hasCollab(seg)) return false;
    var aw = a.split(" ").filter(function (w) { return w.length > 1; });
    if (!aw.length) return false;
    var sw = s.split(" ");
    return aw.every(function (w) {
      return sw.some(function (x) { return x === w || wordMatch(x, w); });
    });
  }
  function hasCollab(v) {
    return /(?:&|\band\b|\bx\b|,|\bfeat\b|\bft\b|\bvs\b)/i.test(String(v || ""));
  }
  function isLiveSegment(v) {
    return /^(live|en concert|concert)$/i.test(String(v || "").trim());
  }
  // Segments qui ne sont ni le titre ni l'artiste (« Official Video », « Lyrics »…).
  var NOISE_SEG = /^(official(?:\s+(?:music|lyrics?|lyric|video|audio|clip|mv|m\/v|visuali[sz]er|hd))*|clip\s+officiel(?:le)?|vid[eé]o\s+officiel(?:le)?|audio\s+officiel|lyrics?(?:\s+video)?|paroles|with\s+lyrics|audio|video|vid[eé]o|hd|hq|4k|mv|m\/v|visuali[sz]er|remaster(?:ed)?(?:\s+\d{4})?|full\s+(?:song|album)|topic)$/i;
  var VERSION_SEG = /\b(acoustic|acoustique|version|remix|mix|edit|cover|live|session|reprise|instrumental|demo|unplugged|remaster\w*|extended|radio)\b/i;
  /* « Artiste - Titre » (forme la plus courante), « Artiste - Titre - Artiste »,
     « Artiste - Titre - Live ». */
  function fromParts(parts) {
    if (parts.length >= 3 && sameSegment(parts[0], parts[parts.length - 1])) {
      return { title: parts.slice(1, -1).join(" - "), artist: parts[0] };
    }
    if (parts.length >= 3 && isLiveSegment(parts[parts.length - 1])) parts = parts.slice(0, -1);
    return { title: parts.slice(1).join(" - "), artist: parts[0] };
  }
  /* Sépare un titre YouTube du type « Artiste - Titre - Artiste ».
     L'artiste connu (chaîne YouTube) sert d'ancre quand il apparaît dans le
     titre. Si la chaîne est un label / une chaîne de paroles (ou n'apparaît pas
     du tout dans le titre), on lit « Artiste - Titre ». Sans artiste fiable et
     sans tiret, l'artiste reste vide (le champ Artiste est alors masqué). */
  function songMeta(rawTitle, rawArtist) {
    var rawT = String(rawTitle == null ? "" : rawTitle).trim();
    var rawA = String(rawArtist == null ? "" : rawArtist).trim();
    var title = cleanTitle(rawT) || rawT;
    var artist = cleanArtist(rawA) || rawA;
    var generic = !artist || isGenericArtist(artist);
    if (!title) return { title: "", artist: generic ? "" : artist };

    var parts = title.split(/\s+[-–—]\s*|\s*[-–—]\s+|\s*\|\s*/).map(function (s) { return s.trim(); }).filter(Boolean);
    var kept = parts.filter(function (p) { return !NOISE_SEG.test(p); });
    if (kept.length) parts = kept;
    if (parts.length < 2) return { title: parts.length === 1 ? parts[0] : title, artist: generic ? "" : artist };

    if (!generic) {
      var known = artist, idx = -1;
      for (var i = 0; i < parts.length; i++) {
        if (segmentHasArtist(parts[i], known)) { idx = i; break; }
      }
      if (idx >= 0) {
        var chosen = parts[idx];
        if (hasCollab(chosen) && norm(chosen) !== norm(known)) artist = cleanArtist(chosen) || chosen;
        var rest = parts.slice(0, idx).concat(parts.slice(idx + 1));
        var filtered = rest.filter(function (p) {
          return !segmentHasArtist(p, known) && !segmentHasArtist(p, artist);
        });
        if (!filtered.length) filtered = rest;
        while (filtered.length >= 2 && sameSegment(filtered[0], filtered[filtered.length - 1])) {
          filtered.pop();
        }
        // « Artiste - Titre - Live » : le dernier segment est une version, pas
        // le titre. On ne le retire que s'il reste un vrai titre avant lui.
        if (filtered.length >= 2 && isLiveSegment(filtered[filtered.length - 1])) filtered.pop();
        if (filtered.length) title = filtered.join(" - ");
        return { title: title, artist: artist };
      }
      // La chaîne n'apparaît pas dans le titre.
      // « Titre - Version acoustique » : la chaîne est bien l'artiste.
      if (VERSION_SEG.test(parts.slice(1).join(" "))) return { title: parts.join(" - "), artist: artist };
    }
    return fromParts(parts);
  }
  /* Position de départ d'un extrait : on vise 40-52 % du morceau, sans
     dépasser la fin. `elapsed` permet de reprendre une manche en cours. */
  function extractBase(pos, duration, extract, elapsed) {
    var d = Number(duration) || 0;
    var e = Math.max(1, Number(extract) || 15);
    var p = Math.max(0, Math.min(0.95, Number(pos) || 0));
    var el = Math.max(0, Number(elapsed) || 0);
    if (!d) return 0;
    var max = Math.max(0, d - e - 0.75);
    return Math.max(0, Math.min(max, d * p + el));
  }
  function pickPos() {
    return 0.4 + Math.random() * 0.12;
  }

  window.BT_SONGS = SONGS;
  window.BT_THEMES = THEMES;
  window.BT = {
    pick: pick,
    norm: norm,
    strip: strip,
    match: match,
    near: near,
    editDistance: editDistance,
    cleanTitle: cleanTitle,
    cleanArtist: cleanArtist,
    isGenericArtist: isGenericArtist,
    songMeta: songMeta,
    extractBase: extractBase,
    pickPos: pickPos
  };
})();
