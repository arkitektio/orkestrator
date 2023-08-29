import { useEffect } from "react";
import { RekuestAssignation } from "../../../linker";
import { withRekuest } from "../../../rekuest";
import {
  AssignationStatus,
  NodeKind,
  useDetailAssignationLazyQuery,
} from "../../../rekuest/api/graphql";
import { AssignationPuls } from "../../../rekuest/components/generic/StatusPulse";
import { WidgetsContainer } from "../../../rekuest/widgets/containers/ReturnWidgetsContainer";
import { useSettings } from "../../../settings/settings-context";
import { notEmpty } from "../../utils";
import { useTrackRiver } from "../context";

export const ParamsSidebar = (props: {}) => {
  const { run, live } = useTrackRiver();
  const { settings } = useSettings();

  const [fetch, { data }] = withRekuest(useDetailAssignationLazyQuery)();

  useEffect(() => {
    if (run?.assignation) {
      fetch({ variables: { id: run?.assignation } });
    }
  }, [run]);

  useEffect(() => {
    let id = run?.assignation;
    if (id) {
      let interval = setInterval(() => {
        if (id) {
          fetch({ variables: { id: id } });
        }
      }, settings.pollInterval);

      return () => clearInterval(interval);
    }
  }, [run?.assignation, live]);

  return (
    <div className="h-full flex flex-col text-white p-3 overflow-y-auto">
      {run?.assignation && (
        <RekuestAssignation.DetailLink
          object={run.assignation}
          className="text-white flex-initial flex flex-row text-xl"
        >
          <AssignationPuls status={data?.assignation?.status} />
          <div className="ml-2">{data?.assignation?.status}</div>
        </RekuestAssignation.DetailLink>
      )}

      {data?.assignation?.statusmessage &&
        data?.assignation?.status == AssignationStatus.Critical && (
          <div className="rounded rounded-md bg-red-900 p-2 border-gray-800 border border-1 mt-2">
            {data?.assignation?.statusmessage}
          </div>
        )}

      <div className="flex-1 mt-2">
        Params
        <div className=" my-2">
          {data?.assignation?.reservation?.node?.args && (
            <WidgetsContainer
              ports={data?.assignation?.reservation?.node?.args.filter(
                notEmpty
              )}
              values={data?.assignation?.args || []}
            />
          )}
        </div>
        {data?.assignation?.reservation?.node?.kind == NodeKind.Function
          ? "Returns"
          : "Latest Yield"}
        <div className="my-2">
          {data?.assignation?.reservation?.node?.returns && (
            <WidgetsContainer
              ports={data?.assignation?.reservation?.node?.returns.filter(
                notEmpty
              )}
              values={data?.assignation?.returns || []}
            />
          )}
        </div>
      </div>

      <div className="flex-initial flex-col flex gap-2 mt-2">
        <div className="text-xl">Info</div>
        {data?.assignation?.creator?.sub && (
          <div className="flex flex-row gap-2 mt-2 ">
            <div className="text-white  my-auto">Assigned by</div>
            {data?.assignation?.creator?.sub}
          </div>
        )}
        {data?.assignation?.parent?.id && (
          <div className="flex flex-row gap-2 mt-2 ">
            <div className="text-white  my-auto">
              Assigned in the context of
            </div>
            <RekuestAssignation.DetailLink
              object={data?.assignation?.parent.id}
            >
              {data?.assignation?.parent?.reservation?.node?.name}
            </RekuestAssignation.DetailLink>
          </div>
        )}
      </div>
    </div>
  );
};
