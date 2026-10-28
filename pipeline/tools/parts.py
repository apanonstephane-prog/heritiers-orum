# Récupère les segments PARTn|... des résultats du navigateur et reconstitue le paquet JSON -> fichiers
import sys, re, json, glob, base64, os
TR = '/root/.claude/projects/-home-claude/c64fe2ca-d66c-56f7-9682-f3a4aca918b1/tool-results/'
mode = sys.argv[1]
if mode == 'check':
    parts = {}
    for f in sorted(glob.glob(TR + '*.txt'), key=os.path.getmtime)[-int(sys.argv[2]):]:
        raw = open(f).read()
        for m in re.finditer(r'PART(\d+)\|([A-Za-z0-9+/=:,{}"_\\-]*)', raw):
            i_ = int(m.group(1)); parts[i_] = m.group(2) if len(m.group(2)) > len(parts.get(i_, '')) else parts[i_]
    print(sorted((k, len(v)) for k, v in parts.items()))
    json.dump(parts, open('/tmp/claude-0/-home-claude/c64fe2ca-d66c-56f7-9682-f3a4aca918b1/scratchpad/_parts.json', 'w'))
elif mode == 'build':
    out = sys.argv[2]; n = int(sys.argv[3]); os.makedirs(out, exist_ok=True)
    parts = {int(k): v for k, v in json.load(open('/tmp/claude-0/-home-claude/c64fe2ca-d66c-56f7-9682-f3a4aca918b1/scratchpad/_parts.json')).items()}
    missing = [i for i in range(n) if i not in parts]
    if missing: sys.exit('manque ' + str(missing))
    s = ''.join(re.sub(r'\\+"(\\n)+$', '', parts[i]) for i in range(n)).replace(chr(92), '')
    d = json.loads(s)
    for k, v in d.items():
        ext = 'webp'
        open(f'{out}/{k}.{ext}', 'wb').write(base64.b64decode(v)); print(k, len(v))
