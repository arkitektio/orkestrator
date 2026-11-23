import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { describeError } from "@/core/notify";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { smartRegistry } from "@/core/smart/registry";
import { Badge } from "@/core/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/core/ui/collapsible";

import { orderShares, type ServiceShare, type SharedObject } from "./shareWorkflow";

/** Rows shown per list before "and N more": a workflow can make thousands. */
const SHOWN = 25;

const kindOf = (identifier: string | null) =>
  identifier ? smartRegistry.getDisplayName(identifier) || identifier : "Object";

/** An object of a service, as its owner draws it, or its kind and id where nothing does. */
const ObjectRow = ({ object }: { object: SharedObject }) =>
  object.identifier ? (
    <StructureDisplay
      identifier={object.identifier}
      id={object.object}
      variant="inline"
      link
      fallback={
        <span>
          {kindOf(object.identifier)} {object.object}
        </span>
      }
    />
  ) : (
    <span>Object {object.object}</span>
  );

const More = ({ count }: { count: number }) =>
  count > SHOWN ? <div className="text-xs text-muted-foreground">and {count - SHOWN} more</div> : null;

const ServiceSection = ({ share }: { share: ServiceShare }) => {
  const [open, setOpen] = useState(false);

  if (share.status === "unavailable") {
    return (
      <div className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm text-muted-foreground">
        <span className="font-medium">{share.label}</span>
        <span className="ml-auto">not connected: nothing shared there</span>
      </div>
    );
  }
  if (share.status === "failed") {
    return (
      <div className="flex flex-col gap-1 rounded-md border border-destructive/40 px-2 py-1.5 text-sm">
        <span className="font-medium">{share.label}</span>
        <span className="text-destructive">{describeError(share.error).message}</span>
      </div>
    );
  }

  const { added, covered, skipped, unknown, dryRun } = share.share;
  const empty = added.length === 0 && skipped.length === 0 && covered === 0 && unknown.length === 0;
  if (empty) {
    return (
      <div className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm text-muted-foreground">
        <span className="font-medium">{share.label}</span>
        <span className="ml-auto">nothing from this workflow</span>
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm">
        <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        <span className="font-medium">{share.label}</span>
        <span className="ml-auto flex flex-wrap justify-end gap-1">
          <Badge variant="outline">{dryRun ? "would add" : "added"} {added.length}</Badge>
          {covered > 0 && <Badge variant="outline">{covered} along with them</Badge>}
          {skipped.length > 0 && <Badge variant="secondary">{skipped.length} skipped</Badge>}
          {unknown.length > 0 && <Badge variant="secondary">{unknown.length} not looked at</Badge>}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3 px-3 pb-2 text-sm">
        {added.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="text-xs font-medium text-muted-foreground">
              {dryRun ? "Will be put in" : "Put in"}, with what each needs to be seen
            </div>
            {added.slice(0, SHOWN).map((object) => (
              <ObjectRow key={`${object.identifier}:${object.object}`} object={object} />
            ))}
            <More count={added.length} />
          </div>
        )}
        {covered > 0 && (
          <div className="text-xs text-muted-foreground">
            {covered} part{covered === 1 ? "" : "s"} come{covered === 1 ? "s" : ""} along with {covered === 1 ? "its" : "their"} whole,
            without being put in on {covered === 1 ? "its" : "their"} own.
          </div>
        )}
        {skipped.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="text-xs font-medium text-muted-foreground">Left out</div>
            {skipped.slice(0, SHOWN).map((object) => (
              <div key={`${object.identifier}:${object.object}`} className="flex flex-wrap items-baseline gap-1">
                <ObjectRow object={object} />
                <span className="text-muted-foreground">: part of</span>
                <ObjectRow object={{ identifier: object.wholeIdentifier, object: object.whole }} />
                <span className="text-muted-foreground">made before the workflow</span>
              </div>
            ))}
            <More count={skipped.length} />
          </div>
        )}
        {unknown.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="text-xs font-medium text-muted-foreground">
              Not looked at: these cannot say what made them
            </div>
            <div className="flex flex-wrap gap-1">
              {unknown.map((identifier) => (
                <Badge key={identifier} variant="outline" title={identifier}>
                  {kindOf(identifier)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

/** The combined report of a workflow share: what each service put in, or would. */
export const ShareReport = ({ shares }: { shares: readonly ServiceShare[] }) => (
  <div className="flex flex-col gap-1.5">
    {orderShares(shares).map((share) => (
      <ServiceSection key={share.namespace} share={share} />
    ))}
  </div>
);
