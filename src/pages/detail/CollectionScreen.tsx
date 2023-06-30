import React from "react";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { notEmpty } from "../../floating/utils";
import { PageLayout } from "../../layout/PageLayout";
import { withRekuest } from "../../rekuest";
import {
  useCollectionQuery
} from "../../rekuest/api/graphql";
import { NodeCard } from "../../rekuest/components/cards/NodeCard";

export type IRepositoryScreenProps = {
  id: string;
};

const CollectionScreen: React.FC<IRepositoryScreenProps> = ({ id }) => {
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
      <ResponsiveGrid>
        {data?.collection?.nodes?.filter(notEmpty).map((node, index) => (
          <NodeCard key={index} node={node} mates={[]} />
        ))}
      </ResponsiveGrid>
    </PageLayout>
  );
};

export { CollectionScreen };
