/**
 * Dtype-aware display formatting for probed voxel values: integers print as
 * plain integers, floats at 5 significant digits, extreme magnitudes in
 * exponential notation. Null (value not yet resolved) renders as an em dash.
 */

const INT_DTYPES = /^u?int(8|16|32|64)$/;

export function formatProbeValue(value: number | null, dtype: string): string {
  if (value === null || Number.isNaN(value)) return "—";
  if (INT_DTYPES.test(dtype)) return Math.round(value).toString();
  if (value === 0) return "0";
  const magnitude = Math.abs(value);
  if (magnitude < 1e-3 || magnitude >= 1e6) return value.toExponential(3);
  return Number(value.toPrecision(5)).toString();
}
