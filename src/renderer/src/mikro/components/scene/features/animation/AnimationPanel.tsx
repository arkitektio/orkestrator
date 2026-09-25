import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clapperboard,
  MapPin,
  Play,
  Repeat,
  Square,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Easing } from "@/mikro/api/graphql";
import { tourDurationMs } from "../../platform/camera/animation";
import { useAnimationStore } from "../../platform/stores/animationStore";
import { useModeStore } from "../../platform/stores/modeStore";
import { useAnimationEditor } from "./useAnimationEditor";

const EASING_LABELS: Record<Easing, string> = {
  [Easing.Linear]: "Linear",
  [Easing.EaseIn]: "Ease in",
  [Easing.EaseOut]: "Ease out",
  [Easing.EaseInOut]: "Ease in-out",
};

const formatSeconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/** One saved tour: play it, re-author it, or delete it. */
const TourRow = ({ id, name, waypointCount, durationMs }: {
  id: string;
  name: string;
  waypointCount: number;
  durationMs: number;
}) => {
  const playingId = useAnimationStore((s) => s.playingId);
  const play = useAnimationStore((s) => s.play);
  const stop = useAnimationStore((s) => s.stop);
  const loop = useAnimationStore((s) => s.loop);
  const loadDraft = useAnimationStore((s) => s.loadDraft);
  const animations = useAnimationStore((s) => s.animations);
  const { remove, saving } = useAnimationEditor();

  const playing = playingId === id;

  return (
    <div className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-1">
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={() => loadDraft(animations.find((a) => a.id === id) ?? null)}
        title="Edit this tour's stops"
      >
        <div className="truncate text-[11px] text-white/90">{name}</div>
        <div className="text-[9px] text-white/40">
          {waypointCount} stops · {formatSeconds(durationMs)}
        </div>
      </button>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-white/70"
        title={playing ? "Stop" : "Play"}
        onClick={() => (playing ? stop() : play(id, { loop }))}
      >
        {playing ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-white/50 hover:text-red-400"
        title="Delete tour"
        disabled={saving}
        onClick={() => remove(id)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

/** One stop of the draft: its pose is fixed, its timing is not. */
const DraftRow = ({ index }: { index: number }) => {
  const waypoint = useAnimationStore((s) => s.draft[index]);
  const isLast = useAnimationStore((s) => index === s.draft.length - 1);
  const update = useAnimationStore((s) => s.updateDraftWaypoint);
  const move = useAnimationStore((s) => s.moveDraftWaypoint);
  const removeWaypoint = useAnimationStore((s) => s.removeDraftWaypoint);

  if (!waypoint) return null;
  const isFirst = index === 0;

  return (
    <div className="rounded border border-white/10 bg-white/5 p-1.5">
      <div className="flex items-center gap-1">
        <MapPin className="h-3 w-3 shrink-0 text-white/40" />
        <Input
          value={waypoint.name}
          onChange={(e) => update(waypoint.key, { name: e.target.value })}
          className="h-6 flex-1 border-white/10 bg-black/30 text-[11px] text-white/90"
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-5 text-white/50"
          disabled={isFirst}
          title="Move earlier"
          onClick={() => move(waypoint.key, -1)}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-5 text-white/50"
          disabled={isLast}
          title="Move later"
          onClick={() => move(waypoint.key, 1)}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-5 text-white/50 hover:text-red-400"
          title="Remove stop"
          onClick={() => removeWaypoint(waypoint.key)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* The first stop is where the tour STARTS, so nothing travels to it —
          the server ignores its duration and easing, and so does the player. */}
      {isFirst ? (
        <div className="pl-4 pt-1 text-[9px] text-white/40">Starting pose</div>
      ) : (
        <div className="flex items-center gap-1 pl-4 pt-1">
          <Input
            type="number"
            min={0}
            step={100}
            value={waypoint.durationMs}
            onChange={(e) =>
              update(waypoint.key, { durationMs: Math.max(0, Number(e.target.value) || 0) })
            }
            className="h-6 w-16 border-white/10 bg-black/30 text-[10px] text-white/90"
            title="Travel time to this stop (ms)"
          />
          <select
            value={waypoint.easing}
            onChange={(e) => update(waypoint.key, { easing: e.target.value as Easing })}
            className="h-6 flex-1 rounded border border-white/10 bg-black/30 px-1 text-[10px] text-white/90"
            title="How the camera eases along that travel"
          >
            {Object.values(Easing).map((easing) => (
              <option key={easing} value={easing} className="bg-zinc-900">
                {EASING_LABELS[easing]}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

/**
 * Camera tours and the scene's viewer preferences.
 *
 * Authoring is capture-based: a stop records the CURRENT camera, so the way to
 * build a tour is to fly the scene and pin the poses you want. A stop captures
 * the view it was taken in (`captureCameraState` fills only that view's
 * orientation/scale pair), which is why the capture button names the mode.
 */
export const AnimationPanel = ({
  variant = "floating",
}: {
  /**
   * Where the panel is hosted. "floating" is the in-viewport card (fixed
   * width, own chrome); "sidebar" fills a page-rail tab, which hands the
   * panel a plain full-height flex box and expects it to own its scroll.
   */
  variant?: "floating" | "sidebar";
} = {}) => {
  const displayMode = useModeStore((s) => s.displayMode);
  const draft = useAnimationStore((s) => s.draft);
  const editingId = useAnimationStore((s) => s.editingId);
  const animations = useAnimationStore((s) => s.animations);
  const clearDraft = useAnimationStore((s) => s.clearDraft);
  const loop = useAnimationStore((s) => s.loop);
  const setLoop = useAnimationStore((s) => s.setLoop);

  const { captureWaypoint, saveDraft, saving } = useAnimationEditor();

  const [name, setName] = useState("");

  const draftDuration = tourDurationMs(
    draft.map((waypoint, index) => ({
      id: waypoint.key,
      order: index,
      name: waypoint.name,
      durationMs: waypoint.durationMs,
      easing: waypoint.easing,
      camera: waypoint.camera,
    })),
  );

  const onSave = async () => {
    const trimmed = name.trim() || `Tour ${animations.length + 1}`;
    await saveDraft(trimmed);
    setName("");
  };

  return (
    <div
      className={
        variant === "sidebar"
          ? "flex h-full min-h-0 flex-col gap-2 overflow-y-auto p-2"
          : "pointer-events-auto flex max-h-[60vh] w-60 flex-col gap-2 overflow-y-auto rounded-lg border border-black/10 bg-black/40 p-2 backdrop-blur-md"
      }
    >
      <div className="flex items-center gap-1 text-[10px] font-medium text-white/60">
        <Clapperboard className="h-3 w-3" />
        <span>Animations</span>
      </div>

      {animations.length > 0 && (
        <div className="flex flex-col gap-1">
          {animations.map((animation) => (
            <TourRow
              key={animation.id}
              id={animation.id}
              name={animation.name}
              waypointCount={animation.waypoints.length}
              durationMs={tourDurationMs(animation.waypoints)}
            />
          ))}
          <label className="flex items-center gap-1 pt-0.5 text-[9px] text-white/50">
            <input
              type="checkbox"
              checked={loop}
              onChange={(e) => setLoop(e.target.checked)}
            />
            <Repeat className="h-2.5 w-2.5" />
            Loop playback
          </label>
        </div>
      )}

      <div className="h-px bg-white/10" />

      <div className="flex items-center justify-between text-[10px] font-medium text-white/60">
        <span>{editingId ? "Editing tour" : "New tour"}</span>
        {draft.length > 0 && (
          <span className="rounded bg-white/10 px-1 font-mono text-white/90">
            {formatSeconds(draftDuration)}
          </span>
        )}
      </div>

      <Button
        size="sm"
        variant="outline"
        className="h-7 border-white/10 bg-white/5 text-[10px] text-white/80"
        onClick={captureWaypoint}
      >
        <MapPin className="mr-1 h-3 w-3" />
        Add stop from {displayMode} camera
      </Button>

      {draft.length === 0 ? (
        <p className="text-[10px] leading-4 text-white/40">
          Fly the scene, then pin each pose you want the tour to travel through.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {draft.map((waypoint, index) => (
            <DraftRow key={waypoint.key} index={index} />
          ))}
        </div>
      )}

      {draft.length > 0 && (
        <div className="flex flex-col gap-1">
          <Input
            value={name}
            placeholder="Tour name"
            onChange={(e) => setName(e.target.value)}
            className="h-7 border-white/10 bg-black/30 text-[11px] text-white/90"
          />
          <div className="flex gap-1">
            <Button
              size="sm"
              className="h-7 flex-1 text-[10px]"
              disabled={saving}
              onClick={onSave}
            >
              {saving ? "Saving…" : editingId ? "Save changes" : "Create tour"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[10px] text-white/60"
              onClick={clearDraft}
            >
              Discard
            </Button>
          </div>
        </div>
      )}

    </div>
  );
};
