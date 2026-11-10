"""Split a .glb into shoe.json + shoe-geometry.txt (base64 buffer) + .jpg textures.
Artifact hosting doesn't serve .glb, but it does serve .json and .jpg."""
import json, struct, base64, sys, os
src, outdir = sys.argv[1], sys.argv[2]
b = open(src, 'rb').read()
jlen = struct.unpack_from('<I', b, 12)[0]
gltf = json.loads(b[20:20 + jlen])
binoff = 20 + jlen + 8
binchunk = b[binoff:]
img_views = {im['bufferView']: i for i, im in enumerate(gltf['images'])}
new = bytearray()
for i, v in enumerate(gltf['bufferViews']):
    data = binchunk[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
    if i in img_views:
        name = f"shoe-tex{img_views[i]}.jpg"
        open(os.path.join(outdir, name), 'wb').write(data)
        im = gltf['images'][img_views[i]]
        im.pop('bufferView'); im.pop('mimeType', None); im['uri'] = name
        continue
    while len(new) % 4: new.append(0)
    v['byteOffset'] = len(new); new += data
views = []; idx = {}
for i, v in enumerate(gltf['bufferViews']):
    if i in img_views: continue
    idx[i] = len(views); views.append(v)
gltf['bufferViews'] = views
for a in gltf['accessors']:
    if 'bufferView' in a: a['bufferView'] = idx[a['bufferView']]
# Geometry goes in a base64 .txt (a served type). The page rebuilds a GLB in
# memory, so nothing depends on data: URIs, which sandboxed viewers can block.
gltf['buffers'] = [{'byteLength': len(new)}]
open(os.path.join(outdir, 'shoe-geometry.txt'), 'w').write(base64.b64encode(bytes(new)).decode())
json.dump(gltf, open(os.path.join(outdir, 'shoe.json'), 'w'), separators=(',', ':'))
print('buffer', len(new))
