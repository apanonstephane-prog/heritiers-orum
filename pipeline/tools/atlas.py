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
        im = Image.open(f).convert('RGBA')
        if pre != 1: im = im.resize((round(im.width * pre), round(im.height * pre)), Image.LANCZOS)
        a = np.array(im); a[:, :, 3] = np.where(a[:, :, 3] < 28, 0, a[:, :, 3]); ims.append(Image.fromarray(a))
    return ims

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
    cache = {}
    for clip, segs in cs['clips'].items():
        keys = []
        for seg in segs:
            src, a, b, mode = seg[:4]; step = seg[4] if len(seg) > 4 else 1
            for i in range(a, b + 1, step):
                k = f'{char}_{src}_{i:03d}_{mode}'
                if k not in cache:
                    im = srcs[src][i]; bb = im.getbbox()
                    if not bb: bb = (0, 0, 2, 2)
                    t = im.crop(bb); pg, x, y = place(t)
                    if mode == 'g': ax, ay = anchors[src][0] - bb[0], anchors[src][1] - bb[1]
                    else: ax, ay = t.width / 2, t.height / 2
                    cache[k] = 1
                    cmeta['frames'][k] = [pg, x, y, t.width, t.height, round(ax / t.width, 4), round(ay / t.height, 4)]
                keys.append(k)
        cmeta['clips'][clip] = keys
    # hauteur de référence (idle) pour l'échelle en jeu
    ref = srcs[cs['ref'][0]][cs['ref'][1]]; bb = ref.getbbox(); cmeta['refH'] = bb[3] - bb[1]
    meta[char] = cmeta
    print(char, len(cmeta['frames']), 'frames, refH', cmeta['refH'], 'pages', len(page_imgs))

names = []
for i, pg in enumerate(page_imgs):
    bb = pg.getbbox(); pg = pg.crop((0, 0, PAGE, bb[3] + 2)) if bb else pg
    n = f'atlas_{sys.argv[3]}_{i}.webp'; pg.save(os.path.join(outdir, n), 'WEBP', quality=86, method=4); names.append(n)
    print(n, pg.size, os.path.getsize(os.path.join(outdir, n)) // 1024, 'Ko')
json.dump({'pages': names, 'chars': meta}, open(os.path.join(outdir, f'atlas_{sys.argv[3]}.json'), 'w'))
