import { Button } from "@/components/ui/button";
import { isTypingTarget } from "@/lib/input/keyboardTarget";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { DetailNeuronModelFragment } from "../../api/graphql";
import { NeuronVisualizer } from "../NeuronRenderer";
import { NeuronModelTree } from "../tree/NeuronModelTree";

export type NeuronDisplayMode = "3D" | "Tree";

const DISPLAY_MODE_KEY = "elektro.neuronmodel.displayMode";

/**
 * The remembered display mode. Unlike the scene, a neuron model nominates no
 * preferred view, so the last choice stands in for it. Wrapped because
 * storage can be absent or throw (private windows, cleared site data).
 */
const readDisplayMode = (): NeuronDisplayMode => {
  try {
    const stored = window.localStorage.getItem(DISPLAY_MODE_KEY);
    return stored === "Tree" ? "Tree" : "3D";
  } catch {
    return "3D";
  }
};

const writeDisplayMode = (mode: NeuronDisplayMode) => {
  try {
    window.localStorage.setItem(DISPLAY_MODE_KEY, mode);
  } catch {
    // A preference, not state: losing it costs one click.
  }
};

const Keycap = ({ children }: { children: string }) => (
  <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[0.6875rem] leading-none text-white">
    {children}
  </kbd>
);

type Shortcut = { keys: string[]; action: string };

const SHORTCUTS: Record<string, Shortcut[]> = {
  "3D view": [
    { keys: ["Left drag"], action: "Pan" },
    { keys: ["Right drag"], action: "Orbit" },
    { keys: ["Shift", "Left drag"], action: "Orbit" },
    { keys: ["Scroll"], action: "Zoom" },
    { keys: ["Middle drag"], action: "Zoom" },
    { keys: ["Click section"], action: "Open its parameter panel" },
    { keys: ["Esc"], action: "Close the section panels" },
  ],
  "Tree view": [
    { keys: ["Drag"], action: "Pan" },
    { keys: ["Scroll"], action: "Zoom" },
  ],
  Both: [
    { keys: ["F"], action: "Frame the whole model" },
    { keys: ["?"], action: "Show these shortcuts" },
  ],
};

/**
 * The viewport's shortcuts, on `?` — the scene's `SceneShortcuts` idiom (same
 * card, same keycaps) for the neuron viewport's own bindings.
 */
const NeuronShortcuts = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target as { tagName?: string; isContentEditable?: boolean } | null)) {
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setOpen((wasOpen) => !wasOpen);
        return;
      }
      // Only claims Escape while open: the renderer's own Escape closes the
      // section panels and must not be swallowed here.
      if (e.key === "Escape") {
        setOpen((wasOpen) => {
          if (wasOpen) e.preventDefault();
          return false;
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) return null;

  return (
    // z-50 clears the page's title overlay at z-40; the backdrop is the
    // dismiss target, so a click anywhere outside the card closes it.
    <div
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={() => setOpen(false)}
    >
      <div
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-lg border border-black/10 bg-black/60 p-4 backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-white">Keyboard shortcuts</h2>
          <Button
            variant="outline"
            size="xs"
            className="h-7 w-8 bg-black p-0"
            onClick={() => setOpen(false)}
            title="Close (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          {Object.entries(SHORTCUTS).map(([group, entries]) => (
            <div key={group} className="flex flex-col gap-1">
              <div className="text-[0.625rem] font-medium uppercase tracking-widest text-white/50">
                {group}
              </div>
              {entries.map((entry) => (
                <div
                  key={entry.action + entry.keys.join("+")}
                  className="flex items-center justify-between gap-4 text-xs text-white/80"
                >
                  <span>{entry.action}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {entry.keys.map((key, i) => (
                      <span key={key} className="flex items-center gap-1">
                        {i > 0 && <span className="text-white/40">+</span>}
                        <Keycap>{key}</Keycap>
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * The neuron model's content area, laid out like the scene viewport: one
 * black frame, the picture filling it, and a bottom-right strip holding the
 * display-mode switch — "3D" / "Tree" here where the scene has "2D" / "3D".
 * The two views are alternatives for the same model, so they share the frame
 * rather than being separate pages, and the switch is where the scene's is.
 *
 * Renderer HUD (importance, network, section panels, zoom) is each view's
 * own; this component owns only what applies to both.
 */
export const NeuronViewport = ({ model }: { model: DetailNeuronModelFragment }) => {
  const [displayMode, setDisplayMode] = useState<NeuronDisplayMode>(readDisplayMode);
  const nextDisplayMode: NeuronDisplayMode = displayMode === "3D" ? "Tree" : "3D";

  const switchMode = (mode: NeuronDisplayMode) => {
    setDisplayMode(mode);
    writeDisplayMode(mode);
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-black">
      {displayMode === "3D" ? (
        <NeuronVisualizer model={model} />
      ) : (
        <NeuronModelTree model={model} embedded />
      )}

      <div className="pointer-events-auto absolute bottom-2 right-2 z-30 flex items-center gap-2 rounded-lg border border-black/10 bg-black/40 p-1 backdrop-blur-md">
        <Button
          variant="outline"
          size="xs"
          className="h-7 w-12 bg-black tabular-nums"
          onClick={() => switchMode(nextDisplayMode)}
          title={`Switch to ${nextDisplayMode} view`}
        >
          <span className="text-xs font-bold">{displayMode}</span>
        </Button>
      </div>

      <NeuronShortcuts />
    </div>
  );
};
