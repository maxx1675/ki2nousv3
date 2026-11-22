# Architecture technique — ki2nousv3

## 1. Vue d'ensemble
Le dépôt contient une application web sous le dossier `app/` de l'archive d'origine. **Le dossier à ouvrir comme workspace OpenCode est le dossier qui contient directement `package.json`, `src/`, `public/` et `api/`.**

Architecture en trois parties :
1. Hub web React/TypeScript construit par Vite.
2. Jeux indépendants servis depuis `public/`, avec une partie du code partagé en JavaScript navigateur.
3. Serveur Hono pour le relais réseau, les salons, les snapshots et le classement.

## 2. Technologies et commandes
- React `^19.2.0`, React DOM `^19.2.0`, React Router `^7.6.1`.
- TypeScript `~5.9.3`, mode strict activé.
- Vite `^7.2.4` et plugin React.
- Hono `^4.8.3`, `@hono/node-server`.
- Vitest `4.0.16`, Prettier `^3.7.4`, esbuild `^0.27.2`.

Commandes depuis le dossier `app/` (celui qui contient `package.json`) :
```bash
npm install       # installation initiale
npm run dev       # serveur de développement, port 3000
npm run check     # vérification TypeScript
npm test          # Vitest, exécute les tests
npm run build     # build Vite + bundle du serveur Hono
npm start         # démarrage du serveur de production après build
npm run format    # Prettier sur le dépôt
```

Le script `build` produit le frontend dans `dist/public` et le bundle serveur dans `dist/`. Ne pas modifier les sorties générées directement.

## 3. Hub React
- `src/main.tsx` : point d'entrée React.
- `src/App.tsx` : composant racine.
- `src/pages/Home.tsx` : accueil et catalogue des jeux.
- `src/App.css`, `src/index.css` : styles de l'application.
- `src/hubAudio.ts` : logique audio du hub.

Le hub référence les mini-jeux par leurs chemins publics. Lorsqu'on renomme ou déplace une page de jeu, mettre à jour les références correspondantes dans le hub.

## 4. Jeux côté navigateur
Chaque jeu est une page autonome sous `public/<jeu>/index.html` :
- `public/soiree/index.html` (salon de la soirée)
- `public/quidenous/index.html`
- `public/verites/index.html`
- `public/photoroulette/index.html`
- `public/blindtest/index.html` (banque musicale `public/blindtest/bank.js`)
- `public/undercover/index.html`
- `public/pokerface/index.html`
- `public/menteurs/index.html` (+ `scene.js` Three.js, `audio.js`, `menteurs.css`, `vendor/three.module.js`, `vendor/GLTFLoader.js`, `assets/revolver-quaternius.glb`)
- `public/codenames/index.html`
- `public/makeitmeme/index.html` (données `templates.js`, helpers `room-state.js`)
- `public/skyjo/index.html`
- `public/uno/index.html`
- `public/culturegame/index.html` (+ `game.js`, banque de questions, portraits `people/`)
- `public/garlicphone/index.html` (+ `game.js`)

Une partie du JavaScript et du CSS est intégrée directement aux pages. Il faut donc lire le fichier de la page avant de supposer qu'il existe un module JS séparé.

Code réutilisé :
- `public/shared/net.js` : identité locale, code de salon, session, connexion, événements et reconnexion réseau.
- `public/shared/profile.js` : profil, pseudo, avatar et couleur.
- `public/shared/party.js` : partage, QR code, classement de soirée, `Party.report`, `Party.listen` et retour au salon (`Party.endCard`, `Party.leaveCard`, option `compact`).
- `public/shared/library.js` : bibliothèque locale IndexedDB (`window.Lib`) utilisée par Poker Face et Photo Roulette.
- `public/shared/gages.js` : fonctions et données de gages.
- `public/shared/qr.js` : fonctions QR code.
- `public/shared/base.css`, `components.css`, `widgets.css` : styles communs.
- `public/themes/` : styles thématiques propres aux jeux.

Ces fichiers partagés ont un impact transversal : avant de les modifier, rechercher leurs usages dans toutes les pages de jeux. Conserver les contrats globaux et l'ordre des scripts, sauf refonte explicitement demandée.

## 5. Backend / temps réel
- `api/boot.ts` : création de l'application Hono, montage des routes et démarrage du serveur.
- `api/routes/rooms.ts` : endpoints HTTP des salons et flux SSE.
- `api/routes/youtube.ts` : lecture serveur des playlists YouTube et des thèmes élargis.
- `api/lib/relay.ts` : classe `Relay`, gestion des salons, connexions, hôte, événements, snapshots, nettoyage, salons publics et scores.
- `api/lib/youtube.ts` : validation, parsing RSS/page, parsing YouTube Music (`musicResponsiveListItemRenderer`), cache des playlists et des thèmes.
- `api/lib/relay.test.ts`, `api/lib/makeitmeme-room.test.ts`, `api/lib/youtube.test.ts` : tests Vitest.
- `api/lib/env.ts` : variables d'environnement et configuration.
- `api/lib/ice.ts` : serveurs ICE/TURN ; nécessaires aux fonctions WebRTC concernées.
- `api/lib/logger.ts` : journalisation.
- `api/lib/vite.ts` : service des fichiers statiques en production.

Contrat réseau décrit par `api/routes/rooms.ts` :
- `POST /api/rooms/join` : rejoindre/créer/reprendre un salon.
- `GET /api/rooms/stream` : flux d'événements Server-Sent Events (SSE).
- `POST /api/rooms/event` : relayer un événement.
- `POST /api/rooms/snap` : enregistrer l'instantané de partie fourni par l'hôte.
- `POST /api/rooms/leave` : quitter.
- `POST /api/rooms/score` et `GET /api/rooms/board` : scores et classement de soirée.
- `GET /api/rooms/ice` : paramètres ICE/TURN.
- `POST/GET /api/rooms/public` : présence temporaire des salons publics.
- `GET /api/youtube/playlist?list=…` : identifiants et métadonnées des vidéos d'une playlist YouTube (`{ ok, ids, items }`), avec cache mémoire de 10 min.
- `GET /api/youtube/theme?theme=…` : morceaux des sélections YouTube Music officielles d'un thème du Blind Test (`{ ok, items }`), avec cache mémoire de 10 min.

**La Table Des Menteurs** est la seule exception : son moteur est autoritaire côté serveur, pas dans le navigateur de l'hôte.
- `api/lib/menteurs.ts` : moteur en mémoire (`MenteursEngine`) — paquet 52 + 2 jokers, mains privées, cible limitée à `V`/`D`/`R`/`A`, tours, chronos (`roundAt`, `deadline`), contestation/révélation, barillet, éliminations, classement, `raised` public et action `raise`.
- `api/routes/menteurs.ts` : `/api/menteurs/create`, `/join`, `/state`, `/action`, avec limites de débit séparées.
- `api/lib/menteurs.test.ts` : 14 tests du moteur.
- Le client `public/menteurs/index.html` ne fait qu'afficher l'état public et envoyer des actions ; il ne reçoit jamais les mains des autres joueurs.

Le relais est gardé en mémoire du processus serveur : un redémarrage efface les salons en cours. Ne pas annoncer une persistance durable des salons sans l'avoir implémentée et testée.

## 6. Configuration et déploiement
- `vite.config.ts` lance le serveur Hono en dev via `@hono/vite-dev-server` et Vite sur le port 3000.
- `Dockerfile` décrit une voie de déploiement conteneurisée.
- `README.md` documente le déploiement Render et les variables facultatives liées à TURN.
- `.env` et `.env.*` sont ignorés par Git. Ne jamais demander à l'utilisateur de transmettre les secrets ; utiliser les noms de variables sans exposer leurs valeurs.

## 7. Tests et prudence lors des changements
- Les tests connus ciblent le relais (`api/lib/relay.test.ts`), les helpers de salon Make It Meme (`api/lib/makeitmeme-room.test.ts`), les playlists et thèmes YouTube (`api/lib/youtube.test.ts`) et le moteur La Table Des Menteurs (`api/lib/menteurs.test.ts`) — 39 tests Vitest.
- Une modification du protocole d'événement doit être vérifiée côté client et serveur, pas uniquement dans les tests du serveur.
- Les jeux étant exécutés dans de vrais navigateurs de téléphone, les changements d'interface doivent aussi prendre en compte tactile, viewport mobile, permissions média/caméra et reconnexion lorsque cela s'applique.
- Ne pas changer une API partagée sans rechercher ses consommateurs et adapter les pages concernées.

## 8. Crédits des assets
- `public/menteurs/assets/revolver-quaternius.glb` : revolver low-poly de **Quaternius**, licence **CC0**, via **Poly Pizza**.
- `public/culturegame/people/` : 22 portraits de personnalités contemporaines issus de Wikimedia Commons, sous licence CC BY / CC BY-SA / OGL / CC0. Attribution et sources dans `public/culturegame/people/CREDITS.md` et `credits.json`, volontairement non affichées dans le jeu ; **ne pas supprimer ces fichiers** sans remplacer les images par des œuvres libres de droits.
- `public/garlicphone/game.js` : en-tête de licence MIT du projet d'origine (attribution légale conservée dans le code, plus affichée dans l'interface).
- Le reste du saloon, les cartes, la table et les personnages de La Table Des Menteurs sont des modèles procéduraux créés dans `public/menteurs/scene.js` (aucune autre ressource externe). Les autres GLB téléchargés pour évaluation ont été retirés du dépôt.
