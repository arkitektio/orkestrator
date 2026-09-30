/** A phone by its `client_device` id, shortened: devices carry no name yet. */
export const DeviceLabel = ({ deviceId }: { deviceId: string }) => (
  <span className="font-mono text-xs" title={deviceId}>
    {deviceId.length > 12 ? `${deviceId.slice(0, 8)}…` : deviceId}
  </span>
);
