import { notEmpty } from "../../../floating/utils";
import { Submit } from "../../../layout/dialog/DialogProvider";
import { TwDialog } from "../../../layout/dialog/TwDialog";
import { useCreatePrivateClientMutation } from "../../../lok/api/graphql";
import { withMan } from "../../../lok/context";
import {
  DetailWhaleFragment,
  useCreateWhaleMutation,
  useDetailDeploymentQuery,
  WhalesDocument,
} from "../../api/graphql";
import { withPort } from "../../PortContext";

export type IMyWhalesProps = {};

export const DeployDialog = (
  props: Submit<DetailWhaleFragment> & { scan: string }
) => {
  const { data } = withPort(useDetailDeploymentQuery)({
    variables: { id: props.scan },
  });

  const [createClient] = withMan(useCreatePrivateClientMutation)({});
  const [createWhale] = withPort(useCreateWhaleMutation)({
    refetchQueries: [WhalesDocument],
  });

  const dostuff = async () => {
    if (data?.deployment) {
      const app = await createClient({
        variables: {
          identifier: data?.deployment?.identifier,
          version: data?.deployment?.version,
          scopes: data?.deployment?.scopes.filter(notEmpty),
          logoUrl: data?.deployment?.originalLogo,
        },
      });

      if (app?.data?.createPrivateClient?.token && data?.deployment?.image) {
        const res = await createWhale({
          variables: {
            clientId: app?.data?.createPrivateClient.id,
            token: app?.data?.createPrivateClient.token,
            deployment: data?.deployment?.id,
          },
        });

        console.log("res", res);

        if (res.data?.createWhale) {
          props.submit(res.data?.createWhale);
        }
      }
    }
  };

  return (
    <TwDialog
      title="Create App"
      buttons={
        <>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 focus:outline-none hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
            onClick={() => props.reject()}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => dostuff()}
            className="mt-3 w-full inline-flex rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-800 disabled:opacity-30"
          >
            Submit
          </button>
        </>
      }
    >
      <span className="font-light text-xl text-black">
        <div className="font-light text-sm mb-2">
          This repo would like to create an App on your behalf
        </div>
      </span>
    </TwDialog>
  );
};
