"""Prepare user-authorized old-web reaction images for local production use."""

from __future__ import annotations

import shutil
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = Path.home() / "Downloads"
PUBLIC = ROOT / "public" / "assets" / "user-reactions"
SOURCES = ROOT / "docs" / "asset-sources" / "user-reactions"

STILLS = {
    "download (61).jfif": ("burns-suspicious.webp", None),
    "download (60).jfif": ("krabs-money.webp", None),
    "RUN FOR IT.jfif": ("rat-money.webp", ((255, 255, 255), 58)),
    "download (59).jfif": ("court-jester.webp", ((255, 255, 255), 52)),
    "download (58).jfif": ("clown-makeup.webp", None),
    "download (57).jfif": ("sad-clown.webp", ((0, 0, 0), 44)),
    "download (56).jfif": ("crocodile-suit.webp", ((238, 238, 238), 38)),
    "Alô criançada, o blogueiro chegou!.jfif": ("clown-portrait.webp", None),
    "download (62).jfif": ("no-bozos.webp", None),
    "download (64).jfif": ("red-angry.webp", ((255, 255, 255), 52)),
    "download (63).jfif": ("crying-face.webp", ((255, 255, 255), 64)),
    "maxresdefault-1966718344.jpg": ("anime-grin.webp", None),
}

ANIMATIONS = {
    "¿Quién o qué es_ ¿Qué hace_.gif": "clown-juggling.gif",
    "orig 540\u00a0×\u00a0540 pixels.gif": "angry-yellow.gif",
    "download (1).gif": "batman-thinking.gif",
    "Gif, Lavori,professioni miste ,utilensi vari_ - page 3.gif": "masked-runner.gif",
    "¿Quién o qué es_ ¿Qué hace_ (1).gif": "clown-waving.gif",
}


def fit(image: Image.Image, maximum: int) -> Image.Image:
    image = image.copy()
    image.thumbnail((maximum, maximum), Image.Resampling.LANCZOS)
    return image


def transparent_edge_background(image: Image.Image, target: tuple[int, int, int], tolerance: int) -> Image.Image:
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    seen = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def similar(x: int, y: int) -> bool:
        r, g, b = pixels[x, y]
        return max(abs(r - target[0]), abs(g - target[1]), abs(b - target[2])) <= tolerance

    for x, y in ((0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)):
        if similar(x, y):
            queue.append((x, y))
            seen[y * width + x] = 1

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                index = ny * width + nx
                if not seen[index] and similar(nx, ny):
                    seen[index] = 1
                    queue.append((nx, ny))

    rgba = rgb.convert("RGBA")
    alpha = Image.new("L", (width, height), 255)
    alpha_pixels = alpha.load()
    for y in range(height):
        offset = y * width
        for x in range(width):
            if seen[offset + x]:
                alpha_pixels[x, y] = 0
    rgba.putalpha(alpha)
    bbox = alpha.getbbox()
    if bbox:
        left, top, right, bottom = bbox
        pad = 8
        rgba = rgba.crop((max(0, left - pad), max(0, top - pad), min(width, right + pad), min(height, bottom + pad)))
    return rgba


def save_still(source: Path, filename: str, removal: tuple[tuple[int, int, int], int] | None) -> None:
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGBA" if removal else "RGB")
    if removal:
        image = transparent_edge_background(image, *removal)
    image = fit(image, 760)
    image.save(PUBLIC / filename, "WEBP", quality=86, method=6)


def save_animation(source: Path, filename: str) -> None:
    with Image.open(source) as opened:
        durations: list[int] = []
        frames: list[Image.Image] = []
        for frame in ImageSequence.Iterator(opened):
            durations.append(max(40, int(frame.info.get("duration", opened.info.get("duration", 100)))))
            frames.append(fit(frame.convert("RGBA"), 360))
        loop = int(opened.info.get("loop", 0))
    frames[0].save(PUBLIC / filename, save_all=True, append_images=frames[1:], duration=durations, loop=loop, disposal=2, optimize=True)
    frames[0].save(PUBLIC / filename.replace(".gif", "-still.webp"), "WEBP", quality=86, method=6)


def make_contact_sheet() -> None:
    files = [PUBLIC / name for name, _ in STILLS.values()] + [PUBLIC / name for name in ANIMATIONS.values()]
    thumb_w, thumb_h = 220, 185
    sheet = Image.new("RGB", (thumb_w * 4, 70 + thumb_h * 5), "#fffdf4")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    draw.text((18, 16), "FRAUS USER-AUTHORIZED REACTION ASSETS", fill="#08245c", font=font)
    draw.text((18, 34), "Exact supplied imagery; optimized and hosted locally", fill="#584d61", font=font)
    for index, path in enumerate(files):
        with Image.open(path) as opened:
            image = fit(opened.convert("RGBA"), 150)
        x = (index % 4) * thumb_w
        y = 70 + (index // 4) * thumb_h
        tile = Image.new("RGBA", (thumb_w - 12, thumb_h - 12), "#fff0ca")
        tile.alpha_composite(image, ((tile.width - image.width) // 2, 8))
        sheet.paste(tile.convert("RGB"), (x + 6, y + 6))
        draw.text((x + 12, y + 158), path.stem[:28], fill="#08245c", font=font)
    sheet.save(ROOT / "public" / "assets" / "user-reaction-contact-sheet.png", optimize=True)


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    SOURCES.mkdir(parents=True, exist_ok=True)
    for original, (filename, removal) in STILLS.items():
        source = DOWNLOADS / original
        shutil.copy2(source, SOURCES / original)
        save_still(source, filename, removal)
    for original, filename in ANIMATIONS.items():
        source = DOWNLOADS / original
        shutil.copy2(source, SOURCES / original)
        save_animation(source, filename)
    make_contact_sheet()


if __name__ == "__main__":
    main()
