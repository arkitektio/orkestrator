import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { ModuleHomeHeader } from "@/core/layout/ModuleHome";
import { PageSections } from "@/core/layout/PageSections";
import { Sidebars } from "@/core/layout/Sidebars";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { InfoList } from "@/core/ui/info-list";
import { KabinetBackend } from "@/core/linkers";
import { useGetBackendQuery } from "../api/graphql";
import PodCard from "../components/cards/PodCard";
import ResourceCard from "../components/cards/ResourceCard";
import { StatusTally } from "../components/cards/parts";
import { CardGrid, DetailSection } from "../components/DetailSection";
import { IconForBackendKind } from "../components/IconForBackendKind";
import { KABINET_HELP } from "../help";

/**
 * A backend: what it runs (its pods) and what it runs them on (its
 * resources). What the backend IS — its kind, its client, who connected it —
 * is the Info rail's.
 */
export const BackendPage = asDetailQueryRoute(useGetBackendQuery, ({ data }) => {
  const backend = data.backend;

  return (
    <KabinetBackend.ModelPage
      title={backend.name}
      object={backend}
      help={KABINET_HELP.backend}
      pageActions={
        <>
          {/* Other modules' actions on a backend (rekuest: its agents). */}
          <PageSections
            placement="actions"
            identifier="@kabinet/backend"
            object={{ id: backend.id, clientId: backend.clientId }}
          />
          <KabinetBackend.ObjectButton alwaysShow object={backend} />
        </>
      }
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              [
                "Kind",
                <span className="flex items-center gap-1.5">
                  <IconForBackendKind kind={backend.kind} className="size-3.5 text-muted-foreground" />
                  {backend.kind}
                </span>,
              ],
              ["Connected by", <StructureDisplay identifier="@lok/user" id={backend.user.sub} variant="inline" />],
              ["Client", <span className="break-all font-mono text-xs">{backend.clientId}</span>],
              ["Pods", backend.pods.length],
              ["Resources", backend.resources.length],
            ]}
          />
        </Sidebars.Tab>
      }
    >
      <div className="flex w-full flex-col gap-8 p-3">
        <ModuleHomeHeader
          moduleKey="kabinet"
          icon={<IconForBackendKind kind={backend.kind} />}
          title={backend.name}
          description={
            <span className="flex flex-wrap items-center gap-x-1.5">
              {backend.kind} · connected by
              <StructureDisplay identifier="@lok/user" id={backend.user.sub} variant="inline" />
              <span>·</span>
              <StatusTally items={backend.pods} empty="no pods" />
            </span>
          }
        />

        <DetailSection title="Pods" count={backend.pods.length} empty="No pod runs on this backend.">
          <CardGrid>
            {backend.pods.map((pod) => (
              <PodCard key={pod.id} item={pod} />
            ))}
          </CardGrid>
        </DetailSection>
        <DetailSection title="Resources" count={backend.resources.length}>
          <CardGrid>
            {backend.resources.map((resource) => (
              <ResourceCard key={resource.id} item={resource} />
            ))}
          </CardGrid>
        </DetailSection>
      </div>
    </KabinetBackend.ModelPage>
  );
});

export default BackendPage;
