# Mimic Party — installer les vrais sons

Le jeu joue maintenant de vrais extraits (voix, cris, chansons) rangés dans `sounds/v2/<id>.mp3`.
Un son absent est simplement ignoré (le salon affiche combien sont prêts).

## 1. Télécharger les sons (une seule fois)
Dans PowerShell, dans le dossier `mimicparty` (Node 18+ requis) :

    node tools/fetch-sounds.js            # télécharge tout ce qui manque
    node tools/fetch-sounds.js --report   # liste présents / manquants
    node tools/fetch-sounds.js --no-sfx   # seulement paroles et chants

Les titres choisis sont notés dans `sounds/v2/_sources.json` : vérifie que chaque son est le bon.

## 2. Corriger un son (ou ajouter TikTok / YouTube)
- Dépose ton propre `<id>.mp3` dans `sounds/v2/` : il est prioritaire (ex. `quoicoubeh.mp3`).
- Ou crée `sounds/v2/_overrides.json` puis supprime le MP3 concerné et relance le script :

      { "quoicoubeh": "https://www.myinstants.com/media/sounds/xxxx.mp3",
        "pedro": { "url": "https://www.tiktok.com/@xxx/video/123", "start": 2, "dur": 6 } }

  Les liens TikTok/YouTube demandent `winget install yt-dlp.yt-dlp` et `winget install Gyan.FFmpeg`.

## 3. Ajouter un mème
Ajoute une ligne dans `TABLE` de `memes.js` (id, nom, emoji, catégorie, difficulté, type `voice`/`song`/`sfx`,
mots-clés de recherche, ce que ça dit, description), puis relance le script.
Le jeu coupe le silence, normalise le volume et garde 5 s max (`{ max: 6, start: 1.5 }` en dernier champ pour ajuster).

## Droits
Ces extraits viennent de contenus protégés : très bien pour des soirées entre amis, mais
n'héberge pas publiquement le dossier `sounds/` sans autorisation.
