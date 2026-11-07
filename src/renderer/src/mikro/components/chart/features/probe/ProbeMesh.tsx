import { StructureViewer } from "@/core/smart/display/StructureViewer";
import { MikroMeshObject } from "@/mikro/linkers";
import type { RowObject } from "@/mikro/lib/attributes/attributeTypes";

/**
 * The mesh a pinned point is (or its picked member's), drawn in 3D through
 * the host's viewer slot: the chart knows the structure, mikro's
 * `@mikro/meshobject` viewer knows how to draw it.
 */
export const ProbeMesh = ({ object }: { object: RowObject }) => {
  const objectId = object.id.slice(object.id.lastIndexOf(":") + 1);
  const label = `${object.source.label ?? "Mesh"} · ${objectId}`;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        <MikroMeshObject.DetailLink
          object={{ id: object.id }}
          className="shrink-0 text-[11px] text-muted-foreground hover:text-foreground"
          title={`Open ${label}`}
        >
          Open
        </MikroMeshObject.DetailLink>
        <MikroMeshObject.ObjectButton object={{ id: object.id, label }} alwaysShow>
          Mesh
        </MikroMeshObject.ObjectButton>
      </div>
      <div className="h-56 overflow-hidden rounded-md border border-border">
        <StructureViewer identifier={object.identifier} id={object.id} controls={false} />
      </div>
    </div>
  );
};
