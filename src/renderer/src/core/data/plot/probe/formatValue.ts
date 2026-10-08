/**
 * A number, compactly, for readouts and row labels.
 *
 * Four significant figures, switching to exponent form outside [1e-3, 1e5) so a
 * picoamp current and an epoch-scale time both stay legible in a narrow column.
 * In `platform/` because both the probe feature and the shell's row labels need it,
 * and neither may import the other.
 */
export const formatValue = (v: number): string => {
  if (!Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e5)) return v.toExponential(2);
  return Number(v.toPrecision(4)).toString();
};
