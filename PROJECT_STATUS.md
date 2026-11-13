# État du projet — ki2nousv3

> Document de reprise pour les sessions OpenCode. Dernière mise à jour : **13 novembre 2026**, après une analyse en lecture seule de l'ensemble du dépôt. Aucun code n'a été modifié lors de cette mise à jour.
>
> **Emplacement réel de l'application : `app/`.** C'est le dossier qui contient `package.json`, `src/`, `public/` et `api/`. La racine du dépôt ne contient que la documentation et `.opencode/`. Toutes les commandes npm doivent être lancées depuis `app/`.

## Résumé
**Le Hub de Soirée** est une application web de jeux de groupe : un hub React/Vite, plusieurs jeux autonomes accessibles depuis un navigateur, et un serveur Hono qui relaie les salons temps réel, conserve un instantané de reprise et gère le classement cumulé de la soirée. La logique de chaque partie est exécutée dans le navigateur de l'hôte ; le serveur ne la calcule pas.

## État actuel vérifié (13 novembre 2026)
- Frontend du hub : React 19, TypeScript 5.9 (strict), Vite 7, React Router 7.
- Pages des jeux : HTML/CSS/JavaScript autonomes sous `public/`, avec scripts globaux et ordre de chargement à respecter.
- Code commun des jeux : `public/shared/` (`net.js`, `profile.js`, `party.js`, `gages.js`, `qr.js`, CSS partagé) et thèmes dans `public/themes/`.
- Backend : Hono 4 + `@hono/node-server`, relais SSE + REST sous `api/`, sans base de données.
- Tests présents : uniquement `api/lib/relay.test.ts` (Vitest, 15 tests du relais).
- Scripts npm : `dev`, `build`, `preview`, `start`, `check`, `format`, `test`.
- Déploiement documenté : Render (`npm ci && npm run build` puis `npm start`) ou `Dockerfile`.
- **`node_modules` n'est pas installé dans le dépôt actuel** : `npm test`, `npm run check` et `npm run build` ne sont pas exécutables sans `npm install` préalable.
- Dépôt Git : code de `app/` commité (dernier commit `40e06ba`) ; seuls `.opencode/`, `AGENTS.md`, `ARCHITECTURE.md`, `PROJECT_STATUS.md` et `README-OPENCODE.md` sont non suivis.

### Convention de lecture
Dans ce document, **« terminé »** signifie : fonctionnalité présente dans le code, cohérente avec l'architecture partagée et sans bug bloquant identifié à la lecture. Cela ne vaut pas validation en navigateur ni sur plusieurs téléphones : les vérifications réellement exécutées sont indiquées plus bas.

## Jeux et espaces repérés

| Espace | Chemin | Statut réel |
|---|---|---|
| Hub React | `src/` | Terminé dans le code : 9 tuiles, carrousel, réglages, musique, PWA. |
| Salon de la soirée | `public/soiree/` | Terminé pour 5 jeux ; liste limitée à Undercover, Poker Face, Photo Roulette, Qui de nous ?, Les Petites Vérités. |
| Undercover | `public/undercover/` | Terminé dans le code : rôles, mots personnalisables, salon public, gages, scores, snapshot. |
| Poker Face | `public/pokerface/` | Terminé dans le code : caméra/MediaPipe, médias, téléphone-caméra WebRTC, gages, scores. |
| Photo Roulette | `public/photoroulette/` | Terminé dans le code : consentement, photos/vidéos, manches, scores, snapshot. |
| Qui de nous ? | `public/quidenous/` | Terminé dans le code : 12 types de manches, packs, photos, scores cumulés, `Party.report`. Contient un mode « piquant +18 » non signalé comme tel dans le hub (voir bugs). |
| Les Petites Vérités | `public/verites/` | Terminé dans le code : barrage 18+ explicite, vérités, échange, bluff, scores. |
| Codenames | `public/codenames/` | **Non fonctionnel en l'état** : la création de partie échoue (voir bugs). Hors salon partagé. |
| Make It Meme | `public/makeitmeme/` | **Partie solo/bots uniquement** : le multijoueur Firebase n'est pas configuré (voir bugs). Hors salon partagé. |
| Petit Bac Boom | — | **Page absente** alors que la tuile existe encore dans le hub. |

## Fonctionnalités terminées (dans le code)

### Hub
- Catalogue de 9 jeux en carrousel 3D, navigation clavier (flèches/Entrée), glisser-swipe, sélection au clic.
- Réglages persistés (`soiree:set`) : thème clair/sombre, animations (`off`/`light`/`full`), musique et volume.
- Musique générative WebAudio (`src/hubAudio.ts`), coupée quand l'onglet est masqué.
- PWA : manifest, icônes, service worker, page hors-ligne, métadonnées de partage avec `%ORIGIN%` remplacé côté serveur.

### Salon de la soirée
- Création/rejoindre un salon à 4 caractères, QR code, partage, copie du lien.
- Présence en direct, couronne de l'hôte, passage de relais automatique, reprise après rechargement.
- Choix du jeu par l'hôte diffusé à tous (`go`), classement de soirée cumulé, gages partagés.
- Retour au salon depuis chaque jeu intégré (`Party.endCard`, `Party.listen`).

### Jeux intégrés au salon (5)
- Undercover, Poker Face, Photo Roulette, Qui de nous ?, Les Petites Vérités : `Net.enter`/`Net.join`, session `Sess`, `Party.report`, snapshot `R.snap`, `onPromote`/`onDemote`, retour au salon.
- Barrières d'âge : case 18+ et mémorisation `soiree:18ok` pour Les Petites Vérités ; confirmation pour la banque de gages 18+ dans `gages.js`. À conserver.

### Serveur et partagé
- Relais en mémoire : salons, présence, hôte, événements ciblés ou diffusés, snapshot, reprise, salons publics (Undercover), classement.
- `net.js` : reconnexion exponentielle, heartbeat, envois fiables jusqu'à 20 s, synchronisation d'horloge (`Net.clock`), reprise de session, promotion/démotion d'hôte.
- Limites serveur : 2 000 salons, 32 connexions/salon, TTL salon vide 20 min, grâce d'hôte 20 s, parties 12 h, code de soirée 4 caractères, snapshot 2 Mo, événement 16 Mo, score 64 Ko.
- ICE/TURN optionnel (`METERED_*`, `TURN_*`) pour Poker Face en 4G.

## Fonctionnalités en cours / incomplètes

- **Codenames** : règles complètes (deux équipes, 25 cartes, maître-espion, assassin, listes de mots personnalisées, pause, journal), mais la partie ne peut pas être créée et le jeu n'est pas branché au salon partagé (code 6 caractères, pas de `Party`, pas de snapshot, pas de reprise, pas de gestion de promotion).
- **Make It Meme** : éditeur de memes abouti (canvas, textes déplaçables, styles, 60 templates, bots, sélection/édition/vote/résultats, modération), mais le multijoueur et la persistance reposent sur Firebase non configuré. En pratique : solo contre bots, pas de partie entre téléphones, pas de reprise, pas de classement de soirée.
- **Salon de la soirée** : n'expose que 5 jeux alors que le hub en affiche 9. Codenames et Make It Meme n'y figurent pas ; Petit Bac Boom y figurerait mais n'existe plus.
- **Tuile « verrouillée »** : la propriété `locked` et le cadenas existent dans `Home.tsx`, mais aucun jeu ne l'utilise.
- **Salons publics** : implémentés côté serveur et utilisés uniquement par Undercover ; pas de découverte globale dans le hub.
- **Tests client/E2E** : absents. Aucun test de `net.js`, `party.js`, des pages de jeux ou d'un parcours multi-téléphones.

## Bugs et écarts identifiés

### Bloquants
1. **Codenames ne peut pas créer de partie.** `public/codenames/index.html` appelle `Net.join("cn-"+code)` sans `{ create:true }` ; le relais répond `404 noroom` pour un salon inexistant. Le code étant généré côté client, le salon n'existe jamais : « Créer une partie » échoue. À confirmer en navigateur, mais le chemin de code est sans ambiguïté.
2. **Make It Meme n'est pas multijoueur.** `__firebase_config`, `__app_id` et `__initial_auth_token` ne sont définis nulle part (ni dans la page, ni injectés par `api/lib/vite.ts`). Le jeu bascule donc toujours en repli local : les salons vivent dans la mémoire de la page, aucun autre appareil ne peut rejoindre, un rechargement efface tout, et deux onglets du même navigateur partagent le même `uid`.
3. **Lien mort « Petit Bac Boom ».** La page a été supprimée (commit `75cf6b6`, « suppr prtitbac ») mais la tuile est restée dans `Home.tsx`. Le fallback SPA renvoie le hub au lieu d'un 404, donc le clic semble « ne rien faire ».

### Majeurs
4. **Codes de salon incompatibles.** Tout le système partagé (session, partage, `bootParams`, `Party.codeOf`, `/board`) attend 4 caractères ; Codenames et Make It Meme utilisent 6 caractères (et `?room=` pour Make It Meme).
5. **Classement de soirée réutilisable par collision.** Les parties sont indexées par code à 4 caractères pendant 12 h ; créer un nouveau salon avec un code déjà utilisé additionne les scores de deux soirées.
6. **Relais sans authentification ni limitation de débit.** Le `cid` est fourni par le client : une connexion peut usurper l'hôte pour écraser le snapshot ou poster des scores. `/event` accepte 16 Mo par requête.
7. **Événements non idempotents.** `net.js` réessaie jusqu'à 20 s sans identifiant de message : une réponse perdue peut rejouer une action (double vote, double passage de phase). Le serveur ne déduplique que les scores par `sid`.
8. **Barrière 18+ incomplète dans Qui de nous ?** Le mode « 🌶️ piquant +18 » (`quidenous/index.html`) utilise des banques `*_18` sans confirmation d'âge, et le hub ne signale pas ce jeu comme 18+ (seule « Les Petites Vérités » porte le badge).

### Mineurs / robustesse
9. `npm start` utilise `NODE_ENV=production node …` (syntaxe POSIX) : correct sur Render/Docker, en échec sous Windows.
10. Make It Meme : code admin `Lext.71` en clair dans le client ; pseudos non échappés dans le lobby/le podium ; deux templates partagent la même image ; compteur 60 templates vs commentaire 59 vs texte initial 40 ; timers basés sur l'horloge locale, sans `Net.clock`.
11. Make It Meme : quitter un salon ne retire pas le joueur de la liste (joueurs fantômes).
12. `serveStatic({ root: "./dist/public" })` dépend du répertoire courant alors que la page d'accueil utilise un chemin absolu : fragile si le serveur n'est pas lancé depuis `app/`.
13. Le fallback SPA renvoie le hub pour toute URL HTML inconnue : les liens morts sont masqués.
14. Snapshot silencieusement ignoré au-delà de 1,8 Mo côté client (2 Mo côté serveur).
15. `parties` n'est pas plafonné strictement au-delà de 500 parties actives.
16. Double enregistrement du service worker (hub en production + `net.js` sur HTTPS), sans conséquence pratique.

## Points techniques importants (à conserver)
- `public/shared/net.js` gère le client réseau commun, la reconnexion et la communication avec le relais.
- `api/lib/relay.ts` contient la classe `Relay` et l'état des salons en mémoire.
- `api/routes/rooms.ts` expose les routes `join`, `stream` (SSE), `event`, `snap`, `leave`, `score`, `board`, `ice` et `public`.
- **L'hôte d'une partie exécute la logique du jeu dans son navigateur** ; le serveur relaie, conserve un instantané et gère les scores cumulés. Ne pas déplacer les règles du jeu côté serveur sans demande explicite.
- **Le relais est en mémoire du processus** : un redémarrage efface salons, snapshots et classements. Il est mono-instance.
- Le code de soirée est dérivé du nom de salon (`uc-ABCD` → `ABCD`) et doit rester à 4 caractères tant que `Party`, `Sess`, `bootParams` et `/board` ne sont pas adaptés.
- Les fichiers partagés sont des **globals** : vérifier l'ordre des scripts et tous leurs consommateurs avant modification.
- Les protections 18+ existantes (Les Petites Vérités, banque de gages adulte) ne doivent être ni retirées, ni contournées, ni étendues à des espaces non appropriés.
- Le hub et les jeux sont conçus mobile/tactile : `viewport-fit=cover`, zones sûres, cibles tactiles, pas de contrôle uniquement au survol.
- Skills disponibles : `game-page-development` (pages de jeux), `realtime-multiplayer` (salon/réseau/relais), `verification-and-handoff` (contrôles et passation).

## Vérifications

### Réalisées le 13 novembre 2026
- Lecture complète ou ciblée de tous les fichiers applicatifs listés dans la section « Jeux et espaces ».
- `git status --short` : aucun fichier applicatif modifié ; seuls les documents non suivis mentionnés plus haut.
- `npm test` **tenté et échoué avant exécution** : `'vitest' n'est pas reconnu`, car `node_modules` est absent. Ce n'est pas un échec de test.
- `npm run check` et `npm run build` **non lancés** : ils nécessitent une installation préalable, et l'analyse devait rester en lecture seule.

### Reste à vérifier (après `npm install` dans `app/`)
- `npm run check`, `npm test`, `npm run build`.
- En navigateur, sur au moins deux téléphones : création/rejoindre un salon, passage de relais, reprise après verrouillage, retour au salon, classement cumulé.
- Codenames : création de partie (bug attendu), puis parcours complet si corrigé.
- Make It Meme : confirmer le repli solo et l'absence de synchronisation entre appareils.
- Poker Face : caméra, MediaPipe, WebRTC et TURN en 4G.
- Les barrières 18+ (Les Petites Vérités et gages adultes) restent intactes.

## Modifications récentes
- **2026-11-13** — Mise à jour de ce document après analyse en lecture seule : état réel des jeux, bugs identifiés, vérifications honnêtes, prochaines étapes. **Aucune modification de code.**
- Commits notables déjà présents : `40e06ba` (suppression de `app/README-OPENCODE.md`), `0e19a6a` (Make It Meme), `e543bdb` (Codenames), `75cf6b6` (suppression de Petit Bac Boom).

## Prochaines étapes de développement

1. **Trancher le sort des trois jeux problématiques** (décision utilisateur nécessaire) :
   - Petit Bac Boom : retirer la tuile du hub, ou restaurer la page ;
   - Codenames : l'intégrer réellement (code 4 caractères, `Net.enter({create:true})`, `Sess`, `R.snap`, `onPromote`, `Party.report`, entrée dans le salon) ou le retirer du hub ;
   - Make It Meme : le rebrancher sur le relais Hono, ou le marquer explicitement « solo / bots » et retirer le discours multijoueur.
2. **Aligner la liste du Salon de la soirée** sur le hub, ou documenter clairement que le salon ne couvre que 5 jeux.
3. **Installer les dépendances** puis lancer `npm run check`, `npm test`, `npm run build` et consigner les résultats réels ici.
4. **Sécuriser et fiabiliser le relais** : identité de connexion, limitation de débit, taille des événements, tests des cas de reconnexion et de doublons.
5. **Corriger le classement** : éviter la réutilisation d'un code de soirée actif (codes plus longs ou génération/nettoyage explicite).
6. **Traiter la cohérence 18+** : confirmation pour le mode piquant de Qui de nous ? et/ou badge dans le hub, sans affaiblir les barrières existantes.
7. **Assainir Make It Meme** si le jeu est conservé : retirer le secret admin du client, échapper les pseudos, dédupliquer le template, synchroniser les timers, nettoyer les joueurs partants.
8. **Outillage multiplateforme** : corriger `npm start` sous Windows, vérifier le répertoire de travail de `serveStatic`, et ajouter au minimum un test du parcours de création de salon.
9. **Documentation à aligner** (non modifiée dans cette tâche) : `ARCHITECTURE.md` (liste des jeux, commandes depuis `app/`, limites du relais), `app/README.md` (liste des jeux, `npm start` sous Windows), `AGENTS.md` (préciser `cd app` avant les commandes npm).

## À compléter après chaque tâche importante
- Date : 2026-11-13
- Objectif : refléter l'état réel du projet dans `PROJECT_STATUS.md`
- Fichiers / zones modifiés : `PROJECT_STATUS.md` uniquement (documentation)
- Décisions techniques à conserver : l'hôte navigateur reste autoritaire ; le relais reste en mémoire ; ne pas intégrer un jeu au salon sans code 4 caractères, session, snapshot et `Party.report`.
- Vérifications lancées et résultats : lecture de code uniquement ; `npm test` non exécutable faute de `node_modules` ; `check` et `build` non lancés.
- Problèmes connus / limites : Codenames non créable ; Make It Meme solo ; Petit Bac Boom absent ; salon limité à 5 jeux ; pas de tests client.
- Prochaine étape concrète : décision sur Petit Bac Boom, Codenames et Make It Meme, puis `npm install` et exécution des trois vérifications.
