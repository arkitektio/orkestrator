import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { ModuleHomeHeader } from "@/core/layout/ModuleHome";
import { Sidebars } from "@/core/layout/Sidebars";
import { InfoList } from "@/core/ui/info-list";
import { KabinetBackend, KabinetResource } from "@/core/linkers";
import { Cpu } from "lucide-react";
import { useGetResourceQuery } from "../api/graphql";
import PodCard from "../components/cards/PodCard";
import { StatusTally } from "../components/cards/parts";
import { CardGrid, DetailSection, FactGrid } from "../components/DetailSection";
import { IconForBackendKind } from "../components/IconForBackendKind";
import { KABINET_HELP } from "../help";
import { qualifierRows } from "../lib/qualifiers";

/**
 * A resource: something a backend schedules pods onto. The body says what it
 * reports about itself (its qualifiers) and which pods run on it; the Info
 * rail repeats its backend and ids.
 */
export const ResourcePage = asDetailQueryRoute(
  useGetResourceQuery,
  ({ data }) => {
    const resource = data.resource;
    const qualifiers = qualifierRows(resource.qualifiers);

    return (
      <KabinetResource.ModelPage
        title={resource.name}
        object={resource}
        help={KABINET_HELP.resource}
        additionalSidebars={
          <Sidebars.Tab label="Info">
            <InfoList
              rows={[
                [
                  "Backend",
                  <KabinetBackend.DetailLink object={resource.backend} className="hover:underline">
                    {resource.backend.name}
                  </KabinetBackend.DetailLink>,
                ],
                ["Resource ID", <span className="break-all font-mono text-xs">{resource.resourceId}</span>],
                ["Pods", resource.pods.length],
              ]}
            />
          </Sidebars.Tab>
        }
      >
        <div className="flex w-full flex-col gap-8 p-3">
          <ModuleHomeHeader
            moduleKey="kabinet"
            icon={<Cpu />}
            title={resource.name}
            description={
              <span className="flex flex-wrap items-center gap-x-1.5">
                on
                <IconForBackendKind kind={resource.backend.kind} className="size-3.5" />
                <KabinetBackend.DetailLink object={resource.backend} className="hover:underline">
                  {resource.backend.name}
                </KabinetBackend.DetailLink>
                <span>·</span>
                <StatusTally items={resource.pods} empty="no pods" />
              </span>
            }
          />

          <DetailSection title="Qualifiers" count={qualifiers.length}>
            <FactGrid rows={qualifiers} />
          </DetailSection>

          <DetailSection
            title="Pods"
            count={resource.pods.length}
            empty="No pod is scheduled onto this resource."
          >
            <CardGrid>
              {resource.pods.map((pod) => (
                <PodCard key={pod.id} item={pod} />
              ))}
            </CardGrid>
          </DetailSection>
        </div>
      </KabinetResource.ModelPage>
    );
  },
  {
    queryOptions: {
      pollInterval: 15000,
    },
  },
);

export default ResourcePage;
