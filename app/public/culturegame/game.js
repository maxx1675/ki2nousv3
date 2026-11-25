/* ============================================================================
   CULTURE GAME — quiz de culture générale multijoueur (hôte autoritaire)
   ----------------------------------------------------------------------------
   Le relais /api/rooms ne transporte que des messages. L'hôte tient l'état,
   la banque de questions et les réponses ; les invités reçoivent une vue
   publique (jamais la bonne réponse avant la phase de révélation).
   ========================================================================== */
"use strict";

const GAME = "cg";
const ROOM = (c) => "cg-" + c;
const MIN = 2;
const MAX = 8;
const REVEAL_MS = 6000;
const JUDGE_REVEAL_MS = 9000;
const ANSWER_WAIT_MS = 700;

/* ------------------------------- Banque ---------------------------------- */
const THEMES = [
  { id: "culture", label: "Culture générale", emoji: "🧠" },
  { id: "geo", label: "Géographie", emoji: "🌍" },
  { id: "histoire", label: "Histoire", emoji: "🏛️" },
  { id: "sciences", label: "Sciences", emoji: "🔬" },
  { id: "ecran", label: "Cinéma & séries", emoji: "🎬" },
  { id: "musique", label: "Musique", emoji: "🎵" },
  { id: "sport", label: "Sport", emoji: "🏅" },
  { id: "people", label: "People", emoji: "🖼️" },
  { id: "langue", label: "Charades & petit bac", emoji: "🔤" },
];
const SUBJECTIVE = new Set(["rebus", "who", "film", "serie", "bac"]);

/* q = question, o = options QCM, a = réponse, l = lettres/lettre, h = indice.
   th = thème. sum = résumé (film/série), puzzle = rébus, img = portrait,
   cat = catégorie du petit bac, alt = réponses acceptées en plus. */
const BANK = [
  /* ------------------------------ Culture ------------------------------- */
  { th: "culture", t: "qcm", q: "Quel est le plus grand mammifère du monde ?", o: ["L'éléphant d'Afrique", "La baleine bleue", "La girafe", "L'orque"], a: "La baleine bleue" },
  { th: "culture", t: "qcm", q: "Quelle est la monnaie du Japon ?", o: ["Le yuan", "Le won", "Le yen", "Le baht"], a: "Le yen" },
  { th: "culture", t: "qcm", q: "Qui a inventé l'imprimerie à caractères mobiles en Europe ?", o: ["Nicolas Copernic", "Johannes Gutenberg", "Galilée", "Léonard de Vinci"], a: "Johannes Gutenberg" },
  { th: "culture", t: "qcm", q: "Combien de minutes compte une journée ?", o: ["1 140", "1 240", "1 440", "1 640"], a: "1 440" },
  { th: "culture", t: "qcm", q: "Quel est le plus grand organe du corps humain ?", o: ["Le foie", "La peau", "Les poumons", "L'intestin"], a: "La peau" },
  { th: "culture", t: "qcm", q: "Qui a écrit Le Comte de Monte-Cristo ?", o: ["Victor Hugo", "Alexandre Dumas", "Jules Verne", "Honoré de Balzac"], a: "Alexandre Dumas" },
  { th: "culture", t: "qcm", q: "Combien d'États composent les États-Unis ?", o: ["48", "50", "52", "54"], a: "50" },
  { th: "culture", t: "qcm", q: "Quel est le symbole chimique du fer ?", o: ["Fe", "Fr", "F", "Ir"], a: "Fe" },
  { th: "culture", t: "qcm", q: "Quelle est la capitale de la Belgique ?", o: ["Anvers", "Bruxelles", "Gand", "Liège"], a: "Bruxelles" },
  { th: "culture", t: "qcm", q: "Combien de côtés possède un pentagone ?", o: ["4", "5", "6", "7"], a: "5" },
  { th: "culture", t: "qcm", q: "Quel pays a offert la statue de la Liberté aux États-Unis ?", o: ["Le Royaume-Uni", "La France", "L'Espagne", "L'Italie"], a: "La France" },
  { th: "culture", t: "qcm", q: "Que signifie le sigle ADN ?", o: ["Acide désoxyribonucléique", "Acide dinucléique", "Agent de nutrition cellulaire", "Acide double nucléaire"], a: "Acide désoxyribonucléique" },
  { th: "culture", t: "qcm", q: "Quelle est la langue officielle du Brésil ?", o: ["L'espagnol", "Le portugais", "Le français", "L'anglais"], a: "Le portugais" },
  { th: "culture", t: "qcm", q: "Quel pays avait la plus grande population du monde en 2024 ?", o: ["La Chine", "L'Inde", "Les États-Unis", "L'Indonésie"], a: "L'Inde" },
  { th: "culture", t: "qcm", q: "Qui a créé Mickey Mouse ?", o: ["Walt Disney", "Chuck Jones", "Hanna-Barbera", "Matt Groening"], a: "Walt Disney" },
  { th: "culture", t: "qcm", q: "Qui a été le premier homme à marcher sur la Lune ?", o: ["Buzz Aldrin", "Youri Gagarine", "Neil Armstrong", "Michael Collins"], a: "Neil Armstrong" },
  { th: "culture", t: "qcm", q: "Qui a écrit Le Petit Prince ?", o: ["Antoine de Saint-Exupéry", "Jules Verne", "Albert Camus", "Romain Gary"], a: "Antoine de Saint-Exupéry" },
  { th: "culture", t: "qcm", q: "Qui a mis au point l'ampoule électrique pratique ?", o: ["Nikola Tesla", "Thomas Edison", "James Watt", "Alexander Graham Bell"], a: "Thomas Edison" },
  { th: "culture", t: "qcm", q: "Qui a écrit la saga Harry Potter ?", o: ["J. R. R. Tolkien", "J. K. Rowling", "Stephen King", "Roald Dahl"], a: "J. K. Rowling" },
  { th: "culture", t: "qcm", q: "Qui a écrit 1984 ?", o: ["Aldous Huxley", "George Orwell", "Ray Bradbury", "H. G. Wells"], a: "George Orwell" },
  { th: "culture", t: "qcm", q: "Qui est l'auteur du manga One Piece ?", o: ["Masashi Kishimoto", "Eiichiro Oda", "Tite Kubo", "Akira Toriyama"], a: "Eiichiro Oda" },
  { th: "culture", t: "qcm", q: "Combien de côtés possède un hexagone ?", o: ["5", "6", "7", "8"], a: "6" },
  { th: "culture", t: "vf", q: "Le corps humain possède 206 os à l'âge adulte.", a: true },
  { th: "culture", t: "vf", q: "Un octogone possède huit côtés.", a: true },
  { th: "culture", t: "vf", q: "Le nombre Pi vaut environ 3,14.", a: true },
  { th: "culture", t: "vf", q: "Un kilomètre vaut 1 000 mètres.", a: true },
  { th: "culture", t: "vf", q: "La Grande Muraille de Chine est visible à l'œil nu depuis la Lune.", a: false },
  { th: "culture", t: "qcm", q: "Qui a peint La Nuit étoilée ?", o: ["Claude Monet", "Vincent van Gogh", "Pablo Picasso", "Salvador Dalí"], a: "Vincent van Gogh" },
  { th: "culture", t: "qcm", q: "Quelle est la capitale de la Nouvelle-Zélande ?", o: ["Auckland", "Wellington", "Christchurch", "Dunedin"], a: "Wellington" },
  { th: "culture", t: "qcm", q: "Quel peuple a inventé le papier ?", o: ["Les Égyptiens", "Les Chinois", "Les Romains", "Les Grecs"], a: "Les Chinois" },
  { th: "culture", t: "qcm", q: "Quelle est la distance officielle du marathon ?", o: ["40 km", "41,5 km", "42,195 km", "45 km"], a: "42,195 km" },
  { th: "culture", t: "qcm", q: "Qui a composé La Lettre à Élise ?", o: ["Mozart", "Beethoven", "Bach", "Chopin"], a: "Beethoven" },
  { th: "culture", t: "qcm", q: "Quelle est la capitale de l'Islande ?", o: ["Oslo", "Reykjavik", "Helsinki", "Tallinn"], a: "Reykjavik" },
  { th: "culture", t: "qcm", q: "Combien de touches possède un piano de concert standard ?", o: ["66", "76", "88", "96"], a: "88" },
  { th: "culture", t: "vf", q: "Le kiwi est un oiseau qui ne vole pas.", a: true },
  { th: "culture", t: "vf", q: "Un mille-pattes possède exactement mille pattes.", a: false },
  { th: "culture", t: "vf", q: "Le miel peut se conserver plusieurs années sans se périmer.", a: true },

  /* ----------------------------- Géographie ----------------------------- */
  { th: "geo", t: "qcm", q: "Quelle est la capitale de l'Australie ?", o: ["Sydney", "Canberra", "Melbourne", "Brisbane"], a: "Canberra" },
  { th: "geo", t: "qcm", q: "Quelle est la capitale du Japon ?", o: ["Kyoto", "Osaka", "Tokyo", "Séoul"], a: "Tokyo" },
  { th: "geo", t: "qcm", q: "Quelle est la capitale de l'Italie ?", o: ["Milan", "Naples", "Rome", "Turin"], a: "Rome" },
  { th: "geo", t: "qcm", q: "Quelle est la capitale du Canada ?", o: ["Toronto", "Montréal", "Ottawa", "Vancouver"], a: "Ottawa" },
  { th: "geo", t: "qcm", q: "Quelle est la capitale de l'Espagne ?", o: ["Barcelone", "Séville", "Madrid", "Valence"], a: "Madrid" },
  { th: "geo", t: "qcm", q: "Quelle est la capitale de la Grèce ?", o: ["Thessalonique", "Athènes", "Patras", "Héraklion"], a: "Athènes" },
  { th: "geo", t: "qcm", q: "Quelle est la capitale de l'Allemagne ?", o: ["Munich", "Hambourg", "Berlin", "Francfort"], a: "Berlin" },
  { th: "geo", t: "qcm", q: "Quelle est la capitale du Portugal ?", o: ["Porto", "Coimbra", "Lisbonne", "Faro"], a: "Lisbonne" },
  { th: "geo", t: "qcm", q: "Quelle est la capitale de la Turquie ?", o: ["Istanbul", "Ankara", "Izmir", "Antalya"], a: "Ankara" },
  { th: "geo", t: "qcm", q: "Quelle est la capitale de la Norvège ?", o: ["Bergen", "Oslo", "Helsinki", "Copenhague"], a: "Oslo" },
  { th: "geo", t: "qcm", q: "Quel est le plus grand océan du monde ?", o: ["L'Atlantique", "L'Indien", "Le Pacifique", "L'Arctique"], a: "Le Pacifique" },
  { th: "geo", t: "qcm", q: "Quel océan se trouve entre l'Afrique et l'Australie ?", o: ["L'Atlantique", "Le Pacifique", "L'Indien", "L'Arctique"], a: "L'Indien" },
  { th: "geo", t: "qcm", q: "Dans quelle mer se jette le Nil ?", o: ["La mer Rouge", "La Méditerranée", "La mer Noire", "La mer d'Arabie"], a: "La Méditerranée" },
  { th: "geo", t: "qcm", q: "Quelle mer borde Marseille ?", o: ["L'océan Atlantique", "La mer Méditerranée", "La Manche", "La mer du Nord"], a: "La mer Méditerranée" },
  { th: "geo", t: "qcm", q: "Quel est le plus grand désert chaud du monde ?", o: ["Le Gobi", "Le Sahara", "Le Kalahari", "L'Atacama"], a: "Le Sahara" },
  { th: "geo", t: "qcm", q: "Quel est le plus petit pays du monde ?", o: ["Monaco", "Saint-Marin", "Le Vatican", "Le Liechtenstein"], a: "Le Vatican" },
  { th: "geo", t: "qcm", q: "Quel pays a la forme d'une botte ?", o: ["L'Espagne", "L'Italie", "La Grèce", "Le Portugal"], a: "L'Italie" },
  { th: "geo", t: "qcm", q: "Quelle chaîne de montagnes sépare l'Europe de l'Asie ?", o: ["Les Alpes", "Les Pyrénées", "L'Oural", "Le Caucase"], a: "L'Oural" },
  { th: "geo", t: "qcm", q: "Quel est le plus grand lac d'Afrique ?", o: ["Le lac Tchad", "Le lac Victoria", "Le lac Tanganyika", "Le lac Malawi"], a: "Le lac Victoria" },
  { th: "geo", t: "qcm", q: "Quel est le plus long fleuve de France ?", o: ["La Seine", "Le Rhône", "La Loire", "La Garonne"], a: "La Loire" },
  { th: "geo", t: "qcm", q: "Sur quel continent se trouve l'Égypte ?", o: ["L'Asie", "L'Afrique", "L'Europe", "L'Océanie"], a: "L'Afrique" },
  { th: "geo", t: "qcm", q: "Quel détroit sépare l'Europe de l'Afrique ?", o: ["Le Bosphore", "Gibraltar", "Le détroit de Messine", "Suez"], a: "Gibraltar" },
  { th: "geo", t: "qcm", q: "Quel est le plus long fleuve d'Afrique ?", o: ["Le Congo", "Le Niger", "Le Nil", "Le Zambèze"], a: "Le Nil" },
  { th: "geo", t: "qcm", q: "Quel pays est bordé par la mer Noire et la mer Méditerranée ?", o: ["La Grèce", "La Turquie", "L'Italie", "L'Égypte"], a: "La Turquie" },
  { th: "geo", t: "vf", q: "Le Portugal borde l'Espagne.", a: true },
  { th: "geo", t: "vf", q: "La Seine traverse Paris.", a: true },
  { th: "geo", t: "vf", q: "Venise se trouve en Grèce.", a: false },
  { th: "geo", t: "vf", q: "L'Équateur traverse le Brésil.", a: true },
  { th: "geo", t: "vf", q: "Le Danemark est bordé par la mer Baltique.", a: true },
  { th: "geo", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le pays.", l: "C E R F A N", h: "Pays européen", a: "FRANCE" },
  { th: "geo", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le pays.", l: "L A N D I R E", h: "Île européenne", a: "IRLANDE" },
  { th: "geo", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le pays.", l: "A L G E R I E", h: "Afrique du Nord", a: "ALGERIE" },
  { th: "geo", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le pays.", l: "S U E D E", h: "Scandinavie", a: "SUEDE" },
  { th: "geo", t: "ana", q: "Remets les lettres dans l'ordre pour trouver la capitale.", l: "R I S A P", h: "France", a: "PARIS" },
  { th: "geo", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le pays.", l: "N O R V E G E", h: "Europe du Nord", a: "NORVEGE" },
  { th: "geo", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le pays.", l: "A N D A C A", h: "Feuille d'érable", a: "CANADA" },
  { th: "geo", t: "ana", q: "Remets les lettres dans l'ordre pour trouver la ville.", l: "L I S B O N N E", h: "Portugal", a: "LISBONNE" },
  { th: "geo", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le pays.", l: "I T A L I E", h: "Botte européenne", a: "ITALIE" },
  { th: "geo", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'océan.", l: "P I C I F A Q U E", h: "Le plus grand", a: "PACIFIQUE" },
  { th: "geo", t: "qcm", q: "Quel est le plus long fleuve d'Europe ?", o: ["Le Danube", "La Volga", "Le Rhin", "La Loire"], a: "La Volga" },
  { th: "geo", t: "qcm", q: "Quelle est la capitale du Maroc ?", o: ["Casablanca", "Marrakech", "Rabat", "Fès"], a: "Rabat" },
  { th: "geo", t: "qcm", q: "Quel est le plus haut sommet du monde ?", o: ["Le K2", "L'Everest", "Le Mont Blanc", "Le Kilimandjaro"], a: "L'Everest" },
  { th: "geo", t: "qcm", q: "Quel pays est aussi un continent ?", o: ["L'Inde", "L'Australie", "Le Brésil", "Le Canada"], a: "L'Australie" },
  { th: "geo", t: "qcm", q: "Quelle mer est la plus salée ?", o: ["La mer Rouge", "La mer Morte", "La mer Noire", "La mer Baltique"], a: "La mer Morte" },
  { th: "geo", t: "qcm", q: "Quel est le plus grand pays du monde par sa superficie ?", o: ["Le Canada", "La Chine", "La Russie", "Les États-Unis"], a: "La Russie" },
  { th: "geo", t: "vf", q: "Le mont Kilimandjaro se trouve au Kenya.", a: false },
  { th: "geo", t: "vf", q: "Le Danube traverse Vienne et Budapest.", a: true },

  /* ------------------------------ Histoire ------------------------------- */
  { th: "histoire", t: "qcm", q: "En quelle année a débuté la Première Guerre mondiale ?", o: ["1912", "1914", "1918", "1939"], a: "1914" },
  { th: "histoire", t: "qcm", q: "Quel mur est tombé en 1989 ?", o: ["Le mur d'Hadrien", "Le mur de Berlin", "La Grande Muraille", "Le mur des Lamentations"], a: "Le mur de Berlin" },
  { th: "histoire", t: "qcm", q: "Qui a été le premier président de la Ve République française ?", o: ["Georges Pompidou", "Charles de Gaulle", "Valéry Giscard d'Estaing", "François Mitterrand"], a: "Charles de Gaulle" },
  { th: "histoire", t: "qcm", q: "En quelle année a eu lieu la Révolution française ?", o: ["1492", "1689", "1789", "1848"], a: "1789" },
  { th: "histoire", t: "qcm", q: "Quel empereur romain a fait construire un mur en Bretagne ?", o: ["Auguste", "Hadrien", "Néron", "Trajan"], a: "Hadrien" },
  { th: "histoire", t: "qcm", q: "Quel roi de France était surnommé le Roi-Soleil ?", o: ["Louis XIII", "Louis XIV", "Louis XV", "François Ier"], a: "Louis XIV" },
  { th: "histoire", t: "qcm", q: "Qui a atteint l'Amérique en 1492 ?", o: ["Vasco de Gama", "Christophe Colomb", "Magellan", "Fernand Cortés"], a: "Christophe Colomb" },
  { th: "histoire", t: "qcm", q: "Quelle guerre a opposé le Nord et le Sud des États-Unis ?", o: ["La guerre d'Indépendance", "La guerre de Sécession", "La guerre de 1812", "La guerre du Vietnam"], a: "La guerre de Sécession" },
  { th: "histoire", t: "qcm", q: "Qui était Jeanne d'Arc ?", o: ["Une reine de France", "Une paysanne devenue chef de guerre", "Une princesse anglaise", "Une abbesse de Cluny"], a: "Une paysanne devenue chef de guerre" },
  { th: "histoire", t: "qcm", q: "Quelle civilisation a construit les pyramides de Gizeh ?", o: ["La civilisation romaine", "La civilisation grecque", "La civilisation égyptienne", "La civilisation maya"], a: "La civilisation égyptienne" },
  { th: "histoire", t: "qcm", q: "Qui a unifié les royaumes francs au Ve siècle ?", o: ["Charlemagne", "Clovis", "Vercingétorix", "Louis le Pieux"], a: "Clovis" },
  { th: "histoire", t: "qcm", q: "Quelle reine britannique a régné de 1837 à 1901 ?", o: ["Élisabeth Ire", "Anne", "Victoria", "Marie Stuart"], a: "Victoria" },
  { th: "histoire", t: "qcm", q: "En quelle année l'homme a-t-il marché sur la Lune pour la première fois ?", o: ["1959", "1965", "1969", "1972"], a: "1969" },
  { th: "histoire", t: "qcm", q: "Quel empire a construit le Colisée de Rome ?", o: ["L'empire grec", "L'empire romain", "L'empire perse", "L'empire ottoman"], a: "L'empire romain" },
  { th: "histoire", t: "qcm", q: "Qui a écrit le Manifeste du parti communiste ?", o: ["Lénine et Trotski", "Marx et Engels", "Staline et Mao", "Bakounine et Proudhon"], a: "Marx et Engels" },
  { th: "histoire", t: "qcm", q: "Quel président américain a aboli l'esclavage ?", o: ["George Washington", "Thomas Jefferson", "Abraham Lincoln", "Theodore Roosevelt"], a: "Abraham Lincoln" },
  { th: "histoire", t: "qcm", q: "Quelle guerre a opposé la France et l'Angleterre pendant plus d'un siècle ?", o: ["La guerre de Trente Ans", "La guerre de Cent Ans", "La guerre de Sept Ans", "La guerre de Succession"], a: "La guerre de Cent Ans" },
  { th: "histoire", t: "qcm", q: "En quelle année Constantinople est-elle tombée aux mains des Ottomans ?", o: ["1204", "1453", "1492", "1517"], a: "1453" },
  { th: "histoire", t: "qcm", q: "Quelle reine d'Égypte a séduit Jules César puis Marc Antoine ?", o: ["Néfertiti", "Cléopâtre VII", "Hatchepsout", "Akhésa"], a: "Cléopâtre VII" },
  { th: "histoire", t: "qcm", q: "Qui a été empereur des Français en 1804 ?", o: ["Louis XVI", "Napoléon Bonaparte", "Charles X", "Louis-Philippe"], a: "Napoléon Bonaparte" },
  { th: "histoire", t: "vf", q: "Napoléon est mort à Sainte-Hélène.", a: true },
  { th: "histoire", t: "vf", q: "La tour Eiffel a été construite pour l'Exposition universelle de 1889.", a: true },
  { th: "histoire", t: "vf", q: "La prise de la Bastille date du 14 juillet 1789.", a: true },
  { th: "histoire", t: "vf", q: "Cléopâtre était une reine romaine.", a: false },
  { th: "histoire", t: "vf", q: "La Révolution française a commencé en 1789.", a: true },
  { th: "histoire", t: "qcm", q: "En quelle année l'Empire romain d'Occident s'est-il effondré ?", o: ["376", "410", "476", "529"], a: "476" },
  { th: "histoire", t: "qcm", q: "Qui a été le premier empereur romain ?", o: ["Jules César", "Auguste", "Néron", "Trajan"], a: "Auguste" },
  { th: "histoire", t: "qcm", q: "En quelle année la Seconde Guerre mondiale s'est-elle terminée en Europe ?", o: ["1943", "1944", "1945", "1946"], a: "1945" },
  { th: "histoire", t: "qcm", q: "Quel traité met fin à la Première Guerre mondiale ?", o: ["Le traité de Vienne", "Le traité de Versailles", "Le traité de Rome", "Le traité de Paris"], a: "Le traité de Versailles" },
  { th: "histoire", t: "qcm", q: "Qui a mené la marche du sel en Inde en 1930 ?", o: ["Nehru", "Gandhi", "Ambedkar", "Tagore"], a: "Gandhi" },
  { th: "histoire", t: "qcm", q: "Quelle dynastie chinoise a fait construire la Cité interdite ?", o: ["Les Han", "Les Tang", "Les Ming", "Les Qing"], a: "Les Ming" },
  { th: "histoire", t: "qcm", q: "En quelle année l'esclavage est-il définitivement aboli en France ?", o: ["1789", "1794", "1848", "1905"], a: "1848" },
  { th: "histoire", t: "qcm", q: "Quel roi d'Angleterre a fondé l'Église anglicane ?", o: ["Henri VIII", "Édouard III", "Jacques Ier", "Charles Ier"], a: "Henri VIII" },
  { th: "histoire", t: "qcm", q: "Quelle ville romaine a été ensevelie par le Vésuve en 79 ?", o: ["Herculanum", "Pompéi", "Ostie", "Naples"], a: "Pompéi" },
  { th: "histoire", t: "vf", q: "La guerre de Cent Ans a duré exactement cent ans.", a: false },
  { th: "histoire", t: "vf", q: "Élisabeth II a régné plus de 70 ans sur le Royaume-Uni.", a: true },

  /* ------------------------------ Sciences ------------------------------- */
  { th: "sciences", t: "qcm", q: "Quelle planète est la plus proche du Soleil ?", o: ["Vénus", "Mercure", "Mars", "La Terre"], a: "Mercure" },
  { th: "sciences", t: "qcm", q: "Quel est le symbole chimique de l'or ?", o: ["Ag", "Au", "Or", "Go"], a: "Au" },
  { th: "sciences", t: "qcm", q: "Quelle planète est surnommée la planète rouge ?", o: ["Jupiter", "Vénus", "Mars", "Saturne"], a: "Mars" },
  { th: "sciences", t: "qcm", q: "Qui a élaboré la théorie de la relativité ?", o: ["Isaac Newton", "Albert Einstein", "Galilée", "Niels Bohr"], a: "Albert Einstein" },
  { th: "sciences", t: "qcm", q: "Quel instrument mesure la pression atmosphérique ?", o: ["Le thermomètre", "Le baromètre", "L'anémomètre", "L'hygromètre"], a: "Le baromètre" },
  { th: "sciences", t: "qcm", q: "Quelle matière première sert à fabriquer le verre ?", o: ["Le sable", "Le calcaire", "L'argile", "Le quartz fondu"], a: "Le sable" },
  { th: "sciences", t: "qcm", q: "Quel gaz les plantes absorbent-elles pour la photosynthèse ?", o: ["L'oxygène", "Le dioxyde de carbone", "L'azote", "L'hydrogène"], a: "Le dioxyde de carbone" },
  { th: "sciences", t: "qcm", q: "Quelle est l'unité de la puissance ?", o: ["Le joule", "Le watt", "Le newton", "L'ampère"], a: "Le watt" },
  { th: "sciences", t: "qcm", q: "Combien de chromosomes possède une cellule humaine ?", o: ["23", "44", "46", "48"], a: "46" },
  { th: "sciences", t: "qcm", q: "Quel est l'os le plus long du corps humain ?", o: ["Le tibia", "Le fémur", "L'humérus", "Le radius"], a: "Le fémur" },
  { th: "sciences", t: "qcm", q: "Quelle planète possède les anneaux les plus visibles ?", o: ["Jupiter", "Uranus", "Saturne", "Neptune"], a: "Saturne" },
  { th: "sciences", t: "qcm", q: "Quelle est la formule chimique de l'eau ?", o: ["CO2", "H2O", "O2", "N2"], a: "H2O" },
  { th: "sciences", t: "qcm", q: "Quel animal terrestre est le plus rapide ?", o: ["Le lion", "Le guépard", "L'antilope", "Le cheval"], a: "Le guépard" },
  { th: "sciences", t: "qcm", q: "Quel organe filtre le sang ?", o: ["Le foie", "Les reins", "La rate", "Le pancréas"], a: "Les reins" },
  { th: "sciences", t: "qcm", q: "Quel gaz est le plus abondant dans l'atmosphère terrestre ?", o: ["L'oxygène", "L'azote", "Le dioxyde de carbone", "L'argon"], a: "L'azote" },
  { th: "sciences", t: "qcm", q: "Quelle est la plus grande planète du système solaire ?", o: ["Saturne", "Neptune", "Jupiter", "Uranus"], a: "Jupiter" },
  { th: "sciences", t: "qcm", q: "À quelle vitesse la lumière se propage-t-elle dans le vide ?", o: ["Environ 300 km/s", "Environ 3 000 km/s", "Environ 300 000 km/s", "Environ 3 millions de km/s"], a: "Environ 300 000 km/s" },
  { th: "sciences", t: "qcm", q: "Qui a découvert la pénicilline ?", o: ["Louis Pasteur", "Alexander Fleming", "Marie Curie", "Robert Koch"], a: "Alexander Fleming" },
  { th: "sciences", t: "qcm", q: "Quel est le plus petit os du corps humain ?", o: ["L'étrier", "Le marteau", "L'enclume", "Le coccyx"], a: "L'étrier" },
  { th: "sciences", t: "qcm", q: "Combien de temps la Terre met-elle pour tourner autour du Soleil ?", o: ["Environ 24 heures", "Environ 30 jours", "Environ 365 jours", "Environ 1 000 jours"], a: "Environ 365 jours" },
  { th: "sciences", t: "qcm", q: "Quelle est l'unité de la force ?", o: ["Le watt", "Le joule", "Le newton", "Le pascal"], a: "Le newton" },
  { th: "sciences", t: "qcm", q: "Quel est le symbole chimique du sodium ?", o: ["So", "Na", "S", "Nd"], a: "Na" },
  { th: "sciences", t: "qcm", q: "Quel est le métal liquide à température ambiante ?", o: ["Le plomb", "Le mercure", "L'étain", "Le zinc"], a: "Le mercure" },
  { th: "sciences", t: "qcm", q: "Combien de dents un adulte possède-t-il en moyenne ?", o: ["28", "30", "32", "34"], a: "32" },
  { th: "sciences", t: "vf", q: "L'eau bout à 100 °C au niveau de la mer.", a: true },
  { th: "sciences", t: "vf", q: "Les araignées sont des insectes.", a: false },
  { th: "sciences", t: "vf", q: "Le cœur humain possède quatre cavités.", a: true },
  { th: "sciences", t: "vf", q: "Le colibri est le plus petit oiseau du monde.", a: true },
  { th: "sciences", t: "vf", q: "Le cheval est un mammifère.", a: true },
  { th: "sciences", t: "vf", q: "Le Soleil est une étoile.", a: true },
  { th: "sciences", t: "vf", q: "Les chauves-souris sont des oiseaux.", a: false },
  { th: "sciences", t: "vf", q: "La Lune est une planète.", a: false },
  { th: "sciences", t: "vf", q: "L'ADN se trouve dans le noyau des cellules.", a: true },
  { th: "sciences", t: "vf", q: "Le sang est bleu dans les veines.", a: false },
  { th: "sciences", t: "vf", q: "Les dinosaures ont disparu il y a environ 66 millions d'années.", a: true },
  { th: "sciences", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'animal.", l: "E L E P H A N T", h: "Il a une trompe", a: "ELEPHANT" },
  { th: "sciences", t: "ana", q: "Remets les lettres dans l'ordre pour trouver la planète.", l: "R E T R E", h: "La nôtre", a: "TERRE" },
  { th: "sciences", t: "ana", q: "Remets les lettres dans l'ordre pour trouver la molécule.", l: "M O L E C U L E", h: "Ensemble d'atomes", a: "MOLECULE" },
  { th: "sciences", t: "ana", q: "Remets les lettres dans l'ordre pour trouver la cellule du cerveau.", l: "N E U R O N E", h: "Elle transmet l'influx nerveux", a: "NEURONE" },
  { th: "sciences", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'astre.", l: "P L A N E T E", h: "Elle tourne autour d'une étoile", a: "PLANETE" },
  { th: "sciences", t: "qcm", q: "Combien de planètes compte le système solaire ?", o: ["7", "8", "9", "10"], a: "8" },
  { th: "sciences", t: "qcm", q: "Quel est l'élément chimique le plus abondant dans l'univers ?", o: ["L'oxygène", "L'hydrogène", "Le carbone", "L'hélium"], a: "L'hydrogène" },
  { th: "sciences", t: "qcm", q: "Quelle partie de la cellule contient l'ADN ?", o: ["La membrane", "Le noyau", "Le cytoplasme", "La paroi"], a: "Le noyau" },
  { th: "sciences", t: "qcm", q: "Quelle est la vitesse approximative de la lumière dans le vide ?", o: ["30 000 km/s", "300 000 km/s", "3 000 km/s", "3 000 000 km/s"], a: "300 000 km/s" },
  { th: "sciences", t: "qcm", q: "Quel organe pompe le sang dans le corps ?", o: ["Le foie", "Le cœur", "Les poumons", "L'estomac"], a: "Le cœur" },
  { th: "sciences", t: "qcm", q: "Que mesure un ampèremètre ?", o: ["La tension", "L'intensité", "La résistance", "La puissance"], a: "L'intensité" },
  { th: "sciences", t: "qcm", q: "Quel est le plus grand organe interne du corps humain ?", o: ["Le foie", "L'intestin", "Les poumons", "L'estomac"], a: "Le foie" },
  { th: "sciences", t: "vf", q: "Le son se propage plus vite dans l'eau que dans l'air.", a: true },

  /* --------------------------- Cinéma & séries --------------------------- */
  { th: "ecran", t: "qcm", q: "Qui a réalisé le film Titanic ?", o: ["Steven Spielberg", "James Cameron", "Ridley Scott", "Christopher Nolan"], a: "James Cameron" },
  { th: "ecran", t: "qcm", q: "Quel film a remporté l'Oscar du meilleur film en 2020 ?", o: ["1917", "Joker", "Parasite", "Once Upon a Time in Hollywood"], a: "Parasite" },
  { th: "ecran", t: "qcm", q: "Quelle actrice incarne Katniss dans Hunger Games ?", o: ["Emma Stone", "Jennifer Lawrence", "Shailene Woodley", "Kristen Stewart"], a: "Jennifer Lawrence" },
  { th: "ecran", t: "qcm", q: "Dans quel film entend-on « Que la Force soit avec toi » ?", o: ["Star Trek", "Star Wars", "Dune", "Matrix"], a: "Star Wars" },
  { th: "ecran", t: "qcm", q: "Quel réalisateur a signé Pulp Fiction ?", o: ["Martin Scorsese", "Quentin Tarantino", "David Fincher", "Coen"], a: "Quentin Tarantino" },
  { th: "ecran", t: "qcm", q: "Quel film d'animation japonais a remporté l'Oscar en 2003 ?", o: ["Princesse Mononoké", "Le Voyage de Chihiro", "Akira", "Your Name"], a: "Le Voyage de Chihiro" },
  { th: "ecran", t: "qcm", q: "Dans quelle ville se déroule Stranger Things ?", o: ["Derry", "Hawkins", "Riverdale", "Twin Peaks"], a: "Hawkins" },
  { th: "ecran", t: "qcm", q: "Quel acteur incarne Iron Man dans le MCU ?", o: ["Chris Evans", "Robert Downey Jr.", "Mark Ruffalo", "Chris Hemsworth"], a: "Robert Downey Jr." },
  { th: "ecran", t: "qcm", q: "Quel film met en scène un cow-boy en bois et un astronaute ?", o: ["Cars", "Toy Story", "Wall-E", "Là-haut"], a: "Toy Story" },
  { th: "ecran", t: "qcm", q: "Qui joue Jack dans Titanic ?", o: ["Brad Pitt", "Leonardo DiCaprio", "Johnny Depp", "Matt Damon"], a: "Leonardo DiCaprio" },
  { th: "ecran", t: "qcm", q: "Quel réalisateur a créé Inception ?", o: ["Christopher Nolan", "Denis Villeneuve", "J. J. Abrams", "Ridley Scott"], a: "Christopher Nolan" },
  { th: "ecran", t: "qcm", q: "Quelle série suit une famille royale britannique ?", o: ["Downton Abbey", "The Crown", "Bridgerton", "Victoria"], a: "The Crown" },
  { th: "ecran", t: "qcm", q: "Quel film Pixar met en scène les émotions de Riley ?", o: ["Coco", "Vice-versa", "Soul", "Encanto"], a: "Vice-versa" },
  { th: "ecran", t: "qcm", q: "Quel acteur joue Neo dans Matrix ?", o: ["Keanu Reeves", "Laurence Fishburne", "Hugo Weaving", "Tom Cruise"], a: "Keanu Reeves" },
  { th: "ecran", t: "vf", q: "Titanic est réalisé par James Cameron.", a: true },
  { th: "ecran", t: "vf", q: "Le Seigneur des anneaux a été tourné en Nouvelle-Zélande.", a: true },
  { th: "ecran", t: "vf", q: "Game of Thrones est adapté de George R. R. Martin.", a: true },
  { th: "ecran", t: "vf", q: "Le studio Ghibli est japonais.", a: true },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Un jeune fermier découvre qu'il est le dernier espoir d'une rébellion contre un empire galactique.", h: "Sabre laser et étoile de la mort.", a: "Star Wars", alt: ["La Guerre des étoiles"] },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Un archéologue aventurier part à la recherche d'un coffre sacré avant les nazis.", h: "Il porte un chapeau et un fouet.", a: "Indiana Jones", alt: ["Les Aventuriers de l'arche perdue", "Indiana Jones et les Aventuriers de l'arche perdue"] },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Un poisson clown traverse l'océan pour retrouver son fils capturé.", h: "Pixar, dans le Great Barrier Reef.", a: "Le Monde de Nemo", alt: ["Finding Nemo"] },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Un jeune lion voit son père mourir et doit reconquérir son royaume.", h: "Disney, « Hakuna Matata ».", a: "Le Roi lion", alt: ["The Lion King"] },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Un informaticien découvre que le monde qu'il connaît est une simulation.", h: "Pastille rouge ou pastille bleue.", a: "Matrix", alt: ["The Matrix"] },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Un naufragé survit seul sur une île avec un ballon pour unique ami.", h: "Tom Hanks et Wilson.", a: "Seul au monde", alt: ["Cast Away"] },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Une équipe s'introduit dans les rêves pour y voler ou y implanter une idée.", h: "Une toupie qui ne s'arrête pas.", a: "Inception" },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Un garçon découvre le jour de ses onze ans qu'il est célèbre chez les sorciers.", h: "Poudlard et un éclair sur le front.", a: "Harry Potter à l'école des sorciers", alt: ["Harry Potter"] },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Un requin géant terrorise une station balnéaire.", h: "« Il va nous falloir un plus gros bateau. »", a: "Les Dents de la mer", alt: ["Jaws"] },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Des dinosaures clonés s'échappent d'un parc d'attractions.", h: "Steven Spielberg, 1993.", a: "Jurassic Park", alt: ["Le Parc jurassique"] },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Un présentateur météo revit sans cesse la même journée.", h: "Une marmotte et un réveil.", a: "Un jour sans fin", alt: ["Groundhog Day"] },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Un boxeur modeste de Philadelphie affronte le champion du monde.", h: "Sylvester Stallone et des escaliers.", a: "Rocky" },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Un vieil homme s'envole dans sa maison portée par des milliers de ballons.", h: "Pixar, un scout et un chien qui parle.", a: "Là-haut", alt: ["Up"] },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Un rat cuisinier aide un jeune homme à devenir chef à Paris.", h: "Pixar, août 2007.", a: "Ratatouille" },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Un androïde venu du futur traque la mère du chef de la résistance.", h: "« I'll be back. »", a: "Terminator", alt: ["The Terminator"] },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Une famille mafieuse italo-américaine à New York vit pouvoir, trahison et succession.", h: "Marlon Brando et une tête de cheval.", a: "Le Parrain", alt: ["The Godfather"] },
  { th: "ecran", t: "serie", q: "De quelle série parle ce résumé ?", sum: "Un professeur de chimie atteint d'un cancer devient fabricant de drogue.", h: "Le désert du Nouveau-Mexique et des combinaisons jaunes.", a: "Breaking Bad" },
  { th: "ecran", t: "serie", q: "De quelle série parle ce résumé ?", sum: "La vie d'une famille aristocratique anglaise au début du XXe siècle.", h: "Un château et des domestiques.", a: "Downton Abbey" },
  { th: "ecran", t: "serie", q: "De quelle série parle ce résumé ?", sum: "Des adolescents affrontent des créatures venues d'une dimension parallèle.", h: "Hawkins, Eleven et les années 1980.", a: "Stranger Things" },
  { th: "ecran", t: "serie", q: "De quelle série parle ce résumé ?", sum: "Plusieurs familles nobles se disputent un trône de fer.", h: "Winterfell, dragons et marcheurs blancs.", a: "Game of Thrones", alt: ["Le Trône de fer"] },
  { th: "ecran", t: "serie", q: "De quelle série parle ce résumé ?", sum: "Six amis new-yorkais se retrouvent sans cesse au Central Perk.", h: "« We were on a break! »", a: "Friends" },
  { th: "ecran", t: "serie", q: "De quelle série parle ce résumé ?", sum: "Un détective belge à la moustache impeccable résout des crimes en Angleterre.", h: "Agatha Christie, petits gris.", a: "Hercule Poirot", alt: ["Poirot"] },
  { th: "ecran", t: "serie", q: "De quelle série parle ce résumé ?", sum: "Une jeune reine devient souveraine et traverse des décennies de règne.", h: "Élisabeth II et ses Premiers ministres.", a: "The Crown" },
  { th: "ecran", t: "serie", q: "De quelle série parle ce résumé ?", sum: "Les survivants d'un crash aérien échouent sur une île aux secrets étranges.", h: "Des numéros, une trappe et un chien.", a: "Lost", alt: ["Perdus"] },
  { th: "ecran", t: "serie", q: "De quelle série parle ce résumé ?", sum: "Un médecin brillant et misanthrope dirige un hôpital avec une canne.", h: "« Tout le monde ment. »", a: "Dr House", alt: ["House", "Docteur House"] },
  { th: "ecran", t: "serie", q: "De quelle série parle ce résumé ?", sum: "Des centaines de joueurs ruinés participent à des jeux d'enfants mortels.", h: "Une poupée géante et une combinaison verte.", a: "Squid Game", alt: ["Le Jeu de la pieuvre"] },
  { th: "ecran", t: "serie", q: "De quelle série parle ce résumé ?", sum: "Des employés de bureau sont filmés en faux documentaire.", h: "Michael Scott et le papier.", a: "The Office" },
  { th: "ecran", t: "serie", q: "De quelle série parle ce résumé ?", sum: "Un détective consultant et son ami médecin résolvent des crimes à Londres.", h: "221B Baker Street, version moderne.", a: "Sherlock" },
  { th: "ecran", t: "serie", q: "De quelle série parle ce résumé ?", sum: "Des internes en chirurgie enchaînent gardes, amours et urgences.", h: "Meredith Grey et Seattle.", a: "Grey's Anatomy" },
  { th: "ecran", t: "serie", q: "De quelle série parle ce résumé ?", sum: "Un gang familial règne sur le Birmingham des années 1920.", h: "Casquettes plates et lames de rasoir.", a: "Peaky Blinders" },
  { th: "ecran", t: "qcm", q: "Qui joue le rôle de Jack Dawson dans Titanic ?", o: ["Brad Pitt", "Leonardo DiCaprio", "Matt Damon", "Johnny Depp"], a: "Leonardo DiCaprio" },
  { th: "ecran", t: "qcm", q: "Quelle actrice incarne Hermione Granger dans Harry Potter ?", o: ["Emma Watson", "Emma Stone", "Natalie Portman", "Keira Knightley"], a: "Emma Watson" },
  { th: "ecran", t: "qcm", q: "Quel film d'animation suit Miguel au pays des morts ?", o: ["Coco", "Encanto", "Soul", "Luca"], a: "Coco" },
  { th: "ecran", t: "vf", q: "Le film Avatar est réalisé par James Cameron.", a: true },
  { th: "ecran", t: "vf", q: "L'action de Breaking Bad se déroule à Miami.", a: false },
  { th: "ecran", t: "vf", q: "Dark Vador est le père de Luke Skywalker.", a: true },

  /* ------------------------------- Musique ------------------------------- */
  { th: "musique", t: "qcm", q: "Qui a composé la Cinquième Symphonie ?", o: ["Mozart", "Beethoven", "Bach", "Chopin"], a: "Beethoven" },
  { th: "musique", t: "qcm", q: "Combien de cordes possède une guitare classique ?", o: ["4", "5", "6", "7"], a: "6" },
  { th: "musique", t: "qcm", q: "Combien de touches possède un piano standard ?", o: ["66", "76", "88", "96"], a: "88" },
  { th: "musique", t: "qcm", q: "Quel groupe britannique a sorti Hey Jude ?", o: ["The Rolling Stones", "The Beatles", "Queen", "Pink Floyd"], a: "The Beatles" },
  { th: "musique", t: "qcm", q: "De quel instrument Louis Armstrong jouait-il ?", o: ["Le saxophone", "La trompette", "Le trombone", "La clarinette"], a: "La trompette" },
  { th: "musique", t: "qcm", q: "Combien de musiciens compte un quatuor ?", o: ["3", "4", "5", "6"], a: "4" },
  { th: "musique", t: "qcm", q: "Dans quelle ville est né le jazz ?", o: ["Chicago", "New York", "La Nouvelle-Orléans", "Memphis"], a: "La Nouvelle-Orléans" },
  { th: "musique", t: "qcm", q: "Qui a composé l'opéra La Bohème ?", o: ["Verdi", "Puccini", "Wagner", "Rossini"], a: "Puccini" },
  { th: "musique", t: "qcm", q: "Quel groupe suédois a chanté Dancing Queen ?", o: ["ABBA", "Ace of Base", "Roxette", "Europe"], a: "ABBA" },
  { th: "musique", t: "qcm", q: "Qui a composé Carmen ?", o: ["Georges Bizet", "Charles Gounod", "Jules Massenet", "Hector Berlioz"], a: "Georges Bizet" },
  { th: "musique", t: "qcm", q: "Qui a composé la musique de Star Wars ?", o: ["Hans Zimmer", "John Williams", "Ennio Morricone", "Danny Elfman"], a: "John Williams" },
  { th: "musique", t: "qcm", q: "Quel groupe a sorti Bohemian Rhapsody ?", o: ["Led Zeppelin", "Queen", "The Who", "Deep Purple"], a: "Queen" },
  { th: "musique", t: "qcm", q: "Quelle chanteuse est surnommée Queen B ?", o: ["Rihanna", "Beyoncé", "Lady Gaga", "Taylor Swift"], a: "Beyoncé" },
  { th: "musique", t: "qcm", q: "Quel instrument à vent en bois utilise une anche simple ?", o: ["La flûte", "La clarinette", "Le hautbois", "Le basson"], a: "La clarinette" },
  { th: "musique", t: "qcm", q: "Dans quel pays l'opéra est-il né ?", o: ["La France", "L'Italie", "L'Allemagne", "L'Autriche"], a: "L'Italie" },
  { th: "musique", t: "qcm", q: "Qui a composé La Traviata ?", o: ["Puccini", "Verdi", "Mozart", "Bizet"], a: "Verdi" },
  { th: "musique", t: "qcm", q: "Quel instrument se joue avec un archet ?", o: ["La guitare", "Le violon", "La harpe", "Le piano"], a: "Le violon" },
  { th: "musique", t: "vf", q: "Mozart est mort à Vienne.", a: true },
  { th: "musique", t: "vf", q: "Une gamme majeure compte huit notes.", a: true },
  { th: "musique", t: "vf", q: "Le violoncelle est plus petit que le violon.", a: false },
  { th: "musique", t: "vf", q: "La Marseillaise a été composée par Rouget de Lisle.", a: true },
  { th: "musique", t: "vf", q: "Le saxophone a été inventé par Adolphe Sax.", a: true },
  { th: "musique", t: "vf", q: "La flûte traversière est un instrument à cordes.", a: false },
  { th: "musique", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le groupe.", l: "A B B A", h: "Dancing Queen", a: "ABBA" },
  { th: "musique", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le groupe.", l: "Q U E E N", h: "Bohemian Rhapsody", a: "QUEEN" },
  { th: "musique", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le compositeur.", l: "M O Z A R T", h: "La Flûte enchantée", a: "MOZART" },
  { th: "musique", t: "qcm", q: "Quel instrument de concert possède 47 cordes ?", o: ["Le piano", "La harpe", "Le clavecin", "La guitare"], a: "La harpe" },
  { th: "musique", t: "qcm", q: "Quelle chanteuse a interprété Rolling in the Deep ?", o: ["Adele", "Amy Winehouse", "Rihanna", "Sia"], a: "Adele" },
  { th: "musique", t: "qcm", q: "Quel groupe a sorti Stairway to Heaven ?", o: ["Led Zeppelin", "The Doors", "Pink Floyd", "The Who"], a: "Led Zeppelin" },
  { th: "musique", t: "qcm", q: "Quel instrument Yo-Yo Ma joue-t-il ?", o: ["Le violoncelle", "Le violon", "L'alto", "La contrebasse"], a: "Le violoncelle" },
  { th: "musique", t: "qcm", q: "Qui est surnommé le « roi de la pop » ?", o: ["Elvis Presley", "Michael Jackson", "Prince", "Freddie Mercury"], a: "Michael Jackson" },
  { th: "musique", t: "qcm", q: "Quel instrument à percussion se joue avec des baguettes et un pédalier ?", o: ["Le xylophone", "La batterie", "Les timbales", "Le tambourin"], a: "La batterie" },
  { th: "musique", t: "vf", q: "Le ukulélé est un instrument à quatre cordes.", a: true },
  { th: "musique", t: "vf", q: "Beethoven était devenu sourd à la fin de sa vie.", a: true },
  { th: "musique", t: "vf", q: "Le reggae est né en Jamaïque.", a: true },
  { th: "musique", t: "vf", q: "Un trio compte cinq musiciens.", a: false },
  { th: "musique", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'instrument.", l: "P I A N O", h: "À touches noires et blanches", a: "PIANO" },
  { th: "musique", t: "ana", q: "Remets les lettres dans l'ordre pour trouver la chanteuse.", l: "A D E L E", h: "Rolling in the Deep", a: "ADELE" },

  /* -------------------------------- Sport -------------------------------- */
  { th: "sport", t: "qcm", q: "Combien de joueurs compte une équipe de volley sur le terrain ?", o: ["5", "6", "7", "8"], a: "6" },
  { th: "sport", t: "qcm", q: "Combien d'anneaux figurent sur le drapeau olympique ?", o: ["4", "5", "6", "7"], a: "5" },
  { th: "sport", t: "qcm", q: "Combien de joueurs compte une équipe de football sur le terrain ?", o: ["9", "10", "11", "12"], a: "11" },
  { th: "sport", t: "qcm", q: "Tous les combien d'années ont lieu les Jeux olympiques d'été ?", o: ["2 ans", "3 ans", "4 ans", "5 ans"], a: "4 ans" },
  { th: "sport", t: "qcm", q: "Quel pays a remporté la Coupe du monde de football 2018 ?", o: ["Le Brésil", "L'Allemagne", "La France", "L'Argentine"], a: "La France" },
  { th: "sport", t: "qcm", q: "Quel sport pratique Rafael Nadal ?", o: ["Le tennis", "Le squash", "Le padel", "Le badminton"], a: "Le tennis" },
  { th: "sport", t: "qcm", q: "Combien de temps dure un match de basket NBA ?", o: ["40 minutes", "48 minutes", "60 minutes", "90 minutes"], a: "48 minutes" },
  { th: "sport", t: "qcm", q: "Dans quelle ville se sont déroulés les JO d'été 2024 ?", o: ["Londres", "Tokyo", "Paris", "Los Angeles"], a: "Paris" },
  { th: "sport", t: "qcm", q: "Combien de trous compte un parcours de golf classique ?", o: ["9", "12", "18", "24"], a: "18" },
  { th: "sport", t: "qcm", q: "Quel sport se joue avec un volant ?", o: ["Le tennis de table", "Le badminton", "Le squash", "Le handball"], a: "Le badminton" },
  { th: "sport", t: "qcm", q: "Qui détient le record du monde du 100 mètres ?", o: ["Tyson Gay", "Usain Bolt", "Yohan Blake", "Carl Lewis"], a: "Usain Bolt" },
  { th: "sport", t: "qcm", q: "Combien de joueurs compte une équipe de rugby à XV ?", o: ["13", "14", "15", "16"], a: "15" },
  { th: "sport", t: "qcm", q: "Quel sport se joue avec une raquette et une balle jaune sur gazon ?", o: ["Le tennis", "Le hockey", "Le cricket", "Le golf"], a: "Le tennis" },
  { th: "sport", t: "qcm", q: "Quel pays a remporté la Coupe du monde de football 2022 ?", o: ["La France", "Le Brésil", "L'Argentine", "Le Maroc"], a: "L'Argentine" },
  { th: "sport", t: "qcm", q: "Combien de joueurs compte une équipe de basket sur le terrain ?", o: ["4", "5", "6", "7"], a: "5" },
  { th: "sport", t: "qcm", q: "Quel sport pratique Teddy Riner ?", o: ["Le judo", "La boxe", "La lutte", "Le karaté"], a: "Le judo" },
  { th: "sport", t: "qcm", q: "Dans quelle ville se déroule le tournoi de Wimbledon ?", o: ["Manchester", "Londres", "Oxford", "Édimbourg"], a: "Londres" },
  { th: "sport", t: "qcm", q: "Combien de temps dure une mi-temps au rugby à XV ?", o: ["30 minutes", "35 minutes", "40 minutes", "45 minutes"], a: "40 minutes" },
  { th: "sport", t: "qcm", q: "Quel pays a remporté le plus de Coupes du monde de football ?", o: ["L'Allemagne", "L'Italie", "Le Brésil", "L'Argentine"], a: "Le Brésil" },
  { th: "sport", t: "qcm", q: "Quel pays a remporté l'Euro de football 2024 ?", o: ["L'Angleterre", "L'Espagne", "La France", "L'Allemagne"], a: "L'Espagne" },
  { th: "sport", t: "qcm", q: "Combien de temps dure un match de handball ?", o: ["50 minutes", "60 minutes", "70 minutes", "80 minutes"], a: "60 minutes" },
  { th: "sport", t: "vf", q: "Le marathon mesure 42,195 km.", a: true },
  { th: "sport", t: "vf", q: "Au football, un match dure 90 minutes.", a: true },
  { th: "sport", t: "vf", q: "Le Tour de France se termine à Paris.", a: true },
  { th: "sport", t: "vf", q: "Les Jeux olympiques d'hiver ont lieu tous les quatre ans.", a: true },
  { th: "sport", t: "vf", q: "Le tennis de table se joue avec une raquette et une balle en plastique.", a: true },
  { th: "sport", t: "qcm", q: "Combien de sets faut-il gagner pour remporter un match masculin de Grand Chelem ?", o: ["2", "3", "4", "5"], a: "3" },
  { th: "sport", t: "qcm", q: "Combien de joueurs compte une équipe de water-polo dans l'eau ?", o: ["5", "6", "7", "8"], a: "7" },
  { th: "sport", t: "qcm", q: "Dans quel pays le judo est-il né ?", o: ["La Chine", "Le Japon", "La Corée", "La Thaïlande"], a: "Le Japon" },
  { th: "sport", t: "qcm", q: "Quelle est la longueur d'un tour de piste d'athlétisme standard ?", o: ["200 m", "300 m", "400 m", "500 m"], a: "400 m" },
  { th: "sport", t: "qcm", q: "Combien de joueurs compte une équipe de hockey sur glace sur la glace ?", o: ["5", "6", "7", "8"], a: "6" },
  { th: "sport", t: "qcm", q: "Quel pays a remporté la Coupe du monde de rugby 2023 ?", o: ["La Nouvelle-Zélande", "L'Afrique du Sud", "La France", "L'Angleterre"], a: "L'Afrique du Sud" },
  { th: "sport", t: "qcm", q: "Combien de joueurs compte une équipe de cricket ?", o: ["9", "10", "11", "12"], a: "11" },
  { th: "sport", t: "vf", q: "Le sumo est un sport japonais.", a: true },
  { th: "sport", t: "vf", q: "Le pentathlon moderne compte cinq épreuves.", a: true },
  { th: "sport", t: "vf", q: "La Coupe du monde de football a lieu tous les deux ans.", a: false },
  { th: "sport", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le sport.", l: "J U D O", h: "Art martial japonais", a: "JUDO" },
  { th: "sport", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le sport.", l: "T E N N I S", h: "Raquette et filet", a: "TENNIS" },

  /* -------------------------------- People ------------------------------- */
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p17.jpg", h: "Attaquant français, champion du monde 2018 à 19 ans.", a: "Kylian Mbappé", alt: ["Mbappé", "Mbappe", "Kylian Mbappe"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p18.jpg", h: "Argentin, sept Ballons d'or et champion du monde 2022.", a: "Lionel Messi", alt: ["Messi", "Leo Messi"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p19.jpg", h: "Portugais, cinq Ligues des champions, surnommé « CR7 ».", a: "Cristiano Ronaldo", alt: ["Ronaldo", "CR7", "Cristiano"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p20.jpg", h: "N°10 français, deux buts en finale du Mondial 1998.", a: "Zinédine Zidane", alt: ["Zidane", "Zinedine Zidane", "Zizou"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p21.jpg", h: "Brésilien, passé par le PSG et Barcelone.", a: "Neymar", alt: ["Neymar Jr", "Neymar Junior"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p22.jpg", h: "Attaquant norvégien de Manchester City.", a: "Erling Haaland", alt: ["Haaland"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p23.jpg", h: "Rappeur canadien, « Hotline Bling ».", a: "Drake", alt: ["Aubrey Graham", "Aubrey Drake Graham"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p24.jpg", h: "Rappeur américain de Detroit, « Lose Yourself ».", a: "Eminem", alt: ["Marshall Mathers", "Slim Shady"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p25.jpg", h: "Rappeur américain, prix Pulitzer pour l'album « DAMN. ».", a: "Kendrick Lamar", alt: ["Kendrick"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p26.jpg", h: "Chanteuse française, « Djadja ».", a: "Aya Nakamura", alt: ["Aya Danioko"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p27.jpg", h: "Rappeur français, surnommé le « Duc de Boulogne ».", a: "Booba", alt: ["Élie Yaffa", "Elie Yaffa", "B2O"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p28.jpg", h: "Catcheur devenu acteur, surnommé « The Rock ».", a: "Dwayne Johnson", alt: ["The Rock", "Dwayne The Rock Johnson"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p29.jpg", h: "Chanteuse américaine, tournée « Eras ».", a: "Taylor Swift", alt: ["Taylor"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p30.jpg", h: "Actrice américaine, série « Euphoria ».", a: "Zendaya", alt: ["Zendaya Coleman"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p31.jpg", h: "Chanteuse américaine, ex-Destiny's Child, album « Lemonade ».", a: "Beyoncé", alt: ["Beyonce", "Beyoncé Knowles"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p32.jpg", h: "Chanteuse barbadienne, « Umbrella », créatrice de Fenty.", a: "Rihanna", alt: ["Rihanna Fenty"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p33.jpg", h: "Acteur de « Top Gun » et « Mission impossible ».", a: "Tom Cruise", alt: ["Tom Cruise Mapother"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p34.jpg", h: "Pilote britannique, sept titres de champion du monde de F1.", a: "Lewis Hamilton", alt: ["Hamilton"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p35.jpg", h: "Joueuse américaine, 23 titres du Grand Chelem.", a: "Serena Williams", alt: ["Serena"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p36.jpg", h: "Chanteur canadien, « Blinding Lights ».", a: "The Weeknd", alt: ["Abel Tesfaye", "Weeknd"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p37.jpg", h: "Chanteuse britannique, « Levitating ».", a: "Dua Lipa", alt: ["Dua"] },
  { th: "people", t: "who", q: "Qui est cette personnalité ?", img: "/culturegame/people/p38.jpg", h: "Rappeur français, « Basique ».", a: "Orelsan", alt: ["Aurélien Cotentin"] },
  { th: "people", t: "qcm", q: "Qui a été la première femme à recevoir un prix Nobel ?", o: ["Rosalind Franklin", "Marie Curie", "Ada Lovelace", "Margaret Thatcher"], a: "Marie Curie" },
  { th: "people", t: "qcm", q: "Quel physicien a tiré la langue sur une photo célèbre ?", o: ["Nikola Tesla", "Albert Einstein", "Isaac Newton", "Stephen Hawking"], a: "Albert Einstein" },
  { th: "people", t: "qcm", q: "Quelle peintre mexicaine a réalisé de nombreux autoportraits ?", o: ["Tamara de Lempicka", "Frida Kahlo", "Georgia O'Keeffe", "Berthe Morisot"], a: "Frida Kahlo" },
  { th: "people", t: "qcm", q: "Qui a écrit Notre-Dame de Paris ?", o: ["Alexandre Dumas", "Victor Hugo", "Gustave Flaubert", "Émile Zola"], a: "Victor Hugo" },
  { th: "people", t: "qcm", q: "Qui a mis au point le courant alternatif ?", o: ["Thomas Edison", "Nikola Tesla", "Alessandro Volta", "Michael Faraday"], a: "Nikola Tesla" },
  { th: "people", t: "qcm", q: "Quel roi a fait construire le château de Versailles ?", o: ["François Ier", "Louis XIV", "Louis XV", "Henri IV"], a: "Louis XIV" },
  { th: "people", t: "qcm", q: "Quelle actrice chante Diamonds Are a Girl's Best Friend dans Les Hommes préfèrent les blondes ?", o: ["Audrey Hepburn", "Marilyn Monroe", "Grace Kelly", "Elizabeth Taylor"], a: "Marilyn Monroe" },
  { th: "people", t: "qcm", q: "Quel artiste a aussi imaginé des machines volantes ?", o: ["Michel-Ange", "Léonard de Vinci", "Raphaël", "Botticelli"], a: "Léonard de Vinci" },
  { th: "people", t: "vf", q: "Marie Curie a reçu deux prix Nobel.", a: true },
  { th: "people", t: "vf", q: "Einstein a refusé la présidence d'Israël.", a: true },

  /* --------------------------- Rébus & petit bac -------------------------- */
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est un félin domestique.\nMon deuxième protège le corps.\nMon tout se porte sur la tête.", h: "Un objet", a: "CHAPEAU" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier sert à cuire.\nMon deuxième vient avec les années.\nMon tout est une soupe épaisse.", h: "Un plat", a: "POTAGE" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est la promenade d'une reine.\nMon deuxième arrive avec les ans.\nMon tout permet d'affronter le danger.", h: "Une qualité", a: "COURAGE" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est un nombre au golf.\nMon deuxième est un cadeau.\nMon tout se demande après une faute.", h: "Un mot poli", a: "PARDON" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est le contraire de mauvais.\nMon deuxième est un être humain.\nMon tout est un petit monsieur de neige.", h: "Deux syllabes", a: "BONHOMME" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est le contraire de bien.\nMon deuxième rime avec « beurre ».\nMon tout est un coup du sort.", h: "Une tuile", a: "MALHEUR" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est une étendue salée.\nMon deuxième précède le jour.\nMon tout est quelque chose d'éblouissant.", h: "Un émerveillement", a: "MERVEILLE" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est un légume rond.\nMon deuxième sent bon.\nMon tout est un légume blanc en bouquets.", h: "Un légume", a: "CHOUFLEUR", alt: ["CHOU-FLEUR"] },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier s'ouvre avec une clé.\nMon deuxième sert à payer.\nMon tout garde les billets.", h: "Un accessoire", a: "PORTEMONNAIE" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier lance des flèches.\nMon deuxième indique le lieu.\nMon troisième est au-dessus de nos têtes.\nMon tout apparaît après la pluie.", h: "Trois syllabes", a: "ARC-EN-CIEL", alt: ["ARC EN CIEL"] },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est une soirée dansante.\nMon deuxième termine le mot « salon ».\nMon tout rebondit et se gonfle.", h: "Un jeu", a: "BALLON" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est une note de musique.\nMon deuxième est le contraire du jour.\nMon tout est l'heure de Cendrillon.", h: "Une heure", a: "MINUIT" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est un adjectif possessif.\nMon deuxième est un prénom masculin.\nMon tout sert à se laver.", h: "Dans la salle de bain", a: "SAVON" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est un petit légume rond.\nMon deuxième est un bruit.\nMon tout vit dans l'eau.", h: "Un animal", a: "POISSON" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est un félin domestique.\nMon deuxième coule dans les rivières.\nMon tout a des tours et un pont-levis.", h: "Un bâtiment", a: "CHATEAU", alt: ["CHÂTEAU"] },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est le contraire de mauvais.\nMon deuxième est aussi le contraire de mauvais.\nMon tout se suce et se partage.", h: "Une friandise", a: "BONBON" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est un appareil de cuisson.\nMon deuxième est une note de musique.\nMon tout est un insecte travailleur.", h: "Un insecte", a: "FOURMI" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est un adjectif possessif.\nMon deuxième est un arbre résineux.\nMon tout est l'arbre de Noël.", h: "Un arbre", a: "SAPIN" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Un animal", l: "B", free: true, a: "" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Une ville ou un pays", l: "C", free: true, a: "" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Un métier", l: "M", free: true, a: "" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Un aliment", l: "F", free: true, a: "" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Un prénom", l: "P", free: true, a: "" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Un sport", l: "S", free: true, a: "" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Un objet dans une cuisine", l: "A", free: true, a: "" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Un pays", l: "T", free: true, a: "" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Un animal", l: "L", free: true, a: "" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Un métier", l: "R", free: true, a: "" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Un fruit ou un légume", l: "D", free: true, a: "" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Une ville", l: "V", free: true, a: "" },
  { th: "langue", t: "qcm", q: "Quel est le pluriel de « cheval » ?", o: ["Chevals", "Chevaux", "Chevaus", "Chevales"], a: "Chevaux" },
  { th: "langue", t: "qcm", q: "Quelle est la nature du mot « rapidement » ?", o: ["Un adjectif", "Un adverbe", "Un nom", "Un verbe"], a: "Un adverbe" },
  { th: "langue", t: "qcm", q: "Combien de lettres compte l'alphabet français ?", o: ["24", "25", "26", "27"], a: "26" },
  { th: "langue", t: "qcm", q: "Quel est le synonyme de « joyeux » ?", o: ["Triste", "Content", "Fâché", "Calme"], a: "Content" },
  { th: "langue", t: "qcm", q: "Quel est l'antonyme de « rapide » ?", o: ["Vif", "Lent", "Pressé", "Agile"], a: "Lent" },
  { th: "langue", t: "qcm", q: "Combien de syllabes compte le mot « ordinateur » ?", o: ["3", "4", "5", "6"], a: "4" },
  { th: "langue", t: "qcm", q: "Quelle figure de style utilise le mot « comme » ?", o: ["La métaphore", "La comparaison", "L'hyperbole", "La personnification"], a: "La comparaison" },
  { th: "langue", t: "qcm", q: "Quel temps est employé dans « je mangerai » ?", o: ["Le présent", "Le futur simple", "L'imparfait", "Le passé composé"], a: "Le futur simple" },
  { th: "langue", t: "qcm", q: "Quel est le féminin de « instituteur » ?", o: ["Institutrice", "Instituteure", "Institutaire", "Instituteuse"], a: "Institutrice" },
  { th: "langue", t: "qcm", q: "Quel est le pluriel de « bijou » ?", o: ["Bijous", "Bijoux", "Bijoues", "Bijouxs"], a: "Bijoux" },
  { th: "langue", t: "qcm", q: "Quel mot est un synonyme de « maison » ?", o: ["Demeure", "Cheminée", "Jardin", "Toiture"], a: "Demeure" },
  { th: "langue", t: "qcm", q: "Combien de lettres compte le mot « hibou » ?", o: ["4", "5", "6", "7"], a: "5" },
  { th: "langue", t: "qcm", q: "Quel est l'antonyme de « généreux » ?", o: ["Avare", "Donneur", "Aimable", "Riche"], a: "Avare" },
  { th: "langue", t: "qcm", q: "Quel temps est employé dans « nous chantions » ?", o: ["Le présent", "L'imparfait", "Le futur", "Le passé simple"], a: "L'imparfait" },
  { th: "langue", t: "vf", q: "Un palindrome se lit dans les deux sens.", a: true },
  { th: "langue", t: "vf", q: "Le féminin de « acteur » est « actrice ».", a: true },
  { th: "langue", t: "vf", q: "Un haïku est un poème japonais de trois vers.", a: true },
  { th: "langue", t: "vf", q: "Le mot « souris » peut désigner un animal et un accessoire.", a: true },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le mot.", l: "R E B U S", h: "Une devinette d'images", a: "REBUS" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le mot.", l: "P A L I N D R O M E", h: "Se lit dans les deux sens", a: "PALINDROME" },

  /* -------------------- Banque étendue (vague novembre 2026) -------------------- */
  /* Culture générale */
  { th: "culture", t: "qcm", q: "Combien de cordes possède un violon ?", o: ["4", "5", "6", "7"], a: "4" },
  { th: "culture", t: "qcm", q: "Quel est le plus petit État souverain du monde ?", o: ["Monaco", "Le Vatican", "Saint-Marin", "Le Liechtenstein"], a: "Le Vatican" },
  { th: "culture", t: "qcm", q: "Qui a écrit Les Misérables ?", o: ["Émile Zola", "Victor Hugo", "Gustave Flaubert", "Jules Verne"], a: "Victor Hugo" },
  { th: "culture", t: "qcm", q: "Qui a peint La Joconde ?", o: ["Michel-Ange", "Raphaël", "Léonard de Vinci", "Botticelli"], a: "Léonard de Vinci" },
  { th: "culture", t: "qcm", q: "Quelle langue compte le plus de locuteurs natifs ?", o: ["L'anglais", "L'espagnol", "Le mandarin", "L'hindi"], a: "Le mandarin" },
  { th: "culture", t: "qcm", q: "Combien de secondes compte une heure ?", o: ["3 000", "3 600", "4 000", "4 200"], a: "3 600" },
  { th: "culture", t: "qcm", q: "Combien de dents compte un adulte sans les dents de sagesse ?", o: ["24", "26", "28", "32"], a: "28" },
  { th: "culture", t: "qcm", q: "Quel est le plus grand pays d'Amérique du Sud ?", o: ["L'Argentine", "Le Brésil", "Le Pérou", "La Colombie"], a: "Le Brésil" },
  { th: "culture", t: "qcm", q: "Quelle est la monnaie du Royaume-Uni ?", o: ["L'euro", "La livre sterling", "Le dollar", "La couronne"], a: "La livre sterling" },
  { th: "culture", t: "qcm", q: "Qui a écrit Roméo et Juliette ?", o: ["Molière", "Victor Hugo", "William Shakespeare", "Charles Dickens"], a: "William Shakespeare" },
  { th: "culture", t: "qcm", q: "Quel est le plus grand mammifère terrestre ?", o: ["Le rhinocéros", "L'éléphant d'Afrique", "L'hippopotame", "Le buffle"], a: "L'éléphant d'Afrique" },
  { th: "culture", t: "qcm", q: "Quelle est la capitale de l'Égypte ?", o: ["Alexandrie", "Le Caire", "Louxor", "Assouan"], a: "Le Caire" },
  { th: "culture", t: "qcm", q: "Qui est crédité de l'invention du téléphone ?", o: ["Thomas Edison", "Alexander Graham Bell", "Nikola Tesla", "Guglielmo Marconi"], a: "Alexander Graham Bell" },
  { th: "culture", t: "qcm", q: "Quelle mer sépare l'Europe de l'Afrique ?", o: ["La mer Noire", "La mer Méditerranée", "La mer Rouge", "La mer Baltique"], a: "La mer Méditerranée" },
  { th: "culture", t: "qcm", q: "Quel est le plus grand lac du monde ?", o: ["Le lac Victoria", "Le lac Supérieur", "La mer Caspienne", "Le lac Baïkal"], a: "La mer Caspienne" },
  { th: "culture", t: "qcm", q: "Qui a créé Le Petit Nicolas avec René Goscinny ?", o: ["Jean-Jacques Sempé", "Hergé", "Uderzo", "Peyo"], a: "Jean-Jacques Sempé" },
  { th: "culture", t: "qcm", q: "Quelle est la capitale de l'Autriche ?", o: ["Salzbourg", "Vienne", "Graz", "Innsbruck"], a: "Vienne" },
  { th: "culture", t: "qcm", q: "Quel est le plus long mur jamais construit ?", o: ["Le mur d'Hadrien", "La Grande Muraille", "Le mur de Berlin", "Les remparts de Carcassonne"], a: "La Grande Muraille" },
  { th: "culture", t: "qcm", q: "Quelle planète est célèbre pour ses anneaux visibles ?", o: ["Jupiter", "Saturne", "Uranus", "Neptune"], a: "Saturne" },
  { th: "culture", t: "qcm", q: "Combien de joueurs compte une équipe de rugby à XV sur le terrain ?", o: ["11", "13", "15", "18"], a: "15" },
  { th: "culture", t: "qcm", q: "Quel est le plus volumineux organe interne du corps humain ?", o: ["Le cerveau", "Le foie", "Les poumons", "L'estomac"], a: "Le foie" },
  { th: "culture", t: "qcm", q: "Qui a peint Guernica ?", o: ["Salvador Dalí", "Pablo Picasso", "Joan Miró", "Claude Monet"], a: "Pablo Picasso" },
  { th: "culture", t: "qcm", q: "Quel est le plus grand volcan actif d'Europe ?", o: ["Le Vésuve", "L'Etna", "Le Stromboli", "Le Teide"], a: "L'Etna" },
  { th: "culture", t: "qcm", q: "Combien de lettres compte l'alphabet grec ?", o: ["22", "24", "26", "28"], a: "24" },
  { th: "culture", t: "qcm", q: "Quel fleuve est le plus puissant du monde par son débit ?", o: ["Le Nil", "L'Amazone", "Le Mississippi", "Le Yangtsé"], a: "L'Amazone" },
  { th: "culture", t: "qcm", q: "Quel pays est le plus peuplé d'Afrique ?", o: ["L'Égypte", "Le Nigeria", "L'Éthiopie", "L'Afrique du Sud"], a: "Le Nigeria" },
  { th: "culture", t: "qcm", q: "Quelle est la capitale du Brésil ?", o: ["Rio de Janeiro", "São Paulo", "Brasilia", "Salvador"], a: "Brasilia" },
  { th: "culture", t: "qcm", q: "Qui a écrit L'Étranger ?", o: ["Jean-Paul Sartre", "Albert Camus", "Marcel Proust", "André Gide"], a: "Albert Camus" },
  { th: "culture", t: "qcm", q: "Quel est le symbole chimique du potassium ?", o: ["P", "Po", "K", "Ka"], a: "K" },
  { th: "culture", t: "qcm", q: "Combien de faces possède un cube ?", o: ["4", "6", "8", "12"], a: "6" },
  { th: "culture", t: "qcm", q: "Quel est le plus grand désert froid du monde ?", o: ["Le Groenland", "L'Antarctique", "La Sibérie", "Le Canada"], a: "L'Antarctique" },
  { th: "culture", t: "qcm", q: "Quelle est la durée approximative d'une journée sur Mars ?", o: ["12 heures", "18 heures", "24 h 37", "48 heures"], a: "24 h 37" },
  { th: "culture", t: "qcm", q: "Quel pays a pour drapeau une feuille d'érable rouge ?", o: ["Les États-Unis", "Le Canada", "La Nouvelle-Zélande", "Le Liban"], a: "Le Canada" },
  { th: "culture", t: "qcm", q: "Quel océan borde l'Afrique de l'Est et l'Australie ?", o: ["L'Atlantique", "Le Pacifique", "L'Indien", "L'Arctique"], a: "L'Indien" },
  { th: "culture", t: "qcm", q: "Quelle est la capitale de la Finlande ?", o: ["Oslo", "Stockholm", "Helsinki", "Copenhague"], a: "Helsinki" },
  { th: "culture", t: "qcm", q: "Quel est le pays en forme de botte ?", o: ["L'Espagne", "La Grèce", "L'Italie", "Le Portugal"], a: "L'Italie" },
  { th: "culture", t: "qcm", q: "Quelle est la plus grande île du monde ?", o: ["L'Australie", "Le Groenland", "Bornéo", "Madagascar"], a: "Le Groenland" },
  { th: "culture", t: "qcm", q: "Quel détroit sépare l'Europe et l'Asie à Istanbul ?", o: ["Le détroit de Gibraltar", "Le Bosphore", "Le détroit de Messine", "Le pas de Calais"], a: "Le Bosphore" },
  { th: "culture", t: "qcm", q: "Quelle est la capitale de la Suède ?", o: ["Oslo", "Stockholm", "Helsinki", "Reykjavik"], a: "Stockholm" },
  { th: "culture", t: "qcm", q: "Quel pays du Maghreb est le plus à l'ouest ?", o: ["La Tunisie", "L'Algérie", "Le Maroc", "La Libye"], a: "Le Maroc" },
  { th: "culture", t: "qcm", q: "Quelle est la capitale de la Pologne ?", o: ["Cracovie", "Varsovie", "Gdansk", "Lodz"], a: "Varsovie" },
  { th: "culture", t: "qcm", q: "Quelle mer est la plus salée du monde ?", o: ["La mer Rouge", "La mer Morte", "La mer Caspienne", "La mer Noire"], a: "La mer Morte" },
  { th: "culture", t: "qcm", q: "Quelle chaîne de montagnes traverse l'Amérique du Sud ?", o: ["Les Rocheuses", "Les Andes", "Les Alpes", "L'Himalaya"], a: "Les Andes" },
  { th: "culture", t: "qcm", q: "Quelle est la capitale de la Hongrie ?", o: ["Bucarest", "Budapest", "Prague", "Vienne"], a: "Budapest" },
  { th: "culture", t: "qcm", q: "Quel fleuve est le plus long d'Afrique ?", o: ["Le Congo", "Le Niger", "Le Nil", "Le Zambèze"], a: "Le Nil" },
  { th: "culture", t: "qcm", q: "Quel pays abrite le Machu Picchu ?", o: ["Le Mexique", "Le Pérou", "Le Chili", "La Bolivie"], a: "Le Pérou" },
  { th: "culture", t: "qcm", q: "Quelle est la capitale du Danemark ?", o: ["Oslo", "Copenhague", "Stockholm", "Amsterdam"], a: "Copenhague" },
  { th: "culture", t: "qcm", q: "Quel pays abrite le Kilimandjaro ?", o: ["Le Kenya", "La Tanzanie", "L'Ouganda", "Le Rwanda"], a: "La Tanzanie" },
  { th: "culture", t: "qcm", q: "Quel pays abrite le désert d'Atacama ?", o: ["Le Pérou", "Le Chili", "L'Argentine", "Le Brésil"], a: "Le Chili" },
  { th: "culture", t: "qcm", q: "Quel fleuve traverse Paris ?", o: ["La Loire", "La Seine", "Le Rhône", "La Garonne"], a: "La Seine" },
  { th: "culture", t: "qcm", q: "Quelle est la capitale de l'Argentine ?", o: ["Santiago", "Buenos Aires", "Montevideo", "Lima"], a: "Buenos Aires" },
  { th: "culture", t: "qcm", q: "Quelle est la capitale de la République tchèque ?", o: ["Bratislava", "Prague", "Vienne", "Budapest"], a: "Prague" },
  { th: "culture", t: "vf", q: "Un carré possède cinq côtés.", a: false },
  { th: "culture", t: "vf", q: "Le cœur est un muscle.", a: true },
  { th: "culture", t: "vf", q: "L'Antarctique est un désert.", a: true },
  { th: "culture", t: "vf", q: "Le fer est plus léger que l'aluminium.", a: false },
  { th: "culture", t: "vf", q: "Les chauves-souris sont des mammifères.", a: true },
  { th: "culture", t: "vf", q: "Venise se trouve en Espagne.", a: false },
  { th: "culture", t: "vf", q: "Le Portugal borde l'océan Atlantique.", a: true },

  /* Histoire */
  { th: "histoire", t: "qcm", q: "En quelle année a eu lieu la prise de la Bastille ?", o: ["1492", "1789", "1848", "1914"], a: "1789" },
  { th: "histoire", t: "qcm", q: "En quelle année est tombé le mur de Berlin ?", o: ["1961", "1979", "1989", "1991"], a: "1989" },
  { th: "histoire", t: "qcm", q: "Quand a eu lieu le débarquement de Normandie ?", o: ["Le 6 juin 1944", "Le 8 mai 1945", "Le 11 novembre 1918", "Le 14 juillet 1789"], a: "Le 6 juin 1944" },
  { th: "histoire", t: "qcm", q: "Quel empire Napoléon Bonaparte a-t-il fondé ?", o: ["Le Second Empire", "Le Premier Empire", "L'Empire romain", "Le Saint-Empire"], a: "Le Premier Empire" },
  { th: "histoire", t: "qcm", q: "La guerre de Cent Ans a opposé la France à quel pays ?", o: ["L'Espagne", "L'Angleterre", "L'Italie", "L'Allemagne"], a: "L'Angleterre" },
  { th: "histoire", t: "qcm", q: "À quelle dynastie appartenait Louis XIV ?", o: ["Les Capétiens", "Les Bourbons", "Les Valois", "Les Mérovingiens"], a: "Les Bourbons" },
  { th: "histoire", t: "qcm", q: "En quelle année Christophe Colomb atteint-il l'Amérique ?", o: ["1453", "1492", "1515", "1589"], a: "1492" },
  { th: "histoire", t: "qcm", q: "Qui a été la première femme Première ministre en France ?", o: ["Simone Veil", "Édith Cresson", "Élisabeth Borne", "Ségolène Royal"], a: "Édith Cresson" },
  { th: "histoire", t: "qcm", q: "En quelle année l'esclavage a-t-il été définitivement aboli en France ?", o: ["1789", "1794", "1848", "1905"], a: "1848" },
  { th: "histoire", t: "qcm", q: "En quelle année le Titanic a-t-il coulé ?", o: ["1898", "1912", "1920", "1935"], a: "1912" },
  { th: "histoire", t: "qcm", q: "En quelle année le mur de Berlin a-t-il été construit ?", o: ["1945", "1953", "1961", "1975"], a: "1961" },
  { th: "histoire", t: "qcm", q: "Quel traité met fin à la Première Guerre mondiale en 1919 ?", o: ["Le traité de Rome", "Le traité de Versailles", "Le traité de Vienne", "Le traité de Lisbonne"], a: "Le traité de Versailles" },
  { th: "histoire", t: "qcm", q: "En quelle année Charlemagne a-t-il été couronné empereur ?", o: ["476", "800", "987", "1066"], a: "800" },
  { th: "histoire", t: "qcm", q: "Dans quelle ville Jeanne d'Arc a-t-elle été brûlée ?", o: ["Orléans", "Rouen", "Paris", "Reims"], a: "Rouen" },
  { th: "histoire", t: "qcm", q: "La guerre froide a opposé les États-Unis à quel pays ?", o: ["La Chine", "L'URSS", "L'Allemagne", "Le Japon"], a: "L'URSS" },
  { th: "histoire", t: "qcm", q: "En quelle année ont eu lieu les attentats du 11 septembre ?", o: ["1999", "2000", "2001", "2003"], a: "2001" },
  { th: "histoire", t: "qcm", q: "En quelle année l'ONU a-t-elle été créée ?", o: ["1919", "1939", "1945", "1957"], a: "1945" },
  { th: "histoire", t: "qcm", q: "En quelle année l'Algérie a-t-elle obtenu son indépendance ?", o: ["1954", "1958", "1962", "1968"], a: "1962" },
  { th: "histoire", t: "qcm", q: "Quelles années couvre la Première Guerre mondiale ?", o: ["1912-1916", "1914-1918", "1918-1922", "1939-1945"], a: "1914-1918" },
  { th: "histoire", t: "qcm", q: "Sur quelle île Napoléon a-t-il été exilé après Waterloo ?", o: ["L'île d'Elbe", "Sainte-Hélène", "La Corse", "Malte"], a: "Sainte-Hélène" },
  { th: "histoire", t: "qcm", q: "Dans quelle ville italienne la Renaissance a-t-elle largement commencé ?", o: ["Rome", "Venise", "Florence", "Naples"], a: "Florence" },
  { th: "histoire", t: "qcm", q: "En quelle année Louis XVI a-t-il été guillotiné ?", o: ["1789", "1791", "1793", "1799"], a: "1793" },
  { th: "histoire", t: "qcm", q: "En quelle année le suffrage universel masculin a-t-il été instauré en France ?", o: ["1789", "1830", "1848", "1870"], a: "1848" },
  { th: "histoire", t: "qcm", q: "En quelle année François Mitterrand a-t-il été élu président ?", o: ["1969", "1974", "1981", "1988"], a: "1981" },
  { th: "histoire", t: "qcm", q: "En quelle année l'URSS a-t-elle été dissoute ?", o: ["1985", "1989", "1991", "1993"], a: "1991" },
  { th: "histoire", t: "qcm", q: "Au service de quel pays Christophe Colomb a-t-il navigué en 1492 ?", o: ["Le Portugal", "L'Espagne", "La France", "L'Angleterre"], a: "L'Espagne" },
  { th: "histoire", t: "qcm", q: "Quel chef gaulois a affronté Jules César à Alésia ?", o: ["Vercingétorix", "Brennus", "Ambiorix", "Clovis"], a: "Vercingétorix" },
  { th: "histoire", t: "qcm", q: "En quelle année a eu lieu la bataille de Waterloo ?", o: ["1799", "1805", "1815", "1830"], a: "1815" },
  { th: "histoire", t: "qcm", q: "Quel traité de 1957 crée la Communauté économique européenne ?", o: ["Le traité de Paris", "Le traité de Rome", "Le traité de Maastricht", "Le traité de Lisbonne"], a: "Le traité de Rome" },
  { th: "histoire", t: "qcm", q: "Qui a assassiné Henri IV en 1610 ?", o: ["Ravaillac", "Damiens", "Charlotte Corday", "Fieschi"], a: "Ravaillac" },
  { th: "histoire", t: "qcm", q: "Quelle reine d'Égypte a été la dernière souveraine de la dynastie ptolémaïque ?", o: ["Néfertiti", "Cléopâtre VII", "Hatchepsout", "Théodora"], a: "Cléopâtre VII" },
  { th: "histoire", t: "qcm", q: "Quel mur a été détruit en 1989 ?", o: ["Le mur d'Hadrien", "Le mur de Berlin", "La Grande Muraille", "Le mur de l'Atlantique"], a: "Le mur de Berlin" },
  { th: "histoire", t: "vf", q: "Napoléon a été empereur des Français.", a: true },
  { th: "histoire", t: "vf", q: "Le débarquement de Normandie a eu lieu en 1945.", a: false },
  { th: "histoire", t: "vf", q: "Cléopâtre était une reine d'Égypte.", a: true },
  { th: "histoire", t: "vf", q: "Le mur de Berlin est tombé avant la fin de l'URSS.", a: true },
  { th: "histoire", t: "vf", q: "Louis XIV a régné plus de 70 ans.", a: true },
  { th: "histoire", t: "vf", q: "La Première Guerre mondiale a commencé en 1939.", a: false },

  /* Sciences */
  { th: "sciences", t: "qcm", q: "Combien de chromosomes compte une cellule humaine normale ?", o: ["23", "44", "46", "48"], a: "46" },
  { th: "sciences", t: "qcm", q: "Quel organe permet la respiration ?", o: ["Le foie", "Les poumons", "Les reins", "L'estomac"], a: "Les poumons" },
  { th: "sciences", t: "qcm", q: "Quelle est la vitesse approximative du son dans l'air ?", o: ["34 m/s", "340 m/s", "3 400 m/s", "34 000 m/s"], a: "340 m/s" },
  { th: "sciences", t: "qcm", q: "Quelle planète est appelée la planète rouge ?", o: ["Vénus", "Mars", "Jupiter", "Mercure"], a: "Mars" },
  { th: "sciences", t: "qcm", q: "Quel est le plus long os du corps humain ?", o: ["Le tibia", "Le fémur", "L'humérus", "Le radius"], a: "Le fémur" },
  { th: "sciences", t: "qcm", q: "Quelle particule possède une charge négative ?", o: ["Le proton", "Le neutron", "L'électron", "Le photon"], a: "L'électron" },
  { th: "sciences", t: "qcm", q: "Qui a proposé le tableau périodique des éléments ?", o: ["Marie Curie", "Dmitri Mendeleïev", "Albert Einstein", "Niels Bohr"], a: "Dmitri Mendeleïev" },
  { th: "sciences", t: "qcm", q: "Quelle loi décrit l'attraction entre les masses ?", o: ["La loi d'Ohm", "La gravitation de Newton", "La relativité d'Einstein", "La thermodynamique"], a: "La gravitation de Newton" },
  { th: "sciences", t: "qcm", q: "Quel est le pH d'une solution neutre ?", o: ["0", "5", "7", "14"], a: "7" },
  { th: "sciences", t: "qcm", q: "Quel organe produit l'insuline ?", o: ["Le foie", "Le pancréas", "La thyroïde", "Les reins"], a: "Le pancréas" },
  { th: "sciences", t: "qcm", q: "Quelle est la cellule reproductrice femelle ?", o: ["Le spermatozoïde", "L'ovule", "Le neurone", "Le globule rouge"], a: "L'ovule" },
  { th: "sciences", t: "qcm", q: "Quelle planète est la plus grande du système solaire ?", o: ["Saturne", "Jupiter", "Neptune", "Uranus"], a: "Jupiter" },
  { th: "sciences", t: "qcm", q: "Quel instrument décompose la lumière blanche ?", o: ["Un miroir", "Un prisme", "Une lentille", "Un aimant"], a: "Un prisme" },
  { th: "sciences", t: "qcm", q: "Quel est le symbole chimique du carbone ?", o: ["Ca", "C", "Co", "Cr"], a: "C" },
  { th: "sciences", t: "qcm", q: "Quelle hormone favorise le sommeil ?", o: ["L'adrénaline", "La mélatonine", "L'insuline", "La testostérone"], a: "La mélatonine" },
  { th: "sciences", t: "qcm", q: "Qui a développé un vaccin contre la rage ?", o: ["Alexander Fleming", "Louis Pasteur", "Marie Curie", "Edward Jenner"], a: "Louis Pasteur" },
  { th: "sciences", t: "qcm", q: "Quelle théorie est associée à Albert Einstein ?", o: ["La sélection naturelle", "La relativité", "La gravité quantique", "La génétique"], a: "La relativité" },
  { th: "sciences", t: "qcm", q: "Combien de pattes possède une araignée ?", o: ["6", "8", "10", "12"], a: "8" },
  { th: "sciences", t: "qcm", q: "Quel gaz l'être humain respire-t-il pour vivre ?", o: ["L'azote", "L'oxygène", "Le dioxyde de carbone", "L'hélium"], a: "L'oxygène" },
  { th: "sciences", t: "qcm", q: "Quelle est l'unité de mesure de la masse ?", o: ["Le mètre", "Le kilogramme", "Le litre", "Le newton"], a: "Le kilogramme" },
  { th: "sciences", t: "qcm", q: "Quelle planète est la plus éloignée du Soleil ?", o: ["Uranus", "Neptune", "Saturne", "Pluton"], a: "Neptune" },
  { th: "sciences", t: "qcm", q: "Quel organe est protégé par la boîte crânienne ?", o: ["Le cœur", "Le cerveau", "Le foie", "Les poumons"], a: "Le cerveau" },
  { th: "sciences", t: "qcm", q: "Quel astre provoque principalement les marées ?", o: ["Le Soleil", "La Lune", "Mars", "Vénus"], a: "La Lune" },
  { th: "sciences", t: "qcm", q: "Quelle énergie provient du Soleil ?", o: ["L'énergie fossile", "L'énergie solaire", "L'énergie nucléaire", "L'énergie marémotrice"], a: "L'énergie solaire" },
  { th: "sciences", t: "qcm", q: "Quelle est l'unité de puissance ?", o: ["Le volt", "Le watt", "L'ampère", "Le joule"], a: "Le watt" },
  { th: "sciences", t: "qcm", q: "Quel est le groupe sanguin donneur universel ?", o: ["A positif", "B négatif", "O négatif", "AB positif"], a: "O négatif" },
  { th: "sciences", t: "qcm", q: "Quelle est la température d'ébullition de l'eau au niveau de la mer ?", o: ["50 °C", "80 °C", "100 °C", "120 °C"], a: "100 °C" },
  { th: "sciences", t: "qcm", q: "Quel est le plus grand nerf du corps humain ?", o: ["Le nerf optique", "Le nerf sciatique", "Le nerf facial", "Le nerf vague"], a: "Le nerf sciatique" },
  { th: "sciences", t: "qcm", q: "Quel type de roche provient du refroidissement du magma ?", o: ["Sédimentaire", "Magmatique", "Métamorphique", "Calcaire"], a: "Magmatique" },
  { th: "sciences", t: "qcm", q: "Quel phénomène produit un arc-en-ciel ?", o: ["La réflexion des ondes radio", "La dispersion de la lumière", "L'écho du son", "La gravité"], a: "La dispersion de la lumière" },
  { th: "sciences", t: "qcm", q: "Quelle est la fonction des globules rouges ?", o: ["Transporter l'oxygène", "Produire de l'insuline", "Digérer les aliments", "Filtrer l'air"], a: "Transporter l'oxygène" },
  { th: "sciences", t: "vf", q: "L'eau est composée d'hydrogène et d'oxygène.", a: true },
  { th: "sciences", t: "vf", q: "La Terre tourne autour du Soleil en environ un an.", a: true },
  { th: "sciences", t: "vf", q: "Les dinosaures et les humains ont vécu à la même époque.", a: false },
  { th: "sciences", t: "vf", q: "Le cerveau consomme de l'oxygène.", a: true },
  { th: "sciences", t: "vf", q: "Un atome est plus petit qu'une molécule.", a: true },
  { th: "sciences", t: "vf", q: "Le Soleil tourne autour de la Terre.", a: false },

  /* Cinéma & séries */
  { th: "ecran", t: "qcm", q: "Qui a réalisé Titanic ?", o: ["Steven Spielberg", "James Cameron", "Ridley Scott", "Christopher Nolan"], a: "James Cameron" },
  { th: "ecran", t: "qcm", q: "Quel film met en scène un grand requin blanc ?", o: ["Les Dents de la mer", "Abyss", "Orca", "Le Grand Bleu"], a: "Les Dents de la mer" },
  { th: "ecran", t: "qcm", q: "Dans quelle saga trouve-t-on Dark Vador ?", o: ["Star Trek", "Star Wars", "Dune", "Matrix"], a: "Star Wars" },
  { th: "ecran", t: "qcm", q: "Dans quel film Disney trouve-t-on Elsa ?", o: ["Raiponce", "La Reine des neiges", "Vaiana", "Coco"], a: "La Reine des neiges" },
  { th: "ecran", t: "qcm", q: "Dans quelle série trouve-t-on Eleven ?", o: ["Dark", "Stranger Things", "Lost", "The 100"], a: "Stranger Things" },
  { th: "ecran", t: "qcm", q: "Qui a réalisé Pulp Fiction ?", o: ["Martin Scorsese", "Quentin Tarantino", "David Fincher", "Coen"], a: "Quentin Tarantino" },
  { th: "ecran", t: "qcm", q: "Quel film français raconte l'amitié entre un riche tétraplégique et son aide-soignant ?", o: ["Intouchables", "La Haine", "Le Dîner de cons", "Amélie"], a: "Intouchables" },
  { th: "ecran", t: "qcm", q: "Quelle série espagnole suit un braquage de la Fabrique nationale de la monnaie ?", o: ["Élite", "La Casa de Papel", "Narcos", "Vis a vis"], a: "La Casa de Papel" },
  { th: "ecran", t: "qcm", q: "Dans quel film Neo découvre-t-il la vérité sur sa réalité ?", o: ["Matrix", "Inception", "Interstellar", "Tron"], a: "Matrix" },
  { th: "ecran", t: "qcm", q: "Quel film de 2023 met en scène une poupée rose dans le monde réel ?", o: ["Barbie", "Oppenheimer", "Mario", "Wonka"], a: "Barbie" },
  { th: "ecran", t: "qcm", q: "Quelle série médiévale fantastique met en scène le Trône de fer ?", o: ["Vikings", "Game of Thrones", "The Witcher", "Rome"], a: "Game of Thrones" },
  { th: "ecran", t: "qcm", q: "Quel film d'animation japonais raconte l'histoire de Chihiro ?", o: ["Mon voisin Totoro", "Le Voyage de Chihiro", "Princesse Mononoké", "Akira"], a: "Le Voyage de Chihiro" },
  { th: "ecran", t: "qcm", q: "Quel acteur incarne Forrest Gump ?", o: ["Tom Hanks", "Brad Pitt", "Kevin Costner", "Robin Williams"], a: "Tom Hanks" },
  { th: "ecran", t: "qcm", q: "Quelle série médicale se déroule au Grey Sloan Memorial ?", o: ["Urgences", "Grey's Anatomy", "Dr House", "New Amsterdam"], a: "Grey's Anatomy" },
  { th: "ecran", t: "qcm", q: "Quel film suit la quête d'un anneau unique ?", o: ["Harry Potter", "Le Seigneur des anneaux", "Narnia", "Eragon"], a: "Le Seigneur des anneaux" },
  { th: "ecran", t: "qcm", q: "Qui a réalisé Inception ?", o: ["Christopher Nolan", "Denis Villeneuve", "Ridley Scott", "James Cameron"], a: "Christopher Nolan" },
  { th: "ecran", t: "qcm", q: "Quel film Disney met en scène Simba ?", o: ["Le Roi lion", "Le Livre de la jungle", "Tarzan", "Bambi"], a: "Le Roi lion" },
  { th: "ecran", t: "qcm", q: "Quelle série française met en scène un gentleman cambrioleur inspiré d'Arsène Lupin ?", o: ["Lupin", "Dix pour cent", "Le Bureau des légendes", "Engrenages"], a: "Lupin" },
  { th: "ecran", t: "qcm", q: "Quel acteur incarne John Wick ?", o: ["Keanu Reeves", "Tom Cruise", "Jason Statham", "Liam Neeson"], a: "Keanu Reeves" },
  { th: "ecran", t: "qcm", q: "Quel film d'horreur met en scène le clown Grippe-Sou ?", o: ["Ça", "Halloween", "Freddy", "Conjuring"], a: "Ça" },
  { th: "ecran", t: "qcm", q: "Quel film Pixar met en scène des jouets qui prennent vie ?", o: ["Toy Story", "Cars", "Là-haut", "Ratatouille"], a: "Toy Story" },
  { th: "ecran", t: "qcm", q: "Quel film met en scène des dinosaures dans un parc ?", o: ["Jurassic Park", "Godzilla", "King Kong", "Le Monde perdu"], a: "Jurassic Park" },
  { th: "ecran", t: "qcm", q: "Quel acteur incarne Sherlock dans la série Sherlock de la BBC ?", o: ["Martin Freeman", "Benedict Cumberbatch", "Tom Hiddleston", "Eddie Redmayne"], a: "Benedict Cumberbatch" },
  { th: "ecran", t: "qcm", q: "Quel film français suit Amélie Poulain à Montmartre ?", o: ["Le Fabuleux Destin d'Amélie Poulain", "La Haine", "Les Choristes", "Le Dîner de cons"], a: "Le Fabuleux Destin d'Amélie Poulain" },
  { th: "ecran", t: "qcm", q: "Quel film de boxe met en scène Rocky Balboa ?", o: ["Rocky", "Raging Bull", "Creed", "Ali"], a: "Rocky" },
  { th: "ecran", t: "qcm", q: "Quel film de science-fiction met en scène un extraterrestre perdu sur Terre ?", o: ["E.T.", "Alien", "Close Encounters", "Signes"], a: "E.T." },
  { th: "ecran", t: "qcm", q: "Quelle série met en scène des survivants face à des zombies ?", o: ["The Walking Dead", "The Last of Us", "Z Nation", "Black Summer"], a: "The Walking Dead" },
  { th: "ecran", t: "qcm", q: "Quelle actrice française a joué dans La Môme ?", o: ["Audrey Tautou", "Marion Cotillard", "Léa Seydoux", "Isabelle Huppert"], a: "Marion Cotillard" },
  { th: "ecran", t: "qcm", q: "Quel film d'animation Pixar met en scène un poisson clown nommé Nemo ?", o: ["Le Monde de Nemo", "Dory", "Océans", "La Petite Sirène"], a: "Le Monde de Nemo" },
  { th: "ecran", t: "qcm", q: "Quelle série suit un professeur de chimie devenu trafiquant ?", o: ["Breaking Bad", "Better Call Saul", "Narcos", "Ozark"], a: "Breaking Bad" },
  { th: "ecran", t: "qcm", q: "Quelle sitcom suit six amis à New York ?", o: ["Friends", "How I Met Your Mother", "The Big Bang Theory", "Seinfeld"], a: "Friends" },
  { th: "ecran", t: "qcm", q: "Quelle série coréenne met en scène des jeux d'enfants mortels ?", o: ["Squid Game", "Alice in Borderland", "Sweet Home", "Kingdom"], a: "Squid Game" },
  { th: "ecran", t: "qcm", q: "Quel film de 1994 raconte la vie de Forrest Gump à travers l'histoire américaine ?", o: ["Forrest Gump", "Philadelphia", "Apollo 13", "Big"], a: "Forrest Gump" },
  { th: "ecran", t: "qcm", q: "Quel film de Ridley Scott se déroule dans la Rome antique ?", o: ["Gladiator", "Troie", "300", "Ben-Hur"], a: "Gladiator" },
  { th: "ecran", t: "qcm", q: "Quel film de Robert Zemeckis utilise une DeLorean voyageant dans le temps ?", o: ["Retour vers le futur", "Contact", "Forrest Gump", "Qui veut la peau de Roger Rabbit"], a: "Retour vers le futur" },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Une serveuse parisienne rêveuse décide d'aider les autres à Montmartre.", h: "Un film français de 2001.", a: "Le Fabuleux Destin d'Amélie Poulain", alt: ["Amélie", "Amelie"] },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Trois amis de banlieue vivent une journée qui bascule après une nuit de violence policière.", h: "Un film français de Mathieu Kassovitz.", a: "La Haine" },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Un homme simple traverse les décennies de l'histoire américaine sans jamais perdre son cœur.", h: "Avec Tom Hanks.", a: "Forrest Gump" },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Un général romain trahi devient gladiateur pour se venger de l'empereur.", h: "Avec Russell Crowe.", a: "Gladiator" },
  { th: "ecran", t: "film", q: "De quel film parle ce résumé ?", sum: "Un adolescent voyage dans le temps grâce à une voiture modifiée par un savant fou.", h: "Une trilogie des années 1980.", a: "Retour vers le futur", alt: ["Back to the Future"] },
  { th: "ecran", t: "serie", q: "De quelle série parle ce résumé ?", sum: "Un cambrioleur charismatique s'inspire d'Arsène Lupin pour venger son père.", h: "Une série française avec Omar Sy.", a: "Lupin" },
  { th: "ecran", t: "serie", q: "De quelle série parle ce résumé ?", sum: "Des survivants tentent de rester en vie après une épidémie de zombies.", h: "Adaptée d'une bande dessinée.", a: "The Walking Dead" },
  { th: "ecran", t: "serie", q: "De quelle série parle ce résumé ?", sum: "Une équipe de braqueurs prend d'assaut la Fabrique nationale de la monnaie espagnole.", h: "Une série espagnole.", a: "La Casa de Papel", alt: ["Money Heist"] },
  { th: "ecran", t: "vf", q: "Titanic a été réalisé par James Cameron.", a: true },
  { th: "ecran", t: "vf", q: "Dark Vador est un personnage de Star Trek.", a: false },
  { th: "ecran", t: "vf", q: "Friends se déroule à New York.", a: true },
  { th: "ecran", t: "vf", q: "Le Voyage de Chihiro est un film Pixar.", a: false },
  { th: "ecran", t: "vf", q: "Matrix est sorti en 1999.", a: true },
  { th: "ecran", t: "vf", q: "La Casa de Papel est une série espagnole.", a: true },
  { th: "ecran", t: "vf", q: "Le Parrain a été réalisé par Martin Scorsese.", a: false },
  { th: "ecran", t: "vf", q: "Toy Story est le premier long métrage entièrement en images de synthèse.", a: true },

  /* Musique */
  { th: "musique", t: "qcm", q: "Quel groupe interprète Bohemian Rhapsody ?", o: ["The Beatles", "Queen", "Led Zeppelin", "Pink Floyd"], a: "Queen" },
  { th: "musique", t: "qcm", q: "Quel groupe britannique vient de Liverpool ?", o: ["The Rolling Stones", "The Beatles", "The Who", "Oasis"], a: "The Beatles" },
  { th: "musique", t: "qcm", q: "Qui chante Rolling in the Deep ?", o: ["Rihanna", "Adele", "Beyoncé", "Taylor Swift"], a: "Adele" },
  { th: "musique", t: "qcm", q: "Quel groupe interprète Stairway to Heaven ?", o: ["Led Zeppelin", "Deep Purple", "Black Sabbath", "The Doors"], a: "Led Zeppelin" },
  { th: "musique", t: "qcm", q: "Qui a chanté Thriller ?", o: ["Prince", "Michael Jackson", "Stevie Wonder", "Lionel Richie"], a: "Michael Jackson" },
  { th: "musique", t: "qcm", q: "Quelle chanteuse française a popularisé La Vie en rose ?", o: ["Dalida", "Édith Piaf", "Barbara", "Juliette Gréco"], a: "Édith Piaf" },
  { th: "musique", t: "qcm", q: "Quel groupe irlandais a pour chanteur Bono ?", o: ["U2", "The Cranberries", "The Script", "Thin Lizzy"], a: "U2" },
  { th: "musique", t: "qcm", q: "Qui chante Shape of You ?", o: ["Ed Sheeran", "Sam Smith", "James Blunt", "Shawn Mendes"], a: "Ed Sheeran" },
  { th: "musique", t: "qcm", q: "Qui chante Bad Guy ?", o: ["Billie Eilish", "Lorde", "Halsey", "Dua Lipa"], a: "Billie Eilish" },
  { th: "musique", t: "qcm", q: "Quel groupe interprète Wonderwall ?", o: ["Blur", "Oasis", "Pulp", "The Verve"], a: "Oasis" },
  { th: "musique", t: "qcm", q: "Qui chante Hotline Bling ?", o: ["Drake", "Kanye West", "Kendrick Lamar", "Travis Scott"], a: "Drake" },
  { th: "musique", t: "qcm", q: "Quel groupe interprète Smells Like Teen Spirit ?", o: ["Pearl Jam", "Nirvana", "Soundgarden", "Alice in Chains"], a: "Nirvana" },
  { th: "musique", t: "qcm", q: "Qui chante Rocket Man ?", o: ["Elton John", "David Bowie", "Freddie Mercury", "Phil Collins"], a: "Elton John" },
  { th: "musique", t: "qcm", q: "Qui chante Umbrella ?", o: ["Beyoncé", "Rihanna", "Nicki Minaj", "Alicia Keys"], a: "Rihanna" },
  { th: "musique", t: "qcm", q: "Quel groupe interprète Yellow ?", o: ["Coldplay", "Radiohead", "Keane", "Snow Patrol"], a: "Coldplay" },
  { th: "musique", t: "qcm", q: "Qui a chanté Purple Rain ?", o: ["Michael Jackson", "Prince", "Rick James", "Stevie Wonder"], a: "Prince" },
  { th: "musique", t: "qcm", q: "Quel groupe interprète Highway to Hell ?", o: ["AC/DC", "Guns N' Roses", "Metallica", "Aerosmith"], a: "AC/DC" },
  { th: "musique", t: "qcm", q: "Quel groupe norvégien interprète Take On Me ?", o: ["A-ha", "Roxette", "ABBA", "Europe"], a: "A-ha" },
  { th: "musique", t: "qcm", q: "Qui chante Waka Waka ?", o: ["Shakira", "Jennifer Lopez", "Ricky Martin", "Enrique Iglesias"], a: "Shakira" },
  { th: "musique", t: "qcm", q: "Quel groupe suédois interprète Dancing Queen ?", o: ["ABBA", "Roxette", "Ace of Base", "Europe"], a: "ABBA" },
  { th: "musique", t: "qcm", q: "Quel instrument est associé à Jimi Hendrix ?", o: ["La batterie", "La guitare électrique", "Le piano", "La basse"], a: "La guitare électrique" },
  { th: "musique", t: "qcm", q: "Qui a chanté My Way ?", o: ["Frank Sinatra", "Dean Martin", "Nat King Cole", "Tony Bennett"], a: "Frank Sinatra" },
  { th: "musique", t: "qcm", q: "Qui chante Halo ?", o: ["Beyoncé", "Alicia Keys", "Mary J. Blige", "Janet Jackson"], a: "Beyoncé" },
  { th: "musique", t: "qcm", q: "Qui chante Lose Yourself ?", o: ["Eminem", "50 Cent", "Jay-Z", "Nas"], a: "Eminem" },
  { th: "musique", t: "qcm", q: "Quel groupe interprète Clocks ?", o: ["Coldplay", "Muse", "Radiohead", "Travis"], a: "Coldplay" },
  { th: "musique", t: "qcm", q: "Qui a chanté Imagine ?", o: ["John Lennon", "Paul McCartney", "George Harrison", "Elton John"], a: "John Lennon" },
  { th: "musique", t: "qcm", q: "Qui chante Like a Prayer ?", o: ["Madonna", "Cyndi Lauper", "Whitney Houston", "Kylie Minogue"], a: "Madonna" },
  { th: "musique", t: "qcm", q: "Quel groupe irlandais interprète Zombie ?", o: ["The Cranberries", "U2", "The Corrs", "Sinead O'Connor"], a: "The Cranberries" },
  { th: "musique", t: "qcm", q: "Quel groupe interprète Back in Black ?", o: ["AC/DC", "Metallica", "Motörhead", "Iron Maiden"], a: "AC/DC" },
  { th: "musique", t: "qcm", q: "Quel instrument Mozart jouait-il principalement ?", o: ["Le violon", "Le piano-forte", "La flûte", "Le violoncelle"], a: "Le piano-forte" },
  { th: "musique", t: "qcm", q: "Qui a composé Les Quatre Saisons ?", o: ["Bach", "Vivaldi", "Haendel", "Mozart"], a: "Vivaldi" },
  { th: "musique", t: "qcm", q: "Quel groupe interprète Sweet Child O' Mine ?", o: ["Guns N' Roses", "Bon Jovi", "Aerosmith", "Def Leppard"], a: "Guns N' Roses" },
  { th: "musique", t: "qcm", q: "Qui chante Rolling in the Deep et Hello ?", o: ["Adele", "Sam Smith", "Amy Winehouse", "Duffy"], a: "Adele" },
  { th: "musique", t: "qcm", q: "Quel rappeur français a sorti l'album Fenêtre sur rue ?", o: ["Booba", "Nekfeu", "Damso", "Orelsan"], a: "Nekfeu" },
  { th: "musique", t: "qcm", q: "Qui chante Djadja ?", o: ["Aya Nakamura", "Dadju", "Soprano", "Vitaa"], a: "Aya Nakamura" },
  { th: "musique", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le chanteur.", l: "L V I S", h: "Le King du rock'n'roll", a: "ELVIS" },
  { th: "musique", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'instrument.", l: "A R U T I G E", h: "À six cordes", a: "GUITARE" },
  { th: "musique", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le groupe.", l: "E T A B E L S", h: "Quatre garçons de Liverpool", a: "BEATLES" },
  { th: "musique", t: "vf", q: "Mozart est né en Autriche.", a: true },
  { th: "musique", t: "vf", q: "Le piano possède 88 touches.", a: true },
  { th: "musique", t: "vf", q: "Beethoven était sourd à la fin de sa vie.", a: true },
  { th: "musique", t: "vf", q: "ABBA est un groupe norvégien.", a: false },
  { th: "musique", t: "vf", q: "La guitare acoustique possède six cordes.", a: true },
  { th: "musique", t: "vf", q: "Queen a sorti Bohemian Rhapsody en 1975.", a: true },

  /* Sport */
  { th: "sport", t: "qcm", q: "Dans quel pays se trouve le Real Madrid ?", o: ["L'Italie", "L'Espagne", "Le Portugal", "La France"], a: "L'Espagne" },
  { th: "sport", t: "qcm", q: "Le Tour de France est une compétition de quel sport ?", o: ["Course à pied", "Cyclisme", "Natation", "Rallye"], a: "Cyclisme" },
  { th: "sport", t: "qcm", q: "Dans quel pays le sumo est-il un sport national ?", o: ["La Chine", "Le Japon", "La Corée du Sud", "La Thaïlande"], a: "Le Japon" },
  { th: "sport", t: "qcm", q: "Quel sport pratique Lionel Messi ?", o: ["Le football", "Le rugby", "Le tennis", "Le handball"], a: "Le football" },
  { th: "sport", t: "qcm", q: "Quel sport utilise un volant ?", o: ["Le tennis de table", "Le badminton", "Le squash", "Le tennis"], a: "Le badminton" },
  { th: "sport", t: "qcm", q: "Quel sport a rendu Michael Jordan célèbre ?", o: ["Le baseball", "Le basket", "Le football américain", "Le hockey"], a: "Le basket" },
  { th: "sport", t: "qcm", q: "Quel sport pratique Serena Williams ?", o: ["Le tennis", "Le golf", "L'athlétisme", "La natation"], a: "Le tennis" },
  { th: "sport", t: "qcm", q: "Quel sport pratique Simone Biles ?", o: ["La gymnastique", "L'athlétisme", "La natation", "Le plongeon"], a: "La gymnastique" },
  { th: "sport", t: "qcm", q: "Quel tournoi de tennis se joue sur gazon ?", o: ["Roland-Garros", "Wimbledon", "L'US Open", "L'Open d'Australie"], a: "Wimbledon" },
  { th: "sport", t: "qcm", q: "Quel sport pratique Lewis Hamilton ?", o: ["La Formule 1", "Le MotoGP", "Le rallye", "Le karting"], a: "La Formule 1" },
  { th: "sport", t: "qcm", q: "Combien de joueurs compte une équipe de handball sur le terrain ?", o: ["5", "6", "7", "8"], a: "7" },
  { th: "sport", t: "qcm", q: "Quel sport pratique Novak Djokovic ?", o: ["Le tennis", "Le football", "Le basket", "Le golf"], a: "Le tennis" },
  { th: "sport", t: "qcm", q: "Quel sport pratique Kylian Mbappé ?", o: ["Le football", "Le rugby", "Le tennis", "Le handball"], a: "Le football" },
  { th: "sport", t: "qcm", q: "De quel pays le judo est-il originaire ?", o: ["La Chine", "Le Japon", "La Corée", "Le Brésil"], a: "Le Japon" },
  { th: "sport", t: "qcm", q: "Quel sport a rendu Tony Parker célèbre ?", o: ["Le basket", "Le football", "Le tennis", "Le rugby"], a: "Le basket" },
  { th: "sport", t: "qcm", q: "Combien de points vaut un essai au rugby ?", o: ["3", "5", "7", "10"], a: "5" },
  { th: "sport", t: "qcm", q: "Quel sport pratique Zinédine Zidane ?", o: ["Le football", "Le basket", "Le tennis", "Le handball"], a: "Le football" },
  { th: "sport", t: "qcm", q: "Quel sport pratique Tiger Woods ?", o: ["Le golf", "Le tennis", "Le cricket", "Le base-ball"], a: "Le golf" },
  { th: "sport", t: "qcm", q: "Quel sport pratique Usain Bolt ?", o: ["L'athlétisme", "La natation", "Le cyclisme", "La boxe"], a: "L'athlétisme" },
  { th: "sport", t: "qcm", q: "Quel sport pratique Florent Manaudou ?", o: ["La natation", "L'athlétisme", "Le plongeon", "L'aviron"], a: "La natation" },
  { th: "sport", t: "qcm", q: "Quel pays a inventé le cricket moderne ?", o: ["L'Inde", "L'Angleterre", "L'Australie", "Le Pakistan"], a: "L'Angleterre" },
  { th: "sport", t: "qcm", q: "Quel sport se joue avec un ballon ovale et des essais ?", o: ["Le rugby", "Le football", "Le handball", "Le basket"], a: "Le rugby" },
  { th: "sport", t: "qcm", q: "Quel Grand Chelem de tennis se joue à Paris ?", o: ["Wimbledon", "Roland-Garros", "L'US Open", "L'Open d'Australie"], a: "Roland-Garros" },
  { th: "sport", t: "vf", q: "Le football se joue avec onze joueurs par équipe.", a: true },
  { th: "sport", t: "vf", q: "Le Tour de France est une course de motos.", a: false },
  { th: "sport", t: "vf", q: "Le basket se joue avec un ballon orange.", a: true },
  { th: "sport", t: "vf", q: "Le judo est un sport de combat japonais.", a: true },
  { th: "sport", t: "vf", q: "Un match de tennis se joue toujours en trois sets.", a: false },

  /* People */
  { th: "people", t: "qcm", q: "Quel acteur incarne Ethan Hunt dans Mission Impossible ?", o: ["Tom Cruise", "Brad Pitt", "Matt Damon", "Keanu Reeves"], a: "Tom Cruise" },
  { th: "people", t: "qcm", q: "Qui chante Shake It Off ?", o: ["Taylor Swift", "Ariana Grande", "Katy Perry", "Selena Gomez"], a: "Taylor Swift" },
  { th: "people", t: "qcm", q: "Quel entrepreneur dirige Tesla et SpaceX ?", o: ["Jeff Bezos", "Elon Musk", "Mark Zuckerberg", "Bill Gates"], a: "Elon Musk" },
  { th: "people", t: "qcm", q: "Quel rappeur français est surnommé le Duc de Boulogne ?", o: ["Booba", "Kaaris", "Soprano", "Rohff"], a: "Booba" },
  { th: "people", t: "qcm", q: "Quel footballeur portugais est surnommé CR7 ?", o: ["Cristiano Ronaldo", "Luis Figo", "Eusébio", "Bernardo Silva"], a: "Cristiano Ronaldo" },
  { th: "people", t: "qcm", q: "Quel acteur a incarné Black Panther ?", o: ["Michael B. Jordan", "Chadwick Boseman", "Anthony Mackie", "Idris Elba"], a: "Chadwick Boseman" },
  { th: "people", t: "qcm", q: "Quel acteur incarne Jack Dawson dans Titanic ?", o: ["Leonardo DiCaprio", "Brad Pitt", "Johnny Depp", "Matt Damon"], a: "Leonardo DiCaprio" },
  { th: "people", t: "qcm", q: "Quel youtubeur français a lancé le GP Explorer ?", o: ["Squeezie", "Cyprien", "Norman", "Amixem"], a: "Squeezie" },
  { th: "people", t: "qcm", q: "Qui chante Blinding Lights ?", o: ["The Weeknd", "Drake", "Post Malone", "Bruno Mars"], a: "The Weeknd" },
  { th: "people", t: "qcm", q: "Quelle actrice a joué Rachel dans Friends ?", o: ["Jennifer Aniston", "Courteney Cox", "Lisa Kudrow", "Julia Roberts"], a: "Jennifer Aniston" },
  { th: "people", t: "qcm", q: "Quel acteur est surnommé The Rock ?", o: ["Dwayne Johnson", "Vin Diesel", "Jason Momoa", "Dave Bautista"], a: "Dwayne Johnson" },
  { th: "people", t: "qcm", q: "Quelle chanteuse française a interprété Djadja ?", o: ["Aya Nakamura", "Louane", "Angèle", "Vitaa"], a: "Aya Nakamura" },
  { th: "people", t: "qcm", q: "Quel footballeur argentin a remporté la Coupe du monde 2022 ?", o: ["Lionel Messi", "Sergio Agüero", "Ángel Di María", "Julián Álvarez"], a: "Lionel Messi" },
  { th: "people", t: "qcm", q: "Quelle chanteuse britannique a interprété New Rules ?", o: ["Dua Lipa", "Adele", "Ellie Goulding", "Rita Ora"], a: "Dua Lipa" },
  { th: "people", t: "qcm", q: "Quel acteur incarne le Joker dans le film de 2019 ?", o: ["Joaquin Phoenix", "Heath Ledger", "Jared Leto", "Jack Nicholson"], a: "Joaquin Phoenix" },
  { th: "people", t: "qcm", q: "Quelle actrice a joué Mia dans La La Land ?", o: ["Emma Stone", "Emma Watson", "Jennifer Lawrence", "Natalie Portman"], a: "Emma Stone" },
  { th: "people", t: "qcm", q: "Quel rappeur canadien a sorti God's Plan ?", o: ["Drake", "The Weeknd", "Nav", "Tory Lanez"], a: "Drake" },
  { th: "people", t: "qcm", q: "Quel acteur français a joué dans Intouchables aux côtés d'Omar Sy ?", o: ["François Cluzet", "Jean Dujardin", "Gad Elmaleh", "Dany Boon"], a: "François Cluzet" },
  { th: "people", t: "qcm", q: "Quelle chanteuse a interprété Rolling in the Deep et Easy on Me ?", o: ["Adele", "Amy Winehouse", "Lana Del Rey", "Florence Welch"], a: "Adele" },

  /* Langue, anagrammes, charades et petit bac */
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'animal.", l: "T A H C", h: "Il miaule", a: "CHAT" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'animal.", l: "N I E H C", h: "Il aboie", a: "CHIEN" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le lieu.", l: "S O I A M N", h: "On y habite", a: "MAISON" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le lieu.", l: "D I N J A R", h: "On y plante des fleurs", a: "JARDIN" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'objet.", l: "V I L E R", h: "On le lit", a: "LIVRE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'objet.", l: "B A L E T", h: "On y mange", a: "TABLE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le fruit.", l: "G A N O R E", h: "Elle est orange", a: "ORANGE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le fruit.", l: "N A B A N E", h: "Elle est jaune", a: "BANANE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'astre.", l: "L I E O S L", h: "Il brille le jour", a: "SOLEIL" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'astre.", l: "N U L E", h: "Elle brille la nuit", a: "LUNE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'astre.", l: "T O I L E E", h: "Elle scintille", a: "ETOILE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le cours d'eau.", l: "R I E V I R E", h: "Elle finit dans un fleuve", a: "RIVIERE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le relief.", l: "N O M A G T E N", h: "Elle culmine", a: "MONTAGNE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le véhicule.", l: "T U R O V I E", h: "Elle a quatre roues", a: "VOITURE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le véhicule.", l: "C Y C L I T E B", h: "Elle a deux roues", a: "BICYCLETTE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'objet.", l: "P H O N E T E L E", h: "On l'appelle", a: "TELEPHONE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'objet.", l: "R O D I N A T E U R", h: "Il a un clavier", a: "ORDINATEUR" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'art.", l: "S I Q U E M U", h: "On l'écoute", a: "MUSIQUE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'art.", l: "S E D A N", h: "On la pratique en rythme", a: "DANSE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'art.", l: "T U R E N I P", h: "On la regarde au musée", a: "PEINTURE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'activité.", l: "S I N E C U", h: "On y prépare les repas", a: "CUISINE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le mot.", l: "G A V O Y E", h: "On le fait en vacances", a: "VOYAGE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le mot.", l: "C A N C E S A V", h: "On les attend avec impatience", a: "VACANCES" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le sentiment.", l: "T I M A I E", h: "Entre amis", a: "AMITIE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le mot.", l: "M I L L E F A", h: "On en fait partie", a: "FAMILLE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le lieu.", l: "C O L E E", h: "On y apprend", a: "ECOLE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le métier.", l: "P R O F E S S E U R", h: "Il enseigne", a: "PROFESSEUR" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'objet.", l: "C A H I E R", h: "On écrit dedans", a: "CAHIER" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'objet.", l: "Y O N C R A", h: "On dessine avec", a: "CRAYON" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'objet.", l: "M E G O M", h: "Elle efface", a: "GOMME" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'objet.", l: "S E T R O U S", h: "On y range ses crayons", a: "TROUSSE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le lieu.", l: "S E L C A S", h: "On y fait cours", a: "CLASSE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'objet.", l: "P I P E R A", h: "On écrit dessus", a: "PAPIER" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'objet.", l: "T E N E F E R", h: "Elle laisse passer la lumière", a: "FENETRE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'objet.", l: "R O P E T", h: "On l'ouvre", a: "PORTE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'objet.", l: "S I A H C E", h: "On s'assied dessus", a: "CHAISE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'objet.", l: "M A L P E", h: "Elle éclaire", a: "LAMPE" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'objet.", l: "P I T A S", h: "On marche dessus", a: "TAPIS" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver l'objet.", l: "R I D A E U", h: "Il cache la fenêtre", a: "RIDEAU" },
  { th: "langue", t: "qcm", q: "Quel est le synonyme de « rapide » ?", o: ["Lent", "Vif", "Lourd", "Calme"], a: "Vif" },
  { th: "langue", t: "qcm", q: "Quel est l'antonyme de « chaud » ?", o: ["Brûlant", "Froid", "Tiède", "Doux"], a: "Froid" },
  { th: "langue", t: "qcm", q: "Quel est le pluriel de « genou » ?", o: ["Genous", "Genoux", "Genoues", "Genouxs"], a: "Genoux" },
  { th: "langue", t: "qcm", q: "Quel est le féminin de « chanteur » ?", o: ["Chanteuse", "Chanteure", "Chantrice", "Chanteureuse"], a: "Chanteuse" },
  { th: "langue", t: "qcm", q: "Combien de syllabes compte le mot « bibliothèque » ?", o: ["3", "4", "5", "6"], a: "4" },
  { th: "langue", t: "qcm", q: "Quelle est la nature du mot « et » ?", o: ["Un adverbe", "Une conjonction", "Un pronom", "Un adjectif"], a: "Une conjonction" },
  { th: "langue", t: "qcm", q: "Quel mot est un synonyme de « beau » ?", o: ["Joli", "Laid", "Sale", "Triste"], a: "Joli" },
  { th: "langue", t: "qcm", q: "Quel est l'antonyme de « gagner » ?", o: ["Perdre", "Trouver", "Acheter", "Garder"], a: "Perdre" },
  { th: "langue", t: "qcm", q: "Quel est le pluriel de « travail » ?", o: ["Travailles", "Travaux", "Travaix", "Travails"], a: "Travaux" },
  { th: "langue", t: "qcm", q: "Quel est le féminin de « roi » ?", o: ["Reine", "Roisse", "Royale", "Roinne"], a: "Reine" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est un oiseau noir.\nMon deuxième est une note de musique.\nMon tout est un dessert.", h: "Un gâteau", a: "CORNEILLE" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est le contraire de haut.\nMon deuxième est une boisson chaude.\nMon tout est un vêtement.", h: "On le porte", a: "BAS-THE" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est une lettre de l'alphabet.\nMon deuxième est un article.\nMon tout est un animal.", h: "Il vit dans l'eau", a: "CARPE" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est une couleur.\nMon deuxième est le contraire de tard.\nMon tout est un légume.", h: "Il est orange", a: "CAROTTE" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est un son.\nMon deuxième est une voyelle.\nMon tout est un instrument.", h: "À cordes", a: "GUITARE" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est le contraire de rapide.\nMon deuxième est une note.\nMon tout est un adjectif.", h: "Pas pressé", a: "LENT" },
  { th: "langue", t: "rebus", q: "Charade : devine le mot caché.", puzzle: "Mon premier est une partie du corps.\nMon deuxième est une boisson.\nMon tout est un métier.", h: "Il soigne", a: "MEDECIN" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Un fruit", l: "O", free: true, a: "" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Un animal", l: "E", free: true, a: "" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Une couleur", l: "J", free: true, a: "" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Un pays", l: "I", free: true, a: "" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Un métier", l: "B", free: true, a: "" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Un sport", l: "G", free: true, a: "" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Un objet de la maison", l: "N", free: true, a: "" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Une ville", l: "M", free: true, a: "" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Un aliment", l: "P", free: true, a: "" },
  { th: "langue", t: "bac", q: "Petit bac : trouve un mot qui commence par cette lettre.", cat: "Un animal marin", l: "R", free: true, a: "" },
  { th: "langue", t: "vf", q: "Le mot « autruche » commence par la lettre A.", a: true },
  { th: "langue", t: "vf", q: "Le pluriel de « cheval » est « chevals ».", a: false },
  { th: "langue", t: "vf", q: "Le mot « rapidement » est un adverbe.", a: true },
  { th: "langue", t: "vf", q: "Un synonyme de « maison » est « demeure ».", a: true },
];

/* -------------------------------- Aides ---------------------------------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
const app = () => document.querySelector("#app");
const plOf = (id) => (S && S.pl ? S.pl.find((p) => p.id === id) : null);
const nmOf = (id) => (plOf(id) || { n: "?" }).n;
const msg = (t) => {
  const e = document.querySelector("#hmsg");
  if (e) e.textContent = t || "";
};
const clean = (v) => String(v ?? "").trim().slice(0, 48);
const answerOf = (q) => {
  if (q.t === "vf") return q.a ? "VRAI" : "FAUX";
  if (q.free) return "Réponse libre";
  return q.a;
};
const pubQ = (q) => {
  const o = { t: q.t, q: q.q };
  if (q.h) o.h = q.h;
  if (q.o) o.o = q.o.slice();
  if (q.l) o.l = q.l;
  if (q.sum) o.sum = q.sum;
  if (q.puzzle) o.puzzle = q.puzzle;
  if (q.img) o.img = q.img;
  if (q.cat) o.cat = q.cat;
  if (q.free) o.free = true;
  return o;
};
const isRight = (q, v) => {
  if (q.t === "vf") return (q.a === true && v === "VRAI") || (q.a === false && v === "FAUX");
  if (q.free) return false;
  return [q.a, ...(q.alt || [])].filter(Boolean).some((a) => norm(v) === norm(a));
};
/** Suggestion de correction pour l'hôte (il garde le dernier mot). */
const suggestOk = (q, v) => {
  if (!v) return false;
  if (q.t === "bac") {
    const w = norm(v);
    return w.length >= 2 && w.startsWith(norm(q.l));
  }
  return isRight(q, v);
};
const typeLabel = (t) =>
  ({
    vf: "Vrai ou faux",
    ana: "Anagramme",
    rebus: "Charade",
    who: "Qui est-ce ?",
    film: "Film mystère",
    serie: "Série mystère",
    bac: "Petit bac",
  })[t] || "QCM";
const themeLabel = (id) => (THEMES.find((t) => t.id === id) || { label: id }).label;
const themeEmoji = (id) => (THEMES.find((t) => t.id === id) || { emoji: "🎲" }).emoji;

const RECENT_KEY = "soiree:cg_recent";
const RECENT_MAX = 240;
const qKey = (q) =>
  [
    q.t,
    q.q,
    q.a || q.puzzle || q.sum || q.cat || "",
    // `l` n'est utile que pour distinguer les petits bac ; les anagrammes le
    // voient muter au démarrage, ce qui casserait la mémoire des questions vues.
    q.t === "bac" ? q.l || "" : "",
  ].join("|");
const loadRecent = () => {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(list) ? list.filter((x) => typeof x === "string") : [];
  } catch (_) {
    return [];
  }
};
const saveRecent = (keys) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([...new Set(keys)].slice(0, RECENT_MAX)));
  } catch (_) {}
};

/** Sélectionne les questions selon les thèmes, avec un quota de réponses libres.
    Les questions déjà vues récemment passent en dernier pour éviter les boucles. */
function pickQuestions(themes, n) {
  const active = new Set(themes && themes.length ? themes : THEMES.map((t) => t.id));
  const recent = new Set(loadRecent());
  const themed = BANK.filter((q) => active.has(q.th));
  const fresh = themed.filter((q) => !recent.has(qKey(q)));
  let pool = shuffle(fresh.length >= n ? fresh : themed);
  if (!pool.length) pool = shuffle(BANK.slice());
  // Si le thème choisi est presque épuisé, on complète avec les autres thèmes.
  if (pool.length < n) pool = pool.concat(shuffle(BANK.filter((q) => !pool.includes(q))));
  const sub = shuffle(pool.filter((q) => SUBJECTIVE.has(q.t)));
  const obj = shuffle(pool.filter((q) => !SUBJECTIVE.has(q.t)));
  const wantSub = Math.min(sub.length, Math.max(1, Math.round(n * 0.45)));
  const picked = sub.slice(0, wantSub).concat(obj.slice(0, Math.max(0, n - wantSub)));
  if (picked.length < n) {
    const rest = shuffle(pool.filter((q) => !picked.includes(q)));
    picked.push(...rest.slice(0, n - picked.length));
  }
  const out = shuffle(picked).slice(0, n);
  saveRecent(out.map(qKey).concat(loadRecent()));
  return out;
}

/* -------------------------------- État ----------------------------------- */
let R = null;
let S = null;
let H = { qs: [], answers: {} };
let isHost = false;
let code = "";
const L = {
  name: "",
  my: {},
  hello: null,
  tick: null,
  touch: null,
  endSid: "",
  late: false,
  blockedUntil: 0,
  homeMsg: "",
  sig: "",
  draft: {},
};

function newState() {
  return {
    ph: "lobby",
    host: ME,
    pl: [],
    cfg: { n: 8, t: 20, themes: THEMES.map((t) => t.id) },
    qi: 0,
    total: 0,
    usedThemes: [],
    cur: null,
    answered: [],
    ansN: 0,
    judge: null,
    deadline: 0,
    qStart: 0,
    reveal: null,
    revealUntil: 0,
    ranking: [],
    sid: "",
    reported: false,
    startedAt: 0,
    lastAnswerAt: 0,
    endedAt: 0,
  };
}

function bc() {
  if (!R || !isHost || !S) return;
  R.emit("st", S).catch(() => {});
  R.snap({ S, H: { qs: H.qs, answers: H.answers } });
}

function send(d) {
  d.p = ME;
  if (isHost) hostAct(d);
  else if (R) R.emit("act", d, "host").catch(() => {});
}

/* ----------------------------- Hôte : actions ---------------------------- */
function hostAct(d) {
  if (!isHost || !S || !d) return;
  const t = Net.now();

  if (d.k === "join") {
    const p = S.pl.find((x) => x.id === d.p);
    if (p) {
      p.n = clean(d.n) || p.n;
      bc();
      render();
      return;
    }
    if (S.ph !== "lobby") {
      R.emit("late", { code }, d.p).catch(() => {});
      return;
    }
    if (S.pl.length >= MAX) {
      R.emit("full", { code }, d.p).catch(() => {});
      return;
    }
    S.pl.push({ id: d.p, n: clean(d.n) || "Joueur", sc: 0, ok: 0 });
    bc();
    render();
    return;
  }
  if (d.k === "cfg" && S.ph === "lobby" && d.p === S.host) {
    if (d.key === "n") S.cfg.n = [5, 8, 10, 12].includes(+d.v) ? +d.v : S.cfg.n;
    if (d.key === "t") S.cfg.t = [15, 20, 30].includes(+d.v) ? +d.v : S.cfg.t;
    bc();
    render();
    return;
  }
  if (d.k === "theme" && S.ph === "lobby" && d.p === S.host) {
    const id = String(d.v || "");
    if (!THEMES.some((t) => t.id === id)) return;
    const cur = new Set(S.cfg.themes && S.cfg.themes.length ? S.cfg.themes : THEMES.map((t) => t.id));
    if (cur.has(id)) {
      if (cur.size <= 1) {
        toast("Garde au moins un thème.");
        return;
      }
      cur.delete(id);
    } else cur.add(id);
    S.cfg.themes = THEMES.filter((t) => cur.has(t.id)).map((t) => t.id);
    bc();
    render();
    return;
  }
  if (d.k === "verdict" && S.ph === "judge" && d.p === S.host) {
    const a = H.answers[d.pid];
    if (!a) return;
    a.ok = d.ok === true || d.ok === "1" || d.ok === 1;
    a.pts = a.ok ? 10 + Math.min(a.sec || 0, S.cfg.t) : 0;
    updateJudgeDone();
    bc();
    render();
    return;
  }
  if (d.k === "judge-all" && S.ph === "judge" && d.p === S.host) {
    const ok = d.ok === true || d.ok === "1" || d.ok === 1;
    Object.values(H.answers).forEach((a) => {
      a.ok = ok;
      a.pts = ok ? 10 + Math.min(a.sec || 0, S.cfg.t) : 0;
    });
    updateJudgeDone();
    bc();
    render();
    return;
  }
  if (d.k === "judge-confirm" && S.ph === "judge" && d.p === S.host) {
    applyJudge();
    return;
  }
  if (d.k === "start" && S.ph === "lobby" && d.p === S.host) {
    startGame();
    return;
  }
  if (d.k === "answer" && S.ph === "play") {
    hostAnswer(d.p, d.v);
    return;
  }
  if (d.k === "next" && S.ph === "reveal" && d.p === S.host) {
    nextQuestion();
    return;
  }
  if (d.k === "replay" && S.ph === "end" && d.p === S.host) {
    resetToLobby();
    return;
  }
  if (d.k === "end" && d.p === S.host && S.ph !== "lobby") {
    endGame("Partie interrompue par l’hôte.");
    return;
  }
  if (d.k === "hello" && d.p === S.host) {
    bc();
  }
}

function startGame() {
  if (!S || S.pl.length < MIN) return;
  const selected = pickQuestions(S.cfg.themes, S.cfg.n);
  H = {
    qs: selected.map((q) => {
      const c = { ...q };
      if (c.o) c.o = shuffle(c.o);
      // Les banques peuvent contenir les lettres déjà ordonnées : on mélange
      // toujours à partir de la réponse, jamais à partir du champ `l` fourni.
      if (c.t === "ana" && typeof CG_LETTERS !== "undefined") {
        c.l = CG_LETTERS.scrambleWord(c.a || c.l);
      }
      return c;
    }),
    answers: {},
  };
  if (selected.length < S.cfg.n) toast("Pas assez de questions dans ces thèmes : on complète avec les autres.");
  S.usedThemes = [...new Set(selected.map((q) => q.th))];
  S.startedAt = Net.now();
  S.sid = "cg:" + code + ":" + S.startedAt;
  S.reported = false;
  S.total = H.qs.length;
  S.qi = 0;
  S.ranking = [];
  S.endedAt = 0;
  S.pl.forEach((p) => {
    p.sc = 0;
    p.ok = 0;
  });
  beginQuestion();
}

function beginQuestion() {
  if (!S || !H.qs.length) return;
  if (S.qi >= H.qs.length) {
    endGame();
    return;
  }
  const q = H.qs[S.qi];
  H.answers = {};
  S.cur = pubQ(q);
  S.ph = "play";
  S.answered = [];
  S.ansN = 0;
  S.judge = null;
  S.reveal = null;
  S.qStart = Net.now();
  S.deadline = S.qStart + S.cfg.t * 1000;
  S.lastAnswerAt = 0;
  bc();
  if (isHost) render();
}

function hostAnswer(pid, v) {
  if (!S || S.ph !== "play" || !pid) return;
  if (!S.pl.some((p) => p.id === pid)) return;
  if (S.answered.includes(pid)) return;
  if (S.deadline && Net.now() > S.deadline + 900) return;
  const q = H.qs[S.qi];
  if (!q) return;
  const left = Math.max(0, Math.ceil((S.deadline - Net.now()) / 1000));
  const value = clean(v);
  const subjective = SUBJECTIVE.has(q.t);
  const ok = subjective ? undefined : isRight(q, value);
  const ans = { v: value, sec: left };
  if (subjective) ans.sug = suggestOk(q, value);
  else {
    ans.ok = ok;
    ans.pts = ok ? 10 + Math.min(left, S.cfg.t) : 0;
  }
  H.answers[pid] = ans;
  S.answered = [...S.answered, pid];
  S.ansN = S.answered.length;
  S.lastAnswerAt = Net.now();
  bc();
  // Pas de reconstruction complète à chaque réponse : cela faisait clignoter
  // l'écran de l'hôte et pouvait vider le champ en cours de saisie.
  if (isHost) updateStatus();
}

/** Passe en phase de validation par l'hôte (questions subjectives). */
function judgeNow() {
  if (!S || S.ph !== "play") return;
  const q = H.qs[S.qi];
  if (!q) return;
  Object.keys(H.answers).forEach((pid) => {
    const a = H.answers[pid];
    a.ok = suggestOk(q, a.v);
    a.pts = a.ok ? 10 + Math.min(a.sec || 0, S.cfg.t) : 0;
  });
  S.ph = "judge";
  S.judge = { done: Object.keys(H.answers).length, total: Object.keys(H.answers).length };
  S.answered = [];
  S.ansN = 0;
  bc();
  if (isHost) render();
}

function updateJudgeDone() {
  if (!S || S.ph !== "judge") return;
  S.judge = {
    done: Object.values(H.answers).filter((a) => a.ok === true || a.ok === false).length,
    total: Object.keys(H.answers).length,
  };
}

/** Applique les décisions de l'hôte puis dévoile la réponse. */
function applyJudge() {
  if (!S || S.ph !== "judge") return;
  const q = H.qs[S.qi];
  if (!q) return;
  Object.keys(H.answers).forEach((pid) => {
    const a = H.answers[pid];
    if (a.ok !== true) a.ok = false;
    a.pts = a.ok ? 10 + Math.min(a.sec || 0, S.cfg.t) : 0;
  });
  finishReveal(q, true);
}

function finishReveal(q, judged) {
  const rows = S.pl.map((p) => {
    const a = H.answers[p.id];
    return {
      id: p.id,
      n: p.n,
      v: a ? a.v : null,
      ok: !!(a && a.ok),
      pts: a ? a.pts : 0,
      sec: a ? a.sec : 0,
      timeout: !a,
    };
  });
  S.pl.forEach((p) => {
    const a = H.answers[p.id];
    if (!a) return;
    p.sc += a.pts;
    if (a.ok) p.ok += 1;
  });
  S.reveal = { answer: answerOf(q), rows, judged: !!judged, free: !!q.free };
  S.ph = "reveal";
  S.judge = null;
  S.revealUntil = Net.now() + (judged ? JUDGE_REVEAL_MS : REVEAL_MS);
  S.answered = [];
  S.ansN = 0;
  bc();
  if (isHost) render();
}

function revealNow() {
  if (!S || S.ph !== "play") return;
  const q = H.qs[S.qi];
  if (!q) return;
  finishReveal(q, false);
}

function nextQuestion() {
  if (!S || S.ph !== "reveal") return;
  S.qi += 1;
  if (S.qi >= H.qs.length) endGame();
  else beginQuestion();
}

function endGame(reason) {
  if (!S) return;
  S.ph = "end";
  S.reveal = null;
  S.endedAt = Net.now();
  S.ranking = [...S.pl].sort((a, b) => b.sc - a.sc || b.ok - a.ok || a.n.localeCompare(b.n, "fr"));
  if (!S.reported && R && isHost) {
    S.reported = true;
    Party.report(R, GAME, S.sid, S.ranking.map((p) => ({ id: p.id, n: p.n, s: p.sc }))).catch(() => {});
  }
  if (reason) toast(reason);
  bc();
  if (isHost) render();
}

function resetToLobby() {
  if (!S) return;
  S.ph = "lobby";
  S.cur = null;
  S.reveal = null;
  S.qi = 0;
  S.total = 0;
  S.sid = "";
  S.reported = false;
  S.ranking = [];
  S.endedAt = 0;
  S.answered = [];
  S.ansN = 0;
  S.judge = null;
  S.usedThemes = [];
  H = { qs: [], answers: {} };
  S.pl.forEach((p) => {
    p.sc = 0;
    p.ok = 0;
  });
  L.my = {};
  bc();
  if (isHost) render();
}

function hostTick() {
  if (!isHost || !S) return;
  const t = Net.now();
  if (S.ph === "play") {
    const all = S.pl.length > 0 && S.answered.length >= S.pl.length;
    if (t >= S.deadline || (all && S.lastAnswerAt && t - S.lastAnswerAt > ANSWER_WAIT_MS)) {
      const q = H.qs[S.qi];
      if (q && SUBJECTIVE.has(q.t)) judgeNow();
      else revealNow();
    } else if (t - (L.lastBc || 0) > 2200) {
      L.lastBc = t;
      bc();
    }
  } else if (S.ph === "reveal" && t >= S.revealUntil) {
    nextQuestion();
  } else if ((S.ph === "lobby" || S.ph === "end" || S.ph === "judge") && t - (L.lastBc || 0) > 3000) {
    L.lastBc = t;
    bc();
  }
}

/* ------------------------------ Connexion -------------------------------- */
async function startOnline(create, joinCode, o) {
  o = o || {};
  let name = o.name;
  if (!name) {
    const raw = (document.querySelector("#pname")?.value || "").trim().slice(0, 16);
    if (raw.length < 2) return msg("Choisis un pseudo (2 lettres minimum).");
    Profile.set({ name: raw });
    name = Profile.tag(raw);
  }
  L.name = name;
  L.homeMsg = "Connexion au salon…";
  code = create ? o.code || mkCode() : String(joinCode || "").toUpperCase();
  if (!create && !/^[A-Z0-9]{4}$/.test(code)) return msg("Le code du salon fait 4 caractères.");

  try {
    R = await Net.join(ROOM(code), { create, resume: !!o.resume, wasHost: !!o.wasHost });
  } catch (e) {
    if ((o.retry || 0) > 0 && (e.code === "noroom" || !e.status)) {
      msg("⏳ En attente de l’hôte…");
      await sleep(1500);
      return startOnline(create, joinCode, { ...o, retry: o.retry - 1 });
    }
    if (o.resume && !e.status && (o.net = (o.net || 0) + 1) < 6) {
      msg("🔄 Reconnexion…");
      await sleep(1800);
      return startOnline(create, joinCode, o);
    }
    if (o.resume) Sess.clear(GAME);
    return msg(
      o.resume
        ? "La partie n’existe plus. Tu peux en créer une nouvelle."
        : e.message || "Connexion impossible.",
    );
  }

  isHost = R.host;
  if (create && !isHost) {
    R.leave();
    R = null;
    if (o.code) {
      if ((o.retry || 0) > 0) {
        await sleep(1400);
        return startOnline(true, null, { ...o, retry: o.retry - 1 });
      }
      return msg("Ce code est déjà utilisé, réessaie.");
    }
    if ((o.tries = (o.tries || 0) + 1) > 8) return msg("Impossible de créer un salon.");
    return startOnline(true, null, o);
  }

  Sess.save(GAME, { code, name, host: isHost });
  if (!L.touch) L.touch = setInterval(() => Sess.touch(GAME), 20000);
  Party.listen(R, code, () => Sess.clear(GAME));

  R.on("st", (d) => {
    if (isHost || !d) return;
    S = d;
    L.late = false;
    if (S.ph === "lobby") L.my = {};
    if (stateSig() !== L.sig) render();
    else updateTimer();
  });
  R.on("late", () => {
    L.late = true;
    L.blockedUntil = Date.now() + 8000;
    render();
  });
  R.on("full", () => {
    msg("Le salon est complet (8 joueurs maximum).");
    toast("Salon complet");
  });
  R.on("act", (d) => {
    if (isHost) hostAct(d);
  });
  R.onPromote((snap) => {
    isHost = true;
    if (snap && snap.S) {
      S = snap.S;
      H = snap.H || { qs: [], answers: {} };
      S.host = ME;
      if (S.ph !== "lobby" && !H.qs.length) {
        S.ph = "lobby";
        S.cur = null;
        S.reveal = null;
      }
    } else {
      S = newState();
      H = { qs: [], answers: {} };
    }
    toast("👑 Tu es maintenant l’hôte");
    hostAct({ k: "join", p: ME, n: L.name });
    bc();
    render();
  });
  R.onDemote(() => {
    isHost = false;
    toast("Un autre joueur est devenu l’hôte");
    render();
  });

  if (isHost) {
    const snap = R.initSnap;
    if (snap && snap.S) {
      S = snap.S;
      H = snap.H || { qs: [], answers: {} };
      S.host = ME;
    } else {
      S = newState();
      H = { qs: [], answers: {} };
    }
    if (S.ph !== "lobby" && !H.qs.length) {
      S.ph = "lobby";
      S.cur = null;
      S.reveal = null;
    }
    hostAct({ k: "join", p: ME, n: L.name });
    bc();
  } else {
    hello();
  }
  startLoops();
  render();
}

function hello() {
  if (!R || isHost) return;
  if (L.late && Date.now() < L.blockedUntil) return;
  if (!S || !S.pl.some((p) => p.id === ME)) {
    R.emit("act", { k: "join", p: ME, n: L.name }, "host").catch(() => {});
  }
}

function startLoops() {
  if (!L.hello) L.hello = setInterval(hello, 2500);
  if (!L.tick) {
    L.tick = setInterval(() => {
      hostTick();
      updateTimer();
    }, 220);
  }
}

function updateTimer() {
  if (!S) return;
  updateStatus();
  if (S.ph === "play") {
    const rem = Math.max(0, S.deadline - Net.now());
    const clock = document.querySelector("#cg-clock");
    const bar = document.querySelector("#cg-timer");
    if (clock) {
      clock.textContent = Math.ceil(rem / 1000) + " s";
      clock.classList.toggle("urgent", rem <= 5000);
    }
    if (bar) bar.style.width = Math.max(0, (rem / (S.cfg.t * 1000)) * 100) + "%";
  } else if (S.ph === "reveal") {
    const el = document.querySelector("#cg-reveal-count");
    if (el) el.textContent = Math.max(0, Math.ceil((S.revealUntil - Net.now()) / 1000));
  }
}

/** Signature compacte : évite de reconstruire l'écran à chaque battement. */
function stateSig() {
  if (!S) return "";
  const mine = L.my[S.qi] !== undefined;
  const answered = (S.answered || []).includes(ME) || mine;
  return [
    S.ph,
    S.qi,
    S.total,
    S.cur?.q || "",
    S.cur?.t || "",
    S.cur?.img || "",
    S.cur?.l || "",
    (S.cur?.o || []).join("/"),
    (S.cfg?.themes || []).join(","),
    S.judge ? S.judge.done + "/" + S.judge.total : "",
    answered ? 1 : 0,
    S.reveal?.answer || "",
    S.reveal ? (S.reveal.rows || []).map((r) => r.id + ":" + r.v + ":" + r.pts).join(",") : "",
    (S.pl || []).map((p) => p.id + ":" + p.n + ":" + p.sc + ":" + p.ok).join(","),
    (S.ranking || []).map((p) => p.id + ":" + p.sc).join(","),
    S.host || "",
  ].join("|");
}

/** Le compteur de réponses se met à jour sans reconstruire le formulaire. */
function updateStatus() {
  const el = document.querySelector('[data-live="status"]');
  if (!el || !S || S.ph !== "play") return;
  const answered = (S.answered || []).includes(ME) || L.my[S.qi] !== undefined;
  el.classList.toggle("ok", answered);
  el.textContent = answered
    ? `✅ Réponse envoyée${
        S.ansN >= S.pl.length ? " · tout le monde a répondu !" : ` · en attente des autres (${S.ansN}/${S.pl.length})`
      }`
    : `⚡ À toi de jouer · ${S.ansN}/${S.pl.length} réponse${S.ansN > 1 ? "s" : ""}`;
}

/* -------------------------------- Rendu ---------------------------------- */
function setWho() {
  const el = document.querySelector("#who");
  if (!el) return;
  el.textContent = code ? `Salon ${code}${isHost ? " · hôte" : ""}` : "";
}

function render() {
  setWho();
  if (S) L.sig = stateSig();
  const root = app();
  if (!root) return;
  if (L.late && S && S.ph !== "lobby") return renderLate(root);
  if (!S) return renderWait(root);
  if (S.ph === "lobby") renderLobby(root);
  else if (S.ph === "play") renderPlay(root);
  else if (S.ph === "judge") isHost ? renderJudge(root) : renderJudgeWait(root);
  else if (S.ph === "reveal") renderReveal(root);
  else renderEnd(root);
}

function renderHome(root, message) {
  const c = bootParams().code;
  root.innerHTML = `
  <section class="cg-hero">
    <div class="cg-glow" aria-hidden="true"></div>
    <p class="cg-kicker">Le quiz show de la soirée</p>
    <h1>Culture <em>Game</em></h1>
    <p class="cg-lead">QCM, vrai ou faux, anagrammes, charades, petit bac, people et films mystères.
      20 secondes, des points de vitesse, et un classement final sans pitié.</p>
    <div class="cg-marquee" aria-hidden="true"><span>🧠 Culture</span><span>⚡ Vitesse</span><span>🕵️ Devinettes</span><span>🏆 Gloire</span></div>
  </section>
  <section class="card cg-panel">
    <h2>Entre dans l’arène</h2>
    <label class="cg-field">Ton pseudo
      <input id="pname" type="text" maxlength="16" autocomplete="nickname" placeholder="Ex. Captain Quiz">
    </label>
    <button class="btn primary big" data-a="create" type="button">🚀 Créer un salon</button>
    <div class="cg-or"><span>ou</span></div>
    <div class="cg-join">
      <input id="pcode" type="text" maxlength="4" inputmode="latin" placeholder="CODE" aria-label="Code du salon" value="${esc(c || "")}">
      <button class="btn" data-a="join" type="button">Rejoindre</button>
    </div>
    <p id="hmsg" class="hint" role="status">${esc(message || L.homeMsg || "")}</p>
  </section>
  <section class="cg-features">
    <div><b>⏱️ 20 s</b><span>Réponds vite : chaque seconde restante rapporte un point.</span></div>
    <div><b>🎲 8 formats</b><span>QCM, vrai ou faux, anagrammes, rébus, petit bac, people, films et séries.</span></div>
    <div><b>👑 L’hôte tranche</b><span>Les réponses libres sont validées à la main par l’hôte.</span></div>
    <div><b>🎯 Thèmes au choix</b><span>L’hôte compose la partie : géo, histoire, sciences, écran, sport…</span></div>
  </section>`;
  Profile.attach("#pname");
}

function renderWait(root) {
  root.innerHTML = `<section class="card center cg-wait">
    <div class="cg-loader" aria-hidden="true"></div>
    <h2>Connexion au salon ${esc(code || "")}</h2>
    <p class="hint">${esc(L.homeMsg || "On prépare les buzzers…")}</p>
  </section>`;
}

function renderLate(root) {
  root.innerHTML = `<section class="card center cg-late">
    <div class="big-emoji">⏳</div>
    <h2>La partie a déjà commencé</h2>
    <p class="hint">Tu peux rester sur cette page : dès que l’hôte relance une manche,
      ta place dans le salon ${esc(code)} sera reprise automatiquement.</p>
    <button class="btn" data-a="rejoin" type="button">Réessayer maintenant</button>
  </section>`;
}

function playerChips() {
  return (S.pl || [])
    .map(
      (p) =>
        `<span class="chip ${p.id === S.host ? "host" : ""} ${p.id === ME ? "me" : ""}">${esc(p.n)}${
          S.ph === "lobby" ? "" : ` <b class="cg-chip-score">${p.sc}</b>`
        }</span>`,
    )
    .join("");
}

function renderLobby(root) {
  const n = S.pl.length;
  const host = isHost;
  const cfgBtn = (key, v, label, cur) =>
    `<button class="pill ${cur === v ? "on" : ""}" data-a="cfg" data-key="${key}" data-v="${v}" type="button" ${
      host ? "" : "disabled"
    }>${label}</button>`;
  root.innerHTML = `
  <section class="card cg-code-card">
    <p class="cg-kicker">Salon de la soirée</p>
    <div class="cg-code">${esc(code)}</div>
    <p class="hint">Partage ce code : chacun le saisit sur <b>/culturegame</b>.</p>
    <div id="cg-share"></div>
  </section>
  <section class="card">
    <h2>Joueurs <span class="hint inline">${n}/${MAX}</span></h2>
    <div class="chips cg-players">${playerChips() || '<span class="hint">Personne pour l’instant.</span>'}</div>
    <p class="hint">${n < MIN ? "Il faut au moins " + MIN + " joueurs pour lancer." : "Tout le monde est prêt ?"}</p>
    <div class="cg-settings">
      <div class="cg-setting">
        <span>Questions</span>
        <div class="pills">${[5, 8, 10, 12].map((v) => cfgBtn("n", v, v, S.cfg.n)).join("")}</div>
      </div>
      <div class="cg-setting">
        <span>Temps par question</span>
        <div class="pills">${[15, 20, 30].map((v) => cfgBtn("t", v, v + " s", S.cfg.t)).join("")}</div>
      </div>
    </div>
    <div class="cg-setting cg-themes">
      <span>Thèmes <small class="hint inline">${(S.cfg.themes || THEMES.map((t) => t.id)).length}/${THEMES.length}</small></span>
      <div class="cg-theme-chips">
        ${THEMES.map((t) => {
          const on = (S.cfg.themes || THEMES.map((x) => x.id)).includes(t.id);
          return `<button class="cg-theme ${on ? "on" : ""}" data-a="theme" data-v="${t.id}" type="button" ${
            host ? "" : "disabled"
          } aria-pressed="${on}"><span>${t.emoji}</span>${esc(t.label)}</button>`;
        }).join("")}
      </div>
      <p class="hint">${host ? "Choisis un ou plusieurs thèmes. On complète automatiquement si la sélection est trop petite." : "L’hôte choisit les thèmes de la partie."}</p>
    </div>
    ${
      host
        ? `<button class="btn primary big" data-a="start" type="button" ${n < MIN ? "disabled" : ""}>▶ Lancer le quiz</button>`
        : `<p class="cg-wait-host">👑 L’hôte choisit les réglages et lance la partie.</p>`
    }
  </section>
  <section class="card cg-rules">
    <h2>Comment ça marche ?</h2>
    <ul>
      <li><b>Réponds vite :</b> bonne réponse = 10 points + le nombre de secondes restantes.</li>
      <li><b>Réponses libres :</b> rébus, petit bac, people et films/séries sont validés par l’hôte.</li>
      <li><b>Pas de panique :</b> une mauvaise réponse ne retire rien, mais ne rapporte rien.</li>
      <li><b>Anagrammes :</b> les accents, les espaces, les tirets et les majuscules sont ignorés.</li>
    </ul>
  </section>`;
  Share.mount("#cg-share", {
    code,
    url: location.origin + "/culturegame/index.html?c=" + code,
    title: "Culture Game",
    text: "Rejoins mon quiz ! Code : " + code,
  });
}

function renderPlay(root) {
  const q = S.cur || { t: "qcm", q: "…" };
  const answered = (S.answered || []).includes(ME);
  const mine = L.my[S.qi] ?? L.draft[S.qi];
  const locked = answered || L.my[S.qi] !== undefined;
  const total = S.total || 1;
  const dots = Array.from({ length: Math.min(total, 12) }, (_, i) => {
    const cls = i < S.qi ? "done" : i === S.qi ? "now" : "";
    return `<i class="${cls}"></i>`;
  }).join("");

  let body = "";
  const textForm = (form, id, ph, max) => `<form class="cg-ana cg-free" data-form="${form}">
        <input id="${id}" type="text" maxlength="${max}" autocomplete="off"
          placeholder="${ph}" ${locked ? "disabled" : ""} value="${esc(mine || "")}">
        <button class="btn primary" type="submit" ${locked ? "disabled" : ""}>Valider</button>
      </form>`;

  if (q.t === "qcm") {
    body = `<div class="cg-options">${(q.o || [])
      .map(
        (opt, i) =>
          `<button class="cg-option ${locked && mine === opt ? "chosen" : ""}" data-a="opt" data-v="${esc(opt)}" type="button" ${
            locked ? "disabled" : ""
          }><span class="cg-key">${String.fromCharCode(65 + i)}</span><span>${esc(opt)}</span></button>`,
      )
      .join("")}</div>`;
  } else if (q.t === "vf") {
    body = `<div class="cg-vf">
      <button class="cg-option vf-true ${locked && mine === "VRAI" ? "chosen" : ""}" data-a="opt" data-v="VRAI" type="button" ${
        locked ? "disabled" : ""
      }>✅ VRAI</button>
      <button class="cg-option vf-false ${locked && mine === "FAUX" ? "chosen" : ""}" data-a="opt" data-v="FAUX" type="button" ${
        locked ? "disabled" : ""
      }>❌ FAUX</button>
    </div>`;
  } else if (q.t === "ana") {
    const letters = String(q.l || "")
      .split(/\s+/)
      .filter(Boolean)
      .map((l) => `<span class="cg-letter">${esc(l)}</span>`)
      .join("");
    body = `<div class="cg-letters" aria-label="Lettres mélangées">${letters}</div>
      ${textForm("ana", "cg-ana", "Ta réponse…", 24)}`;
  } else if (q.t === "who") {
    body = `<div class="cg-photo ${locked ? "locked" : ""}">
        <img src="${esc(q.img)}" alt="Portrait flouté à identifier" draggable="false">
        <span class="cg-photo-tag">Portrait mystère</span>
      </div>
      <p class="cg-photo-help">Le portrait est flouté. Écris le nom de la personnalité.</p>
      ${textForm("free", "cg-free", "Son nom…", 40)}`;
  } else if (q.t === "rebus") {
    body = `<div class="cg-rebus" aria-label="Rébus">${esc(q.puzzle)}</div>
      ${textForm("free", "cg-free", "Le mot caché…", 30)}`;
  } else if (q.t === "film" || q.t === "serie") {
    body = `<blockquote class="cg-summary">${esc(q.sum)}</blockquote>
      ${textForm("free", "cg-free", q.t === "film" ? "Le titre du film…" : "Le titre de la série…", 60)}`;
  } else if (q.t === "bac") {
    body = `<div class="cg-bac">
        <span class="cg-bac-letter">${esc(q.l)}</span>
        <div class="cg-bac-cat"><b>${esc(q.cat)}</b><small>Un seul mot, qui commence par cette lettre.</small></div>
      </div>
      ${textForm("free", "cg-free", "Ton mot…", 30)}`;
  } else {
    body = textForm("free", "cg-free", "Ta réponse…", 48);
  }

  root.innerHTML = `
  <section class="cg-play">
    <div class="cg-hud">
      <span class="cg-badge">Question ${S.qi + 1}/${total}</span>
      <span class="cg-type">${typeLabel(q.t)}</span>
      <span class="cg-clock" id="cg-clock">${Math.max(0, Math.ceil((S.deadline - Net.now()) / 1000))} s</span>
    </div>
    <div class="cg-timer"><i id="cg-timer"></i></div>
    <div class="cg-dots">${dots}</div>
    <div class="cg-question">
      <h2>${esc(q.q)}</h2>
      ${q.h ? `<p class="cg-hint">💡 ${esc(q.h)}</p>` : ""}
      ${body}
    </div>
    <div class="cg-status ${locked ? "ok" : ""}" data-live="status" role="status">
      ${
        locked
          ? `✅ Réponse envoyée${S.ansN >= S.pl.length ? " · tout le monde a répondu !" : ` · en attente des autres (${S.ansN}/${S.pl.length})`}`
          : `⚡ À toi de jouer · ${S.ansN}/${S.pl.length} réponse${S.ansN > 1 ? "s" : ""}`
      }
    </div>
  </section>`;
  if (["ana", "who", "rebus", "film", "serie", "bac"].includes(q.t) && !locked)
    setTimeout(() => document.querySelector("#cg-ana, #cg-free")?.focus(), 30);
}

function renderJudge(root) {
  const q = S.cur || {};
  const qq = H.qs[S.qi] || {};
  const total = Object.keys(H.answers).length;
  const rows = S.pl
    .map((p) => {
      const a = H.answers[p.id];
      const ok = !!(a && a.ok === true);
      const no = !!(a && a.ok === false);
      return `<div class="cg-judge-row ${a ? (ok ? "ok" : no ? "ko" : "") : "miss"}">
        <div class="cg-jr-who"><b>${esc(p.n)}</b>${p.id === S.host ? " 👑" : ""}${p.id === ME ? " · toi" : ""}</div>
        <div class="cg-jr-answer">${a ? esc(a.v) : "⏱️ Pas de réponse"}</div>
        ${
          a
            ? `<div class="cg-jr-actions">
          <button class="cg-verdict ok ${ok ? "on" : ""}" data-a="verdict" data-pid="${p.id}" data-ok="1" type="button" aria-label="Accepter la réponse de ${esc(p.n)}" title="Accepter">✓</button>
          <button class="cg-verdict ko ${no ? "on" : ""}" data-a="verdict" data-pid="${p.id}" data-ok="0" type="button" aria-label="Refuser la réponse de ${esc(p.n)}" title="Refuser">✗</button>
        </div>`
            : ""
        }
      </div>`;
    })
    .join("");

  const expected = answerOf(qq);
  const free = !!qq.free;
  const hint = qq.t === "bac" ? `Le mot doit commencer par « ${esc(qq.l)} » et être ${esc(qq.cat || "dans la catégorie")}.` : "";

  root.innerHTML = `
  <section class="cg-judge">
    <p class="cg-kicker">Validation de l’hôte</p>
    <h1>À toi de trancher</h1>
    <p class="cg-judge-lead">Vérifie les réponses libres. Les invités ne voient rien pour l’instant.</p>
    <div class="cg-judge-answer ${free ? "free" : ""}">
      <div>
        <span>${free ? "Règle du jeu" : "Réponse attendue"}</span>
        <b>${free ? esc(hint || "Réponse libre") : esc(expected)}</b>
      </div>
      ${qq.img ? `<img src="${esc(qq.img)}" alt="${esc(expected)}">` : ""}
    </div>
    ${q.q && qq.t !== "who" ? `<p class="cg-judge-question">${esc(q.q)}</p>` : ""}
    ${q.puzzle ? `<div class="cg-rebus small">${esc(q.puzzle)}</div>` : ""}
    ${q.sum ? `<blockquote class="cg-summary small">${esc(q.sum)}</blockquote>` : ""}
    <div class="cg-judge-tools">
      <button class="btn" data-a="judge-all" data-ok="1" type="button" ${total ? "" : "disabled"}>Tout accepter</button>
      <button class="btn" data-a="judge-all" data-ok="0" type="button" ${total ? "" : "disabled"}>Tout refuser</button>
      <span class="hint">${total} réponse${total > 1 ? "s" : ""} à valider</span>
    </div>
    <div class="cg-judge-list">${rows}</div>
    <button class="btn primary big" data-a="judge-confirm" type="button">Valider et dévoiler →</button>
    <p class="hint center">Chaque bonne réponse rapporte 10 points + les secondes restantes.</p>
  </section>`;
}

function renderJudgeWait(root) {
  const total = S.judge?.total || 0;
  root.innerHTML = `
  <section class="card center cg-judge-wait">
    <div class="cg-loader" aria-hidden="true"></div>
    <h2>L’hôte vérifie les réponses…</h2>
    <p class="hint">${total} réponse${total > 1 ? "s" : ""} libre${total > 1 ? "s" : ""} à valider.</p>
    <p class="hint">Les réponses restent secrètes jusqu’au dévoilement.</p>
  </section>`;
}

function renderReveal(root) {
  const q = S.cur || {};
  const rv = S.reveal || { rows: [] };
  const rows = (rv.rows || [])
    .map((r) => {
      const cls = r.ok ? "ok" : r.timeout ? "miss" : "ko";
      const ans = r.timeout ? "⏱️ Pas de réponse" : esc(r.v || "—");
      return `<div class="cg-answer-row ${cls}">
        <span class="cg-ar-name">${esc(r.n)}${r.id === ME ? " (toi)" : ""}</span>
        <span class="cg-ar-val">${ans}</span>
        <span class="cg-ar-pts">${r.pts ? "+" + r.pts : "0"}</span>
      </div>`;
    })
    .join("");
  const fastest = (rv.rows || []).filter((r) => r.ok).sort((a, b) => b.pts - a.pts)[0];
  const free = !!rv.free;
  const count = Math.round((S.revealUntil - Net.now()) / 1000);
  const countdown = Math.max(0, count > 0 ? count : rv.judged ? 9 : 6);
  root.innerHTML = `
  <section class="cg-reveal">
    <p class="cg-kicker">${free ? "Réponses validées" : "La bonne réponse"}</p>
    ${q.img ? `<div class="cg-photo reveal"><img src="${esc(q.img)}" alt="${esc(rv.answer || "")}"></div>` : ""}
    ${q.puzzle ? `<div class="cg-rebus small">${esc(q.puzzle)}</div>` : ""}
    <div class="cg-good-answer ${free ? "free" : ""}">${esc(rv.answer || "—")}</div>
    ${q.q && q.t !== "who" ? `<p class="cg-reveal-question">${esc(q.q)}</p>` : ""}
    ${q.sum ? `<blockquote class="cg-summary small">${esc(q.sum)}</blockquote>` : ""}
    ${
      free
        ? `<p class="cg-fastest">🧑‍⚖️ C’est l’hôte qui a validé les réponses : <b>${(rv.rows || []).filter((r) => r.ok).length}</b> acceptée${(rv.rows || []).filter((r) => r.ok).length > 1 ? "s" : ""}.</p>`
        : fastest
          ? `<p class="cg-fastest">⚡ Réponse la plus rapide : <b>${esc(fastest.n)}</b> (+${fastest.pts})</p>`
          : `<p class="cg-fastest">Personne n’a trouvé… la prochaine sera la bonne !</p>`
    }
    <div class="cg-answer-list">${rows}</div>
    ${
      isHost
        ? `<button class="btn primary big" data-a="next" type="button">Question suivante →</button>
           <p class="hint center">Enchaînement auto dans <b id="cg-reveal-count">${countdown}</b> s</p>`
        : `<p class="cg-wait-host">⏭️ L’hôte enchaîne dans <b id="cg-reveal-count">${countdown}</b> s…</p>`
    }
  </section>`;
}

function renderEnd(root) {
  const rank = S.ranking && S.ranking.length ? S.ranking : S.pl;
  const podium = [rank[1], rank[0], rank[2]].filter(Boolean);
  const order = [1, 0, 2];
  root.innerHTML = `
  <section class="cg-end">
    <p class="cg-kicker">Quiz terminé</p>
    <h1>Classement final</h1>
    <div class="cg-podium">
      ${podium
        .map((p, i) => {
          const place = order[i];
          const medal = place === 0 ? "🥇" : place === 1 ? "🥈" : "🥉";
          return `<div class="cg-podium-step p${place + 1}">
            <span class="cg-medal">${medal}</span>
            <b>${esc(p.n)}</b>
            <span class="cg-podium-score">${p.sc} pts</span>
            <small>${p.ok} bonne${p.ok > 1 ? "s" : ""} réponse${p.ok > 1 ? "s" : ""}</small>
          </div>`;
        })
        .join("")}
    </div>
    <div class="card cg-ranking">
      <h2>Détail des scores</h2>
      ${rank
        .map(
          (p, i) =>
            `<div class="cg-rank-row ${p.id === ME ? "me" : ""}">
              <span class="cg-rank-num">${i + 1}</span>
              <span class="cg-rank-name">${esc(p.n)}${p.id === S.host ? " 👑" : ""}</span>
              <span class="cg-rank-ok">${p.ok} ✓</span>
              <b class="cg-rank-pts">${p.sc}</b>
            </div>`,
        )
        .join("")}
    </div>
    ${isHost ? `<button class="btn primary big" data-a="replay" type="button">🔁 Rejouer avec le même salon</button>` : `<p class="cg-wait-host">L’hôte peut relancer une partie.</p>`}
  </section>
  <div id="cg-endcard"></div>`;
  const el = document.querySelector("#cg-endcard");
  if (el) Party.endCard(el, { code, R, isHost, onLeave: () => Sess.clear(GAME) });
}

/* ------------------------------ Interactions ----------------------------- */
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-a]");
  if (!b || !document.querySelector("#app")?.contains(b)) return;
  const a = b.dataset.a;
  if (a === "create") {
    startOnline(true, null);
  } else if (a === "join") {
    const c = (document.querySelector("#pcode")?.value || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(c)) return msg("Le code du salon fait 4 caractères.");
    startOnline(false, c, { retry: 3 });
  } else if (a === "start") {
    send({ k: "start" });
  } else if (a === "cfg") {
    send({ k: "cfg", key: b.dataset.key, v: b.dataset.v });
  } else if (a === "theme") {
    send({ k: "theme", v: b.dataset.v });
  } else if (a === "verdict") {
    send({ k: "verdict", pid: b.dataset.pid, ok: b.dataset.ok });
  } else if (a === "judge-all") {
    send({ k: "judge-all", ok: b.dataset.ok });
  } else if (a === "judge-confirm") {
    send({ k: "judge-confirm" });
  } else if (a === "opt") {
    if (L.my[S?.qi] !== undefined) return;
    L.my[S.qi] = b.dataset.v;
    send({ k: "answer", v: b.dataset.v });
    render();
  } else if (a === "next") {
    send({ k: "next" });
  } else if (a === "replay") {
    send({ k: "replay" });
  } else if (a === "rejoin") {
    L.blockedUntil = 0;
    L.late = false;
    hello();
    render();
  }
});

document.addEventListener("submit", (e) => {
  const f = e.target.closest("[data-form='ana'], [data-form='free']");
  if (!f) return;
  e.preventDefault();
  if (!S || S.ph !== "play" || S.answered.includes(ME) || L.my[S.qi] !== undefined) return;
  const v = (document.querySelector(f.dataset.form === "ana" ? "#cg-ana" : "#cg-free")?.value || "").trim();
  if (!v) return;
  L.my[S.qi] = v;
  delete L.draft[S.qi];
  send({ k: "answer", v });
  render();
});

document.addEventListener("input", (e) => {
  if ((e.target?.id === "cg-ana" || e.target?.id === "cg-free") && S) L.draft[S.qi] = e.target.value;
});

/* -------------------------------- Démarrage ------------------------------ */
(function boot() {
  const BP = bootParams();
  const saved = Sess.load(GAME, 12 * 3600e3);
  const pr = Profile.get();
  const root = app();
  if (BP.go && BP.code && pr.name) {
    const n0 = Profile.tag(pr.name);
    renderHome(root, "🚀 Lancement de la partie…");
    if (BP.host) startOnline(true, null, { name: n0, code: BP.code, retry: 5 });
    else startOnline(false, BP.code, { name: n0, retry: 20 });
  } else if (saved && (!BP.code || BP.code === saved.code)) {
    renderHome(root, "🔄 Retour dans le salon " + saved.code + "…");
    startOnline(false, saved.code, { name: saved.name, resume: true, wasHost: saved.host });
  } else if (BP.code && pr.name) {
    renderHome(root, "Connexion au salon " + BP.code + "…");
    startOnline(false, BP.code, { name: Profile.tag(pr.name), retry: 3 });
  } else {
    renderHome(root, "");
  }
})();
