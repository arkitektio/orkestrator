import React from "react";
import { useParams } from "react-router";
import { ResponsiveContainerGrid } from "../../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../../floating/utils";
import { PageLayout } from "../../../layout/PageLayout";
import { withRekuest } from "../../RekuestContext";
import { useCollectionQuery } from "../../api/graphql";
import { NodeCard } from "../../components/cards/NodeCard";

export interface DashboardRepositoryProps {}

export const DashboardCollection: React.FC<DashboardRepositoryProps> = (
  props
) => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <>ssss</>;

  const { data } = withRekuest(useCollectionQuery)({
    variables: { id: id },
  });

  return (
    <PageLayout>
      <div className="flex w-10 text-white rounded shadow-md p-2">
        <div className="flex-none cursor-pointer">
          <b className="text-xl font-light">{data?.collection?.name}</b>
          <br />
          <span className="text-xs font-semibold">
            {data?.collection?.description}
          </span>
        </div>
      </div>
      <div className="font-light mt-2 dark:text-white "> Include Nodes </div>
      <ResponsiveContainerGrid>
        {data?.collection?.nodes?.filter(notEmpty).map((node, index) => (
          <NodeCard key={index} node={node} mates={[]} />
        ))}
      </ResponsiveContainerGrid>
    </PageLayout>
  );
};
