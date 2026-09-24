"""Generate local portfolio images. Originals are never changed; EXIF is stripped."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

source = Path(r'C:\Users\Kozhra\Downloads\site obnova')
out = Path(__file__).resolve().parents[1] / 'assets' / 'img'
out.mkdir(parents=True, exist_ok=True)
images = {
    'portrait': ('5307674332353995869.jpg', (850, 1100)),
    'night-walk': ('5449846958261475877.jpg', (1100, 680)),
    'car-front': ('5436134995996122549.jpg', (1400, 850)),
}
for name, (filename, size) in images.items():
    with Image.open(source / filename) as src:
        image = ImageOps.exif_transpose(src).convert('RGB')
        image.thumbnail(size, Image.Resampling.LANCZOS)
        image.save(out / f'{name}.webp', 'WEBP', quality=87, method=6)
        print(f'{name}: {image.size}, {(out / (name + ".webp")).stat().st_size:,} bytes')
# A real social preview instead of a missing metadata image. Uses Windows fonts.
canvas = Image.new('RGB', (1200, 630), '#eeede7')
draw = ImageDraw.Draw(canvas)
from PIL import ImageFont
font_path = Path(r'C:\Windows\Fonts\arialbd.ttf')
font = ImageFont.truetype(str(font_path), 80)
small = ImageFont.truetype(str(font_path), 24)
portrait = Image.open(out / 'portrait.webp')
portrait = ImageOps.fit(portrait, (465, 590), centering=(.5,.45))
canvas.paste(ImageOps.grayscale(portrait).convert('RGB'), (720, 20))
draw.rectangle((32,32,108,98), fill='#1754e8')
draw.text((45,45), 'RK', font=small, fill='white')
draw.text((40,175), 'РОМАН', font=font, fill='#131820')
draw.text((40,270), 'КОЖУХАРЁВ', font=ImageFont.truetype(str(font_path),54), fill='#1754e8')
draw.text((44,382), 'Python → C++ / C#', font=small, fill='#131820')
draw.text((44,545), 'kozhuharyov.ru / portfolio', font=small, fill='#1754e8')
canvas.save(out / 'og-preview.png', optimize=True)
print('Social preview: 1200 x 630')
