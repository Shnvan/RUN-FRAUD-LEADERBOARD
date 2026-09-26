from __future__ import annotations

import argparse
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets"
CHARACTERS = ASSETS / "characters"
SOURCE_ART = ROOT / "docs" / "asset-sources"
REACTIONS = ASSETS / "reactions"
BADGES = ASSETS / "badges"
BACKGROUNDS = ASSETS / "backgrounds"
STICKERS = ASSETS / "stickers"

INK = "#201126"
CREAM = "#fff1cc"
RED = "#e4424f"
BLUE = "#244fc2"
LIME = "#d8ef55"
PURPLE = "#6b3c91"
ORANGE = "#ef8d3f"
GRAY = "#8d8792"


def ensure_dirs() -> None:
    for directory in (CHARACTERS, REACTIONS, BADGES, BACKGROUNDS, STICKERS):
        directory.mkdir(parents=True, exist_ok=True)


def font(size: int) -> ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/lucon.ttf"),
        Path("C:/Windows/Fonts/consola.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def fit_alpha(source: Image.Image, size: tuple[int, int], padding: int = 12) -> Image.Image:
    source = source.convert("RGBA")
    bbox = source.getchannel("A").getbbox()
    if bbox:
        source = source.crop(bbox)
    target = Image.new("RGBA", size, (0, 0, 0, 0))
    source.thumbnail((size[0] - padding * 2, size[1] - padding * 2), Image.Resampling.LANCZOS)
    target.alpha_composite(source, ((size[0] - source.width) // 2, size[1] - source.height - padding))
    return target


def split_sheet(source_path: Path, count: int, prefix: str, labels: list[str]) -> list[Image.Image]:
    source = Image.open(source_path).convert("RGBA")
    width = source.width // count
    frames: list[Image.Image] = []
    for index in range(count):
        left = index * width
        right = source.width if index == count - 1 else (index + 1) * width
        frame = fit_alpha(source.crop((left, 0, right, source.height)), (520, 560), 16)
        frames.append(frame)
        frame.save(CHARACTERS / f"{prefix}-{labels[index]}.webp", "WEBP", lossless=True, method=6)
    SOURCE_ART.mkdir(parents=True, exist_ok=True)
    source.save(SOURCE_ART / f"{prefix}-source-sheet.png", optimize=True)
    return frames


def add_scan_texture(image: Image.Image, seed: int) -> Image.Image:
    random.seed(seed)
    pixels = image.load()
    alpha = image.getchannel("A")
    for _ in range(image.width * image.height // 65):
        x = random.randrange(image.width)
        y = random.randrange(image.height)
        if alpha.getpixel((x, y)) > 30:
            r, g, b, a = pixels[x, y]
            n = random.choice((-22, -12, 12, 18))
            pixels[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)), a)
    return image


def canvas(width: int = 520, height: int = 430) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    return image, ImageDraw.Draw(image)


def draw_crocodile() -> Image.Image:
    image, d = canvas(680, 360)
    d.ellipse((55, 95, 625, 335), fill=LIME, outline=INK, width=15)
    d.ellipse((195, 45, 305, 155), fill=LIME, outline=INK, width=15)
    d.ellipse((375, 45, 485, 155), fill=LIME, outline=INK, width=15)
    d.ellipse((225, 78, 268, 122), fill=CREAM, outline=INK, width=8)
    d.ellipse((405, 78, 448, 122), fill=CREAM, outline=INK, width=8)
    d.ellipse((240, 91, 258, 116), fill=INK)
    d.ellipse((420, 91, 438, 116), fill=INK)
    d.polygon([(80, 230), (610, 210), (520, 326), (155, 336)], fill=CREAM, outline=INK)
    d.line((80, 230, 610, 210), fill=INK, width=15)
    for x in range(150, 560, 62):
        d.polygon([(x, 223), (x + 24, 225), (x + 12, 263)], fill="white", outline=INK)
    d.arc((122, 140, 555, 330), 5, 175, fill=RED, width=13)
    d.ellipse((118, 172, 168, 216), fill=BLUE, outline=INK, width=7)
    d.polygon([(143, 207), (117, 274), (169, 274)], fill=BLUE, outline=INK)
    d.ellipse((514, 164, 564, 208), fill=BLUE, outline=INK, width=7)
    d.polygon([(539, 199), (513, 266), (565, 266)], fill=BLUE, outline=INK)
    return add_scan_texture(image, 4)


def draw_snake() -> Image.Image:
    image, d = canvas(560, 520)
    d.ellipse((95, 270, 485, 475), fill=PURPLE, outline=INK, width=17)
    d.ellipse((175, 315, 405, 430), fill=CREAM, outline=INK, width=13)
    d.line([(280, 355), (240, 270), (330, 190), (278, 112)], fill=PURPLE, width=95, joint="curve")
    d.line([(280, 355), (240, 270), (330, 190), (278, 112)], fill=INK, width=112, joint="curve")
    d.line([(280, 355), (240, 270), (330, 190), (278, 112)], fill=PURPLE, width=84, joint="curve")
    d.ellipse((212, 50, 366, 182), fill=LIME, outline=INK, width=14)
    d.ellipse((246, 88, 272, 118), fill=CREAM, outline=INK, width=6)
    d.ellipse((306, 88, 332, 118), fill=CREAM, outline=INK, width=6)
    d.ellipse((256, 97, 266, 111), fill=INK)
    d.arc((244, 98, 334, 160), 5, 170, fill=INK, width=9)
    d.line((284, 150, 280, 190), fill=RED, width=8)
    d.line((280, 190, 263, 205), fill=RED, width=6)
    d.line((280, 190, 298, 204), fill=RED, width=6)
    d.rectangle((350, 118, 515, 275), fill=CREAM, outline=INK, width=12)
    d.rectangle((371, 139, 494, 254), fill=ORANGE, outline=INK, width=7)
    d.line((385, 165, 480, 165), fill=INK, width=8)
    d.line((385, 195, 470, 195), fill=INK, width=8)
    d.line((385, 224, 455, 224), fill=INK, width=8)
    return add_scan_texture(image, 5)


def draw_rat_frame(step: int) -> Image.Image:
    image, d = canvas(520, 300)
    shift = (step % 2) * 8
    d.ellipse((110, 105, 350, 245), fill=GRAY, outline=INK, width=13)
    d.ellipse((294, 68, 430, 192), fill=GRAY, outline=INK, width=13)
    d.ellipse((303, 38, 360, 101), fill="#c9a6b4", outline=INK, width=10)
    d.ellipse((367, 42, 424, 104), fill="#c9a6b4", outline=INK, width=10)
    d.ellipse((392, 104, 410, 122), fill=INK)
    d.polygon([(429, 135), (474, 153), (431, 168)], fill=RED, outline=INK)
    d.arc((35, 130, 180, 275), 100, 290, fill=INK, width=12)
    d.rectangle((55, 48, 190, 170), fill=CREAM, outline=INK, width=12)
    d.line((80, 75, 165, 75), fill=BLUE, width=10)
    d.line((80, 103, 155, 103), fill=BLUE, width=10)
    d.line((80, 132, 145, 132), fill=BLUE, width=10)
    leg_y = 233
    d.line((190, leg_y, 132 + shift, 282), fill=INK, width=18)
    d.line((275, leg_y, 340 - shift, 281), fill=INK, width=18)
    d.line((336, 178, 392 + shift, 236), fill=INK, width=15)
    return add_scan_texture(image, 20 + step)


def draw_bozo() -> Image.Image:
    image, d = canvas(520, 560)
    d.ellipse((128, 96, 400, 360), fill=CREAM, outline=INK, width=16)
    d.polygon([(170, 110), (265, 5), (340, 118)], fill=PURPLE, outline=INK)
    d.ellipse((245, 4, 286, 45), fill=LIME, outline=INK, width=8)
    d.ellipse((72, 130, 183, 260), fill=ORANGE, outline=INK, width=13)
    d.ellipse((345, 128, 456, 260), fill=ORANGE, outline=INK, width=13)
    d.ellipse((190, 178, 228, 226), fill="white", outline=INK, width=8)
    d.ellipse((300, 178, 338, 226), fill="white", outline=INK, width=8)
    d.ellipse((245, 218, 290, 258), fill=RED, outline=INK, width=8)
    d.arc((190, 225, 340, 328), 25, 150, fill=INK, width=11)
    d.line((268, 308, 268, 485), fill=INK, width=85)
    d.line((210, 355, 100, 438), fill=INK, width=26)
    d.line((320, 355, 430, 438), fill=INK, width=26)
    d.line((240, 474, 170, 535), fill=INK, width=28)
    d.line((296, 474, 370, 535), fill=INK, width=28)
    d.ellipse((60, 410, 150, 470), fill=CREAM, outline=INK, width=11)
    d.ellipse((385, 410, 475, 470), fill=CREAM, outline=INK, width=11)
    return add_scan_texture(image, 7)


def save_generated_characters() -> None:
    croc = draw_crocodile()
    croc.save(CHARACTERS / "crocodile-crying.webp", "WEBP", lossless=True, method=6)
    ImageOps.flip(croc).save(CHARACTERS / "crocodile-peeking.webp", "WEBP", lossless=True, method=6)
    draw_snake().save(CHARACTERS / "snake-salesman.webp", "WEBP", lossless=True, method=6)
    rat_frames = [draw_rat_frame(i) for i in range(4)]
    rat_frames[0].save(CHARACTERS / "rat-running.gif", save_all=True, append_images=rat_frames[1:], duration=120, loop=0, disposal=2, transparency=0)
    rat_frames[1].save(CHARACTERS / "rat-suspicious.webp", "WEBP", lossless=True, method=6)
    bozo = draw_bozo()
    bozo.save(CHARACTERS / "bozo-confused.webp", "WEBP", lossless=True, method=6)
    bozo.rotate(-4, resample=Image.Resampling.BICUBIC, expand=False).save(CHARACTERS / "bozo-certified.webp", "WEBP", lossless=True, method=6)


def badge_frame(text: str, bg: str, fg: str = INK, offset: int = 0) -> Image.Image:
    image = Image.new("RGB", (88, 31), bg)
    d = ImageDraw.Draw(image)
    d.rectangle((0, 0, 87, 30), outline=INK, width=2)
    d.rectangle((3 + offset, 3, 8 + offset, 8), fill=fg)
    label_font = font(9 if len(text) <= 12 else 7)
    bbox = d.textbbox((0, 0), text, font=label_font)
    d.text(((88 - (bbox[2] - bbox[0])) // 2, 16 - (bbox[3] - bbox[1]) // 2), text, font=label_font, fill=fg, anchor="mm")
    return image


def save_badges() -> None:
    pairs = [
        ("fraus-archive.gif", "FRAUS FILES", LIME),
        ("best-viewed.gif", "BEST VIEWED", BLUE),
        ("guestbook.gif", "SIGN BOOK", ORANGE),
        ("email-receipts.gif", "EMAIL ME", RED),
    ]
    for name, text, color in pairs:
        frames = [badge_frame(text, color, CREAM if color in (BLUE, RED) else INK, i) for i in (0, 2)]
        frames[0].save(BADGES / name, save_all=True, append_images=frames[1:], duration=550, loop=0)
    new_frames = [badge_frame("NEW!", RED if i % 2 == 0 else LIME, CREAM if i % 2 == 0 else INK) for i in range(2)]
    new_frames[0].save(STICKERS / "new-blink.gif", save_all=True, append_images=new_frames[1:], duration=330, loop=0)
    warning_frames = [badge_frame("WARNING", ORANGE if i % 2 == 0 else RED, INK) for i in range(2)]
    warning_frames[0].save(STICKERS / "warning-blink.gif", save_all=True, append_images=warning_frames[1:], duration=280, loop=0)


def save_backgrounds() -> None:
    tile = Image.new("RGB", (64, 64), "#fffaf0")
    d = ImageDraw.Draw(tile)
    for x, y, color in ((7, 8, RED), (39, 14, BLUE), (20, 43, LIME), (54, 50, PURPLE)):
        d.rectangle((x, y, x + 3, y + 3), fill=color)
        d.line((x - 2, y + 1, x + 5, y + 1), fill=color)
    tile.save(BACKGROUNDS / "confetti-tile.png", optimize=True)
    paper = Image.new("RGB", (96, 96), "#f9f3df")
    p = paper.load()
    random.seed(99)
    for _ in range(1000):
        x, y = random.randrange(96), random.randrange(96)
        value = random.choice((226, 232, 242, 247))
        p[x, y] = (value, max(210, value - 7), max(190, value - 18))
    paper.save(BACKGROUNDS / "paper-noise.png", optimize=True)


def make_contact_sheet(paths: list[Path]) -> None:
    thumbs: list[tuple[str, Image.Image]] = []
    for path in paths:
        if not path.exists():
            continue
        image = Image.open(path).convert("RGBA")
        if getattr(image, "is_animated", False):
            image.seek(0)
        image = fit_alpha(image, (260, 220), 12)
        thumbs.append((path.stem, image))
    sheet = Image.new("RGB", (840, ((len(thumbs) + 2) // 3) * 270 + 70), "#fffaf0")
    d = ImageDraw.Draw(sheet)
    d.text((24, 18), "FRAUS CHARACTER / REACTION ASSET CONTACT SHEET", fill=INK, font=font(20))
    for index, (label, image) in enumerate(thumbs):
        x = 20 + (index % 3) * 275
        y = 62 + (index // 3) * 270
        d.rectangle((x, y, x + 260, y + 245), fill="#fff1cc", outline=INK, width=3)
        sheet.paste(image, (x, y), image)
        d.text((x + 10, y + 222), label.upper(), fill=INK, font=font(12))
    sheet.save(ASSETS / "character-contact-sheet.png", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--clown-source", type=Path, required=True)
    parser.add_argument("--jester-source", type=Path, required=True)
    args = parser.parse_args()
    ensure_dirs()
    clown_frames = split_sheet(args.clown_source, 4, "clown", ["crouch", "jump", "dance", "pointing"])
    clown_frames[0].save(CHARACTERS / "clown-dancing.webp", save_all=True, append_images=clown_frames[1:], duration=[220, 150, 180, 280], loop=0, lossless=True, method=6)
    split_sheet(args.jester_source, 3, "jester", ["hanging", "laughing", "sign"])
    save_generated_characters()
    save_badges()
    save_backgrounds()
    make_contact_sheet([
        CHARACTERS / "clown-dancing.webp", CHARACTERS / "clown-pointing.webp",
        CHARACTERS / "jester-hanging.webp", CHARACTERS / "jester-sign.webp",
        CHARACTERS / "crocodile-crying.webp", CHARACTERS / "snake-salesman.webp",
        CHARACTERS / "rat-running.gif", CHARACTERS / "bozo-confused.webp",
    ])


if __name__ == "__main__":
    main()
