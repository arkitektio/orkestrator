import { Card } from "@/core/ui/card";
import { BankConnection } from "@/bank/linkers";
import { Landmark, LineChart } from "lucide-react";
import React from "react";
import { ListBankConnectionFragment, Provider } from "../../api/graphql";
import { formatDay } from "../../format";
import { ConnectionStatusBadge } from "../ConnectionStatus";

const ConnectionCard = ({ item }: { item: ListBankConnectionFragment }) => (
  <BankConnection.Smart object={item}>
    <Card className={"group p-3 flex flex-col gap-2" + (item.isAbandoned ? " opacity-60" : "")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {item.provider === Provider.Scalable ? (
            <LineChart className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <Landmark className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <BankConnection.DetailLink object={item} className="truncate font-medium">
            {item.aspspName}
          </BankConnection.DetailLink>
        </div>
        <ConnectionStatusBadge
          status={item.status}
          needsReauth={item.needsReauth}
          linkStep={item.linkStep}
          isAbandoned={item.isAbandoned}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        {item.provider === Provider.Scalable ? "Scalable login" : item.aspspCountry}
        {item.validUntil && <> · consent until {formatDay(item.validUntil)}</>}
      </div>
    </Card>
  </BankConnection.Smart>
);

export default React.memo(ConnectionCard);
