# Assemble un décor d'acte : 3 panneaux (p1, p2, p3) -> 5 tuiles [p1, p1 miroir, p2, p2 miroir, p3] fondues,
# découpées en 3 bandes 2870x810 + ciel + premier plan détouré (bords seulement).
# Usage : python3 stage.py <dossier sources png> <préfixe ex. l3> <dossier sortie ex. l3/> <dossier sources pipeline>
import sys, json, os
import numpy as np
from PIL import Image, ImageOps
src, pre, out, keep = sys.argv[1:5]
os.makedirs(out, exist_ok=True); os.makedirs(keep, exist_ok=True)
def fit(im, w, h):
    r = w / h; W, H = im.size
    if W / H > r: nw = int(H * r); im = im.crop(((W - nw) // 2, 0, (W - nw) // 2 + nw, H))
    else: nh = int(W / r); im = im.crop((0, (H - nh) // 2, W, (H - nh) // 2 + nh))
    return im.resize((w, h), Image.LANCZOS)
S = {k: Image.open(f'{src}/{pre}_{k}.png').convert('RGB') for k in ['p1', 'p2', 'p3', 'sky', 'fg']}
for k in S: fit(S[k], 2240, 960).save(f'{keep}/{k}.webp', 'WEBP', quality=88)
SC = 1.5; TW = int(1260 * SC); OV = int(140 * SC); H = int(540 * SC)
tiles = [fit(S['p1'], TW, H), ImageOps.mirror(fit(S['p1'], TW, H)), fit(S['p2'], TW, H), ImageOps.mirror(fit(S['p2'], TW, H)), fit(S['p3'], TW, H)]
W = TW * 5 - OV * 4; c = np.zeros((H, W, 3)); x = 0
for i, t in enumerate(tiles):
    a = np.array(t).astype(float); w = np.ones(TW)
    if i > 0: w[:OV] = np.linspace(0, 1, OV)
    c[:, x:x + TW] = c[:, x:x + TW] * (1 - w)[None, :, None] + a * w[None, :, None]; x += TW - OV
img = Image.fromarray(c.clip(0, 255).astype(np.uint8)); pw = W // 3; parts = []
for i in range(3):
    n = f'stage_{i}.webp'; img.crop((i * pw, 0, (i + 1) * pw if i < 2 else W, H)).save(out + n, 'WEBP', quality=84, method=4); parts.append([n, pw if i < 2 else W - 2 * pw])
json.dump({'scale': SC, 'tile': 1260.0, 'ov': 140.0, 'width': W / SC, 'parts': parts}, open(out + 'stage.json', 'w'))
fit(S['sky'], 2240, 960).save(out + 'st_sky.webp', 'WEBP', quality=82)
a = np.array(fit(S['fg'], 2240, 960)).astype(float); R, G, B = a[..., 0], a[..., 1], a[..., 2]
al = np.clip(1 - (G - np.maximum(R, B) - 18) / 42, 0, 1); a[..., 1] = np.minimum(G, np.maximum(R, B) + 6)
Hh, Ww = al.shape; xx = np.linspace(0, 1, Ww)[None, :]; yy = np.linspace(0, 1, Hh)[:, None]
mask = np.maximum(np.clip(1 - (np.minimum(xx, 1 - xx) - .06) / .05, 0, 1), np.clip((yy - .91) / .04, 0, 1))
Image.fromarray(np.dstack([a, al * mask * .6 * 255]).clip(0, 255).astype(np.uint8), 'RGBA').save(out + 'st_fg.webp', 'WEBP', quality=84)
print(pre, 'ok', W / SC)
