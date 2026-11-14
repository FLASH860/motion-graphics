import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import ThemeToggle from './ThemeToggle'
import { reducedMotion } from '@/lib/scroll'

export default function Nav({ play }: { play: boolean }) {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!play || reducedMotion()) return
    const tween = gsap.from(root.current!.children, {
      autoAlpha: 0,
      y: -14,
      duration: 1.6,
      ease: 'expo.out',
      stagger: 0.12,
      delay: 1.5,
    })
    return () => {
      tween.kill()
    }
  }, [play])

  return (
    <header className="nav" ref={root} style={{ visibility: play ? 'visible' : 'hidden' }}>
      <a className="nav__mark" href="#top" aria-label="Kanishq Surendran, back to top">
        K<span>—</span>S
      </a>
      <ThemeToggle />
    </header>
  )
}
