import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

let lenis: Lenis | null = null
let locked = false

/** Lenis smooth scroll driven by GSAP's ticker so ScrollTrigger and Lenis share one clock. */
export function initScroll() {
  if (reducedMotion()) return () => {}
  // lerp, not a fixed duration: the page starts moving on the same frame as the wheel and
  // settles quickly, which is the difference between "smooth" and "behind"
  lenis = new Lenis({ lerp: 0.115, smoothWheel: true })
  if (locked) lenis.stop()
  lenis.on('scroll', ScrollTrigger.update)
  const raf = (time: number) => lenis?.raf(time * 1000)
  gsap.ticker.add(raf)
  gsap.ticker.lagSmoothing(0)
  return () => {
    gsap.ticker.remove(raf)
    lenis?.destroy()
    lenis = null
  }
}

export function lockScroll(on: boolean) {
  locked = on
  document.documentElement.classList.toggle('is-locked', on)
  if (on) {
    window.scrollTo(0, 0)
    lenis?.stop()
  } else lenis?.start()
}
