import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { AnimatePresence, motion } from 'motion/react'
import ThemeToggle from './ThemeToggle'
import { reducedMotion } from '@/lib/scroll'
import { SKIP_INTRO, useActiveScene } from '@/lib/scene'

const EASE = [0.16, 1, 0.3, 1] as const
export const SCENE_COUNT = 7

export default function Nav({ play }: { play: boolean }) {
  const root = useRef<HTMLElement>(null)
  const scene = useActiveScene()

  useEffect(() => {
    if (!play || reducedMotion() || SKIP_INTRO) return
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

  const num = String(scene.index).padStart(2, '0')

  return (
    <header className="nav" ref={root} style={{ visibility: play ? 'visible' : 'hidden' }}>
      <a className="nav__mark" href="#top" data-cursor="Top" aria-label="Kanishq Surendran, back to top">
        K<span>—</span>S
      </a>

      {/* where you are: the label rolls over as each scene takes the screen */}
      <p className="nav__index caps" aria-live="polite">
        <span className="nav__roll">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={scene.index}
              className="nav__roll-in"
              initial={{ y: '110%' }}
              animate={{ y: '0%' }}
              exit={{ y: '-110%' }}
              transition={{ duration: 0.9, ease: EASE }}
            >
              {num}
              <span className="nav__name"> — {scene.name}</span>
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="nav__total"> / {String(SCENE_COUNT).padStart(2, '0')}</span>
      </p>

      <ThemeToggle />
    </header>
  )
}
