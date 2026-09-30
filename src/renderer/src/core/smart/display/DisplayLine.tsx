import type React from "react";
import type { LucideIcon } from "lucide-react";
import { Box } from "lucide-react";

import { SmartLink } from "@/core/smart/builder";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { smartRegistry } from "@/core/smart/registry";
import { cn } from "@/core/util/utils";

/**
 * The one shape a display takes where it is embedded in someone else's UI:
 * the task island's yield, the Knowledge sidebar's "same as" list, a palette
 * row. An icon, a name, and one muted line of what matters about it.
 *
 * Borderless on purpose: its host is already the surface (the island, the
 * sidebar), and a card inside it would be a card within a card. The variant
 * picks how much of it shows: "inline" is the name as text, "avatar" the
 * picture, "chip" picture and name, "card" (default) adds the meta line.
 */
export const DisplayLine = ({
  identifier,
  id,
  variant,
  context,
  className,
  icon: Icon = Box,
  thumbnail,
  leading,
  title,
  meta,
  link = true,
}: Pick<DisplayWidgetProps, "identifier" | "id" | "variant" | "context" | "className"> & {
  icon?: LucideIcon;
  /** A picture of it, when it has one; takes the icon's place. */
  thumbnail?: string | null;
  /** Anything else in the icon's place: a status ring, a presence dot. */
  leading?: React.ReactNode;
  title: React.ReactNode;
  /** Short facts, joined with " · "; empty ones are dropped. */
  meta?: readonly (React.ReactNode | false | null | undefined)[];
  /** Wrap it in a link to its own page (default). */
  link?: boolean;
}) => {
  const facts = (meta ?? []).filter((fact) => fact !== false && fact != null && fact !== "");

  const picture = leading ? (
    <span className="flex shrink-0 items-center">{leading}</span>
  ) : thumbnail ? (
    <img src={thumbnail} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
  ) : (
    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
  );

  const body =
    variant === "inline" ? (
      <span className={cn("truncate", className)}>{title}</span>
    ) : variant === "avatar" ? (
      <span className={cn("inline-flex", className)} title={typeof title === "string" ? title : undefined}>
        {picture}
      </span>
    ) : variant === "chip" || context === "command" ? (
      <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
        {picture}
        <span className="truncate text-sm font-medium">{title}</span>
        {context === "command" && facts.length > 0 && (
          <span className="shrink-0 truncate text-xs text-muted-foreground">{facts[0]}</span>
        )}
      </span>
    ) : (
      <span className={cn("flex min-w-0 items-center gap-2", className)}>
        {picture}
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium leading-tight">{title}</span>
          {facts.length > 0 && (
            <span className="truncate text-xs text-muted-foreground">
              {facts.map((fact, index) => (
                <span key={index}>
                  {index > 0 && " · "}
                  {fact}
                </span>
              ))}
            </span>
          )}
        </span>
      </span>
    );

  return link ? (
    <SmartLink identifier={identifier} object={id} className="min-w-0 hover:underline-offset-2">
      {body}
    </SmartLink>
  ) : (
    body
  );
};

/**
 * What a structure shows while its display is loading, when its display
 * could not find it, or when no module displays its identifier at all: the
 * model's name and a short id, still linked. Better than an empty slot or a
 * "not found" in a task's result.
 */
export const DisplayLinePlaceholder = (
  props: Pick<DisplayWidgetProps, "identifier" | "id" | "variant" | "context" | "className"> & {
    icon?: LucideIcon;
  },
) => (
  <DisplayLine
    {...props}
    link={smartRegistry.findModel(props.identifier) != undefined}
    title={smartRegistry.getDisplayName(props.identifier)}
    meta={[<span className="font-mono">{shortId(props.id)}</span>]}
  />
);

const shortId = (id: string) => (id.length > 10 ? `${id.slice(0, 8)}…` : id);

/** Bytes as a human reads them. */
export const formatBytes = (bytes: number | null | undefined): string | undefined => {
  if (bytes == null) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
};

/** A count with its noun ("3 pages", "1 page"); pass the plural when it is not just "s". */
export const countOf = (
  count: number | null | undefined,
  noun: string,
  plural = `${noun}s`,
): string | undefined => (count == null ? undefined : `${count} ${count === 1 ? noun : plural}`);
