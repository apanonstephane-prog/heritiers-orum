# Construit les atlas d'animation (pages WebP <= 4096 px) + méta JSON à partir de specs de clips.
# Spec : {char: {"scale": s, "sources": {name: [glob, prescale]}, "clips": {clip: [[src, a, b, mode], ...]}}}
# mode "g" = ancrage pieds commun à la vidéo ; "c" = ancrage au centre de la frame (sauts).
import sys, json, glob, os
import numpy as np
from PIL import Image

spec = json.load(open(sys.argv[1])); outdir = sys.argv[2]; os.makedirs(outdir, exist_ok=True)
PAGE = 4096; PAD = 2

def load_src(pattern, pre):
    fs = sorted(glob.glob(pattern)); ims = []
    for f in fs:
        im = Image.open(f).convert('RGBA'); big = im.width >= 900 or im.height >= 700
        if pre != 1: im = im.resize((round(im.width * pre), round(im.height * pre)), Image.LANCZOS)
        a = np.array(im); a[:, :, 3] = np.where(a[:, :, 3] < 28, 0, a[:, :, 3]); ims.append(Image.fromarray(feather(a) if big else a))
    return ims

def feather(a):
    # effet coupé net par le bord de la vidéo : on l'estompe au lieu d'afficher une arête droite
    al = a[:, :, 3].astype(float); H, W = al.shape; m = al > 100
    for side in ('l', 'r', 't'):
        edge = m[:, :3].any(1) if side == 'l' else m[:, -3:].any(1) if side == 'r' else m[:3, :].any(0)
        n = edge.sum(); L = H if side != 't' else W
        if n < max(24, .10 * L): continue
        d = int(max(40, (W if side != 't' else H) * .3)); r = np.clip(np.arange(d) / d, 0, 1); ramp = r * r * (3 - 2 * r)
        if side == 'l': al[:, :d] *= ramp[None, :]
        elif side == 'r': al[:, -d:] *= ramp[::-1][None, :]
        else: al[:d, :] *= ramp[:, None]
    a = a.copy(); a[:, :, 3] = np.where(al < 28, 0, al).astype(np.uint8); return a

def feet_anchor(ims, idx):
    a = np.array(ims[idx])[:, :, 3] > 120
    ys, xs = np.nonzero(a); bottom = ys.max(); band = ys >= bottom - (ys.max() - ys.min()) * .12
    return float(xs[band].mean()), float(bottom)

meta = {}; pages = []; page_imgs = []
def new_page():
    page_imgs.append(Image.new('RGBA', (PAGE, PAGE), (0, 0, 0, 0))); pages.append({'x': 0, 'y': 0, 'row': 0})
new_page()
def place(im):
    w, h = im.size; p = pages[-1]
    if p['x'] + w + PAD > PAGE: p['x'] = 0; p['y'] += p['row'] + PAD; p['row'] = 0
    if p['y'] + h + PAD > PAGE: new_page(); p = pages[-1]
    x, y = p['x'], p['y']; page_imgs[-1].paste(im, (x, y)); p['x'] += w + PAD; p['row'] = max(p['row'], h)
    return len(page_imgs) - 1, x, y

for char, cs in spec.items():
    s = cs['scale']; srcs = {}; anchors = {}
    for name, (pattern, pre) in cs['sources'].items():
        ims = load_src(pattern, pre * s); srcs[name] = ims
        anchors[name] = feet_anchor(ims, cs.get('anchor_frame', {}).get(name, 0))
    cmeta = {'clips': {}, 'frames': {}}
    cache = {}; cbx = {}
    for clip, segs in cs['clips'].items():
        keys = []
        for seg in segs:
            src, a, b, mode = seg[:4]; step = seg[4] if len(seg) > 4 else 1
            for i in range(a, b + 1, step):
                k = f'{char}_{src}_{i:03d}_{mode}'
                if k not in cache:
                    im = srcs[src][i]; bb = im.getbbox()
                    if not bb: bb = (0, 0, 2, 2)
                    t = im.crop(bb); pg, x, y = place(t); cbx[k] = bb[0]
                    if mode == 'g': ax, ay = anchors[src][0] - bb[0], anchors[src][1] - bb[1]
                    elif mode == 'cb':  # recentré sur le corps (colonne la plus dense), pieds en bas : déplacements portés par le moteur
                        col = np.convolve(np.array(t)[:, :, 3].astype(float).sum(0), np.ones(31) / 31, 'same'); ax, ay = float(col.argmax()), t.height
                    elif mode == 'b': ax, ay = anchors[src][0] - bb[0], t.height  # saut : pieds = bas de la frame, la hauteur vient de la physique
                    else: ax, ay = t.width / 2, t.height / 2
                    cache[k] = 1
                    cmeta['frames'][k] = [pg, x, y, t.width, t.height, round(ax / t.width, 4), round(ay / t.height, 4)]
                keys.append(k)
        cmeta['clips'][clip] = keys
        cb = [k for k in keys if k.endswith('_cb')]
        if len(cb) >= 3:  # ancrage horizontal lissé (moyenne glissante en coordonnées source) : plus de tremblement
            xs = [cmeta['frames'][k][5] * cmeta['frames'][k][3] + cbx[k] for k in cb]
            sm = [float(np.mean(xs[max(0, i - 1):i + 2])) for i in range(len(xs))]
            for k, x in zip(cb, sm): f = cmeta['frames'][k]; f[5] = round((x - cbx[k]) / f[3], 4)
    # hauteur de référence (idle) pour l'échelle en jeu
    ref = srcs[cs['ref'][0]][cs['ref'][1]]; bb = ref.getbbox(); cmeta['refH'] = bb[3] - bb[1]
    if cs.get('fpsMul'): cmeta['fpsMul'] = {c: v for c, v in cs['fpsMul'].items() if abs(v - 1) > .01}
    meta[char] = cmeta
    print(char, len(cmeta['frames']), 'frames, refH', cmeta['refH'], 'pages', len(page_imgs))

names = []
for i, pg in enumerate(page_imgs):
    bb = pg.getbbox(); pg = pg.crop((0, 0, PAGE, bb[3] + 2)) if bb else pg
    n = f'atlas_{sys.argv[3]}_{i}.webp'; pg.save(os.path.join(outdir, n), 'WEBP', quality=86, method=4); names.append(n)
    print(n, pg.size, os.path.getsize(os.path.join(outdir, n)) // 1024, 'Ko')
json.dump({'pages': names, 'chars': meta}, open(os.path.join(outdir, f'atlas_{sys.argv[3]}.json'), 'w'))
