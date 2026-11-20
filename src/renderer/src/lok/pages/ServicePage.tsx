import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { LOK_HELP } from "../help";
import { ModuleHomeHeader } from "@/core/layout/ModuleHome";
import { Sidebars } from "@/core/layout/Sidebars";
import { CopyButton } from "@/core/ui/copy-button";
import { DialogButton } from "@/core/ui/dialog-button";
import { InfoList } from "@/core/ui/info-list";
import { LokService } from "@/core/linkers";
import { PlusIcon, Server } from "lucide-react";
import { useGetServiceQuery } from "../api/graphql";
import { LogoOrIcon } from "../components/DetailParts";

/**
 * One service type: its name, logo and what it does in the header; its
 * identifier and id are the Info rail's. "New Instance" deploys one of it.
 */
const Page = asDetailQueryRoute(useGetServiceQuery, ({ data }) => {
  const service = data.service;

  return (
    <LokService.ModelPage
      help={LOK_HELP.service}
      object={service}
      title={service.name || service.identifier}
      pageActions={
        <DialogButton
          alwaysShow
          name="createserviceinstance"
          variant={"outline"}
          size={"sm"}
          dialogProps={{ identifier: service.identifier }}
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Instance
        </DialogButton>
      }
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              [
                "Identifier",
                <span className="flex min-w-0 items-center gap-1">
                  <span className="truncate font-mono text-xs">{service.identifier}</span>
                  <CopyButton value={service.identifier} title="Copy identifier" />
                </span>,
              ],
              ["Service ID", <span className="break-all font-mono text-xs">{service.id}</span>],
            ]}
          />
        </Sidebars.Tab>
      }
      defaultSidebar="Info"
    >
      <div className="flex w-full flex-col gap-8 p-3">
        <ModuleHomeHeader
          moduleKey="lok"
          icon={<LogoOrIcon src={service.logo?.presignedUrl} fallback={<Server />} />}
          title={service.name || service.identifier}
          description={service.description || <span className="font-mono">{service.identifier}</span>}
        />
      </div>
    </LokService.ModelPage>
  );
});

export default Page;
