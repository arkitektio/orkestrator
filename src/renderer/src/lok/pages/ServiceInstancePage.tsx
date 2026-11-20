import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { LOK_HELP } from "../help";
import { ModuleHomeHeader } from "@/core/layout/ModuleHome";
import { Sidebars } from "@/core/layout/Sidebars";
import { CopyButton } from "@/core/ui/copy-button";
import { InfoList } from "@/core/ui/info-list";
import { SheetButton } from "@/core/ui/sheetbutton";
import { LokService, LokServiceInstance } from "@/core/linkers";
import { Boxes, Pencil } from "lucide-react";
import { useGetServiceInstanceQuery } from "../api/graphql";
import GroupCard from "../components/cards/GroupCard";
import UserCard from "../components/cards/UserCard";
import InstanceCompositionGraph from "../components/graphs/InstanceCompositionGraph";
import { DetailGrid, DetailSection, LogoOrIcon } from "../components/DetailParts";

/**
 * One deployed service: which service and version it provides in the header;
 * who may and may not use it in the body, then how it is composed. Its
 * service, version, counts and id are the Info rail's.
 */
const Page = asDetailQueryRoute(useGetServiceInstanceQuery, ({ data }) => {
  const instance = data.serviceInstance;
  const service = instance.release.service;

  return (
    <LokServiceInstance.ModelPage
      help={LOK_HELP.serviceInstance}
      object={instance}
      title={service.name || service.identifier}
      pageActions={
        <SheetButton
          alwaysShow
          name="updateserviceinstance"
          variant={"outline"}
          size={"sm"}
          dialogProps={{ instance }}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Update Service
        </SheetButton>
      }
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              [
                "Service",
                <LokService.DetailLink object={service} className="hover:underline">
                  {service.name || service.identifier}
                </LokService.DetailLink>,
              ],
              ["Version", <span className="font-mono">{instance.release.version}</span>],
              ["Mappings", instance.mappings.length],
              ["Aliases", instance.aliases.length],
              [
                "Instance ID",
                <span className="flex min-w-0 items-center gap-1">
                  <span className="truncate font-mono text-xs">{instance.id}</span>
                  <CopyButton value={instance.id} title="Copy instance ID" />
                </span>,
              ],
            ]}
          />
        </Sidebars.Tab>
      }
      defaultSidebar="Info"
    >
      <div className="flex w-full flex-col gap-8 p-3">
        <ModuleHomeHeader
          moduleKey="lok"
          icon={<LogoOrIcon src={instance.logo?.presignedUrl} fallback={<Boxes />} />}
          title={service.name || service.identifier}
          description={[
            `Provides ${service.identifier} ${instance.release.version}`,
            ...(service.description ? [service.description] : []),
          ].join(" · ")}
        />

        <DetailSection title="Allowed users" count={instance.allowedUsers.length}>
          <DetailGrid>
            {instance.allowedUsers.map((user) => (
              <UserCard key={user.id} item={user} />
            ))}
          </DetailGrid>
        </DetailSection>
        <DetailSection title="Denied users" count={instance.deniedUsers.length}>
          <DetailGrid>
            {instance.deniedUsers.map((user) => (
              <UserCard key={user.id} item={user} />
            ))}
          </DetailGrid>
        </DetailSection>
        <DetailSection title="Allowed groups" count={instance.allowedGroups.length}>
          <DetailGrid>
            {instance.allowedGroups.map((group) => (
              <GroupCard key={group.id} item={group} />
            ))}
          </DetailGrid>
        </DetailSection>
        <DetailSection title="Denied groups" count={instance.deniedGroups.length}>
          <DetailGrid>
            {instance.deniedGroups.map((group) => (
              <GroupCard key={group.id} item={group} />
            ))}
          </DetailGrid>
        </DetailSection>

        <DetailSection title="Composition">
          <InstanceCompositionGraph service={instance} />
        </DetailSection>
      </div>
    </LokServiceInstance.ModelPage>
  );
});

export default Page;
