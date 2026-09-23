import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLokResolve } from "@/datalayer/hooks/useResolve";
import { LokDevice, LokUser } from "@/linkers";
import { useListDevicesQuery, useUserQuery } from "../api/graphql";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const UserAvatar = (props: { sub: string, className?: string }) => {
  const { data } = useUserQuery({
    variables: {
      id: props.sub,
    },
  });

  return (
    <Avatar className={cn(props.className)}>

      <AvatarFallback>{data?.user.username.slice(0, 2)}</AvatarFallback>
    </Avatar>
  );
};



/**
 * Small hover-only badge naming the device an agent runs on.
 *
 * Rekuest reports the raw node id (`Agent.device.deviceId`), which matches lok's
 * `Device.nodeId` (see `DevicePage`, which filters agents by it). We resolve the
 * name from the org's device list — one shared query for every card instead of a
 * per-card `deviceByDeviceId` lookup that hangs on "Loading" when the id cannot
 * be resolved — and fall back to the raw id so the pill never stalls.
 */
export const DeviceImprint = (props: { deviceId: string, className?: string }) => {
  const { data, loading } = useListDevicesQuery();

  if (loading && !data) return null;

  const device = data?.devices.find((d) => d.nodeId === props.deviceId);
  const badge = (
    <Badge
      className={cn(
        "text-xs font-mono truncate group-hover:opacity-100 opacity-0 transition-opacity",
        props.className,
      )}
      title={device?.name ?? props.deviceId}
    >
      {device?.name || props.deviceId}
    </Badge>
  );

  if (!device) return badge;

  return <LokDevice.DetailLink object={device}>{badge}</LokDevice.DetailLink>;
};

export const UserUsername = (props: { sub: string }) => {
  const { data } = useUserQuery({
    variables: {
      id: props.sub,
    },
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <LokUser.DetailLink object={{ id: props.sub }}>
          <span className="cursor-pointer">{data?.user.username}</span>
        </LokUser.DetailLink>
      </TooltipTrigger>

      <TooltipContent>{data?.user.username}</TooltipContent>
    </Tooltip>
  );
};

export const JustUsername = (props: { sub: string }) => {
  const { data } = useUserQuery({
    variables: {
      id: props.sub,
    },
  });

  return data?.user.username;
};

export const UserAvatarUsername = (props: { sub: string }) => {
  const { data } = useUserQuery({
    variables: {
      id: props.sub,
    },
  });

  const resolve = useLokResolve();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <LokUser.DetailLink object={{ id: props.sub }}>
          <Avatar className="h-10 w-10 cursor-pointer">
            <AvatarImage
              className="rounded-md"
              src={
                resolve(data?.user?.profile.avatar?.presignedUrl) as
                | string
                | undefined
              }
              alt={data?.user?.username}
            />
            <AvatarFallback>{data?.user.username.slice(0, 2)}</AvatarFallback>
          </Avatar>
        </LokUser.DetailLink>
      </TooltipTrigger>

      <TooltipContent>{data?.user.username}</TooltipContent>
    </Tooltip>
  );
};
