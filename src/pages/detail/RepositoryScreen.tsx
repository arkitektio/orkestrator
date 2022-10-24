import { Maybe } from "graphql/jsutils/Maybe";
import React from "react";
import { useNavigate, useParams } from "react-router";
import {
  NodesDocument,
  useDeleteNodeMutation,
  useDetailRepositoryQuery,
} from "../../rekuest/api/graphql";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { NodeCard } from "../../components/MyNodes";
import { notEmpty } from "../../floating/utils";
import { PageLayout } from "../../layout/PageLayout";
import { withRekuest } from "../../rekuest";

export type IRepositoryScreenProps = {
  id: string;
};

const RepositoryScreen: React.FC<IRepositoryScreenProps> = ({ id }) => {
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

  const navigate = useNavigate();

  const toPython = (
    node: Maybe<{
      package?: string;
      interface?: string;
    }>
  ) => {
    navigator.clipboard.writeText(
      `use(package="${node?.package}", interface="${node?.interface}")`
    );
  };

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
      <ResponsiveGrid>
        {data?.repository?.nodes?.filter(notEmpty).map((node, index) => (
          <NodeCard key={index} node={node} />
        ))}
      </ResponsiveGrid>
    </PageLayout>
  );
};

export { RepositoryScreen };
