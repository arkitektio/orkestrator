import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { LOK_HELP } from "../help";
import { ModuleHomeHeader } from "@/core/layout/ModuleHome";
import { Sidebars } from "@/core/layout/Sidebars";
import { CopyButton } from "@/core/ui/copy-button";
import { InfoList } from "@/core/ui/info-list";
import { LokLayer } from "@/core/linkers";
import { Layers } from "lucide-react";
import { useDetailLayerQuery } from "../api/graphql";
import { LogoOrIcon } from "../components/DetailParts";

/**
 * One layer: a connection layer between services and apps. Its name, logo
 * and what it is for in the header; its identifier and id are the Info rail's.
 */
export const LayerPage = asDetailQueryRoute(useDetailLayerQuery, ({ data }) => {
  const layer = data.layer;

  return (
    <LokLayer.ModelPage
      help={LOK_HELP.layer}
      object={layer}
      actions={<LokLayer.Actions object={layer} />}
      title={layer.name}
      additionalSidebars={
        <>
          <Sidebars.Tab label="Info">
            <InfoList
              rows={[
                [
                  "Identifier",
                  <span className="flex min-w-0 items-center gap-1">
                    <span className="truncate font-mono text-xs">{layer.identifier}</span>
                    <CopyButton value={layer.identifier} title="Copy identifier" />
                  </span>,
                ],
                ["Layer ID", <span className="break-all font-mono text-xs">{layer.id}</span>],
              ]}
            />
          </Sidebars.Tab>
          <Sidebars.Tab label="Knowledge">
            <LokLayer.Knowledge object={layer} />
          </Sidebars.Tab>
        </>
      }
      defaultSidebar="Info"
    >
      <div className="flex w-full flex-col gap-8 p-3">
        <ModuleHomeHeader
          moduleKey="lok"
          icon={<LogoOrIcon src={layer.logo?.presignedUrl} fallback={<Layers />} />}
          title={layer.name}
          description={layer.description || <span className="font-mono">{layer.identifier}</span>}
        />
      </div>
    </LokLayer.ModelPage>
  );
});

export default LayerPage;
