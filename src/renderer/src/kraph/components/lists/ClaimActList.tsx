import { KraphInstance, KraphLink, KraphMetric, KraphStructure } from "@/core/linkers";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Badge } from "@/core/ui/badge";
import Timestamp from "@/core/ui/timestamp";
import type { ClaimActFragment } from "@/kraph/api/graphql";
import { describeAct, type ActPart } from "@/kraph/lib/claimActs";

const LINKERS = {
  instance: KraphInstance,
  link: KraphLink,
  metric: KraphMetric,
  structure: KraphStructure,
} as const;

const Part = ({ part }: { part: ActPart }) => {
  const chip = (
    <Badge variant="secondary" className="max-w-64 truncate font-normal">
      {part.text}
    </Badge>
  );
  if (!part.to) return chip;
  const Linker = LINKERS[part.to.kind];
  return <Linker.DetailLink object={{ id: part.to.id }}>{chip}</Linker.DetailLink>;
};

/** One act of the log: who said it, what they said, and when. */
export const ClaimActRow = ({ act }: { act: ClaimActFragment }) => (
  <div className="flex min-w-0 flex-row items-center gap-2 border-b py-2 text-sm last:border-b-0">
    <span className="shrink-0">
      <StructureDisplay
        identifier="@lok/user"
        id={act.subject}
        variant="inline"
        fallback={act.subject}
      />
    </span>
    <div className="flex min-w-0 flex-1 flex-row flex-wrap items-center gap-1">
      {describeAct(act).map((part) => (
        <Part key={part.key} part={part} />
      ))}
    </div>
    <span className="shrink-0 text-xs text-muted-foreground">
      <Timestamp date={act.assertedAt} relative />
    </span>
  </div>
);

export const ClaimActList = ({ acts }: { acts: readonly ClaimActFragment[] }) => (
  <div className="flex flex-col">
    {acts.map((act) => (
      <ClaimActRow key={act.id} act={act} />
    ))}
  </div>
);
