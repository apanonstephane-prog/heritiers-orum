# Découpe les planches Higgsfield en frames + encode les décors -> assets.json
import sys, glob, io, base64, json
import numpy as np
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
IDS = {'run': '7ae3214a', 'act': '9c308132', 'ronin': 'dd78280a', 'archer': '1c115f46', 'tengu': '8b836bdb', 'oni': '6d8fea03',
       'far1': '11b2cccb', 'mid1': '216df13c', 'far2': '2a8e019b', 'mid2': '4e293481', 'far3': 'faf7b496', 'mid3': '19e05994',
       'near1': '75873326', 'near2': '69c2cc4c', 'near3': 'e864ea5e', 'key': 'b3a8b446', 'lineup': '60cc4df3'}
OVR = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}

def path(k):
    m = glob.glob(f'{SRC}/**/*{IDS[k]}*', recursive=True)
    if not m: sys.exit('manque ' + k)
    return m[0]

def uri(im, q=82, fmt='WEBP'):
    b = io.BytesIO(); im.save(b, fmt, quality=q, method=4); return f'data:image/{fmt.lower()};base64,' + base64.b64encode(b.getvalue()).decode(), len(b.getvalue())

def runs_of(on, gap):
    runs, i, n = [], 0, len(on)
    while i < n:
        if on[i]:
            j = i
            while j < n and on[j]: j += 1
            runs.append([i, j]); i = j
        else: i += 1
    out = []
    for r in runs:
        if out and r[0] - out[-1][1] < gap: out[-1][1] = r[1]
        else: out.append(r)
    return out

def split_frames(im, n=6, open_px=15, keep_loose=False, force_cuts=None):
    """n frames : coupes aux n-1 vallées de densité « corps », puis composantes connexes rattachées à leur cellule."""
    from scipy import ndimage
    arr = np.array(im); mask = arr[:, :, 3] > 40
    op = ndimage.binary_opening(mask, structure=np.ones((open_px, open_px)))
    dens = ndimage.uniform_filter1d(op.sum(0).astype(float), 41)
    Wd = arr.shape[1]; xs = np.nonzero(dens > 0)[0]; left, right = xs.min(), xs.max()
    span = (right - left) / n; cuts = []
    for c in np.argsort(dens, kind='stable'):
        if c <= left + span * .5 or c >= right - span * .5: continue
        if all(abs(c - d) > span * .62 for d in cuts): cuts.append(int(c))
        if len(cuts) == n - 1: break
    if force_cuts: cuts = list(force_cuts)
    cuts.sort(); edges = [0] + cuts + [Wd]
    cell_of = np.searchsorted(np.array(cuts), np.arange(Wd), side='right')
    lab, nl = ndimage.label(mask, structure=np.ones((3, 3)))
    outs = [np.zeros_like(arr) for _ in range(n)]
    for idx, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None: continue
        comp = lab[sl] == idx
        if comp.sum() < 150: continue
        cells_body = set(cell_of[sl[1]][(op[sl] & comp).any(0)])
        if len(cells_body) <= 1:
            if cells_body: ci = cells_body.pop()
            else:
                ys, xs2 = np.nonzero(comp); ci = int(cell_of[sl[1].start + int(xs2.mean())])
            sub = outs[ci][sl]; sub[comp] = arr[sl][comp]
        else:
            for ci in cells_body:
                m = comp & (cell_of[sl[1]] == ci)[None, :]; sub = outs[ci][sl]; sub[m] = arr[sl][m]
    frames = []
    for o in outs:
        if not keep_loose:  # retire les fragments isolés venus d'une frame voisine
            l2, n2 = ndimage.label(o[:, :, 3] > 40, structure=np.ones((3, 3)))
            if n2 > 1:
                sizes = ndimage.sum(np.ones_like(l2), l2, range(1, n2 + 1)); main = int(np.argmax(sizes)) + 1
                ob = ndimage.find_objects(l2); my = ob[main - 1]; pad = 6
                for q, sl2 in enumerate(ob, 1):
                    if q == main or sl2 is None: continue
                    inter = sl2[1].start < my[1].stop + pad and sl2[1].stop > my[1].start - pad and sl2[0].start < my[0].stop + pad and sl2[0].stop > my[0].start - pad
                    if not inter or sizes[q - 1] < sizes[main - 1] * .003: o[:, :, 3][l2 == q] = 0
        f = Image.fromarray(o); bb = f.getbbox(); frames.append(f.crop(bb) if bb else Image.new('RGBA', (4, 4)))
    return frames

CUTS = {'act': [448, 780, 1100, 1860, 2368]}
ERASE = {'act': {3: (.86, .62, 1, 1)}}

def sheet(k, target, ref='first', fly=False, n=6, refh=None, clean=False):
    im = Image.open(path(k)).convert('RGBA')
    cols = split_frames(im, n, keep_loose=fly, force_cuts=CUTS.get(k))
    crops = []
    for fi, c in enumerate(cols):
        er = ERASE.get(k, {}).get(fi)
        if er:  # efface un débordement de la frame voisine
            arr = np.array(c); h_, w_ = arr.shape[:2]
            arr[int(er[1] * h_):int(er[3] * h_), int(er[0] * w_):int(er[2] * w_), 3] = 0
            c = Image.fromarray(arr); c = c.crop(c.getbbox())
        if clean:
            from scipy import ndimage
            arr = np.array(c); lab, nl = ndimage.label(arr[:, :, 3] > 30)
            if nl > 1:
                sizes = ndimage.sum(np.ones_like(lab), lab, range(1, nl + 1)); keep = sizes >= sizes.max() * .04
                mask = np.isin(lab, np.nonzero(keep)[0] + 1); arr[:, :, 3] = np.where(mask, arr[:, :, 3], 0)
                c = Image.fromarray(arr); c = c.crop(c.getbbox())
        crops.append(c)
    hs = [c.height for c in crops]
    rh = refh if refh else (hs[ref] if isinstance(ref, int) else hs[0] if ref == 'first' else float(np.median(hs)))
    s = min(1.0, target / rh)
    fr = []
    for c in crops:
        c2 = c.resize((max(1, round(c.width * s)), max(1, round(c.height * s))), Image.LANCZOS)
        a = np.array(c2)[:, :, 3].astype(float) / 255
        ys, xs = np.nonzero(a > .15)
        if fly:
            ax, ay = float((xs * a[ys, xs]).sum() / a[ys, xs].sum()), float((ys * a[ys, xs]).sum() / a[ys, xs].sum())
        else:
            lo = c2.height * .72; m = ys >= lo
            ax = float(xs[m].mean()) if m.any() else c2.width / 2; ay = float(c2.height)
        u, sz = uri(c2, 86)
        fr.append({'s': u, 'w': c2.width, 'h': c2.height, 'ax': round(ax, 1), 'ay': round(ay, 1)})
    print(f'{k}: {len(cols)} frames, hauteurs {hs}, ref {rh:.0f} -> x{s:.3f}, {sum(len(f["s"]) for f in fr)//1024} Ko')
    return fr, rh * s

def bg(k, h, q=78):
    im = Image.open(path(k)); im = im.convert('RGBA' if k.startswith(('mid', 'near')) else 'RGB')
    im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    if k.startswith('near'):  # bande centrale atténuée : le premier plan ne masque pas l'action
        arr = np.array(im).astype(float); y = np.linspace(0, 1, h)[:, None]
        m = 1 - .72 * np.clip(np.minimum((y - .2) / .14, (.84 - y) / .14), 0, 1)
        arr[:, :, 3] *= m; im = Image.fromarray(arr.astype(np.uint8))
    u, sz = uri(im, q); print(f'{k}: {im.size} {sz//1024} Ko'); return u

def src_heights(k, n=6):
    return [(0, 0, f.width, f.height) for f in split_frames(Image.open(path(k)).convert('RGBA'), n)]

A = {'hero': {}, 'ref': {}}
A['hero']['run'], A['ref']['hero'] = sheet('run', 300, 'median')
act_h = [b[3] - b[1] for b in src_heights('act')]
act_full = OVR.get('act_full') or float(np.median(act_h)) / OVR.get('act_ratio', .85)
A['hero']['act'], _ = sheet('act', 300, refh=act_full, clean=True)
A['ronin'], A['ref']['ronin'] = sheet('ronin', 320, OVR.get('ronin_ref', 'first'))
A['archer'], A['ref']['archer'] = sheet('archer', 310, OVR.get('archer_ref', 4))
A['tengu'], A['ref']['tengu'] = sheet('tengu', 240, 'median', fly=True)
A['oni'], A['ref']['oni'] = sheet('oni', 460, OVR.get('oni_ref', 'first'))
A['worlds'] = [{'far': bg(f'far{i}', 960), 'mid': bg(f'mid{i}', 900, 80), 'near': bg(f'near{i}', 960, 80)} for i in (1, 2, 3)]
A['key'] = bg('key', 752, 84)
A['lineup'] = bg('lineup', 600, 80)
js = json.dumps(A)
open(OUT, 'w').write(js); print('TOTAL', len(js) // 1024, 'Ko')
