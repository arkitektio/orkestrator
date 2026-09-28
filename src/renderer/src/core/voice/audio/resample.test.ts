import { describe, expect, it } from "vitest";
import { createResampler, rms } from "./resample";

const sine = (rate: number, seconds: number, hz: number): Float32Array => {
  const out = new Float32Array(Math.round(rate * seconds));
  for (let i = 0; i < out.length; i++) out[i] = Math.sin((2 * Math.PI * hz * i) / rate);
  return out;
};

describe("createResampler", () => {
  it("produces the expected number of samples for a 48k → 16k stream", () => {
    const resampler = createResampler(48000, 16000);
    const out = resampler.push(sine(48000, 1, 440));
    expect(out.length).toBe(16000);
  });

  it("is identical whether the stream arrives in one block or in render quanta", () => {
    const input = sine(44100, 0.5, 300);
    const whole = createResampler(44100, 16000).push(input);

    const chunked = createResampler(44100, 16000);
    const parts: Float32Array[] = [];
    for (let offset = 0; offset < input.length; offset += 128) {
      parts.push(chunked.push(input.subarray(offset, Math.min(offset + 128, input.length))));
    }
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const joined = new Float32Array(total);
    let at = 0;
    for (const part of parts) {
      joined.set(part, at);
      at += part.length;
    }

    expect(joined.length).toBe(whole.length);
    for (let i = 0; i < whole.length; i++) {
      expect(Math.abs(joined[i] - whole[i])).toBeLessThan(1e-5);
    }
  });

  it("keeps the waveform: a resampled sine still has the same frequency", () => {
    const out = createResampler(48000, 16000).push(sine(48000, 1, 100));
    // Count zero crossings: 100 Hz over 1 s → ~200 crossings.
    let crossings = 0;
    for (let i = 1; i < out.length; i++) {
      if ((out[i - 1] < 0) !== (out[i] < 0)) crossings++;
    }
    expect(crossings).toBeGreaterThanOrEqual(198);
    expect(crossings).toBeLessThanOrEqual(202);
  });

  it("copies when the rates already match", () => {
    const input = new Float32Array([0.1, 0.2, 0.3]);
    const out = createResampler(16000, 16000).push(input);
    expect(Array.from(out)).toEqual(Array.from(input));
    expect(out).not.toBe(input);
  });

  it("rejects nonsense rates", () => {
    expect(() => createResampler(0, 16000)).toThrow();
  });
});

describe("rms", () => {
  it("is 0 for silence and ~0.707 for a full-scale sine", () => {
    expect(rms(new Float32Array(100))).toBe(0);
    expect(rms(sine(16000, 1, 50))).toBeCloseTo(Math.SQRT1_2, 2);
  });
});
