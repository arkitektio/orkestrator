import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { useDialog } from "@/core/dialogs/registry";
import { RekuestAgent } from "@/core/linkers";
import { PageAction } from "@/core/ui/page-action";
import { useAgentQuery, useMaterializedBlokQuery } from "@/rekuest/api/graphql";
import { Copy, LayoutPanelTop } from "lucide-react";
import { useParams } from "react-router-dom";
import MaterializedBlokById from "../../components/MaterializedBlokById";
import { REKUEST_HELP } from "../../help";

/** Where one of an agent's panels is shown: a page below the agent's. */
export const agentPanelLink = (agent: string, panel: string) =>
  `${RekuestAgent.linkBuilder(agent)}/panels/${panel}`;

const PanelMissing = () => (
  <StatusPage
    variant="compact"
    icon={LayoutPanelTop}
    title="This panel could not be shown"
    description="It may have been removed, or the agent no longer provides it."
  />
);

/**
 * One of the panels an agent brings to control it, on a page of its own below
 * the agent (`agents/:id/panels/:panel`). The panel is the agent's, so the
 * page offers one thing only: forking its blok into one of the viewer's own.
 * Nothing here renames, rebinds or deletes the agent's materialization.
 */
const AgentPanelPage = asDetailQueryRoute(useAgentQuery, ({ data }) => {
  const { panel } = useParams<{ panel: string }>();
  const { openDialog } = useDialog();
  // The same query the panel below is read with: answered from the cache.
  const materialized = useMaterializedBlokQuery({ variables: { id: panel ?? "" }, skip: !panel }).data
    ?.materializedBlok;
  const blok = materialized?.blok;
  const panelName = materialized?.name || blok?.name;

  return (
    <RekuestAgent.ModelPage
      title={panelName ? `${data.agent.name} — ${panelName}` : data.agent.name}
      help={REKUEST_HELP.agent}
      object={data.agent}
      // The breadcrumbs read the names, not the numbers.
      crumbs={{ [data.agent.id]: data.agent.name, ...(panel && panelName ? { [panel]: panelName } : {}) }}
      pageActions={
        // Only a blok an app provides is forked; a custom one is already the viewer's.
        blok?.provided && (
          <PageAction
            size="sm"
            icon={<Copy className="h-4 w-4" />}
            onClick={() => openDialog("forkblok", { id: blok.id, name: blok.name })}
          >
            Fork
          </PageAction>
        )
      }
    >
      <div className="h-full w-full p-3">
        <MaterializedBlokById
          key={panel}
          materializedBlokId={panel}
          surfaceId={`agent-panel-${panel}`}
          chrome="none"
          emptyFallback={<PanelMissing />}
          errorFallback={<PanelMissing />}
        />
      </div>
    </RekuestAgent.ModelPage>
  );
});

export default AgentPanelPage;
