# Le Hub de Soirée

Hub de jeux de soirée jouables chacun sur son téléphone : **Undercover**, **Poker Face**, **Photo Roulette**,
**Qui de nous ?**, **Les Petites Vérités (18+)**, plus un **Salon de la soirée** (un seul code pour enchaîner les jeux,
classement cumulé).

## Comment ça marche

- `src/` : le hub (React + Vite), une seule page d'accueil avec les jaquettes.
- `public/<jeu>/index.html` : chaque jeu est une page autonome (HTML + JS).
- `public/shared/` : code commun aux jeux
  - `net.js` – connexion temps réel (reconnexion auto, envois fiables, reprise de session, passage de relais de l'hôte)
  - `profile.js` – profil commun (pseudo, avatar emoji, couleur)
  - `gages.js` – banque de gages (intensité réglable, 18+ séparé)
  - `party.js` – partage (QR code), classement de la soirée, retour au salon
  - `base.css`, `components.css`, `widgets.css` – styles partagés
- `api/` : petit serveur Hono qui **relaie** les messages entre joueurs (`api/lib/relay.ts`, testé dans `relay.test.ts`).
  L'hôte de chaque partie fait tourner la logique du jeu dans son navigateur ; le serveur ne fait que relayer,
  garder une « photo » de la partie (pour le passage de relais) et additionner les points de la soirée.

## Lancer en local

```bash
cd app
npm install
npm run dev      # http://localhost:3000
npm test         # tests du relais
```

## Déploiement (Render)

`npm ci && npm run build` puis `npm start` (ou le `Dockerfile`). **Aucune variable d'environnement n'est obligatoire.**

Variables facultatives, uniquement pour que la caméra de Poker Face marche en 4G (serveur TURN). Au choix :

| Option | Variables |
|---|---|
| Metered.ca (gratuit, le plus simple) | `METERED_DOMAIN` (ex. `monappli.metered.live`) et `METERED_API_KEY` |
| coturn, identifiants fixes | `TURN_URLS` (ex. `turn:mon.serveur:3478`), `TURN_USERNAME`, `TURN_CREDENTIAL` |
| coturn, secret partagé | `TURN_URLS` et `TURN_SECRET` |

`GET /api/rooms/ice` indique si un TURN est actif (`"turn": true`).

Les salons sont gardés en mémoire du serveur : un redémarrage de Render (déploiement, mise en veille de l'offre
gratuite) vide les parties en cours.
