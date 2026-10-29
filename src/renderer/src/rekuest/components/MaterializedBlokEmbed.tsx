import * as React from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import { RekuestMaterializedBlok } from "@/core/linkers";
import { DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import type { Structure } from "@/core/types";
import { cn } from "@/core/util/utils";
import {
  ArgPortFragment,
  ComponentContext,
  MaterializedBlokFragment,
  TaskBlokStatus,
  useMaterializedBlokQuery,
} from "../api/graphql";
import { blokArgsSearch, missingBlokArgs, type BlokArgs } from "./blokArgs";
import { blokArgsFromStructures } from "./blokArgsFromStructures";
import MaterializedBlokRenderer from "./MaterializedBlokRenderer";
import { RekuestBlokPreview } from "./preview/RekuestBlokPreview";
import { PortValue } from "./task/PortValue";
import { idleTaskRecord, withTaskStatus, type BlokTaskRecord } from "@arkitektio/bsx/renderer/runtime/index";
import { BlokServiceChips, BlokServicesGuard, blokServicesOf } from "./BlokServices";

/** Where an ask through a blok stands, and its answer once there is one. */
export type BlokAsk = {
  status: TaskBlokStatus;
  values?: Record<string, unknown> | null;
  /** The user (sub) who answered or dismissed it. */
  decidedBy?: string | null;
  /** Why it waits but takes no answer any more (its task is being stopped): shown in place of the answer. */
  closed?: string | null;
};

/**
 * Whether `ref`'s element is on screen (with a margin), both ways: unlike
 * `useNearViewport` it turns false again once the element is scrolled away.
 */
const useOnScreen = (ref: React.RefObject<Element | null>) => {
  const [onScreen, setOnScreen] = React.useState(() => typeof IntersectionObserver === "undefined");
  React.useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => setOnScreen(entries.some((entry) => entry.isIntersecting)), {
      rootMargin: "200px",
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return onScreen;
};

/** What a person answered through the blok, each value as itself (an image as the image). */
/** An ask through a blok as the `task` record its tree reads: asking while it waits, then settled with the answer. */
const askRecord = (status: TaskBlokStatus, values: unknown): BlokTaskRecord => {
  const answer = values && typeof values === "object" && !Array.isArray(values) ? (values as Record<string, unknown>) : null;
  if (status === TaskBlokStatus.Waiting) {
    return { ...withTaskStatus(idleTaskRecord(), "asking"), ask: { question: "", form: {} } };
  }
  // Shown: an inform blok, beside a task that goes on.
  if (status === TaskBlokStatus.Shown) return withTaskStatus(idleTaskRecord(), "running");
  const settled = status === TaskBlokStatus.Dismissed || status === TaskBlokStatus.Gone ? "cancelled" : "done";
  return { ...withTaskStatus(idleTaskRecord(), settled), answer };
};

const AnswerLine = ({ ask, returns }: { ask: BlokAsk; returns: readonly ArgPortFragment[] }) => {
  const by = ask.decidedBy ? (
    <StructureDisplay identifier="@lok/user" id={ask.decidedBy} variant="inline" fallback="someone" />
  ) : (
    "someone"
  );
  if (ask.status === TaskBlokStatus.Dismissed) return <span>Dismissed by {by}</span>;
  if (ask.status === TaskBlokStatus.Gone) return <span>Nobody answered before the task ended</span>;
  const values = ask.values ?? {};
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <span>Answered by {by}:</span>
      {Object.entries(values).map(([key, value]) => (
        <span key={key} className="flex min-w-0 items-center gap-1">
          {Object.keys(values).length > 1 && <span className="text-muted-foreground/70">{key}</span>}
          <PortValue value={value} port={returns.find((port) => port.key === key)} />
        </span>
      ))}
    </span>
  );
};

/**
 * A materialization shown in the flow of another surface (a chat message, a
 * held task's card): its name and a link to its page over the blok itself,
 * live while on screen and its kept preview otherwise.
 *
 * It opens on the args its task gave it, else on the objects shown with it
 * (`alongside`, matched by identifier). With an `ask`, its tree reads it as
 * `task` (`task.ask` while it waits, `task.answer` once answered); while the
 * ask waits `task.answer(...)` goes to `onReturn`, and once settled the blok is
 * frozen with the answer under it. `compact`: a settled ask shows only its
 * answer line, the frozen blok behind "Show".
 */
export const MaterializedBlokEmbed = ({
  materialized,
  alongside,
  ask,
  onReturn,
  compact = false,
  className,
}: {
  materialized: MaterializedBlokFragment;
  alongside?: readonly Structure[];
  ask?: BlokAsk;
  onReturn?: (values: Record<string, unknown>) => unknown;
  compact?: boolean;
  className?: string;
}) => {
  const { blok } = materialized;
  const given = materialized.args as BlokArgs | null | undefined;
  // Kept here, not in the renderer: scrolled away and back, the blok opens on what it was showing.
  const [args, setArgs] = React.useState<BlokArgs>(() =>
    given && Object.keys(given).length > 0 ? given : blokArgsFromStructures(blok.args, alongside ?? []),
  );
  const missing = missingBlokArgs(blok.args, args);
  const name = materialized.name || blok.name;
  const page = RekuestMaterializedBlok.linkBuilder(materialized.id) + blokArgsSearch(args);
  // A chat holds many: only the bloks on screen run their tasks and subscriptions, the rest show their preview.
  const box = React.useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const agents = React.useMemo(
    () => new Map(materialized.agentMappings.map((mapping) => [mapping.key, mapping.agent.id])),
    [materialized.agentMappings],
  );
  // A scene fills its box, so it gets one; a panel takes the height it needs.
  const scene = blok.context === ComponentContext.Scene;
  const closed = ask?.closed ?? null;
  const waiting = ask?.status === TaskBlokStatus.Waiting && closed == null;
  const frozen = ask !== undefined && !waiting;
  const [shown, setShown] = React.useState(false);
  const folded = compact && frozen && !shown;
  const task = React.useMemo<BlokTaskRecord | undefined>(
    () => (ask ? askRecord(ask.status, ask.values) : undefined),
    [ask?.status, ask?.values], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const services = React.useMemo(() => blokServicesOf(blok), [blok]);

  return (
    <div ref={box} className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <LayoutDashboard className="size-3.5 shrink-0" />
        <span className="truncate">{name}</span>
        <BlokServiceChips services={services} />
        {compact && frozen && (
          <button
            type="button"
            className="ml-auto shrink-0 underline-offset-2 hover:underline"
            onClick={() => setShown(!shown)}
          >
            {shown ? "Hide" : "Show"}
          </button>
        )}
        <Link
          className={cn("shrink-0 underline-offset-2 hover:underline", !(compact && frozen) && "ml-auto")}
          to={page}
        >
          Open
        </Link>
      </div>
      {folded ? null : missing.length > 0 ? (
        <div className="px-1 text-sm text-muted-foreground">
          Opens for {missing.map((port) => port.label || port.key).join(", ")}:{" "}
          <Link className="underline" to={page}>
            choose one
          </Link>
          .
        </div>
      ) : !onScreen ? (
        <RekuestBlokPreview blok={blok} agents={agents} className="rounded-md" />
      ) : (
        <div
          className={cn(
            "overflow-auto rounded-md",
            scene ? "aspect-[8/5] w-full" : "max-h-[60vh]",
            // Settled, the blok shows what was chosen but takes no more input.
            frozen && "pointer-events-none select-none opacity-80",
          )}
          aria-disabled={frozen || undefined}
        >
          {/* Its queries read these services: from the outside, so none runs without its client. */}
          <BlokServicesGuard services={services}>
            <MaterializedBlokRenderer
              materializedBlok={materialized}
              surfaceId={`embed-${materialized.id}`}
              args={args}
              onArgsChange={setArgs}
              task={task}
              onAnswer={waiting ? onReturn : undefined}
              chrome={scene ? "none" : "minimal"}
              // Fill, never intrinsic: a CardHeader is a size container and gives a shrink-to-fit box no width.
              sizing="fill"
            />
          </BlokServicesGuard>
        </div>
      )}
      {closed != null ? (
        closed && <div className="px-1 text-[11px] text-muted-foreground">{closed}</div>
      ) : frozen && ask && (
        <div className="px-1 text-[11px] text-muted-foreground">
          <AnswerLine ask={ask} returns={blok.returns as unknown as readonly ArgPortFragment[]} />
        </div>
      )}
    </div>
  );
};

/** {@link MaterializedBlokEmbed}, for a materialization known by its id. */
export const MaterializedBlokEmbedById = ({
  id,
  ...props
}: Omit<React.ComponentProps<typeof MaterializedBlokEmbed>, "materialized"> & { id: string }) => {
  const { data } = useMaterializedBlokQuery({ variables: { id } });
  const materialized = data?.materializedBlok;
  if (!materialized) {
    return <DisplayLinePlaceholder identifier="@rekuest/materialized_blok" id={id} icon={LayoutDashboard} />;
  }
  return <MaterializedBlokEmbed materialized={materialized} {...props} />;
};
