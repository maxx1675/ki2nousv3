# État du projet — ki2nousv3

> Document de reprise pour les sessions OpenCode. Dernière mise à jour : **15 novembre 2026**, après la refonte de **Photo Roulette en manches** (réserve, tirage de 16 photos par joueur et par manche, récap), l'ajout d'une **bibliothèque locale partagée**, l'intégration de **Codenames au Salon**, les corrections **Undercover / Blind Test / Poker Face** et le retrait des badges « Nouveau ». Modifications non commitées à la date de rédaction.
>
> **Emplacement réel de l'application : `app/`.** C'est le dossier qui contient `package.json`, `src/`, `public/` et `api/`. La racine du dépôt ne contient que la documentation et `.opencode/`. Toutes les commandes npm doivent être lancées depuis `app/`.

## Résumé
**Le Hub de Soirée** est une application web de jeux de groupe : un hub React/Vite, plusieurs jeux autonomes accessibles depuis un navigateur, et un serveur Hono qui relaie les salons temps réel, conserve un instantané de reprise et gère le classement cumulé de la soirée. La logique de chaque partie est exécutée dans le navigateur de l'hôte ; le serveur ne la calcule pas.

## État actuel vérifié (15 novembre 2026)
- Frontend du hub : React 19, TypeScript 5.9 (strict), Vite 7, React Router 7.
- Pages des jeux : HTML/CSS/JavaScript autonomes sous `public/`, avec scripts globaux et ordre de chargement à respecter.
- Code commun des jeux : `public/shared/` (`net.js`, `profile.js`, `party.js`, `gages.js`, `qr.js`, `theme.js`, **`library.js`**) et thèmes dans `public/themes/`.
- Backend : Hono 4 + `@hono/node-server`, relais SSE + REST sous `api/`, sans base de données.
- Tests présents : `api/lib/relay.test.ts` (13 tests du relais) et `api/lib/makeitmeme-room.test.ts` (3 tests des helpers de salon Make It Meme), soit **16 tests Vitest**.
- Scripts npm : `dev`, `build`, `preview`, `start`, `check`, `format`, `test`.
- Déploiement documenté : Render (`npm ci && npm run build` puis `npm start`) ou `Dockerfile`.
- `node_modules` installé dans `app/` : `npm run check`, `npm test` et `npm run build` s'exécutent.
- Dépôt Git : modifications non commitées (voir « Modifications récentes »). Code de `app/` commité jusqu'à `40e06ba`, documentation et skills ensuite (`74607bc`). Rien n'est poussé à la connaissance de cette session.

### Convention de lecture
Dans ce document, **« terminé »** signifie : fonctionnalité présente dans le code, cohérente avec l'architecture partagée et sans bug bloquant identifié à la lecture. Cela ne vaut pas validation en navigateur ni sur plusieurs téléphones : les vérifications réellement exécutées sont indiquées plus bas.

## Jeux et espaces repérés

| Espace | Chemin | Statut réel |
|---|---|---|
| Hub React | `src/` | Terminé dans le code : 9 tuiles (Salon + 8 jeux), carrousel, réglages, musique, PWA. Seul le badge « 18+ » subsiste. |
| Salon de la soirée | `public/soiree/` | Terminé pour **8 jeux** : Undercover, Poker Face, Photo Roulette, Blind Test, Codenames, Make It Meme, Qui de nous ?, Les Petites Vérités. |
| Undercover | `public/undercover/` | Terminé dans le code : rôles, mots personnalisables, salon public, gages, scores, snapshot. Vote dérivé côté hôte/invités depuis cette vague. |
| Poker Face | `public/pokerface/` | Terminé dans le code : caméra/MediaPipe, médias, téléphone-caméra WebRTC, **jointure en cours de partie**, bibliothèque locale, gages, scores, flagrant délit des perdants. |
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
- Caméra/MediaPipe local, médias, téléphone-caméra via WebRTC (négociation `pcFor`/`offer`/`onSig`/`flush` + watchdog), jointure en cours de partie et renvoi de `join`.
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
- **Bibliothèque** : `window.Lib.list(game)` / `put({id, game, kind, label, ref, data, by, partyId})` / `del(id)` / `clear(game)` / `trim(game, keep)`. Clés Photo Roulette : `pr:<code>:m<manche>:<key>`, purge des manches précédentes à chaque sauvegarde. Poker Face utilise `game: "pokerface"`.
- Blind Test : jeu `"bt"`, salons `bt-XXXX`, préfixe DOM `bt-`, banque `window.BT` dans `public/blindtest/bank.js`. L'hôte est autoritaire et diffuse les extraits (`play`), les invités ne calculent que leurs réponses.
- Codenames : jeu `"cn"`, salons `cn-XXXX`, identité `TK` avec `pid=ME`, snapshot `{S,H}`, score 100 pour l'équipe gagnante et 0 pour l'autre. La logique reste côté hôte ; le relais ne relaie que les événements.

## Vérifications

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
- **Poker Face sur plusieurs téléphones** : WebRTC/TURN en 4G, caméra téléphone, jointure en cours de partie, exclusion, flagrant délit.
- **Undercover** : progression des votes sur appareils réels.
- Mode sombre : vérification visuelle de chaque jeu sur mobile et bureau.
- `npm start` sous Windows : commande POSIX toujours en échec (voir bug 5).

## Modifications récentes
- **2026-11-15 (vague de refonte)** — **Photo Roulette** réécrite en manches : réserve (`L.pool`), tirage de 16 médias/joueur/manche (`pickReserve`, `L.used`), remplacement ✕ (`swap`), phases `lobby`/`round`/`reveal`/`mrecap`/`ready`/`end`, deck en tourniquet (`H.qdeck`, `S.qn`), récap de manche (`S.mrecap`), persistance IndexedDB et restauration des photos de la manche. Nouveau **`public/shared/library.js`** (IndexedDB `soiree-lib`) intégré à **Poker Face** (modale « 📚 Ma bibliothèque », auto-sauvegarde) et à Photo Roulette. **Codenames** intégré au Salon (codes 4, `Net.enter`, `Sess`, `Party`, snapshot, promotion, `Party.report`, `endCard`) et ajouté à `GAMES`. **Undercover** : vote corrigé. **Poker Face** : jointure en cours de partie, négociation WebRTC renforcée, jauge agrandie. **Blind Test** : gate sonore et reprise après geste. **Hub** : badges « Nouveau » retirés, `18+` conservé.
- **2026-11-15** — Ajout du **Blind Test** (`public/blindtest/index.html`, `bank.js`, `themes/blindtest.css`) avec tuile hub et entrée Salon. Refonte précédente de **Photo Roulette** (16 photos validées, replay). **Poker Face** : flagrant délit des perdants.
- **2026-11-14** — Vague de corrections jeux : mode sombre partagé, Make It Meme au Salon + attente de `go`, Codenames créable, Undercover, Qui de nous, Poker Face, Photo Roulette.
- **2026-11-13** — Suppression de Petit Bac Boom du hub. Make It Meme rebranché sur le relais Hono. Photo Roulette : sélection de plus de 20 photos fiabilisée.
- Commits notables déjà présents : `40e06ba` (suppression de `app/README-OPENCODE.md`), `0e19a6a` (Make It Meme), `e543bdb` (Codenames), `75cf6b6` (suppression de Petit Bac Boom).

## Prochaines étapes de développement

1. **Valider Photo Roulette sur téléphones réels** : grosse réserve, 3–10 manches, recyclage, QR iPhone/HEIC, restauration après refresh.
2. **Valider Codenames dans le Salon** sur deux appareils : équipes, maître-espion, snapshot, promotion d'hôte, retour au salon et classement.
3. **Valider le Blind Test sur un vrai réseau YouTube** : playlist collée, extraits synchronisés, thème intégré, retour au salon.
4. **Sécuriser et fiabiliser le relais** : identité de connexion, limitation de débit, taille des événements, tests des cas de reconnexion et de doublons.
5. **Corriger le classement** : éviter la réutilisation d'un code de soirée actif (codes plus longs ou génération/nettoyage explicite).
6. **Traiter la cohérence 18+** : confirmation pour le mode piquant de Qui de nous ? et/ou badge dans le hub, sans affaiblir les barrières existantes.
7. **Compléter la bibliothèque** : gestion (suppression, renommage, réutilisation inter-parties) et purge/quota côté client.
8. **Assainir Make It Meme** : code admin côté client, timers via `Net.clock`, templates dédupliqués.
9. **Outillage multiplateforme** : corriger `npm start` sous Windows, vérifier le répertoire de travail de `serveStatic`, ajouter au minimum un test du parcours de création de salon.
10. **Documentation à aligner** : `ARCHITECTURE.md` (commandes depuis `app/`, limites du relais, `library.js`), `app/README.md` (`npm start` sous Windows), `AGENTS.md` (préciser `cd app`).

## À compléter après chaque tâche importante
- Date : 2026-11-15
- Objectif : refondre Photo Roulette en manches avec réserve et tirage par manche ; ajouter une bibliothèque locale ; intégrer Codenames au Salon ; corriger les votes Undercover, la lecture Blind Test et la jointure Poker Face ; retirer les badges « Nouveau ».
- Fichiers / zones modifiés : `app/public/photoroulette/index.html` ; `app/public/shared/library.js` (nouveau) ; `app/public/pokerface/index.html` ; `app/public/blindtest/index.html` ; `app/public/codenames/index.html` ; `app/public/soiree/index.html` ; `app/public/undercover/index.html` ; `app/src/pages/Home.tsx` ; `PROJECT_STATUS.md`. `app/public/shared/net.js` restauré à l'identique (patch de test retiré).
- Décisions techniques à conserver : hôte navigateur autoritaire, relais inchangé ; Photo Roulette = réserve locale + tirage `maxN()` par manche/joueur + recyclage, `cfg.rounds`/`cfg.qper`, phases `lobby`/`round`/`reveal`/`mrecap`/`ready`/`end`, persistance `Lib` de la manche ; bibliothèque = IndexedDB `soiree-lib` (`window.Lib`) ; Codenames = codes 4, snapshot `{S,H}`, `Party.report` 100/0.
- Vérifications lancées et résultats : `npm run check` réussi ; `npm test` réussi (16) ; `npm run build` réussi ; syntaxe des scripts inline vérifiée ; parcours navigateur Photo Roulette à 3 joueurs (manches, récap, remplacement, fin de partie, zéro erreur console) ; verrouillage des votes avant `t0` vérifié.
- Problèmes connus / limites : réserve Photo Roulette non persistée après refresh (seule la manche courante l'est) ; Codenames à valider sur appareils réels ; Blind Test à valider sur un vrai réseau YouTube ; barrière 18+ de Qui de nous inchangée ; test multi-onglets impossible sans patch `sessionStorage` (retiré).
- Prochaine étape concrète : tester Photo Roulette sur deux téléphones avec une réserve de 100+ photos, puis une partie Codenames complète depuis le Salon.
