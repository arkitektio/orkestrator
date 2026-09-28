import { Button } from "@/core/ui/button";
import type { Identifier, Object, Structure } from "@/core/types";
import { useState } from "react";
import { LabelCard } from "./LabelCard";
import { LabelChip } from "./LabelChip";
import { LabelInput } from "./LabelInput";
import { SuggestedTerms } from "./SuggestedTerms";
import { useKnowledge } from "./useKnowledge";

export type LabelsBlockProps = {
  identifier: Identifier;
  object: Object;
  meId?: string;
};

/**
 * "This is …" — the labels on a datum, and the input that adds one. Chips
 * first, then one expanded card at a time: the row answers "what is this?" at
 * a glance, the card answers "and what follows from that?".
 */
export const LabelsBlock = ({ identifier, object, meId }: LabelsBlockProps) => {
  const knowledge = useKnowledge(identifier, object);
  const [expanded, setExpanded] = useState<string | null>(null);
  const self: Structure = { identifier, id: object.id };

  const claimedKeys = [
    ...knowledge.labels.map((label) => label.term.key),
    ...knowledge.pending.map((label) => label.key),
  ];
  const nothingYet = knowledge.labels.length === 0 && knowledge.pending.length === 0;
  const expandedInstance = knowledge.labels.find((label) => label.id === expanded) ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-semibold">This is</div>

      {knowledge.failed ? (
        <div className="flex flex-col gap-2 rounded-md border border-destructive/50 p-2 text-xs">
          <span>Could not read what is known: {knowledge.errorMessage}</span>
          <Button variant="outline" size="sm" onClick={() => knowledge.refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      {knowledge.labels.length > 0 || knowledge.pending.length > 0 ? (
        <div className="flex flex-row flex-wrap gap-1.5" data-testid="label-chips">
          {knowledge.labels.map((label) => (
            <LabelChip
              key={label.id}
              label={label.term.label || label.term.key}
              color={label.term.color}
              expanded={expanded === label.id}
              onClick={() => setExpanded(expanded === label.id ? null : label.id)}
            />
          ))}
          {knowledge.pending.map((label) => (
            <LabelChip
              key={`pending-${label.key}`}
              label={label.key}
              state={label.state}
              title={label.state === "failed" ? "Failed — click to retry" : "Claiming…"}
              onClick={
                label.state === "failed" ? () => knowledge.claim(label.key) : undefined
              }
            />
          ))}
        </div>
      ) : knowledge.loading ? (
        <div className="text-xs text-muted-foreground">Reading what is known…</div>
      ) : null}

      <LabelInput onClaim={knowledge.claim} excludeKeys={claimedKeys} />

      {nothingYet && !knowledge.loading && !knowledge.failed ? (
        <SuggestedTerms onClaim={knowledge.claim} excludeKeys={claimedKeys} />
      ) : null}

      {expandedInstance ? (
        <LabelCard
          instance={expandedInstance}
          self={self}
          meId={meId}
          onChanged={() => knowledge.refetch()}
        />
      ) : null}
    </div>
  );
};

export default LabelsBlock;
