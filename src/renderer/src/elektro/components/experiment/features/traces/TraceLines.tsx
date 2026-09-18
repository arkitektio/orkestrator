import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import { Line2 } from "three/examples/jsm/lines/webgpu/Line2.js";
import { Line2NodeMaterial } from "three/webgpu";
import { useSegmentGeometry, writeSegments } from "../../platform/marks/segmentGeometry";
import type { LayerState } from "../../platform/model/layerModel";
import { bandKey } from "../../platform/stores/viewerStore";
import { useBandValueMatrix } from "../../platform/marks/bandValueMatrix";
import type { PackedChannel } from "./tracePacking";
import { useTraceStore } from "./store/traceSlice";

/**
 * A trace layer drawn as fat lines, one `Line2` per channel.
 *
 * ## Where the layout lives: the object matrix
 *
 * The buffer holds `(time − origin, value)`. Mapping a value into its row is an
 * affine map in y alone — `y = scale · value + offset` — so it is the line's OBJECT
 * MATRIX, not a shader uniform and not a buffer rewrite. Changing a clim, a row
 * height or the layout mode therefore writes one matrix and requests one frame;
 * nothing is repacked or recompiled. And because `Line2NodeMaterial` expands its
 * quads in screen space after projection, a non-uniform y scale does not thicken or
 * thin the line.
 *
 * ## Two planes
 *
 * The band and clim are bound with a vanilla subscription on SCALARS (the band's
 * identity is kept stable across relayouts by the store; the clim is read as its
 * two numbers), so a clim change elsewhere re-renders nothing here. The packed
 * geometry itself changes at UI cadence — when tiles land — so it arrives as React
 * state and is uploaded in a layout effect.
 */

const NO_CHANNELS: PackedChannel[] = [];

/**
 * Draws what the layer's `TraceTileDriver` published — one `Line2` per channel.
 * Subscribes to its OWN entry of the trace slice, which changes when tiles land
 * or the committed window moves (UI cadence); the layout binds imperatively.
 */
export const TraceLines = ({ layer }: { layer: LayerState }) => {
  const channels = useTraceStore((s) => s.packed[layer.id]?.channels ?? NO_CHANNELS);
  return (
    <>
      {channels.map((packed, channel) => (
        <ChannelLine
          key={channel}
          layerId={layer.id}
          channel={channel}
          color={layer.color}
          lineWidth={layer.lineWidth}
          packed={packed}
        />
      ))}
    </>
  );
};

const ChannelLine = ({
  layerId,
  channel,
  color,
  lineWidth,
  packed,
}: {
  layerId: string;
  channel: number;
  color: string;
  lineWidth: number;
  packed: PackedChannel;
}) => {
  const invalidate = useThree((s) => s.invalidate);

  const material = useMemo(() => {
    const m = new Line2NodeMaterial();
    // Screen-space pixels: a trace's width must not depend on how far you zoomed.
    m.worldUnits = false;
    m.depthWrite = false;
    return m;
  }, []);

  // Colour and width are content: an edit rewrites a uniform, never the buffer.
  useEffect(() => {
    // `setStyle` takes the RGB of an rgba() string; the layer's alpha is not
    // applied — a transparent Line2NodeMaterial takes the viewport-copy path.
    material.color.setStyle(color);
    // Lowercase `linewidth` is the property `materialLineWidth` reads; the
    // camelCase spelling is a silently ignored field.
    material.linewidth = lineWidth;
    invalidate();
  }, [material, color, lineWidth, invalidate]);

  // Sized for the segment count, written in place: a new, larger buffer under a
  // geometry the backend already bound overflows and drops the WHOLE frame
  // (see `segmentGeometry.ts`).
  const geometry = useSegmentGeometry(packed.segmentCount, false);
  const line = useMemo(() => {
    const l = new Line2(geometry as never, material as never);
    // The matrix IS the layout (see the module docblock) — never let three
    // recompose it from position/scale.
    l.matrixAutoUpdate = false;
    // A handful of lines, each as wide as the window: culling buys nothing and a
    // stale bounding sphere after an in-place upload would hide a visible trace.
    l.frustumCulled = false;
    l.visible = false;
    return l;
  }, [geometry, material]);

  // Geometry disposal is `useSegmentGeometry`'s; the material lives as long as
  // the component (disposing it with a replaced geometry would kill the line).
  useEffect(() => () => material.dispose(), [material]);

  /**
   * Upload in a LAYOUT effect, before the frame that draws it: the WGSL vertex
   * layout is derived from the geometry's attributes, and a Line2 drawn before
   * `instanceStart`/`instanceEnd` exist compiles against their absence and draws
   * nothing, silently (`TracksLayer.tsx` records the same trap).
   */
  useLayoutEffect(() => {
    if (packed.segmentCount === 0) {
      line.visible = false;
      invalidate();
      return;
    }
    writeSegments(geometry, packed.pairs, packed.segmentCount);
    invalidate();
  }, [packed, geometry, line, material, invalidate]);

  // --- render plane: band + clim → object matrix ---
  // `enabled` flips when the channel empties or refills, which is what re-shows
  // a line the layout effect above hid.
  useBandValueMatrix(line, bandKey(layerId, channel), packed.segmentCount > 0);

  return <primitive object={line} renderOrder={2} />;
};
