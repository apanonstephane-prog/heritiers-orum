# Vidéo sur fond vert -> frames détourées (chroma key + suppression du débordement vert) + planche de contrôle
import sys, os, subprocess, glob
import numpy as np
from PIL import Image
vid, out, fps = sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 12
os.makedirs(out, exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', vid, '-vf', f'fps={fps}', f'{out}/raw_%03d.png'], check=True)
raws = sorted(glob.glob(f'{out}/raw_*.png'))
# couleur de fond estimée sur les coins de la première image
f0 = np.array(Image.open(raws[0]).convert('RGB')).astype(float)
corners = np.concatenate([f0[:20, :20].reshape(-1, 3), f0[:20, -20:].reshape(-1, 3), f0[-20:, :20].reshape(-1, 3), f0[-20:, -20:].reshape(-1, 3)])
key = np.median(corners, 0); print('fond', key.round())
frames = []
for r in raws:
    a = np.array(Image.open(r).convert('RGB')).astype(float)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    gness = G - np.maximum(R, B)                    # domination du vert
    dist = np.linalg.norm(a - key, axis=-1)
    alpha = np.clip((np.minimum(dist / 110, 1) * 1.0) * np.clip(1 - (gness - 25) / 60, 0, 1), 0, 1)
    alpha = np.where(dist < 45, 0, alpha)
    sp = np.maximum(G - np.maximum(R, B), 0)       # suppression du débordement
    a[..., 1] = G - sp * .85
    rgba = np.dstack([a, alpha * 255]).clip(0, 255).astype(np.uint8)
    frames.append(Image.fromarray(rgba, 'RGBA'))
bb = None
for f in frames:
    b = f.getbbox()
    if b: bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
for i, f in enumerate(frames): f.crop(bb).save(f'{out}/f_{i:03d}.png')
# planche de contrôle sur fond sombre
th = [f.crop(bb) for f in frames]; s = 220 / th[0].height; th = [t.resize((int(t.width * s), 220)) for t in th]
cols = 8; rows = (len(th) + cols - 1) // cols
sheet = Image.new('RGBA', (cols * th[0].width, rows * 220), (40, 32, 56, 255))
for i, t in enumerate(th): sheet.alpha_composite(t, ((i % cols) * th[0].width, (i // cols) * 220))
sheet.convert('RGB').save(f'{out}/_contact.jpg', quality=82)
print(len(frames), 'frames, bbox', bb)
