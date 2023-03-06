import { useConfirm } from "../../components/confirmer/confirmer-context";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import { ActionButton } from "../../layout/ActionButton";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { Provision } from "../../linker";
import { useDetailApplicationQuery } from "../../lok/api/graphql";
import { withMan } from "../../lok/context";
import { withRekuest } from "../../rekuest";
import {
  useClientProvisionsQuery,
  useDetailAgentQuery,
  usePortAgentQuery,
} from "../../rekuest/api/graphql";
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

export const ContainerProvisions = (props: { clientId: string }) => {
  const { data } = withRekuest(useClientProvisionsQuery)({
    variables: { clientId: props.clientId },
    pollInterval: 1000,
  });

  return (
    <>
      <SectionTitle>Provisions on this container</SectionTitle>
      <ResponsiveContainerGrid>
        {data?.allprovisions?.filter(notEmpty).map((prov) => (
          <Provision.Smart object={prov.id} className="bg-black rounded p-3">
            <Provision.DetailLink object={prov.id}>
              {prov.id}
            </Provision.DetailLink>
          </Provision.Smart>
        ))}
      </ResponsiveContainerGrid>
    </>
  );
};

export const AgentInformation = (props: {
  clientId: string;
  instanceId: string;
}) => {
  const { data, error } = withRekuest(usePortAgentQuery)({
    variables: { clientId: props.clientId, instanceId: props.instanceId },
  });

  return (
    <>
      {data?.agent?.status}
      {JSON.stringify(error)}
    </>
  );
};

export const AppInformation = (props: { clientId: string }) => {
  const { data, error } = withMan(useDetailApplicationQuery)({
    variables: { clientId: props.clientId },
  });

  return (
    <>
      {data?.application?.name}
      {JSON.stringify(error)}
    </>
  );
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
        {data?.container?.whale?.clientId && (
          <AgentInformation
            clientId={data?.container?.whale?.clientId}
            instanceId={"main"}
          />
        )}
        {data?.container?.whale?.clientId && (
          <AppInformation clientId={data?.container?.whale?.clientId} />
        )}

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
          <div className="flex flex-row">
            <div className="w-1/2">Runtime</div>
            <div className="w-1/2">{data?.container?.whale?.runtime}</div>
          </div>
        </div>
        {data?.container?.whale?.clientId && (
          <ContainerProvisions clientId={data?.container?.whale?.clientId} />
        )}
        <div className="mt-3 bg-black rounded-lg p-3">
          <pre>{data?.container?.logs}</pre>
        </div>
      </div>
    </PageLayout>
  );
};
