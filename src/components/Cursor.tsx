import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

const TARGETS = '[data-cursor], a, button'

/**
 * A small dot that trails the pointer. Over anything interactive it becomes a short label
 * (from `data-cursor`). Fine pointers only: touch devices never see it.
 * A light dot in a dark ring, so it stays visible over any colour on the page.
 */
export default function Cursor() {
  const root = useRef<HTMLDivElement>(null)
  const [label, setLabel] = useState('')
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    setEnabled(true)
  }, [])

  useEffect(() => {
    if (!enabled) return
    const el = root.current!
    document.documentElement.classList.add('has-cursor')
    const x = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3.out' })
    const y = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3.out' })
    let seen = false
    let shown = false
    let over: Element | null = null

    const read = () => setLabel(over ? ((over as HTMLElement).dataset.cursor ?? 'Open') : '')
    const onMove = (e: PointerEvent) => {
      if (!seen) {
        seen = true
        gsap.set(el, { x: e.clientX, y: e.clientY })
      }
      // any movement proves the pointer is over the page: never stay hidden after a stray leave
      if (!shown) {
        shown = true
        el.classList.add('is-visible')
      }
      x(e.clientX)
      y(e.clientY)
      const hit = (e.target as Element | null)?.closest?.(TARGETS) ?? null
      if (hit !== over) {
        over = hit
        read()
      }
    }
    // hide only when the pointer really leaves the window (relatedTarget is null then)
    const onLeave = (e: MouseEvent) => {
      if (e.relatedTarget) return
      shown = false
      el.classList.remove('is-visible')
    }
    const onDown = () => el.classList.add('is-down')
    // a click can change the label under the pointer (the theme switch), so read it again
    const onUp = () => {
      el.classList.remove('is-down')
      window.setTimeout(read, 60)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    document.addEventListener('mouseout', onLeave)
    return () => {
      document.documentElement.classList.remove('has-cursor')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('mouseout', onLeave)
    }
  }, [enabled])

  // keep the last label mounted while the pill shrinks away
  const last = useRef('')
  if (label) last.current = label

  if (!enabled) return null
  return (
    <div className={`cursor${label ? ' has-label' : ''}`} ref={root} aria-hidden>
      <span className="cursor__dot" />
      <span className="cursor__pill">{label || last.current}</span>
    </div>
  )
}
