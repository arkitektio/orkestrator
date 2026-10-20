import { cn } from "@/core/util/utils";
import { SignaturePort } from "./manifest";

/** A port's type as one short word: the structure it names, or its kind (with its children). */
export const portType = (port: SignaturePort): string => {
  if (port.identifier) return port.identifier;
  const kind = String(port.kind).toLowerCase();
  const children = port.children ?? [];
  if (children.length === 0) return kind;
  return `${kind}[${children.map(portType).join(", ")}]`;
};

/** One line per port: its key and type, faint when it may be left out. */
export const PortLines = ({ ports, empty }: { ports: readonly SignaturePort[]; empty?: string }) => {
  if (ports.length === 0) return <div className="text-xs text-muted-foreground">{empty ?? "None"}</div>;
  return (
    <div className="flex flex-col gap-0.5">
      {ports.map((port) => (
        <div key={port.key} className="flex items-baseline gap-2 text-xs">
          <span className="font-mono">{port.key}</span>
          <span className={cn("truncate font-mono text-muted-foreground", port.nullable && "opacity-60")}>
            {portType(port)}
            {port.nullable ? " | None" : ""}
          </span>
        </div>
      ))}
    </div>
  );
};
