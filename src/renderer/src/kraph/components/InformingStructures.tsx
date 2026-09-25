import { Card } from "@/core/components/ui/card";
import { KraphStructure } from "@/core/linkers";
import { useInformingStructuresQuery } from "../api/graphql";

/**
 * Structures that inform an entity. Structures are organization-scoped now, so
 * this is a direct query rather than a walk over `entity.measuredBy`.
 */
export const InformingStructures = ({ entityId }: { entityId: string }) => {
  const { data, loading } = useInformingStructuresQuery({
    variables: { entityId },
  });

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground p-2">
        Loading informing structures…
      </div>
    );
  }

  const structures = data?.informingStructures ?? [];

  if (structures.length === 0) {
    return (
      <div className="text-xs text-muted-foreground p-2">
        No structures inform this entity yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {structures.map((structure) => (
        <Card key={structure.id} className="p-2">
          <KraphStructure.DetailLink
            object={{ id: structure.id }}
            className="text-sm hover:underline"
          >
            {structure.kind?.label || structure.kind?.identifier || structure.identifier}{" "}
            <span className="font-mono text-xs text-muted-foreground">
              {structure.object}
            </span>
          </KraphStructure.DetailLink>
        </Card>
      ))}
    </div>
  );
};

export default InformingStructures;
