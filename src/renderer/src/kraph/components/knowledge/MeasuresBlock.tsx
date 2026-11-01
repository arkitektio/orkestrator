import { toast } from "@/core/notify";
import type { Identifier, Object } from "@/core/types";
import { ErrorNote } from "@/core/ui/error-note";
import { useMemo, useState } from "react";
import { MeasuresComposer, readMeasures, useSayMeasures, type KnownThing } from "./MeasuresComposer";
import { useKnowledge } from "./useKnowledge";

/**
 * "This measures the intensity profile of a sample", said in place. The labels
 * already on this datum are offered first: they are the things it is most likely
 * to be about, and one of them needs no new individual.
 *
 * A confirmation, because the sentence itself cannot be read back yet: only its
 * thing shows, as a label above (`kraph/docs/SENTENCES.md`).
 */
export const MeasuresBlock = ({
  identifier,
  object,
}: {
  identifier: Identifier;
  object: Object;
}) => {
  const knowledge = useKnowledge(identifier, object);
  const structures = useMemo(() => [{ identifier, id: object.id }], [identifier, object.id]);
  const { say } = useSayMeasures(structures);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);

  const known = useMemo<KnownThing[]>(
    () =>
      knowledge.labels.map((label) => ({
        id: label.id,
        label: label.term.label || label.term.key,
        color: label.term.color,
        informed: true,
      })),
    [knowledge.labels],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-semibold">This measures</div>
      <MeasuresComposer
        known={known}
        disabled={busy}
        onSay={async (said) => {
          setBusy(true);
          setFailure(null);
          try {
            await say(said);
            await knowledge.refetch();
            toast.success(readMeasures(said));
            return true;
          } catch (error) {
            setFailure(error);
            return false;
          } finally {
            setBusy(false);
          }
        }}
      />
      <ErrorNote error={failure} title="Couldn't say that" variant="line" />
    </div>
  );
};

export default MeasuresBlock;
