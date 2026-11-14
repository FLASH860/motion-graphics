import { useEffect, useState } from 'react'
import Preloader from '@/components/Preloader'
import Nav from '@/components/Nav'
import Cursor from '@/components/Cursor'
import Scene from '@/components/Scene'
import Hero from '@/sections/Hero'
import Passage from '@/sections/Passage'
import Obsession from '@/sections/Obsession'
import Anatomy from '@/sections/Anatomy'
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
        <Scene index={2} name="Passage" dwell={420}>
          <Passage />
        </Scene>
        <Scene index={3} name="Obsession" dwell={90}>
          <Obsession />
        </Scene>
        <Scene index={4} name="Anatomy" dwell={340} last>
          <Anatomy />
        </Scene>
      </main>
      <Cursor />
      <div className="grain" aria-hidden />
    </>
  )
}
