import { useAlert } from "../../../components/alerter/alerter-context";
import { notEmpty } from "../../../floating/utils";
import { Submit } from "../../../layout/dialog/DialogProvider";
import { TwDialog } from "../../../layout/dialog/TwDialog";
import { useDetailClientQuery } from "../../../lok/api/graphql";
import { ClientCard } from "../../../lok/components/cards/ClientCard";
import { withMan } from "../../../lok/man";
import { withRekuest } from "../../../rekuest";
import {
  ListProvisionFragment,
  useDeployReservationsQuery,
} from "../../../rekuest/api/graphql";
import { ReservationPulse } from "../../../rekuest/components/generic/StatusPulse";
import { useRequester } from "../../../rekuest/postman/requester/requester-context";
import { useReserver } from "../../../rekuest/postman/reserver/reserver-context";

export const ClientX = (props: { id: string }) => {
  const { data } = withMan(useDetailClientQuery)({
    variables: { clientId: props.id },
  });

  return (
    <div className="flex flex-row">
      {data?.client && <ClientCard client={data?.client} />}
    </div>
  );
};

export const ResCard = ({ res, flow }: { res: any; flow: string }) => {
  const { assign } = useRequester();

  const { data } = withMan(useDetailClientQuery)({
    variables: { id: res.waiter?.clientId },
  });

  return (
    <div
      className={`border-1 border-back-999 border p-3 rounded rounded-md  cursor-pointer`}
      onClick={() => {
        assign({
          reservation: res,
          defaults: { flow: flow },
        });
      }}
    >
      <div className="flex flex-row justify-between ">
        <div className="text-sm font-bold">{res?.node?.name || res?.title}</div>
        <ReservationPulse status={res.status} />
      </div>
      <div className="flex flex-row justify-start mt-2">
        {res.provisions.map((provision: ListProvisionFragment) => (
          <div className="flex flex-row">
            <ClientX id={provision?.agent?.clientId} />
          </div>
        ))}
      </div>
    </div>
  );
};

export const DeployFlowDialog = (props: Submit<{}> & { flow: string }) => {
  const { alert } = useAlert();

  const { reservations, reserve } = useReserver();

  const { data } = withRekuest(useDeployReservationsQuery)({
    fetchPolicy: "network-only",
  });

  const deployRes = reservations?.reservations?.filter((res) =>
    res?.node?.interfaces?.includes("fluss:deploy")
  );

  return (
    <TwDialog
      title="Deploy your Workflow"
      buttons={
        <>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 focus:outline-none hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
            onClick={() => props.reject()}
          >
            Cancel
          </button>
        </>
      }
    >
      <div className="mt-2 align-left text-left">
        <>
          <div className="mt-2 text-sm mb-3">
            Deploying your workflow will make it available to be run by other
            users and yourself. In this dialog you can select which app will be
            used to run your worfklow.
          </div>
          {data?.reservations && data?.reservations.length > 0 ? (
            <div className="mt-2 text-sm mb-3">
              {data?.reservations?.filter(notEmpty).map((res) => (
                <div>
                  <ResCard res={res} flow={props.flow} />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-sm mb-3 border-red-600 border rounded text-red-800 border-1 p-2">
              You have not registered any apps that can be used to run your
              workflow. Please reserve an app that can run your workflow first.
            </div>
          )}
        </>
      </div>
    </TwDialog>
  );
};
