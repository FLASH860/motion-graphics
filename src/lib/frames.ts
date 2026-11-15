/**
 * Image-sequence loader for scroll-scrubbed footage.
 * Frames load coarse-to-fine (every 16th, then 8th, 4th, 2nd, then the rest), so if the visitor
 * reaches the scene early there is always a nearby frame to draw while the gaps fill in.
 */
export function createSequence(count: number, src: (index: number) => string, concurrency = 6) {
  const images: (HTMLImageElement | null)[] = new Array(count).fill(null)
  let loaded = 0
  let started = false
  const bitmaps: (ImageBitmap | null)[] = new Array(count).fill(null)
  const pending = new Uint8Array(count)
  let keepLo = 0
  let keepHi = -1
  let heldLo = count
  let heldHi = -1
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
    /**
     * Keep a window of frames around the playhead as ImageBitmaps.
     * Drawing an <img> can decode it on the main thread every time (the browser is free to
     * drop decoded pixels), and that decode is the stall you feel while scrubbing. A bitmap is
     * decoded once, off the main thread, and draws as a plain texture copy. Holding all 240
     * at 1080p would cost about two gigabytes, so only the frames near the playhead are kept, weighted
     * toward the direction of travel, and the rest are released.
     */
    window(center: number, dir: number) {
      const ahead = 12
      const behind = 5
      const lo = Math.max(0, center - (dir >= 0 ? behind : ahead))
      const hi = Math.min(count - 1, center + (dir >= 0 ? ahead : behind))
      keepLo = Math.max(0, center - 17)
      keepHi = Math.min(count - 1, center + 17)
      for (let i = lo; i <= hi; i++) {
        const img = images[i]
        if (!img || bitmaps[i] || pending[i]) continue
        pending[i] = 1
        // from a Blob, not from the <img>: only the Blob path decodes on a worker thread.
        // (The file is already in the HTTP cache, so this fetch does not touch the network.)
        fetch(src(i))
          .then((r) => r.blob())
          .then((blob) => createImageBitmap(blob))
          .then(
            (bmp) => {
              pending[i] = 0
              if (i >= keepLo && i <= keepHi) bitmaps[i] = bmp
              else bmp.close()
            },
            () => (pending[i] = 0),
          )
      }
      // release what the playhead has left behind
      for (let i = heldLo; i <= heldHi; i++) {
        if ((i < keepLo || i > keepHi) && bitmaps[i]) {
          bitmaps[i]!.close()
          bitmaps[i] = null
        }
      }
      heldLo = Math.min(heldLo, lo)
      heldHi = Math.max(heldHi, hi)
      if (heldLo < keepLo) heldLo = keepLo
      if (heldHi > keepHi) heldHi = keepHi
    },
    /** the fastest thing available to draw for frame i: a ready bitmap if there is one */
    source(i: number): CanvasImageSource | null {
      return bitmaps[i] ?? images[i]
    },
    onFrame(l: (index: number) => void) {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
  }
}

type Sequence = ReturnType<typeof createSequence>

/**
 * Paint the film at a position: the nearest whole frame, drawn sharp.
 * (Dissolving between neighbouring frames was tried to smooth slow scrolling; it read as blur
 * while scrolling, so whole frames it is.)
 * Returns a key for what was painted; pass it back in as `last` to skip identical repaints.
 */
export function paintFilm(ctx: CanvasRenderingContext2D, seq: Sequence, position: number, w: number, h: number, last: string) {
  const i = seq.nearest(Math.max(0, Math.min(seq.count - 1, Math.round(position))))
  if (i < 0) return last
  const key = String(i)
  if (key === last) return last
  ctx.drawImage(seq.source(i)!, 0, 0, w, h)
  return key
}
