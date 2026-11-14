/**
 * Image-sequence loader for scroll-scrubbed footage.
 * Frames load coarse-to-fine (every 16th, then 8th, 4th, 2nd, then the rest), so if the visitor
 * reaches the scene early there is always a nearby frame to draw while the gaps fill in.
 */
export function createSequence(count: number, src: (index: number) => string, concurrency = 6) {
  const images: (HTMLImageElement | null)[] = new Array(count).fill(null)
  let loaded = 0
  let started = false
  const listeners = new Set<(index: number) => void>()

  const order: number[] = []
  const queued = new Uint8Array(count)
  for (const step of [16, 8, 4, 2, 1]) {
    for (let i = 0; i < count; i += step) {
      if (!queued[i]) {
        queued[i] = 1
        order.push(i)
      }
    }
  }

  let next = 0
  const pump = () => {
    if (next >= order.length) return
    const i = order[next++]
    const img = new Image()
    img.decoding = 'async'
    img.src = src(i)
    const done = (ok: boolean) => {
      if (ok) {
        images[i] = img
        loaded++
        listeners.forEach((l) => l(i))
      }
      pump()
    }
    // decode off the main thread before the frame is ever drawn
    img.decode().then(
      () => done(true),
      () => done(false),
    )
  }

  return {
    count,
    images,
    get loaded() {
      return loaded
    },
    start() {
      if (started) return
      started = true
      for (let k = 0; k < concurrency; k++) pump()
    },
    /** index of the loaded frame closest to `i`, or -1 if nothing has arrived yet */
    nearest(i: number) {
      if (images[i]) return i
      for (let d = 1; d < count; d++) {
        if (i - d >= 0 && images[i - d]) return i - d
        if (i + d < count && images[i + d]) return i + d
      }
      return -1
    },
    onFrame(l: (index: number) => void) {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
  }
}
