import { Copy } from "lucide-react";

import { Button } from "@/core/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { InfoList } from "@/core/ui/info-list";
import { smartRegistry } from "@/core/smart/registry";
import { toast } from "@/core/notify";
import { copyText } from "@/core/tabs/sharing/universalLink";
import type { Structure } from "@/core/types";

/** What the "Debug describe" action hands over: the selection and its partner. */
export type DescribeStructuresProps = {
  left: Structure[];
  right?: Structure[];
  /** Where the action was run from, for the eyebrow. */
  isCommand?: boolean;
};

const mono = (text: string | undefined) =>
  text === undefined ? undefined : <code className="font-mono text-xs">{text}</code>;

const serialize = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2) ?? "undefined";
  } catch {
    return String(value);
  }
};

/** One structure, as it crossed the module border: identity, what the host knows about it, and its descriptors. */
const StructureCard = ({ structure }: { structure: Structure }) => {
  const model = smartRegistry.findModel(structure.identifier);
  const descriptors = structure.descriptors;
  return (
    <section className="rounded-md border border-border/60 bg-muted/20">
      <header className="flex items-baseline justify-between gap-3 border-b border-border/60 px-3 py-2">
        <span className="truncate font-medium">{structure.label ?? structure.id}</span>
        <code className="shrink-0 font-mono text-[11px] text-muted-foreground">{structure.identifier}</code>
      </header>
      <InfoList
        rows={[
          ["Identifier", mono(structure.identifier)],
          ["Id", mono(structure.id)],
          ["Label", structure.label],
          ["Model", model ? smartRegistry.getDisplayName(structure.identifier) : "unregistered"],
          ["Route", mono(smartRegistry.buildModelPath(structure.identifier, structure.id))],
          ["Datum", model ? (model.datum ? "yes" : "no") : undefined],
        ]}
      />
      <div className="px-3 pb-3">
        <div className="mb-1 text-xs text-muted-foreground">Descriptors</div>
        {descriptors && Object.keys(descriptors).length > 0 ? (
          <pre className="max-h-64 overflow-auto rounded bg-muted/40 p-2 font-mono text-[11px] leading-snug">
            {serialize(descriptors)}
          </pre>
        ) : (
          <div className="text-xs italic text-muted-foreground">none</div>
        )}
      </div>
    </section>
  );
};

const Group = ({ title, structures }: { title: string; structures: Structure[] }) => (
  <div className="flex flex-col gap-2">
    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {title} · {structures.length}
    </div>
    {structures.map((structure) => (
      <StructureCard key={`${structure.identifier}:${structure.id}`} structure={structure} />
    ))}
  </div>
);

/**
 * The "Debug describe" dialog: everything a local action gets to see about
 * the selection, laid out so a developer can check what a card, a drop or a
 * palette hit actually handed over. Host-owned, so it needs no service.
 */
export const DescribeStructuresDialog = ({ left, right, isCommand }: DescribeStructuresProps) => {
  const copy = async () => {
    const ok = await copyText(serialize({ left, right, isCommand }));
    if (ok) toast.success("Selection copied as JSON");
    else toast.error("Could not copy the selection");
  };

  return (
    <div className="flex max-h-[80cqh] flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Debug describe</DialogTitle>
        <DialogDescription>
          The structures this action was run on, as the host sees them
          {isCommand ? " (from the command palette)" : ""}.
        </DialogDescription>
      </DialogHeader>
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
        <Group title="Selected" structures={left} />
        {right && right.length > 0 && <Group title="Partner" structures={right} />}
      </div>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={copy}>
          <Copy className="mr-2 size-3.5" />
          Copy as JSON
        </Button>
      </div>
    </div>
  );
};

export default DescribeStructuresDialog;
