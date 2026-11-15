import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { TRANSITION, setActiveScene } from '@/lib/scene'

/**
 * How a scene takes the screen. All four are clip-paths on the incoming pin, scrubbed to scroll,
 * while the outgoing scene recedes into depth underneath.
 *   rect     a point becomes a small centred rectangle, which fills the screen
 *   rise     comes up from the bottom under a shallow arc, like a horizon
 *   columns  seven columns climb from the floor one after another, like piano keys released
 *   blade    a slanted edge sweeps across from the left
 */
export type Enter = 'rect' | 'rise' | 'columns' | 'blade'

type Props = {
  index: number
  name: string
  /** svh of scroll the scene keeps for itself once it is fully open */
  dwell?: number
  enter?: Enter
  first?: boolean
  last?: boolean
  children: ReactNode
}

const COLUMNS = 7
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const columnEase = gsap.parseEase('power3.inOut')
const riseEase = gsap.parseEase('power2.inOut')
const bladeEase = gsap.parseEase('power2.inOut')

/** clip-path for a given transition at progress p (0 closed → 1 open), for a w×h pin */
function clipFor(enter: Enter, p: number, w: number, h: number) {
  if (p >= 1) return 'none'
  if (enter === 'rise') {
    // a very large circle whose top edge climbs the screen: reads as a gently curved horizon
    const R = w * 1.35
    const sag = R - Math.sqrt(R * R - (w / 2) * (w / 2)) // how far the arc's corners trail its crown
    const top = h - riseEase(p) * (h + sag)
    return `circle(${R.toFixed(1)}px at 50% ${(top + R).toFixed(1)}px)`
  }
  if (enter === 'columns') {
    // each column starts a beat after the one before; all finish by p = 1
    const lag = 0.085
    const span = 1 - lag * (COLUMNS - 1)
    const pts: string[] = []
    for (let i = 0; i < COLUMNS; i++) {
      const local = columnEase(clamp01((p - i * lag) / span))
      const x0 = ((i / COLUMNS) * 100 - 0.05).toFixed(3)
      const x1 = (((i + 1) / COLUMNS) * 100 + 0.05).toFixed(3)
      const y = ((1 - local) * 100).toFixed(3)
      pts.push(`${x0}% 100%`, `${x0}% ${y}%`, `${x1}% ${y}%`, `${x1}% 100%`)
    }
    return `polygon(${pts.join(',')})`
  }
  // blade
  const slant = 34 // how far the edge leans, in % of width
  const x = bladeEase(p) * (100 + slant)
  return `polygon(0% 0%, ${x.toFixed(3)}% 0%, ${(x - slant).toFixed(3)}% 100%, 0% 100%)`
}

/** One full-screen scene: a tall track with a sticky pin (see lib/scene.ts for the model). */
export default function Scene({ index, name, dwell = 0, enter = 'rect', first, last, children }: Props) {
  const track = useRef<HTMLDivElement>(null)
  const tin = first ? 0 : TRANSITION
  const tout = last ? 0 : TRANSITION

  useLayoutEffect(() => {
    const el = track.current!
    const pin = el.querySelector<HTMLElement>(':scope > .scene__pin')!
    const body = pin.querySelector<HTMLElement>(':scope > .scene__body')!
    const unit = () => pin.offsetHeight / 100

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: () => `top+=${tin * 0.5 * unit()} top`,
        // (the last scene's range runs past the end of the page so it stays current at the bottom)
        end: () => `+=${(tin * 0.5 + dwell + (last ? 200 : tout * 0.5)) * unit()}`,
        invalidateOnRefresh: true,
        onToggle: (self) => self.isActive && setActiveScene({ index, name }),
      })
      // Rendering window: a scene only exists for the compositor from a little before it opens
      // until the next one has covered it. Away from that it is visibility:hidden, so its layers
      // (3D planes, canvases, glass) cost nothing while you are somewhere else on the page.
      const LEAD = 130
      const live = ScrollTrigger.create({
        trigger: el,
        start: () => `top-=${LEAD * unit()} top`,
        end: () => `+=${(LEAD + tin + dwell + (last ? 300 : tout)) * unit() + 2}`,
        invalidateOnRefresh: true,
        onToggle: (self) => pin.classList.toggle('is-idle', !self.isActive),
        onRefresh: (self) => pin.classList.toggle('is-idle', !self.isActive),
      })
      pin.classList.toggle('is-idle', !live.isActive)
      if (first) return

      const prev = el.previousElementSibling as HTMLElement
      const prevBody = prev.querySelector<HTMLElement>(':scope > .scene__pin > .scene__body')!
      const prevShade = prev.querySelector<HTMLElement>(':scope > .scene__pin > .scene__shade')!

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: () => `+=${TRANSITION * unit()}`,
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: enter === 'rect' ? undefined : (self) => (pin.style.clipPath = clipFor(enter, self.progress, pin.offsetWidth, pin.offsetHeight)),
          // belt and braces: once past the transition the scene is fully open, whatever the last scrub frame was
          onLeave: enter === 'rect' ? undefined : () => (pin.style.clipPath = 'none'),
        },
      })

      if (enter === 'rect') {
        // a point becomes a small rectangle, then the rectangle takes its time filling the screen
        // (the clip-path itself lives in CSS and reads these two custom properties)
        tl.fromTo(pin, { '--clip': '50%', '--clip-r': '18px' }, { '--clip': '42%', '--clip-r': '14px', duration: 0.14, ease: 'power2.out' }, 0)
          .to(pin, { '--clip': '0%', '--clip-r': '0px', duration: 0.86, ease: 'power2.inOut' }, 0.14)
          // the incoming scene settles back as it opens, like a lens pulling focus
          .fromTo(body, { scale: 1.22 }, { scale: 1, duration: 1, ease: 'power2.out' }, 0)
      } else if (enter === 'rise') {
        // the rising edge is the whole move: the scene itself is already in its final place
        // underneath, so it can never be left sitting low
        tl.to({}, { duration: 1 }, 0)
      } else {
        tl.fromTo(body, { scale: 1.1 }, { scale: 1, duration: 1, ease: 'power2.out' }, 0)
      }

      // the outgoing scene recedes into depth
      tl.to(prevBody, { scale: 0.8, duration: 1, ease: 'power1.inOut' }, 0).to(prevShade, { opacity: 0.62, duration: 1, ease: 'power1.in' }, 0)
    }, el)
    return () => ctx.revert()
  }, [first, last, index, name, dwell, tin, tout, enter])

  return (
    <div
      className={`scene${first ? ' scene--first' : ''}`}
      ref={track}
      data-tin={tin}
      data-dwell={dwell}
      data-tout={tout}
      data-scene={index}
      style={{ '--tin': tin, '--dwell': dwell, '--tout': tout } as CSSProperties}
    >
      <div className="scene__pin">
        <div className="scene__body">{children}</div>
        <div className="scene__shade" aria-hidden />
      </div>
    </div>
  )
}
