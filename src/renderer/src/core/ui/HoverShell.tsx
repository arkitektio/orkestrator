import { Skeleton } from "@/core/ui/skeleton";
import { cn } from "@/core/util/utils";
import React from "react";

/**
 * Generic chrome shared by the on-demand SmartModel hover cards. Renders a
 * header (title + optional subtitle/preview) and a body, keeping every hover
 * card visually consistent regardless of which module provides it.
 */
export const HoverShell = ({
  title,
  subtitle,
  preview,
  icon,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  preview?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) => {
  return (
    <div className="flex flex-col">
      {preview}
      <div className="p-3 flex flex-col gap-2">
        <div className="flex flex-row items-start gap-2">
          {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="font-semibold text-sm leading-tight line-clamp-2 break-words">
              {title}
            </div>
            {subtitle && (
              <div className="text-xs text-muted-foreground line-clamp-1">
                {subtitle}
              </div>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

export const HoverRow = ({
  label,
  value,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex flex-row justify-between gap-3 text-xs", className)}>
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right truncate">{value}</span>
    </div>
  );
};

export const HoverSectionLabel = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground pt-1">
      {children}
    </div>
  );
};

export const HoverSkeleton = () => {
  return (
    <div className="flex flex-col gap-2 p-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  );
};
