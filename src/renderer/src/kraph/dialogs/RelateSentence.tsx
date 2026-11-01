import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { smartRegistry } from "@/core/smart/registry";
import type { Structure } from "@/core/types";
import { useKraph } from "@/kraph/api/funcs";
import { TermKind } from "@/kraph/api/graphql";
import { WordPicker, type PickedWord } from "@/kraph/components/knowledge/WordPicker";
import { relate, relatePairs, type RelateKind } from "@/kraph/lib/relate";
import { useState } from "react";

const describe = (structure: Structure) =>
  structure.label ?? `${smartRegistry.getDisplayName(structure.identifier)} ${structure.id}`;

/** One side of the sentence: the thing itself, or how many when it is several. */
const Side = ({ structures }: { structures: readonly Structure[] }) => {
  const first = structures[0];
  if (structures.length !== 1 || !first) {
    return <span className="font-medium">{structures.length} things</span>;
  }
  return (
    <span className="min-w-0 truncate font-medium">
      <StructureDisplay
        identifier={first.identifier}
        id={first.id}
        variant="inline"
        fallback={describe(first)}
      />
    </span>
  );
};

/**
 * "[AIS 1] [is part of] [neuron 4]": how two things relate, said as a sentence.
 * The word is the only choice. It names no graph, so relating does not depend on
 * any view drawing both ends; a view draws the claim once it declares the word.
 */
export const RelateSentenceDialog = (props: {
  kind: RelateKind;
  left: Structure[];
  right: Structure[];
}) => {
  const client = useKraph();
  const [tried, setTried] = useState<PickedWord | null>(null);
  const said = tried ? tried.label || tried.key : "";
  const pairs = relatePairs(props.left, props.right).length;

  const { submit, submitting } = useDialogSubmit(
    async (word: PickedWord) => {
      setTried(word);
      await relate(client, {
        kind: props.kind,
        left: props.left,
        right: props.right,
        term: word.key,
      });
    },
    {
      errorTitle: "Couldn't relate them",
      // The dialog closes on the page you were on, which shows nothing of it.
      successMessage: pairs === 1 ? `Related as ${said}` : `Related ${pairs} as ${said}`,
    },
  );

  return (
    <div className="flex flex-col gap-3">
      <h2 className="flex min-w-0 flex-wrap items-center gap-2 text-lg tracking-tight">
        <Side structures={props.left} />
        <span className="rounded-md border border-dashed px-2 text-sm text-muted-foreground">
          {said || "how?"}
        </span>
        <Side structures={props.right} />
      </h2>

      <WordPicker
        kind={props.kind === "entities" ? TermKind.Relation : TermKind.StructureRelation}
        onPick={submit}
        eager
        autoFocus
        busyKey={submitting ? tried?.key : null}
        busyLabel="Relating…"
        disabled={submitting}
        placeholder="is part of, is connected to, … or type a new one"
        ariaLabel="How they relate"
      />
    </div>
  );
};

export default RelateSentenceDialog;
