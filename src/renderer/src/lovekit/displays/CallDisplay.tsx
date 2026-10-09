import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { cn } from "@/core/util/utils";
import { useGetCallQuery } from "@/lovekit/api/graphql";
import { Phone, Users } from "lucide-react";

/** A call as another module's UI embeds it: its title and who is in it. */
export const CallDisplay = ({ id, variant = "card", className }: DisplayWidgetProps) => {
  const { data } = useGetCallQuery({ variables: { id } });
  const call = data?.call;
  if (!call) return null;

  if (variant === "inline") return <span className={className}>{call.title}</span>;
  if (variant === "avatar") return <Phone className={cn("size-4", className)} />;
  return (
    <div className={cn("flex items-center gap-2 text-sm", variant === "card" && "rounded-lg border border-border/60 p-2", className)}>
      <Phone className="size-3.5 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate">{call.title}</span>
      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <Users className="size-3" />
        {call.participants.length}
      </span>
    </div>
  );
};
