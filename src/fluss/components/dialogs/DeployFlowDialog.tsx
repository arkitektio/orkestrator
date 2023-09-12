import { useAlert } from "../../../components/alerter/alerter-context";
import { TwDialog } from "../../../components/dialog/TwDialog";
import { FittingResponsiveContainerGrid } from "../../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../../floating/utils";
import { Submit } from "../../../providers/dialog/DialogProvider";
import { useRekuest, withRekuest } from "../../../rekuest";
import {
  useDetailNodeQuery,
  useReservationsQuery,
} from "../../../rekuest/api/graphql";
import { ReservationPulse } from "../../../rekuest/components/generic/StatusPulse";
import { useRequester } from "../../../rekuest/providers/requester/requester-context";
import { useReserver } from "../../../rekuest/providers/reserver/reserver-context";
import { useSettings } from "../../../settings/settings-context";

export const ResCard = ({
  res,
  flow,
  submit,
}: {
  res: any;
  flow: string;
  submit: (endstadt: any) => void;
}) => {
  const { assign } = useRequester();
  const { client } = useRekuest();

  return (
    <div
      className={`border-1 border-back-800 border p-3 rounded rounded-md  cursor-pointer bg-back-800 hover:bg-back-900 @container flex w-full flex-col`}
      onClick={async () => {
        await assign({
          reservation: res,
          defaults: { flow: flow },
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));
        client?.refetchQueries({ include: ["ThisFilteredReservations"] });
        submit({});
      }}
    >
      <div className="flex flex-row justify-between ">
        <div className="text-sm font-bold">{res?.title || res?.node?.name}</div>
        <ReservationPulse status={res.status} />
      </div>
    </div>
  );
};

const DeployerButton = () => {
  const { data } = withRekuest(useDetailNodeQuery)({
    variables: {
      hash: "7c7def6a3c09795d80078525432ee4905349779fd518af92531776c342c538fb",
    },
  });

  const { reserve } = useReserver();

  return (
    <>
      {data?.node?.id && (
        <button
          onClick={() => reserve({ node: data?.node?.id })}
          className="w-full mt-2 rounded bg-back-800 text-white p-2 hover:bg-back-700"
        >
          Reserve a new Deployer
        </button>
      )}
    </>
  );
};

export const DeployFlowDialog = (props: Submit<{}> & { flow: string }) => {
  const { alert } = useAlert();
  const { settings } = useSettings();
  const { data } = withRekuest(useReservationsQuery)({
    variables: {
      instanceId: settings.instanceId,
    },
  });

  const reservations = data?.reservations
    ?.filter(notEmpty)
    .filter((res) => res?.node?.args?.at(0)?.identifier == "@fluss/flow");

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
          {reservations && reservations.length > 0 ? (
            <FittingResponsiveContainerGrid fitLength={reservations.length}>
              {reservations?.filter(notEmpty).map((res, index) => (
                <ResCard
                  res={res}
                  flow={props.flow}
                  key={index}
                  submit={props.submit}
                />
              ))}
            </FittingResponsiveContainerGrid>
          ) : (
            <>
              <div className="mt-2 text-sm mb-3 border-red-600 border rounded text-red-800 border-1 p-2">
                You have not registered any apps that can be used to run your
                workflow. Please reserve an app that can run your workflow
                first.
              </div>
            </>
          )}
        </>
        <DeployerButton />
      </div>
    </TwDialog>
  );
};
