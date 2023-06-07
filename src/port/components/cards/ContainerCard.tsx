import { useDatalayer } from "@jhnnsrs/datalayer";
import { useConfirm } from "../../../components/confirmer/confirmer-context";
import { Container } from "../../../linker";
import { useReleaseQuery } from "../../../lok/api/graphql";
import { withMan } from "../../../lok/man";
import { MateFinder } from "../../../mates/types";
import { ContainerStatus, ListContainerFragment } from "../../api/graphql";

interface UserCardProps {
  container: ListContainerFragment;
  mates: MateFinder[];
}

export const containerStateToStyle = (
  state: ContainerStatus | null | undefined
) => {
  switch (state) {
    case ContainerStatus.Created:
      return "border-green-500 shadow-green-500/50";
    case ContainerStatus.Running:
      return "border-green-500 shadow-green-500/50";
    case ContainerStatus.Paused:
      return "border-yellow-500 shadow-yellow-500/50";
    case ContainerStatus.Restarting:
      return "border-yellow-500 shadow-yellow-500/50";
    case ContainerStatus.Removing:
      return "border-red-500 shadow-red-500/50";
    case ContainerStatus.Exited:
      return "border-red-500 shadow-red-500/50";
    case ContainerStatus.Dead:
      return "border-red-500";
    default:
      return "border-gray-500";
  }
};

export const ContainerCard = ({ container, mates }: UserCardProps) => {
  const { confirm } = useConfirm();

  const { data } = withMan(useReleaseQuery)({
    variables: {
      identifier: container?.whale?.deployment?.identifier,
      version: container?.whale?.deployment?.version,
    },
  });

  const { s3resolve } = useDatalayer();

  return (
    <Container.Smart
      object={container.id}
      className={`max-w-sm rounded bg-slate-800 shadow-md border border-1 text-white group ${containerStateToStyle(
        container.status
      )}`}
      mates={mates}
    >
      <div className="p-2 ">
        {data?.release && (
          <img
            className="h-10 w-10 rounded-md"
            src={
              data?.release?.logo
                ? s3resolve(data?.release?.logo)
                : `https://eu.ui-avatars.com/api/?name=${data?.release?.app?.identifier}&background=random`
            }
            alt=""
          />
        )}
        <div className="flex">
          <span className="flex-grow font-semibold text-xs">
            {container.status}
          </span>
        </div>
        <Container.DetailLink
          className="text-xl font-light cursor-pointer mb-1"
          object={container?.id}
        >
          <div className="text-xl font-light mb-1 flex">
            {container?.whale?.deployment.identifier}:
            {container?.whale?.deployment.version}
          </div>
        </Container.DetailLink>
      </div>
      <div className="pl-2 pb-2"></div>
    </Container.Smart>
  );
};
