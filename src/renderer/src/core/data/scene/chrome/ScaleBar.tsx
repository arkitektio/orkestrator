/** Round `value` to 1, 2 or 5 × a power of ten — the lengths a ruler reads. */
export function getNiceNumber(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / Math.pow(10, exponent);
  let niceFraction;
  if (fraction < 1.5) niceFraction = 1;
  else if (fraction < 3) niceFraction = 2;
  else if (fraction < 7) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * Math.pow(10, exponent);
}

/**
 * The bottom-left ruler every viewer shows: ~120 px rounded to a nice length.
 * Presentational — the caller decides whether the world carries a physical
 * unit at all and hands in the current `worldUnitsPerPixel`.
 */
export const ScaleBarView = ({
  worldUnitsPerPixel,
  unitLabel,
}: {
  worldUnitsPerPixel: number;
  unitLabel: string;
}) => {
  if (!(worldUnitsPerPixel > 0) || !Number.isFinite(worldUnitsPerPixel)) return null;
  const targetPx = 120;
  const niceUnits = getNiceNumber(targetPx * worldUnitsPerPixel);
  const finalWidthPx = niceUnits / worldUnitsPerPixel;

  return (
    <div className="absolute bottom-8 left-8 z-10 flex flex-col items-center pointer-events-none">
      <div
        className="border-b-2 border-l-2 border-r-2 border-white h-2"
        style={{ width: `${finalWidthPx}px` }}
      />
      <span className="text-[10px] text-white font-mono mt-1 bg-black/40 px-1 rounded">
        {niceUnits} {unitLabel}
      </span>
    </div>
  );
};
