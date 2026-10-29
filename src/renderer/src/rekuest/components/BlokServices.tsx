import type React from "react";
import { serviceGuard } from "@/core/connection/arkitekt/host";
import { Badge } from "@/core/ui/badge";

/** A service a blok reads from: only its key matters here. */
export type BlokServiceRef = { key: string };

/**
 * The services a blok reads from: those of its declared queries and
 * subscriptions (blok language v2 merges the old `Blok.services` into them).
 */
export const blokServicesOf = (blok: {
  queries?: ReadonlyArray<{ service: string }> | null;
  subscriptions?: ReadonlyArray<{ service: string }> | null;
}): BlokServiceRef[] =>
  [...new Set([...(blok.queries ?? []), ...(blok.subscriptions ?? [])].map((read) => read.service))]
    .sort()
    .map((key) => ({ key }));

/**
 * What a blok needs connected besides its agents: the services its `query`
 * queries and subscriptions read, named so the person sees it.
 */
export const BlokServiceChips = ({ services }: { services: readonly BlokServiceRef[] }) =>
  services.length === 0 ? null : (
    <span className="flex shrink-0 items-center gap-1" title="The services this blok reads from">
      {services.map((service) => (
        <Badge key={service.key} variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
          {service.key}
        </Badge>
      ))}
    </span>
  );

/**
 * Its children only while every service the blok reads from is ready (the
 * guard of each, from the outside, CLAUDE.md §1): a blok whose `query` runs
 * against a service this deployment lacks, or that is not connected yet, says
 * which instead of failing inside.
 */
export const BlokServicesGuard = ({
  services,
  children,
}: {
  services: readonly BlokServiceRef[];
  children: React.ReactNode;
}) =>
  services.reduceRight<React.ReactNode>((inner, service) => {
    const Guard = serviceGuard(service.key);
    return (
      <Guard
        fallback={
          <div className="px-1 py-2 text-sm text-muted-foreground">
            This blok reads from <span className="font-medium text-foreground">{service.key}</span>, which is not
            connected.
          </div>
        }
      >
        {inner}
      </Guard>
    );
  }, children);
