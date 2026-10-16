import { Button } from "@/core/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/core/ui/item";
import { Spinner } from "@/core/ui/spinner";
import { Bluetooth, RefreshCw } from "lucide-react";
import type { BluetoothDeviceInfo } from "../../../../main/bluetooth/protocol";

type Props = {
  devices: BluetoothDeviceInfo[];
  scanning: boolean;
  error?: string | null;
  onScan: () => void;
  onPick: (device: BluetoothDeviceInfo) => void;
  /** The device being connected to, if any: its row shows a spinner, the others are disabled. */
  connecting?: string | null;
  /** Shown when a finished scan found nothing. */
  emptyHint?: React.ReactNode;
};

/** The devices a scan found, as a list to pick one from. */
export const BluetoothDevicePicker = ({ devices, scanning, error, onScan, onPick, connecting, emptyHint }: Props) => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-2">
      <Button size="sm" variant={scanning ? "outline" : "default"} onClick={onScan} disabled={scanning || !!connecting}>
        {scanning ? <Spinner /> : <RefreshCw className="size-3.5" />}
        {scanning ? "Scanning…" : devices.length ? "Scan again" : "Scan"}
      </Button>
      <span className="text-xs text-muted-foreground">
        {scanning ? `${devices.length} found so far` : devices.length ? `${devices.length} found` : null}
      </span>
    </div>

    {error && <p className="text-xs text-destructive">{error}</p>}

    {devices.length > 0 ? (
      <ItemGroup className="gap-1">
        {devices.map((device) => (
          <Item key={device.id} variant="outline" size="sm">
            <ItemMedia>
              <Bluetooth className="size-4 text-muted-foreground" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{device.name ?? "Unnamed device"}</ItemTitle>
              <ItemDescription className="font-mono">{device.id}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button size="sm" variant="secondary" disabled={!!connecting} onClick={() => onPick(device)}>
                {connecting === device.id && <Spinner />}
                {connecting === device.id ? "Connecting…" : "Select"}
              </Button>
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    ) : (
      !scanning && emptyHint && <div className="text-sm text-muted-foreground">{emptyHint}</div>
    )}
  </div>
);
