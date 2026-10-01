import { useDialog } from "@/core/dialogs/registry";
import { PageLayout } from "@/core/layout/PageLayout";
import { PageAction } from "@/core/ui/page-action";
import { Smartphone, Trash2 } from "lucide-react";
import { DeviceFragment, useListDevicesQuery } from "../api/graphql";
import { DeviceLabel } from "../components/DeviceLabel";
import { formatAt, formatDay } from "../format";
import { LOKATE_HELP } from "../help";

const DeviceRow = ({ device }: { device: DeviceFragment }) => (
  <div className="flex items-center gap-3 py-2 text-sm">
    <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    <span className="flex min-w-0 flex-1 flex-col">
      <DeviceLabel deviceId={device.deviceId} />
      <span className="text-xs text-muted-foreground">
        since {formatDay(device.firstSeenAt)}
        {device.lastUploadAt && <> · last upload {formatAt(device.lastUploadAt)}</>}
      </span>
    </span>
    <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
      {device.pointCount === 1 ? "1 point" : `${device.pointCount.toLocaleString()} points`}
    </span>
  </div>
);

/**
 * What lokate holds about you: the phones that upload here, and deleting the
 * server copy. The phones keep their own history either way.
 */
const PrivacyPage = () => {
  const { openDialog } = useDialog();
  const { data } = useListDevicesQuery({ variables: { pagination: { limit: 50 } } });
  const devices = data?.devices ?? [];

  return (
    <PageLayout
      help={LOKATE_HELP.privacy}
      title="Privacy"
      pageActions={
        <PageAction
          size="sm"
          variant="outline"
          collapse="icon"
          icon={<Trash2 />}
          onClick={() => openDialog("lokatedeleteservercopy", {}, { size: "small" })}
        >
          Delete server copy
        </PageAction>
      }
    >
      <div className="flex max-w-3xl flex-col gap-3 p-6">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold text-muted-foreground">Phones</h2>
          <p className="text-xs text-muted-foreground">Every install that has backed up its location history here.</p>
        </div>
        {devices.length > 0 ? (
          <div className="flex flex-col divide-y">
            {devices.map((device) => (
              <DeviceRow key={device.id} device={device} />
            ))}
          </div>
        ) : (
          data && <p className="text-sm text-muted-foreground">No phone has uploaded yet.</p>
        )}
      </div>
    </PageLayout>
  );
};

export default PrivacyPage;
