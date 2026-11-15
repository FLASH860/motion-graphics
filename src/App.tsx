import { useEffect, useState } from 'react'
import Preloader from '@/components/Preloader'
import Nav from '@/components/Nav'
import Cursor from '@/components/Cursor'
import Scene from '@/components/Scene'
import Hero from '@/sections/Hero'
import Passage from '@/sections/Passage'
import Obsession from '@/sections/Obsession'
import Anatomy from '@/sections/Anatomy'
import Flow from '@/sections/Flow'
import Movement, { preloadWatch } from '@/sections/Movement'
import Reel from '@/sections/Reel'
import Spiral from '@/sections/Spiral'
import Imprint, { preloadStrands } from '@/sections/Imprint'
import Loop from '@/sections/Loop'
import Crystal from '@/sections/Crystal'
import Tempo from '@/sections/Tempo'
import Exit from '@/sections/Exit'
import { initScroll, lockScroll } from '@/lib/scroll'
import { SKIP_INTRO } from '@/lib/scene'

export default function App() {
  // `revealed` flips the moment the curtain starts to lift, so the hero entrance plays under it
  const [revealed, setRevealed] = useState(SKIP_INTRO)
  const [loaderGone, setLoaderGone] = useState(SKIP_INTRO)

  useEffect(() => initScroll(), [])
  useEffect(() => lockScroll(!loaderGone), [loaderGone])
  // once the intro is over, fetch the watch frames in the background, well before they are needed
  useEffect(() => {
    if (!loaderGone) return
    const id = window.setTimeout(preloadWatch, 1500)
    // the strands film is further down the page: fetch it once the watch frames have had a head start
    const id2 = window.setTimeout(preloadStrands, 7000)
    return () => {
      window.clearTimeout(id)
      window.clearTimeout(id2)
    }
  }, [loaderGone])

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
        <Scene index={4} name="Anatomy" dwell={340}>
          <Anatomy />
        </Scene>
        <Scene index={5} name="Flow" dwell={130} enter="blade">
          <Flow />
        </Scene>
        <Scene index={6} name="Movement" dwell={520}>
          <Movement />
        </Scene>
        <Scene index={7} name="Reel" dwell={130} enter="rise">
          <Reel />
        </Scene>
        <Scene index={8} name="Spiral" dwell={460} enter="columns">
          <Spiral />
        </Scene>
        <Scene index={9} name="Imprint" dwell={520} enter="rise">
          <Imprint />
        </Scene>
        <Scene index={10} name="Loop" dwell={160}>
          <Loop />
        </Scene>
        <Scene index={11} name="Crystal" dwell={130} enter="blade">
          <Crystal />
        </Scene>
        <Scene index={12} name="Tempo" dwell={150} enter="columns">
          <Tempo />
        </Scene>
        <Scene index={13} name="Exit" dwell={110} enter="rise" last>
          <Exit />
        </Scene>
      </main>
      <Cursor />
      <div className="grain" aria-hidden />
    </>
  )
}
