/** Small seeded PRNG (mulberry32) so the mock data layer is stable across
 * reloads within a session instead of reshuffling on every render — a
 * believable demo dataset, not a true-random one. */
export function seededRandom(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]
}

export function intBetween(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

export function daysAgoIso(rng: () => number, maxDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() - intBetween(rng, 0, maxDays))
  return d.toISOString()
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
