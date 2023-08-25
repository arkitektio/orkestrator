import { useParams } from "react-router";
import { notEmpty } from "../../../floating/utils";
import { FlussAssignation } from "../../../fluss/components/FlussAssignation";
import { PageLayout } from "../../../layout/PageLayout";
import { SectionTitle } from "../../../layout/SectionTitle";
import { RekuestAssignation } from "../../../linker";
import { withRekuest } from "../../RekuestContext";
import {
  AssignationLogLevel,
  useDetailAssignationQuery,
} from "../../api/graphql";
import { UserImage } from "../../components/TemplatesDisplay";
import { AssignationPuls } from "../../components/generic/StatusPulse";
import { WidgetsContainer } from "../../widgets/containers/ReturnWidgetsContainer";

export type IAssignationProps = {
  id: string;
};

export const DashboardAssignation: React.FC = ({}) => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <>ssss</>;

  const { data, subscribeToMore } = withRekuest(useDetailAssignationQuery)({
    variables: { id: id },
  });

  if (data?.assignation?.reservation?.node?.interfaces?.includes("workflow"))
    return <FlussAssignation assignation={data?.assignation} />;

  return (
    <PageLayout
      sidebars={[
        {
          label: "Assignation",
          key: "assignation",
          content: <RekuestAssignation.Komments object={id} />,
        },
      ]}
    >
      <div className="flex-initial"></div>
      <div className="flex-1 flex flex-col bg-slate-200 rounded rounded-md p-3">
        <div className="flex-1">
          <div className="flex flex-row">
            <div className="flex-initial my-auto mr-2">Run by</div>
            <div className="flex-initial relative  my-auto">
              {data?.assignation?.creator?.sub && (
                <UserImage sub={data?.assignation?.creator?.sub} />
              )}
            </div>
          </div>

          <div className="flex flex-row">
            <div className="flex-initial">
              {data?.assignation?.status}{" "}
              <AssignationPuls status={data?.assignation?.status} />
              {data?.assignation?.statusmessage}
            </div>
          </div>
        </div>
        {data?.assignation?.log && data.assignation.log.length > 0 && (
          <div className="flex-1  grid grid-cols-1 bg-gray-700 rounded p-5 overflow-scroll">
            {data?.assignation?.log?.map((log) => (
              <div className="cols-span-1 text-white">
                {log?.level === AssignationLogLevel.Info && (
                  <span className="text-gray-300 font-semibold">
                    INFO : {log?.message}{" "}
                  </span>
                )}
                {log?.level === AssignationLogLevel.Debug && (
                  <span className="text-yellow-300 font-semibold">
                    DEBUG : {log?.message}
                  </span>
                )}
                {log?.level === AssignationLogLevel.Warn && (
                  <span className="text-yellow-200 font-semibold">
                    WARN : {log?.message}
                  </span>
                )}
                {log?.level === AssignationLogLevel.Error && (
                  <span className="text-red-800 font-semibold">
                    CRITICAL : {log?.message}
                  </span>
                )}
                {log?.level === AssignationLogLevel.Yield && (
                  <span className="text-yellow-200 font-semibold">
                    YIELD : {log?.message}
                  </span>
                )}
                {log?.level === AssignationLogLevel.Return && (
                  <span className="text-green-200 font-semibold">
                    RETURN : {log?.message}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="@lg:flex-row flex-shrink flex flex-col gap-2 mt-2">
        <div className="flex-1 flex-col flex gap-2">
          <div className="flex-initial">
            <SectionTitle>Ins</SectionTitle>
          </div>
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

        <div className="flex-1 flex-col flex gap-2">
          <div className="flex-initial">
            <SectionTitle>Outs</SectionTitle>
          </div>
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

      <div className="flex-grow"></div>
    </PageLayout>
  );
};
