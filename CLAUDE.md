# Project Brief — Motion Site

A premium, motion-graphics-driven website about Kanishq Surendran.
Not a portfolio: no projects, no case studies. Pure design showcase.
No 3D models, no MCPs. All the wow comes from motion, video and photography.

---

## Style rules (non-negotiable)

- Premium and classy, like Apple, Porsche or a luxury watch brand.
- **NO particles, NO glitch, NO code rain, NO chromatic aberration, NO gimmicks.**
- Big editorial typography (refined serif + clean grotesk), lots of negative space.
- Motion is slow, weighted and eased (expo/quart). Never bouncy or snappy.
- One strong idea per section. If it doesn't feel expensive, cut it.
- Every section must look great in both dark and light themes.

---

## Stack

- React + Vite + TypeScript
- GSAP + ScrollTrigger (scroll and timeline animation)
- Lenis (smooth scroll, synced with ScrollTrigger)
- Motion (Framer Motion) for UI micro-interactions only
- ffmpeg for video prep
- Deploy: Cloudflare Pages

---

## Assets

- `assets/me/me-front.jpg` — looking forward → landing hero
- `assets/me/me-away.jpg` — looking away → outro
- `assets/video/watch.mp4` — 10s horizontal watch disassembly → watch section
- Never modify originals. Save processed versions separately (e.g. `assets/processed/`).
- Background removal: local library only (e.g. @imgly/background-removal-node).

---

## Global systems

1. **Preloader** — minimal 0–100 counter in fine serif, then a slow curtain reveal.
2. **Section transitions** — the next section starts as a small centred rectangle and slowly expands to fill the screen (clip-path scrubbed by ScrollTrigger), while the previous section scales down and darkens slightly.
3. **Theme toggle** — neumorphic sliding switch. On toggle, the new theme spreads outward from the button with an organic ink-bleed edge (WebGL noise-mask shader), like ink soaking into paper. Reference implementation: https://github.com/FLASH860/holygrail
4. **Smooth scroll** — Lenis + ScrollTrigger.
5. **Cursor** — small elegant dot, grows into a short label over interactive elements. No warping.

---

## Sections (in order)

1. **Landing hero** — me-front.jpg cut out and graded cinematically, layered with giant editorial type behind/around me, slow scroll parallax with depth.
2. **Motion graphics sections** — a mix of:
   - self-playing motion (kinetic type, masked reveals, staggered entrances)
   - scroll-driven motion (pinned sections, animation scrubbed to scroll)
   Content: short about-me statements. Keep copy minimal and confident.
3. **Watch** — pinned section, watch.mp4 scrubbed to scroll, buttery in both directions.
   - Re-encode with every frame as a keyframe (`ffmpeg -i watch.mp4 -g 1 -an ...`) or extract to an image sequence drawn on canvas, whichever scrubs smoother.
   - Info cards slide in left and right at the right moments: case, crystal, indicators, barrels, tourbillon.
4. **Outro** — me-away.jpg, a quiet cinematic sign-off with name and links (GitHub: FLASH860, LinkedIn).

---

## Performance

- 60fps target on a mid-range laptop.
- Lazy-load heavy media; preload the watch frames before the section is reached.
- Mobile: simpler but never broken. Respect prefers-reduced-motion.

---

## Workflow

- Build ONE section at a time. Run the dev server and stop for Kanishq's review after each.
- Only move on after approval. Commit and push after each approved section.
- Log decisions and open questions in NOTES.md.
