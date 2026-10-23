import { TriangleAlert } from "lucide-react";

import { useServiceSchemaHash } from "@/core/modules/hooks/useServiceSchemaHash";
import { cn } from "@/core/util/utils";

/**
 * Says when a service a blok reads from (`Blok.services`) now serves another
 * schema than the one the blok was checked against when it was made. Only
 * says: the blok runs as it is, and a query the server no longer answers
 * fails on its own, in its `failed` slot. Nothing shows while the live schema
 * is read, when it cannot be, or when it matches.
 */

export type BlokServiceRequirement = {
  key: string;
  service?: string | null;
  version?: string | null;
  schemaHash?: string | null;
};

const Drift = ({ requirement, className }: { requirement: BlokServiceRequirement; className?: string }) => {
  const live = useServiceSchemaHash(requirement.schemaHash ? requirement.key : undefined);
  if (!requirement.schemaHash || !live || live === requirement.schemaHash) return null;

  const written = requirement.version ? `${requirement.key} ${requirement.version}` : requirement.key;
  return (
    <div
      role="status"
      title={`Written against ${requirement.schemaHash}; ${requirement.key} serves ${live}.`}
      className={cn("flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground", className)}
    >
      <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">
        Written for {written}: the connected {requirement.key} serves another schema, so some of its queries may not
        answer.
      </span>
    </div>
  );
};

export const BlokServiceNotice = ({
  services,
  className,
}: {
  services: readonly BlokServiceRequirement[] | null | undefined;
  className?: string;
}) => (
  <>
    {(services ?? []).map((requirement) => (
      <Drift key={requirement.key} requirement={requirement} className={className} />
    ))}
  </>
);
