import { describeRoles, setRoleOverride, useRoleOverride } from "@/core/connection/roles";
import { RailIsland, RailIslandName, RailIslandRow } from "@/core/ui/rail/RailIsland";
import { Eye, X } from "lucide-react";

/**
 * The developer "view as" override, while it is on: one row in the rail, so
 * nobody forgets the UI is hiding things they could otherwise see, and one
 * click back to the real roles.
 */
export const RoleOverrideIsland = () => {
  const override = useRoleOverride();
  const name = override
    ? override.length
      ? `Viewing as ${describeRoles({ allOf: override })}`
      : "Viewing with no roles"
    : "";

  return (
    <RailIsland show={!!override} islandKey="role-override-island" testId="role-override-island" maxHeightClassName="max-h-[14vh]">
      <RailIslandRow working={false}>
        <div className="flex min-w-0 items-center gap-2">
          <Eye className="h-3.5 w-3.5 shrink-0 text-primary" />
          <RailIslandName name={name} working />
          <button
            type="button"
            aria-label="Back to my roles"
            title="Back to my roles"
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setRoleOverride(null)}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </RailIslandRow>
    </RailIsland>
  );
};

export default RoleOverrideIsland;
