import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/core/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/core/ui/collapsible";
import { ErrorNote } from "@/core/ui/error-note";
import {
  TaskBlokRole,
  type DetailImplementationFragment,
  type ImplementationInteractionFragment,
} from "@/rekuest/api/graphql";
import { DemoBlokRenderer } from "../DemoBlokRenderer";

/** What a chip shows of an arg or return port. */
type Port = Pick<
  ImplementationInteractionFragment["blok"]["args"][number],
  "key" | "kind" | "label" | "nullable"
>;

/** A blok's ports as chips: `key: kind`, a `?` on one that may be left out. */
const PortList = ({ title, ports }: { title: string; ports: Port[] }) =>
  ports.length ? (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{title}</span>
      {ports.map((port) => (
        <Badge
          key={port.key}
          variant="outline"
          className="font-mono text-[10px]"
          title={port.label ?? undefined}
        >
          {port.key}
          {port.nullable ? "?" : ""}: {port.kind.toLowerCase()}
        </Badge>
      ))}
    </div>
  ) : null;

/**
 * One declared ask or inform: its key, what it is listed with, the ports a task
 * opens it on (and an ask is answered with), and its blok drawn against its demo
 * on demand -- bound to no agent, running nothing.
 */
export const InteractionCard = ({
  interaction,
}: {
  interaction: ImplementationInteractionFragment;
}) => {
  const [open, setOpen] = useState(false);
  const ask = interaction.role === TaskBlokRole.Ask;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge
            variant={ask ? "secondary" : "outline"}
            title={
              ask
                ? "The task holds on it until a person answers through it"
                : "Shown while the task goes on; nothing waits on it"
            }
          >
            {ask ? "Ask" : "Inform"}
          </Badge>
          <CardTitle className="font-mono text-sm font-light">
            {interaction.key}
          </CardTitle>
        </div>
        {interaction.description && (
          <CardDescription>{interaction.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <PortList title="Opened on" ports={interaction.blok.args} />
        {ask && (
          <PortList title="Answered with" ports={interaction.blok.returns} />
        )}
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="self-start">
              {open ? "Hide preview" : "Preview"}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-lg border border-border/60 p-3">
              <ErrorBoundary
                fallbackRender={({ error }) => (
                  <ErrorNote
                    error={error}
                    title="The preview could not draw this"
                  />
                )}
              >
                <DemoBlokRenderer
                  surfaceId={`interaction-${interaction.id}`}
                  blok={interaction.blok}
                />
              </ErrorBoundary>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

/**
 * The bloks an implementation declared with it: what its tasks ask a person
 * through (and hold on until answered) and what they show while they go on.
 * Asks first, each kind by key. Renders nothing for an implementation that
 * declared none.
 */
export const DeclaredInteractions = ({
  interactions,
}: {
  interactions: ImplementationInteractionFragment[];
}) => {
  if (interactions.length === 0) return null;
  const sorted = [...interactions].sort(
    (a, b) =>
      Number(a.role !== TaskBlokRole.Ask) - Number(b.role !== TaskBlokRole.Ask) ||
      a.key.localeCompare(b.key),
  );
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Declared interactions</h2>
        <p className="text-sm text-muted-foreground">
          What its tasks ask you through, or show you, declared with the action.
        </p>
      </div>
      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
        {sorted.map((interaction) => (
          <InteractionCard key={interaction.id} interaction={interaction} />
        ))}
      </div>
    </section>
  );
};

const DYNAMIC: {
  flag: "dynamicCalls" | "dynamicAsks" | "dynamicInforms";
  label: string;
  title: string;
}[] = [
  {
    flag: "dynamicCalls",
    label: "Dynamic calls",
    title:
      "Its tasks may call actions they find at run time, not only its declared dependencies",
  },
  {
    flag: "dynamicAsks",
    label: "Dynamic asks",
    title:
      "Its tasks may ask through bloks made at run time, not only its declared asks",
  },
  {
    flag: "dynamicInforms",
    label: "Dynamic informs",
    title:
      "Its tasks may show bloks made at run time, not only its declared informs",
  },
];

/** What an implementation's tasks may do beyond what it declared, one badge per capability. */
export const DynamicCapabilityBadges = ({
  implementation,
}: {
  implementation: Pick<
    DetailImplementationFragment,
    "dynamicCalls" | "dynamicAsks" | "dynamicInforms"
  >;
}) => (
  <>
    {DYNAMIC.filter(({ flag }) => implementation[flag]).map(
      ({ flag, label, title }) => (
        <Badge key={flag} variant="outline" title={title}>
          {label}
        </Badge>
      ),
    )}
  </>
);

export default DeclaredInteractions;
