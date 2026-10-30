import { useState } from "react";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/core/ui/collapsible";
import type { DetailImplementationFragment, ImplementationFitFragment } from "@/rekuest/api/graphql";
import { fitReads } from "@/rekuest/lib/fits";

/**
 * One `Fits`: the argument it limits, the formula as written, what it reads (with the value this
 * agent reported for its hardware), and the jsonpath the server tests on demand.
 */
export const FitCard = ({
  fit,
  argument,
  hardware,
}: {
  fit: ImplementationFitFragment;
  argument?: DetailImplementationFragment["action"]["args"][number];
  hardware: DetailImplementationFragment["agent"]["hardware"];
}) => {
  const [open, setOpen] = useState(false);
  const reads = fitReads(fit.callJson, hardware);
  const unreported = reads.hardware.filter(({ value }) => value === null);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{argument?.label || fit.port}</CardTitle>
        {argument?.identifier && (
          <CardDescription className="font-mono text-xs">{argument.identifier}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <code className="block rounded-md bg-muted/40 p-2 font-mono text-xs break-words">
          {fit.source ?? fit.compiledPath}
        </code>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Reads</span>
          {reads.descriptors.map((key) => (
            <Badge key={key} variant="outline" className="font-mono text-[10px]">
              {key}
            </Badge>
          ))}
          {reads.hardware.map(({ name, value }) => (
            <Badge
              key={name}
              variant={value === null ? "destructive" : "secondary"}
              className="font-mono text-[10px]"
            >
              agent.{name} = {value ?? "not reported"}
            </Badge>
          ))}
        </div>
        {unreported.length > 0 && (
          <p className="text-xs text-destructive">
            This agent did not report {unreported.map(({ name }) => name).join(", ")}, so a
            comparison on it never holds.
          </p>
        )}
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="self-start">
              {open ? "Hide compiled path" : "Compiled path"}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <code className="mt-2 block rounded-md bg-muted/40 p-2 font-mono text-xs break-all">
              {fit.compiledPath}
            </code>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

/**
 * What this implementation can handle of its arguments, the formulas it declared with `Fits`.
 * Renders nothing for an implementation that declared none.
 */
export const DeclaredFits = ({
  implementation,
}: {
  implementation: Pick<DetailImplementationFragment, "fits" | "action" | "agent">;
}) => {
  const { fits, action, agent } = implementation;
  if (fits.length === 0) return null;
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">What it can handle</h2>
        <p className="text-sm text-muted-foreground">
          The objects this agent accepts. An action leaves an object's menu only when every live
          agent refuses that object, and an agent still refuses one that does not fit when a task
          reaches it.
        </p>
      </div>
      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
        {fits.map((fit) => (
          <FitCard
            key={fit.port}
            fit={fit}
            argument={action.args.find((port) => port.key === fit.port)}
            hardware={agent.hardware}
          />
        ))}
      </div>
    </section>
  );
};

export default DeclaredFits;
