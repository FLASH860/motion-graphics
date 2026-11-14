# Notes

Decisions and open questions, newest first.

## Revision: new loader, new transitions, pages 06 to 08 replaced or added

Asked for: a cooler loader, page 6 replaced, motion design that plays by itself (10 to 15 s,
not tied to scroll), different transitions from page 6 on (one from the bottom, one with more
impact), a spiral of cards around a futuristic core (from a reference screenshot), and a page of
crystal-like glass. The site is now nine scenes.

- **Loader** is a watch dial: sixty ticks light with real progress, a hand sweeps, the count
  sits in the centre. At 100 the dial becomes an aperture: a hole opens from its centre and the
  tick ring rides the edge of the hole off screen. The hole is an even-odd clip-path polygon
  rebuilt per frame.
- **Transitions** are now a prop on `Scene` (`enter`): `rect` (scenes 2 to 5, unchanged),
  `rise` (a curved horizon coming up from the bottom: Reel, Exit), `columns` (seven columns
  climbing one after another: Spiral), `blade` (a slanted edge sweeping across: Crystal).
- **06 Reel** replaces Principles. A 14.6 s film in five shots (Form, Motion, Timing, Depth,
  End) cut with hard wipes across three palettes, on a GSAP timeline that loops. It has a
  timecode and progress bar. The last wipe uncovers shot 1 in its empty state, so the loop has
  no seam. It is code, not a video file: no MCP or generator was used, it stays sharp at any
  size, and it follows the theme.
- **07 Spiral.** Eight cards on a helix around a column of light; scroll turns and lifts the
  stair. The cards name disciplines, not projects (the brief rules projects out).
- **08 Crystal.** A second self-playing piece on a 15 s loop: pools of light drift behind a
  glass slab and three cut crystals. Four elements carry a backdrop-filter; facets are plain
  gradient polygons. Deliberately no rainbow edge splitting (the style rules ban chromatic
  aberration).
- **Nav** mark and index now use a difference blend so they stay readable over the film's
  inverted shots; the theme switch moved to its own layer so the blend does not touch it.
- **Measured** (headless Chrome, RTX 3050, 1440x810, wheel-scrolling the full page): average
  frame 7 to 8 ms in most scenes, about 10 ms in Crystal and 12 ms in the first scene. Each
  scene still has one to three single long frames (up to roughly 220 ms in Crystal) the first
  time it comes on screen.
- **Open**: the long first-appearance frames; the film and glass have not been watched by a
  person yet; Principles (the folding screen) is deleted but is in git history if wanted back.

## The first full build (sections 02 to 07, before the revision above)

One idea runs through the whole thing: **taking things apart to see how they are made.** The
corridor takes a sentence apart, Anatomy takes the landing page apart, Movement takes the watch
apart, and the outro puts the person back in the frame and lets him leave.

### Global systems

- **Scene stack** (`lib/scene.ts`, `components/Scene.tsx`). Every section is a tall track with a
  sticky full-screen pin. Each track overlaps the tail of the previous one, so the next scene
  opens over the pinned previous scene through a clip-path rectangle (a point, then a small
  rectangle, then the full screen) while the previous scene's body scales back and darkens.
  The rectangle is two CSS custom properties tweened by GSAP; tweening the `inset()` string
  directly broke because the browser shortens it.
- **Dwell.** Each scene declares how much scroll it keeps for itself. Scrubbed scenes use it as
  their timeline; self-playing scenes use it as time to watch.
- **Cursor** (`components/Cursor.tsx`). A dot that trails the pointer and becomes a label pill
  from `data-cursor`. Fine pointers only.
- **Nav index.** "02 — Passage / 07", the label rolls as each scene takes over.
- **`?nopre`** (dev only) skips the preloader and entrances for quick checks.

### Sections

| N° | Name | Type | The idea |
| --- | --- | --- | --- |
| 01 | Arrival | self-playing, then scrubbed dolly | Name behind and in front of the portrait; scroll pushes in through the planes |
| 02 | Passage | scroll-driven | A CSS 3D corridor of hairline ribs; statements hang in the air, blurred far away, sharp as you reach them. The next scene opens from the light at the end |
| 03 | Obsession | self-playing | A ring of type, one plane per letter on a cylinder, turning around a statement. A page-coloured veil on the axis dims the far side. Leans into scroll speed |
| 04 | Anatomy | scroll-driven | The landing page turns side-on and separates into the five sheets it is made of, each named in turn, then closes |
| 05 | Movement | scroll-driven | The watch film as a 240-frame canvas sequence, with five cards sliding in left and right |
| 06 | Principles | self-playing | Three hinged panels like a folding screen, each a looping study of its own rule; panels tilt to the pointer with contents on separate depths |
| 07 | Exit | self-playing + scrubbed | The away photo in a doorway that opens from a slit; set and figure are separate layers; links and a live IST clock |

### Decisions

- **Watch: image sequence, not video.** `npm run assets:watch` extracts 240 WebP frames
  (1280x720, 6.2 MB total) to `public/watch`. Frames load coarse-to-fine after the preloader,
  so an early visitor always has a nearby frame. The drawn frame eases toward the scroll
  position; the tick stops itself once the scene has left and the film has settled.
- **Watch in the light theme** is the same footage inverted with hue kept and multiplied onto
  the paper, so it reads as a pale technical study. Dark theme blends it `lighten`.
- **Generator watermarks** are covered: a black box over the sparkle in the watch frames, and
  the outro photo is cropped above its sparkle.
- **Outro layers.** The figure is cut out locally; the background plate has him painted out by
  diffusing the surrounding haze into his silhouette (`scripts/process-outro.mjs`), so the two
  layers can move apart without a ghost.
- **Card copy for the watch** describes generic horology (case, crystal, crowns, barrels,
  tourbillon). The watch is not a real reference, so no brand or spec claims are made.
- **Only transform, opacity, clip-path and filter are animated.** The one filter that changes
  per frame is the blur on at most two or three corridor statements.
- **Reduced motion**: smooth scroll is off, self-playing pieces jump to their end state, loops
  hold still. Scroll-linked scenes still respond to scroll.
- **Mobile**: corridor type scales up and offsets shrink; the ring is wider than the screen;
  Anatomy shows one row at a time; the watch starts zoomed in further; Principles becomes a
  straight row panned by the dwell scroll; the outro stacks.
- **Git**: `build/sections` is pushed after every section and `main` is fast-forwarded to it
  with `git push origin build/sections:main`, never by checking out `main` here (that deletes
  files under a running dev server).

### Measured

Headless Chrome on this machine (RTX 3050, 1440x810), wheel-scrolling the whole page with the
real preloader: average frame 7 to 8 ms in every scene (11.5 ms in the first), p95 at or below
14 ms except the first scene (28 ms). A few single long frames (40 to 140 ms) land where a scene
first comes on screen. No console errors or failed requests, in either theme, at phone size, or
with reduced motion.

### Open questions

- Not yet watched by a person in a real browser, so pacing (dwell lengths, entrance timings) is
  untuned by eye.
- A few one-off long frames at scene boundaries. Pre-warming each scene's layers before its
  rectangle opens would likely remove them.
- All copy is written for you and is yours to change.
- The far corridor ribs can lose an edge to sub-pixel rounding at some window sizes.
- Deploy to Cloudflare Pages is not set up yet.

## Section 01: preloader, landing hero, theme toggle

### Decisions

- **Assets were in the project root with their download names.** Moved (not edited) into the
  layout CLAUDE.md describes: `assets/me/me-front.jpg`, `assets/me/me-away.webp` (it is a WebP,
  so it kept its real extension), `assets/video/watch.mp4`, and the ink-transition screenshot to
  `assets/reference/`. `assets/me/` and `assets/reference/` are git-ignored (public repo).
- **Type**: Cormorant (display serif) + Hanken Grotesk (small caps labels), both self-hosted
  through `@fontsource-variable`, so no font CDN.
- **Palette**: warm near-black `#0b0a09` / bone `#ece6da` in dark, paper `#ece7dd` / ink
  `#14120f` in light, one brass accent. Pulled from the photograph's own rim light.
- **Hero portrait pipeline** (`npm run assets:hero`): local cutout with
  `@imgly/background-removal-node`, then `scripts/process-hero.mjs` erases the set dressing the
  matte kept (crown doodle, chess king, halo arcs), crops above the two foreground heads, grades
  (slightly desaturated, a little more contrast) and writes `assets/processed/me-front-hero.webp`.
  The source is only 1280px wide, so it is upscaled 1.5x and a quiet static film grain sits over
  the page to keep it from looking soft.
- **`sharp` is pinned to 0.32.6**, the version the background-removal library ships. Two
  different sharp versions in one process fail to load on Windows.
- **Hero composition**: first name behind the portrait, surname in front, three planes that move
  at different rates on scroll plus a faint pointer drift. Both words are fitted to the same
  measure in JS.
- **Light theme surname**: uses `mix-blend-mode: difference` against the page colour, so it is
  ink on the paper and flips to paper where it crosses the dark suit. In dark the torso
  dissolves into the page instead.
- **Ink-bleed**: reused the holygrail approach (WebGL noise shader renders a 64-frame sprite
  sheet, View Transitions API masks the new theme through it). Changes: sheet resolution up to
  480x270 per frame, added capillary "fingers" ahead of the front, zustand removed. Browsers
  without View Transitions and reduced-motion users get an instant switch.
- **Preloader** counts real loading (fonts + hero portrait) but never faster than 2.4s, then a
  two-layer curtain (page colour, brass veil trailing).
- **Git workflow**: work on a section branch, push as it goes, merge into `main` at checkpoints.

### Open questions

- Cormorant vs. a sharper didone (Bodoni Moda, as in holygrail) for the display face.
- Light-theme surname picks up a faint cool tint where it crosses the navy shirt (a side effect
  of the difference blend). Alternative is a masked two-colour copy of the word.
- Hero copy ("A study in motion", "N° 01 — MMXXVI") is placeholder wording.
- `me-away.webp` is only 576x1024. It is cropped and upscaled 1.6x for the outro; a larger
  source would be sharper.
