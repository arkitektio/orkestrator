import { TriangleAlert } from "lucide-react";

import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { classifyError } from "@/core/layout/fallbacks/classifyError";
import { RetryButton } from "@/core/layout/fallbacks/statusActions";
import { Skeleton } from "@/core/ui/skeleton";
import { useGetMeshObjectInfoQuery } from "@/mikro/api/graphql";

import { ResidentItem, isNamedResident } from "../staging/DerivedResidents";

/**
 * What the mesh float says about one object below its header: what was
 * computed from that one surface (data whose `derivedFrom` named it as a
 * MESH_OBJECT source), each stageable in the scene for now.
 *
 * Mounted only while the float is open, and `cache-and-network` for the
 * annotation card's reason: the usual reason to open it twice is that
 * something was just made from the object.
 */
export const MeshObjectInfoCard = ({ collection, objectId }: { collection: string; objectId: number }) => {
  const { data, error, refetch } = useGetMeshObjectInfoQuery({
    variables: { collection, object: objectId },
    fetchPolicy: "cache-and-network",
  });
  const residents = data?.meshObject.derivedResidents.filter(isNamedResident);

  if (!residents && error) {
    return (
      <StatusPage
        variant="compact"
        icon={TriangleAlert}
        tone="warning"
        title="Could not read this object"
        description={classifyError(error).message}
        actions={<RetryButton onRetry={() => refetch()} />}
      />
    );
  }
  if (!residents) {
    return (
      <div className="flex flex-col gap-2 pt-1" aria-busy>
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-44" />
      </div>
    );
  }
  if (residents.length === 0) {
    return <p className="px-1.5 py-1.5 text-muted-foreground">Nothing made from this object yet.</p>;
  }
  return (
    <ul className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
      {residents.map((resident) => (
        <ResidentItem key={`${resident.__typename}:${resident.id}`} resident={resident} />
      ))}
    </ul>
  );
};
