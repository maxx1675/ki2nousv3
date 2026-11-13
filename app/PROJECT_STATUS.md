# État du projet — ki2nousv3

> Document de reprise pour les sessions OpenCode. État initial établi à partir de l'archive du dépôt fournie le 13 novembre 2026 (fichiers de l'archive datés du 12 novembre 2026). Ce document doit être actualisé après les changements importants.

## Résumé
**Le Hub de Soirée** est une application web de jeux de groupe : un hub React/Vite et plusieurs jeux accessibles séparément depuis un navigateur, avec un serveur Hono pour les salons multi-joueurs, les événements et le classement cumulé.

## État actuel observé dans l'archive
- Frontend du hub : React 19, TypeScript 5.9 et Vite 7.
- Pages des jeux : HTML/CSS/JavaScript autonomes sous `public/`.
- Code commun des jeux : `public/shared/`.
- Backend : Hono, avec relais temps réel et routes de salons sous `api/`.
- Tests présents : `api/lib/relay.test.ts` avec Vitest.
- Scripts npm présents : `dev`, `build`, `preview`, `start`, `check`, `format`, `test`.
- Déploiement documenté : Render (construction `npm ci && npm run build`, lancement `npm start` ou Dockerfile).

## Jeux et espaces repérés
- Salon de la soirée (`public/soiree/`) : salon commun pour enchaîner les jeux et cumuler le classement.
- Qui de nous ? (`public/quidenous/`) : jeu de votes et de questions, avec données sous `public/quidenous/data/`.
- Les Petites Vérités (`public/verites/`) : page signalée 18+ dans le hub ; conserver les protections existantes.
- Photo Roulette (`public/photoroulette/`) : jeu autour de photos/vidéos et de la connexion entre joueurs.
- Undercover (`public/undercover/`).
- Poker Face (`public/pokerface/`) : jeu caméra ; paramètres ICE/TURN disponibles côté serveur.

## Points techniques importants
- `public/shared/net.js` gère le client réseau commun, la reconnexion et la communication avec le relais.
- `api/lib/relay.ts` contient la classe `Relay` et l'état des salons en mémoire.
- `api/routes/rooms.ts` expose les routes join, stream SSE, event, snap, leave, score, board, ice et public.
- L'hôte d'une partie exécute la logique du jeu dans son navigateur ; le serveur relaie les messages, maintient un instantané pour la reprise et gère les scores cumulés.
- Les salons en mémoire peuvent être perdus lors d'un redémarrage du serveur, comme l'indique le README.

## Modifications récentes
_Aucune modification postérieure à l'archive n'est connue au moment de la création de ce fichier. OpenCode doit compléter cette section après les prochaines tâches substantielles._

## Vérifications
- Les commandes et scripts sont définis dans `package.json`.
- Les tests n'ont pas été exécutés pendant la génération de cette documentation.
- OpenCode doit exécuter les vérifications adaptées après chaque changement et consigner les résultats réels ici.

## Prochaines étapes
_Aucune roadmap fiable n'est déductible de l'archive seule. Ne pas inventer de fonctionnalités à faire : demander ou déduire les prochaines étapes des demandes et décisions de l'utilisateur._

## À compléter après chaque tâche importante
- Date :
- Objectif :
- Fichiers / zones modifiés :
- Décisions techniques à conserver :
- Vérifications lancées et résultats :
- Problèmes connus / limites :
- Prochaine étape concrète :
