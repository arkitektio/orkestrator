import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { ListRender } from "@/core/components/layout/ListRender";
import { RekuestAgent, RekuestMaterializedBlok } from "@/core/linkers";
import {
  Ordering,
  useAgentQuery,
  useListMaterializedBloksQuery,
} from "@/rekuest/api/graphql";
import MaterializedBlokCard from "@/rekuest/components/cards/MaterializedBlokCard";

export const AgentBloksPage = asDetailQueryRoute(useAgentQuery, ({ data, id }) => {
  const { data: blokData, loading, error, refetch } = useListMaterializedBloksQuery({
    variables: {
      filters: { agent: id },
      ordering: [{ createdAt: Ordering.Desc }],
      pagination: { limit: 20, offset: 0 },
    },
  });

  return (
    <RekuestAgent.ModelPage
      title={`${data.agent.name} — Bloks`}
      object={data.agent}
    >
      <div className="p-6">
        <ListRender
          array={blokData?.materializedBloks}
          loading={loading}
          error={error}
          title={
            <RekuestMaterializedBlok.ListLink className="flex-0">
              Materialized Bloks
            </RekuestMaterializedBlok.ListLink>
          }
          refetch={({ pagination }) =>
            refetch({
              filters: { agent: id },
              ordering: [{ createdAt: Ordering.Desc }],
              pagination,
            })
          }
        >
          {(item) => <MaterializedBlokCard key={item.id} item={item} />}
        </ListRender>
      </div>
    </RekuestAgent.ModelPage>
  );
});

export default AgentBloksPage;
