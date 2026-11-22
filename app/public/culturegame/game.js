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
  { id: "langue", label: "Rébus & petit bac", emoji: "🔤" },
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
  { th: "langue", t: "rebus", q: "Quel mot obtient-on en assemblant ces deux morceaux ?", puzzle: "🐱 CHAT + 🧴 PEAU", h: "On le porte sur la tête.", a: "CHAPEAU" },
  { th: "langue", t: "rebus", q: "Quel mot obtient-on en assemblant ces deux morceaux ?", puzzle: "🍲 POT + 🎂 ÂGE", h: "Un velouté de légumes.", a: "POTAGE" },
  { th: "langue", t: "rebus", q: "Quel mot obtient-on en assemblant ces deux morceaux ?", puzzle: "🏃 COUR + 🎂 AGE", h: "Il en faut pour affronter sa peur.", a: "COURAGE" },
  { th: "langue", t: "rebus", q: "Quel mot obtient-on en assemblant ces deux morceaux ?", puzzle: "📏 PAR + 🎁 DON", h: "On le demande après une bêtise.", a: "PARDON" },
  { th: "langue", t: "rebus", q: "Quel mot obtient-on en assemblant ces deux morceaux ?", puzzle: "👍 BON + 👨 HOMME", h: "Un homme au grand cœur, ou un gâteau d'épices.", a: "BONHOMME" },
  { th: "langue", t: "rebus", q: "Quel mot obtient-on en assemblant ces deux morceaux ?", puzzle: "👎 MAL + 🕐 HEUR", h: "Le contraire du bonheur.", a: "MALHEUR" },
  { th: "langue", t: "rebus", q: "Quel mot obtient-on en assemblant ces deux morceaux ?", puzzle: "🌊 MER + 👁️ VEILLE", h: "Quelque chose de féerique.", a: "MERVEILLE" },
  { th: "langue", t: "rebus", q: "Quel mot obtient-on en assemblant ces deux morceaux ?", puzzle: "🥬 CHOU + 🌸 FLEUR", h: "Un légume blanc en bouquets.", a: "CHOUFLEUR", alt: ["CHOU-FLEUR"] },
  { th: "langue", t: "rebus", q: "Quel mot obtient-on en assemblant ces deux morceaux ?", puzzle: "🚪 PORTE + 🪙 MONNAIE", h: "Il garde billets et cartes.", a: "PORTEMONNAIE" },
  { th: "langue", t: "rebus", q: "Quel mot obtient-on en assemblant ces trois morceaux ?", puzzle: "🏹 ARC + ➕ EN + 🌈 CIEL", h: "Il apparaît après la pluie.", a: "ARC-EN-CIEL", alt: ["ARC EN CIEL"] },
  { th: "langue", t: "rebus", q: "Quel mot obtient-on en assemblant ces deux morceaux ?", puzzle: "⚽ BAL + 🎈 LON", h: "On le gonfle pour jouer.", a: "BALLON" },
  { th: "langue", t: "rebus", q: "Quel mot obtient-on en assemblant ces deux morceaux ?", puzzle: "🌙 MI + 🌃 NUIT", h: "L'heure où Cendrillon perd sa pantoufle.", a: "MINUIT" },
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
  { th: "langue", t: "vf", q: "Un palindrome se lit dans les deux sens.", a: true },
  { th: "langue", t: "vf", q: "Le féminin de « acteur » est « actrice ».", a: true },
  { th: "langue", t: "vf", q: "Un haïku est un poème japonais de trois vers.", a: true },
  { th: "langue", t: "vf", q: "Le mot « souris » peut désigner un animal et un accessoire.", a: true },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le mot.", l: "R E B U S", h: "Une devinette d'images", a: "REBUS" },
  { th: "langue", t: "ana", q: "Remets les lettres dans l'ordre pour trouver le mot.", l: "P A L I N D R O M E", h: "Se lit dans les deux sens", a: "PALINDROME" },
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
    rebus: "Rébus",
    who: "Qui est-ce ?",
    film: "Film mystère",
    serie: "Série mystère",
    bac: "Petit bac",
  })[t] || "QCM";
const themeLabel = (id) => (THEMES.find((t) => t.id === id) || { label: id }).label;
const themeEmoji = (id) => (THEMES.find((t) => t.id === id) || { emoji: "🎲" }).emoji;

/** Sélectionne les questions selon les thèmes, avec un quota de réponses libres. */
function pickQuestions(themes, n) {
  const active = new Set(themes && themes.length ? themes : THEMES.map((t) => t.id));
  let pool = shuffle(BANK.filter((q) => active.has(q.th)));
  if (!pool.length) pool = shuffle(BANK.slice());
  if (pool.length < n) pool = pool.concat(shuffle(BANK.filter((q) => !pool.includes(q))));
  const sub = shuffle(pool.filter((q) => SUBJECTIVE.has(q.t)));
  const obj = shuffle(pool.filter((q) => !SUBJECTIVE.has(q.t)));
  const wantSub = Math.min(sub.length, Math.max(1, Math.round(n * 0.45)));
  const picked = sub.slice(0, wantSub).concat(obj.slice(0, Math.max(0, n - wantSub)));
  if (picked.length < n) {
    const rest = shuffle(pool.filter((q) => !picked.includes(q)));
    picked.push(...rest.slice(0, n - picked.length));
  }
  return shuffle(picked).slice(0, n);
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
  if (isHost) render();
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
    <p class="cg-lead">QCM, vrai ou faux, anagrammes, rébus, petit bac, people et films mystères.
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
