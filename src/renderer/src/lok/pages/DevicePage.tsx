import { Arkitekt } from "@/core/connection/arkitekt/host";
import { LOK_HELP } from "../help";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { LokDevice } from "@/core/linkers";
import { PageSections } from "@/core/layout/PageSections";
import { SheetButton } from "@/core/ui/sheetbutton";
import { Pencil } from "lucide-react";
import { useGetDeviceQuery } from "../api/graphql";

export const ComputeNodePage = asDetailQueryRoute(useGetDeviceQuery, ({ data }) => {

  const manifest = Arkitekt.useConnectedManifest()

  return (
    <LokDevice.ModelPage
      help={LOK_HELP.device}
      object={data.device }
      actions={<LokDevice.Actions object={data?.device} />}
      title={data?.device?.name || "Untitled Compute Node"}
      pageActions={
        <SheetButton
          alwaysShow
          name="updatedevice"
          variant="ghost"
          size="icon"
          title="Rename device"
          dialogProps={{ computeNode: data.device }}
        >
          <Pencil className="w-4 h-4" />
        </SheetButton>
      }
    >
      <div className="grid grid-cols-6">
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
          <div>
            <div className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl group">
              {data?.device?.name || "Untitled Device"}
            </div>
          </div>
        </div>

      </div>

      <div className="border-b border-seperator my-2 mx-4" />
      {manifest && manifest.node_id === data.device.nodeId && (
        <div className="col-span-4 p-6 text-sm text-primary font-medium">
          This is the current compute node you are connected to.
        </div>
      )}


      {/* What other modules show about a device (rekuest: its agents),
          given the device's node id to filter by. */}
      <PageSections
        placement="main"
        identifier="@lok/device"
        object={{ id: data.device.id, nodeId: data.device.nodeId }}
      />
    </LokDevice.ModelPage>
  );
});


export default ComputeNodePage;
