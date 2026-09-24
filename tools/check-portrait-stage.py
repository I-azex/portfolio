"""
Dev-only: with object-fit: cover and object-position 50% 47%, how much of the
portrait is cropped, and which part of the *stage* does the face occupy?

The CSS percentages for the colour window and focus frame are relative to the
stage box, not to the image, so they must be converted.
"""
from pathlib import Path
from PIL import Image

image = Image.open(Path(__file__).resolve().parents[1] / 'assets' / 'img' / 'portrait.webp')
iw, ih = image.size
print(f'image            : {iw} x {ih}   ratio {iw / ih:.4f}')

# Measured face band inside the image (see row profile).
face_top_img, face_bottom_img = 0.25, 0.59

stages = {
    'desktop (aspect .94)': 0.94,
    'mobile 800 (aspect .77)': 0.77,
}

for label, ratio in stages.items():
    # cover: scale so the image covers the stage box of width 1, height 1/ratio
    sh = 1 / ratio                      # stage height in stage-width units
    scale = max(1 / iw, sh / ih)        # px per image px when covering
    drawn_h = ih * scale
    offset_max = max(0.0, drawn_h - sh)
    offset = offset_max * 0.47          # object-position 50% 47%
    # face band measured in image fractions -> stage fractions
    stage_top = (face_top_img * drawn_h - offset) / sh
    stage_bottom = (face_bottom_img * drawn_h - offset) / sh
    print(f'\n{label}')
    print(f'  image drawn height : {drawn_h / sh:.3f} of stage')
    print(f'  vertical crop      : {offset_max / sh:.3f}')
    print(f'  face on stage      : {stage_top:.3f} - {stage_bottom:.3f}')
    print(f'  CSS currently uses : 0.240 - 0.550')
