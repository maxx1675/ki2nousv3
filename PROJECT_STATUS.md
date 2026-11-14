# État du projet — ki2nousv3

> Document de reprise pour les sessions OpenCode. Dernière mise à jour : **14 novembre 2026**, après la vague de corrections sur les jeux (mode sombre, salon de la soirée, Photo Roulette par téléphone, Poker Face, Undercover, Codenames, Make It Meme). Modifications non commitées à la date de rédaction.
>
> **Emplacement réel de l'application : `app/`.** C'est le dossier qui contient `package.json`, `src/`, `public/` et `api/`. La racine du dépôt ne contient que la documentation et `.opencode/`. Toutes les commandes npm doivent être lancées depuis `app/`.

## Résumé
**Le Hub de Soirée** est une application web de jeux de groupe : un hub React/Vite, plusieurs jeux autonomes accessibles depuis un navigateur, et un serveur Hono qui relaie les salons temps réel, conserve un instantané de reprise et gère le classement cumulé de la soirée. La logique de chaque partie est exécutée dans le navigateur de l'hôte ; le serveur ne la calcule pas.

## État actuel vérifié (14 novembre 2026)
- Frontend du hub : React 19, TypeScript 5.9 (strict), Vite 7, React Router 7.
- Pages des jeux : HTML/CSS/JavaScript autonomes sous `public/`, avec scripts globaux et ordre de chargement à respecter.
- Code commun des jeux : `public/shared/` (`net.js`, `profile.js`, `party.js`, `gages.js`, `qr.js`, `theme.js`, CSS partagé) et thèmes dans `public/themes/`.
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
| Hub React | `src/` | Terminé dans le code : 8 tuiles, carrousel, réglages, musique, PWA. |
| Salon de la soirée | `public/soiree/` | Terminé pour 6 jeux : Undercover, Poker Face, Photo Roulette, Make It Meme, Qui de nous ?, Les Petites Vérités. |
| Undercover | `public/undercover/` | Terminé dans le code : rôles, mots personnalisables, salon public, gages, scores, snapshot. |
| Poker Face | `public/pokerface/` | Terminé dans le code : caméra/MediaPipe, médias, téléphone-caméra WebRTC, gages, scores. |
| Photo Roulette | `public/photoroulette/` | Terminé dans le code : consentement, photos/vidéos, manches, scores, snapshot, sélection de plus de 20 photos par lots. |
| Qui de nous ? | `public/quidenous/` | Terminé dans le code : 12 types de manches, packs, photos, scores cumulés, `Party.report`. Contient un mode « piquant +18 » non signalé comme tel dans le hub (voir bugs). |
| Les Petites Vérités | `public/verites/` | Terminé dans le code : barrage 18+ explicite, vérités, échange, bluff, scores. |
| Codenames | `public/codenames/` | Création de partie corrigée (`Net.join(...,{create:true})` + nouvel essai de code) ; toujours hors salon partagé (6 caractères). |
| Make It Meme | `public/makeitmeme/` | **Multijoueur fonctionnel via le relais Hono** : salons à 4 caractères, hôte autoritaire, reprise, bots, vote, classement de soirée. Désormais proposé dans le Salon de la soirée. |
| Petit Bac Boom | — | **Supprimé** : la tuile du hub a été retirée ; plus aucune référence dans `src/`. |

## Fonctionnalités terminées (dans le code)

### Hub
- Catalogue de 8 jeux en carrousel 3D, navigation clavier (flèches/Entrée), glisser-swipe, sélection au clic.
- Réglages persistés (`soiree:set`) : thème clair/sombre, animations (`off`/`light`/`full`), musique et volume.
- Musique générative WebAudio (`src/hubAudio.ts`), coupée quand l'onglet est masqué.
- PWA : manifest, icônes, service worker, page hors-ligne, métadonnées de partage avec `%ORIGIN%` remplacé côté serveur.

### Salon de la soirée
- Création/rejoindre un salon à 4 caractères, QR code, partage, copie du lien.
- Présence en direct, couronne de l'hôte, passage de relais automatique, reprise après rechargement.
- Choix du jeu par l'hôte diffusé à tous (`go`), classement de soirée cumulé, gages partagés.
- Retour au salon depuis chaque jeu intégré (`Party.endCard`, `Party.listen`).

### Jeux intégrés au salon (6)
- Undercover, Poker Face, Photo Roulette, Make It Meme, Qui de nous ?, Les Petites Vérités : `Net.enter`/`Net.join`, session `Sess`, `Party.report`, snapshot `R.snap`, `onPromote`/`onDemote`, retour au salon.
- Mode sombre : chaque jeu expose un thème clair/sombre. `public/shared/theme.js` ajoute un bouton flottant aux pages sans panneau de réglages (Make It Meme, Photo Roulette, Undercover, Codenames) ; Qui de nous ? et Les Petites Vérités gardent leur panneau intégré (le choix de thème n'y est plus masqué).
- Barrières d'âge : case 18+ et mémorisation `soiree:18ok` pour Les Petites Vérités ; confirmation pour la banque de gages 18+ dans `gages.js`. À conserver.

### Serveur et partagé
- Relais en mémoire : salons, présence, hôte, événements ciblés ou diffusés, snapshot, reprise, salons publics (Undercover), classement.
- `net.js` : reconnexion exponentielle, heartbeat, envois fiables jusqu'à 20 s, synchronisation d'horloge (`Net.clock`), reprise de session, promotion/démotion d'hôte.
- Limites serveur : 2 000 salons, 32 connexions/salon, TTL salon vide 20 min, grâce d'hôte 20 s, parties 12 h, code de soirée 4 caractères, snapshot 2 Mo, événement 16 Mo, score 64 Ko.
- ICE/TURN optionnel (`METERED_*`, `TURN_*`) pour Poker Face en 4G.

## Fonctionnalités en cours / incomplètes

- **Codenames** : règles complètes (deux équipes, 25 cartes, maître-espion, assassin, listes de mots personnalisées, pause, journal). La création de partie fonctionne désormais, mais le jeu n'est pas branché au salon partagé (code 6 caractères, pas de `Party`, pas de snapshot, pas de reprise, pas de gestion de promotion).
- **Make It Meme** : jeu complet et multijoueur (éditeur canvas, textes déplaçables, styles, 60 templates, bots, sélection/édition/vote/résultats, modération, sons Web Audio dédiés, thème « collage néon »). Branché sur le relais Hono via `public/shared/net.js`, salons à 4 caractères (`mim-`), hôte autoritaire, snapshot de reprise, `Party.report` et classement de soirée. Proposé dans la liste du Salon de la soirée.
- **Salon de la soirée** : expose 6 jeux sur les 8 du hub ; Codenames et le hub React restent hors salon.
- **Tuile « verrouillée »** : la propriété `locked` et le cadenas existent dans `Home.tsx`, mais aucun jeu ne l'utilise.
- **Salons publics** : implémentés côté serveur et utilisés uniquement par Undercover ; pas de découverte globale dans le hub.
- **Tests client/E2E** : absents. Aucun test de `net.js`, `party.js`, des pages de jeux ou d'un parcours multi-téléphones.

## Bugs et écarts identifiés

### Bloquants
Aucun bloquant connu à la lecture du code. Codenames a été corrigé le 14 novembre 2026 (voir ci-dessous).

### Corrigés le 14 novembre 2026
- **Codenames : création de partie.** `public/codenames/index.html` appelle désormais `Net.join("cn-"+code,{create:true})`, réessaie avec un nouveau code en cas de collision et refuse proprement un code déjà pris en rejoignant.
- **Salon de la soirée : hôte seul dans le jeu.** L'hôte attend la livraison de l'événement `go` avant de naviguer ; les invités ne restent plus dans le salon. Ajout de Make It Meme à la liste des jeux.
- **Undercover : votes bloqués à 0/4.** L'hôte diffuse `S.vdone`/`S.vneed` ; les invités voient la progression, le vote se clôture tout seul après 45 s et l'hôte peut le clôturer. Le mot du joueur éliminé est révélé et le couple de mots change quand quelqu'un meurt.
- **Qui de nous : jitter du texte** (animations rejouées sur des zones réécrites) et **« Quitter le salon »** (appel `.catch()` sur `R.leave()` qui ne renvoie pas de promesse).
- **Poker Face** : miroir limité à l'aperçu local, jeu possible sans caméra PC puis caméra téléphone, modération du salon (liste + exclusion), liens TikTok/Vimeo/Dailymotion/Instagram, jusqu'à 20 manches, résultat maintenu jusqu'à décision de l'hôte, photo de fin de manche même pour les gagnants, joueurs partants élagués, ICE/contraintes allégées.
- **Photo Roulette** : tirage jusqu'à 40 photos (10 vidéos), sélection jusqu'à 400, envoi de photos depuis un téléphone via QR code et salon temporaire `prp-<code>`.
- **Make It Meme** : code admin `admin`, bouton d'accueil, canvas plafonné à 1100 px et redessiné via `requestAnimationFrame` (glisser-déposer plus fluide), ombre portée sur le texte sans contour pour la lisibilité.
- **Mode sombre** : palettes claire/sombre pour Make It Meme, Photo Roulette, Undercover, Codenames, Qui de nous ? et Les Petites Vérités ; bouton de thème partagé `public/shared/theme.js`.

### Corrigés le 13 novembre 2026
- **Make It Meme est désormais multijoueur** : Firebase a été remplacé par le relais Hono (`Net.enter`/`Net.join`), avec hôte autoritaire, snapshot, reprise, promotion d'hôte et `Party.report`. Vérifié en navigateur (création, jointure par code, lobby, manches, vote, résultats, bots, reprise, exclusion).
- **Le lien mort « Petit Bac Boom » a disparu** : la tuile a été retirée de `Home.tsx`, plus aucune référence dans `src/`.
- **Codes Make It Meme alignés sur 4 caractères** (`mim-XXXX`), compatibles avec `Sess`, `bootParams`, `Party.codeOf` et `/board`. Codenames reste en 6 caractères (hors salon).
- **Pseudos et contenus Make It Meme échappés** dans le lobby, l'éditeur, le vote et le podium ; les joueurs partants sont élagués et les joueurs exclus sont mémorisés (`S.ban`) pour ne pas revenir en boucle.
- **Photo Roulette accepte plus de 20 photos** : traitement par lots, budget global de 30 s, miniatures incrémentales, fichiers ignorés signalés, déduplication et bouton « ➕ Ajouter d'autres photos ». Vérifié avec 25 puis 30 photos synthétiques.

### Majeurs
1. **Classement de soirée réutilisable par collision.** Les parties sont indexées par code à 4 caractères pendant 12 h ; créer un nouveau salon avec un code déjà utilisé additionne les scores de deux soirées.
2. **Relais sans authentification ni limitation de débit.** Le `cid` est fourni par le client : une connexion peut usurper l'hôte pour écraser le snapshot ou poster des scores. `/event` accepte 16 Mo par requête.
3. **Événements non idempotents.** `net.js` réessaie jusqu'à 20 s sans identifiant de message : une réponse perdue peut rejouer une action (double vote, double passage de phase). Le serveur ne déduplique que les scores par `sid`.
4. **Barrière 18+ incomplète dans Qui de nous ?** Le mode « 🌶️ piquant +18 » (`quidenous/index.html`) utilise des banques `*_18` sans confirmation d'âge, et le hub ne signale pas ce jeu comme 18+ (seule « Les Petites Vérités » porte le badge).

### Mineurs / robustesse
5. `npm start` utilise `NODE_ENV=production node …` (syntaxe POSIX) : correct sur Render/Docker, en échec sous Windows.
6. Make It Meme : code admin `admin` toujours en clair dans le client (choix produit), timers basés sur l'horloge locale (`Date.now`) sans `Net.clock` ; certains templates peuvent partager la même image.
7. `serveStatic({ root: "./dist/public" })` dépend du répertoire courant alors que la page d'accueil utilise un chemin absolu : fragile si le serveur n'est pas lancé depuis `app/`.
8. Le fallback SPA renvoie le hub pour toute URL HTML inconnue : les liens morts sont masqués.
9. Snapshot silencieusement ignoré au-delà de 1,8 Mo côté client (2 Mo côté serveur). Make It Meme retire les images base64 de son snapshot pour rester sous la limite ; les invités reconstruisent alors le meme depuis le template + texte.
10. `parties` n'est pas plafonné strictement au-delà de 500 parties actives.
11. Double enregistrement du service worker (hub en production + `net.js` sur HTTPS), sans conséquence pratique.

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
- Make It Meme : `public/makeitmeme/index.html` (page + logique hôte), `templates.js` (`window.MIM_TEMPLATES`, 60 modèles), `room-state.js` (`clone`, `sanitize`, `applyPatch`, `allowedGuestPatch`), thème `public/themes/makeitmeme.css` (papier, vert acide, rose vif, bleu électrique, ombres dures, Bungee). Le relais ignore l'expéditeur d'un `event` : l'hôte doit rendre son interface localement après diffusion.
- Photo Roulette : `fill()` renvoie `{added, skipped, timedOut}`, traite par lots avec un budget global de 30 s, déduplique sur `name|size|lastModified` et fusionne les files d'attente lors d'un ajout.

## Vérifications

### Réalisées le 14 novembre 2026 (vague de corrections)
- `npm run check` (depuis `app/`) : **réussi**.
- `npm test` : **réussi**, 16 tests (13 relais + 3 helpers de salon Make It Meme).
- `npm run build` : **réussi** (Vite + bundle serveur).
- Analyse syntaxique des blocs `<script>` inline des pages modifiées (Poker Face, Photo Roulette, Make It Meme, Undercover, Qui de nous, Vérités, Codenames, Soirée) : **aucune erreur**.
- Équilibre des accolades des CSS modifiés (`shared/base.css` et six thèmes) : **correct**.
- Pas de parcours navigateur complet ni de test multi-appareils pour cette vague : les corrections réseau/caméra (Poker Face, Photo Roulette par téléphone, Codenames, salon) restent à valider sur appareils réels.

### Réalisées le 13 novembre 2026 (tâche précédente)
- `npm run check` : **réussi**.
- `npm test` : **réussi**, 16 tests (13 relais + 3 helpers de salon Make It Meme).
- `npm run build` : **réussi** ; la copie `dist/public/makeitmeme/index.html` a été vérifiée à jour.
- Navigateur (serveur de développement, port 3000) — Make It Meme : création de salon, jointure par code dans un second onglet, mises à jour du lobby, sélection de template, éditeur, soumission, vote, résultats, podium final, `Party.report`/classement, rejouer, mode fusion, partie avec bots, reprise, exclusion d'un joueur, promotion d'hôte, bascule audio, modales.
- Navigateur — Photo Roulette : 25 photos synthétiques → 20 médias + 5 en file ; ajout de 5 → 30 dans la réserve ; échange maintenant 20 ; doublon refusé ; file épuisée jusqu'à 19 avec le message « Plus de photo de rechange ».
- Captures d'écran vérifiées : accueil, lobby, sélection, éditeur Make It Meme et écran médias Photo Roulette.
- `git status --short` : 3 fichiers modifiés et 4 fichiers ajoutés (voir ci-dessous), aucun autre fichier applicatif touché.

### Reste à vérifier
- Test sur un **vrai iPhone** : tirage Photo Roulette, envoi de photos par QR code, sélecteurs HEIC.
- Test sur **plusieurs appareils physiques** simultanés : Poker Face (WebRTC/TURN en 4G, caméra téléphone, exclusion), salon de la soirée (lancement Make It Meme), Undercover (progression des votes).
- Codenames : parcours complet de création après correctif, puis décision d'intégration au salon.
- Mode sombre : vérification visuelle de chaque jeu sur mobile et bureau.
- Les barrières 18+ (Les Petites Vérités et gages adultes) restent intactes.
- `npm start` sous Windows : commande POSIX toujours en échec (voir bug 5).

## Modifications récentes
- **2026-11-14** — Vague de corrections jeux : mode sombre partagé (`public/shared/theme.js`, boutons `.homelink`/`.themebtn` dans `base.css`, palettes claire/sombre des six thèmes), Make It Meme ajouté au Salon de la soirée + attente de `go`, Codenames créable, Undercover (progression des votes, délai de clôture, révélation et changement des mots), corrigés Qui de nous, Poker Face (caméra/miroir/modération/embeds/manches/résultat) et Photo Roulette (tirage 40, envoi par téléphone via QR).
- **2026-11-13** — Suppression de Petit Bac Boom du hub (`app/src/pages/Home.tsx`).
- **2026-11-13** — Make It Meme rebranché sur le relais Hono : salons 4 caractères, hôte autoritaire, snapshot/reprise, exclusion, bots, `Party.report`. Nouvelle DA (`public/themes/makeitmeme.css`) et nouvelle identité sonore Web Audio. Extraction de `templates.js` et `room-state.js` ; ajout de `api/lib/makeitmeme-room.test.ts`.
- **2026-11-13** — Photo Roulette : sélection de plus de 20 photos fiabilisée (lots, budget, miniatures progressives, déduplication, ajout par lot).
- **2026-11-13** — Passation précédente : documentation seule, aucune modification de code.
- Commits notables déjà présents : `40e06ba` (suppression de `app/README-OPENCODE.md`), `0e19a6a` (Make It Meme), `e543bdb` (Codenames), `75cf6b6` (suppression de Petit Bac Boom).

## Prochaines étapes de développement

1. **Valider Make It Meme dans le Salon de la soirée** sur plusieurs appareils : lancement par l'hôte, retour au salon et classement cumulé (l'intégration est faite).
2. **Trancher le sort de Codenames** : la création fonctionne ; reste à l'intégrer réellement (`Net.enter`, code 4 caractères, `Sess`, `R.snap`, `onPromote`, `Party.report`, entrée dans le salon) ou le retirer du hub.
3. **Compléter la liste du Salon de la soirée** : 6 jeux sur 8 ; Codenames reste le candidat naturel.
4. **Sécuriser et fiabiliser le relais** : identité de connexion, limitation de débit, taille des événements, tests des cas de reconnexion et de doublons.
5. **Corriger le classement** : éviter la réutilisation d'un code de soirée actif (codes plus longs ou génération/nettoyage explicite).
6. **Traiter la cohérence 18+** : confirmation pour le mode piquant de Qui de nous ? et/ou badge dans le hub, sans affaiblir les barrières existantes.
7. **Assainir Make It Meme** : le code admin (`admin`) reste un choix produit côté client ; synchroniser les timers via `Net.clock`, dédupliquer les templates en double.
8. **Outillage multiplateforme** : corriger `npm start` sous Windows, vérifier le répertoire de travail de `serveStatic`, et ajouter au minimum un test du parcours de création de salon.
9. **Documentation à aligner** : `ARCHITECTURE.md` (liste des jeux, commandes depuis `app/`, limites du relais), `app/README.md` (liste des jeux, `npm start` sous Windows), `AGENTS.md` (préciser `cd app` avant les commandes npm).

## À compléter après chaque tâche importante
- Date : 2026-11-14
- Objectif : corriger une série de bugs/features sur les jeux et ajouter le mode sombre (Make It Meme, Salon de la soirée, Photo Roulette, Poker Face, Undercover, Qui de nous, Codenames).
- Fichiers / zones modifiés : `app/public/soiree/index.html` ; `app/public/makeitmeme/index.html` ; `app/public/photoroulette/index.html` ; `app/public/pokerface/index.html` ; `app/public/undercover/index.html` ; `app/public/quidenous/index.html` ; `app/public/verites/index.html` ; `app/public/codenames/index.html` ; `app/public/shared/base.css` ; `app/public/shared/theme.js` (nouveau) ; `app/public/themes/{makeitmeme,photoroulette,undercover,codenames,quidenous,verites}.css` ; `PROJECT_STATUS.md`.
- Décisions techniques à conserver : hôte navigateur autoritaire, relais inchangé ; `R.leave()` ne renvoie pas de promesse ; codenames utilise `{create:true}` et un code à 6 caractères ; le salon attend la livraison de `go` avant navigation ; Photo Roulette réutilise le relais avec un salon temporaire `prp-<code>` pour le téléphone ; le thème clair/sombre est mémorisé dans `soiree:theme` (jeux avec `theme.js`) ou `soiree:set` (Qui de nous/Vérités) ; Poker Face reste sombre par défaut.
- Vérifications lancées et résultats : `npm run check` réussi ; `npm test` réussi (16) ; `npm run build` réussi ; syntaxe JS inline et accolades CSS vérifiées. Pas de parcours navigateur complet cette vague.
- Problèmes connus / limites : validations réelles iPhone/multi-appareils à faire (WebRTC, QR Photo Roulette, salon), Codenames toujours hors salon, barrière 18+ de Qui de nous inchangée.
- Prochaine étape concrète : tester le lancement Make It Meme depuis le Salon et l'envoi de photos Poker Face/Photo Roulette depuis un téléphone réel.
