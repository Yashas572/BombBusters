export interface Rng {
  next(): number;
  int(min: number, maxExclusive: number): number;
  shuffle<T>(arr: T[]): T[];
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  if (s === 0) s = 1;

  const next = (): number => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };

  return {
    next,
    int(min, maxExclusive) {
      return Math.floor(next() * (maxExclusive - min)) + min;
    },
    shuffle<T>(arr: T[]): T[] {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}
