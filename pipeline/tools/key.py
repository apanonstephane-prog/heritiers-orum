# Détourage chroma vert d'une série d'images -> PNG RGBA alignés sur une bbox commune
import sys, glob, os
import numpy as np
from PIL import Image
from scipy import ndimage
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
fs = sorted(glob.glob(src))
def keyit(a):
    a = a.astype(float); R, G, B = a[..., 0], a[..., 1], a[..., 2]
    gex = G - np.maximum(R, B)                        # excès de vert
    alpha = np.clip(1 - (gex - 18) / 42, 0, 1)        # >60 : fond ; <18 : opaque
    # nettoie les îlots de fond résiduels
    m = alpha > .5; m = ndimage.binary_opening(m, iterations=1)
    lab, n = ndimage.label(m)
    if n:
        sizes = ndimage.sum(m, lab, range(1, n + 1)); keep = np.isin(lab, np.nonzero(sizes > sizes.max() * .01)[0] + 1)
        alpha = alpha * ndimage.binary_dilation(keep, iterations=2)
    a[..., 1] = np.minimum(G, np.maximum(R, B) + 6)   # suppression du débordement vert
    return np.dstack([a, alpha * 255]).clip(0, 255).astype(np.uint8)
ims = [Image.fromarray(keyit(np.array(Image.open(f).convert('RGB'))), 'RGBA') for f in fs]
bb = None
for im in ims:
    b = im.getbbox()
    if b: bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
for f, im in zip(fs, ims): im.crop(bb).save(os.path.join(out, os.path.basename(f).rsplit('.', 1)[0] + '.png'))
print(len(ims), 'bbox', bb)
