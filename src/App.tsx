import { useEffect, useState } from 'react'
import Preloader from '@/components/Preloader'
import Nav from '@/components/Nav'
import Hero from '@/sections/Hero'
import { initScroll, lockScroll } from '@/lib/scroll'

export default function App() {
  // `revealed` flips the moment the curtain starts to lift, so the hero entrance plays under it
  const [revealed, setRevealed] = useState(false)
  const [loaderGone, setLoaderGone] = useState(false)

  useEffect(() => initScroll(), [])
  useEffect(() => lockScroll(!loaderGone), [loaderGone])

  return (
    <>
      {!loaderGone && <Preloader onReveal={() => setRevealed(true)} onDone={() => setLoaderGone(true)} />}
      <Nav play={revealed} />
      <main>
        <Hero play={revealed} />
        {/* Placeholder so the hero's scroll parallax can be reviewed. Replaced by section 02. */}
        <section className="placeholder" aria-label="Next section placeholder">
          <p className="caps">N° 02 — next section, after review</p>
        </section>
      </main>
      <div className="grain" aria-hidden />
    </>
  )
}
