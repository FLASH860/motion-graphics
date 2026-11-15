import { useSyncExternalStore } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * Scene model
 * -----------
 * The page is a stack of full-screen scenes. Every scene is a tall "track" with a sticky,
 * viewport-sized "pin" inside it. Each track overlaps the end of the previous one, so while the
 * previous scene is still pinned the next one opens over it through a growing clip-path
 * rectangle (see components/Scene.tsx).
 *
 *   track height = (100 + in + dwell + out) svh
 *     in    = TRANSITION for every scene but the first: the rectangle opens during it
 *     dwell = the scene's own scroll budget (scrubbed sequences, or simply time to watch)
 *     out   = TRANSITION for every scene but the last: the next rectangle opens over it
 */
export const TRANSITION = 100 // svh of scroll a rectangle takes to fill the screen

/** `?nopre` skips the preloader and entrances, for quick checks and screenshots. */
export const SKIP_INTRO = new URLSearchParams(location.search).has('nopre')

export function sceneOf(el: Element) {
  const track = el.closest<HTMLElement>('.scene')!
  const pin = track.querySelector<HTMLElement>(':scope > .scene__pin')!
  return {
    track,
    pin,
    /** one svh in pixels, read from the pin so it matches the CSS exactly */
    unit: () => pin.offsetHeight / 100,
    tin: Number(track.dataset.tin),
    dwell: Number(track.dataset.dwell),
    tout: Number(track.dataset.tout),
  }
}

/** ScrollTrigger vars spanning a scene's own dwell (after its rectangle has fully opened). */
export function dwellTrigger(el: Element, extraAfter = 0): ScrollTrigger.Vars {
  const s = sceneOf(el)
  return {
    trigger: s.track,
    start: () => `top+=${s.tin * s.unit()} top`,
    end: () => `+=${(s.dwell + extraAfter) * s.unit()}`,
    scrub: true,
    invalidateOnRefresh: true,
  }
}

/**
 * For self-playing scenes: `play` fires once the rectangle is most of the way open, `reset`
 * when the visitor scrolls back above it, so the piece plays again on the way back down.
 */
export function onSceneShown(el: Element, play: () => void, reset?: () => void, at = 0.55) {
  const s = sceneOf(el)
  return ScrollTrigger.create({
    trigger: s.track,
    start: () => `top+=${s.tin * at * s.unit()} top`,
    end: () => `+=${(s.tin * (1 - at) + s.dwell + s.tout) * s.unit()}`,
    invalidateOnRefresh: true,
    onEnter: play,
    onLeaveBack: reset,
  })
}

/**
 * Pre-warm. The first time a scene is drawn the GPU has work to do that it never repeats:
 * compiling the blur and blend shaders, decoding images, rasterising glyphs at display size.
 * Left alone, that work lands on the exact frame the scene starts to open, as a visible stall.
 * So while the loader still covers the page, each scene in turn is opened fully at an opacity
 * too low to see, held for a few frames so it is really drawn, then closed again.
 */
export function prewarmScenes(): Promise<void> {
  const pins = Array.from(document.querySelectorAll<HTMLElement>('.scene:not(.scene--first) > .scene__pin'))
  const frames = (n: number) => new Promise<void>((r) => { const step = () => (--n <= 0 ? r() : requestAnimationFrame(step)); requestAnimationFrame(step) })
  return pins.reduce(
    (chain, pin) =>
      chain.then(async () => {
        pin.classList.add('is-warming')
        await frames(6)
        pin.classList.remove('is-warming')
      }),
    frames(2),
  )
}

/* ───────── which scene is on screen (drives the index in the nav) ───────── */
export type SceneInfo = { index: number; name: string }
let active: SceneInfo = { index: 1, name: 'Arrival' }
const listeners = new Set<() => void>()

export function setActiveScene(info: SceneInfo) {
  if (info.index === active.index) return
  active = info
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
export const useActiveScene = () => useSyncExternalStore(subscribe, () => active)
