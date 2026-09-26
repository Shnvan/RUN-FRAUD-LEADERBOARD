# Fraus visual asset manifest

## Original generated assets

The character assets below were created specifically for Fraus on 2026-09-26 using OpenAI image generation or the local Pillow asset generator. They do not depict a real person, seller, copyrighted franchise character, or factual status.

| Files | Creator/source | Notes |
| --- | --- | --- |
| `characters/clown-*` | OpenAI image generation for Fraus | Original four-pose scanned-cartoon clown. Cropped, resized, and encoded locally. |
| `characters/jester-*` | OpenAI image generation for Fraus | Original three-pose scanned-cartoon jester. Cropped, resized, and encoded locally. |
| `characters/snake-salesman.webp` | Fraus local Pillow generator | Original snake-salesman placeholder. |
| `characters/rat-*` | Fraus local Pillow generator | Original four-frame running rat GIF and static pose. |
| `badges/*.gif`, `stickers/*.gif` | Fraus local Pillow generator | Original 88×31 badges and small blinking indicators. Every animation includes a matching `-still.webp` reduced-motion frame. |
| `backgrounds/*` | Fraus local Pillow generator | Original repeating paper and confetti textures. |
| `character-contact-sheet.png` | Fraus local Pillow generator | Review sheet; not rendered in production pages. |

Generated source sheets are retained outside the public web root in `docs/asset-sources/` to make later pose extraction and optimization reproducible. `scripts/generate_old_web_assets.py` documents the transformation.

## Retired artwork

All generated crocodile and Bozo artwork was retired on 2026-09-26 at the user's request. The files, component mappings, generator code, and contact-sheet entries were removed. Empty rank slots use the user-authorized `user-reactions/clown-waving.gif`; unavailable states use `user-reactions/angry-yellow.webp`; the leaderboard decoration rail uses `user-reactions/masked-runner.gif`.

## Temporary artwork slots

The snake and rat images are clearly treated as original temporary artwork. Their filenames and component slots are stable so approved final drawings can replace them without changing page code. See `ARTWORK-TODO.md` for the required replacement poses and animation behavior.

## User-provided visual references

The user confirmed authorization on 2026-09-26 to publish the supplied reaction images. Exact source files are retained in `docs/asset-sources/user-reactions/`; optimized local variants are served from `public/assets/user-reactions/`. They are decorative internet-culture material and are never evidence or a factual label for a seller.

| Production file | Original supplied file | Placement / modification |
| --- | --- | --- |
| `burns-suspicious.webp` | `download (61).jfif` | Homepage archive notice; resized. |
| `krabs-money.webp` | `download (60).jfif` | Homepage statistics; resized. |
| `rat-money.webp` | `RUN FOR IT.jfif` | Homepage web ring; white background removed. |
| `court-jester.webp` | `download (59).jfif` | Homepage navigation; white background removed. |
| `clown-makeup.webp` | `download (58).jfif` | About reaction archive; resized. |
| `sad-clown.webp` | `download (57).jfif` | Empty and 404 states; dark background removed. |
| `crocodile-suit.webp` | `download (56).jfif` | Methodology fine print; gray background removed. |
| `clown-portrait.webp` | `Alô criançada, o blogueiro chegou!.jfif` | About reaction archive; resized. |
| `no-bozos.webp` | `download (62).jfif` | Homepage update module; resized. |
| `red-angry.webp` | `download (64).jfif` | Homepage status reaction; white background removed. |
| `crying-face.webp` | `download (63).jfif` | Homepage status reaction; white background removed. |
| `anime-grin.webp` | `maxresdefault-1966718344.jpg` | About reaction archive; resized. |
| `clown-juggling.gif` | `¿Quién o qué es_ ¿Qué hace_.gif` | Homepage poster; animation preserved. |
| `angry-yellow.webp` | `orig 540 × 540 pixels.gif` | Unavailable state; resized to 280px, alternate frames combined, and re-encoded as animated WebP (416 KB from a 1.9 MB source). |
| `batman-thinking.gif` | `download (1).gif` | Methodology directory; resized, animation preserved. |
| `masked-runner.gif` | `Gif, Lavori,professioni miste ,utilensi vari_ - page 3.gif` | Leaderboard divider; resized, animation preserved. |
| `clown-waving.gif` | `¿Quién o qué es_ ¿Qué hace_ (1).gif` | Report Desk; animation preserved. |

Each animated production file has a `-still.webp` reduced-motion fallback. Animated 88×31 badges and blinking stickers have equivalent local static frames as well. `user-reaction-contact-sheet.png` distinguishes these user-authorized assets from the original Fraus character sheet. The preparation process is reproducible through `scripts/prepare_user_reactions.py`.

## Existing product marks

Product logos remain documented separately in `public/brands/NOTICE.md` and are used only to identify products buyers reported purchasing.
