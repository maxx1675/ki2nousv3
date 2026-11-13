# Instructions du projet — ki2nousv3

## Rôle de l'agent
Tu aides à développer **Le Hub de Soirée**, une application web multi-joueurs composée d'un hub React et de plusieurs jeux indépendants. Travaille dans le dépôt ouvert, pas dans une copie inventée du projet.

## Démarrage de chaque nouvelle tâche
1. Exécute `git status --short` pour repérer les modifications déjà présentes. Ne les écrase jamais sans raison.
2. Lis `PROJECT_STATUS.md` pour connaître l'état connu du projet et les dernières décisions.
3. Consulte `ARCHITECTURE.md` uniquement pour la zone concernée. N'analyse pas tout le dépôt si quelques fichiers ciblés suffisent.
4. Repère les appels, événements, styles et contrats existants avant de modifier une fonctionnalité.

## Principes de modification
- Préfère la modification minimale et cohérente à une réécriture générale.
- N'invente pas une API, un fichier, une fonctionnalité ou un comportement : vérifie d'abord dans le code.
- Le hub React se trouve dans `src/`. Les jeux autonomes se trouvent dans `public/<jeu>/index.html`. Le code partagé des jeux se trouve dans `public/shared/`.
- Les pages de jeux utilisent du HTML/CSS/JavaScript navigateur. Vérifie leurs scripts globaux et leur ordre de chargement avant de déplacer du code ou de changer une interface partagée.
- Le relais temps réel est dans `api/`. La logique d'une partie reste principalement côté navigateur de l'hôte ; le serveur relaie les événements, conserve un instantané et gère le classement de soirée. Ne déplace pas cette responsabilité sans demande explicite et analyse préalable.
- Préserve la compatibilité entre les jeux, `public/shared/net.js`, `public/shared/party.js` et les routes du serveur.
- Respecte TypeScript strict, les types existants et les conventions de nommage du projet.
- Préserve les comportements mobiles, tactiles et responsive : les jeux sont conçus pour être utilisés sur téléphone.
- Conserve les barrières d'âge déjà présentes. Ne retire pas, ne contourne pas et n'étends pas à des espaces non appropriés les protections des sections signalées 18+.
- Ne modifie pas les questions, banques de données ou contenus des jeux sans que cela soit nécessaire à la demande.

## Vérifications
Après une modification, lance les vérifications pertinentes :
- `npm run check` pour TypeScript ;
- `npm test` pour les tests Vitest, notamment le relais ;
- `npm run build` pour vérifier la compilation et le bundle de production.

Lance les trois lorsque la modification touche plusieurs couches ou le fonctionnement général. Pour une petite modification purement visuelle, fais au minimum les vérifications adaptées et indique clairement celles qui n'ont pas été exécutées. Ne prétends jamais qu'un test a réussi si tu ne l'as pas réellement lancé.

## Git et sécurité
- Ne lis pas, n'affiche pas et ne copie pas les secrets des fichiers `.env`.
- Ne fais pas de `git reset --hard`, de suppression massive, de force-push ou de `git push` sans accord explicite.
- N'écrase pas les changements préexistants de l'utilisateur.
- Avant une opération risquée, explique son effet et demande l'autorisation.

## Mémoire du projet / fin de tâche
- `AGENTS.md` contient les règles permanentes : garde-le concis.
- `PROJECT_STATUS.md` est la mémoire évolutive : après une tâche substantielle, actualise les sections « État actuel », « Modifications récentes », « Vérifications » et « Prochaines étapes ».
- `ARCHITECTURE.md` décrit la structure durable : ne le modifie que si l'architecture change réellement.
- N'ajoute pas un journal détaillé de chaque micro-action. Note seulement les décisions, changements, tests et points à reprendre utiles à une nouvelle session.
- Termine par un résumé court : fichiers changés, comportement obtenu, vérifications lancées/résultats, éventuelles limites et mise à jour de la mémoire.

## Skills spécialisées
Charge le skill adapté lorsque la demande concerne :
- une page de jeu : `@game-page-development` ;
- le réseau, les salons, la synchronisation ou le relais : `@realtime-multiplayer` ;
- les tests, la validation ou la passation à une nouvelle session : `@verification-and-handoff`.
