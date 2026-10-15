import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import React from "react";
import { Card, CardFooter, CardHeader, CardTitle } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import { RekuestAgent } from "@/core/linkers";

import { ListAgentFragment } from "@/rekuest/api/graphql";
import { AgentLogo } from "@/rekuest/components/logo/BlokLogo";

interface Props {
  item: ListAgentFragment;

}

const TheCard = ({ item }: Props) => {
  return (
    <RekuestAgent.Smart object={item} hover>
      <Card
        className={cn(
          "group aspect-square flex flex-col relative overflow-visible",
          item.active && "dark:border-primary border ",
        )}
      >
        <CardHeader className="flex-grow">
          <CardTitle className="flex items-start gap-2">
            <AgentLogo agent={item} className="h-8 w-8" />
            <RekuestAgent.DetailLink object={item}>
              {" "}
              <h1 className="flex-wrap break-all">{item.app.identifier}</h1>
              <h2 className="text-sm text-muted-foreground">{item.release.version}</h2>
            </RekuestAgent.DetailLink>
          </CardTitle>
        </CardHeader>
        <CardFooter>
        </CardFooter>

        {item.device && (
          <StructureDisplay
            identifier="@lok/device"
            by="nodeId"
            id={item.device.deviceId}
            variant="inline"
            className="absolute bottom-0 left-1/2 mx-0 w-auto max-w-[80%] -translate-x-1/2 translate-y-1/2 justify-center"
          />
        )}
      </Card>
    </RekuestAgent.Smart>
  );
};

export default React.memo(TheCard);