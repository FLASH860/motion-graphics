import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { TRANSITION, setActiveScene } from '@/lib/scene'

type Props = {
  index: number
  name: string
  /** svh of scroll the scene keeps for itself once it is fully open */
  dwell?: number
  first?: boolean
  last?: boolean
  children: ReactNode
}

/**
 * One full-screen scene. Unless it is the first, it opens over the previous scene as a small
 * centred rectangle that grows to fill the screen, scrubbed to scroll, while the previous
 * scene's body scales back into depth and darkens.
 */
export default function Scene({ index, name, dwell = 0, first, last, children }: Props) {
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
      if (first) return

      const prev = el.previousElementSibling as HTMLElement
      const prevBody = prev.querySelector<HTMLElement>(':scope > .scene__pin > .scene__body')!
      const prevShade = prev.querySelector<HTMLElement>(':scope > .scene__pin > .scene__shade')!

      gsap
        .timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: el,
            start: 'top top',
            end: () => `+=${TRANSITION * unit()}`,
            scrub: true,
            invalidateOnRefresh: true,
          },
        })
        // a point becomes a small rectangle, then the rectangle takes its time filling the screen
        // (the clip-path itself lives in CSS and reads these two custom properties)
        .fromTo(pin, { '--clip': '50%', '--clip-r': '18px' }, { '--clip': '42%', '--clip-r': '14px', duration: 0.14, ease: 'power2.out' }, 0)
        .to(pin, { '--clip': '0%', '--clip-r': '0px', duration: 0.86, ease: 'power2.inOut' }, 0.14)
        // the incoming scene settles back as it opens, like a lens pulling focus
        .fromTo(body, { scale: 1.22 }, { scale: 1, duration: 1, ease: 'power2.out' }, 0)
        // the outgoing scene recedes into depth
        .to(prevBody, { scale: 0.8, duration: 1, ease: 'power1.inOut' }, 0)
        .to(prevShade, { opacity: 0.62, duration: 1, ease: 'power1.in' }, 0)
    }, el)
    return () => ctx.revert()
  }, [first, last, index, name, dwell, tin, tout])

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
