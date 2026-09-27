import { Button } from "@/core/ui/button";
import { RailIsland, RailIslandRow } from "@/core/ui/rail/RailIsland";
import { cn } from "@/core/util/utils";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, MessageSquare, X, type LucideIcon } from "lucide-react";
import React, { isValidElement, useEffect } from "react";
import type { Action } from "sonner";
import {
  dismissToast,
  mountToastIsland,
  pauseToasts,
  resumeToasts,
  useRailToasts,
  type RailToast,
  type ToastKind,
} from "./toasts";

const KIND_ICON: Record<ToastKind, LucideIcon> = {
  default: MessageSquare,
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
};

const KIND_COLOR: Record<ToastKind, string> = {
  default: "text-muted-foreground",
  success: "text-emerald-500",
  info: "text-muted-foreground",
  warning: "text-amber-500",
  error: "text-destructive",
};

const isAction = (value: unknown): value is Action =>
  !!value && typeof value === "object" && !isValidElement(value) && "label" in value && "onClick" in value;

/** An `action` / `cancel`: a link-sized button that runs and then clears the toast. */
const ToastButton = ({ toast, button, muted }: { toast: RailToast; button: Action | React.ReactNode; muted?: boolean }) => {
  if (!isAction(button)) return <>{button}</>;
  return (
    <Button
      variant="link"
      size="sm"
      className={cn("h-auto p-0 text-[11px]", muted && "text-muted-foreground")}
      onClick={(e) => {
        button.onClick(e);
        if (!e.defaultPrevented) dismissToast(toast.id);
      }}
    >
      {button.label}
    </Button>
  );
};

const ToastRow = ({ toast }: { toast: RailToast }) => {
  const Icon = KIND_ICON[toast.kind];
  return (
    <RailIslandRow working={false} testId="toast-island-row">
      <div className="flex min-w-0 items-start gap-2">
        <span className={cn("mt-px shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5", KIND_COLOR[toast.kind])}>
          {toast.icon ?? <Icon />}
        </span>
        <div className="min-w-0 flex-1">
          {typeof toast.message === "string" ? (
            <p className="line-clamp-3 break-words text-xs font-medium" title={toast.message}>
              {toast.message}
            </p>
          ) : (
            <div className="min-w-0 break-words text-xs font-medium [&_*]:p-0">{toast.message}</div>
          )}
          {toast.description != null && (
            <div className="mt-0.5 line-clamp-2 break-words text-[11px] leading-snug text-muted-foreground">
              {toast.description}
            </div>
          )}
          {(toast.action != null || toast.cancel != null) && (
            <div className="mt-1 flex items-center gap-3">
              {toast.action != null && <ToastButton toast={toast} button={toast.action} />}
              {toast.cancel != null && <ToastButton toast={toast} button={toast.cancel} muted />}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0 text-muted-foreground"
          onClick={() => dismissToast(toast.id)}
          aria-label="Dismiss"
          title="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </RailIslandRow>
  );
};

/**
 * The app's toasts, as an island in the rail (`core/notify`). Mounting it is
 * what routes `toast` here instead of sonner's floating stack; newest on top,
 * and nothing expires while the pointer is on it.
 */
export const ToastIsland = () => {
  const toasts = useRailToasts((state) => state.toasts);

  useEffect(() => {
    const unmount = mountToastIsland();
    return () => {
      unmount();
      // Gone mid-hover: the pointer never leaves, so let the expiries run again.
      resumeToasts();
    };
  }, []);

  return (
    <div
      className="min-w-0 shrink-0"
      onPointerEnter={pauseToasts}
      onPointerLeave={resumeToasts}
      aria-live="polite"
      role="status"
    >
      <RailIsland show={toasts.length > 0} islandKey="toast-island" testId="toast-island">
        {toasts
          .slice()
          .reverse()
          .map((toast) => (
            <ToastRow key={toast.id} toast={toast} />
          ))}
      </RailIsland>
    </div>
  );
};
