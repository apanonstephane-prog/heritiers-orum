import sys, glob
from PIL import Image, ImageDraw
src, prefix, out = sys.argv[1], sys.argv[2], sys.argv[3]
fs = sorted(glob.glob(f'{src}/{prefix}*.webp') + glob.glob(f'{src}/{prefix}*.png'))
th = 150; cols = 15
ims = [Image.open(f).convert('RGBA') for f in fs]
w = max(int(i.width * th / i.height) for i in ims)
g = Image.new('RGBA', (cols * w, ((len(ims) + cols - 1) // cols) * (th + 14)), (36, 26, 50, 255))
d = ImageDraw.Draw(g)
for k, im in enumerate(ims):
    t = im.resize((int(im.width * th / im.height), th)); x, y = (k % cols) * w, (k // cols) * (th + 14)
    g.alpha_composite(t, (x, y + 14)); d.text((x + 3, y + 1), str(k), fill=(255, 220, 120, 255))
g.convert('RGB').save(out, quality=78); print(len(ims), g.size)
