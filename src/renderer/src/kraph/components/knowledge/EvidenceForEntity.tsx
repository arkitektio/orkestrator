import { Button } from "@/core/ui/button";
import { useAssertInformsMutation } from "@/kraph/api/graphql";
import { AssignedEntity, EntityAssigner } from "@/kraph/components/EntityAssigner";
import type { Identifier, Object } from "@/core/types";
import { useState } from "react";
import { toast } from "sonner";

/**
 * The other way to relate a datum to something already known: not "this is the
 * same thing" but "this datum is evidence for that entity" (`assertInforms`).
 * It does not merge identities — the datum joins the entity's evidence and no
 * new instance is minted. Entities are graph-scoped, so this one does need a
 * concrete row picked out of a specific graph, which is why it is the advanced
 * path rather than the default.
 */
export const EvidenceForEntity = ({
  identifier,
  object,
  onDone,
}: {
  identifier: Identifier;
  object: Object;
  onDone?: () => void;
}) => {
  const [entity, setEntity] = useState<AssignedEntity | null>(null);
  const [assertInforms, { loading }] = useAssertInformsMutation();

  const link = async () => {
    if (!entity) return;
    try {
      await assertInforms({
        variables: {
          input: {
            structureIdentifier: identifier,
            structureObject: object.id,
            entityId: entity.id,
          },
        },
      });
      toast.success(`Now evidence for ${entity.label}`);
      setEntity(null);
      onDone?.();
    } catch (e) {
      toast.error(`Could not link: ${(e as Error).message}`);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Records that this datum informs an entity a graph already holds. It
        does not merge identities — use “Same as” for that.
      </p>
      <EntityAssigner value={entity} onChange={setEntity} disabled={loading} />
      <Button type="button" variant="outline" size="sm" onClick={link} disabled={!entity || loading}>
        {loading ? "Linking…" : "Use as evidence"}
      </Button>
    </div>
  );
};

export default EvidenceForEntity;
