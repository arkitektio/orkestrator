import React from "react";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RekuestAgent } from "@/linkers";
import { SearchAgentFragment } from "@/rekuest/api/graphql";

interface Props {
  item: SearchAgentFragment;
}

const SearchAgentCard = ({ item }: Props) => {
  const statusLabel = item.blocked
    ? "Blocked"
    : item.connected
      ? "Online"
      : "Offline";
  const statusVariant = item.blocked
    ? "destructive"
    : item.connected
      ? "secondary"
      : "outline";

  return (
    <RekuestAgent.Smart object={item}>
      <Card
        className={cn(
          "h-full flex flex-col justify-between border-border/60 bg-background/20 transition-colors hover:border-primary/40",
          item.blocked && "border-destructive/40",
        )}
      >
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-2">
            <Badge variant="outline" className="max-w-[70%] truncate font-mono text-[0.625rem]">
              {item.app.identifier}
            </Badge>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>

          <CardTitle className="text-base leading-tight">
            <RekuestAgent.DetailLink object={item}>
              <span className="line-clamp-3 break-words">{item.name}</span>
            </RekuestAgent.DetailLink>
          </CardTitle>

        </CardHeader>

        <CardFooter className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">{item.release.version}</span>
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              item.blocked
                ? "bg-destructive"
                : item.connected
                  ? "bg-emerald-500"
                  : "bg-muted-foreground/40",
            )}
          />
        </CardFooter>
      </Card>
    </RekuestAgent.Smart>
  );
};

export default React.memo(SearchAgentCard);