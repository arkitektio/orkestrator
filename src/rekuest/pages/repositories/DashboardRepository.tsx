import React from "react";
import { useParams } from "react-router";
import { FittingResponsiveContainerGrid } from "../../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../../floating/utils";
import { PageLayout } from "../../../layout/PageLayout";
import { withRekuest } from "../../RekuestContext";
import {
  NodesDocument,
  useDeleteNodeMutation,
  useDetailRepositoryQuery,
} from "../../api/graphql";
import { NodeCard } from "../../components/cards/NodeCard";

export interface DashboardRepositoryProps {}

export const DashboardRepository: React.FC<DashboardRepositoryProps> = (
  props
) => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <>ssss</>;

  const { data } = withRekuest(useDetailRepositoryQuery)({
    variables: { id: id },
  });

  const [deleteNode, _] = withRekuest(useDeleteNodeMutation)({
    update(cache, result) {
      const existing: any = cache.readQuery({ query: NodesDocument });
      cache.writeQuery({
        query: NodesDocument,
        data: {
          nodes: existing.nodes.filter(
            (t: any) => t.id !== result.data?.deleteNode?.id
          ),
        },
      });
    },
  });

  return (
    <PageLayout>
      <div className="flex w-10 text-white rounded shadow-md p-2">
        <div className="flex-none cursor-pointer">
          <b className="text-xl font-light">{data?.repository?.name}</b>
          <br />
          <span className="text-xs font-semibold">
            @{data?.repository?.name}
          </span>
        </div>
      </div>
      <div className="font-light mt-2 dark:text-white "> Defined Nodes </div>
      <FittingResponsiveContainerGrid>
        {data?.repository?.nodes?.filter(notEmpty).map((node, index) => (
          <NodeCard key={index} node={node} mates={[]} />
        ))}
      </FittingResponsiveContainerGrid>
    </PageLayout>
  );
};
