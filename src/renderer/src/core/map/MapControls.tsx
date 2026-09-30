import { Button } from "@/core/ui/button";
import { ButtonGroup } from "@/core/ui/button-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { cn } from "@/core/util/utils";
import { Check, Maximize, Minus, Navigation2, Plus, Settings2 } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { useMap } from "react-map-gl/maplibre";
import { MAP_STYLES, MapStyleId, setMapStyle, useMapStyleId } from "./styles";

type Bounds = [[number, number], [number, number]];

const HUD_BUTTON = "h-7 w-8 bg-black p-0";

/** A row in the settings popover (same shape as the scene's). */
export const MapSettingRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center justify-between gap-4 py-1">
    <span className="text-xs text-muted-foreground">{label}</span>
    {children}
  </div>
);

/**
 * The map's controls, docked bottom-right like the scene viewer's: zoom,
 * fit-to-places, the 2D/3D tilt toggle, a north reset while rotated, and the
 * gear with the base-map style (shared by every map) plus the map's own
 * `settings`. Rendered inside the `<Map>`.
 */
export const MapControls = ({ fit, settings }: { fit?: Bounds | null; settings?: ReactNode }) => {
  const { current: map } = useMap();
  const styleId = useMapStyleId();
  const [pitch, setPitch] = useState(0);
  const [bearing, setBearing] = useState(0);

  useEffect(() => {
    if (!map) return;
    // Whole degrees: equal state bails out, so panning does not re-render the HUD.
    const sync = () => {
      setPitch(Math.round(map.getPitch()));
      setBearing(Math.round(map.getBearing()));
    };
    sync();
    map.on("move", sync);
    return () => {
      map.off("move", sync);
    };
  }, [map]);

  if (!map) return null;
  const tilted = pitch > 1;
  const rotated = Math.abs(bearing) > 0.5;

  return (
    <div className="pointer-events-auto absolute bottom-2 right-2 z-10 flex items-center gap-2 rounded-lg border border-black/10 bg-black/40 p-1 backdrop-blur-md">
      <ButtonGroup>
        <Button variant="outline" size="xs" className={HUD_BUTTON} onClick={() => map.zoomOut()} title="Zoom out">
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="xs" className={HUD_BUTTON} onClick={() => map.zoomIn()} title="Zoom in">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </ButtonGroup>

      {fit && (
        <Button
          variant="outline"
          size="xs"
          className={HUD_BUTTON}
          onClick={() => map.fitBounds(fit, { padding: 48, maxZoom: 15 })}
          title="Show all places"
        >
          <Maximize className="h-3.5 w-3.5" />
        </Button>
      )}

      <Button
        variant="outline"
        size="xs"
        className="h-7 w-11 bg-black tabular-nums"
        onClick={() => map.easeTo({ pitch: tilted ? 0 : 55 })}
        title={tilted ? "Look straight down" : "Tilt the map (3D buildings on Streets)"}
      >
        <span className="text-xs font-bold">{tilted ? "3D" : "2D"}</span>
      </Button>

      {rotated && (
        <Button
          variant="outline"
          size="xs"
          className={HUD_BUTTON}
          onClick={() => map.easeTo({ bearing: 0 })}
          title="Point north"
        >
          <Navigation2 className="h-3.5 w-3.5" style={{ transform: `rotate(${-bearing}deg)` }} />
        </Button>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="xs" className={HUD_BUTTON} title="Map settings">
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-60 p-2">
          <div className="px-1 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Base map</div>
          <div className="flex flex-col">
            {(Object.keys(MAP_STYLES) as MapStyleId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setMapStyle(id)}
                className={cn(
                  "flex items-start gap-2 rounded px-1.5 py-1 text-left hover:bg-accent",
                  id === styleId && "bg-accent",
                )}
              >
                <Check className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", id === styleId ? "opacity-100" : "opacity-0")} />
                <span className="flex flex-col">
                  <span className="text-sm">{MAP_STYLES[id].label}</span>
                  <span className="text-[10px] leading-3 text-muted-foreground">{MAP_STYLES[id].description}</span>
                </span>
              </button>
            ))}
          </div>
          {settings && <div className="mt-2 border-t px-1 pt-1">{settings}</div>}
        </PopoverContent>
      </Popover>
    </div>
  );
};
