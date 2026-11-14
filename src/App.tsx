import { useEffect, useState } from 'react'
import Preloader from '@/components/Preloader'
import Nav from '@/components/Nav'
import Cursor from '@/components/Cursor'
import Scene from '@/components/Scene'
import Hero from '@/sections/Hero'
import { initScroll, lockScroll } from '@/lib/scroll'
import { SKIP_INTRO } from '@/lib/scene'

export default function App() {
  // `revealed` flips the moment the curtain starts to lift, so the hero entrance plays under it
  const [revealed, setRevealed] = useState(SKIP_INTRO)
  const [loaderGone, setLoaderGone] = useState(SKIP_INTRO)

  useEffect(() => initScroll(), [])
  useEffect(() => lockScroll(!loaderGone), [loaderGone])

  return (
    <>
      {!loaderGone && <Preloader onReveal={() => setRevealed(true)} onDone={() => setLoaderGone(true)} />}
      <Nav play={revealed} />
      <main>
        <Scene index={1} name="Arrival" dwell={40} first>
          <Hero play={revealed} />
        </Scene>
        <Scene index={2} name="Passage" dwell={60} last>
          <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            <p className="caps">placeholder</p>
          </div>
        </Scene>
      </main>
      <Cursor />
      <div className="grain" aria-hidden />
    </>
  )
}
