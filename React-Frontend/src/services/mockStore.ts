import type * as MockData from './mockData'
import { sleep } from '../utils/random'

/**
 * The seeded sample data is generated in its own chunk, off the first-paint path.
 * Every repository call awaits `latency()` before touching `mock`, so the data is
 * always loaded by then. A real API replaces this module, not the call sites.
 */
export let mock: typeof MockData

const loaded = import('./mockData').then((m) => {
  mock = m
})

export async function latency(ms: number) {
  await Promise.all([loaded, sleep(ms)])
}
