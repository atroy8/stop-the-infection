/** Mulberry32 PRNG */
export function nextRng(state: number): { value: number; state: number } {
  let t = (state + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return { value, state: t | 0 }
}

export function randInt(state: number, min: number, max: number): {
  n: number
  state: number
} {
  const { value, state: s } = nextRng(state)
  return { n: min + Math.floor(value * (max - min + 1)), state: s }
}
