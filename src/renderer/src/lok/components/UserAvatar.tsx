import { Avatar, AvatarFallback, AvatarImage } from "@/core/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/ui/tooltip";
import { useLokResolve } from "@/core/datalayer/hooks/useResolve";
import { LokDevice, LokUser } from "@/core/linkers";
import { useDeviceChip } from "../lib/keyedChips";
import { useUserChip } from "../lib/userChips";
import { cn } from "@/core/util/utils";
import { Badge } from "@/core/ui/badge";

export const UserAvatar = (props: { sub: string, className?: string }) => {
  const user = useUserChip(props.sub);

  const resolve = useLokResolve();

  return (
    <Avatar className={cn(props.className)}>
      <AvatarImage
        src={resolve(user?.profile.avatar?.presignedUrl) as string | undefined}
        alt={user?.username}
      />
      <AvatarFallback>{user?.username.slice(0, 2)}</AvatarFallback>
    </Avatar>
  );
};

/** What a device is called on a card: its name, or "Unnamed". */
export const deviceLabel = (device?: { name?: string | null } | null) => device?.name?.trim() || "Unnamed";

/**
 * The device an agent runs on, found by its device id (rekuest's
 * `Agent.device.deviceId`, lok's `Device.deviceId`). Every card on a page asks
 * in one batched request (`useDeviceChip`), never for the whole device list.
 * `inline` is the bare name (an agent's card draws the glyph beside it);
 * otherwise a badge. Always visible, and named even when the device is not:
 * its device id is the title.
 */
export const DeviceImprint = (props: { deviceId: string; className?: string; inline?: boolean }) => {
  const device = useDeviceChip(props.deviceId);
  const label = deviceLabel(device);
  const title = device?.name ? `${device.name} · ${props.deviceId}` : props.deviceId;
  const face = props.inline ? (
    <span className={cn("min-w-0 break-words", !device?.name && "italic", props.className)} title={title}>
      {label}
    </span>
  ) : (
    <Badge className={cn("truncate font-mono text-xs", props.className)} title={title}>
      {label}
    </Badge>
  );

  if (!device) return face;

  return (
    <LokDevice.DetailLink object={device} className={props.inline ? "min-w-0 hover:text-foreground hover:underline" : undefined}>
      {face}
    </LokDevice.DetailLink>
  );
};

export const JustUsername = (props: { sub: string }) => {
  const user = useUserChip(props.sub);

  return user?.username;
};

export const UserAvatarUsername = (props: { sub: string }) => {
  const user = useUserChip(props.sub);

  const resolve = useLokResolve();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <LokUser.DetailLink object={{ id: props.sub }}>
          <Avatar className="h-10 w-10 cursor-pointer">
            <AvatarImage
              className="rounded-md"
              src={
                resolve(user?.profile.avatar?.presignedUrl) as
                | string
                | undefined
              }
              alt={user?.username}
            />
            <AvatarFallback>{user?.username.slice(0, 2)}</AvatarFallback>
          </Avatar>
        </LokUser.DetailLink>
      </TooltipTrigger>

      <TooltipContent>{user?.username}</TooltipContent>
    </Tooltip>
  );
};
