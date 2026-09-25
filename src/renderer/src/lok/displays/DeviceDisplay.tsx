import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { DeviceImprint } from "../components/UserAvatar";
import { useGetDeviceQuery } from "../api/graphql";

/**
 * `@lok/device`. Agents record the compute node they run on by its
 * `nodeId` (`by="nodeId"`); lok's own pages address a device by id.
 */
export const DeviceDisplay = ({ id, by, className }: DisplayWidgetProps) =>
  by === "nodeId" ? <DeviceImprint deviceId={id} className={className} /> : <DeviceById id={id} />;

const DeviceById = ({ id }: { id: string }) => {
  const { data } = useGetDeviceQuery({ variables: { id } });
  return <>{data?.device.name}</>;
};
