import { Maybe } from "graphql/jsutils/Maybe";
import React, { useEffect } from "react";
import { useParams } from "react-router";
import { NodeActions } from "../../../actions/NodeActions";
import { ResponsiveGrid } from "../../../components/layout/ResponsiveGrid";
import { notEmpty } from "../../../floating/utils";
import { PageLayout } from "../../../layout/PageLayout";
import {
  RekuestCollection,
  RekuestNode,
  RekuestProtocol,
} from "../../../linker";
import { withRekuest } from "../../../rekuest";
import {
  ChildPortFragment,
  DetailNodeEventDocument,
  DetailNodeEventSubscriptionResult,
  DetailNodeQuery,
  NodeKind,
  PortFragment,
  PortKind,
  Scope,
  useDetailNodeQuery,
} from "../../../rekuest/api/graphql";
import { NodeDescription } from "../../../rekuest/components/NodeDescription";
import { TemplateCard } from "../../../rekuest/components/cards/TemplateCard";
import { ExperimentalFeature } from "../../../settings/Experimental";

export type INodeScreenProps = {};

export const childMapper = (port: Maybe<ChildPortFragment>) => {
  switch (port?.kind) {
    case PortKind.List:
      return (
        <div className="flex flex-row">
          <div
            className={` ${
              port.scope == Scope.Global ? "bg-primary-300" : "bg-primary-400"
            } rounded shadow-md text-xs text-white p-2 mr-2 my-auto flex-row`}
          >
            <div>List of </div>
            {port.child && childMapper(port?.child as ChildPortFragment)}
          </div>
        </div>
      );
    default:
      return (
        <div className="bg-primary-300 rounded shadow-md text-xs text-white p-1 mr-2 my-auto">
          {port?.identifier || port?.kind}
        </div>
      );
  }
};

export const portMapper = (port: Maybe<PortFragment>): React.ReactNode => {
  switch (port?.kind) {
    case PortKind.List:
      return (
        <div className="flex flex-row">
          <div
            className={` ${
              port.scope == Scope.Global ? "bg-primary-300" : "bg-primary-400"
            } rounded shadow-md text-xs text-white p-2 mr-2 my-auto flex-row`}
          >
            {port.nullable && "?"}
            <div className="my-auto mr-3">List of</div>{" "}
            {childMapper((port as any).child)}
          </div>
          <div className="font-semibold my-auto">{port?.label || port.key}</div>
          {port.assignWidget?.__typename && (
            <div className="ml-2 my-auto">{port.assignWidget?.__typename}</div>
          )}
          {port.returnWidget?.__typename && (
            <div className="ml-2 my-auto">{port.returnWidget?.__typename}</div>
          )}
        </div>
      );
    case PortKind.Union:
      return (
        <div className="flex flex-row">
          <div
            className={` ${
              port.scope == Scope.Global ? "bg-primary-300" : "bg-primary-400"
            } rounded shadow-md text-xs text-white p-2 mr-2 my-auto flex-row`}
          >
            {port.nullable && "?"}
            <div className="my-auto mr-3">Union of</div>{" "}
            {port.variants?.map((v) => childMapper(v))}
          </div>
          <div className="font-semibold my-auto">{port?.label || port.key}</div>
          {port.assignWidget?.__typename && (
            <div className="ml-2 my-auto">{port.assignWidget?.__typename}</div>
          )}
          {port.returnWidget?.__typename && (
            <div className="ml-2 my-auto">{port.returnWidget?.__typename}</div>
          )}
        </div>
      );
    case PortKind.Dict:
      return (
        <div className="flex flex-row">
          <div
            className={` ${
              port.scope == Scope.Global ? "bg-primary-300" : "bg-primary-400"
            } rounded shadow-md text-xs text-white p-2 mr-2 my-auto flex-row`}
          >
            {port.nullable && "?"}
            <div className="my-auto mr-3">Map of</div>{" "}
            {childMapper((port as any).child)}
          </div>
          <div className="font-semibold my-auto">{port?.label || port.key}</div>
          <div className="ml-2 my-auto">{port?.description}</div>
          {port.assignWidget?.__typename && (
            <div className="ml-2 my-auto">{port.assignWidget?.__typename}</div>
          )}
        </div>
      );
    default:
      return (
        <div className="flex flex-row">
          <div
            className={` ${
              port?.scope == Scope.Global ? "bg-primary-300" : "bg-primary-400"
            } rounded shadow-md text-xs text-white p-2 mr-2 my-auto flex-row`}
          >
            {port?.nullable && "?"}
            {port?.identifier || port?.kind}
          </div>
          <div className="font-semibold my-auto">
            {port?.label || port?.key}
          </div>
          <div className="ml-2 my-auto">{port?.description}</div>

          <ExperimentalFeature>
            {port?.assignWidget?.__typename && (
              <div className="ml-2 my-auto">
                {port.assignWidget?.__typename}
              </div>
            )}
            {port?.returnWidget?.__typename && (
              <div className="ml-2 my-auto">
                {port?.returnWidget?.__typename}
              </div>
            )}
          </ExperimentalFeature>
        </div>
      );
  }
};

const DashboardNode: React.FC<INodeScreenProps> = (props) => {
  let { id } = useParams<{ id: string }>();
  const { data, subscribeToMore } = withRekuest(useDetailNodeQuery)({
    variables: { id: id },
  });

  useEffect(() => {
    console.log("Subscribing to MsyReservations");
    const unsubscribe = subscribeToMore({
      document: DetailNodeEventDocument,
      variables: {
        id: id,
      },
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received MyNode Event", subscriptionData);
        var data = subscriptionData as DetailNodeEventSubscriptionResult;
        let action = data.data?.nodeEvent;
        return {
          ...prev,
          node: action,
        } as DetailNodeQuery;
      },
    });
    return () => unsubscribe();
  }, [id, subscribeToMore]);

  const copyHashToClipboard = () => {
    navigator.clipboard.writeText(data?.node?.hash || "");
  };

  return (
    <PageLayout actions={<NodeActions node={data?.node} />}>
      <div className="flex-initial text-white">
        <div className="flex flex-row">
          <div className="flex-initial">
            <div className="flex flex-row">
              <div
                className="font-light text-2xl"
                onClick={copyHashToClipboard}
              >
                {data?.node?.name}
              </div>
            </div>
          </div>
          <div className="flex-grow"></div>
          <div className="flex-none">
            <div className="flex flex-row gap-2">
              {data?.node?.interfaces?.map((i) => (
                <div className="border-primary-300 p-1 border rounded-md bg-primary-300 text-white">
                  {" "}
                  {i}{" "}
                </div>
              ))}
            </div>
          </div>
          <div className="flex-none">
            <div className="flex flex-row gap-2">
              {data?.node?.collections?.map((i) => (
                <RekuestCollection.DetailLink
                  object={i.id}
                  className="border-primary-300 p-1 border rounded-md bg-primary-300 text-white"
                >
                  {" "}
                  {i.name}{" "}
                </RekuestCollection.DetailLink>
              ))}
            </div>
          </div>
          {data?.node?.isTestFor && (
            <div className="flex-none">
              {data?.node?.isTestFor.filter(notEmpty).map((n) => {
                return (
                  <RekuestNode.DetailLink
                    className="flex flex-row gap-2"
                    object={n.id}
                  >
                    <div className="border-primary-300 p-1 border rounded-md bg-primary-300 text-white">
                      {" "}
                      Tests: {n.name}{" "}
                    </div>
                  </RekuestNode.DetailLink>
                );
              })}
            </div>
          )}
          {data?.node?.tests && (
            <div className="flex-none">
              {data?.node?.tests.filter(notEmpty).map((n) => {
                return (
                  <RekuestNode.DetailLink
                    className="flex flex-row gap-2"
                    object={n.id}
                  >
                    <div className="border-primary-300 p-1 border rounded-md bg-primary-300 text-white">
                      {" "}
                      Tested by: {n.name}{" "}
                    </div>
                  </RekuestNode.DetailLink>
                );
              })}
            </div>
          )}
          {data?.node?.protocols && (
            <div className="flex-none">
              {data?.node?.protocols?.filter(notEmpty).map((n) => {
                return (
                  <RekuestProtocol.DetailLink
                    className="flex flex-row gap-2"
                    object={n.id}
                  >
                    <div className="border-primary-300 p-1 border rounded-md bg-primary-300 text-white">
                      {" "}
                      Fulfills {n.name}{" "}
                    </div>
                  </RekuestProtocol.DetailLink>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="flex-grow mt-2 max-w-md">
        <div className="flex flex-row">
          <div className="flex-initial flex-col">
            <div className=" dark:bg-slate-100 dark:text-black rounded shadow-md p-2 mt-2">
              {data?.node?.description && (
                <NodeDescription description={data?.node?.description} />
              )}
            </div>
            <div className=" dark:bg-slate-100 dark:text-black rounded shadow-md p-2 mt-2">
              {data?.node?.args && data?.node.args.length > 0 && (
                <div className="font-light mb-1"> Arguments </div>
              )}
              <div className="flex flex-col gap-2">
                {data?.node?.args?.map(portMapper)}
              </div>
              {data?.node?.returns && data?.node.returns.length > 0 && (
                <div className="font-light mt-3 mb-1">
                  {" "}
                  {data?.node?.kind == NodeKind.Function
                    ? "Returns"
                    : "Streams"}{" "}
                </div>
              )}
              <div className="flex flex-col gap-2">
                {data?.node?.returns?.map(portMapper)}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-initial">
        <div className="font-light mt-3 mb-1 text-xl text-white">
          {" "}
          Implemented by{" "}
        </div>
        <ResponsiveGrid>
          {data?.node?.templates?.filter(notEmpty).map((template, index) => (
            <TemplateCard template={template} key={index} />
          ))}
        </ResponsiveGrid>
      </div>
    </PageLayout>
  );
};

export { DashboardNode };
