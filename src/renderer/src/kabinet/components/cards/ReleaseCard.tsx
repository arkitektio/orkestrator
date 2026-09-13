import React from "react";
import { buildAssignInput } from "@/rekuest/assign";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KabinetRelease } from "@/linkers";
import {
  DemandKind,
  ListImplementationFragment,
  PortKind,
  useImplementationsQuery,
} from "@/rekuest/api/graphql";
import { useLiveTask } from "@/rekuest/hooks/useTasks";
import { useImplementationAction } from "@/rekuest/hooks/useImplementationAction";
import { ListReleaseFragment } from "../../api/graphql";

interface Props {
  item: ListReleaseFragment;

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
          release: { object: props.release, __identifier: KabinetRelease.identifier},
        },
      })),
    );
  };

  return (
    <DropdownMenuItem onSelect={doassign} className="cursor-pointer">
      Install on {props.template.agent.name}
    </DropdownMenuItem>
  );
};

/**
 * Rendered only inside the opened `DropdownMenuContent` (Radix unmounts it when
 * closed), so the implementations query fires on open rather than once per
 * card on mount.
 */
const InstallTargets = (props: { release: string }) => {
  const { data, error } = useImplementationsQuery({
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
                  identifier: "@kabinet/release",
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
        <>No installers found. Please install an engine...</>
      )}
      {error && <div>Error: {error.message}</div>}
      {data?.implementations.map((t) => (
        <AssignButton template={t} release={props.release} key={t.id} />
      ))}
    </>
  );
};

const InstallDialog = (props: { item: ListReleaseFragment }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline" size="sm">
          Install
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right">
        <InstallTargets release={props.item.id} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const TheCard = ({ item }: Props) => {
  const { progress } = useLiveTask({
    identifier: "@kabinet/release",
    object: item.id,
  });

  return (
    <KabinetRelease.Smart object={item} >
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
          <div className="flex-grow">
            <CardTitle>
              <KabinetRelease.DetailLink object={item}>
                {" "}
                {item.app?.identifier}:{item.version}
              </KabinetRelease.DetailLink>
            </CardTitle>
            <CardDescription>{progress}</CardDescription>
          </div>
          <div>
            <InstallDialog item={item} />
          </div>
        </CardHeader>
      </Card>
    </KabinetRelease.Smart>
  );
};

export default React.memo(TheCard);