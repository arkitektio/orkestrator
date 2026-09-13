import React from "react";
import { Badge } from "@/components/ui/badge";
import { buildAssignInput } from "@/rekuest/assign";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
const InstallTargets = (props: { flavour: string }) => {
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
      {data?.implementations.map((t) => (
        <AssignButton template={t} release={props.flavour} key={t.id} />
      ))}
    </>
  );
};

const InstallDialog = (props: { item: { id: string } }) => {
  return (
    <div className="flex flex-row gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="outline" size="sm">
            Install
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right">
          <InstallTargets flavour={props.item.id} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const DelegatingSelector = (props: {
  selector: ListFlavourFragment["selectors"][0];
}) => {
  if (props.selector.__typename == "CudaSelector") {
    return <div> Cuda </div>;
  }

  if (props.selector.__typename == "RocmSelector") {
    return <div> Cpu </div>;
  }

  return <> Unknown </>;
};

const TheCard = ({ item }: Props) => {
  const { progress } = useLiveTask({
    identifier: "@kabinet/flavour",
    object: item.id,
  });

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
            <CardTitle>
              <KabinetFlavour.DetailLink object={item}>
                {" "}
                {item.release.app.identifier}:{item.release.version}-{item.name}
              </KabinetFlavour.DetailLink>
            </CardTitle>
            {item.selectors.map((selector) => (
              <Badge className=" text-white bg-gray-700">
                <DelegatingSelector selector={selector} />
              </Badge>
            ))}
          </div>

          <CardTitle>
            <InstallDialog item={item} />
          </CardTitle>
        </CardHeader>
      </Card>
    </KabinetFlavour.Smart>
  );
};

export default React.memo(TheCard);