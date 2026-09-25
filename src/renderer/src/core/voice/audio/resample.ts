/**
 * Linear resampling with state carried across blocks, so a stream fed in
 * 128-sample render quanta comes out identical to the same stream resampled
 * in one go. Pure, no DOM: shared by the AudioWorklet and its tests.
 *
 * Linear is enough here: the input is speech at 44.1/48 kHz going to 16 kHz
 * for a model that was trained on far worse microphones than the aliasing
 * this leaves in.
 */
export type Resampler = {
  /** Resample one block. Returns the output samples this block produced. */
  push(input: Float32Array): Float32Array;
  reset(): void;
};

export const createResampler = (fromRate: number, toRate: number): Resampler => {
  if (!(fromRate > 0) || !(toRate > 0)) {
    throw new Error(`Invalid sample rates ${fromRate} → ${toRate}`);
  }
  if (fromRate === toRate) {
    return { push: (input) => input.slice(), reset: () => {} };
  }

  const step = fromRate / toRate;
  // Position of the next output sample, in input samples, relative to the
  // start of the current block. Can be negative after a block boundary (it
  // then refers to `last`).
  let position = 0;
  let last = 0;
  let primed = false;

  return {
    push(input) {
      if (input.length === 0) return new Float32Array(0);
      if (!primed) {
        // The very first sample is emitted as-is; interpolation needs a past.
        last = input[0];
        primed = true;
      }
      const count = Math.max(0, Math.floor((input.length - 1 - position) / step) + 1);
      const output = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const at = position + i * step;
        const index = Math.floor(at);
        const frac = at - index;
        const a = index < 0 ? last : input[index];
        const b = index + 1 < input.length ? input[index + 1] : input[input.length - 1];
        output[i] = a + (b - a) * frac;
      }
      position = position + count * step - input.length;
      last = input[input.length - 1];
      return output;
    },
    reset() {
      position = 0;
      last = 0;
      primed = false;
    },
  };
};

/** Root mean square of a block, 0–1 for full-scale audio. */
export const rms = (samples: Float32Array): number => {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
};
