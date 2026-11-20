import { useLokResolve } from "@/core/datalayer/hooks/useResolve";
import { Image } from "@/core/ui/image";
import React from "react";

/**
 * The parts lok's detail pages share, so they read like the device page: a
 * header glyph that is the object's own logo when it has one, and a titled
 * section of what hangs off the object.
 */

/** The object's logo in the header tile, or `fallback` (a lucide glyph) when it has none. */
export const LogoOrIcon = ({ src, fallback }: { src?: string | null; fallback: React.ReactNode }) => {
  const resolve = useLokResolve();
  if (!src) return <>{fallback}</>;
  return <Image src={resolve(src)} className="h-7 w-7 object-contain" alt="" />;
};

/** A titled part of a detail page's body, its count beside the title. Nothing when `count` is 0. */
export const DetailSection = ({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) => {
  if (count === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-muted-foreground">
        {title}
        {count != null && <span className="ml-1.5 font-normal tabular-nums text-muted-foreground/60">{count}</span>}
      </h2>
      {children}
    </section>
  );
};

/** The grid a section lays its cards in. */
export const DetailGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">{children}</div>
);
