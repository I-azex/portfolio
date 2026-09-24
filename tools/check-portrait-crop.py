"""
Dev-only: row-by-row skin profile of portrait.webp.
The face is the widest skin band near the top; the neck is the narrow minimum
just beneath it. Those two numbers place the poster's colour window precisely.
"""
from pathlib import Path
from PIL import Image

path = Path(__file__).resolve().parents[1] / 'assets' / 'img' / 'portrait.webp'
image = Image.open(path).convert('RGB')
width, height = image.size
pixels = image.load()


def is_skin(r, g, b):
    return (r > 95 and g > 40 and b > 20
            and r > g > b
            and (r - min(g, b)) > 15
            and abs(r - g) > 10
            and r < 250)


counts = []
for y in range(height):
    counts.append(sum(1 for x in range(width) if is_skin(*pixels[x, y])))

peak = max(counts)
print(f'image {width}x{height}, peak skin width {peak}px')
print()
print('row profile every 5% of height (fraction of width that is skin):')
for i in range(21):
    y = min(height - 1, int(height * i / 20))
    bar = '#' * int(counts[y] / peak * 40)
    print(f'  {i * 5:3d}%  y={y:4d}  {counts[y] / width:5.2f}  {bar}')

# Face = widest band in the top half.
top_half = counts[:height // 2]
face_peak = max(top_half)
face_peak_y = top_half.index(face_peak)
wide = face_peak * 0.55
face_top = face_peak_y
while face_top > 0 and counts[face_top - 1] > wide:
    face_top -= 1
face_bottom = face_peak_y
while face_bottom < height - 1 and counts[face_bottom + 1] > wide:
    face_bottom += 1

# Neck = narrowest row between the face bottom and 15% lower.
scan_end = min(height - 1, face_bottom + int(height * 0.15))
neck_zone = counts[face_bottom:scan_end] or [0]
neck = face_bottom + neck_zone.index(min(neck_zone))

print()
print(f'face band : rows {face_top}-{face_bottom}  '
      f'({face_top / height:.3f} - {face_bottom / height:.3f})')
print(f'neck row  : {neck}  ({neck / height:.3f})')
print()
print('CSS currently: focus-frame / colour clip at 0.39 - 0.57')
print(f'face centre: {((face_top + face_bottom) / 2) / height:.3f}')
