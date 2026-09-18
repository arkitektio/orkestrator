/**
 * Per-site colours: the 3D markers in `model_render/` and the trace legend on
 * the simulation page tint themselves alike, so the hue function lives here
 * rather than in either of them.
 *
 * The hue is the golden angle (137.508°) times a number derived from the id,
 * which spreads adjacent ids as far apart as a 1-D palette can. Ids are serial
 * numbers or UUIDs depending on the object, so a non-numeric id is hashed
 * first. Stimuli use a different multiplier so a recording and a stimulus
 * sharing an id are not the same colour. A highlighted id goes red.
 */

const GOLDEN_ANGLE = 137.508;
/** Stimuli want a different walk than recordings. */
const STIMULUS_ANGLE = 37.508;

/** A stable small integer for an id: the number itself, or a string hash. */
const idNumber = (id: string): number => {
  const n = Number(id);
  if (Number.isFinite(n)) return n;
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(hash);
};

const hueFor = (id: string, angle: number) => (idNumber(id) * angle) % 360;

const colorFor = (id: string, angle: number, highlight?: string[]) => {
  if (highlight?.includes(id)) return `hsl(0, 70%, 60%)`;
  return `hsl(${hueFor(id, angle)}, 70%, 60%)`;
};

export const getColorForRecording = (recording: { id: string }, highlight?: string[]) =>
  colorFor(recording.id, GOLDEN_ANGLE, highlight);

export const getColorForStimulus = (stimulus: { id: string }, highlight?: string[]) =>
  colorFor(stimulus.id, STIMULUS_ANGLE, highlight);
