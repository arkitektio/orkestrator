import { Spinner } from "@/core/ui/spinner";
import { Card } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import { TriangleAlert } from "lucide-react";
import { ListOutgoingMessageFragment, OutgoingStatus } from "../../api/graphql";
import { addressLabel, formatMailDate } from "../../format";
import { OutgoingMail } from "../../linkers";

/** A sent mail: to whom, what, and whether the server took it. */
const OutgoingCard = ({ item }: { item: ListOutgoingMessageFragment }) => (
  <OutgoingMail.Smart object={item}>
    <Card className={cn("group flex flex-col gap-0.5 px-3 py-2", item.status === OutgoingStatus.Sending && "opacity-70")}>
      <div className="flex items-baseline justify-between gap-3">
        <OutgoingMail.DetailLink object={item} className="truncate text-sm font-medium">
          {item.subject || "(no subject)"}
        </OutgoingMail.DetailLink>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          {item.status === OutgoingStatus.Sending && <Spinner className="size-3" aria-label="Sending" />}
          {item.status === OutgoingStatus.Failed && <TriangleAlert className="h-3 w-3 text-destructive" aria-label="Failed" />}
          {formatMailDate(item.sentAt ?? item.createdAt)}
        </span>
      </div>
      <span className="truncate text-xs text-muted-foreground">
        to {item.to.map(addressLabel).join(", ") || "nobody"}
        {item.status === OutgoingStatus.Failed && item.error && ` · ${item.error}`}
      </span>
    </Card>
  </OutgoingMail.Smart>
);

export default OutgoingCard;
