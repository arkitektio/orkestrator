import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { ListRender } from "@/core/layout/ListRender";
import { RekuestAgent } from "@/core/linkers";
import {
  ComponentContext,
  Ordering,
  useAgentQuery,
  useListMaterializedBloksQuery,
} from "@/rekuest/api/graphql";
import MaterializedBlokCard from "@/rekuest/components/cards/MaterializedBlokCard";
import { REKUEST_HELP } from "../../help";
import { agentPanelLink } from "./AgentPanelPage";

/**
 * The panels an agent brings to control it (`agents/:id/panels`): its
 * PANEL-context bloks, each opening on its own page below the agent's
 * (`agents/:id/panels/:panel`), so the breadcrumbs stay on the agent.
 */
export const AgentPanelsPage = asDetailQueryRoute(useAgentQuery, ({ data, id }) => {
  const filters = { agent: id, contexts: [ComponentContext.Panel] };
  const { data: panelData, loading, error, refetch } = useListMaterializedBloksQuery({
    variables: {
      filters,
      ordering: [{ createdAt: Ordering.Desc }],
      pagination: { limit: 20, offset: 0 },
    },
  });

  return (
    <RekuestAgent.ModelPage
      title={`${data.agent.name} — Panels`}
      help={REKUEST_HELP.agentPanels}
      object={data.agent}
      // The breadcrumb reads the agent's name, not its number.
      crumbs={{ [data.agent.id]: data.agent.name }}
    >
      <div className="p-6">
        <ListRender
          array={panelData?.materializedBloks}
          loading={loading}
          error={error}
          title="Panels"
          refetch={({ pagination }) =>
            refetch({
              filters,
              ordering: [{ createdAt: Ordering.Desc }],
              pagination,
            })
          }
        >
          {(item) => (
            <MaterializedBlokCard key={item.id} item={item} to={agentPanelLink(id, item.id)} />
          )}
        </ListRender>
      </div>
    </RekuestAgent.ModelPage>
  );
});

export default AgentPanelsPage;
