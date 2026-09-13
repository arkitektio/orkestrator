import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useResolve } from "@/datalayer/hooks/useResolve";
import { LokClient } from "@/linkers";
import { Server, User } from "lucide-react";
import { ListClientFragment } from "../../api/graphql";
import { clientAppIdentifier } from "@/lok-next/lib/clientLabels";

interface Props {
  item: ListClientFragment;

}

const ClientCard = ({ item }: Props) => {
  const resolve = useResolve();

  return (
    <LokClient.Smart object={item} >
      <LokClient.DetailLink object={item} className="block h-full">
        <Card className="h-full hover:bg-muted/50 transition-colors group">
          <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
            <Avatar className="h-10 w-10 rounded-lg border bg-muted">
              <AvatarImage
                src={resolve(item.logo?.presignedUrl)}
                alt={clientAppIdentifier(item)}
                className="object-contain"
              />
              <AvatarFallback className="rounded-lg">
                {clientAppIdentifier(item).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 overflow-hidden">
              <CardTitle className="text-base font-semibold truncate leading-none flex items-center gap-2">
                <span className="truncate">{clientAppIdentifier(item)}</span>
              </CardTitle>
              {item.release && (
                <CardDescription className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                    v{item.release.version}
                  </Badge>
                </CardDescription>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                <User className="h-3.5 w-3.5" />
                <span className="truncate">
                  {item.user?.username || "Unknown User"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                <Server className="h-3.5 w-3.5" />
                <span className="truncate">
                  {item.node?.name || "Unassigned Node"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </LokClient.DetailLink>
    </LokClient.Smart>
  );
};

export default React.memo(ClientCard);