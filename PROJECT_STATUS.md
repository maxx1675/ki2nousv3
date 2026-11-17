# État du projet — ki2nousv3

> Document de reprise pour les sessions OpenCode. Dernière mise à jour : **16 novembre 2026**, après une **passe de revue et de corrections de robustesse** sur les sept jeux suivants : Blind Test, Photo Roulette, Codenames, Undercover, Les Petites Vérités, Poker Face et Qui de nous ?. Sept pages de jeux sont modifiées (non commitées) depuis le commit `a3d06b7`.
>
> **Emplacement réel de l'application : `app/`.** C'est le dossier qui contient `package.json`, `src/`, `public/` et `api/`. La racine du dépôt ne contient que la documentation et `.opencode/`. Toutes les commandes npm doivent être lancées depuis `app/`.

## Résumé
**Le Hub de Soirée** est une application web de jeux de groupe : un hub React/Vite, plusieurs jeux autonomes accessibles depuis un navigateur, et un serveur Hono qui relaie les salons temps réel, conserve un instantané de reprise et gère le classement cumulé de la soirée. La logique de chaque partie est exécutée dans le navigateur de l'hôte ; le serveur ne la calcule pas.

## État actuel vérifié (16 novembre 2026)
- Frontend du hub : React 19, TypeScript 5.9 (strict), Vite 7, React Router 7.
- Pages des jeux : HTML/CSS/JavaScript autonomes sous `public/`, avec scripts globaux et ordre de chargement à respecter.
- Code commun des jeux : `public/shared/` (`net.js`, `profile.js`, `party.js`, `gages.js`, `qr.js`, `theme.js`, **`library.js`**) et thèmes dans `public/themes/`.
- Backend : Hono 4 + `@hono/node-server`, relais SSE + REST sous `api/`, sans base de données.
- Tests présents : `api/lib/relay.test.ts` (13 tests du relais) et `api/lib/makeitmeme-room.test.ts` (3 tests des helpers de salon Make It Meme), soit **16 tests Vitest**.
- Scripts npm : `dev`, `build`, `preview`, `start`, `check`, `format`, `test`.
- Déploiement documenté : Render (`npm ci && npm run build` puis `npm start`) ou `Dockerfile`.
- `node_modules` installé dans `app/` : `npm run check`, `npm test` et `npm run build` s'exécutent.
- Dépôt Git : HEAD = `a3d06b7`. Modifications non commitées depuis : les pages Blind Test, Photo Roulette, Codenames, Undercover, Les Petites Vérités, Poker Face et Qui de nous ? (passe de robustesse du 16 novembre) et ce document. Rien n'est poussé à la connaissance de cette session.

### Convention de lecture
Dans ce document, **« terminé »** signifie : fonctionnalité présente dans le code, cohérente avec l'architecture partagée et sans bug bloquant identifié à la lecture. Cela ne vaut pas validation en navigateur ni sur plusieurs téléphones : les vérifications réellement exécutées sont indiquées plus bas.

## Jeux et espaces repérés

| Espace | Chemin | Statut réel |
|---|---|---|
| Hub React | `src/` | Terminé dans le code : 9 tuiles (Salon + 8 jeux), carrousel, réglages, musique, PWA. Seul le badge « 18+ » subsiste. |
| Salon de la soirée | `public/soiree/` | Terminé pour **8 jeux** : Undercover, Poker Face, Photo Roulette, Blind Test, Codenames, Make It Meme, Qui de nous ?, Les Petites Vérités. |
| Undercover | `public/undercover/` | Terminé dans le code : rôles, mots personnalisables, salon public, gages, scores, snapshot. Vote dérivé côté hôte/invités depuis cette vague. |
| Poker Face | `public/pokerface/` | Terminé dans le code : caméra/MediaPipe, médias, téléphone-caméra WebRTC (**négociation symétrique**, renégociation à l'ajout de piste, reprise après reconnexion), jointure en cours de partie, bibliothèque locale, gages, scores, flagrant délit des perdants. |
| Photo Roulette | `public/photoroulette/` | Terminé dans le code : **réserve conservée toute la partie**, **16 photos (10 vidéos) tirées par joueur et par manche**, validation, questions une par une, récap de manche, `Lib`, snapshot. |
| Blind Test | `public/blindtest/` | Terminé dans le code : banque intégrée ou playlist YouTube, extraits 10–30 s, **reprise après geste si la lecture automatique est bloquée**, modes privé/visible, scores, snapshot. |
| Qui de nous ? | `public/quidenous/` | Terminé dans le code : 12 types de manches, packs, photos, scores cumulés, `Party.report`. Contient un mode « piquant +18 » non signalé comme tel dans le hub (voir bugs). |
| Les Petites Vérités | `public/verites/` | Terminé dans le code : barrage 18+ explicite, vérités, échange, bluff, scores. |
| Codenames | `public/codenames/` | **Intégré au Salon** : codes 4 caractères, `Net.enter`, `Sess`, `Party.listen`/`report`/`endCard`, snapshot `{S,H}`, `R.onPromote`, score de soirée 100/0. |
| Make It Meme | `public/makeitmeme/` | Multijoueur via le relais Hono : salons 4 caractères, hôte autoritaire, reprise, bots, vote, classement de soirée, proposé dans le Salon. |
| Petit Bac Boom | — | **Supprimé** : la tuile du hub a été retirée ; plus aucune référence dans `src/`. |

## Fonctionnalités terminées (dans le code)

### Hub
- Catalogue de 9 tuiles en carrousel 3D (Salon + 8 jeux), navigation clavier (flèches/Entrée), glisser-swipe, sélection au clic.
- Réglages persistés (`soiree:set`) : thème clair/sombre, animations (`off`/`light`/`full`), musique et volume.
- Musique générative WebAudio (`src/hubAudio.ts`), coupée quand l'onglet est masqué.
- PWA : manifest, icônes, service worker, page hors-ligne, métadonnées de partage avec `%ORIGIN%` remplacé côté serveur.
- Badges : seuls les badges utiles restent (`18+` pour Les Petites Vérités) ; les badges « Nouveau » ont été retirés de `Home.tsx`.

### Salon de la soirée
- Création/rejoindre un salon à 4 caractères, QR code, partage, copie du lien.
- Présence en direct, couronne de l'hôte, passage de relais automatique, reprise après rechargement.
- Choix du jeu par l'hôte diffusé à tous (`go`), classement de soirée cumulé, gages partagés.
- Retour au salon depuis chaque jeu intégré (`Party.endCard`, `Party.listen`).
- La liste `GAMES` expose les **8 jeux** du hub (Codenames ajouté).

### Jeux intégrés au salon (8)
- Undercover, Poker Face, Photo Roulette, Blind Test, Codenames, Make It Meme, Qui de nous ?, Les Petites Vérités : `Net.enter`/`Net.join`, session `Sess`, `Party.report`, snapshot `R.snap`, `onPromote`/`onDemote`, retour au salon.
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

### Serveur et partagé
- Relais en mémoire : salons, présence, hôte, événements ciblés ou diffusés, snapshot, reprise, salons publics (Undercover), classement.
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

## Points techniques importants (à conserver)
- `public/shared/net.js` gère le client réseau commun, la reconnexion et la communication avec le relais.
- `api/lib/relay.ts` contient la classe `Relay` et l'état des salons en mémoire.
- `api/routes/rooms.ts` expose les routes `join`, `stream` (SSE), `event`, `snap`, `leave`, `score`, `board`, `ice` et `public`.
- **L'hôte d'une partie exécute la logique du jeu dans son navigateur** ; le serveur relaie, conserve un instantané et gère les scores cumulés. Ne pas déplacer les règles du jeu côté serveur sans demande explicite.
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
- Blind Test : jeu `"bt"`, salons `bt-XXXX`, préfixe DOM `bt-`, banque `window.BT` dans `public/blindtest/bank.js`. L'hôte est autoritaire et diffuse les extraits (`play`), les invités ne calculent que leurs réponses.
- Codenames : jeu `"cn"`, salons `cn-XXXX`, identité `TK` avec `pid=ME`, snapshot `{S,H}`, score 100 pour l'équipe gagnante et 0 pour l'autre. La logique reste côté hôte ; le relais ne relaie que les événements.

## Vérifications

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
- **Photo Roulette sur appareils réels** : tirage de 16 médias par manche depuis une grosse réserve (100–150 photos), recyclage quand la réserve s'épuise, restauration `Lib` après refresh, envoi par QR depuis un iPhone (HEIC).
- **Codenames dans le Salon** : partie complète à deux équipes sur deux appareils (snapshot, promotion d'hôte, retour au salon, classement).
- **Blind Test sur un vrai réseau YouTube** : playlist collée, consentement, synchronisation des extraits, vidéo indisponible.
- **Poker Face sur plusieurs téléphones** : WebRTC/TURN en 4G, caméra téléphone ajoutée en cours de partie, changement de caméra, reconnexion simultanée de deux joueurs, exclusion, flagrant délit. La sandbox de test ne produit pas de candidats ICE : ce point reste **obligatoire** sur appareils réels.
- **Undercover** : progression des votes sur appareils réels.
- Mode sombre : vérification visuelle de chaque jeu sur mobile et bureau.
- `npm start` sous Windows : commande POSIX toujours en échec (voir bug 5).

## Modifications récentes
- **2026-11-16 (passe de robustesse)** — 7 pages de jeux modifiées : `blindtest/index.html` (reset invité, reprise d'hôte), `photoroulette/index.html` (drop par clé, deck filtré, fin vide), `codenames/index.html` (`pick25` dédupliqué), `undercover/index.html` (retour `late`), `verites/index.html` (mélange relancé, exclusion/bannissement, final idempotent, copie locale horodatée prioritaire sur un snapshot en retard), `pokerface/index.html` (restauration du contenu courant, élagage en partie désactivé, calibration, bannissement/promotion), `quidenous/index.html` (persistance `sessionStorage` des photos/morceaux et `needpic`). Aucun changement de `net.js`, `party.js` ni du relais.
- **2026-11-16 (Poker Face WebRTC)** — `app/public/pokerface/index.html` uniquement : ajout de `L.remStreams`/`L.seen`/`L.hiN`/`L.hiT`, `camLive()`, `playVideo()`, `showStream()`, `closePc()`, `requestOffer()` ; `tile()`/`updTiles()` réutilisent les flux et nettoient l'état des joueurs partis ; `applyStream()` renégocie quand une piste est ajoutée ; `pcFor()` gère `_polite`, `onnegotiationneeded`, `onsignalingstatechange`, `ontrack` et les états de connexion ; `onSig()` réécrit (`hi`/`offer`/`answer`/`ice`, rollback, recréation de PC) ; watchdog avec reprise des états bloqués et temporisation exponentielle ; `enter()` attend `Net.ice()` et enregistre `R.onPeers` pour le handshake.
- **2026-11-15 (vague de refonte)** — **Photo Roulette** réécrite en manches : réserve (`L.pool`), tirage de 16 médias/joueur/manche (`pickReserve`, `L.used`), remplacement ✕ (`swap`), phases `lobby`/`round`/`reveal`/`mrecap`/`ready`/`end`, deck en tourniquet (`H.qdeck`, `S.qn`), récap de manche (`S.mrecap`), persistance IndexedDB et restauration des photos de la manche. Nouveau **`public/shared/library.js`** (IndexedDB `soiree-lib`) intégré à **Poker Face** (modale « 📚 Ma bibliothèque », auto-sauvegarde) et à Photo Roulette. **Codenames** intégré au Salon (codes 4, `Net.enter`, `Sess`, `Party`, snapshot, promotion, `Party.report`, `endCard`) et ajouté à `GAMES`. **Undercover** : vote corrigé. **Poker Face** : jointure en cours de partie, négociation WebRTC renforcée, jauge agrandie. **Blind Test** : gate sonore et reprise après geste. **Hub** : badges « Nouveau » retirés, `18+` conservé.
- **2026-11-15** — Ajout du **Blind Test** (`public/blindtest/index.html`, `bank.js`, `themes/blindtest.css`) avec tuile hub et entrée Salon. Refonte précédente de **Photo Roulette** (16 photos validées, replay). **Poker Face** : flagrant délit des perdants.
- **2026-11-14** — Vague de corrections jeux : mode sombre partagé, Make It Meme au Salon + attente de `go`, Codenames créable, Undercover, Qui de nous, Poker Face, Photo Roulette.
- **2026-11-13** — Suppression de Petit Bac Boom du hub. Make It Meme rebranché sur le relais Hono. Photo Roulette : sélection de plus de 20 photos fiabilisée.
- Commits notables déjà présents : `40e06ba` (suppression de `app/README-OPENCODE.md`), `0e19a6a` (Make It Meme), `e543bdb` (Codenames), `75cf6b6` (suppression de Petit Bac Boom).

## Prochaines étapes de développement

1. **Valider Poker Face sur deux vrais téléphones** : vidéo caméra à caméra (STUN/TURN, 4G), caméra branchée en cours de partie, changement de caméra, reconnexion simultanée, tuiles noires résiduelles. C'est la seule validation manquante du correctif WebRTC.
2. **Valider Photo Roulette sur téléphones réels** : grosse réserve, 3–10 manches, recyclage, QR iPhone/HEIC, restauration après refresh.
3. **Valider Codenames dans le Salon** sur deux appareils : équipes, maître-espion, snapshot, promotion d'hôte, retour au salon et classement.
4. **Valider le Blind Test sur un vrai réseau YouTube** : playlist collée, extraits synchronisés, thème intégré, retour au salon.
5. **Sécuriser et fiabiliser le relais** : identité de connexion, limitation de débit, taille des événements, tests des cas de reconnexion et de doublons.
6. **Corriger le classement** : éviter la réutilisation d'un code de soirée actif (codes plus longs ou génération/nettoyage explicite).
7. **Traiter la cohérence 18+** : confirmation pour le mode piquant de Qui de nous ? et/ou badge dans le hub, sans affaiblir les barrières existantes.
8. **Compléter la bibliothèque** : gestion (suppression, renommage, réutilisation inter-parties) et purge/quota côté client.
9. **Assainir Make It Meme** : code admin côté client, timers via `Net.clock`, templates dédupliqués.
10. **Outillage multiplateforme** : corriger `npm start` sous Windows, vérifier le répertoire de travail de `serveStatic`, ajouter au minimum un test du parcours de création de salon.
11. **Documentation à aligner** : `ARCHITECTURE.md` (commandes depuis `app/`, limites du relais, `library.js`), `app/README.md` (`npm start` sous Windows), `AGENTS.md` (préciser `cd app`).
12. **Réduire la fenêtre de perte du snapshot** : le relais diffère l'envoi de 900 ms. Vérités compare désormais une copie locale horodatée ; généraliser ce principe aux autres jeux hôtes (Blind Test, Poker Face, Photo Roulette, Codenames) ou envoyer immédiatement un snapshot au changement de phase.
13. **Ajouter des tests navigateur/E2E minimaux** : création + jointure + reprise d'hôte sur chaque jeu intégré, en complément des 16 tests Vitest du relais.

## À compléter après chaque tâche importante
- Date : 2026-11-16
- Objectif : passe complète de revue, chasse aux bugs et corrections de jouabilité avant d'ajouter de nouveaux jeux.
- Fichiers / zones modifiés : `app/public/blindtest/index.html`, `photoroulette/index.html`, `codenames/index.html`, `undercover/index.html`, `verites/index.html`, `pokerface/index.html`, `quidenous/index.html` ; `PROJECT_STATUS.md`. `app/public/shared/net.js`, `party.js`, `api/` et le hub React sont inchangés.
- Décisions techniques à conserver : l'hôte reste autoritaire ; `Sess`/`Party`/snapshot/promotion ne changent pas ; pour Vérités, une copie locale horodatée (`ts`) est préférée au snapshot du relais s'il est plus récent ; les photos Qui de nous restent en `sessionStorage` (jamais `localStorage`) et sont effacées en quittant.
- Vérifications lancées et résultats : `npm run check` réussi ; `npm test` réussi (16) ; `npm run build` réussi ; analyse syntaxique 9 pages (6 faux positifs connus) ; parcours navigateur multi-origines Blind Test/Vérités/Poker Face/Qui de nous et tests de fonctions Photo Roulette/Codenames/Undercover, sans erreur JavaScript bloquante.
- Problèmes connus / limites : caméra/MediaPipe, YouTube et ICE réels indisponibles dans la sandbox ; import photo testé avec une image 1×1 ; snapshot du relais différé de 900 ms (corrigé pour Vérités seulement) ; tests réels multi-appareils toujours nécessaires.
- Prochaine étape concrète : valider sur téléphones réels Poker Face (caméra/ICE), Photo Roulette (HEIC, grosse réserve) et Blind Test (YouTube), puis généraliser l'horodatage local des snapshots aux autres jeux hôtes.
