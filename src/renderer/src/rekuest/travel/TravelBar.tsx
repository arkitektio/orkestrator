import { format, formatDistanceStrict, isSameDay } from "date-fns";
import { Pause, Play, Radio, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/ui/select";
import { Slider } from "@/core/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { cn } from "@/core/util/utils";
import type { TravelRevision } from "./travelSource";
import type { BlokTravel, TravelMode } from "./useBlokTravel";

const MINUTE = 60_000;

/** How far back the slider reaches; it reaches further by itself once the moment lies before it. */
const WINDOWS = [
  { ms: 15 * MINUTE, label: "15 min" },
  { ms: 60 * MINUTE, label: "1 h" },
  { ms: 6 * 60 * MINUTE, label: "6 h" },
  { ms: 24 * 60 * MINUTE, label: "24 h" },
] as const;

const RATES = [1, 4, 16] as const;

const LOCAL_INPUT = "yyyy-MM-dd'T'HH:mm:ss";

/** The wall clock, once a second: the slider's right end is the present. */
const useWallClock = (): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
};

const formatMoment = (at: number, now: number): string =>
  format(at, isSameDay(at, now) ? "HH:mm:ss" : "d MMM HH:mm:ss");

/** The readout, and behind it the way to a moment the slider does not reach. */
const Moment = ({ at, now, loading, onJump }: { at: number; now: number; loading: boolean; onJump: (at: number) => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Jump to a time"
          className={cn(
            "flex shrink-0 items-baseline gap-1.5 rounded-md px-1.5 py-0.5 text-xs tabular-nums hover:bg-muted",
            loading && "animate-pulse",
          )}
        >
          <span className="font-medium">{formatMoment(at, now)}</span>
          <span className="text-muted-foreground">{formatDistanceStrict(at, now, { addSuffix: true })}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto" align="end" side="top">
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("moment");
            const picked = typeof value === "string" ? new Date(value).getTime() : Number.NaN;
            if (Number.isFinite(picked)) onJump(picked);
            setOpen(false);
          }}
        >
          <Input
            name="moment"
            type="datetime-local"
            step={1}
            autoFocus
            defaultValue={format(at, LOCAL_INPUT)}
            max={format(now, LOCAL_INPUT)}
            className="h-7 w-auto"
          />
          <Button type="submit" size="sm">
            Go
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
};

/** The revision the stepped agent stands on, and the way to any other one of its session. */
const RevisionField = ({
  standing,
  onCheckout,
}: {
  standing: TravelRevision | null;
  onCheckout: (revision: number) => void;
}) => {
  const revision = standing?.revision ?? null;
  return (
    <form
      // Keyed, so a step shows in the field without the field being controlled while it is typed in.
      key={revision ?? "none"}
      className="flex shrink-0 items-center gap-1.5 text-xs"
      title={standing?.sessionId ? `Session ${standing.sessionId}` : undefined}
      onSubmit={(event) => {
        event.preventDefault();
        const typed = new FormData(event.currentTarget).get("revision");
        // An empty field is not revision 0.
        if (typeof typed !== "string" || typed.trim() === "") return;
        const picked = Number(typed);
        if (Number.isInteger(picked) && picked >= 0) onCheckout(picked);
      }}
    >
      <label htmlFor="travel-revision" className="text-muted-foreground">
        Revision
      </label>
      <Input
        id="travel-revision"
        name="revision"
        type="number"
        min={0}
        step={1}
        defaultValue={revision ?? ""}
        placeholder="latest"
        className="h-7 w-20 tabular-nums"
      />
    </form>
  );
};

/** What the revision shown changed: stepping an agent also passes states this blok does not show. */
const RevisionChanges = ({ standing }: { standing: TravelRevision }) => {
  if (standing.revision === null) return null;
  const lines = standing.changes.map((change) => `${change.interface} ${change.op} ${change.path}`);
  return (
    <span className="max-w-56 min-w-0 shrink truncate font-mono text-xs text-muted-foreground" title={lines.join("\n")}>
      {lines.length === 0 ? "Start of the session" : lines[0]}
      {lines.length > 1 && ` +${lines.length - 1}`}
    </span>
  );
};

/**
 * The controls of travelling back: step to the change before or after, play
 * on from the moment, drag through the last while, jump to a time, and go
 * back to live. It is also what says that the past is shown.
 *
 * `names` puts a name to the agents that have nothing recorded at the moment.
 *
 * `revisions` adds the second way through the past: one revision of one of
 * the `names` agents at a time, or straight to a revision by its number.
 */
export const TravelBar = ({
  travel,
  names,
  revisions = false,
  className,
}: {
  travel: BlokTravel;
  names?: ReadonlyMap<string, string>;
  revisions?: boolean;
  className?: string;
}) => {
  const now = useWallClock();
  const [windowMs, setWindowMs] = useState<number>(WINDOWS[1].ms);
  const { clock, travelling } = travel;

  const at = travelling ? Math.min(clock.at, now) : now;
  const start = Math.min(now - windowMs, at);
  const missing = travelling ? clock.missing.map((id) => names?.get(id) ?? id) : [];

  const agents = revisions && names ? [...names] : [];
  const byRevision = agents.length > 0 && travel.mode === "revisions";
  const agentId = travel.revisionAgent !== null && names?.has(travel.revisionAgent) ? travel.revisionAgent : agents[0]?.[0];
  // Only while the past is shown: the source keeps its last revision when the page goes live.
  const standing = byRevision && travelling ? clock.revision : null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md border bg-background/80 px-1.5 py-1 shadow-md backdrop-blur-sm",
        travelling && "border-amber-500/50",
        className,
      )}
      // The bar may lie over a 3D scene: a press on it is never a press on the scene.
      onPointerDown={(event) => event.stopPropagation()}
    >
      {agents.length > 0 && (
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          className="shrink-0"
          value={byRevision ? "revisions" : "time"}
          onValueChange={(value) => value && travel.setMode(value as TravelMode, agentId)}
        >
          <ToggleGroupItem value="time" title="Go through the past along the clock">
            Time
          </ToggleGroupItem>
          <ToggleGroupItem value="revisions" title="Go through the past one revision of an agent at a time">
            Revisions
          </ToggleGroupItem>
        </ToggleGroup>
      )}

      {byRevision ? (
        <>
          <Button
            variant="ghost"
            size="icon"
            title="To the revision before"
            disabled={travelling && !standing?.hasPrev}
            onClick={() => travel.step(-1)}
          >
            <SkipBack />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="To the next revision"
            disabled={!travelling || !standing?.hasNext}
            onClick={() => travel.step(1)}
          >
            <SkipForward />
          </Button>
          {agents.length > 1 && (
            <Select value={agentId} onValueChange={(value) => travel.setMode("revisions", value)}>
              <SelectTrigger size="sm" className="max-w-40 shrink-0" title="The agent whose revisions are stepped through">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {agents.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <RevisionField standing={standing} onCheckout={travel.checkoutRevision} />
          {/* Over the whole session, once it is known how far it reaches. */}
          {standing && standing.revision !== null && standing.last !== null && standing.last > 0 ? (
            <Slider
              className="min-w-24 flex-1"
              value={[Math.min(standing.revision, standing.last)]}
              min={0}
              max={standing.last}
              step={1}
              onValueChange={(value) => travel.scrubRevision(value[0])}
              onValueCommit={(value) => travel.checkoutRevision(value[0])}
            />
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          {standing && <RevisionChanges standing={standing} />}
        </>
      ) : (
        <>
          <Button
            variant="ghost"
            size="icon"
            title="To before the previous change"
            disabled={travelling && clock.prevChangeAt === null}
            onClick={() => travel.step(-1)}
          >
            <SkipBack />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={clock.playing ? "Pause" : "Play on from here"}
            disabled={!travelling}
            onClick={() => (clock.playing ? travel.pause() : travel.play())}
          >
            {clock.playing ? <Pause /> : <Play />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-8 px-0 tabular-nums"
            title="Playback speed"
            onClick={() => travel.setRate(RATES[(RATES.indexOf(clock.rate as (typeof RATES)[number]) + 1) % RATES.length])}
          >
            {clock.rate}×
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="To the next change"
            disabled={!travelling || clock.nextChangeAt === null}
            onClick={() => travel.step(1)}
          >
            <SkipForward />
          </Button>

          <Slider
            className="min-w-24 flex-1"
            value={[at]}
            min={start}
            max={now}
            step={1000}
            onValueChange={(value) => travel.scrub(value[0])}
            onValueCommit={(value) => travel.commit(value[0])}
          />
        </>
      )}

      {missing.length > 0 && (
        <span
          className="max-w-40 shrink truncate text-xs text-amber-500"
          title={`Nothing was recorded at this time for ${missing.join(", ")}`}
        >
          Nothing recorded for {missing.join(", ")}
        </span>
      )}

      {travelling && <Moment at={at} now={now} loading={clock.phase === "loading"} onJump={travel.commit} />}

      {!byRevision && (
        <Select value={String(windowMs)} onValueChange={(value) => setWindowMs(Number(value))}>
          <SelectTrigger size="sm" className="shrink-0" title="How far back the slider reaches">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WINDOWS.map((option) => (
              <SelectItem key={option.ms} value={String(option.ms)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {travelling ? (
        <>
          <span className="shrink-0 rounded-md border border-amber-500/60 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500">
            PAST
          </span>
          <Button variant="outline" size="sm" className="shrink-0" onClick={travel.goLive} title="Back to the present">
            <Radio />
            Go live
          </Button>
        </>
      ) : (
        <span className="flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-500/60 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-500">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          LIVE
        </span>
      )}
    </div>
  );
};
