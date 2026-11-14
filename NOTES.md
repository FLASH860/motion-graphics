# Notes

Decisions and open questions, newest first.

## Revision 3: the real cursor bug, Reel position, livelier Crystal, Tempo

Eleven scenes now: Arrival, Passage, Obsession, Anatomy, Flow, Movement, Reel, Spiral, Crystal,
**Tempo**, Exit.

- **Cursor, root cause.** The cursor element's `is-visible` class was added by hand from pointer
  events, but React also owned that element's `className` (for the label state). Every time the
  label changed, which is every time the pointer crossed anything interactive, React rewrote the
  class list and wiped `is-visible`. The previous fix treated a symptom. Now the hand-managed
  classes sit on an outer element React never touches, and the label class is on an inner one.
- **Cursor during the theme change.** The View Transition's snapshot layers swallowed pointer
  events and baked the cursor into the old snapshot. Fixed with `::view-transition {
  pointer-events: none }` and a `view-transition-name` on the cursor so it has its own live
  layer above the ink. The switch also has a proper label now ("Light" / "Dark").
- **Reel sitting low.** Could not be reproduced in headless Chrome (scrolling in, scrolling back,
  resizing, toggling theme all ended at y = 0). The only mechanism that could leave it low was
  the 14% upward slide on the `rise` transition, so that slide is gone: the scene is already in
  place and only the rising edge moves. The clip is also forced open on leaving the transition.
  If it still looks low on a real screen, the cause is something else and needs a screenshot.
- **Crystal** was too still. Now: light pools swing roughly twice as far and twice as fast,
  the crystals tumble in depth, the word behind the glass scrolls past continuously, two glass
  lenses cross the frame, and the slab floats.
- **10 Tempo** (new). Sister film to Flow, 20 s loop. Shader: five ribbons of light; on every
  beat a ripple runs out from the centre and the ribbons step round a three-colour ramp, so the
  picture cuts with the type. Type: five beats, each entering and leaving differently (rows from
  opposite sides, arrival from depth, a spinning ticker of easing names, letters one by one, the
  signature; exits through the camera, apart, down, dissolved).
- **Measured** (headless Chrome, RTX 3050, 1440x810, this run capped at 60 Hz): every scene
  averaged 16.7 to 17.8 ms, so a steady 60 fps, with one or two long frames (up to about 130 ms)
  when Reel and Spiral first appear.
- **Open**: Reel offset unconfirmed as above; none of the films have been watched by a person.

## Revision 2: cursor fix, Flow page, cyberpunk spiral, watch colours

The site is now ten scenes: Arrival, Passage, Obsession, Anatomy, **Flow**, Movement, Reel,
Spiral, Crystal, Exit. Flow was placed fifth so self-playing and scroll-driven scenes alternate
through the back half; everything after it moved down one number.

- **Cursor bug.** It hid on a `pointerleave` and only came back on `pointerenter`, which does
  not fire reliably, so one stray leave lost it for good. It now hides only when the pointer
  truly leaves the window and comes back on any movement. It is a light dot in a dark ring, so
  it reads on any colour. (A difference blend was tried and dropped: it cost frames over glass.)
- **Tools.** The no-WebGL / no-outside-tools rule was lifted. Used: one more small WebGL
  shader (Flow) and a 2D canvas (Spiral trunk). Not used: generated or stock video, or motion
  templates. Everything is still code, so it stays sharp, follows the theme, and adds no
  download weight or licences. Open to swapping in real footage if wanted.
- **05 Flow** (new). Fifteen-second loop. A fragment shader of moving silk at half resolution,
  with three lines that rack into focus (blur to sharp) and leave.
- **06 Movement.** The watch keeps its original colours in both themes. In the light theme the
  scene is a dark room (tokens pinned to dark values inside it); the inverted version is gone.
- **08 Spiral**, rebuilt toward the reference. Glass cards with two-colour edges, a sunk
  numeral, an index list bottom left. The core is a trunk of eighteen twisted cables on a
  canvas, depth-sorted per slice so they cross properly, with pulses of light and clamps. It
  has its own neon palette (cyan, magenta, amber, violet), which is a deliberate break from the
  site's brass-and-bone restraint, as asked.
- **Spiral performance.** First version ran at about 38 ms a frame. Causes, in order: large
  blurred shadows on eight 3D cards, eight backdrop filters, per-segment trig in the canvas.
  Now: no outer shadows (a gradient glow instead), refraction on the front card only, cable
  positions precomputed per frame, canvas at 1x and 30 fps. About 10 ms a frame.
- **Measured** (headless Chrome, RTX 3050, 1440x810): 7 to 8 ms average in most scenes, about
  10 ms in Spiral and Crystal, 12 ms in the first. Single long frames remain where a scene
  first appears (roughly 190 to 215 ms in Spiral and Crystal).
- **Open**: the nav index is faint over the silk's mid-tones; first-appearance hitches; none of
  this has been watched by a person in a real browser yet.

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
