import { smartRegistry } from "@/core/smart/registry";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { useTabActions } from "@/core/tabs/TabsProvider";
import { useTabPane } from "@/core/tabs/TabPaneContext";

import { fromCallStructure } from "./structureInput";

export type CallTopic = { identifier: string; object: number };

/** One topic, as a key: a new one is a new pill, so the dock animates the change. */
export const topicKey = (topic: CallTopic) => `${topic.identifier}:${topic.object}`;

/**
 * "Talking about": what the call turned to last, as a pill in the call's
 * dock. Clicking it puts that on screen to the right of the call, always:
 * the call stays where it is. Dropping an object on the call changes it
 * (`CallDropTarget`); what it was about before is in the About sidebar, and
 * counted here.
 */
export const TalkingAbout = ({ topic, earlier }: { topic: CallTopic; earlier: number }) => {
  const { openBeside, swapSplit } = useTabActions();
  const pane = useTabPane();

  const structure = fromCallStructure(topic);
  const name = smartRegistry.getDisplayName(structure.identifier);
  const path = smartRegistry.buildModelPath(structure.identifier, structure.id);

  const openToTheRight = () => {
    if (!path) return;
    // "Beside" is beside the view's own tab. A call that is itself the side
    // pane takes the view first, or its topic would open in its place.
    if (pane === "right") swapSplit();
    openBeside(`/${path}`, { label: name, evict: true });
  };

  return (
    <button
      type="button"
      // Something no installed module has a page for is named, not opened.
      disabled={!path}
      onClick={openToTheRight}
      title={path ? "Open to the right" : undefined}
      className="flex h-9 min-w-0 max-w-full items-center gap-2 rounded-full border border-border/60 bg-card px-3.5 text-left shadow-sm transition-colors enabled:hover:bg-muted/60"
      data-testid="call-talking-about"
    >
      <span className="relative flex size-2 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-primary" />
      </span>
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Talking about</span>
      <span className="min-w-0 truncate text-sm font-medium">
        <StructureDisplay {...structure} variant="inline" fallback={`${name} ${structure.id}`} />
      </span>
      {earlier > 0 && (
        <span
          className="shrink-0 rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground"
          title={`${earlier} earlier, in the About tab`}
        >
          +{earlier}
        </span>
      )}
    </button>
  );
};
