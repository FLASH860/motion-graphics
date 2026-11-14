import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { useTheme } from '@/lib/theme'
import { prepareInk, toggleTheme } from '@/lib/ink'

const EASE = [0.65, 0, 0.35, 1] as const
const TRAVEL = 30 // track width − knob − 2 × inset

/** Neumorphic sliding switch. The ink-bleed spreads from wherever this button sits on screen. */
export default function ThemeToggle() {
  const theme = useTheme()
  const btn = useRef<HTMLButtonElement>(null)
  const light = theme === 'light'

  // pre-render the ink sheet when idle, and again whenever the viewport (and so the origin) changes
  useEffect(() => {
    let timer = 0
    const prep = () => prepareInk(btn.current)
    const idle = window.setTimeout(prep, 1200)
    const onResize = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(prep, 300)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.clearTimeout(idle)
      window.clearTimeout(timer)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <motion.button
      ref={btn}
      type="button"
      role="switch"
      aria-checked={light}
      aria-label="Light theme"
      className="toggle"
      onClick={() => toggleTheme(btn.current)}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      <span className="toggle__track">
        <motion.span
          className="toggle__knob"
          initial={false}
          animate={{ x: light ? TRAVEL : 0 }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <motion.circle
              cx="12"
              cy="12"
              r="5"
              fill="currentColor"
              initial={false}
              animate={{ scale: light ? 1 : 0.86 }}
              transition={{ duration: 0.8, ease: EASE }}
              style={{ transformOrigin: '12px 12px' }}
            />
            {/* the bite that turns the sun into a crescent in the dark theme */}
            <motion.circle
              cx="15.5"
              cy="9.5"
              r="4.6"
              className="toggle__bite"
              initial={false}
              animate={{ scale: light ? 0 : 1 }}
              transition={{ duration: 0.8, ease: EASE }}
              style={{ transformOrigin: '19px 6px' }}
            />
          </svg>
        </motion.span>
      </span>
    </motion.button>
  )
}
