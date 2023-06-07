import { useEffect } from "react";
import { Assignation } from "../../../linker";
import { withRekuest } from "../../../rekuest";
import { useDetailAssignationLazyQuery } from "../../../rekuest/api/graphql";
import { WidgetsContainer } from "../../../rekuest/widgets/containers/ReturnWidgetsContainer";
import { notEmpty } from "../../utils";
import { useTrackRiver } from "../context";

export const ParamsSidebar = (props: {}) => {
  const { run } = useTrackRiver();

  const [fetch, { data }] = withRekuest(useDetailAssignationLazyQuery)();

  useEffect(() => {
    if (run?.assignation) {
      fetch({ variables: { id: run?.assignation } });
    }
  }, [run]);

  return (
    <div className="h-full flex flex-col text-white p-3 overflow-y-auto">
      <div className="text-white flex-initial text-xl">Parameter</div>
      {run?.assignation && (
        <Assignation.DetailLink
          object={run.assignation}
          className="text-white flex-initial mt-2"
        >
          Open Assignation
        </Assignation.DetailLink>
      )}
      <div className="flex-1 flex-col flex gap-2 mt-2">
        <div className="flex-grow">
          {data?.assignation?.reservation?.node?.args && (
            <WidgetsContainer
              ports={data?.assignation?.reservation?.node?.args.filter(
                notEmpty
              )}
              values={data?.assignation?.args || []}
            />
          )}
        </div>
      </div>
    </div>
  );
};
