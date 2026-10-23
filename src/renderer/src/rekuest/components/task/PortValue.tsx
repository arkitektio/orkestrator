import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { ArgPortFragment, PortKind } from "@/rekuest/api/graphql";

/** A structure as the wire carries it: `{__identifier, object}`. */
const asWireStructure = (value: unknown): { identifier: string; id: string } | null => {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  return typeof r.__identifier === "string" && r.object != null
    ? { identifier: r.__identifier, id: String(r.object) }
    : null;
};

const compact = (value: unknown): string => {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

/**
 * One argument as a person reads it: a structure is shown as itself (an image,
 * a release), whether the wire wrapped it or the port says what its id is; a
 * list counts and shows its first few; anything else is its value.
 */
export const PortValue = ({ value, port }: { value: unknown; port?: ArgPortFragment }) => {
  const wire = asWireStructure(value);
  const structure =
    wire ??
    (port?.kind === PortKind.Structure && port.identifier && (typeof value === "string" || typeof value === "number")
      ? { identifier: String(port.identifier), id: String(value) }
      : null);
  if (structure) {
    return (
      <StructureDisplay
        identifier={structure.identifier}
        id={structure.id}
        small
        fallback={<span className="font-mono text-[11px]">{`${structure.identifier} ${structure.id}`}</span>}
      />
    );
  }
  if (Array.isArray(value)) {
    const child = port?.children?.[0] as ArgPortFragment | undefined;
    return (
      <span className="flex min-w-0 flex-wrap items-center gap-1">
        {value.slice(0, 3).map((item, index) => (
          <PortValue key={index} value={item} port={child} />
        ))}
        {value.length > 3 && <span className="text-muted-foreground">+{value.length - 3} more</span>}
      </span>
    );
  }
  if (typeof value === "boolean") return <span className="font-medium">{value ? "yes" : "no"}</span>;
  return <span className="line-clamp-2 break-all font-mono text-[11px]">{compact(value)}</span>;
};
