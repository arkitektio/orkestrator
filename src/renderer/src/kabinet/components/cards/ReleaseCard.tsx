import React from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/core/ui/card";
import { PageSections } from "@/core/layout/PageSections";
import { KabinetRelease } from "@/core/linkers";
import { ListReleaseFragment } from "../../api/graphql";
import { releaseIdentity } from "../../appIdentity";
import { AppIcon } from "../AppIcon";
import { InstallButton } from "../store/StoreParts";

interface Props {
  item: ListReleaseFragment;

}

const TheCard = ({ item }: Props) => {
  const app = releaseIdentity(item);

  return (
    <KabinetRelease.Smart object={item} >
      {/* `relative isolate`: a card section may paint a fill behind the content. */}
      <Card className="group relative isolate aspect-square overflow-hidden transition-all duration-300 ease-in-out">
        <CardHeader className="flex flex-col justify-between h-full">
          <div className="flex-grow">
            <AppIcon app={app} size={48} className="mb-3 size-12" />
            <CardTitle>
              <KabinetRelease.DetailLink object={item}>
                {app.name}
              </KabinetRelease.DetailLink>
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              {item.app?.identifier}:{item.version}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <InstallButton release={item} />
            {/* Other modules on a release card. */}
            <PageSections placement="card" identifier="@kabinet/release" object={{ id: item.id }} />
          </div>
        </CardHeader>
      </Card>
    </KabinetRelease.Smart>
  );
};

export default React.memo(TheCard);