# Musique : liste des morceaux et cahier des charges

**Combien de morceaux ?** 6 pour l'Acte I, 11 pour le jeu complet (Actes I à III). Un 12ᵉ, l'ambiance du menu « Chroniques », est optionnel.

Dépose chaque fichier dans `music/` avec le nom indiqué. Le jeu l'utilise automatiquement. Tant qu'un fichier manque, la musique générée par le code prend le relais.

## Format
- MP3 192 kbit/s ou OGG, 44,1 kHz, stéréo, environ −14 LUFS intégré, crête vraie à −1 dBTP.
- **Morceaux en boucle** : pas de fondu à la fin, et la dernière mesure doit s'enchaîner sur la mesure de bouclage. Indique les points de boucle (en secondes) dans `music/music.json` : `{"stage1":{"loopStart":4.36,"loopEnd":132.0}}`. Une intro avant la boucle est possible.
- **Jingles** : pas de boucle, avec une queue de réverbération propre.

## Leitmotiv commun : le Thème d'Orun
Pentatonique de la mineur, à faire réapparaître dans chaque morceau (tempo, timbre et harmonie variables) :
`La3 (noire) · Do4 (croche) · Ré4 (croche) · Mi4 (blanche) | Sol4 (croche) · Mi4 (croche) · Ré4 (noire) · Do4 (noire) · La3 (blanche)`

Palette sonore : tambour parlant (dùndún), shekere, kora ou ngoni, chœurs graves, cuivres cinématiques, basses synthé analogiques, nappes et arpèges rétro-futuristes. Afrobeat et orchestre de film, avec une touche de synthwave.

## Acte I (6 morceaux)
| # | Fichier | Usage | Durée | Tempo / tonalité | Brief (prompt Suno instrumental) |
|---|---|---|---|---|---|
| 1 | `title.mp3` | Écran titre, menus | boucle 1:30–2:00 | 88 BPM, la mineur | afrofuturist cinematic main theme, kora arpeggio, talking drum, warm analog pads, choir, majestic and melancholic, instrumental |
| 2 | `intro.mp3` | Cinématique d'ouverture | **46 s exactement**, sans boucle | 90 → 120 BPM | cinematic afrofuturist trailer, ritual drums build, choir swells, epic brass hits, rising tension, final massive impact, instrumental |
| 3 | `stage1.mp3` | Acte I, Marché Haut | boucle 2:00–2:30 | 112 BPM, la mineur | afrobeat x synthwave beat 'em up stage music, driving bass, shekere, talking drum fills, kora lead hook, energetic, instrumental |
| 4 | `boss1.mp3` | Oba Ferrum | boucle ~2:00 | 138 BPM, ré mineur | heavy epic boss battle, distorted bass, war drums, anvil and metal percussion, brass stabs, dark choir, relentless, instrumental |
| 5 | `clear.mp3` | Victoire, fin d'acte | 8–12 s | libre, majeur | triumphant afrofuturist victory fanfare, brass, choir, kora flourish, short jingle |
| 6 | `over.mp3` | Game over | 5–8 s | lent | somber game over sting, low choir, fading talking drum, short |

### Repères de synchro de `intro.mp3`
Les coupes de la cinématique tombent sur ces instants :

| Temps | Événement | Ce qu'il faut à l'oreille |
|---|---|---|
| 0–4 s | Noir, « Il y a trois siècles… » | Tambour seul, souffle |
| 4 s | La cité apparaît | Nappe et chœur qui s'ouvrent |
| 9 s | Le réacteur vidé | Tension, cordes graves |
| 13,5 s | Nyx et l'arche | Thème sombre |
| 18 s | **Un quartier tombe** | Gros impact et grave |
| 23 s | Les trois héritiers | Le leitmotiv, héroïque |
| 27,5 s | Les yeux d'Amara | Montée |
| 32,5 s | **Le plongeon** | Drop : le rythme entre |
| 37,5 s | **Titre** | Coup final, puis tenue jusqu'à 46 s |

## Actes II et III (5 morceaux)
| # | Fichier | Usage | Brief |
|---|---|---|---|
| 7 | `stage2.mp3` | Jardins-Turbines | airy afro-house, wind textures, flutes, marimba, 118 BPM |
| 8 | `boss2.mp3` | Yewa-Nul | eerie and swirling, reversed choir, wind, broken rhythms, 128 BPM |
| 9 | `stage3.mp3` | La Flèche d'Ọ̀run | dark synthwave and afrobeat, metallic arps, 124 BPM |
| 10 | `boss3.mp3` | Nyx Adébayo | fast duel theme, violin and kora, glitchy drums, 150 BPM, Orun motif in minor |
| 11 | `finale.mp3` | Fin et générique | 2–3 min, Orun theme in full, choir, hopeful |
| (12) | `chroniques.mp3` | Menu des récits, optionnel | calm ambient kora and pads |
