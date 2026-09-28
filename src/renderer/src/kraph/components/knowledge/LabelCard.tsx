import { Badge } from "@/core/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/core/ui/collapsible";
import Timestamp from "@/core/ui/timestamp";
import type { KnowledgeInstanceFragment } from "@/kraph/api/graphql";
import { AssertionEvidence } from "@/kraph/components/AssertionEvidence";
import { TermBadge } from "@/kraph/components/TermBadge";
import type { Structure } from "@/core/types";
import { ChevronRight } from "lucide-react";
import { DrawnInList } from "./DrawnInList";
import { EvidenceForEntity } from "./EvidenceForEntity";
import { RecentInstancesPicker } from "./RecentInstancesPicker";
import { SameAsDropTarget } from "./SameAsDropTarget";
import { SameAsList } from "./SameAsList";

export type LabelCardProps = {
  instance: KnowledgeInstanceFragment;
  self: Structure;
  /** The signed-in user's id, to mark claims as "by you". */
  meId?: string;
  onChanged?: () => void;
};

const Heading = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
    {children}
  </div>
);

/**
 * What one label amounts to: who claimed it, where it is drawn, what else is
 * the same thing, and the ways to say "so is that one".
 */
export const LabelCard = ({ instance, self, meId, onChanged }: LabelCardProps) => {
  const mine = !!meId && instance.assertion.subject === meId;
  const term = instance.term.key;

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3" data-testid="label-card">
      <div className="flex flex-row flex-wrap items-center gap-2">
        <TermBadge term={instance.term} />
        <span className="text-xs text-muted-foreground">
          claimed <Timestamp date={instance.assertion.assertedAt} relative />
        </span>
        {mine ? <Badge variant="secondary">by you</Badge> : null}
        <AssertionEvidence assertionId={instance.assertion.id} />
      </div>

      <section className="flex flex-col gap-1.5">
        <Heading>Drawn in</Heading>
        <DrawnInList drawings={instance.drawnIn} />
      </section>

      <section className="flex flex-col gap-1.5">
        <Heading>Same as</Heading>
        <SameAsList instance={instance} self={self} />
        <SameAsDropTarget self={self} term={term} onDone={onChanged} />
        <RecentInstancesPicker term={term} onPick={() => onChanged?.()} />
      </section>

      <Collapsible>
        <CollapsibleTrigger className="group flex flex-row items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]:rotate-90" />
          Advanced: use as evidence for an existing entity
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <EvidenceForEntity
            identifier={self.identifier}
            object={{ id: self.id }}
            onDone={onChanged}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default LabelCard;
