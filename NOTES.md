# Notes

Decisions and open questions, newest section first.

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
- `me-away.webp` is 576x1024 and has an AI-generator sparkle watermark bottom right. It will
  need cropping or a higher-resolution source for the outro.
- Custom cursor (global system 5) is not built yet; planned alongside the next section.
- No LinkedIn URL yet for the outro.
