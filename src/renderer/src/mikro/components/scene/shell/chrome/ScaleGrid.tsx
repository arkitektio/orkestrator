import { Grid } from "../../platform/draw/Grid";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { computeWorldUnitsPerPixel, readControlsTarget } from "../../platform/probe/probeWorld";

function getNiceNumber(value: number): number {
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

export const ScaleGrid = () => {
  const show = useViewerStore((s) => s.showScaleGrid);
  const [cellSize, setCellSize] = useState(10);
  const lastCellRef = useRef(10);

  useFrame(({ camera, size, controls }) => {
    // The grid is OFF by default: skip the per-frame math (and the setState
    // below, which re-rendered on every 1/2/5 zoom-boundary crossing) while
    // nothing renders it. The hook itself must stay mounted (rules of hooks).
    if (!show) return;
    const worldUnitsPerPixel = computeWorldUnitsPerPixel(
      camera,
      size.height,
      readControlsTarget(controls),
    );

    // Aim for grid lines roughly 60px apart on screen
    const rawSpacing = 60 * worldUnitsPerPixel;
    const niceSpacing = getNiceNumber(rawSpacing);

    if (niceSpacing !== lastCellRef.current) {
      lastCellRef.current = niceSpacing;
      setCellSize(niceSpacing);
    }
  });

  if (!show) return null;

  return (
    <Grid
      rotation-x={-Math.PI / 2}
      position={[0, 0, 0.01]}
      cellSize={cellSize}
      sectionSize={cellSize * 5}
      cellColor="#444444"
      sectionColor="#666666"
      cellThickness={0.5}
      sectionThickness={1}
      fadeDistance={cellSize * 80}
      fadeStrength={1.5}
      infiniteGrid
    />
  );
};
