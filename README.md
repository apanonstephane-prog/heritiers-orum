# Les Héritiers d'Orun — Actes I à VI

Beat 'em up 2.5D afro-futuriste (Phaser 3.80, HTML/JS statique, sans build). Jeu : https://heritiers-orun.vercel.app

## Commandes
| Action | Clavier | Tactile | Manette |
|---|---|---|---|
| Déplacement 8 directions | Flèches / ZQSD | Joystick | Stick / croix |
| Courir | Double-tape ou direction maintenue | Direction maintenue | Direction maintenue |
| Frappe (combo ×3, coup arrière, coup en course) | J | Frappe | X |
| Saut (+ frappe aérienne) | K / Espace | Saut | A |
| Esquive (invincible) | Maj | Esquive | B |
| Tempête (50 énergie, sinon −15 PV) | L | Tempête | Y / RB |
| Prise | avancer contre un ennemi | idem | idem |
| Genou / projection pendant la prise | J / K | Frappe / Saut | X / A |
| Pause | Échap / P | ⏸ | Start |

3 vies par crédit, 2 crédits de reprise au dernier point de contrôle.

## Musique et scénario
- `MUSIC.md` : les 11 morceaux à produire (6 pour l'Acte I), avec tempos, synchro de l'intro et prompts. Dépose les fichiers dans `music/` et liste-les dans `music/music.json` (`available`, `loops`) : le jeu les utilise à la place de la musique procédurale.
- `STORY.md` : bible narrative (monde, personnages, 3 actes, 3 boss).
- `intro/` : cinématique (8 plans Higgsfield, dont 4 animés avec Kling 4.0).

## Héros jouables
Amara, Kofi, Zuri, Kenzo, Soléa, Toussaint : choix à l'écran titre (J1 et J2). Planches dans `h/` (`atlas_<héros>` bureau, `atlas_m<héros>` mobile), chargées à la demande. Table `HEROES` (stats) et `SUPER` (deux supers par héros) dans `game.js`. Images sources dans `pipeline/frames/h_<héros>`, specs `spec_h_*.json`.

## Actes
Chaque acte se termine par une cinématique (plans dans `cine/`, séquences `CINES` dans `game.js`) ; celle de l'Acte VI est la fin du jeu.
- **Acte I · Les Quartiers suspendus** : décor à la racine, boss Oba Ferrum.
- **Acte II · Les Jardins-Turbines** : dossier `l2/` (décor, `atlas_l2*` Faucheuse + Yewa-Nul), rafales de vent, spores, lianes. Sources dans `pipeline/src/l2` et `pipeline/frames/l2`, specs `spec_l2*.json`.
- **Acte III · Les Docks des Nuages** : `l3/`, harponneurs + Commandante Ìjì, bombardements.
- **Acte IV · Les Bassins d'Ọ̀ṣun** : `l4/`, plongeurs + Ọ̀ṣun-Nul, crue (le sol monte et ralentit).
- **Acte V · Les Archives d'Ifá** : `l5/`, spectres + Ẹ̀ṣù-Miroir (reflets), salles plongées dans le noir.
- **Acte VI · La Flèche d'Ọ̀run** : `l6/`, Lames-Lune + Nyx Adébayo (contre, gravité), ascenseur orbital. Fin du jeu.
- Score, vies, étoiles et crédits passent d'un acte à l'autre. Les données de chaque acte sont dans `LEVELS` (game.js).

## Structure
- `index.html` : HUD, écrans, commandes tactiles. `game.js` : moteur (animation, IA, combat, boss, audio procédural).
- `atlas_main_*` (Amara + 5 ennemis) chargés au démarrage ; `atlas_boss_*` chargé en arrière-plan.
- `pipeline/` : chaîne de production des sprites (sources Higgsfield, frames détourées, scripts, specs d'atlas), exclue du déploiement.

## Intégration sur un site
```html
<iframe src="https://heritiers-orun.vercel.app" allow="autoplay; fullscreen; gamepad" style="width:100%;aspect-ratio:16/9;border:0"></iframe>
```
