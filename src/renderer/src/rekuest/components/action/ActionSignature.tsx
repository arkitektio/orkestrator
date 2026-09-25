import { ActionKind, DetailActionFragment } from "@/rekuest/api/graphql";
import PortConstraintBadges, {
  PortConstraint,
} from "@/core/components/ports/PortConstraintBadges";
import { portToLabel } from "@/core/lib/ports/utils";

type ArgPort = DetailActionFragment["args"][number];
type ReturnPort = DetailActionFragment["returns"][number];

const formatDefault = (value: unknown) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
};

const PortRow = ({
  port,
  constraints,
  note,
}: {
  port: ArgPort | ReturnPort;
  constraints?: PortConstraint[] | null;
  note?: string;
}) => (
  <div className="flex flex-col gap-0.5 py-2">
    <div className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 truncate text-sm font-medium">
        {port.label || port.key}
      </span>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        {portToLabel(port)}
      </span>
    </div>
    {port.description && (
      <p className="text-xs text-muted-foreground">{port.description}</p>
    )}
    {note && <p className="text-xs text-muted-foreground/60">{note}</p>}
    <PortConstraintBadges items={constraints} className="mt-1" />
  </div>
);

const argNote = (port: ArgPort) => {
  const hasDefault = port.default !== null && port.default !== undefined;
  if (hasDefault) return `optional · default ${formatDefault(port.default)}`;
  return port.nullable ? "optional" : undefined;
};

const Column = (props: { title: string; children: React.ReactNode }) => (
  <div>
    <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {props.title}
    </h2>
    <div className="mt-1 divide-y divide-border">{props.children}</div>
  </div>
);

/**
 * What the action takes and what it gives back — a description, not a form.
 * Running it is the "Run Action" local action (context menu / ObjectButton),
 * which opens the assign dialog. A side with no ports is left out entirely.
 */
export const ActionSignature = ({ action }: { action: DetailActionFragment }) => {
  if (action.args.length === 0 && action.returns.length === 0) return null;

  return (
    <div className="grid max-w-4xl gap-x-12 gap-y-6 @2xl:grid-cols-2">
      {action.args.length > 0 && (
        <Column title="Takes">
          {action.args.map((port) => (
            <PortRow
              key={port.key}
              port={port}
              constraints={port.requires}
              note={argNote(port)}
            />
          ))}
        </Column>
      )}
      {action.returns.length > 0 && (
        <Column title={action.kind === ActionKind.Generator ? "Yields" : "Returns"}>
          {action.returns.map((port) => (
            <PortRow
              key={port.key}
              port={port}
              constraints={port.provides}
              note={port.nullable ? "may be empty" : undefined}
            />
          ))}
        </Column>
      )}
    </div>
  );
};
