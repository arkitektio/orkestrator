import React from "react";
import { Badge } from "@/components/ui/badge";
import { buildAssignInput } from "@/rekuest/assign";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KabinetFlavour } from "@/linkers";
import {
  DemandKind,
  ListImplementationFragment,
  PortKind,
  useImplementationsQuery,
} from "@/rekuest/api/graphql";
import { useLiveTask } from "@/rekuest/hooks/useTasks";
import { useImplementationAction } from "@/rekuest/hooks/useImplementationAction";
import { ListFlavourFragment } from "../../api/graphql";
import { logoFor, releaseIdentity } from "../../appIdentity";
import { AppIcon } from "../AppIcon";

interface Props {
  item: ListFlavourFragment;

}

export const AssignButton = (props: {
  template: ListImplementationFragment;
  release: string;
}) => {
  const { assign, implementation } = useImplementationAction(
    {
      id: props.template.id,
    },
  );

  const doassign = async () => {
    const argKey = implementation?.action.args.at(0)?.key;
    if (!argKey) {
      return;
    }

    console.log(
      await assign(buildAssignInput({
        args: {
          [argKey]: { object: props.release , __identifier: KabinetFlavour.identifier },
        },
      })),
    );
  };

  return (
    <DropdownMenuItem onSelect={doassign}>
      Install on {props.template.agent.name}
    </DropdownMenuItem>
  );
};

/**
 * Rendered only inside the opened `DropdownMenuContent` (Radix unmounts it when
 * closed), so the implementations query fires on open rather than once per
 * card on mount.
 */
export const FlavourInstallTargets = (props: { flavour: string }) => {
  const { data } = useImplementationsQuery({
    variables: {
      filters: {
        action: {
          demands: [
            {
              kind: DemandKind.Args,
              matches: [
                {
                  at: 0,
                  kind: PortKind.Structure,
                  identifier: "@kabinet/flavour",
                },
              ],
            },
            {
              kind: DemandKind.Returns,
              matches: [
                {
                  at: 0,
                  kind: PortKind.Structure,
                  identifier: "@kabinet/pod",
                },
              ],
            },
          ],
        },
      },
    },
  });

  return (
    <>
      {data?.implementations.length === 0 && (
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          No installers found. Install an engine first.
        </div>
      )}
      {data?.implementations.map((t) => (
        <AssignButton template={t} release={props.flavour} key={t.id} />
      ))}
    </>
  );
};

export const FlavourInstallButton = (props: { item: { id: string } }) => {
  return (
    <div className="flex flex-row gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Install
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right">
          <FlavourInstallTargets flavour={props.item.id} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

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
  const { progress } = useLiveTask({
    identifier: "@kabinet/flavour",
    object: item.id,
  });
  // A flavour is one build of an app, so it wears the app's identity — with its
  // own logo preferred, since that is the one specific to this build.
  const app = { ...releaseIdentity(item.release), logo: logoFor(item) ?? undefined };

  return (
    <KabinetFlavour.Smart object={item} >
      <Card
        className="group transition-all duration-300 ease-in-out aspect-square"
        style={{
          backgroundSize: `${progress || 0}% 100%`,
          backgroundImage: `linear-gradient(to right, #10b981 ${progress}%, #10b981 ${progress}%)`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "left center",
        }}
      >
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
            <FlavourInstallButton item={item} />
          </CardTitle>
        </CardHeader>
      </Card>
    </KabinetFlavour.Smart>
  );
};

export default React.memo(TheCard);