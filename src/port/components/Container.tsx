import { useConfirm } from "../../components/confirmer/confirmer-context";
import { ActionButton } from "../../layout/ActionButton";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import {
  useDetailContainerQuery,
  useStopContainerMutation,
  useRestartContainerMutation,
  useRemoveContainerMutation,
} from "../api/graphql";
import { withPort } from "../PortContext";

export type ContainerProps = {
  id: string;
};

export const Container = (props: ContainerProps) => {
  const { data } = withPort(useDetailContainerQuery)({
    variables: { id: props.id },
    pollInterval: 1000,
  });

  const { confirm } = useConfirm();

  const [restart] = withPort(useRestartContainerMutation)();
  const [stop] = withPort(useStopContainerMutation)();
  const [remove] = withPort(useRemoveContainerMutation)();

  return (
    <PageLayout
      actions={
        <>
          <ActionButton
            label="Restart"
            description="Restarts the container. All assigned tasks will be rescheduled"
            onAction={async () => {
              await confirm({
                message: `Are you sure you want to restart container ${data?.container?.name}?`,
              });
              await restart({ variables: { id: props.id } });
            }}
          />
          <ActionButton
            label="Stop"
            description="Stops the container. Until the container is restarted, no tasks will be scheduled"
            onAction={async () => {
              await confirm({
                message: `Are you sure you want to stop this container ${data?.container?.name}?`,
              });
              await stop({ variables: { id: props.id } });
            }}
          />
          <ActionButton
            label="Remove"
            description="Removes the container. All tasks will be removed"
            onAction={async () => {
              await confirm({
                message: `Are you sure you want to remove this container ${data?.container?.name}?`,
              });
              await remove({ variables: { id: props.id } });
            }}
          />
        </>
      }
    >
      <SectionTitle>Container {data?.container?.name}</SectionTitle>
      <div className="text-white">
        <div className="text-2xl">
          Container hosting {data?.container?.whale?.image}
        </div>
        <div className="text-sm flex flex-col">
          <div className="flex flex-row">
            <div className="w-1/2">Name</div>
            <div className="w-1/2">{data?.container?.name}</div>
          </div>
          <div className="flex flex-row">
            <div className="w-1/2">Container Status</div>
            <div className="w-1/2">{data?.container?.status}</div>
          </div>
          <div className="flex flex-row">
            <div className="w-1/2">Image</div>
            <div className="w-1/2">{data?.container?.image?.tags}</div>
          </div>
        </div>
        <div className="flex flex-row">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => {
              restart({
                variables: {
                  id: props.id,
                },
              });
            }}
          >
            Restart
          </button>
          <button
            className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => {
              stop({
                variables: {
                  id: props.id,
                },
              });
            }}
          >
            Stop
          </button>
          <button
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => {
              remove({
                variables: {
                  id: props.id,
                },
              });
            }}
          >
            Delete
          </button>
        </div>
        <div className="bg-black rounded-lg p-3">
          <pre>{data?.container?.logs}</pre>
        </div>
      </div>
    </PageLayout>
  );
};
