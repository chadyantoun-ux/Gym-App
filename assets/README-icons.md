# App icons — what to produce

`manifest.webmanifest` already references these three filenames. Drop the PNGs in this folder
and nothing else needs editing. Until they exist the app still installs and still works offline:
the service worker treats icons as optional and a 404 cannot fail its install (verified).

| File | Canvas | `purpose` | Background | Where it shows |
|---|---|---|---|---|
| `icon-192.png` | 192 × 192 | `any` | `#1c1b1a`, opaque | Home screen on older Android, task switcher, browser tab |
| `icon-512.png` | 512 × 512 | `any` | `#1c1b1a`, opaque | Install prompt, Android splash screen, app info |
| `icon-maskable-512.png` | 512 × 512 | `maskable` | `#1c1b1a`, **full bleed, edge to edge, no transparency** | Home screen on Android 8+ |

Colours are the 2a tokens: ground `--bg` `#1c1b1a`, mark in `--bone` `#f0eeea` or `--amber` `#f5b32b`.
No white background anywhere — a white plate on a black home screen is the tell of a bookmark.

## The maskable one — the geometry that matters

Android crops a maskable icon to whatever shape the launcher uses: circle, squircle, rounded square,
teardrop. **The corners are guaranteed to be eaten.** So:

- **Canvas:** 512 × 512.
- **Safe zone:** a centred circle of diameter **410 px** (80 % of 512). Everything that must be
  readable — the whole mark — sits inside that circle.
- **Clear margin:** therefore **at least 51 px of background on every side**, and the four corners
  carry nothing at all.
- **Background:** paint `#1c1b1a` across the entire 512 × 512. Any transparency and the launcher
  composites it over its own plate, which puts a light halo round the mark.
- **Sanity check:** overlay a 410 px circle centred on the canvas. If any part of the mark crosses
  it, it can be cropped on some phone.

The `any` icons do not get cropped, so they can breathe wider — roughly 8–12 px of padding on the
192 and 24–32 px on the 512 is enough to stop them looking cramped in a launcher grid.

## If the phone is an iPhone

Safari does not use maskable icons and prefers its own tag. If Chady is installing on iOS, add a
fourth file, `apple-touch-icon-180.png`, **180 × 180, opaque `#1c1b1a`, no rounded corners of your
own** — iOS applies the mask itself, and a pre-rounded icon gets rounded twice.
The service worker already lists that filename as optional, so adding the file is all that is
needed on this side; `index.html` needs one `<link rel="apple-touch-icon">` line, which is in the
E-4 registration snippet.

## Legibility

The mark has to read at **64 px on a dark ground** (the smallest place it appears) and at 48 px in
a task switcher. One heavy shape, no hairlines, no text smaller than about a fifth of the canvas.
