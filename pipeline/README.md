# Chaîne de production des sprites

Visuels générés avec Higgsfield (planches personnages, décors, accessoires), puis animés avec Kling 3.0 en image-to-video : caméra fixe, profil strict, fond vert #00B140.

1. **Extraction et détourage.** Chaque vidéo est extraite à 15 i/s puis détourée par chroma key (excès de vert G−max(R,B), alpha = 1−(gex−18)/42, suppression du débordement). Résultat : `frames/amara_raw`, `frames/amara_keyed`, `frames/enemy_raw`. Scripts : `tools/vid2sprites.py` et `tools/key.py`.
2. **Planches de contrôle numérotées** avec `tools/contact.py`, pour choisir les plages d'images de chaque clip.
3. **Atlas.** `python3 pipeline/tools/atlas.py pipeline/specs/spec_main.json . main`, idem avec `spec_boss.json … boss`. Le script produit des pages WebP de 4096 px et un JSON `{pages, chars:{char:{clips, frames:{key:[page,x,y,w,h,ox,oy]}, refH}}}`. Mode "g" = ancrage aux pieds, commun à toute la vidéo ; mode "c" = ancrage au centre (sauts).
4. `src/` contient les images sources Higgsfield : planches personnages (dont Kofi et Zuri, pas encore animés), ennemis, boss, décors, accessoires.

Pour ajouter un personnage : générer la planche, puis l'image de départ sur fond vert, puis les vidéos Kling (environ 7,5 crédits par clip de 5 s), extraire et détourer, ajouter les plages dans un spec, et reconstruire l'atlas.
