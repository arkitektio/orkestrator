import { Arkitekt } from "@/core/connection/arkitekt/host";
import { LOK_HELP } from "../help";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { ModuleHomeHeader } from "@/core/layout/ModuleHome";
import { PageSections } from "@/core/layout/PageSections";
import { Sidebars } from "@/core/layout/Sidebars";
import { CopyButton } from "@/core/ui/copy-button";
import { InfoList } from "@/core/ui/info-list";
import { SheetButton } from "@/core/ui/sheetbutton";
import { LokDevice } from "@/core/linkers";
import { Cpu, Pencil } from "lucide-react";
import { useGetDeviceQuery } from "../api/graphql";
import ClientCard from "../components/cards/ClientCard";
import { deviceLabel } from "../components/UserAvatar";

/**
 * One device, the way the other detail pages read: the module-home header
 * (its name, "Unnamed" when it has none, the groups it is in, and whether it
 * is the device this app is connected through), the apps registered on it,
 * and what other modules show about it (rekuest: the agents running here).
 * Its ids and counts are the Info rail's.
 */
export const ComputeNodePage = asDetailQueryRoute(useGetDeviceQuery, ({ data }) => {
  const device = data.device;
  const manifest = Arkitekt.useConnectedManifest();
  const current = !!manifest && manifest.node_id === device.nodeId;
  const groups = device.deviceGroups.map((group) => group.name);

  return (
    <LokDevice.ModelPage
      help={LOK_HELP.device}
      object={device}
      actions={<LokDevice.Actions object={device} />}
      title={deviceLabel(device)}
      pageActions={
        <SheetButton
          alwaysShow
          name="updatedevice"
          variant="ghost"
          size="icon"
          title="Rename device"
          dialogProps={{ computeNode: device }}
        >
          <Pencil className="w-4 h-4" />
        </SheetButton>
      }
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              ["Name", device.name?.trim() || <span className="italic text-muted-foreground">Unnamed</span>],
              [
                "Device ID",
                <span className="flex min-w-0 items-center gap-1">
                  <span className="truncate font-mono text-xs" title={device.deviceId}>
                    {device.deviceId}
                  </span>
                  <CopyButton value={device.deviceId} title="Copy device ID" />
                </span>,
              ],
              ["Groups", groups.length ? groups.join(", ") : "None"],
              ["Apps", device.clients.length],
              ["Connected", current && "This app runs on it"],
            ]}
          />
        </Sidebars.Tab>
      }
      defaultSidebar="Info"
    >
      <div className="flex w-full flex-col gap-8 p-3">
        <ModuleHomeHeader
          moduleKey="lok"
          icon={<Cpu />}
          title={<span className={device.name?.trim() ? undefined : "italic"}>{deviceLabel(device)}</span>}
          description={[
            groups.length ? `In ${groups.join(", ")}` : "In no group",
            `${device.clients.length} ${device.clients.length === 1 ? "app" : "apps"} registered`,
            ...(current ? ["the device you are connected through"] : []),
          ].join(" · ")}
        />

        {device.clients.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Apps
              <span className="ml-1.5 font-normal tabular-nums text-muted-foreground/60">{device.clients.length}</span>
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
              {device.clients.map((client) => (
                <ClientCard key={client.id} item={client} />
              ))}
            </div>
          </section>
        )}

        {/* What other modules show about a device (rekuest: its agents),
            given the device's node id to filter by. */}
        <PageSections
          placement="main"
          identifier="@lok/device"
          object={{ id: device.id, nodeId: device.nodeId }}
        />
      </div>
    </LokDevice.ModelPage>
  );
});

export default ComputeNodePage;
