# État du projet — ki2nousv3

> Document de reprise pour les sessions OpenCode. Dernière mise à jour : **18 novembre 2026**, après la fusion des deux vagues : **La Table Des Menteurs** (jeu 3D temps réel autoritaire côté serveur : carte cible limitée aux figures et à l'As, dévoilement de 5 s, contestation géante, levée/abaissement des cartes visible par tous, main 3D recadrée, personnages assis corrigés et éclairage du saloon renforcé) et **Skyjo + UNO** complets en multijoueur, intégrés au hub et au Salon, avec le retour compact au Salon dans les récaps intermédiaires et les corrections de jouabilité (Undercover, Make It Meme, Blind Test, Poker Face). Modifications non commitées à la date de rédaction.
>
> **Emplacement réel de l'application : `app/`.** C'est le dossier qui contient `package.json`, `src/`, `public/` et `api/`. La racine du dépôt ne contient que la documentation et `.opencode/`. Toutes les commandes npm doivent être lancées depuis `app/`.

## Résumé
**Le Hub de Soirée** est une application web de jeux de groupe : un hub React/Vite, plusieurs jeux autonomes accessibles depuis un navigateur, et un serveur Hono qui relaie les salons temps réel, conserve un instantané de reprise et gère le classement cumulé de la soirée. La logique de chaque partie est exécutée dans le navigateur de l'hôte ; le serveur ne la calcule pas, **sauf pour La Table Des Menteurs**, dont le moteur est autoritaire côté serveur.

## État actuel vérifié (18 novembre 2026)
- Frontend du hub : React 19, TypeScript 5.9 (strict), Vite 7, React Router 7.
- Pages des jeux : HTML/CSS/JavaScript autonomes sous `public/`, avec scripts globaux et ordre de chargement à respecter.
- Code commun des jeux : `public/shared/` (`net.js`, `profile.js`, `party.js`, `gages.js`, `qr.js`, `theme.js`, **`library.js`**) et thèmes dans `public/themes/`.
- Backend : Hono 4 + `@hono/node-server`, relais SSE + REST sous `api/`, sans base de données. Route `GET /api/youtube/playlist?list=…` pour récupérer les vidéos d'une playlist YouTube.
- Tests présents : `api/lib/relay.test.ts` (13 tests du relais), `api/lib/makeitmeme-room.test.ts` (3 tests des helpers de salon Make It Meme), `api/lib/youtube.test.ts` (3 tests de la playlist) et `api/lib/menteurs.test.ts` (14 tests du moteur La Table Des Menteurs), soit **33 tests Vitest**.
- Scripts npm : `dev`, `build`, `preview`, `start`, `check`, `format`, `test`.
- Déploiement documenté : Render (`npm ci && npm run build` puis `npm start`) ou `Dockerfile`.
- `node_modules` installé dans `app/` : `npm run check`, `npm test` et `npm run build` s'exécutent.
- Dépôt Git : HEAD = `c6fdc72`. Modifications non commitées depuis : Skyjo et UNO (nouveaux), les pages Blind Test, Make It Meme, Photo Roulette, Poker Face, Qui de nous ?, Les Petites Vérités, Undercover, le Salon, `party.js`, le hub, le serveur YouTube et ce document. Rien n'est commité ni poussé.

### Convention de lecture
Dans ce document, **« terminé »** signifie : fonctionnalité présente dans le code, cohérente avec l'architecture partagée et sans bug bloquant identifié à la lecture. Cela ne vaut pas validation en navigateur ni sur plusieurs téléphones : les vérifications réellement exécutées sont indiquées plus bas.

## Jeux et espaces repérés

| Espace | Chemin | Statut réel |
|---|---|---|
| Hub React | `src/` | Terminé dans le code : 12 tuiles (Salon + 11 jeux), carrousel, réglages, musique, PWA. Seul le badge « 18+ » subsiste. |
| Salon de la soirée | `public/soiree/` | Terminé pour **11 jeux** : Undercover, Poker Face, Photo Roulette, Blind Test, Codenames, Make It Meme, La Table Des Menteurs, Qui de nous ?, Les Petites Vérités, **Skyjo**, **UNO**. |
| Undercover | `public/undercover/` | Terminé dans le code : rôles, mots personnalisables, salon public, gages, scores, snapshot. Vote dérivé côté hôte/invités depuis cette vague. |
| Poker Face | `public/pokerface/` | Terminé dans le code : caméra/MediaPipe, médias, téléphone-caméra WebRTC (**négociation symétrique**, renégociation à l'ajout de piste, reprise après reconnexion), jointure en cours de partie, bibliothèque locale, gages, scores, flagrant délit des perdants. |
| Photo Roulette | `public/photoroulette/` | Terminé dans le code : **réserve conservée toute la partie**, **16 photos (10 vidéos) tirées par joueur et par manche**, validation, questions une par une, récap de manche, `Lib`, snapshot. |
| Blind Test | `public/blindtest/` | Terminé dans le code : banque intégrée ou playlist YouTube (**repli serveur `/api/youtube/playlist`**), extraits 10–30 s, **reprise après geste si la lecture automatique est bloquée**, modes privé/visible, scores, snapshot. |
| Qui de nous ? | `public/quidenous/` | Terminé dans le code : 12 types de manches, packs, photos, scores cumulés, `Party.report`. Contient un mode « piquant +18 » non signalé comme tel dans le hub (voir bugs). |
| Les Petites Vérités | `public/verites/` | Terminé dans le code : barrage 18+ explicite, vérités, échange, bluff, scores. |
| Codenames | `public/codenames/` | **Intégré au Salon** : codes 4 caractères, `Net.enter`, `Sess`, `Party.listen`/`report`/`endCard`, snapshot `{S,H}`, `R.onPromote`, score de soirée 100/0. |
| Make It Meme | `public/makeitmeme/` | Multijoueur via le relais Hono : salons 4 caractères, hôte autoritaire, reprise, bots, vote, classement de soirée, proposé dans le Salon. Drag tactile corrigé, memes téléchargeables au récap. |
| La Table Des Menteurs | `public/menteurs/` + `api/lib/menteurs.ts` | **Jeu 3D temps réel autoritaire côté serveur** : saloon Three.js, 2–8 joueurs, cartes réelles, cible V/D/R/A, dévoilement 5 s, contestation au revolver, reprise, classement de soirée. |
| Skyjo | `public/skyjo/` | Terminé dans le code : règles complètes (150 cartes, grille 4×3, colonnes de 3, dernier tour, doublement, objectif 50/100), hôte autoritaire, snapshot, promotion, classement de soirée, Salon. |
| UNO | `public/uno/` | Terminé dans le code : paquet officiel de 108 cartes, mains privées, +2/+4, inversion/passe-tour, choix de couleur, contestation du +4, UNO et dénonciation, manche unique/200/500, Salon. |
| Petit Bac Boom | — | **Supprimé** : la tuile du hub a été retirée ; plus aucune référence dans `src/`. |

## Fonctionnalités terminées (dans le code)

### Hub
- Catalogue de 11 tuiles en carrousel 3D (Salon + 10 jeux), navigation clavier (flèches/Entrée), glisser-swipe, sélection au clic.
- Réglages persistés (`soiree:set`) : thème clair/sombre, animations (`off`/`light`/`full`), musique et volume.
- Musique générative WebAudio (`src/hubAudio.ts`), coupée quand l'onglet est masqué.
- PWA : manifest, icônes, service worker, page hors-ligne, métadonnées de partage avec `%ORIGIN%` remplacé côté serveur.
- Badges : seuls les badges utiles restent (`18+` pour Les Petites Vérités) ; les badges « Nouveau » ont été retirés de `Home.tsx`.

### Salon de la soirée
- Création/rejoindre un salon à 4 caractères, QR code, partage, copie du lien.
- Présence en direct, couronne de l'hôte, passage de relais automatique, reprise après rechargement.
- Choix du jeu par l'hôte diffusé à tous (`go`), classement de soirée cumulé, gages partagés.
- Retour au salon depuis chaque jeu intégré (`Party.endCard`, `Party.listen`).
- La liste `GAMES` expose les **11 jeux** du hub (Codenames, La Table Des Menteurs, Skyjo et UNO ajoutés).
- Retour au Salon sans perdre le code depuis les récaps intermédiaires : `Party.leaveCard` et `Party.endCard({ compact: true })`, utilisés par Blind Test, Photo Roulette, Les Petites Vérités, Qui de nous ?, Undercover, Make It Meme, Poker Face, Skyjo et UNO.

### Jeux intégrés au salon (11)
- Undercover, Poker Face, Photo Roulette, Blind Test, Codenames, Make It Meme, La Table Des Menteurs, Qui de nous ?, Les Petites Vérités, Skyjo, UNO : `Net.enter`/`Net.join`, session `Sess`, `Party.report`, snapshot `R.snap`, `onPromote`/`onDemote`, retour au salon.
- Mode sombre : chaque jeu expose un thème clair/sombre via `public/shared/theme.js` (bouton flottant) ou son panneau intégré.
- Barrières d'âge : case 18+ et mémorisation `soiree:18ok` pour Les Petites Vérités ; confirmation pour la banque de gages 18+ dans `gages.js`. À conserver.

### Photo Roulette (refonte en manches)
- **Réserve locale** : chaque joueur sélectionne jusqu'à 400 fichiers (photos ou vidéos), envoyés à l'hôte par lots avec budget de 30 s, miniatures progressives, déduplication et ajout par lot. La réserve reste disponible toute la partie.
- **Manches** : `S.cfg.rounds` (1–10, défaut 3) et `S.cfg.qper` (3–20, défaut 8). Chaque manche commence par un tirage de `maxN()` = **16 photos ou 10 vidéos par joueur**, priorité aux médias non encore utilisés (`L.used`), recyclage des plus anciens quand la réserve est épuisée.
- **Validation** : chaque joueur valide son tirage ; l'hôte ne peut lancer que lorsque tout le monde a validé (ou passé). Toute modification du tirage (ajout, ✕) invalide la validation. Filet de sécurité : `startHello()` renvoie la validation toutes les 4 s.
- **Questions** : l'hôte compose un deck en tourniquet à partir des tirages validés de tous les joueurs (plus d'éventuelles photos plantées), puis en extrait `S.qn = min(qper, deck)`. Une question à la fois, options = tous les joueurs, le propriétaire de la photo ne vote pas ; les points dépendent de la vitesse.
- **Phases** : `lobby` → `round` → `reveal` → `mrecap` (récap des points de la manche) → `ready` (tirage de la manche suivante) → … → `end`. Les options de vote sont verrouillées jusqu'à `S.t0` (+900 ms) pour éviter les votes à l'aveugle.
- **Remplacement** : bouton ✕ sur chaque vignette ; la photo est écartée et remplacée automatiquement par une autre de la réserve, la validation est réinitialisée.
- **Persistance** : les médias de la manche courante sont enregistrés dans IndexedDB (`Lib`, `game: "photoroulette"`, `ref: "m<manche>"`) et restaurés après rechargement. La réserve de fichiers, elle, ne survit pas au rechargement (objets `File` en mémoire).
- Fin de partie : podium, statistiques (meilleur score, plus rapide, série, précision), `Party.report`, rejouer repartant du lobby de proposition.

### Poker Face
- Caméra/MediaPipe local, médias, téléphone-caméra via WebRTC, jointure en cours de partie et renvoi de `join`.
- **WebRTC fiabilisé (16 novembre)** : négociation symétrique « perfect negotiation » (`_polite = ME > id`, rollback en cas de collision), offre émise des deux côtés au handshake `hi`, renégociation dès qu'une piste vidéo est ajoutée (caméra du téléphone branchée après l'entrée, changement de caméra), recréation des `RTCPeerConnection` `failed`/`closed`/bloquées, file d'attente des candidats ICE, cache des flux distants rattaché aux tuiles recréées, `video.play()` de secours, temporisation exponentielle des handshakes (3 s → 30 s).
- `Net.ice()` est attendu avant `enter()`, pour que la première connexion utilise déjà STUN/TURN.
- **Bibliothèque locale** : modale « 📚 Ma bibliothèque » alimentée par `public/shared/library.js`, auto-sauvegarde des contenus et restauration après refresh.
- Jauge de self-control agrandie, flagrant délit des perdants consentants (~10 s), galerie plafonnée à 60, gages et scores.

### Blind Test
- Page autonome `public/blindtest/index.html` + banque `bank.js` (133 morceaux, 12 thèmes, correspondance souple) + thème `public/themes/blindtest.css`.
- Gate sonore : la lecture démarre après un geste utilisateur, avec relance automatique après geste si le navigateur bloque l'autoplay ; détection de lecture et messages de secours ; playlists de l'hôte prioritaires.
- 10 à 30 s d'extrait, nombre de manches, mode privé/visible, réponse titre et/ou artiste, points de vitesse, révélation, podium, `Party.report`.

### Bibliothèque locale partagée
- `public/shared/library.js` expose `window.Lib` (`list`, `get`, `put`, `del`, `clear`, `trim`) au-dessus d'IndexedDB : base `soiree-lib`, store `items`, index `game` et `ts`.
- Chaque jeu range ses contenus dans son espace (`game`), avec `partyId` et `by` pour retrouver les siens.
- Utilisée par Poker Face (contenus réutilisables) et Photo Roulette (photos de la manche courante).

### Codenames
- Règles complètes (deux équipes, 25 cartes, maître-espion, assassin, listes personnalisées, pause, journal).
- Intégration Salon : codes 4 caractères, création avec nouvel essai en cas de collision, `Net.enter`, `Sess`, `Party.listen`, snapshot `{S,H}`, `R.onPromote`, `Party.report` (100/0) et `Party.endCard`.

### La Table Des Menteurs
- **Moteur autoritaire côté serveur** (`api/lib/menteurs.ts`, routes `api/routes/menteurs.ts`) : paquet complet de 52 cartes + 2 jokers, mains privées, cible **Valet / Dame / Roi / As uniquement**, validation des tours et des cartes, chronos synchronisés, contestation, révélation, barillet 1/6, élimination et classement.
- **Salons 4 caractères** : 2–8 joueurs, hôte, transfert automatique, exclusion, reprise après rechargement, `Sess`/`soiree:sess:mt`, classement de soirée.
- **Dévoilement de la cible** : 5 s au centre de la table pendant lesquelles toute annonce est refusée (`roundAt`), puis la carte 3D disparaît et un badge « CIBLE » reste en bas à droite au-dessus des noms.
- **Cartes levées / baissées** : action `raise {v}` publique, indicateur 🃏↑/🃏↓ dans la liste des joueurs et animation de l'éventail tenu par chaque personnage.
- **Scène 3D** (`public/menteurs/scene.js`) : saloon procédural éclairé, table centrale, vraies cartes dessinées au canvas, revolvers posés sur la table et pris seulement pour tirer, mélange animé, main à la première personne qui se lève/se baisse, personnages assis dont seul le buste s'anime.
- **Interface** : contestation géante « ⚔️ Il ment ! », HUD mobile/tactile, journal, pause/passage/terminer pour l'hôte, sons WebAudio (`audio.js`) et crédits dans l'aide.
- **Droits** : décor, cartes et personnages procéduraux originaux ; seul le revolver low-poly de **Quaternius (CC0, Poly Pizza)** est un modèle externe.

### Skyjo
- Page `public/skyjo/index.html` + thème `public/themes/skyjo.css` : paquet de **150 cartes** (-2 ×5, -1 ×10, 0 ×15, 1–12 ×10), grille de **4 colonnes × 3 lignes** (12 cartes), révélation initiale de 2 cartes, le plus haut total visible commence.
- Tour : piocher ou prendre la défausse, échanger avec une carte de sa grille, ou défausser puis révéler une carte. Une **colonne de 3 cartes identiques** est retirée immédiatement. Dès qu'un joueur a retourné toutes ses cartes, les autres jouent un dernier tour.
- Score de manche = somme des valeurs visibles ; le **déclencheur double son score** s'il n'a pas strictement le plus petit total. Scores cumulés, objectif **50 ou 100 points** (défaut 100), le plus petit total gagne.
- Hôte autoritaire, `skipTurn`/`autoReveal` de secours, snapshot, promotion d'hôte, `Party.report` avec score négatif (`s:-p.sc`) pour que le plus petit total soit classé premier, retour au Salon compact puis complet.

### UNO
- Page `public/uno/index.html` + thème `public/themes/uno.css` : **paquet officiel de 108 cartes** (4 × 25 + 8 jokers), 7 cartes par joueur, défausse visible et cartes lisibles sur mobile.
- L'hôte garde toutes les mains ; les cartes partent en messages ciblés `priv`, l'état public ne contient que les compteurs, la défausse et les informations de tour.
- Règles : couleur/symbole, +2, passe-tour, inversion (**= passe-tour à 2 joueurs**), joker et **+4 jouable seulement sans carte de la couleur en cours**. Choix de couleur limité à 20 s puis choix aléatoire automatique.
- **Contestation du +4** : fenêtre de 15 s, acceptation automatique à l'expiration, +6 si la contestation est perdue et +4 pour le joueur fautif si elle est gagnée.
- **UNO** : annonce obligatoire à une carte, fenêtre de dénonciation de 8 s (1,2 s de grâce) et pénalité de 2 cartes. Manche gagnée en posant sa dernière carte ; score = somme des points restants (chiffres = valeur, actions = 20, jokers = 50).
- Objectif **manche unique / 200 / 500 points**, `skipTurn`, snapshot, promotion d'hôte, `Party.report`, retour au Salon compact puis complet.

### Correctifs de jouabilité (17 novembre)
- **Undercover** : l'ordre de passage est tiré à chaque manche et évite explicitement l'ordre précédent et le même premier joueur ; retour compact au Salon au récap de manche.
- **Make It Meme** : drag réécrit en Pointer Events délégués sur `document` (le canvas recréé ne perd plus ses écouteurs, coin inférieur droit inclus), chrono lisible en thème sombre, galerie des memes au récap de manche avec bouton **💾 Enregistrer** (`downloadMeme`, reconstruction hors écran si l'image a été retirée du snapshot), retour compact au Salon.
- **Blind Test** : repli serveur `GET /api/youtube/playlist` quand l'API IFrame ne remplit pas la liste ; `L.unlocked` mémorise l'autorisation audio, le son n'est plus coupé sur un simple buffering et le bouton « Activer le son » ne réapparaît plus à chaque manche.
- **Poker Face** : l'overlay rouge de craquage reste ~3 s (ou disparaît au clic) puis la vidéo revient ; la tuile caméra reste marquée « ÉLIMINÉ » via `S.pl[].out` jusqu'à la manche suivante. Calibration renforcée : pose du visage mémorisée, mouvements de tête ignorés (yaw/pitch/roll/scale), seuils relevés et détection à deux expressions concordantes.
- **Retour au Salon** : `Party.leaveCard` et `Party.endCard({ compact: true })` aux récaps intermédiaires de Blind Test, Photo Roulette, Les Petites Vérités, Qui de nous ?, Undercover, Make It Meme, Poker Face, Skyjo et UNO. L'hôte diffuse `back` et `Party.listen` ramène tous les joueurs au même code.

### Serveur et partagé
- Relais en mémoire : salons, présence, hôte, événements ciblés ou diffusés, snapshot, reprise, salons publics (Undercover), classement.
- **YouTube** : `api/lib/youtube.ts` valide l'identifiant de playlist (`^[A-Za-z0-9_-]{16,80}$`), lit le flux RSS puis la page publique en repli, déduplique et met en cache 10 min. `GET /api/youtube/playlist?list=…` renvoie `{ ok, ids }` (400 playlist invalide, 404 illisible/vide), monté dans `api/boot.ts`.
- `net.js` : reconnexion exponentielle, heartbeat, envois fiables jusqu'à 20 s, synchronisation d'horloge (`Net.clock`), reprise de session, promotion/démotion d'hôte.
- Limites serveur : 2 000 salons, 32 connexions/salon, TTL salon vide 20 min, grâce d'hôte 20 s, parties 12 h, code de soirée 4 caractères, snapshot 2 Mo, événement 16 Mo, score 64 Ko.
- ICE/TURN optionnel (`METERED_*`, `TURN_*`) pour Poker Face en 4G.

## Fonctionnalités en cours / incomplètes

- **Tuile « verrouillée »** : la propriété `locked` et le cadenas existent dans `Home.tsx`, mais aucun jeu ne l'utilise.
- **Salons publics** : implémentés côté serveur et utilisés uniquement par Undercover ; pas de découverte globale dans le hub.
- **Tests client/E2E** : absents. Aucun test automatisé de `net.js`, `party.js`, des pages de jeux ni d'un parcours multi-téléphones ; les parcours sont vérifiés manuellement en navigateur.
- **Photo Roulette : réserve après rechargement** — seules les photos de la manche courante sont persistées ; les fichiers de la réserve doivent être re-sélectionnés après un refresh.
- **Bibliothèque** — pas d'interface de gestion globale (suppression/édition) hors des jeux qui l'utilisent ; purge manuelle non exposée.

## Bugs et écarts identifiés

### Bloquants
Aucun bloquant connu à la lecture du code.

### Corrigés le 16 novembre 2026 (Poker Face WebRTC)
- **Tuiles noires (pseudo + cadre seulement)** : la vidéo distante n'était pas rattachée quand la piste arrivait après la création de la tuile, ou quand elle était ajoutée plus tard (caméra du téléphone). `ontrack` et `attachStream()` alimentent désormais un cache `L.remStreams` réutilisé par `tile()`, et toute piste ajoutée déclenche une renégociation (`requestOffer`).
- **Deux joueurs du même salon ne se voyaient pas après reconnexion** : seul le plus petit identifiant émettait une offre, et un `hi` reçu alors qu'une connexion existait déjà était ignoré. Les deux côtés peuvent désormais offrir (perfect negotiation), le récepteur d'un `hi` propose une offre s'il a une caméra live, et `closePc()` remet le compteur de handshake à zéro.
- **Connexions bloquées** : les PC `failed`/`closed`. `have-local-offer`/`have-remote-offer` de plus de 9 s et `disconnected` de plus de 7 s sont fermées puis recréées ; les candidats ICE précoces sont mis en file jusqu'à la description distante ; les handshakes sont retentés avec un délai exponentiel par joueur au lieu d'une boucle serrée.
- **Vidéo silencieuse** : `video.play()` est rappelé après rattachement (autoplay parfois bloqué), et le flux local est repris sur la tuile « moi » après un changement de caméra.

### Corrigés le 17 novembre 2026 (vague Skyjo/UNO et jouabilité)
- **Undercover** : l'ordre de passage change réellement à chaque manche (évite l'ordre identique et le même premier joueur), au lieu de retomber parfois sur le même mélange.
- **Make It Meme** : le déplacement d'un texte ne se bloquait plus dans le coin inférieur droit après un re-rendu du canvas (écouteurs Pointer Events délégués sur `document`) ; chrono du thème sombre lisible ; memes téléchargeables depuis le récap de manche ; retour compact au Salon.
- **Blind Test** : les playlists YouTube sont récupérées par le serveur quand l'API IFrame échoue ; l'autorisation audio est mémorisée et le bouton « Activer le son » ne réapparaît plus à cause d'un buffering.
- **Poker Face** : l'overlay rouge de craquage reste 3 s puis la vidéo revient, la caméra reste marquée éliminée jusqu'à la manche suivante ; la calibration ignore les mouvements de tête et utilise des seuils renforcés.
- **Retour au Salon** : cartes de retour compactes aux récaps intermédiaires, code conservé et retour groupé des invités.

### Corrigés le 16 novembre 2026 (passe de robustesse)
- **Blind Test** : `L.ok`/`L.fb` sont réinitialisés à chaque nouvelle manche côté invité ; un hôte rechargé ou promu en pleine manche retrouve l'extrait et efface `S.loading` ; les réponses d'un joueur inconnu sont ignorées ; la promotion ne diffuse plus `play` deux fois.
- **Photo Roulette** : le remplacement ✕ envoie la clé du média et l'hôte retire le bon média (repli sur l'index si la clé manque) ; les médias plantés ne sont inclus que si `S.cfg.plant` est actif et si leur type correspond à la manche ; l'écran de fin ne plante plus avec un classement vide.
- **Codenames** : `pick25()` nettoie, déduplique et complète depuis `LIB` pour obtenir exactement 25 mots uniques, même avec une liste personnalisée contenant des doublons ou des espaces.
- **Undercover** : un joueur qui arrive en cours de partie reçoit un message explicite (limité à un toutes les 8 s) au lieu de rester bloqué ; il est automatiquement accepté au salon suivant.
- **Les Petites Vérités** : la vérité assignée reste disponible jusqu'au vote ; `skipPhase("mix")` relance réellement `doMix()` ; un hôte rechargé en plein mélange reprend le mélange ; l'exclusion enregistre `S.banned`, renvoie `kick` et résiste à une nouvelle tentative de jointure ; l'écran final masque la barre d'administration et `finishGame()` est idempotent ; la promotion peut ajouter l'hôte manquant en cours de partie ; une copie locale horodatée évite de revenir à la manche précédente quand le snapshot du relais (différé de 900 ms) est plus ancien.
- **Poker Face** : après rechargement/promotion, `restoreCur()` récupère le contenu de la manche et `syncCurData()` réutilise les fichiers renvoyés par les joueurs ; les invités renvoient aussi le contenu courant sur `rs` ; les joueurs absents ne sont plus élagués en cours de partie (les points restent) ; la calibration exige plusieurs échantillons après rechargement ; `L.out` est restauré depuis `S.pl` ; une jointure d'un joueur banni reçoit de nouveau `kick` ; `again` efface `S.banned` ; la promotion ajoute l'hôte manquant même hors salon.
- **Qui de nous ?** : photos, consentement et morceaux de la photo sortante sont conservés dans `sessionStorage` et restaurés avant le rendu ; `needpic` permet à un invité de renvoyer sa photo après un rechargement de l'hôte ; l'intervalle `Sess.touch` n'est plus dupliqué ; les données média sont effacées en quittant.

### Corrigés le 15 novembre 2026 (vague de refonte)
- **Photo Roulette refondue en manches** : réserve conservée, tirage de 16 médias par joueur et par manche, validation collective, deck mélangé, une question à la fois, récap de manche, manches suivantes avec nouveaux tirages, remplacement automatique ✕, persistance `Lib` et restauration après rechargement.
- **Undercover : votes bloqués** — l'état du vote est dérivé de `H.votes[ME]` côté hôte et de `S.voted`/`S.vn`/`H.vn` côté invités ; la progression et la clôture se mettent à jour sans attendre un événement perdu.
- **Poker Face : jointure en cours de partie** — un joueur qui arrive après le lancement est accepté, reçoit `join` et la négociation WebRTC (`pcFor`/`offer`/`onSig`/`flush`) a été renforcée avec un watchdog.
- **Poker Face : bibliothèque** — les liens/images/contenus peuvent être enregistrés localement et rechargés dans une partie ultérieure.
- **Blind Test : lecture bloquée** — gate sonore, relance après geste, détection de lecture, playlists prioritaires et messages de secours.
- **Codenames : intégré au Salon** — codes 4 caractères, session, snapshot, promotion d'hôte, classement de soirée et retour au salon ; ajouté à `GAMES`.
- **Badges « Nouveau » retirés** du hub ; le badge `18+` de Les Petites Vérités est conservé.

### Corrigés le 15 novembre 2026 (avant la refonte)
- **Photo Roulette : rejouer repart de la proposition** (`again`, `replayLobby`).
- **Photo Roulette : validation obligatoire** de tous les joueurs avant lancement.
- **Poker Face : flagrant délit des perdants** (~10 s, galerie partagée plafonnée).

### Corrigés le 14 novembre 2026
- **Codenames : création de partie** (nouvel essai de code en cas de collision).
- **Salon de la soirée : hôte seul dans le jeu** (attente de `go`) et ajout de Make It Meme.
- **Undercover** : progression des votes diffusée, clôture automatique après 45 s, révélation du mot et changement des mots.
- **Qui de nous : jitter du texte** et « Quitter le salon ».
- **Poker Face** : miroir local, jeu sans caméra PC, modération, embeds supplémentaires, 20 manches, résultat maintenu, joueurs partants élagués.
- **Photo Roulette** : tirage jusqu'à 40 photos, sélection jusqu'à 400, envoi par téléphone via QR.
- **Make It Meme** : code admin, bouton d'accueil, canvas 1100 px, ombre du texte.
- **Mode sombre** : palettes des six thèmes et bouton partagé.

### Corrigés le 13 novembre 2026
- **Make It Meme multijoueur** via le relais Hono (remplace Firebase).
- **Lien mort « Petit Bac Boom »** retiré du hub.
- **Codes Make It Meme alignés sur 4 caractères**.
- **Pseudos et contenus Make It Meme échappés**, joueurs partants/exclus gérés.
- **Photo Roulette accepte plus de 20 photos** (lots, budget, miniatures, déduplication).

### Majeurs
1. **Classement de soirée réutilisable par collision.** Les parties sont indexées par code à 4 caractères pendant 12 h ; créer un nouveau salon avec un code déjà utilisé additionne les scores de deux soirées.
2. **Relais sans authentification ni limitation de débit.** Le `cid` est fourni par le client : une connexion peut usurper l'hôte pour écraser le snapshot ou poster des scores. `/event` accepte 16 Mo par requête.
3. **Événements non idempotents.** `net.js` réessaie jusqu'à 20 s sans identifiant de message : une réponse perdue peut rejouer une action. Le serveur ne déduplique que les scores par `sid`.
4. **Barrière 18+ incomplète dans Qui de nous ?** Le mode « 🌶️ piquant +18 » utilise des banques `*_18` sans confirmation d'âge, et le hub ne signale pas ce jeu comme 18+ (seule « Les Petites Vérités » porte le badge).

### Mineurs / robustesse
5. `npm start` utilise `NODE_ENV=production node …` (syntaxe POSIX) : correct sur Render/Docker, en échec sous Windows.
6. Make It Meme : code admin `admin` toujours en clair dans le client (choix produit), timers basés sur `Date.now` sans `Net.clock` ; certains templates peuvent partager la même image.
7. `serveStatic({ root: "./dist/public" })` dépend du répertoire courant alors que la page d'accueil utilise un chemin absolu : fragile si le serveur n'est pas lancé depuis `app/`.
8. Le fallback SPA renvoie le hub pour toute URL HTML inconnue : les liens morts sont masqués.
9. Snapshot silencieusement ignoré au-delà de 1,8 Mo côté client (2 Mo côté serveur). Make It Meme retire les images base64 de son snapshot.
10. `parties` n'est pas plafonné strictement au-delà de 500 parties actives.
11. Double enregistrement du service worker (hub en production + `net.js` sur HTTPS), sans conséquence pratique.
12. IndexedDB (`Lib`) peut être indisponible en navigation privée ou si le quota est atteint : les jeux continuent sans persistance (échecs avalés par `.catch()`).
13. `GET /api/youtube/playlist` n'a pas de limitation de débit : une instance exposée peut servir à multiplier des requêtes sortantes vers YouTube. L'identifiant est validé et l'hôte fixe, mais un quota par IP serait souhaitable.

## Points techniques importants (à conserver)
- `public/shared/net.js` gère le client réseau commun, la reconnexion et la communication avec le relais.
- `api/lib/relay.ts` contient la classe `Relay` et l'état des salons en mémoire.
- `api/routes/rooms.ts` expose les routes `join`, `stream` (SSE), `event`, `snap`, `leave`, `score`, `board`, `ice` et `public`.
- **L'hôte d'une partie exécute la logique du jeu dans son navigateur** ; le serveur relaie, conserve un instantané et gère les scores cumulés. Ne pas déplacer les règles du jeu côté serveur sans demande explicite.
- **Exception volontaire : La Table Des Menteurs** est entièrement autoritaire côté serveur (`api/lib/menteurs.ts` + `api/routes/menteurs.ts`). Les mains privées, cibles, chronos, contestations et résultats ne doivent jamais être calculés ni acceptés depuis le navigateur.
- **Le relais est en mémoire du processus** : un redémarrage efface salons, snapshots et classements. Il est mono-instance.
- Le code de soirée est dérivé du nom de salon (`uc-ABCD` → `ABCD`) et doit rester à 4 caractères tant que `Party`, `Sess`, `bootParams` et `/board` ne sont pas adaptés.
- Les fichiers partagés sont des **globals** : vérifier l'ordre des scripts et tous leurs consommateurs avant modification. `library.js` doit être chargé avant les jeux qui utilisent `Lib`.
- Les protections 18+ existantes (Les Petites Vérités, banque de gages adulte) ne doivent être ni retirées, ni contournées, ni étendues à des espaces non appropriés.
- Le hub et les jeux sont conçus mobile/tactile : `viewport-fit=cover`, zones sûres, cibles tactiles, pas de contrôle uniquement au survol.
- Skills disponibles : `game-page-development` (pages de jeux), `realtime-multiplayer` (salon/réseau/relais), `verification-and-handoff` (contrôles et passation).
- Make It Meme : `public/makeitmeme/index.html` (page + logique hôte), `templates.js` (`window.MIM_TEMPLATES`, 60 modèles), `room-state.js` (`clone`, `sanitize`, `applyPatch`, `allowedGuestPatch`), thème `public/themes/makeitmeme.css`. Le relais ignore l'expéditeur d'un `event` : l'hôte doit rendre son interface localement après diffusion.
- **Photo Roulette** : `L.pool` = réserve de fichiers, `L.media` = tirage courant, `L.used` = fids déjà utilisés, `L.readyM` = garde anti-double tirage, `L.libM`/`libSaveMedia` = sauvegarde `Lib` par manche. `S.mi` (manche), `S.qi`/`S.qn` (question), `S.mpts`/`S.mrecap` (récap), `S.t0` (ouverture des votes), `S.lastQ`/`S.lastM`. Hôte : `H.qdeck` (deck de la manche), `H.valid[p]` (clés validées), `H.mok`/`H.mn` (bonnes réponses / questions), `H.pool[p]` (médias par joueur). `maxN()` = 16 photos / 10 vidéos. `fill()` renvoie `{added, skipped, timedOut}`. Une réserve épuisée recycle d'anciens médias.
- **Poker Face WebRTC** : `L.pcs` = `RTCPeerConnection` par joueur, `L.q` = candidats ICE en attente, `L.remStreams` = flux distants reçus, `L.seen` = joueurs dont une piste a déjà été reçue, `L.hiN`/`L.hiT` = compteur et date du dernier handshake par joueur. `pcFor(id, force)` recrée un PC, `closePc(id)` le ferme et réarme le handshake, `offer(id)`/`requestOffer(id)` négocient sans perdre une demande pendant une négociation, `onSig` traite `hi`/`offer`/`answer`/`ice`, `flush(id)` vide la file ICE. `_polite = ME > id` décide qui cède lors d'une collision d'offres. Le watchdog (3 s) ferme les PC bloquées et renvoie `hi` avec `cam:0|1`. Ne pas revenir à une initiation par le seul plus petit identifiant : c'est ce qui bloquait les reconnexions.
- **Bibliothèque** : `window.Lib.list(game)` / `put({id, game, kind, label, ref, data, by, partyId})` / `del(id)` / `clear(game)` / `trim(game, keep)`. Clés Photo Roulette : `pr:<code>:m<manche>:<key>`, purge des manches précédentes à chaque sauvegarde. Poker Face utilise `game: "pokerface"`.
- Blind Test : jeu `"bt"`, salons `bt-XXXX`, préfixe DOM `bt-`, banque `window.BT` dans `public/blindtest/bank.js`. L'hôte est autoritaire et diffuse les extraits (`play`), les invités ne calculent que leurs réponses. `loadPlaylist` tente l'API IFrame puis `GET /api/youtube/playlist` ; `L.unlocked` mémorise l'autorisation audio et `L.sound` ne doit pas retomber sur un simple buffering.
- Codenames : jeu `"cn"`, salons `cn-XXXX`, identité `TK` avec `pid=ME`, snapshot `{S,H}`, score 100 pour l'équipe gagnante et 0 pour l'autre. La logique reste côté hôte ; le relais ne relaie que les événements.
- **La Table Des Menteurs** : moteur `api/lib/menteurs.ts` (`MENTEURS_TARGETS = ["V", "D", "R", "A"]`, `roundAt`, `raised`), routes `api/routes/menteurs.ts` (`/create`, `/join`, `/state`, `/action`), client `public/menteurs/index.html` + `scene.js` + `menteurs.css` + `audio.js` + `vendor/GLTFLoader.js`, asset `assets/revolver-quaternius.glb` (Quaternius, CC0, Poly Pizza). Actions : `config`, `start`, `pause`, `resume`, `end`, `rematch`, `kick`, `nextTurn`, `claim`, `challenge`, `believe`, `raise`. `roundAt + 5000` = verrou de dévoilement ; côté client `DEAL_HOLD = 5000` et `dealRemain()`. Un rechargement en cours de manche ne fait plus réapparaître la carte cible au centre.
- Skyjo : jeu `"sj"`, salons `sj-XXXX`, `Sess` `"sj"`, 12 cartes par grille. `H.deck`/`H.discard`/`H.grids`/`H.removed`/`H.drawn` sont privés à l'hôte ; `S.board`, `S.order`, `S.turn`, `S.trigger`, `S.finishing`, `S.queue` et `S.roundResult` sont publics. `hiddenCount` doit ignorer les cartes `gone` (colonnes retirées) ; `sjShuffle` évite le conflit avec le global `shuffle` de `net.js`. `Party.report` reçoit `s:-p.sc` car le plus petit score doit être classé premier.
- UNO : jeu `"uno"`, salons `uno-XXXX`, `Sess` `"uno"`. `H.hands`/`H.deck`/`H.discard` et `H.pending4.legal` restent côté hôte ; les mains partent en `priv`. `S.color` suit la dernière couleur jouée (ou choisie), `S.pending`/`S.pendingDraw`/`S.uno` décrivent les fenêtres publiques. Les timeouts hôte (contestation 15 s, couleur 20 s, UNO 8 s) sont traités dans `tickHost` ; `unoShuffle` évite le conflit avec `shuffle`.
- Retour au Salon : `Party.leaveCard` émet `back` (hôte) et `Party.listen` écoute cet événement chez tous les jeux pour revenir au même code. `Party.endCard({compact:true})` ne montre que ce bouton, sans classement de soirée.

## Vérifications

### Réalisées le 18 novembre 2026 (La Table Des Menteurs)
- `npm run check` (depuis `app/`) : **réussi**.
- `npm test -- --run` : **réussi**, **33 tests** (13 relais + 3 Make It Meme + 3 YouTube + 14 moteur Menteurs), dont le test « ne tire que des figures ou l'As comme carte cible » et le verrou des 5 s.
- `npm run build` : **réussi** (Vite + bundle serveur).
- Analyse syntaxique de `scene.js` et du bloc module inline de `index.html` via esbuild : **aucune erreur**.
- Navigateur (serveur de développement, salons 6QYX/4BSE) : création, 4 joueurs (hôte + 3 bots), cible **Dame** uniquement, bandeau des 5 s, carte cible retirée du centre puis badge « CIBLE », main 3D levée/baissée, contestation « ⚔️ Il ment ! », révélation, revolver, fin de partie et classement — **zéro erreur console**.
- Vérifié visuellement : personnages assis dans l'orbit (les 4 visibles, pas de glissement de chaise), éventails de cartes tenus, éclairage renforcé, main 3D recadrée au-dessus du panneau d'action, carte cible qui ne réapparaît pas après un rechargement en cours de manche.

### Réalisées le 17 novembre 2026 (vague Skyjo/UNO et jouabilité)
- `npm run check` (depuis `app/`) : **réussi**.
- `npm test` : **réussi**, **19 tests** (13 relais + 3 helpers Make It Meme + 3 parseurs YouTube).
- `npm run build` : **réussi** (Vite + bundle serveur).
- Navigateur — **Skyjo** à 2 joueurs : création/jointure, révélation de 2 cartes, pioche, prise de la défausse, échange, défausse + révélation, colonne de 3 identiques retirée, dernier tour, doublement du déclencheur, écran de manche, manche suivante, fin de partie, `Party.report` (classement de soirée Luca 10 / Marie 7), retour compact au Salon et promotion d'hôte avec snapshot conservé ; aucune erreur console.
- Navigateur — **UNO** à 2 joueurs : lancement depuis le Salon avec navigation automatique des invités, lobby, manche unique, mains privées, jeu/pioche/passe, Skip, Reverse = Skip à 2, Joker avec choix de couleur (et choix aléatoire après 20 s), +4 avec choix de couleur puis contestation légale (6 cartes), annonce UNO, dénonciation UNO (+2 cartes), score de manche (53 points), fin de partie, `Party.report` (classement correct, Marie 10 / Luca 7), retour au Salon avec le code conservé.
- Navigateur — **intégration Salon** : soirée `Q4XF`, lancement de Skyjo puis d'UNO depuis le Salon, retour au même code avec les 2 joueurs et l'hôte conservés.
- Captures vérifiées : plateau Skyjo (cartes lisibles, colonne retirée visible, heading corrigé) et écran d'accueil UNO.
- Smoke tests des pages **Undercover**, **Make It Meme**, **Blind Test** et **Poker Face** : chargement initial, aucun message console d'erreur.
- **Limites de la sandbox** : caméra/MediaPipe, YouTube réel et ICE ne sont pas disponibles dans le Chromium embarqué ; la validation Skyjo/UNO multi-appareils et le test d'une vraie playlist YouTube restent à faire. Pas d'émulation téléphone réelle : le responsive a été contrôlé par CSS et captures desktop.

### Réalisées le 16 novembre 2026 (passe de robustesse)
- `npm run check` (depuis `app/`) : **réussi**.
- `npm test` : **réussi**, **16 tests** (13 relais + 3 helpers Make It Meme).
- `npm run build` : **réussi** (Vite + bundle serveur).
- Analyse syntaxique des 9 pages HTML et de leurs scripts inline : **aucune erreur** ; 6 alertes connues et revues comme faux positifs (`#shot`, `#phmod`, `#libmod`, `#qmod`, `#writtenAnswer`, `#wcount`).
- Navigateur (Vite local sur le port 3100, quatre origines distinctes `localhost`, `127.0.0.1`, `127.0.0.2`, `127.0.0.3` pour séparer les identités `localStorage`) :
  - **Blind Test**, 2 joueurs : création/jointure, manche 1, bonne réponse (970 pts), passage à la manche 2 avec `L.ok`/`L.fb` remis à zéro, rechargement de l'hôte en pleine manche avec reprise de `L.cur`, `S.loading=false` et invité toujours en lecture ; aucune erreur console.
  - **Les Petites Vérités**, 4 joueurs : exclusion d'un joueur puis nouvelle tentative de jointure (deuxième `kick` reçu), vérité conservée à `reveal`, `skipPhase("mix")` qui relance le mélange, rechargement de l'hôte en plein mélange puis révélation, écran final avec barre d'admin masquée et `Party.report` appelé une seule fois ; rechargement ultra-rapide (< 900 ms) désormais résolu par la copie locale horodatée ; aucune erreur console.
  - **Poker Face**, 2 joueurs : élagage conservé au salon mais désactivé en partie, `join` d'un banni qui réémet `kick`, `again` qui efface `S.banned`, `restoreCur()` et `syncCurData()` (avec `prepare()` appelé une fois), calibration après rechargement (base non calculée avant plusieurs échantillons), promotion en cours de partie avec hôte manquant, `L.out` restauré, rechargement réel avec `S.cur` de type image et `L.cur` retrouvé ; aucune erreur JavaScript (un POST `/event` 403 transitoire pendant un rechargement artificiel après promotion manuelle).
  - **Qui de nous ?**, 2 joueurs : consentement + import d'une image PNG, photo et `L.out`/`PH` persistés dans `sessionStorage` et restaurés après rechargement, `needpic` renvoyant les morceaux (2 × 3000 caractères), `needpic` émis par `tick()`, `leave()` qui efface le stockage ; aucune erreur console.
  - **Photo Roulette**, état contrôlé : `buildDeck()` ignore les médias plantés si `S.cfg.plant` est faux et filtre par type, `drop` par clé retire le bon média (repli sur l'index), écran de fin avec classement vide sans exception.
  - **Codenames**, état contrôlé : `pick25()` renvoie 25 mots uniques après déduplication/trim d'une liste de 33 entrées, et 25 mots personnalisés quand la liste en contient 25+.
  - **Undercover**, 2 joueurs : un `join` en cours de partie émet `late` sans ajouter le joueur, le message est limité à un par 8 s, et le même joueur est accepté au salon suivant.
- **Limites de la sandbox** : la caméra/MediaPipe, YouTube et les vrais candidats ICE ne sont pas disponibles dans le Chromium embarqué ; les parcours Poker Face caméra-à-caméra, Blind Test sur un vrai réseau YouTube, les photos de téléphone (HEIC) et le rendu multi-appareils restent à valider manuellement. Le test d'import fait avec une image PNG de 1×1 px valide seulement la persistance, pas la qualité de compression.
- Le serveur de test du port 3100 a été arrêté ; aucun serveur utilisateur n'a été touché.

### Réalisées le 16 novembre 2026 (Poker Face WebRTC)
- `npm run check` (depuis `app/`) : **réussi**.
- `npm test` : **réussi**, 16 tests (13 relais + 3 helpers Make It Meme).
- `npm run build` : **réussi** (Vite + bundle serveur).
- Analyse syntaxique du script inline de `pokerface/index.html` : **aucune erreur** (~58 900 caractères).
- Navigateur (Vite local, deux onglets, patch temporaire `sessionStorage` pour distinguer les identités) : offre/réponse dans les deux sens, `signalingState=stable`, `ontrack` reçu des deux côtés, récupération après fermeture d'un PC d'un seul côté, après rechargement + rejoint, et après `R.reconnectNow()` + fermeture de PC ; le PC distant est bien recréé et renégocié.
- Navigateur — caméra ajoutée tardivement : un PC sans expéditeur passe à un expéditeur vidéo `live` après `applyStream(canvas)`, renégociation stable et récepteur hôte mis à jour.
- **Zéro erreur console** sur les deux onglets (uniquement la ligne INFO MediaPipe/TensorFlow).
- **Limite de la sandbox** : le Chromium embarqué ne produit **aucun candidat ICE** (seulement des candidats hôte TCP sur `0.0.0.0:9`), donc `connectionState` reste `new`. La négociation SDP et les reprises sont validées, mais **la vidéo réelle de caméra à caméra doit être testée sur deux vrais appareils/navigateurs** (idéalement avec TURN).
- Le patch de test de `net.js` a été **retiré** (`git checkout`, diff vide) et les serveurs de test (ports 3001/3002) arrêtés ; le serveur utilisateur du port 3000 n'a pas été touché.

### Réalisées le 15 novembre 2026 (fin de vague)
- `npm run check` (depuis `app/`) : **réussi**.
- `npm test` : **réussi**, 16 tests (13 relais + 3 helpers de salon Make It Meme).
- `npm run build` : **réussi** (Vite + bundle serveur).
- Analyse syntaxique de tous les blocs `<script>` inline modifiés (Photo Roulette, Codenames, Poker Face, Blind Test, Undercover, Soirée) : **aucune erreur**.
- Navigateur (serveur de développement) — **Photo Roulette** à 3 joueurs (Alice/Bob/Cara) : création/jointure, 24 photos par joueur, 16 tirées, validation collective, manche 1 à 3 questions, récap des points, manche 2 (tirage complémentaire puis recyclage, `used=24`), remplacement ✕ (toujours 16 médias, validation réinitialisée), fin de partie, statistiques, `Party.report`, **zéro erreur console**.
- Navigateur — **Photo Roulette**, verrouillage des votes : options désactivées avant `S.t0`, activées après.
- Test multi-onglets : un patch temporaire `sessionStorage` de `net.js` a servi à distinguer les identités ; **il a été retiré** (`net.js` restauré à l'identique de `HEAD`) et le serveur de test (port 3001) arrêté. Aucun serveur utilisateur n'a été touché.

### Réalisées le 15 novembre 2026 (vague précédente)
- `npm run check`, `npm test` (16), `npm run build` : **réussis**.
- Navigateur — **Blind Test** à 2 joueurs : création, code PIN, jointure, lobby, extrait commun, mauvaise réponse puis réessai, validation, points de vitesse, fin de manche privée, révélation.
- Navigateur — **Poker Face** : `autoShareSnaps()` ajoute la photo du perdant, marque `shared:true`, « Flagrant délit » s'affiche.
- Banque Blind Test : 133 identifiants YouTube vérifiés via oEmbed, 0 échec.

### Réalisées le 14 novembre 2026
- `npm run check`, `npm test` (16), `npm run build` : **réussis** ; analyse syntaxique des pages modifiées et équilibre des CSS : **corrects**.
- Pas de parcours navigateur complet ni de test multi-appareils pour cette vague.

### Réalisées le 13 novembre 2026
- `npm run check`, `npm test` (16), `npm run build` : **réussis**.
- Navigateur — Make It Meme complet (création, jointure, lobby, éditeur, vote, podium, `Party.report`, rejouer, bots, reprise, exclusion, promotion d'hôte).
- Navigateur — Photo Roulette : 25 photos → 20 médias + 5 en file ; ajout de 5 → 30 ; doublon refusé ; file épuisée.
- Captures vérifiées : accueil, lobby, éditeur Make It Meme, écran médias Photo Roulette.

### Reste à vérifier
- **La Table Des Menteurs sur appareils réels** : partie à 2–8 sur plusieurs téléphones, reconnexion, transfert d'hôte, exclusion, synchronisation des chronos et lisibilité de la main 3D sur petits écrans.
- **Skyjo et UNO sur appareils réels** : 3–10 joueurs sur plusieurs téléphones, lisibilité des cartes, zones tactiles, snapshot après refresh, promotion d'hôte, retour au Salon avec le code, classement de soirée. La sandbox ne fournit pas d'émulation mobile réelle.
- **Photo Roulette sur appareils réels** : tirage de 16 médias par manche depuis une grosse réserve (100–150 photos), recyclage quand la réserve s'épuise, restauration `Lib` après refresh, envoi par QR depuis un iPhone (HEIC).
- **Codenames dans le Salon** : partie complète à deux équipes sur deux appareils (snapshot, promotion d'hôte, retour au salon, classement).
- **Blind Test sur un vrai réseau YouTube** : playlist collée (ex. `https://youtube.com/playlist?list=PLaLWNpJCbH_pPwtMN-TYkzZ03WxUAfAP-`), repli `/api/youtube/playlist`, consentement audio, synchronisation des extraits, vidéo indisponible.
- **Poker Face sur plusieurs téléphones** : WebRTC/TURN en 4G, caméra téléphone ajoutée en cours de partie, changement de caméra, reconnexion simultanée de deux joueurs, exclusion, flagrant délit. La sandbox de test ne produit pas de candidats ICE : ce point reste **obligatoire** sur appareils réels.
- **Undercover** : progression des votes sur appareils réels.
- Mode sombre : vérification visuelle de chaque jeu sur mobile et bureau.
- `npm start` sous Windows : commande POSIX toujours en échec (voir bug 5).

## Modifications récentes
- **2026-11-18 — La Table Des Menteurs** : jeu 3D temps réel à moteur serveur autoritaire. Cible limitée à **V/D/R/A**, verrou de dévoilement de 5 s, contestation géante, action publique `raise` + indicateur 🃏↑/🃏↓, éventails de cartes tenus par les personnages, correction des chaises (buste animé séparé), main 3D recadrée, éclairage et lisibilité du saloon renforcés, carte cible non rejouée après rechargement. Nettoyage des GLB non utilisés ; seul le revolver Quaternius (CC0) reste. 14 tests moteur.
- **2026-11-17 (vague Skyjo/UNO et jouabilité)** — Ajout de **`public/skyjo/index.html`** (+ `themes/skyjo.css`) et **`public/uno/index.html`** (+ `themes/uno.css`) : règles complètes, hôte autoritaire, snapshot, promotion, `Party.report`, retour au Salon. Entrées ajoutées dans `src/pages/Home.tsx` et `public/soiree/index.html`. **`public/shared/party.js`** : `Party.leaveCard` et option `compact` de `Party.endCard` pour les récaps intermédiaires. **Undercover** : ordre de passage différent à chaque manche. **Make It Meme** : drag Pointer Events délégué, chrono sombre, galerie téléchargeable au récap, retour compact (`index.html`, `themes/makeitmeme.css`). **Blind Test** : repli serveur de playlist, mémoire de l'autorisation audio (`index.html`), ajout de `api/lib/youtube.ts`, `api/routes/youtube.ts`, `api/lib/youtube.test.ts` et montage `/api/youtube` dans `api/boot.ts`. **Poker Face** : overlay 3 s, caméra éliminée persistante, calibration anti-mouvement de tête, retour compact. Retours compacts ajoutés à Photo Roulette, Qui de nous ?, Les Petites Vérités. Aucun commit ni push.
- **2026-11-16 (passe de robustesse)** — 7 pages de jeux modifiées : `blindtest/index.html` (reset invité, reprise d'hôte), `photoroulette/index.html` (drop par clé, deck filtré, fin vide), `codenames/index.html` (`pick25` dédupliqué), `undercover/index.html` (retour `late`), `verites/index.html` (mélange relancé, exclusion/bannissement, final idempotent, copie locale horodatée prioritaire sur un snapshot en retard), `pokerface/index.html` (restauration du contenu courant, élagage en partie désactivé, calibration, bannissement/promotion), `quidenous/index.html` (persistance `sessionStorage` des photos/morceaux et `needpic`). Aucun changement de `net.js`, `party.js` ni du relais.
- **2026-11-16 (Poker Face WebRTC)** — `app/public/pokerface/index.html` uniquement : ajout de `L.remStreams`/`L.seen`/`L.hiN`/`L.hiT`, `camLive()`, `playVideo()`, `showStream()`, `closePc()`, `requestOffer()` ; `tile()`/`updTiles()` réutilisent les flux et nettoient l'état des joueurs partis ; `applyStream()` renégocie quand une piste est ajoutée ; `pcFor()` gère `_polite`, `onnegotiationneeded`, `onsignalingstatechange`, `ontrack` et les états de connexion ; `onSig()` réécrit (`hi`/`offer`/`answer`/`ice`, rollback, recréation de PC) ; watchdog avec reprise des états bloqués et temporisation exponentielle ; `enter()` attend `Net.ice()` et enregistre `R.onPeers` pour le handshake.
- **2026-11-15 (vague de refonte)** — **Photo Roulette** réécrite en manches : réserve (`L.pool`), tirage de 16 médias/joueur/manche (`pickReserve`, `L.used`), remplacement ✕ (`swap`), phases `lobby`/`round`/`reveal`/`mrecap`/`ready`/`end`, deck en tourniquet (`H.qdeck`, `S.qn`), récap de manche (`S.mrecap`), persistance IndexedDB et restauration des photos de la manche. Nouveau **`public/shared/library.js`** (IndexedDB `soiree-lib`) intégré à **Poker Face** (modale « 📚 Ma bibliothèque », auto-sauvegarde) et à Photo Roulette. **Codenames** intégré au Salon (codes 4, `Net.enter`, `Sess`, `Party`, snapshot, promotion, `Party.report`, `endCard`) et ajouté à `GAMES`. **Undercover** : vote corrigé. **Poker Face** : jointure en cours de partie, négociation WebRTC renforcée, jauge agrandie. **Blind Test** : gate sonore et reprise après geste. **Hub** : badges « Nouveau » retirés, `18+` conservé.
- **2026-11-15** — Ajout du **Blind Test** (`public/blindtest/index.html`, `bank.js`, `themes/blindtest.css`) avec tuile hub et entrée Salon. Refonte précédente de **Photo Roulette** (16 photos validées, replay). **Poker Face** : flagrant délit des perdants.
- **2026-11-14** — Vague de corrections jeux : mode sombre partagé, Make It Meme au Salon + attente de `go`, Codenames créable, Undercover, Qui de nous, Poker Face, Photo Roulette.
- **2026-11-13** — Suppression de Petit Bac Boom du hub. Make It Meme rebranché sur le relais Hono. Photo Roulette : sélection de plus de 20 photos fiabilisée.
- Commits notables déjà présents : `40e06ba` (suppression de `app/README-OPENCODE.md`), `0e19a6a` (Make It Meme), `e543bdb` (Codenames), `75cf6b6` (suppression de Petit Bac Boom).

## Prochaines étapes de développement

1. **Valider Skyjo et UNO sur téléphones réels** : 3–10 joueurs, lisibilité et zones tactiles des cartes, snapshot après refresh, promotion d'hôte, retour au Salon avec le code et classement de soirée.
2. **Valider Poker Face sur deux vrais téléphones** : vidéo caméra à caméra (STUN/TURN, 4G), caméra branchée en cours de partie, changement de caméra, reconnexion simultanée, tuiles noires résiduelles. C'est la seule validation manquante du correctif WebRTC.
3. **Valider Photo Roulette sur téléphones réels** : grosse réserve, 3–10 manches, recyclage, QR iPhone/HEIC, restauration après refresh.
4. **Valider Codenames dans le Salon** sur deux appareils : équipes, maître-espion, snapshot, promotion d'hôte, retour au salon et classement.
5. **Valider le Blind Test sur un vrai réseau YouTube** : playlist collée, repli `/api/youtube/playlist`, consentement audio, extraits synchronisés, thème intégré, retour au salon.
6. **Sécuriser et fiabiliser le relais** : identité de connexion, limitation de débit, taille des événements, tests des cas de reconnexion et de doublons.
7. **Limiter la route YouTube** : quota par IP et éventuel cache partagé pour `/api/youtube/playlist`, afin d'éviter d'en faire un proxy de requêtes sortantes.
8. **Corriger le classement** : éviter la réutilisation d'un code de soirée actif (codes plus longs ou génération/nettoyage explicite).
9. **Traiter la cohérence 18+** : confirmation pour le mode piquant de Qui de nous ? et/ou badge dans le hub, sans affaiblir les barrières existantes.
10. **Compléter la bibliothèque** : gestion (suppression, renommage, réutilisation inter-parties) et purge/quota côté client.
11. **Assainir Make It Meme** : code admin côté client, timers via `Net.clock`, templates dédupliqués.
12. **Outillage multiplateforme** : corriger `npm start` sous Windows, vérifier le répertoire de travail de `serveStatic`, ajouter au minimum un test du parcours de création de salon.
13. **Documentation à aligner** : `ARCHITECTURE.md` (commandes depuis `app/`, limites du relais, `library.js`, Skyjo/UNO, route YouTube), `app/README.md` (`npm start` sous Windows), `AGENTS.md` (préciser `cd app`).
14. **Réduire la fenêtre de perte du snapshot** : le relais diffère l'envoi de 900 ms. Vérités compare désormais une copie locale horodatée ; généraliser ce principe aux autres jeux hôtes (Blind Test, Poker Face, Photo Roulette, Codenames, Skyjo, UNO) ou envoyer immédiatement un snapshot au changement de phase.
15. **Ajouter des tests navigateur/E2E minimaux** : création + jointure + reprise d'hôte sur chaque jeu intégré, en complément des **33 tests Vitest** existants.

## À compléter après chaque tâche importante
### 2026-11-18 — La Table Des Menteurs
- Objectif : finir **La Table Des Menteurs** — cible limitée aux figures/As, dévoilement 5 s, contestation, cartes levées/baissées visibles, main 3D recadrée, personnages assis sans glitch, décor et éclairage du saloon, carte cible non rejouée après rechargement.
- Fichiers / zones modifiés : `app/api/lib/menteurs.ts` (`MENTEURS_TARGETS`, `roundAt`, `raised`, action `raise`), `app/api/lib/menteurs.test.ts` (14 tests), `app/api/routes/menteurs.ts`, `app/public/menteurs/index.html` (verrou 5 s, badges, contestation géante, aide/crédits), `app/public/menteurs/scene.js` (rig des personnages, éventails, mains, cible, éclairage), `app/public/menteurs/menteurs.css`, `app/public/menteurs/audio.js`, `app/public/menteurs/assets/revolver-quaternius.glb`, `PROJECT_STATUS.md`, `ARCHITECTURE.md`.
- Décisions techniques à conserver : moteur **autoritaire côté serveur** (exception assumée à la règle « hôte navigateur ») ; cible exclusivement `V`, `D`, `R`, `A` ; `roundAt + 5000` = verrou de dévoilement ; `raised` public et action `raise` purement visuelle ; chaise/jambes fixes et seul le buste (`rig`) s'anime ; pas de déplacement des cartes de la main au survol (émissif seulement) ; la carte cible 3D ne s'affiche que si les 5 s ne sont pas écoulées.
- Vérifications lancées et résultats : `npm run check` réussi ; `npm test -- --run` réussi (**33 tests** après fusion avec la vague Skyjo/UNO/YouTube) ; `npm run build` réussi ; syntaxe esbuild vérifiée ; parcours navigateur Menteurs à 4 joueurs (cible Dame, verrou 5 s, badge, contestation, revolver, fin de partie, classement) et contrôle visuel de l'orbit ; zéro erreur console.
- Problèmes connus / limites : validation multi-téléphones à faire ; room en mémoire (redémarrage = perte des salons) ; test multi-identités limité par le `localStorage` partagé entre onglets.
- Prochaine étape concrète : partie réelle à 3–8 téléphones, puis vérifier la lisibilité de la main 3D et des noms sur petits écrans.

### 2026-11-17 — Vague Skyjo/UNO et jouabilité
- Objectif : ajouter Skyjo et UNO complets, les intégrer au hub et au Salon, corriger Undercover, Make It Meme, Blind Test, le retour au Salon et Poker Face.
- Fichiers / zones modifiés : nouveaux `app/public/skyjo/index.html`, `app/public/uno/index.html`, `app/public/themes/skyjo.css`, `app/public/themes/uno.css`, `app/api/lib/youtube.ts`, `app/api/routes/youtube.ts`, `app/api/lib/youtube.test.ts` ; modifiés `app/public/shared/party.js`, `app/public/blindtest/index.html`, `app/public/makeitmeme/index.html`, `app/public/photoroulette/index.html`, `app/public/pokerface/index.html`, `app/public/quidenous/index.html`, `app/public/undercover/index.html`, `app/public/verites/index.html`, `app/public/soiree/index.html`, `app/public/themes/makeitmeme.css`, `app/src/pages/Home.tsx`, `app/api/boot.ts`, `PROJECT_STATUS.md`. `net.js` et le relais ne changent pas.
- Décisions techniques à conserver : l'hôte reste autoritaire ; UNO garde les mains côté hôte et envoie les cartes en messages ciblés ; Skyjo envoie un score de soirée négatif pour que le plus petit total soit premier ; le retour compact utilise `Party.leaveCard`/`Party.listen` ; le repli YouTube est côté serveur et mis en cache 10 min ; aucun commit ni push.
- Vérifications lancées et résultats : `npm run check` réussi ; `npm test` réussi (19 à l'époque, 33 après fusion) ; `npm run build` réussi ; parcours navigateur Skyjo et UNO à 2 joueurs, intégration Salon `Q4XF`, retour au Salon et promotion d'hôte ; smoke tests Undercover/Make It Meme/Blind Test/Poker Face sans erreur console.
- Problèmes connus / limites : caméra/MediaPipe, YouTube réel et ICE indisponibles dans la sandbox ; pas d'émulation téléphone réelle ; route YouTube sans quota ; snapshot du relais différé de 900 ms.
- Prochaine étape concrète : valider Skyjo et UNO sur plusieurs téléphones, puis Blind Test avec une vraie playlist YouTube et Poker Face avec caméra/ICE réels.
