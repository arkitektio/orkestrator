import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import type { Structure } from "@/core/types";
import {
  MeasuresComposer,
  readMeasures,
  useSayMeasures,
  type SaidMeasures,
} from "@/kraph/components/knowledge/MeasuresComposer";
import { Ruler } from "lucide-react";
import { useState } from "react";

/**
 * "This datum measures the <word> of a <thing>", from the menu. `target` is the
 * thing when it is already decided: an entity dropped on the datum, or the datum
 * dropped on it.
 */
export const MeasureTermDialog = (props: { structures: Structure[]; target?: Structure }) => {
  const { say } = useSayMeasures(props.structures);
  const [said, setSaid] = useState<SaidMeasures | null>(null);

  const { submit, submitting } = useDialogSubmit(
    async (sentence: SaidMeasures) => {
      setSaid(sentence);
      await say(sentence);
      return true;
    },
    {
      errorTitle: "Couldn't say that",
      // The sentence is not on anything you can see from here yet.
      successMessage: said ? readMeasures(said) : undefined,
    },
  );

  const count = props.structures.length;
  const target = props.target;

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Ruler className="h-4 w-4" />
          Measures
        </h2>
        <p className="flex flex-row flex-wrap items-center gap-1 text-sm text-muted-foreground">
          What {count === 1 ? "this datum measures" : `these ${count} data measure`}
          {target ? (
            <>
              {" of "}
              <StructureDisplay
                identifier={target.identifier}
                id={target.id}
                variant="inline"
                fallback={target.label ?? "this entity"}
              />
            </>
          ) : null}
          .
        </p>
      </div>

      <MeasuresComposer
        target={
          target ? { id: target.id, label: target.label ?? "this entity" } : undefined
        }
        onSay={async (sentence) => (await submit(sentence)) === true}
        disabled={submitting}
        autoFocus
      />
    </div>
  );
};

export default MeasureTermDialog;
