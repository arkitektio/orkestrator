import { Button } from "@/components/ui/button";
import { Html } from "@react-three/drei";
import { useEffect, useState } from "react";
import type * as THREE from "three";
import { locationOf, pointAlong, type MorphologySection } from "../model/buildMorphology";
import type { SectionHit } from "./SectionTubes";

/**
 * The editor's in-canvas affordances over the shared tubes: the percentage
 * readout under the cursor (where a Shift+click would attach a child) and the
 * "+" at the selected section's end.
 *
 * The cursor state lives HERE, fed through `subscribe`, so a pointer move
 * re-renders this small component — not the thousand-line editor around it.
 */
export type HoverFeed = { current: ((hit: SectionHit | null) => void) | null };

export const EditorHandles = ({
  hoverFeed,
  selected,
  onAddChild,
}: {
  hoverFeed: HoverFeed;
  selected: MorphologySection | null;
  onAddChild: (parentId: string) => void;
}) => {
  const [hover, setHover] = useState<{ point: THREE.Vector3; location: number } | null>(null);

  useEffect(() => {
    hoverFeed.current = (hit) => {
      if (!hit) {
        setHover(null);
        return;
      }
      const location = locationOf(hit.section, hit.segment, hit.point);
      setHover({ point: pointAlong(hit.section, location).point, location });
    };
    return () => {
      hoverFeed.current = null;
    };
  }, [hoverFeed]);

  return (
    <>
      {hover && (
        <Html position={hover.point}>
          <div className="pointer-events-none rounded bg-black/80 px-1 text-xs text-white">
            {(hover.location * 100).toFixed(0)}%
          </div>
        </Html>
      )}
      {selected && (
        <Html position={pointAlong(selected, 1).point}>
          <div className="pointer-events-none flex flex-col items-center">
            <div className="pointer-events-auto">
              <Button
                size="sm"
                variant="secondary"
                className="h-6 w-6 rounded-full p-0"
                title="Add a child at the end"
                onClick={() => onAddChild(selected.id)}
              >
                +
              </Button>
            </div>
          </div>
        </Html>
      )}
    </>
  );
};
