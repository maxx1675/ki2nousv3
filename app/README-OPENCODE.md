# Installer ce pack dans OpenCode

## Contenu

- `AGENTS.md` : règles permanentes du dépôt, chargées automatiquement par OpenCode depuis la racine du projet.
- `PROJECT_STATUS.md` : mémoire évolutive du projet, à lire au début d'une nouvelle tâche et à mettre à jour après les tâches importantes.
- `ARCHITECTURE.md` : carte technique, à consulter pour la partie de code concernée.
- `.opencode/skills/*/SKILL.md` : compétences spécialisées chargées à la demande.

## Installation

1. Décompresse l'archive GitHub de `ki2nousv3`.
2. Ouvre le dossier `app` — celui qui contient directement `package.json`, `src/`, `public/` et `api/`.
3. Copie le contenu de ce pack **dans ce dossier `app`**, en conservant l'arborescence et le dossier caché `.opencode`.
4. Si un fichier de même nom existe déjà, compare-le avant de le remplacer : conserve les règles et informations propres que tu aurais déjà ajoutées.
5. Ouvre un terminal dans ce dossier, puis lance `opencode`.

Sous PowerShell, exemple (adapte le chemin) :
```powershell
cd "C:\chemin\vers\ki2nousv3-main\app"
opencode
```

## Mémoire persistante : comment ça marche

OpenCode n'utilise pas `CLAUDE.md` comme fichier d'instructions de projet. Il lit `AGENTS.md`. Ce fichier est chargé lorsque OpenCode est lancé depuis le dossier du projet. C'est le socle des règles à conserver.

`PROJECT_STATUS.md` est la mémoire qui évolue entre les conversations. Il ne faut pas y recopier tout le code. Il doit contenir uniquement le contexte utile à la reprise : état, décisions, changements récents, tests, problèmes connus et prochaine étape. Les instructions dans `AGENTS.md` demandent à l'agent de le lire au début et de le mettre à jour après une tâche substantielle.

`ARCHITECTURE.md` est une carte relativement stable. OpenCode ne doit ouvrir que les sections utiles à la tâche, pas le réinjecter intégralement à chaque prompt.

Les résumés de compaction d'OpenCode servent à résumer une longue session ; ils ne remplacent pas ces fichiers versionnés et ne constituent pas à eux seuls une mémoire fiable entre deux sessions indépendantes.

## Skills : comment les utiliser

Les skills sont rangés dans `.opencode/skills/<id>/SKILL.md`. OpenCode découvre automatiquement les dossiers de ce type dans le projet. Il affiche au modèle leurs noms/descriptions, puis charge le contenu complet lorsqu'une compétence est utile.

Skills inclus :
- `@game-page-development` : modification d'une page de jeu autonome.
- `@realtime-multiplayer` : réseau, salons, événements, hôte, reconnexion et relais.
- `@verification-and-handoff` : tests, revue du diff et mise à jour de la mémoire.

Tu peux les appeler explicitement dans ton message en écrivant `@game-page-development`, etc. Sinon, OpenCode peut sélectionner une skill selon sa description et la tâche.

## Premier démarrage conseillé

1. Vérifie que le terminal courant est bien dans le dossier qui contient `package.json`.
2. Dans OpenCode, lance `/connect`, choisis le fournisseur DeepSeek et saisis ta clé API si tu utilises directement l'API DeepSeek. Ne partage jamais la clé dans une conversation ou un fichier du dépôt.
3. Lance `/models` et sélectionne **DeepSeek V4.1 Flash** si le modèle est proposé. Si tu utilises OpenCode Zen/Console, sélectionne le modèle affiché sous le fournisseur OpenCode. Le catalogue peut différer selon ton compte et ton fournisseur.
4. Commence avec l'agent `build` pour les tâches de programmation. Utilise `plan` pour demander une analyse ou un plan sans modifier les fichiers.
5. Pour confirmer que le contexte projet est bien chargé, demande : « Résume les consignes de AGENTS.md et l'état du projet dans PROJECT_STATUS.md, sans modifier de fichier. »

## Prompt de reprise de tâche recommandé

```text
Lis AGENTS.md et PROJECT_STATUS.md. Examine uniquement les fichiers nécessaires à ma demande.
Avant toute modification, résume brièvement les fichiers que tu comptes toucher et les risques de régression. Ensuite réalise la tâche, lance les vérifications adaptées et mets à jour PROJECT_STATUS.md avec les résultats réels.
```

## Quand une session devient longue

La compaction automatique est activée par défaut dans OpenCode. Elle résume une partie de la conversation pour libérer du contexte, mais cette opération peut perdre certains détails. Avant de changer de session, demande à l'agent de mettre à jour `PROJECT_STATUS.md` ; c'est la mémoire durable. Ne laisse pas tout le contexte important uniquement dans un résumé de conversation.
