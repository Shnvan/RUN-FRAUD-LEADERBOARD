# Fraus visual asset manifest

## Original generated assets

The character assets below were created specifically for Fraus on 2026-09-26 using OpenAI image generation or the local Pillow asset generator. They do not depict a real person, seller, copyrighted franchise character, or factual status.

| Files | Creator/source | Notes |
| --- | --- | --- |
| `characters/clown-*` | OpenAI image generation for Fraus | Original four-pose scanned-cartoon clown. Cropped, resized, and encoded locally. |
| `characters/jester-*` | OpenAI image generation for Fraus | Original three-pose scanned-cartoon jester. Cropped, resized, and encoded locally. |
| `characters/crocodile-*` | Fraus local Pillow generator | Original crying and peeking crocodile placeholder in the shared palette. |
| `characters/snake-salesman.webp` | Fraus local Pillow generator | Original snake-salesman placeholder. |
| `characters/rat-*` | Fraus local Pillow generator | Original four-frame running rat GIF and static pose. |
| `characters/bozo-*` | Fraus local Pillow generator | Original confused clownish-fool placeholders. Not based on the trademarked Bozo character. |
| `badges/*.gif`, `stickers/*.gif` | Fraus local Pillow generator | Original 88×31 badges and small blinking indicators. |
| `backgrounds/*` | Fraus local Pillow generator | Original repeating paper and confetti textures. |
| `character-contact-sheet.png` | Fraus local Pillow generator | Review sheet; not rendered in production pages. |

Generated source sheets are retained outside the public web root in `docs/asset-sources/` to make later pose extraction and optimization reproducible. `scripts/generate_old_web_assets.py` documents the transformation.

## Temporary artwork slots

The crocodile, snake, rat, and bozo images are clearly treated as original temporary artwork. Their filenames and component slots are stable so approved final drawings can replace them without changing page code. See `ARTWORK-TODO.md` for the required replacement poses and animation behavior.

## User-provided visual references

The downloaded reaction images and GIFs supplied on 2026-09-26 were inspected as art-direction references only. Several contain recognizable copyrighted characters or have no verifiable reuse license. They are not copied into `public/` or served by Fraus. Their functions—dancing, suspicious, laughing, running, pointing, and exaggerated reaction poses—are recreated through original Fraus characters.

## Existing product marks

Product logos remain documented separately in `public/brands/NOTICE.md` and are used only to identify products buyers reported purchasing.
