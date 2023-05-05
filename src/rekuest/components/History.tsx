import { Link } from "react-router-dom";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { Assignation } from "../../linker";
import { useAssignationMate } from "../../mates/assignation/useAssignationMates";
import { withRekuest } from "../RekuestContext";
import {
  AssignationStatusInput,
  useRequestsHistoryQuery,
} from "../api/graphql";
import { colorFromAssignationStatus } from "../utils";

export const History = () => {
  const { data } = withRekuest(useRequestsHistoryQuery)({
    variables: {
      limit: 100,
      filter: [
        AssignationStatusInput.Assigned,
        AssignationStatusInput.Yield,
        AssignationStatusInput.Progress,
      ],
    },
  });

  const assignationMate = useAssignationMate();

  return (
    <PageLayout>
      <SectionTitle>Latest Tasks</SectionTitle>
      <div className="mt-2 mb-4">
        <ResponsiveContainerGrid>
          {!data?.myrequests && (
            <div
              key={1}
              className={`max-w-sm rounded overflow-hidden p-2 font-light shadow-md blink animate-pulse bg-gray-400`}
            >
              Loading...
            </div>
          )}
          {data?.myrequests?.filter(notEmpty).map((ass, index) => (
            <Assignation.Smart
              object={ass.id}
              dragClassName={() =>
                `relative rounded shadow-xl border  shadow-md bg-center bg-cover group text-white ${colorFromAssignationStatus(
                  ass?.status
                )}`
              }
              key={index}
              mates={[assignationMate(ass)]}
            >
              <div
                className={`absolute top-0 left-0 h-full bg-orange-300 border-orange-300 rounded transition-width duration-100 ease-in-out`}
                style={{
                  zIndex: -100,
                  width: `${ass.progress ? Math.floor(ass.progress) : 0}%`,
                }}
              ></div>
              <div className="p-2 justify-between flex">
                <Assignation.DetailLink
                  object={ass.id}
                  className="text-xl font-light mb-2 cursor-pointer"
                >
                  {ass?.reservation?.title || ass?.reservation?.node?.name}{" "}
                </Assignation.DetailLink>
                <Link
                  to={`/user/mikro/provenances/${ass.id}`}
                  className="text-xl font-light mb-2 cursor-pointer"
                >
                  Open Prov
                </Link>
              </div>
              <div className="ml-2 pb-2 text-sm"></div>
            </Assignation.Smart>
          ))}
        </ResponsiveContainerGrid>
      </div>
    </PageLayout>
  );
};
