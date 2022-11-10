import { Maybe } from "graphql/jsutils/Maybe";
import React, { useEffect } from "react";
import { useParams } from "react-router";
import { NodeActions } from "../../../actions/NodeActions";
import {
  ArgPortFragment,
  ChildPortFragment,
  DetailNodeEventDocument,
  DetailNodeEventSubscriptionResult,
  DetailNodeQuery,
  NodeKind,
  PortKind,
  ReturnPortFragment,
  useDetailNodeQuery,
} from "../../../rekuest/api/graphql";
import { notEmpty } from "../../../floating/utils";
import { FlussNode } from "../../../fluss/components/FlussNode";
import { PageLayout } from "../../../layout/PageLayout";
import { Template } from "../../../linker";
import { withRekuest } from "../../../rekuest";

export type INodeScreenProps = {};

export const childMapper = (port: Maybe<ChildPortFragment>) => {
  switch (port?.kind) {
    case PortKind.List:
      return (
        <div className="flex flex-row">
          <div className="bg-secondary-400 rounded shadow-md text-xs text-white p-2 mr-2 my-auto flex-row">
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

export const portMapper = (
  port: Maybe<ArgPortFragment | ReturnPortFragment>
): React.ReactNode => {
  switch (port?.kind) {
    case PortKind.List:
      return (
        <div className="flex flex-row">
          <div className="bg-secondary-400 rounded shadow-md  text-white p-1 mr-2 my-auto flex flex-row">
            <div className="my-auto mr-3">List of</div>{" "}
            {childMapper((port as any).child)}
          </div>
          <div className="font-semibold my-auto">{port?.key}</div>
          <div className="ml-2 my-auto">{port?.description}</div>
        </div>
      );
    case PortKind.Dict:
      return (
        <div className="flex flex-row">
          <div className="bg-secondary-400 rounded shadow-md  text-white  mr-2 my-auto flex flex-row">
            <div className="my-auto mr-3">Map of</div>{" "}
            {childMapper((port as any).child)}
          </div>
          <div className="font-semibold my-auto">{port?.key}</div>
          <div className="ml-2 my-auto">{port?.description}</div>
          {port.widget?.__typename && (
            <div className="ml-2 my-auto">{port.widget?.__typename}</div>
          )}
        </div>
      );
    default:
      return (
        <div className="flex flex-row">
          <div className="bg-primary-200 rounded shadow-md text-xs text-black p-2 mr-2 my-auto">
            {port?.identifier || port?.kind}
          </div>
          <div className="font-semibold my-auto">{port?.key}</div>
          <div className="ml-2 my-auto">{port?.description}</div>
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

  return (
    <PageLayout actions={<NodeActions node={data?.node} />}>
      <div className="flex-initial text-white">
        <div className="flex flex-row">
          <div className="flex-initial">
            <div className="flex flex-row">
              <div className="font-light text-2xl">{data?.node?.name}</div>
              <div className="font-light mt-auto ml-4 ">{data?.node?.hash}</div>
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
        </div>
      </div>
      <div className="flex-grow mt-2 max-w-md">
        <div className="flex flex-row">
          <div className="flex-initial flex-col">
            <div className=" dark:bg-slate-100 dark:text-black rounded shadow-md p-2 mt-2">
              {data?.node?.description}
            </div>
            <div className=" dark:bg-slate-100 dark:text-black rounded shadow-md p-2 mt-2">
              {data?.node?.args && data?.node.args.length > 0 && (
                <div className="font-light mb-1"> Arguments </div>
              )}
              {data?.node?.args?.map(portMapper)}
              {data?.node?.returns && data?.node.returns.length > 0 && (
                <div className="font-light mt-3 mb-1">
                  {" "}
                  {data?.node?.kind == NodeKind.Function
                    ? "Returns"
                    : "Streams"}{" "}
                </div>
              )}
              {data?.node?.returns?.map(portMapper)}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-grow">
        {data?.node?.interfaces?.includes("workflow") &&
          data?.node?.meta?.flow && <FlussNode node={data?.node} />}
      </div>
      <div className="flex-initial">
        <div className="font-light mt-3 mb-1 text-xl text-white">
          {" "}
          Implemented by{" "}
        </div>
        <div className="grid gap-2">
          {data?.node?.templates?.filter(notEmpty).map((template) => (
            <Template.Smart
              object={template.id}
              className="bg-back-800 rounded shadow-md text-xl text-white p-1 mr-2 my-auto flex flex-col"
            >
              <Template.DetailLink object={template.id}>
                {template?.interface}
              </Template.DetailLink>
              <div>
                {template?.registry.app?.name} by{" "}
                {template?.registry.user?.email}
              </div>
            </Template.Smart>
          ))}
        </div>
      </div>
    </PageLayout>
  );
};

export { DashboardNode };
