/* Questions de « Qui de nous ? » — banque principale.
   Chaque tableau = un type de manche. Ajoute tes idées directement ici (une chaîne par ligne).
   Les packs thématiques (couple, coloc, bureau, famille) sont dans packs.js.
   Ce fichier est chargé AVANT le jeu (voir index.html) : les constantes sont globales. */
/* ---------- Contenu du jeu (ajoute tes idées ici) ---------- */
const VOTE = [
  "Qui est le plus beau (ou la plus belle) ?",
  "Qui survivrait le plus longtemps dans un film d’horreur ?",
  "Qui gagnerait au loto et dépenserait tout en une semaine ?",
  "Qui est le plus radin ?",
  "Qui est toujours en retard ?",
  "Qui ferait le meilleur espion ?",
  "Qui pleurerait devant un dessin animé ?",
  "Qui a le meilleur style vestimentaire ?",
  "Qui s’endormirait en pleine soirée ?",
  "Qui cuisine le mieux ?",
  "Qui se perdrait même avec un GPS ?",
  "Qui serait le pire colocataire ?",
  "Qui deviendra célèbre un jour ?",
  "Qui a le rire le plus contagieux ?",
  "Qui répond « j’arrive dans 5 minutes » alors qu’il est encore au lit ?",
  "Qui est le plus bordélique ?",
  "Qui gagnerait un concours de danse ?",
  "Qui adopterait dix chats ?",
  "Qui est le plus têtu ?",
  "Qui partirait vivre à l’étranger sur un coup de tête ?",
  "Qui est le plus drôle sans le faire exprès ?",
  "Qui serait le plus mauvais perdant à un jeu de société ?",
  "Qui répondrait à un SMS trois jours plus tard ?",
  "Qui dirigerait le groupe pendant une apocalypse zombie ?"
];
const VOTE_HOT = [
  "Qui est le meilleur menteur ?",
  "Qui flirte le plus en soirée ?",
  "Qui est le plus jaloux ?",
  "Qui trahirait un secret après deux verres ?",
  "Qui stalke ses ex sur les réseaux ?",
  "Qui a le pire goût en matière d’ex ?",
  "Qui sortirait avec un inconnu rencontré ce soir ?",
  "Qui fera demain un truc qu’il regrettera ?",
  "Qui a le plus de chances de finir SDF après une série de mauvaises décisions ?",
  "Qui serait capable de se faire virer le premier de son boulot ?",
  "Qui finirait fauché parce qu’il a tout dépensé en soirées ?",
  "Qui est le plus susceptible de se faire recaler à l’entrée d’une boîte ?",
  "Qui ferait la pire excuse après avoir été pris en flagrant délit ?",
  "Qui est le plus susceptible de revenir avec son ex pour la cinquième fois ?",
  "Qui gâcherait ses propres chances avec un message gênant ?",
  "Qui survivrait le moins longtemps s’il devait gérer sa vie tout seul ?",
  "Qui finirait le plus probablement ruiné à cause d’une mauvaise décision ?",
  "Qui pourrait se faire bannir d’un bar avant la fin de la soirée ?",
  "Qui mentirait le plus mal s’il était interrogé par la police ?",
  "Qui enverrait un message à son ex à 3 heures du matin ?",
  "Qui ferait une énorme scène pour une raison ridicule ?",
  "Qui serait le plus susceptible de ghoster quelqu’un sans explication ?",
  "Qui pourrait ruiner un premier rendez-vous en moins de dix minutes ?",
  "Qui raconterait un secret alors qu’on lui a juré de le garder ?",
  "Qui serait le plus susceptible de démissionner sur un coup de tête ?",
  "Qui ferait semblant d’avoir réussi alors qu’il n’a rien compris ?",
  "Qui serait le plus mauvais influenceur de tous les temps ?",
  "Qui prendrait la pire décision possible après avoir dit ‘faites-moi confiance’ ?",
  "Qui serait le plus susceptible de se retrouver dans une galère improbable ?"
];
const ANEC = [
  "Une honte absolue en public",
  "Un fou rire impossible à arrêter au pire moment",
  "Un mensonge qui a mal tourné",
  "Une soirée dont on se souvient à peine",
  "Un voyage qui a viré au désastre",
  "Un message envoyé à la mauvaise personne",
  "La pire excuse inventée pour éviter quelque chose",
  "Une bêtise d’enfance que les parents n’ont jamais sue",
  "Un objet perdu ou cassé au pire moment",
  "Une rencontre improbable avec une personne célèbre",
  "Ta plus grosse connerie ?",
  "Une anecdote de date qui a mal tourné",
  "Une anecdote du lycée que tu n’as jamais oubliée",
  "Une honte mémorable au lycée",
  "Une soirée où tout a dérapé",
  "Une bêtise que tu regrettes encore",
  "Un moment gênant pendant un rendez-vous"
];
const ANEC_HOT = [
  "Le moment le plus gênant avec un(e) ex",
  "Un râteau mémorable",
  "Le pire plan drague de sa vie",
  "Une situation où l’on s’est fait surprendre au mauvais moment"
];
const DEFIS = [
  "décris son caractère, pas son physique",
  "décris uniquement son style et son apparence",
  "raconte une habitude qu’on lui connaît bien",
  "utilise trois mots maximum",
  "décris-la comme un personnage de dessin animé",
  "utilise uniquement des comparaisons"
];
const YESNO = [
  "Tu t’es déjà chié dessus ?",
  "Tu as déjà menti pour éviter une soirée ?",
  "Tu as déjà fouillé le téléphone de quelqu’un ?",
  "Tu as déjà envoyé un message puis regretté immédiatement ?",
  "Tu as déjà fait semblant d’aimer un cadeau ?",
  "Tu as déjà stalké un ex sur les réseaux ?",
  "Tu as déjà eu un énorme crush sur quelqu’un ici ?",
  "Tu as déjà inventé une excuse pour rentrer plus tôt ?",
  "Tu as déjà embrassé quelqu’un puis regretté ?",
  "Tu as déjà fait semblant d’être malade pour ne pas aller quelque part ?",
  "Tu as déjà gardé un secret que tu aurais dû révéler ?",
  "Tu as déjà eu honte d’un message que tu avais envoyé ?"
];
const CONFESSION = [
  "Tu as déjà vomi en soirée ?",
  "Tu as déjà fait une énorme connerie en soirée ?",
  "Tu as déjà menti à un rendez-vous amoureux ?",
  "Tu as déjà envoyé un message gênant à la mauvaise personne ?",
  "Tu as déjà séché les cours sans raison valable ?",
  "Tu as déjà fait une bêtise au lycée qui aurait pu te coûter cher ?",
  "Tu as déjà embrassé quelqu’un et regretté juste après ?",
  "Tu as déjà eu un rencard catastrophique ?",
  "Tu as déjà cassé quelque chose chez quelqu’un sans l’avouer ?",
  "Tu as déjà inventé une histoire pour impressionner quelqu’un ?",
  "Tu as déjà été beaucoup trop loin pendant une soirée ?",
  "Tu as déjà fait quelque chose de tellement gênant que tu y repenses encore ?"
];

/* ---------- Banque élargie (centaines de questions pour varier les parties) ---------- */
VOTE.push(
  "Qui mangerait une pizza à l’ananas sans broncher ?","Qui survivrait seul sur une île déserte ?","Qui pleure le plus facilement ?",
  "Qui a le plus de chance de gagner à Koh-Lanta ?","Qui oublie toujours où il a posé ses clés ?","Qui est le plus fort pour mentir avec le sourire ?",
  "Qui passe le plus de temps sur son téléphone ?","Qui serait le meilleur président ?","Qui est le plus susceptible de rater son train ?",
  "Qui danserait sur une table sans se faire prier ?","Qui s’énerve le plus vite au volant ?","Qui est le plus gourmand ?",
  "Qui ferait le tour du monde en sac à dos ?","Qui a le plus de chance de se marier en premier ?","Qui serait le meilleur parent ?",
  "Qui a le plus beau sourire ?","Qui est le plus sportif ?","Qui est le plus paresseux ?","Qui est le plus intelligent du groupe ?",
  "Qui parle le plus fort ?","Qui parle tout seul ?","Qui ronfle le plus ?","Qui est le plus rancunier ?","Qui pardonne le plus vite ?",
  "Qui est le plus généreux ?","Qui serait un super acteur ?","Qui écrirait un livre un jour ?","Qui monterait sa propre entreprise ?",
  "Qui devient quelqu’un d’autre au karaoké ?","Qui a le meilleur humour ?","Qui est le plus naïf ?","Qui croit tout ce qu’on lui raconte ?",
  "Qui aurait peur d’une araignée minuscule ?","Qui a les pires goûts musicaux ?","Qui a la meilleure playlist ?","Qui est le plus maladroit ?",
  "Qui casse toujours quelque chose ?","Qui oublierait l’anniversaire de son meilleur ami ?","Qui est le plus romantique ?","Qui est le plus cynique ?",
  "Qui serait le plus mauvais en cuisine ?","Qui se prend pour un chef étoilé ?","Qui accepterait un pari stupide pour 10 euros ?",
  "Qui est le plus sûr de lui ?","Qui est le plus timide ?","Qui est le plus bavard ?","Qui est le plus calme en toute circonstance ?",
  "Qui ferait un excellent détective ?","Qui serait le premier à paniquer en cas d’incendie ?","Qui garderait son sang-froid en cas de catastrophe ?",
  "Qui est le plus têtu quand il a tort ?","Qui lit le plus ?","Qui regarde le plus de séries ?","Qui joue le plus aux jeux vidéo ?",
  "Qui est accro au café ?","Qui est incapable de se lever le matin ?","Qui est le plus matinal ?","Qui se coucherait à 3 h du matin en semaine ?",
  "Qui a le plus de chances de devenir millionnaire ?","Qui serait le plus mauvais joueur de poker ?","Qui bluffe le mieux ?",
  "Qui a le plus de style sans le savoir ?","Qui s’habille le plus mal ?","Qui passe le plus de temps dans la salle de bain ?",
  "Qui oublie de répondre aux messages importants ?","Qui envoie des vocaux de 5 minutes ?","Qui a le plus de mal à garder un secret ?",
  "Qui est le meilleur conteur d’histoires ?","Qui est toujours dans la lune ?","Qui prend le plus de photos ?","Qui aime le plus faire la fête ?",
  "Qui rentrerait le premier d’une soirée ?","Qui resterait jusqu’au bout de la soirée ?","Qui est le plus compétitif ?","Qui triche aux jeux de société ?",
  "Qui adopterait un animal exotique ?","Qui parle le mieux aux animaux ?","Qui est le plus écolo ?","Qui est le plus fêtard ?",
  "Qui commanderait le plat le plus bizarre au restaurant ?","Qui ne finit jamais son assiette ?","Qui chipe dans l’assiette des autres ?",
  "Qui serait le plus doué pour une arnaque ?","Qui a le plus de culture générale ?","Qui sait tout sur tout sans rien avoir vérifié ?",
  "Qui se ferait avoir par un faux prince nigérian ?","Qui passerait une journée sans téléphone ?","Qui est le plus dépensier ?",
  "Qui économise le plus ?","Qui est le plus organisé ?","Qui est toujours en retard sur ses rendez-vous médicaux ?","Qui a toujours froid ?",
  "Qui a toujours chaud ?","Qui serait un bon prof ?","Qui serait un bon médecin ?","Qui est le plus doué pour consoler les autres ?",
  "Qui donne les meilleurs conseils ?","Qui donne les pires conseils ?","Qui serait le plus gêné de chanter en public ?","Qui a le meilleur flair pour trouver un bon plan ?",
  "Qui adore se plaindre ?","Qui est le plus optimiste ?","Qui est le plus pessimiste ?","Qui rirait à un enterrement ?","Qui pleurerait à un mariage ?",
  "Qui improviserait un discours sans stress ?","Qui est le plus impulsif ?","Qui réfléchit trop avant d’agir ?","Qui serait le plus mauvais espion ?",
  "Qui a le plus de chances d’être dans un reportage sur les fans de quelque chose d’improbable ?","Qui a déjà fait un bug dans une présentation ?"
);
VOTE_HOT.push(
  "Qui a le plus de chances de se réveiller dans un endroit inconnu ?","Qui est le plus doué pour séduire ?","Qui a le plus d’ex ?",
  "Qui embrasserait un inconnu sur un pari ?","Qui est le plus susceptible d’avoir un plan d’un soir ?","Qui ment sur son âge dans une appli de rencontre ?",
  "Qui regarde le plus les profils des autres ?","Qui a déjà fait un faux profil ?","Qui serait infidèle sans culpabilité ?","Qui pardonnerait une infidélité ?",
  "Qui a le plus de secrets inavoués ?","Qui prétend être plus riche qu’il ne l’est ?","Qui a déjà menti sur son CV ?","Qui dirait « je t’aime » trop vite ?",
  "Qui a déjà pleuré à cause d’un message ?","Qui a déjà ghosté quelqu’un ?","Qui a le plus de chances de finir en garde à vue ?","Qui boit le plus ?",
  "Qui tient le moins bien l’alcool ?","Qui fait les pires messages bourrés ?","Qui oublierait toute sa soirée ?","Qui couche le plus vite le premier soir ?",
  "Qui a le plus de chances de se faire plaquer par SMS ?","Qui serait le plus mauvais au lit ?","Qui est le plus coquin dans ses pensées ?",
  "Qui a déjà eu un crush sur un(e) pote ?","Qui est le plus susceptible de tomber amoureux de quelqu’un d’inaccessible ?","Qui trouve toujours le moyen de se mettre dans le pétrin ?",
  "Qui a déjà dragué quelqu’un devant son partenaire sans le vouloir ?","Qui a les pires standards en amour ?","Qui est le plus manipulateur ?",
  "Qui est le plus hypocrite ?","Qui parle le plus dans le dos des autres ?","Qui serait le meilleur arnaqueur ?","Qui a déjà volé quelque chose en magasin ?",
  "Qui se ferait prendre en premier pour une bêtise ?","Qui a le casier judiciaire le plus probable ?","Qui ferait n’importe quoi pour de l’argent ?",
  "Qui a le plus de chances d’être cancel sur les réseaux ?","Qui ferait un scandale dans un restaurant ?","Qui s’est déjà fait virer d’un endroit ?",
  "Qui a la pire réputation sans le savoir ?","Qui a déjà fait pleurer quelqu’un ?","Qui est le plus susceptible de partir sans payer l’addition ?",
  "Qui accepterait de dire un secret du groupe pour 100 euros ?","Qui est le plus fan de ragots ?","Qui garde le plus ses ex en contact ?",
  "Qui a déjà aimé une vieille photo d’un ex par accident ?","Qui a le plus de photos compromettantes dans sa galerie ?","Qui a le plus de chances de poster quelque chose qu’il regrettera ?",
  "Qui irait à un date juste pour un repas gratuit ?","Qui a déjà annulé un date au dernier moment ?","Qui est le plus jaloux en couple ?","Qui est le plus collant en couple ?",
  "Qui est le plus froid en amour ?","Qui est le plus susceptible de se faire larguer le jour de son anniversaire ?","Qui tomberait dans le piège d’un arnaqueur sentimental ?",
  "Qui a déjà fait semblant d’être ailleurs pour éviter quelqu’un ?","Qui a déjà fait croire qu’il était malade pour sécher un truc important ?"
);
ANEC.push(
  "Le pire cadeau que tu aies reçu","Un moment où tu as eu très peur","Une fois où tu t’es perdu(e)","Le jour où tu as failli rater quelque chose d’important",
  "Une rencontre qui a changé ta vie","Une mauvaise surprise le jour d’un anniversaire","Un moment où tu t’es senti(e) ridicule","Une fois où tu as dit la mauvaise chose au mauvais moment",
  "Ton pire jour au travail ou à l’école","Une habitude bizarre que tu avais enfant","Un petit mensonge devenu énorme","Un souvenir de vacances inoubliable",
  "Un coup de chance incroyable","Un moment où tout a failli mal tourner en voiture","Une fois où tu as fait rire tout le monde sans le vouloir",
  "Une dispute stupide avec un ami","Une fois où tu t’es retrouvé(e) enfermé(e) quelque part","Un objet que tu as trouvé et gardé","Une manie dont tu n’es pas fier(ère)",
  "Un jour où tu as oublié quelque chose d’essentiel","Une fois où tu t’es fait gronder injustement","Un moment de gloire que tu n’oublieras jamais","Une fois où tu as menti à tes parents",
  "Un instant gênant avec un voisin","Une erreur de cuisine mémorable","Un animal qui t’a causé des ennuis","Une chute ridicule","Un moment où tu as eu le fou rire en classe",
  "Une fois où tu as cru reconnaître quelqu’un et t’es trompé(e)","Une fois où tu as parlé à la mauvaise personne","Un voyage en transport raté","Une panne au pire moment",
  "Un projet fou que tu as presque réalisé","Un défi stupide que tu as relevé","Une chose que tu as faite en cachette étant petit(e)","Un jour où tu as pleuré de rire",
  "Une rencontre improbable dans la rue","Un moment où tu as voulu disparaître sous terre","Une fois où tu t’es fait piéger","Un secret de famille drôle",
  "Un moment où tu as su que tu avais tort mais tu n’as rien dit","Une fois où tu as été vraiment fier(ère) de toi","Un souvenir de colonie ou de classe verte",
  "Une soirée pyjama qui a mal tourné","Une fois où tu as mangé quelque chose de très étrange","Un jour de pluie mémorable","Une surprise que tu as ratée",
  "Un message vocal que tu regrettes","Un moment où ton téléphone t’a trahi","Une fois où tu as fait semblant de comprendre","Une première fois mémorable (hors sujet gênant)",
  "Une fois où tu as été pris(e) en flagrant délit","Une fois où tu as retenu ton fou rire au pire moment","Un cadeau que tu as offert et regretté","Une sortie entre amis qui a viré à l’aventure",
  "Un souvenir d’enfance dont tu rigoles encore","Une dispute avec un frère ou une sœur","Une fois où tu as eu un coup de foudre amical","Un jour où tu t’es senti(e) invincible",
  "Un moment où tu as menti pour sauver un ami","Une fois où tu as perdu quelque chose de précieux","Une fois où tu as ri au mauvais moment","Une rencontre dans un train ou un avion",
  "Une fois où tu t’es trompé(e) de salle ou de porte","Un jour où tu as raté ton réveil","Une mésaventure en soirée","Une fois où quelqu’un t’a pris pour une autre personne",
  "Un défi que tu as perdu et dont tu paies encore les conséquences","Une habitude que tes amis te reprochent","Une fois où tu as fait quelque chose d’interdit","Un moment où tu as cru que c’était la fin du monde"
);
ANEC_HOT.push(
  "Un baiser mémorable","Le pire rencard de ta vie","Une fois où tu t’es fait choper par tes parents dans une situation gênante","Un message coquin envoyé à la mauvaise personne",
  "Un crush secret qui s’est mal fini","Une soirée où tu as fait n’importe quoi après quelques verres","Un souvenir d’ex que tu voudrais effacer","Une fois où tu as menti à quelqu’un que tu aimais",
  "Une situation où tu t’es retrouvé(e) dans le lit de la mauvaise personne","Une histoire d’amour impossible","Une fois où tu as été jaloux(se) à en perdre la tête",
  "Un fou rire dans un moment très inapproprié","Une rupture mémorable","Un moment où tu as eu honte de ton ex","Une fois où tu t’es fait larguer de la pire manière"
);
DEFIS.push(
  "décris-la en un seul mot","décris-la comme un animal","décris-la comme un objet du quotidien","décris-la comme un plat","décris ce qu’elle ferait dans un film d’horreur",
  "invente son slogan de campagne","décris-la comme un super-héros","décris-la comme une chanson","décris sa pire manie","décris sa plus grande qualité",
  "décris-la comme si c’était un personnage de série","raconte comment tu l’as rencontrée"
);
YESNO.push(
  "Tu as déjà pleuré devant un film ?","Tu as déjà chanté sous la douche ?","Tu as déjà dansé seul(e) chez toi ?","Tu as déjà parlé tout seul à voix haute ?",
  "Tu as déjà mangé quelque chose tombé par terre ?","Tu as déjà fait semblant de ne pas voir quelqu’un dans la rue ?","Tu as déjà dormi en classe ou au travail ?",
  "Tu as déjà oublié le prénom de quelqu’un que tu connais bien ?","Tu as déjà ri de la chute de quelqu’un ?","Tu as déjà fait un faux numéro exprès ?",
  "Tu as déjà lu le journal intime de quelqu’un ?","Tu as déjà copié sur quelqu’un à l’école ?","Tu as déjà menti sur ton âge ?","Tu as déjà fait semblant de téléphoner pour éviter quelqu’un ?",
  "Tu as déjà posté une photo puis supprimé 5 minutes plus tard ?","Tu as déjà passé une nuit blanche pour un jeu vidéo ?","Tu as déjà mangé un repas entier au lit ?",
  "Tu as déjà fait un tour sans payer dans les transports ?","Tu as déjà oublié ton propre numéro de téléphone ?","Tu as déjà mis un pull à l’envers sans t’en rendre compte ?",
  "Tu as déjà réagi à un message juste pour être poli ?","Tu as déjà ignoré un appel puis rappelé en disant que tu n’avais pas entendu ?","Tu as déjà cherché ton téléphone alors que tu l’avais dans la main ?",
  "Tu as déjà confondu droite et gauche en conduisant ?","Tu as déjà cuisiné un truc complètement raté ?","Tu as déjà gardé un cadeau que tu n’aimais pas ?","Tu as déjà fait croire que tu avais vu un film alors que non ?",
  "Tu as déjà fait semblant de rire à une blague pas drôle ?","Tu as déjà pleuré en public ?","Tu as déjà chanté faux devant tout le monde ?","Tu as déjà eu un fou rire à un moment interdit ?",
  "Tu as déjà dit « je suis presque arrivé » en étant encore chez toi ?","Tu as déjà inventé un prétexte pour finir un appel ?","Tu as déjà prétendu connaître une chanson que tu ne connaissais pas ?",
  "Tu as déjà regardé tes messages en pleine conversation ?","Tu as déjà suivi quelqu’un sur les réseaux pour le stalker discrètement ?","Tu as déjà gardé une photo d’un ex ?","Tu as déjà eu un crush sur un prof ?",
  "Tu as déjà posté quelque chose pour rendre quelqu’un jaloux ?","Tu as déjà parlé de quelqu’un dans son dos ?","Tu as déjà été jaloux(se) d’un ami ?","Tu as déjà fait semblant de dormir pour éviter une conversation ?",
  "Tu as déjà fait une soirée où tu ne te souviens de rien ?","Tu as déjà dit « je t’aime » sans le penser ?","Tu as déjà ressenti quelque chose pour l’ex d’un ami ?","Tu as déjà demandé quelqu’un en couple en ami « juste pour voir » ?",
  "Tu as déjà craqué pour quelqu’un de ce groupe ?","Tu as déjà envoyé un message à ton ex en pleine nuit ?","Tu as déjà fait un voyage sans rien préparer ?","Tu as déjà acheté quelque chose d’inutile en pleine nuit ?",
  "Tu as déjà râlé contre quelqu’un puis fait exactement pareil ?","Tu as déjà fait une promesse que tu savais que tu ne tiendrais pas ?","Tu as déjà perdu quelque chose de précieux chez un ami ?","Tu as déjà fait une blague qui a mal tourné ?",
  "Tu as déjà dit à quelqu’un « on se voit bientôt » sans le penser ?","Tu as déjà fait croire à un ami que tu étais occupé ?","Tu as déjà quitté un groupe de discussion sans prévenir ?","Tu as déjà été mis(e) dehors d’un cours ?",
  "Tu as déjà dormi dans un endroit improbable ?","Tu as déjà participé à un jeu télévisé ou un concours ?","Tu as déjà dit à un inconnu que tu étais quelqu’un d’autre ?","Tu as déjà trouvé de l’argent par terre et gardé ?",
  "Tu as déjà rendu un objet cassé en disant qu’il était déjà comme ça ?","Tu as déjà fait un cauchemar et appelé quelqu’un ?","Tu as déjà ri en pleurant en même temps ?","Tu as déjà été d’accord avec quelqu’un juste pour avoir la paix ?",
  "Tu as déjà fait semblant de comprendre un sujet pendant une conversation entière ?","Tu as déjà googlé ton propre nom ?","Tu as déjà passé plus de 10 heures sur ton téléphone dans la journée ?","Tu as déjà mangé de la nourriture périmée ?",
  "Tu as déjà fait du stop ?","Tu as déjà sauté une file d’attente ?","Tu as déjà fait un tour de montagnes russes en hurlant ?","Tu as déjà eu un objet fétiche d’enfance que tu gardes encore ?","Tu as déjà fait une bataille de nourriture ?",
  "Tu as déjà fait une farce téléphonique ?","Tu as déjà cassé quelque chose et accusé quelqu’un d’autre ?","Tu as déjà mis ton alarme et l’as éteinte 10 fois de suite ?","Tu as déjà chanté dans la rue ?","Tu as déjà dit à quelqu’un qu’il avait un truc sur le visage alors que non ?",
  "Tu as déjà rêvé de quelqu’un de ce groupe ?","Tu as déjà parlé en dormant ?","Tu as déjà marché dans quelque chose de dégoûtant avec des chaussettes ?","Tu as déjà confondu le nom de deux personnes devant elles ?","Tu as déjà fait pleurer quelqu’un sans le vouloir ?",
  "Tu as déjà posté une story puis tout regretté ?","Tu as déjà répondu à un message dix jours plus tard ?","Tu as déjà fait un faux compliment ?","Tu as déjà dit à ta mère que tu avais mangé alors que non ?","Tu as déjà joué à un jeu de société en trichant ?",
  "Tu as déjà dit « je n’ai rien fait » alors que si ?","Tu as déjà mis un cadeau reçu directement à la poubelle ?","Tu as déjà fait un jour sans te laver les dents ?","Tu as déjà gardé une chose empruntée beaucoup trop longtemps ?"
);
CONFESSION.push(
  "Tu as déjà pleuré à cause d’un(e) ami(e) ?","Tu as déjà fait quelque chose d’illégal par erreur ?","Tu as déjà menti à la police ou à un contrôleur ?","Tu as déjà fait quelque chose de très dangereux sans réfléchir ?",
  "Tu as déjà eu un accident ridicule ?","Tu as déjà été puni(e) injustement ?","Tu as déjà dû faire une excuse hyper gênante ?","Tu as déjà eu un fou rire au pire moment d’un événement sérieux ?",
  "Tu as déjà embrassé quelqu’un en public et regretté ?","Tu as déjà fait une scène en pleine rue ?","Tu as déjà tout plaqué du jour au lendemain ?","Tu as déjà eu un crush sur quelqu’un de beaucoup plus âgé ?",
  "Tu as déjà eu honte de tes parents en public ?","Tu as déjà été pris(e) à faire quelque chose d’interdit ?","Tu as déjà raconté une histoire en en changeant la moitié ?","Tu as déjà dit un secret qu’on t’avait confié ?",
  "Tu as déjà été éconduit(e) de manière humiliante ?","Tu as déjà dit à quelqu’un quelque chose que tu regrettes depuis ?","Tu as déjà fait une chose en soirée dont on te parle encore ?","Tu as déjà fait une blague qui a blessé quelqu’un ?",
  "Tu as déjà été si gêné(e) que tu as quitté la pièce ?","Tu as déjà pleuré en regardant un dessin animé ?","Tu as déjà passé une nuit dehors par accident ?","Tu as déjà été perdu(e) dans une ville étrangère ?",
  "Tu as déjà fait semblant d’être quelqu’un d’autre ?","Tu as déjà eu un rendez-vous où tu n’as pas osé dire non ?","Tu as déjà reçu une amende ridicule ?","Tu as déjà été tellement fatigué(e) que tu t’es endormi(e) debout ?",
  "Tu as déjà accepté un défi complètement fou ?","Tu as déjà été pris(e) en train de chanter seul(e) ?","Tu as déjà promis quelque chose en étant ivre que tu as tenu ?","Tu as déjà raté un examen important à cause d’une bêtise ?",
  "Tu as déjà fait croire à un mensonge pendant des années ?","Tu as déjà cassé quelque chose de précieux et caché les morceaux ?","Tu as déjà fait quelque chose de très gênant dans un magasin ?","Tu as déjà pleuré dans les toilettes d’une soirée ?",
  "Tu as déjà eu peur d’une chose complètement ridicule ?","Tu as déjà fait quelque chose de risqué pour impressionner quelqu’un ?","Tu as déjà trahi la confiance de quelqu’un ?","Tu as déjà fait rater un plan à tes amis ?",
  "Tu as déjà eu un coup de cœur pour quelqu’un que tu n’aurais pas dû ?","Tu as déjà dit « je vais bien » alors que tout allait mal ?","Tu as déjà fait une fausse déclaration à un contrôle ?","Tu as déjà perdu un objet que tu as juré ne jamais avoir eu ?",
  "Tu as déjà fait une réponse totalement hors sujet en classe ou en réunion ?","Tu as déjà voulu disparaître de honte ?","Tu as déjà été complètement ridicule devant quelqu’un qui te plaisait ?","Tu as déjà fait une chose que tu n’oseras jamais raconter à tes parents ?",
  "Tu as déjà fait croire que tu étais amoureux(se) de quelqu’un ?","Tu as déjà quitté une soirée en cachette ?","Tu as déjà pris un risque stupide pour une photo ?","Tu as déjà écrit un message très long puis l’as supprimé ?",
  "Tu as déjà été jaloux(se) au point de faire quelque chose de bizarre ?","Tu as déjà dit à quelqu’un que tu étais malade pour ne pas le voir ?","Tu as déjà vécu une situation qui aurait pu mal finir ?","Tu as déjà été complètement bluffé(e) par une arnaque ?",
  "Tu as déjà fait une immense bêtise avec un ami que vous cachez encore ?","Tu as déjà fait quelque chose de fou pour une personne qui ne le méritait pas ?","Tu as déjà fait quelque chose en cachette de tes amis ?","Tu as déjà regretté un tatouage, une coupe ou un achat immédiat ?",
  "Tu as déjà pris la défense de quelqu’un que tu ne supportais pas ?","Tu as déjà tout raconté à la mauvaise personne ?","Tu as déjà passé une soirée entière à éviter quelqu’un ?","Tu as déjà accepté un rendez-vous juste pour ne pas être impoli(e) ?",
  "Tu as déjà fait un rêve gênant sur quelqu’un de ce groupe ?","Tu as déjà raté un vol, un train ou un bus à cause d’une bêtise ?","Tu as déjà fait une fausse excuse pour quitter un job ?","Tu as déjà pleuré à un mariage ?"
);
const FRIEND = [
  "Plat préféré","Musique ou chanson préférée","Film préféré","Série préférée","Dessert préféré","Boisson préférée","Fast-food préféré","Chanteur ou chanteuse préféré(e)",
  "Animal préféré","Pays dont il/elle rêve","Jeu vidéo préféré","Couleur préférée","Sport préféré","Saison préférée","Application la plus utilisée","Passe-temps préféré",
  "Plus grande peur","Métier de rêve","Destination de vacances idéale","Émission préférée","Parfum de glace préféré","Livre ou BD préféré(e)","Marque de vêtements préférée",
  "Souvenir d’enfance préféré","Pire plat de sa vie","Plus beau voyage","Super-pouvoir qu’il/elle voudrait","Heure de la journée préférée","Pizza préférée","Petit-déjeuner préféré",
  "Film qu’il/elle a vu le plus de fois","Chanson qu’il/elle écoute en boucle","Dessin animé préféré enfant","Activité du dimanche idéale","Plus grande qualité selon lui/elle","Plus gros défaut selon lui/elle",
  "Endroit où il/elle se sent le mieux","Objet qu’il/elle emporterait sur une île déserte","Surnom qu’on lui donne","Son premier téléphone ou sa première console","Plat qu’il/elle déteste",
  "Légume qu’il/elle déteste","Fruit préféré","Ville préférée","Chose qui l’énerve le plus","Chose qui le/la fait toujours rire","Rêve qu’il/elle aimerait réaliser","Prénom qu’il/elle donnerait à un enfant",
  "Style de musique qu’il/elle ne supporte pas","Youtubeur, streamer ou podcast préféré","Fringue dont il/elle ne se sépare pas","Moyen de transport préféré","Boisson d’un soir de soirée","Plat que sa famille prépare le mieux"
];
const FRIEND_HOT = [
  "Plus grosse honte","Pire souvenir de soirée","Type d’homme ou de femme qui lui plaît","Plus grand regret","Pire rendez-vous","Chose qu’il/elle ne dira jamais à ses parents",
  "Plus gros mensonge","Fantasme de vie idéale","Plus grande peur en amour","Personne célèbre sur qui il/elle a craqué"
];
/* ---------- Banque ÉTENDUE (catégories normales) ---------- */
VOTE.push(
  "Qui ferait le meilleur parrain ou la meilleure marraine de mariage ?","Qui s’inscrirait à une émission de téléréalité ?","Qui garderait un calme olympien dans un embouteillage ?",
  "Qui a le plus de chances de gagner un concours de mangeur de hot-dogs ?","Qui transforme chaque conversation en débat ?","Qui répond toujours « on verra » et finit par ne rien faire ?",
  "Qui se ferait élire délégué sans le vouloir ?","Qui aurait un compte secret avec des milliers d’abonnés ?","Qui est le plus doué pour trouver une excuse en 3 secondes ?",
  "Qui adopterait un chien et l’appellerait comme un personnage de dessin animé ?","Qui oublierait son sac dans le train ?","Qui mettrait le plus de temps à choisir un resto ?",
  "Qui aurait la pire note de passager en covoiturage ?","Qui deviendrait un vieux grincheux adorable ?","Qui ferait pleurer tout le monde avec un discours de mariage ?",
  "Qui s’inscrirait à la salle et n’irait jamais ?","Qui écoute de la musique à fond dans les transports ?","Qui est le plus susceptible d’avoir un secret hallucinant ?",
  "Qui a la voix la plus reconnaissable ?","Qui est le plus fort pour faire la bise à tout le monde ?","Qui ferait un excellent animateur télé ?","Qui serait le plus gêné d’être filmé en train de danser ?",
  "Qui serait le premier à se faire manger dans un film d’horreur ?","Qui a le plus de chances de gagner à un jeu télé ?","Qui garde des vieux trucs inutiles depuis dix ans ?",
  "Qui dirait oui à un saut en parachute ?","Qui mettrait de l’ananas et du ketchup sur tout ?","Qui est le plus doué pour improviser un mensonge crédible ?","Qui aurait une chaîne YouTube qui ne décolle pas ?",
  "Qui est le plus attaché à son téléphone ?","Qui est le plus susceptible de s’endormir au cinéma ?","Qui est le plus fort pour retrouver n’importe quelle info sur internet ?",
  "Qui serait le plus mauvais pour garder un secret de Noël ?","Qui prendrait toutes les photos de groupe et n’apparaîtrait sur aucune ?","Qui aurait le plus de mal à ne pas dire la fin d’un film ?",
  "Qui a le plus de chances de se faire arnaquer en vacances ?","Qui parle à son GPS comme à une personne ?","Qui est le plus fan de son propre humour ?","Qui sortirait en pyjama sans s’en rendre compte ?",
  "Qui transformerait une soirée tranquille en soirée mémorable ?","Qui serait le plus à l’aise pour parler à un inconnu dans l’ascenseur ?","Qui aurait la pire écriture ?",
  "Qui passe sa vie à dire « je vais m’y mettre » ?","Qui est le plus doué pour faire une entrée remarquée ?","Qui serait le meilleur avocat pour défendre un coupable ?",
  "Qui a le plus de chances de tomber en panne d’essence ?","Qui laisserait un vent à son rendez-vous sans broncher ?","Qui pique tous les sweats des autres ?","Qui fait toujours la meilleure ambiance en voiture ?",
  "Qui oublierait de payer sa part et ferait semblant de ne pas avoir vu ?","Qui est le plus fort pour imiter les gens ?","Qui a la meilleure énergie le matin ?","Qui est le plus susceptible de réveiller tout l’immeuble ?",
  "Qui a le plus de chances de se faire un tatouage sur un coup de tête ?","Qui est le plus doué pour négocier un prix ?","Qui serait incapable de ne pas dire ce qu’il pense ?","Qui change d’avis toutes les 5 minutes ?",
  "Qui commande toujours la même chose au restaurant ?","Qui regarde toujours son téléphone pendant un film ?","Qui est le plus doué pour tout planifier à la minute près ?","Qui aurait peur de dormir seul dans une maison isolée ?"
);
ANEC.push(
  "Le pire plat que tu aies cuisiné pour quelqu’un","Un moment où tu as cru que tu allais mourir de honte","Un souvenir de soirée d’anniversaire","Une fois où tu as été témoin d’un truc complètement improbable",
  "Un cadeau que tu as reçu et dont tu ne savais pas quoi faire","Une dispute qui a commencé pour une raison absurde","Le jour où tu as manqué un transport important","Une mésaventure avec un taxi, un VTC ou un covoiturage",
  "Une fois où tu as fait une gaffe devant un supérieur","Un moment où tu as fait semblant de savoir faire quelque chose","Ta pire coupe de cheveux","Une fois où tu as eu un fou rire devant un inconnu",
  "Un souvenir de repas de famille mémorable","Une fois où tu as dit une énorme bêtise sans t’en rendre compte","Un défi culinaire qui a mal tourné","Un jour où tu as perdu ton téléphone ou tes clés",
  "Une rencontre avec un animal qui a mal tourné","Une fois où tu as été super mal élevé(e) sans le vouloir","Un moment de pure panique","Une blague qui a mal été comprise",
  "Un souvenir de la première fois que tu as pris l’avion, le train ou le bus seul(e)","Une fois où tu as été pris(e) pour quelqu’un d’autre","Un petit boulot dont tu te souviens encore","Un voisin ou une voisine inoubliable",
  "Un moment où tu t’es senti(e) très seul(e) en groupe","Une fois où tu as menti sur ton niveau en quelque chose","Une anecdote de déménagement","Une fois où tu t’es trompé(e) de personne en faisant la bise",
  "Une soirée où tu es rentré(e) dans un état pas très glorieux","Une fois où tu as dû t’excuser publiquement"
);
YESNO.push(
  "Tu as déjà fait semblant de ne pas parler la langue pour éviter quelqu’un ?","Tu as déjà ri tout seul en repensant à une blague ?","Tu as déjà pris un selfie en cachette dans un lieu inapproprié ?","Tu as déjà fait un voeu en soufflant des bougies et regretté ?",
  "Tu as déjà reçu un message de quelqu’un que tu avais bloqué ?","Tu as déjà trouvé de l’argent par terre et gardé tout ?","Tu as déjà parlé à ton chien ou ton chat comme à un humain ?","Tu as déjà été réveillé(e) par ton propre ronflement ?",
  "Tu as déjà fait croire que ton téléphone n’avait plus de batterie ?","Tu as déjà menti sur ta taille ou ton poids ?","Tu as déjà googlé quelqu’un juste avant de le rencontrer ?","Tu as déjà fait un vocal que tu as réécouté dix fois avant de l’envoyer ?",
  "Tu as déjà mangé en cachette pour ne pas partager ?","Tu as déjà fait le mort dans un jeu pour gagner ?","Tu as déjà claqué toute ta paie en une semaine ?","Tu as déjà fait un achat en ligne en pleine nuit que tu as regretté ?",
  "Tu as déjà oublié un anniversaire important ?","Tu as déjà pleuré à cause d’un jeu vidéo ?","Tu as déjà répondu « haha » à un message sans avoir lu ?","Tu as déjà quitté un groupe WhatsApp en douce ?",
  "Tu as déjà fait un faux numéro de téléphone à quelqu’un qui te draguait ?","Tu as déjà fait semblant de connaître quelqu’un qui te saluait ?","Tu as déjà tapé ton propre nom sur internet ?","Tu as déjà fait ta toilette en trois minutes pour être à l’heure ?",
  "Tu as déjà dit que tu étais en route alors que tu n’étais pas parti(e) ?","Tu as déjà fait les poubelles d’un ami en cachette ?","Tu as déjà appelé quelqu’un par le mauvais prénom ?","Tu as déjà fait une crise de fou rire dans une voiture ?",
  "Tu as déjà regardé un épisode de série en cachette alors que vous aviez dit d’attendre ?","Tu as déjà gardé un truc emprunté pendant plus d’un an ?","Tu as déjà dormi tout habillé(e) par flemme ?","Tu as déjà fait un énorme mensonge sur tes vacances ?"
);
CONFESSION.push(
  "Tu as déjà fait quelque chose de très bête pendant une fête de famille ?","Tu as déjà fait un cadeau que tu avais toi-même reçu ?","Tu as déjà fait un énorme mensonge à un ami pour lui faire une surprise ?","Tu as déjà tout plaqué pour un coup de tête amoureux ?",
  "Tu as déjà été viré(e) d’un endroit ?","Tu as déjà fait pleurer quelqu’un par accident ?","Tu as déjà fait quelque chose de complètement fou pour gagner un pari ?","Tu as déjà été sauvé(e) par un parfait inconnu ?",
  "Tu as déjà dormi dans un endroit improbable ?","Tu as déjà été témoin d’une scène hyper gênante et fait semblant de rien ?","Tu as déjà fait faux bond à un ami pour une autre invitation ?","Tu as déjà dit un grand mensonge sur ton passé ?",
  "Tu as déjà laissé quelqu’un d’autre prendre la faute à ta place ?","Tu as déjà fait quelque chose de risqué en voiture ?","Tu as déjà été complètement perdu(e) sans réseau ni batterie ?","Tu as déjà fait un tour de magie raté devant tout le monde ?",
  "Tu as déjà été tellement saoul(e) que tu as dû t’asseoir par terre ?","Tu as déjà passé une nuit à pleurer pour quelqu’un ?","Tu as déjà avoué un secret à un parfait inconnu ?","Tu as déjà fait quelque chose d’extrême à cause d’un défi entre amis ?"
);
FRIEND.push(
  "Sa série à regarder en boucle","Son jeu de société préféré","Sa boisson chaude préférée","Sa plus grosse phobie","Le film qui l’a fait pleurer","Sa plus grande fierté","Son plus beau souvenir d’école","Sa pire habitude",
  "Le cadeau qu’il/elle rêve de recevoir","Son meilleur souvenir avec cette bande","Le métier qu’il/elle ne ferait jamais","Sa tenue de soirée préférée","L’endroit où il/elle aimerait vivre","Son plat de réconfort",
  "Le défaut qu’il/elle déteste chez les autres","Sa plus grosse manie","Ce qu’il/elle fait en premier le matin","Son talent caché","Sa pire note de toute sa scolarité","Sa chanson de karaoké",
  "Le truc qu’il/elle collectionne ou collectionnait","Son jeu d’enfance préféré","Sa phrase fétiche","Son film de Noël préféré","Sa plus grosse dépense inutile","Son plus beau voyage rêvé",
  "Le truc qu’il/elle ne sait pas faire du tout","Sa plus grosse flemme du quotidien","Son super-héros préféré","Sa routine du soir"
);
DEFIS.push(
  "décris-la en trois emojis (écris-les avec des mots)","décris-la comme un personnage de jeu vidéo","décris-la comme une météo","décris-la comme un métier improbable","décris-la comme un monstre sympa",
  "décris-la comme une destination de voyage","décris sa démarche et sa façon de parler","raconte son pire défaut avec tendresse","imagine sa réaction face à un fantôme","décris-la comme un meuble"
);

/* ============================================================
   🌶️ MODE PIQUANT +18 — questions de soirée entre adultes
   (en mode piquant, le jeu pioche UNIQUEMENT dans ces listes)
   ============================================================ */
const VOTE_18 = [
  "Qui est le meilleur embrasseur ou la meilleure embrasseuse du groupe ?","Qui serait le plus joueur au lit ?","Qui a le plus de chances d’avoir couché avec quelqu’un de cette pièce ?","Qui a le plus gros nombre de partenaires ?",
  "Qui ferait le meilleur plan à trois… dans un film ?","Qui a déjà fait l’amour dans un endroit improbable ?","Qui est le plus chaud(e) après deux verres ?","Qui est le moins doué pour cacher son attirance ?",
  "Qui est le plus susceptible d’avoir un secret sulfureux ?","Qui enverrait une photo un peu osée au mauvais destinataire ?","Qui a la meilleure technique de drague ?","Qui a la pire technique de drague ?",
  "Qui a le plus de chances de se réveiller à côté d’un(e) inconnu(e) ?","Qui a le plus de chances de finir la soirée avec quelqu’un ?","Qui est le plus dominant au lit ?","Qui est le plus soumis au lit ?",
  "Qui a la meilleure voix pour un message vocal coquin ?","Qui rougit le plus quand on parle de sexe ?","Qui est le plus prude du groupe ?","Qui est le plus pervers dans sa tête ?",
  "Qui a déjà eu le plus de relations sans lendemain ?","Qui a le plus de chances d’avoir déjà couché avec un(e) ex puis regretté ?","Qui a déjà fait semblant au lit ?","Qui ferait n’importe quoi pour une nuit avec sa célébrité préférée ?",
  "Qui est le plus susceptible de tomber amoureux après un plan d’un soir ?","Qui draguerait le serveur ou la serveuse sans aucune honte ?","Qui est le plus jaloux quand son/sa partenaire parle à quelqu’un d’autre ?","Qui est le plus susceptible d’avoir déjà trompé quelqu’un ?",
  "Qui serait le plus tenté par un ami avec bénéfices ?","Qui a le plus de chances d’avoir un tiroir secret dans sa chambre ?","Qui a déjà regardé des films pour adultes dans un endroit inapproprié ?","Qui est le plus exhibitionniste ?",
  "Qui se baignerait nu(e) sans hésiter ?","Qui serait le premier à jouer à action ou vérité jusqu’au bout ?","Qui embrasserait la personne à sa gauche sur un défi ?","Qui oserait un strip-tease improvisé ?",
  "Qui a la meilleure paire de fesses ici ?","Qui a le plus beau regard de séducteur ?","Qui est le plus sexy sans faire d’effort ?","Qui est le plus sexy quand il/elle est en colère ?",
  "Qui a le plus de chances de coucher le premier soir ?","Qui attend le plus longtemps avant de coucher ?","Qui est le plus rapide pour se mettre en couple ?","Qui a le plus de mal à rester fidèle ?",
  "Qui a le plus de chances d’avoir une aventure avec un(e) collègue ?","Qui a le plus de chances d’avoir déjà couché avec un(e) pote ?","Qui a le plus de chances d’être dans une relation ouverte ?","Qui aurait un compte secret sur une plateforme pour adultes ?",
  "Qui ferait une nuit blanche… pour une raison coquine ?","Qui a un crush caché sur quelqu’un de cette pièce ?","Qui a le plus de chances de tomber amoureux de quelqu’un du groupe ?","Qui embrasse le mieux selon vous (sans avoir testé) ?",
  "Qui a la pire réputation en amour ?","Qui a la meilleure réputation en amour ?","Qui aurait déjà fait un massage qui a dérapé ?","Qui est le plus susceptible d’envoyer un message à son ex en pleine nuit pour autre chose que discuter ?",
  "Qui aurait déjà utilisé une excuse bidon pour rentrer avec quelqu’un ?","Qui a déjà dragué un(e) inconnu(e) juste pour le fun ?","Qui est le plus susceptible de se faire surprendre dans une situation gênante ?","Qui a déjà couché dans la chambre d’un(e) ami(e) pendant une soirée ?",
  "Qui a déjà fait l’amour dans une voiture ?","Qui a déjà fait l’amour dehors ?","Qui a déjà fait l’amour dans les toilettes d’un lieu public ?","Qui a le plus de chances de finir en couple avec quelqu’un d’interdit ?",
  "Qui serait le plus gêné si sa mère lisait ses messages ?","Qui aurait la pire surprise en ouvrant l’historique de son téléphone devant tout le monde ?","Qui a le plus de chances de se faire ghoster après une première nuit ?","Qui a le plus de chances de ghoster après une première nuit ?",
  "Qui aurait déjà menti sur son nombre de partenaires ?","Qui serait le plus honnête sur son nombre de partenaires ?","Qui a déjà eu un fantasme sur quelqu’un de ce groupe ?","Qui serait le meilleur pour des préliminaires interminables ?",
  "Qui est le plus bruyant au lit ?","Qui est le plus silencieux au lit ?","Qui est le plus fou au lit selon vous ?","Qui a déjà fait quelque chose de très osé pour impressionner quelqu’un ?",
  "Qui accepterait un pari de se faire un suçon à un(e) inconnu(e) ?","Qui est le plus susceptible d’avoir déjà dragué sur son lieu de travail ?","Qui a déjà fait des avances à quelqu’un de déjà en couple ?","Qui est le plus tenté par un baiser volé ce soir ?",
  "Qui a le meilleur flair pour repérer une proie en soirée ?","Qui rentre le plus souvent accompagné d’une soirée ?","Qui a le plus de chances d’avoir une histoire d’amour avec un(e) étranger(ère) en vacances ?","Qui est le plus susceptible de sortir avec le/la meilleur(e) ami(e) de son ex ?",
  "Qui a le moins de limites en soirée ?","Qui a le plus de limites en soirée ?","Qui serait le plus à l’aise dans un club libertin ?","Qui serait le plus mal à l’aise dans un club libertin ?",
  "Qui passerait la nuit avec quelqu’un juste pour ne pas dormir seul(e) ?","Qui est le plus susceptible d’avoir déjà dragué dans une file d’attente ?","Qui a déjà reçu une photo qu’il n’aurait pas dû voir ?","Qui a déjà envoyé une photo qu’il regrette ?",
  "Qui est le plus susceptible de s’être déjà fait surprendre en pleine action ?","Qui a déjà couché avec quelqu’un dont il ne connaissait pas le prénom ?","Qui boirait un verre dans le plus simple appareil pour un défi ?","Qui fait l’amour avec le plus d’enthousiasme ?"
];
const ANEC_18 = [
  "Ton premier baiser, en détail","Ta pire expérience au lit","Ta meilleure expérience au lit (sans entrer dans les détails crus)","Le moment le plus gênant pendant un câlin qui a mal tourné",
  "La fois où tu t’es fait surprendre en pleine action","Un plan d’un soir dont tu te souviens encore","Un message coquin envoyé à la mauvaise personne","Un rencard qui a fini très tard dans la nuit",
  "Un baiser que tu n’aurais pas dû donner","Un râteau monumental en soirée","Une fois où tu as dragué quelqu’un de totalement hors de ta ligue","Une nuit où tu as fini chez quelqu’un par erreur",
  "Une fois où tu as eu une panne ou un fou rire au pire moment","Ta plus grosse honte en soirée alcoolisée","Ton pire souvenir de lendemain de soirée","Une histoire avec un(e) ex dont tu as honte",
  "Une fois où tu t’es retrouvé(e) en tenue légère devant quelqu’un par accident","Une rencontre sur une appli de rencontre qui a mal tourné","Le premier message le plus nul que tu aies reçu sur une appli","Le premier message le plus nul que tu aies envoyé sur une appli",
  "Une fois où tu as été jaloux(se) à l’extrême","Une fois où tu as menti sur ton âge ou ton métier pour séduire","Ton crush le plus inavouable","Un rendez-vous où tu n’as pas osé dire non",
  "Une fois où tu as quitté quelqu’un de la pire façon","Une fois où tu t’es fait quitter de la pire façon","Une histoire d’amour de vacances","Un souvenir de bar ou de boîte de nuit qui a dérapé",
  "Un moment où tu as flirté avec la mauvaise personne","Une fois où quelqu’un t’a avoué ses sentiments au pire moment","Un fantasme que tu as osé avouer à quelqu’un (version soft)","Une fois où tu t’es fait choper en train de stalker un(e) crush",
  "Une fois où tu t’es réveillé(e) en ne sachant plus comment tu étais arrivé(e) là","Un baiser volé qui a tout changé","Une fois où tu as raconté un secret de couple à tes amis","La chose la plus folle que tu aies faite par amour",
  "La chose la plus folle que tu aies faite par désir","Une fois où tu as fait un strip-tease ou un défi osé en soirée","Une histoire d’amour qui aurait dû rester secrète","Une nuit où tout a dérapé avec un(e) pote",
  "Un SMS du lendemain matin que tu n’oublieras jamais","Un hickey ou une trace compromettante difficile à cacher","Une fois où tes parents sont tombés sur un truc très gênant","Un voyage où tu as fait une rencontre très chaude",
  "Un souvenir de baignade ou de piscine un peu trop libre","Une fois où tu as menti pour cacher une aventure","Une fois où tu as dit « je t’aime » au mauvais moment","Une fois où tu as vu quelque chose que tu n’aurais pas dû voir",
  "Un plan qui devait être sans lendemain et qui en a eu un","Une histoire de coloc ou de voisin(e) qui a dérapé","Une fois où tu as eu un coup de cœur pour un(e) inconnu(e) dans la rue","La pire excuse que tu aies donnée après une nuit"
];
const YESNO_18 = [
  "Tu as déjà embrassé quelqu’un de cette pièce ?","Tu as déjà eu un fantasme sur quelqu’un de cette pièce ?","Tu as déjà couché le premier soir ?","Tu as déjà fait l’amour dans un endroit public ?",
  "Tu as déjà envoyé une photo osée ?","Tu as déjà reçu une photo osée ?","Tu as déjà couché avec un(e) ex après la rupture ?","Tu as déjà fait semblant au lit ?",
  "Tu as déjà trompé quelqu’un ?","Tu as déjà été trompé(e) ?","Tu as déjà eu un plan à trois ?","Tu as déjà eu un plan d’un soir ?",
  "Tu as déjà été avec quelqu’un dont tu ne connaissais pas le prénom ?","Tu as déjà dragué quelqu’un en couple ?","Tu as déjà fait un strip-tease devant quelqu’un ?","Tu as déjà dormi nu(e) chez quelqu’un d’autre ?",
  "Tu as déjà fait un massage qui a dérapé ?","Tu as déjà été surpris(e) en pleine action ?","Tu as déjà couché avec un(e) pote ?","Tu as déjà eu un crush sur le/la partenaire d’un(e) ami(e) ?",
  "Tu as déjà regardé des films pour adultes ?","Tu as déjà regardé des films pour adultes avec quelqu’un d’autre ?","Tu as déjà utilisé un jouet intime ?","Tu as déjà joué à un jeu de soirée coquin (strip-poker, action ou vérité hot…) ?",
  "Tu as déjà embrassé quelqu’un du même sexe ?","Tu as déjà été attiré(e) par quelqu’un du même sexe ?","Tu as déjà eu un tatouage ou un piercing intime ?","Tu as déjà fait l’amour dans une voiture ?",
  "Tu as déjà fait l’amour sur la plage ou dans la nature ?","Tu as déjà été en couple avec quelqu’un juste pour ne pas être seul(e) ?","Tu as déjà eu une aventure avec un(e) collègue ?","Tu as déjà eu une aventure avec ton/ta patron(ne) ?",
  "Tu as déjà dragué par message sur les réseaux sociaux ?","Tu as déjà eu un compte sur une appli de rencontre ?","Tu as déjà menti sur ton nombre de partenaires ?","Tu as déjà gardé un souvenir intime d’un(e) ex ?",
  "Tu as déjà rêvé de quelqu’un de ce groupe dans un rêve coquin ?","Tu as déjà embrassé deux personnes dans la même soirée ?","Tu as déjà fait quelque chose de très osé sur un pari ?","Tu as déjà fait un vocal coquin ?",
  "Tu as déjà écrit un message très hot que tu as supprimé avant de l’envoyer ?","Tu as déjà fait l’amour pendant que quelqu’un dormait dans la pièce à côté ?","Tu as déjà été réveillé(e) par un câlin ?","Tu as déjà rougi en lisant un message ?",
  "Tu as déjà dit « je t’aime » trop tôt ?","Tu as déjà eu une relation à distance ?","Tu as déjà eu un coup de foudre physique pour un(e) inconnu(e) ?","Tu as déjà fait croire à quelqu’un que tu étais célibataire ?",
  "Tu as déjà été jaloux(se) de quelqu’un dans cette pièce ?","Tu as déjà embrassé quelqu’un uniquement pour rendre un(e) ex jaloux(se) ?","Tu as déjà couché avec quelqu’un après quelques verres en le regrettant le lendemain ?","Tu as déjà été attiré(e) par un(e) prof ou un(e) supérieur(e) ?",
  "Tu as déjà dragué quelqu’un devant ton/ta partenaire par maladresse ?","Tu as déjà fait un défi de baiser en public ?","Tu as déjà ressenti de l’attirance pour un(e) ami(e) proche ?","Tu as déjà regretté un message envoyé après minuit ?",
  "Tu as déjà été dans un lit à trois (dormir seulement !) ?","Tu as déjà fait un bain ou une douche à deux ?","Tu as déjà fait du charme pour obtenir un verre gratuit ?","Tu as déjà fait un « plan cul » récurrent ?",
  "Tu as déjà eu des sentiments pour un plan d’un soir ?","Tu as déjà craqué pour la personne qui te plaît le moins en apparence ?","Tu as déjà fait la première approche pour embrasser quelqu’un ?","Tu as déjà été éconduit(e) lors d’un baiser ?"
];
const CONFESSION_18 = [
  "Tu as déjà couché avec quelqu’un en le regrettant dès le lendemain ?","Tu as déjà été avec quelqu’un dont tu avais honte de parler à tes amis ?","Tu as déjà eu un rapport dans un lieu où tu aurais pu te faire prendre ?","Tu as déjà fait quelque chose de très osé sur un coup de tête en soirée ?",
  "Tu as déjà embrassé quelqu’un de ce groupe ?","Tu as déjà eu un fantasme sur quelqu’un d’interdit ?","Tu as déjà couché avec l’ex d’un(e) ami(e) ?","Tu as déjà eu une aventure avec une personne déjà en couple ?",
  "Tu as déjà fait un strip-tease improvisé ?","Tu as déjà été pris(e) en flagrant délit dans une situation intime ?","Tu as déjà envoyé une photo intime à quelqu’un puis regretté ?","Tu as déjà reçu une proposition que tu as trouvée trop directe ?",
  "Tu as déjà fait une nuit entière sans dormir pour une raison coquine ?","Tu as déjà fait un test de compatibilité intime avec quelqu’un ?","Tu as déjà fantasmé sur un(e) inconnu(e) croisé(e) dans la rue ?","Tu as déjà eu un coup de cœur pour un(e) ami(e) de ton/ta partenaire ?",
  "Tu as déjà eu un moment très gênant en plein câlin (fou rire, bruit, crampe…) ?","Tu as déjà fait quelque chose de très particulier au lit ?","Tu as déjà utilisé un déguisement ou un accessoire coquin ?","Tu as déjà eu un coup d’un soir avec un(e) touriste ?",
  "Tu as déjà fait un défi hot en soirée ?","Tu as déjà joué à un jeu à boire qui a fini en baiser ?","Tu as déjà fait un baiser langoureux avec quelqu’un devant tout le monde ?","Tu as déjà eu un rendez-vous où tout est allé trop vite ?",
  "Tu as déjà menti sur ce que tu faisais pendant une soirée ?","Tu as déjà joué double jeu avec deux personnes en même temps ?","Tu as déjà été avec quelqu’un juste pour l’attirance physique ?","Tu as déjà dit à quelqu’un que tu l’aimais alors que ce n’était qu’une attirance ?",
  "Tu as déjà gardé une relation secrète ?","Tu as déjà eu un pincement au cœur en voyant ton ex avec quelqu’un d’autre ?","Tu as déjà tout fait pour séduire quelqu’un qui ne voulait pas de toi ?","Tu as déjà fait quelque chose d’interdit avec quelqu’un dans un lieu qui n’était pas le tien ?",
  "Tu as déjà fait un rêve très hot avec un(e) ami(e) ?","Tu as déjà regretté de ne pas avoir franchi le pas avec quelqu’un ?","Tu as déjà été attiré(e) par quelqu’un de beaucoup plus âgé (adulte) que toi ?","Tu as déjà été surpris(e) par tes parents dans une situation embarrassante ?",
  "Tu as déjà demandé à quelqu’un de sortir juste après un baiser en soirée ?","Tu as déjà écrit un message très osé à quelqu’un qui ne t’a jamais répondu ?","Tu as déjà passé la nuit chez quelqu’un en disant à tes amis que tu étais ailleurs ?","Tu as déjà mis ton téléphone en mode avion pour éviter un(e) ex pendant un moment intime ?"
];
const FRIEND_18 = [
  "Son premier baiser","Son plus gros râteau","Son type physique idéal","Son plus gros crush de célébrité","Sa pire technique de drague","Sa plus grosse honte en rendez-vous",
  "Sa plus grosse jalousie","Sa plus grosse folie par amour","Ce qu’il/elle regarde en premier chez quelqu’un","Son pire date","Son meilleur souvenir amoureux","Son plus gros fantasme de vie (version soft)",
  "Sa chanson pour une soirée romantique","Son endroit idéal pour un premier baiser","Le nombre de relations sérieuses qu’il/elle a eues","Ce qui l’attire le plus chez quelqu’un","Son plus gros défaut en couple","Sa pire rupture",
  "Son plus gros deal-breaker en amour","Sa phrase de drague préférée","Son surnom le plus ridicule donné par un(e) ex","Le détail qui le/la fait craquer","Sa tenue la plus sexy","Ce qu’il/elle ne ferait jamais pour un(e) ex",
  "Sa plus grosse peur au premier rendez-vous","La personne de cette pièce avec qui il/elle s’entendrait le mieux en couple","Son premier crush","Son plus grand regret amoureux"
];
const DEFIS_18 = [
  "décris-la comme un(e) amant(e) de film romantique","décris sa technique de drague","décris-la en tenue de soirée sexy","décris ce que ferait cette personne dans une émission de téléréalité de rencontres",
  "décris son style de séduction","décris-la comme le/la partenaire idéal(e) de quelqu’un","décris son premier rendez-vous catastrophique imaginaire","décris-la comme un(e) crush de lycée"
];

/* ---------- Banque ÉTENDUE n°2 : plus de normal, beaucoup plus de +18, et les phrases à compléter ---------- */
const PUNCH = [
  "Le surnom le plus probable de {nom} au bureau serait…",
  "Si {nom} était un plat, ce serait… parce que…",
  "Le pire métier pour {nom} : …",
  "La dernière phrase de {nom} avant de s’endormir : …",
  "Le titre de la série Netflix sur la vie de {nom} : …",
  "{nom} sauverait le monde, mais seulement si…",
  "Dans un film d’horreur, {nom} meurt à cause de…",
  "Le pire cadeau à offrir à {nom} : …",
  "Le secret le mieux gardé de {nom} : …",
  "La phrase préférée de {nom} en soirée : …",
  "Si {nom} devenait président(e), sa première loi serait…",
  "Ce que {nom} cherche sur Google à 3 h du matin : …",
  "Le talent caché de {nom} : …",
  "Sur son CV, {nom} a menti sur…",
  "La pire excuse de {nom} pour être en retard : …",
  "Si {nom} écrivait un livre, il s’appellerait…",
  "Le premier truc que {nom} ferait en gagnant au loto : …",
  "{nom} serait banni(e) de Disneyland pour avoir…",
  "Le dernier message de {nom} avant l’apocalypse zombie : …",
  "Le slogan de campagne de {nom} : …",
  "Un jour, {nom} a essayé de…",
  "En colocation, {nom} est celui ou celle qui…",
  "Le pire conseil que {nom} puisse donner : …",
  "Le super-pouvoir le plus inutile de {nom} : …",
  "{nom} est secrètement fan de…",
  "La playlist de {nom} sous la douche contient…",
  "Quand on demande « ça va ? » à {nom}, il ou elle répond…",
  "Le nom de la chaîne YouTube de {nom} : …",
  "Sur une île déserte, {nom} emporterait…",
  "{nom} a fini aux urgences à cause de…",
  "Le tatouage que {nom} regretterait : …",
  "La pire idée de business de {nom} : …",
  "Quand {nom} a bu un verre de trop, il ou elle…",
  "Le truc le plus bizarre dans le frigo de {nom} : …",
  "La pire habitude de {nom} en voiture : …",
  "Le trait de caractère de {nom} qui énerve le plus : …",
  "La phrase gravée sur la tombe de {nom} : …",
  "Le dernier achat impulsif de {nom} : …",
  "{nom} a été renvoyé(e) de son premier job pour avoir…",
  "Le film préféré de {nom} (qu’il ou elle n’avoue pas) : …",
  "Le pire rendez-vous de {nom} : …",
  "Le mot que {nom} répète beaucoup trop : …",
  "Dans Koh-Lanta, {nom} serait éliminé(e) à cause de…",
  "Pour impressionner quelqu’un, {nom} serait capable de…",
  "Le plus gros regret de {nom} : …",
  "Dans un groupe de pop, {nom} s’appellerait… et chanterait…",
  "{nom} a toujours rêvé de…",
  "Le métier que {nom} fait en cachette : …",
  "Le profil de {nom} sur une appli de rencontre : …",
  "Ce que {nom} dirait à son ex s’il ou elle le recroisait : …",
  "La commande habituelle de {nom} au restaurant : …",
  "La pire phrase de drague de {nom} : …",
  "{nom} a menti à ses parents pour…",
  "Le dernier truc que {nom} a cassé : …",
  "Le pire prénom que {nom} donnerait à son enfant : …",
  "{nom} survivrait à une apocalypse grâce à…",
  "Dans son sac, {nom} a toujours…",
  "Le nom de l’animal de compagnie de {nom} : …",
  "La chanson de karaoké de {nom} (et pourquoi c’est une erreur) : …",
  "Le slogan sur le t-shirt de {nom} : …",
  "Le pire rôle de {nom} dans un film : …",
  "{nom} se fait toujours avoir par…",
  "La phrase qui énerve {nom} le plus : …",
  "Ce que {nom} fait quand il ou elle croit que personne ne regarde : …",
  "La dernière recherche dans l’historique de {nom} : …",
  "Le nom de scène de {nom} s’il ou elle devenait rappeur ou rappeuse : …",
  "Le pire sport pour {nom} : …",
  "Si {nom} était un meuble, ce serait… parce que…",
  "{nom} a déjà pleuré à cause de…",
  "Dans le groupe, {nom} joue le rôle de…",
  "Au karaoké, {nom} massacrerait…",
  "La pire coupe de cheveux de {nom} : …",
  "La phrase de {nom} juste avant de faire une bêtise : …",
  "La bio Instagram de {nom} : …",
  "Le plat que {nom} cuisine le plus mal : …",
  "Le dernier mensonge de {nom} : …",
  "Le super-héros {nom} s’appellerait… et son pouvoir serait…",
  "{nom} devrait absolument arrêter de…",
  "Ce que {nom} ferait avec un million d’euros en 24 heures : …",
  "{nom} est du genre à…",
  "Le surnom que {nom} détesterait : …",
  "Le cadeau parfait pour {nom} : …",
  "Le pire truc à dire à {nom} un lundi matin : …",
  "{nom} est incapable de résister à…",
  "Dans dix ans, {nom} sera connu(e) pour…",
  "Le message que {nom} enverrait par erreur au mauvais groupe : …",
  "{nom} se prend pour… mais en réalité est…",
  "Le pire voisin possible, c’est {nom} qui…",
  "{nom} prépare en secret…",
  "Le pire truc que {nom} puisse crier dans un avion : …",
  "L’émission de télé-réalité de {nom} s’appellerait… ",
  "{nom} a déjà été arrêté(e) pour…",
  "L’appli que {nom} inventerait : …",
  "Au réveil, {nom} ressemble à…",
  "Le dernier SMS de {nom} à sa mère : …",
  "{nom} a failli se faire virer d’un restaurant pour…",
  "Si {nom} était une marque, son slogan serait…",
  "La phrase que {nom} dirait à un juge : …",
  "{nom} a dépensé trop d’argent pour…",
  "Le pire déguisement possible pour {nom} : …",
  "Sur sa liste de courses, {nom} oublie toujours…",
  "Ce que {nom} répond à « t’as des projets pour la suite ? » : …",
  "{nom} a une peur panique de…",
  "Le conseil de vie le plus nul de {nom} : …"
];
const PUNCH_18 = [
  "Le pire plan drague de {nom} : …",
  "Le fantasme secret de {nom} : …",
  "Le surnom coquin de {nom} serait…",
  "Au lit, {nom} est du genre à…",
  "Ce que {nom} cache dans le tiroir de sa table de nuit : …",
  "La phrase que {nom} chuchote à l’oreille de quelqu’un pour le ou la séduire : …",
  "Le profil de {nom} sur Tinder : …",
  "Le pire endroit où {nom} s’est fait surprendre en plein câlin : …",
  "La pire excuse de {nom} après une nuit agitée : …",
  "Le crush secret de {nom} : …",
  "Le pire râteau de {nom} : …",
  "Le message que {nom} envoie à 2 h du matin : …",
  "Le premier rendez-vous de {nom} se termine toujours par…",
  "Le nom de scène de {nom} s’il ou elle tournait un film pour adultes : …",
  "Ce que {nom} ferait pour passer une nuit avec sa célébrité préférée : …",
  "{nom} est secrètement attiré(e) par…",
  "La chose la plus osée que {nom} ait faite en soirée : …",
  "Le point faible de {nom} quand il faut séduire : …",
  "{nom} se réveille dans un lit inconnu, sa première phrase : …",
  "La pire phrase d’accroche de {nom} : …",
  "Ce que {nom} fait après trois verres de trop : …",
  "Le pire souvenir de {nom} sous la couette : …",
  "Si {nom} écrivait un roman érotique, il s’appellerait…",
  "Le jeu coquin préféré de {nom} : …",
  "L’ex de {nom} résumerait son passage ainsi : …",
  "Le talent le plus utile de {nom} au lit : …",
  "La tenue qui fait craquer {nom} : …",
  "Le mot doux le plus gênant de {nom} : …",
  "Le dernier mensonge de {nom} à un ou une amant(e) : …",
  "{nom} accepterait un plan à trois uniquement si…",
  "La pire chose à dire pendant un câlin : …",
  "Le dernier coup de foudre de {nom} : …",
  "Le bruit le plus gênant que {nom} ferait au lit : …",
  "Le sous-vêtement le plus ridicule de {nom} : …",
  "Le déguisement le plus sexy (ou le plus raté) de {nom} : …",
  "La chanson que {nom} met pour une soirée en amoureux : …",
  "Le prénom que {nom} crie dans son sommeil : …",
  "Ce qui rend {nom} irrésistible : …",
  "Ce qui fait fuir les rencards de {nom} : …",
  "{nom} se vante d’être un(e) expert(e) en…",
  "Le texto que {nom} regrette d’avoir envoyé à son crush : …",
  "Le geste de séduction raté de {nom} : …",
  "{nom} a déjà fait semblant d’aimer… pour séduire quelqu’un",
  "Le compliment qui fait fondre {nom} : …",
  "La nuit la plus folle de {nom} : …",
  "Ce que {nom} ne referait plus jamais en amour : …",
  "Le point commun entre tous les ex de {nom} : …",
  "Le lieu insolite où {nom} rêve de s’embrasser : …",
  "Le lendemain d’une soirée trop arrosée, {nom} découvre…",
  "Le meilleur conseil de {nom} pour séduire : …",
  "Le pire conseil de {nom} pour séduire : …",
  "{nom} a déjà dit « je t’aime » trop tôt à…",
  "Le pire sujet de conversation de {nom} à un premier rendez-vous : …",
  "Ce que {nom} fait quand il ou elle manque d’affection : …",
  "{nom} flirte en citant…",
  "La phrase culte de {nom} pour finir la soirée à deux : …",
  "Le cadeau coquin que {nom} offrirait à son ou sa partenaire : …",
  "Le lieu de rendez-vous le plus romantique selon {nom} : …",
  "{nom} pense que le plus important au lit, c’est…",
  "Le fantasme de {nom} qu’il ou elle n’avouera jamais : …",
  "{nom} a déjà été surpris(e) en train de… pendant un moment intime",
  "Le plus gros red flag de {nom} en amour : …",
  "Le plus gros green flag de {nom} en amour : …",
  "Le jouet coquin que {nom} a acheté puis caché : …",
  "{nom} a un jour sexté… la mauvaise personne : …",
  "La pire position de {nom} pour séduire (au sens large) : …",
  "La soirée libertine de {nom} s’appellerait… et l’invité d’honneur serait…",
  "{nom} aurait du mal à résister à un(e)… en maillot de bain",
  "Le plus beau râteau que {nom} ait infligé : …",
  "{nom} serait prêt(e) à tout pour un week-end avec… sauf…",
  "Ce que {nom} répond à « ton plus gros fantasme ? » : …"
];
VOTE.push(
  "Qui ferait le meilleur chef d’orchestre pour une chorale ?","Qui est toujours le premier à finir son assiette ?","Qui racontera la même histoire pour la dixième fois ?",
  "Qui serait le plus mauvais témoin dans un procès ?","Qui est le plus doué pour trouver des plans de dernière minute ?","Qui est le plus fort pour faire semblant d’écouter ?",
  "Qui apporterait un gâteau raté à une fête en disant qu’il est parfait ?","Qui est le plus doué pour crier « j’ai gagné » ?","Qui serait le plus mauvais joueur au Monopoly ?",
  "Qui pourrait vivre sans réseaux sociaux pendant un an ?","Qui a la voix la plus apaisante ?","Qui serait le meilleur en garde du corps ?","Qui est le plus fort pour retenir des numéros de téléphone ?",
  "Qui aurait les meilleurs conseils pour un entretien d’embauche ?","Qui s’inscrit à tous les jeux concours ?","Qui dort le plus longtemps le week-end ?","Qui est le plus bavard au téléphone ?",
  "Qui garde son calme en cas de panne de courant ?","Qui s’habille le mieux sans jamais faire d’effort ?","Qui finirait un ultra-trail sans s’être entraîné ?","Qui aurait la meilleure planque dans un cache-cache géant ?",
  "Qui crierait « à l’aide » le plus fort en cas de petite araignée ?","Qui est le plus doué pour dénicher des bons plans ?","Qui perd toujours ses lunettes sur sa tête ?","Qui est le plus fort pour les imitations de voix ?",
  "Qui a la plus grande bibliothèque ?","Qui oublierait de lever la main en cas de bonne nouvelle ?","Qui est le plus sérieux quand il jure de ne pas rire ?","Qui prendrait un selfie devant un monument sans regarder le monument ?",
  "Qui aurait le plus de mal à se passer de café ?","Qui conduit le plus mal ?","Qui conduit le mieux ?","Qui est le plus susceptible de faire le tour du monde en vélo ?","Qui a le plus de chances de gagner un procès pour rien ?",
  "Qui a la meilleure playlist ?","Qui a le pire goût musical ?","Qui est le plus fan de séries coréennes ?","Qui regarde les mêmes films en boucle ?","Qui est le plus doué pour les énigmes ?","Qui se vante le plus ?"
);
YESNO.push(
  "Tu as déjà dormi dans une voiture ?","Tu as déjà pris un bain tout habillé(e) ?","Tu as déjà ri tellement fort que tu as pleuré ?","Tu as déjà oublié ton propre numéro de téléphone ?",
  "Tu as déjà fait un tour de manège qui t’a rendu malade ?","Tu as déjà fait un discours devant tout le monde ?","Tu as déjà fait du karaoké en public ?","Tu as déjà gagné un trophée ou une médaille ?",
  "Tu as déjà fait semblant de regarder ton téléphone pour éviter de parler à quelqu’un ?","Tu as déjà mangé un truc périmé en connaissance de cause ?","Tu as déjà jeté un cadeau reçu ?","Tu as déjà pleuré dans un avion ?",
  "Tu as déjà passé un week-end entier en pyjama ?","Tu as déjà fait semblant de dormir pour éviter une discussion ?","Tu as déjà raté un rendez-vous important à cause d’une grasse matinée ?","Tu as déjà cassé un objet de valeur chez quelqu’un ?",
  "Tu as déjà croisé une célébrité en vrai ?","Tu as déjà arrêté un film au milieu parce que tu ne supportais plus ?","Tu as déjà reçu un coup de foudre amical ?","Tu as déjà cru à une fausse info et l’as répétée à tout le monde ?",
  "Tu as déjà gardé des vêtements que tu ne portes plus depuis dix ans ?","Tu as déjà été pris(e) pour quelqu’un d’autre ?","Tu as déjà fait le tour d’un supermarché sans acheter ce que tu étais venu chercher ?","Tu as déjà perdu une dent à cause d’une bêtise ?",
  "Tu as déjà trébuché sur une marche devant tout le monde ?","Tu as déjà chanté faux devant tout le monde en croyant que c’était juste ?","Tu as déjà envoyé un SMS à ta mère en pensant écrire à quelqu’un d’autre ?","Tu as déjà fait un voyage sans réservation ?",
  "Tu as déjà essayé de réparer quelque chose et empiré la situation ?","Tu as déjà fait un faux départ dans une course ?","Tu as déjà tenté un régime qui a duré moins de 48 heures ?","Tu as déjà regretté un message vocal envoyé ?",
  "Tu as déjà dit « je te rappelle » sans jamais rappeler ?","Tu as déjà tout mangé alors que tu avais promis de partager ?","Tu as déjà passé une soirée seul(e) à rire devant une vidéo ridicule ?","Tu as déjà commandé le même plat tous les jours pendant une semaine ?"
);
ANEC.push(
  "Un moment où tu as eu un fou rire avec un parfait inconnu","Une fois où tu as fait une énorme surprise à quelqu’un","Un moment où tu as aidé quelqu’un sans le connaître","Un voyage en train, bus ou avion qui a tourné au cauchemar",
  "Une fois où tu t’es perdu(e) dans une grande ville","Une fois où tu as raté un rendez-vous important","Un moment où tu t’es senti(e) très fier ou fière","Un jour où tu as fait semblant de ne pas avoir mal",
  "La fois où tu as essayé un sport et où ça s’est mal passé","Une fois où tu as été chargé(e) d’organiser quelque chose et où tout a dérapé","Un moment où tu as été complètement dépassé(e)","Un souvenir de sortie scolaire",
  "Une fois où tu t’es retrouvé(e) au mauvais endroit au mauvais moment","Une histoire de câble, de wifi ou d’informatique qui a mal tourné","Une soirée déguisée mémorable","Un dîner de famille qui a dégénéré"
);
VOTE_18.push(
  "Qui est le plus susceptible de tomber amoureux ou amoureuse en une soirée ?","Qui aurait un compte secret sur un site de rencontres ?","Qui flirte le plus avec le serveur ou la serveuse ?","Qui est le plus doué pour envoyer des messages coquins ?",
  "Qui a le plus de chances de finir la soirée avec quelqu’un ?","Qui se déshabillerait en premier à un strip-poker ?","Qui serait le plus gêné d’être surpris en pleine action ?","Qui a le plus de fantasmes inavouables ?",
  "Qui fait les meilleurs câlins ?","Qui est le plus tactile après quelques verres ?","Qui serait le plus timide sous la couette ?","Qui garde un ex en « plan B » ?",
  "Qui a la plus belle voix pour chuchoter à l’oreille ?","Qui est le plus susceptible d’avoir raté un sexto ?","Qui a le meilleur sourire pour séduire ?","Qui est le plus difficile à séduire ?",
  "Qui est le plus facile à séduire ?","Qui a la photo de profil la plus avantageuse sur une appli de rencontre ?","Qui a le plus de succès sur Tinder ?","Qui regarde le plus les gens à la dérobée en soirée ?",
  "Qui rougirait le plus en parlant de sexe ?","Qui parle le plus librement de sa vie sexuelle ?","Qui a le plus de chances d’avoir déjà fait l’amour en voiture ?","Qui est le plus doué pour les massages ?",
  "Qui assumerait le mieux un strip-tease ?","Qui est le plus fan de belle lingerie ou de beaux sous-vêtements ?","Qui a les objets les plus étranges dans sa table de nuit ?","Qui serait le plus ouvert à tester de nouvelles choses ?",
  "Qui aurait une aventure de vacances sans hésiter ?","Qui a déjà eu un ami ou une amie avec avantages ?","Qui est le plus jaloux quand son ou sa partenaire parle à quelqu’un d’autre ?","Qui est le plus bruyant dans l’intimité ?",
  "Qui ferait le premier pas ?","Qui attendrait des mois que l’autre fasse le premier pas ?","Qui est le plus sexy en pyjama ?","Qui est le plus sexy quand il ou elle est en colère ?",
  "Qui est le plus sexy en tenue de soirée ?","Qui a les plus beaux yeux ?","Qui a les plus belles mains ?","Qui a le plus de charme naturel ?",
  "Qui danse le plus sensuellement ?","Qui tomberait amoureux d’un ou d’une collègue ?","Qui oserait aller sur une plage naturiste ?","Qui est le plus à l’aise avec son corps ?",
  "Qui a reçu le plus de déclarations d’amour ?","Qui a le plus de crushs secrets ?","Qui ghosterait quelqu’un après une nuit ?","Qui serait le plus romantique le lendemain matin ?",
  "Qui s’enfuirait avant le réveil de l’autre ?","Qui est le plus gêné de dire « je t’aime » ?","Qui dirait « je t’aime » après trois jours ?","Qui a le plus de chances de se faire griller en train de flirter ?",
  "Qui est le plus susceptible d’avoir couché avec quelqu’un d’interdit ?","Qui a le plus de chances d’avoir déjà fait un bisou à un(e) inconnu(e) en boîte ?","Qui serait le meilleur partenaire de slow ?","Qui a la plus belle démarche ?",
  "Qui a le meilleur sex-appeal sans le savoir ?","Qui est le plus susceptible de tenter un plan à trois ?","Qui est le plus coquin ou coquine du groupe ?","Qui serait le plus doué en jeu de rôle ?",
  "Qui a la plus grande expérience amoureuse ?","Qui a le moins d’expérience amoureuse ?","Qui aurait le plus de mal à résister à une proposition indécente ?","Qui est le plus susceptible d’avoir vécu une nuit de folie la semaine dernière ?",
  "Qui a le plus de chances d’être déjà sorti(e) avec quelqu’un de ce groupe ?","Qui draguerait un inconnu pour un pari ?","Qui est le plus coquin ou coquine par message ?","Qui fait la meilleure tête de séducteur ou de séductrice ?"
);
ANEC_18.push(
  "Ton plus beau premier baiser","Une nuit que tu n’oublieras jamais (version soft)","Le pire lendemain de soirée avec quelqu’un","Une fois où tu as été pris(e) sur le fait","Ton plan drague le plus audacieux",
  "Une rencontre improbable qui a fini sous la couette (version soft)","Un râteau qui t’a marqué","Un moment très gênant avec les parents de quelqu’un que tu fréquentais","Un fantasme que tu as osé avouer","Un message coquin envoyé à la mauvaise personne",
  "Une fois où tu t’es retrouvé(e) nu(e) devant du monde","Ton rendez-vous le plus romantique","Ton rendez-vous le plus catastrophique","Un flirt de vacances inoubliable","Une histoire de colocataire qui a viré au gênant",
  "La fois où tu as dû fuir par la fenêtre","Une déclaration d’amour publique qui a mal tourné","La pire phrase de drague que tu aies reçue","La meilleure phrase de drague que tu aies reçue","Un bisou volé",
  "Une nuit en boîte qui a mal tourné","Un baiser que tu regrettes","Une soirée où tu as failli céder","Un moment où tu as eu une très mauvaise surprise sous la couette (version soft)","Un lieu insolite où tu as flirté",
  "La fois où tu as été jaloux ou jalouse en soirée","Un SMS que tu regrettes à vie","Une conversation coquine qui a mal tourné","Un jeu à boire qui a dérapé en jeu coquin","Un cadeau coquin reçu ou offert",
  "Une fois où tu as fait semblant de dormir","Un ex que tu as revu pour une dernière nuit","Une fois où tu t’es trompé(e) de lit","Un crush pour quelqu’un d’interdit","Un lendemain avec marche de la honte",
  "Un rêve coquin dont tu te souviens","Un moment qui t’a fait rougir jusqu’aux oreilles","Une rencontre sur une appli qui ne ressemblait pas du tout à la photo","Ta pire expérience en boîte de nuit","Un baiser dans un endroit insolite"
);
YESNO_18.push(
  "Tu as déjà fait un strip-tease ?","Tu as déjà fait un bain de minuit tout(e) nu(e) ?","Tu as déjà été surpris(e) en pleine action ?","Tu as déjà embrassé quelqu’un du même sexe ?","Tu as déjà fait un sexto ?",
  "Tu as déjà fait l’amour en voiture ?","Tu as déjà utilisé un jouet coquin ?","Tu as déjà regardé un film pour adultes avec quelqu’un ?","Tu as déjà joué au strip-poker ?","Tu as déjà fait un plan à trois ?",
  "Tu as déjà eu un coup d’un soir ?","Tu as déjà eu un ami ou une amie avec avantages ?","Tu as déjà fait l’amour sur une plage ?","Tu as déjà été nu(e) en public volontairement ?","Tu as déjà fait un massage qui a dégénéré ?",
  "Tu as déjà envoyé une photo coquine à la mauvaise personne ?","Tu as déjà simulé ?","Tu as déjà fait semblant de dormir pour éviter un câlin ?","Tu as déjà craqué pour le ou la partenaire d’un(e) ami(e) ?","Tu as déjà embrassé quelqu’un dont tu ne connaissais pas le prénom ?",
  "Tu as déjà fait un rêve érotique avec quelqu’un de cette pièce ?","Tu as déjà été attiré(e) par quelqu’un du groupe ?","Tu as déjà joué à action ou vérité avec un gage osé ?","Tu as déjà fait un strip-tease raté ?","Tu as déjà dragué pour gagner un pari ?",
  "Tu as déjà regretté une nuit ?","Tu as déjà dormi chez un ex « pour dépanner » ?","Tu as déjà dit le mauvais prénom au lit ?","Tu as déjà été surpris(e) en train d’embrasser quelqu’un par tes parents ?","Tu as déjà fait du sexe au téléphone ou en visio ?",
  "Tu as déjà eu un crush sur un ou une collègue ?","Tu as déjà utilisé une appli de rencontre en étant en couple ?","Tu as déjà ghosté quelqu’un après une nuit ?","Tu as déjà été ghosté(e) après une nuit ?","Tu as déjà fait un câlin un peu trop long à quelqu’un du groupe ?",
  "Tu as déjà reçu un message coquin d’un(e) inconnu(e) ?","Tu as déjà gardé un vêtement d’un ex ?","Tu as déjà pris une douche à deux ?","Tu as déjà fait un jeu de rôle coquin ?","Tu as déjà porté de la lingerie ou des sous-vêtements osés ?",
  "Tu as déjà été à une soirée libertine ?","Tu as déjà fantasmé sur une célébrité ?","Tu as déjà dit un truc très cochon sans le vouloir ?","Tu as déjà fait l’amour dans un endroit où tu aurais pu être vu(e) ?","Tu as déjà fait un tatouage dans un endroit caché ?",
  "Tu as déjà été pris(e) en train de regarder quelque chose de coquin sur ton téléphone ?","Tu as déjà fait un vœu coquin en soufflant tes bougies ?","Tu as déjà dragué quelqu’un du groupe d’amis ?","Tu as déjà embrassé quelqu’un juste pour rendre quelqu’un d’autre jaloux ?","Tu as déjà fait un strip-tease pour un pari ?",
  "Tu as déjà eu un coup de cœur pour quelqu’un déjà en couple ?","Tu as déjà fantasmé sur un ou une prof ?","Tu as déjà été tenté(e) par une aventure ?","Tu as déjà fait un jeu de bouteille avec des gages osés ?","Tu as déjà flirté juste pour obtenir un verre gratuit ?",
  "Tu as déjà fait un baiser langoureux en public ?","Tu as déjà fait un rêve très osé dont tu as eu honte ?","Tu as déjà fait un selfie très sexy ?","Tu as déjà dit à quelqu’un du groupe qu’il ou elle te plaisait ?","Tu as déjà eu un moment ambigu avec un ami ou une amie ?"
);
CONFESSION_18.push(
  "Tu as déjà fait un truc très osé en soirée ?","Tu as déjà vécu une nuit de folie ?","Tu as déjà été surpris(e) dans une situation intime ?","Tu as déjà vécu un rendez-vous coquin qui a viré au fiasco ?","Tu as déjà flirté avec quelqu’un d’interdit ?",
  "Tu as déjà embrassé quelqu’un en cachette ?","Tu as déjà eu un fou rire pendant un moment intime ?","Tu as déjà envoyé un sexto à la mauvaise personne ?","Tu as déjà été éconduit(e) de façon humiliante ?","Tu as déjà dû mentir pour cacher une aventure ?",
  "Tu as déjà eu un coup de foudre pour un(e) inconnu(e) ?","Tu as déjà fait quelque chose de très audacieux pour séduire ?","Tu as déjà passé la nuit chez quelqu’un par erreur ?","Tu as déjà reçu un message super gênant d’un ex ?","Tu as déjà fait un strip-tease devant quelqu’un ?",
  "Tu as déjà vécu une histoire de vacances inoubliable ?","Tu as déjà été pris(e) en flagrant délit de drague ?","Tu as déjà vécu un lendemain de soirée très gênant ?","Tu as déjà changé de trottoir pour éviter un ex d’un soir ?","Tu as déjà fait un jeu à boire avec des gages osés ?",
  "Tu as déjà fait un rêve érotique dont tu te souviens ?","Tu as déjà été surpris(e) par tes parents dans un moment gênant ?","Tu as déjà tenté une technique de drague originale ?","Tu as déjà posé un lapin à un rendez-vous ?","Tu as déjà vécu un plan galère avec quelqu’un rencontré en ligne ?",
  "Tu as déjà vécu un moment très romantique ?","Tu as déjà eu un ami ou une amie qui est devenu(e) plus qu’un(e) ami(e) ?","Tu as déjà fait un bisou de réconciliation que tu regrettes ?","Tu as déjà fait quelque chose de très gênant en public avec quelqu’un ?","Tu as déjà été jaloux ou jalouse d’un ex ?"
);
FRIEND_18.push(
  "Son plus gros fantasme","Sa pire expérience amoureuse (version drôle)","Son type physique préféré","La célébrité qu’il ou elle voudrait embrasser","Le lieu le plus insolite où il ou elle a flirté",
  "Son crush de jeunesse","Le plus beau compliment qu’il ou elle ait reçu","Sa chanson pour un slow","Sa pire ligne de drague","Son plus gros râteau",
  "Sa plus grosse folie pour l’amour","Ce qui le ou la séduit en premier chez quelqu’un","Son plus gros red flag en amour","Son plus gros green flag en amour","Son pire rendez-vous",
  "La tenue qui le ou la fait craquer","Le film qui l’a fait rougir","Sa plus grosse honte en amour","Son parfum préféré chez un ou une partenaire","Ce qu’il ou elle regarde en premier chez quelqu’un",
  "L’endroit idéal pour un premier baiser","Son plus long couple","L’activité de rendez-vous parfaite","Son premier amour","La célébrité dont il ou elle est amoureux(se)",
  "Son pire souvenir de soirée","Son meilleur souvenir de soirée","Ce qu’il ou elle ne dirait jamais à son ou sa partenaire","Son plus gros secret d’amour","Sa plus grande peur en amour"
);
DEFIS_18.push(
  "décris son style de drague","décris comment il ou elle embrasse (à ton avis)","décris-le ou décris-la comme un cocktail","décris-le ou décris-la comme le titre d’un film coquin",
  "fais-lui un compliment sexy","décris-le ou décris-la en trois mots coquins","raconte le rendez-vous parfait avec cette personne","décris ce qui la rend irrésistible",
  "décris son défaut le plus sexy","décris son pire défaut en amour","décris-le ou décris-la comme une boisson alcoolisée","décris-le ou décris-la comme un fruit",
  "décris-le ou décris-la comme une chanson sensuelle","décris le premier truc que tu remarques chez cette personne","décris son sex-appeal sans nommer de partie du corps","décris-le ou décris-la comme une destination de vacances torride"
);

const DEFOULE = [
  "☠️ Humour noir|Sur mon lit de mort, mon dernier souhait sera…",
  "☠️ Humour noir|Sur ma tombe, je veux qu’on écrive…",
  "☠️ Humour noir|La cause de décès la plus ridicule serait…",
  "☠️ Humour noir|Au pire moment de mes funérailles, quelqu’un va…",
  "☠️ Humour noir|Mon testament contient une seule clause bizarre : …",
  "☠️ Humour noir|Le dernier mot de {nom} avant sa mort sera sûrement…",
  "☠️ Humour noir|La pire phrase à entendre de la bouche d’un chirurgien : …",
  "☠️ Humour noir|Le pire éloge funèbre jamais prononcé commence par…",
  "😬 Pires situations|Le pire moment pour dire « je t’aime » : …",
  "😬 Pires situations|Le pire endroit pour avoir un fou rire : …",
  "😬 Pires situations|Ce qu’on ne veut jamais lire dans un faire-part : …",
  "😬 Pires situations|La pire phrase à dire en entretien d’embauche : …",
  "😬 Pires situations|Le pire cadeau de mariage : …",
  "😬 Pires situations|Ce qu’on ne veut surtout pas entendre de la bouche du pilote : …",
  "😬 Pires situations|La pire chose à dire à ses beaux-parents au premier repas : …",
  "🔥 Roast entre amis|Le jour où {nom} sera viré(e), ce sera parce que…",
  "🔥 Roast entre amis|Le secret honteux de {nom} dans son historique de recherche : …",
  "🔥 Roast entre amis|Si {nom} écrivait son autobiographie, elle s’appellerait…",
  "🔥 Roast entre amis|Ce que {nom} avouerait sous hypnose : …",
  "🔥 Roast entre amis|La pire excuse que {nom} ait déjà utilisée : …",
  "🔥 Roast entre amis|{nom} serait le premier à mourir dans un film d’horreur parce que…",
  "🔥 Roast entre amis|Le pire défaut de {nom}, version brutalement honnête : …",
  "🤥 Mauvais conseils|Mon pire conseil à un enfant de 5 ans : …",
  "🤥 Mauvais conseils|Mon pire conseil pour un premier rendez-vous : …",
  "🤥 Mauvais conseils|Comment se faire pardonner d’avoir oublié un anniversaire : …",
  "🤥 Mauvais conseils|Mon conseil pour réussir sa vie : …",
  "🤥 Mauvais conseils|Comment se débarrasser d’un cadavre de plante qu’on a tuée : …",
  "🙈 Confessions|Ma confession que je n’ai jamais faite à mes parents : …",
  "🙈 Confessions|Ce que je ferais si j’étais invisible pendant 24 h : …",
  "🙈 Confessions|Ma pire pensée en plein enterrement : …",
  "🙈 Confessions|Je ne l’ai jamais avoué, mais j’ai déjà…",
  "🙈 Confessions|La chose la plus bizarre que j’ai faite quand j’étais seul(e) chez moi : …"
];
const DEFOULE_18 = [
  "🍷 Soirée trash|Le pire truc que j’ai fait en étant ivre : …",
  "🍷 Soirée trash|Le message que je regrette d’avoir envoyé à 2 h du matin : …",
  "🍷 Soirée trash|Ma pire excuse pour quitter un lit à 3 h du matin : …",
  "🍷 Soirée trash|Le lendemain de soirée, je me suis réveillé(e) avec…",
  "🌶️ Entre adultes|Le pire endroit où j’ai failli me faire surprendre en pleine action : …",
  "🌶️ Entre adultes|Le titre du film pour adultes de ma vie : …",
  "🌶️ Entre adultes|La pire phrase à entendre au lit : …",
  "🌶️ Entre adultes|Mon plan drague le plus catastrophique : …",
  "🌶️ Entre adultes|Le pire cadeau coquin à offrir à ses beaux-parents : …",
  "🔥 Roast +18|Ce que {nom} cache dans son tiroir de chevet : …",
  "🔥 Roast +18|La note que {nom} mérite au lit, et pourquoi : …",
  "🔥 Roast +18|{nom} s’est fait surprendre à… et n’a jamais voulu en reparler."
];

const ROAST = [
  "🏠 Colocation et vie commune|Pourquoi tu ne ferais jamais colocation avec {nom}…",
  "🏠 Colocation et vie commune|Le pire de {nom} en voyage…",
  "🏠 Colocation et vie commune|Pourquoi tu ne prêterais pas ta voiture à {nom}…",
  "🏠 Colocation et vie commune|Pourquoi tu ne laisserais pas {nom} garder ton chien…",
  "🏠 Colocation et vie commune|Pourquoi tu ne laisserais pas {nom} seul(e) chez toi avec les clés…",
  "🤝 Amitié et confiance|Pourquoi tu ne confierais pas un secret à {nom}…",
  "🤝 Amitié et confiance|Le défaut que tout le monde voit chez {nom} mais que personne n’ose dire…",
  "🤝 Amitié et confiance|Pourquoi {nom} serait un(e) mauvais(e) témoin de mariage…",
  "🤝 Amitié et confiance|Ce qui nous agace le plus chez {nom} en soirée…",
  "💔 Vie sentimentale|Pourquoi {nom} est (ou a été) célibataire…",
  "💔 Vie sentimentale|Pourquoi la dernière relation de {nom} a fini…",
  "💔 Vie sentimentale|Le red flag numéro 1 de {nom}…",
  "💼 Pro|Pourquoi {nom} serait un(e) collègue insupportable…",
  "💼 Pro|Pourquoi {nom} ne tiendrait pas une semaine comme chef(fe)…",
  "📺 Fun|Si {nom} participait à une télé-réalité, il ou elle serait celui ou celle qui…",
  "📺 Fun|Ce que {nom} répond toujours et qui nous épuise…",
  "📺 Fun|Sur son CV, {nom} devrait avouer…"
];
const ROAST_18 = [
  "🌶️ Roast +18|Ce qui fait fuir {nom} au bout de trois dates…",
  "🌶️ Roast +18|Pourquoi on ne ferait pas un plan à trois avec {nom}…"
];

/* ---------- Banque ÉTENDUE n°3 : encore plus de questions, soft et coquines ---------- */
VOTE.push(
  "Qui rirait à un enterrement sans le vouloir ?","Qui serait le pire témoin à un mariage ?","Qui adopterait un animal totalement impossible ?",
  "Qui oublierait son propre anniversaire ?","Qui finirait influenceur ou influenceuse malgré lui ou elle ?","Qui parle à son chat comme à un humain ?",
  "Qui survivrait le moins longtemps sans téléphone ?","Qui ferait un malaise en voyant du sang ?","Qui vendrait son meilleur ami pour une place de concert ?",
  "Qui a la pire mémoire des prénoms ?","Qui ferait semblant de travailler en visio ?","Qui gagnerait un concours de sieste ?",
  "Qui dirait oui à un tatouage à 4 h du matin ?","Qui mangerait les restes des autres sans demander ?","Qui finirait coincé(e) dans un ascenseur avec son ex ?",
  "Qui serait le premier ou la première à craquer dans Koh-Lanta ?","Qui négocierait avec un cambrioleur ?","Qui chante sous la douche en croyant être seul(e) ?",
  "Qui pleure devant les pubs de Noël ?","Qui regarderait une série entière en une nuit avant un examen ?"
);
VOTE_18.push(
  "Qui enverrait un message coquin au mauvais destinataire ?","Qui serait capable de draguer le ou la prof de yoga ?","Qui assume le plus ses fantasmes ?",
  "Qui ferait un plan d’un soir avec quelqu’un rencontré dans un ascenseur ?","Qui serait le plus à l’aise dans un club échangiste ?",
  "Qui rougirait le plus en lisant ses propres messages à voix haute ?","Qui serait le meilleur ou la meilleure en dirty talk ?",
  "Qui finirait en couple avec quelqu’un rencontré ce soir ?","Qui a le plus de talents cachés sous la couette ?","Qui craquerait le premier pour un massage qui dérape ?",
  "Qui passerait une nuit entière à parler avant de passer à l’acte ?","Qui est le plus joueur ou joueuse en matière de défis coquins ?",
  "Qui a déjà eu un rêve coquin avec quelqu’un de cette pièce ?","Qui serait incapable de rester sage tout un week-end ?","Qui embrasserait le premier ou la première à un jeu de la bouteille ?"
);
ANEC.push(
  "Un fou rire pendant un moment très sérieux","Une fois où tu as parlé dans ton sommeil devant des témoins","La pire chose que tu aies faite pour être populaire",
  "Une fois où tu t’es perdu(e) à deux rues de chez toi","Un moment où tu as fait semblant de connaître quelqu’un","Ta pire expérience de colocation",
  "Une fois où tu as raté une occasion en or par timidité","Un mensonge qui t’a poursuivi pendant des années","Une fois où tu as été pris(e) en train de mentir",
  "Le pire repas que tu aies préparé pour quelqu’un","Une fois où tu t’es trompé(e) de voiture","Un objet que tu as cassé en essayant de le réparer",
  "Ta pire honte devant tes beaux-parents","Une fois où tu as ri au pire moment d’un film","Un pari stupide que tu as perdu"
);
ANEC_18.push(
  "Une fois où tu as dit le mauvais prénom au mauvais moment","Un rencard qui s’est terminé plus vite que prévu","Une fois où tu as fait semblant d’adorer… et c’était nul",
  "Un message vocal coquin raté","Une fois où tu t’es réveillé(e) sans savoir où tu étais","Un plan drague qui a eu l’effet inverse",
  "Une fois où tu as surpris quelqu’un dans une situation intime","Ta pire expérience avec un jouet coquin","Une nuit blanche que tu ne regrettes pas",
  "Un baiser qui a tout déclenché… ou tout gâché","Une fois où tu as menti sur ton âge pour séduire","Ta pire « marche de la honte »"
);
YESNO.push(
  "Tu as déjà ri d’une blague sans la comprendre ?","Tu as déjà oublié pourquoi tu étais entré(e) dans une pièce ?","Tu as déjà mangé quelque chose en cachette dans un magasin ?",
  "Tu as déjà fait croire que tu savais nager ?","Tu as déjà googlé comment faire quelque chose de très simple ?","Tu as déjà envoyé un message au mauvais groupe ?",
  "Tu as déjà fait semblant d’aimer la cuisine de quelqu’un ?","Tu as déjà dormi avec la lumière allumée par peur ?","Tu as déjà perdu tes clés dans ta propre maison ?",
  "Tu as déjà fait semblant d’être occupé(e) pour ne pas aider quelqu’un ?","Tu as déjà parlé à une photo ?","Tu as déjà applaudi tout seul(e) devant ta télé ?"
);
YESNO_18.push(
  "Tu as déjà fait l’amour en pleine nature ?","Tu as déjà été surpris(e) en train de te déshabiller ?","Tu as déjà fait un baiser sous l’eau ?",
  "Tu as déjà eu un fantasme sur un personnage fictif ?","Tu as déjà fait semblant d’être quelqu’un d’autre en ligne pour flirter ?",
  "Tu as déjà dragué quelqu’un juste pour rendre quelqu’un d’autre jaloux ?","Tu as déjà été surpris(e) par tes parents dans une situation embarrassante ?",
  "Tu as déjà envoyé une photo de toi que tu regrettes ?","Tu as déjà fait une nuit blanche pour une raison coquine ?","Tu as déjà eu un crush sur un personnage de série ?",
  "Tu as déjà fait un strip-tease improvisé ?","Tu as déjà gardé un souvenir coquin d’un(e) ex ?"
);
CONFESSION.push(
  "Tu as déjà cassé quelque chose de valeur et caché les morceaux ?","Tu as déjà menti à un entretien d’embauche ?","Tu as déjà lu le journal intime de quelqu’un ?",
  "Tu as déjà fait un vœu que tu savais impossible à tenir ?","Tu as déjà triché à un jeu en famille ?","Tu as déjà abandonné quelqu’un en plan ?",
  "Tu as déjà ri de la malchance de quelqu’un ?","Tu as déjà fait une promesse les doigts croisés ?","Tu as déjà copié le style de quelqu’un sans jamais l’avouer ?",
  "Tu as déjà fait semblant d’adorer un cadeau que tu as revendu ?"
);
CONFESSION_18.push(
  "Tu as déjà fait quelque chose de très osé dans un lieu public ?","Tu as déjà eu une aventure avec quelqu’un de ce groupe ?","Tu as déjà menti sur ton passé amoureux ?",
  "Tu as déjà eu une relation que personne ne connaît ?","Tu as déjà regretté un baiser immédiatement après ?","Tu as déjà fait semblant d’être pris(e) pour éviter un rencard ?",
  "Tu as déjà eu un fantasme sur quelqu’un d’interdit ?","Tu as déjà envoyé un sexto à la mauvaise personne ?","Tu as déjà fait un plan à trois ?",
  "Tu as déjà fait semblant au lit ?"
);
PUNCH.push(
  "Le pire surnom de {nom} au lycée, c’était…","{nom} serait banni(e) d’un buffet à volonté pour avoir…","La première recherche Google de {nom} au réveil : …",
  "{nom} pourrait être payé(e) pour…","La pire habitude de {nom} en voiture : …","Si {nom} avait une devise, ce serait…",
  "Le plat que {nom} ne finira jamais : …","{nom} a déjà été confondu(e) avec…","Le rêve le plus bizarre de {nom} : …",
  "Dans un film, {nom} serait crédité(e) comme…","Le secret le moins bien gardé de {nom} : …","{nom} a un jour essayé de… et a échoué devant tout le monde",
  "Le pire compliment que {nom} puisse recevoir : …","{nom} finirait aux infos pour…","La danse signature de {nom} s’appelle…"
);
PUNCH_18.push(
  "Le profil de {nom} sur une appli coquine : …","Le pire surnom de {nom} au lit : …","{nom} serait prêt(e) à tout pour… sauf pour…",
  "La pire phrase de drague entendue par {nom} : …","Ce que {nom} ferait pour une nuit avec sa célébrité préférée : …","Le plus gros mensonge de {nom} à un rencard : …",
  "{nom} a déjà été surpris(e) en train de…","La technique de séduction la plus nulle de {nom} : …","Ce que {nom} ne racontera jamais à ses parents : …",
  "Le pire cadeau coquin que {nom} pourrait offrir : …","{nom} pense être doué(e) au lit, en réalité…","La pire excuse de {nom} pour quitter un lit : …"
);
FRIEND.push(
  "Son pire fou rire","Sa plus grande honte d’enfance","Le film qu’il ou elle connaît par cœur","Son pire achat impulsif",
  "Sa phrase préférée pour râler","Le truc qu’il ou elle ne sait pas cuisiner","Sa plus grande peur irrationnelle","Son rêve le plus bizarre",
  "Le surnom qu’il ou elle déteste","Sa pire coupe de cheveux","Ce qu’il ou elle fait le dimanche matin","Son premier téléphone",
  "Sa pire galère de transport","Le talent qu’il ou elle surestime","Son plat de honte préféré"
);
DEFIS.push(
  "décris-la comme une météo","décris sa façon de rire","décris-la comme une appli","invente sa vie dans 20 ans",
  "décris son pire défaut avec amour","décris-la comme une danse","décris son style en trois mots","raconte sa réaction face à une araignée"
);
DEFOULE.push(
  "😬 Pires situations|Le pire moment pour avoir une crampe : …","😬 Pires situations|Ce qu’on ne veut jamais entendre au réveil : …",
  "🔥 Roast entre amis|{nom} serait capable de louper…","🔥 Roast entre amis|La plus grosse flemme de {nom}, c’est…",
  "🤥 Mauvais conseils|Mon pire conseil pour un premier jour de travail : …","🙈 Confessions|Ce que je fais quand je suis seul(e) dans un ascenseur : …",
  "☠️ Humour noir|La pire inscription sur un cadeau d’anniversaire : …","😬 Pires situations|Le pire moment pour que ton téléphone sonne à fond : …"
);
DEFOULE_18.push(
  "🍷 Soirée trash|Le truc le plus honteux que j’ai fait pour un verre gratuit : …","🌶️ Entre adultes|Ce que je ne veux jamais que ma mère lise dans mes messages : …",
  "🔥 Roast +18|Le pire surnom que {nom} aurait au lit : …","🌶️ Entre adultes|Ma pire excuse pour ne pas finir la nuit : …"
);
ROAST.push(
  "🏠 Colocation et vie commune|Pourquoi {nom} finirait par payer tous les coups à boire…","💼 Pro|Pourquoi {nom} ne survivrait pas une semaine en télétravail…",
  "📺 Fun|Ce que {nom} ferait comme première dépense en gagnant au loto…","🤝 Amitié et confiance|Pourquoi {nom} serait le pire garde du corps…",
  "💔 Vie sentimentale|Pourquoi les ex de {nom} se reconnaîtraient dans un groupe de soutien…","📺 Fun|Pourquoi {nom} serait éliminé(e) en premier d’une télé-réalité de survie…"
);

