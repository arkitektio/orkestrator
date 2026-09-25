import React from "react";
import { Badge } from "@/core/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { PageSections } from "@/core/components/layout/PageSections";
import { KabinetFlavour } from "@/core/linkers";
import { ListFlavourFragment } from "../../api/graphql";
import { logoFor, releaseIdentity } from "../../appIdentity";
import { AppIcon } from "../AppIcon";

interface Props {
  item: ListFlavourFragment;

}

/** What a selector asks of the host, as a badge word. Shared with the repo's Info rail. */
export const selectorLabel = (
  selector: Pick<ListFlavourFragment["selectors"][number], "__typename">,
): string => {
  switch (selector.__typename) {
    case "CudaSelector":
      return "CUDA";
    case "RocmSelector":
      return "ROCm";
    case "CPUSelector":
      return "CPU";
    default:
      return selector.__typename?.replace(/Selector$/, "") ?? "Unknown";
  }
};

const TheCard = ({ item }: Props) => {
  // A flavour is one build of an app, so it wears the app's identity — with its
  // own logo preferred, since that is the one specific to this build.
  const app = { ...releaseIdentity(item.release), logo: logoFor(item) ?? undefined };

  return (
    <KabinetFlavour.Smart object={item} >
      {/* `relative isolate`: a card section may paint a fill behind the content
          (rekuest: install progress). */}
      <Card className="group relative isolate aspect-square overflow-hidden transition-all duration-300 ease-in-out">
        <CardHeader className="flex flex-col justify-between h-full">
          <div>
            <AppIcon app={app} size={48} className="mb-3 size-12" />
            <CardTitle>
              <KabinetFlavour.DetailLink object={item}>
                {item.name}
              </KabinetFlavour.DetailLink>
            </CardTitle>
            <CardDescription className="mb-2 font-mono text-xs">
              {item.release.app.identifier}:{item.release.version}
            </CardDescription>
            {item.selectors.map((selector, index) => (
              <Badge key={index} className=" text-white bg-gray-700">
                {selectorLabel(selector)}
              </Badge>
            ))}
          </div>

          <CardTitle>
            {/* Other modules on a flavour card (rekuest: Install). */}
            <PageSections placement="card" identifier="@kabinet/flavour" object={{ id: item.id }} />
          </CardTitle>
        </CardHeader>
      </Card>
    </KabinetFlavour.Smart>
  );
};

export default React.memo(TheCard);