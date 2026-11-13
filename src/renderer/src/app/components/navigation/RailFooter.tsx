import { Arkitekt } from "@/core/connection/arkitekt/host";
import { AgentEngageIcon, AgentEngageItem, useAgentEngage } from "@/core/agent/AgentEngageToggle";
import ProfileSwitcher from "@/app/components/profile/ProfileSwitcher";
import { profileDetail, profileTitle } from "@/core/connection/profile/ui/profileLabels";
import { ProfileBrandAvatar } from "@/core/connection/profile/ui/ProfileBrandAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import { cn } from "@/core/util/utils";
import { AlertTriangle, ChevronsUpDown, Laptop, Network, Server, Settings, ShieldCheck, UsersRound } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";

import { pathTitle, type TunnelPath } from "@/core/connection/mesh/connectionPath";
import { directnessLine, type Directness } from "@/core/connection/mesh/directness";
import { useConnectionPath } from "@/core/connection/mesh/useConnectionPath";
import { useMeshDirectness } from "@/core/connection/mesh/useMeshDirectness";

import { useRailSwitcherRequests } from "@/core/connection/profile/ui/railSwitcher";

/**
 * How the org switcher marks a tunnel: a thin ring on the avatar and a small
 * badge in its corner. Theme tokens only, so it follows light, dark and the
 * brand colour: the app's own mesh takes `primary`, anything the OS runs
 * (a VPN, a system Tailscale) stays in the muted foreground — the glyph
 * tells them apart.
 */
const PATH_STYLE: Record<TunnelPath["kind"], { ring: string; glyph: string; Icon: typeof Network }> = {
  "arkitekt-mesh": { ring: "ring-primary/60", glyph: "text-primary", Icon: Network },
  vpn: { ring: "ring-muted-foreground/50", glyph: "text-muted-foreground", Icon: ShieldCheck },
};

/** A dashed wire between two ends of the picture. */
const Wire = () => <span className="h-px flex-1 border-t border-dashed border-muted-foreground/40" />;

/**
 * The note the switcher folds out on hover: this computer → the tunnel →
 * the server, drawn, and a caption naming the tunnel.
 *
 * For the app's own mesh it also says how the tunnel runs, from a ping of the
 * machines the services live on (`useMeshDirectness`): machine to machine, or
 * through a relay — which works, but slower, so a warning sign sits next to
 * the mesh symbol. A machine that does not answer gets the same sign.
 */
const PathNote = ({ path, directness }: { path: TunnelPath; directness?: Directness }) => {
  const { Icon, glyph } = PATH_STYLE[path.kind];
  const line = directness && directnessLine(directness);
  const warn = directness?.state === "relayed" || directness?.state === "unreachable";
  const slow = (directness?.machines ?? []).filter((machine) => machine.path === "relayed" || machine.path === "unreachable");
  return (
    <div className="flex flex-col items-center gap-1 px-2 pb-1 pt-2">
      <div className="flex w-full max-w-40 items-center gap-1.5 text-muted-foreground [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0">
        <Laptop />
        <Wire />
        <span className="relative shrink-0">
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border border-border bg-popover",
              glyph,
            )}
          >
            <Icon className="h-3 w-3" />
          </span>
          {warn && (
            <AlertTriangle
              data-testid="rail-footer-path-warning"
              aria-hidden
              className="absolute -right-2 -top-1.5 h-3 w-3 fill-popover text-amber-500"
            />
          )}
        </span>
        <Wire />
        <Server />
      </div>
      <span className="max-w-full truncate text-[11px] text-muted-foreground">{pathTitle(path)}</span>
      {line && (
        <span
          data-testid="rail-footer-path-directness"
          data-directness={directness?.state}
          className={cn("max-w-full truncate text-[10px]", warn ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/70")}
          // Which machines, when it is not all of them at a glance.
          title={slow.map((machine) => `${machine.name}: ${machine.path === "relayed" ? `relayed${machine.relay ? ` via ${machine.relay}` : ""}` : "no answer"}`).join("\n") || undefined}
        >
          {line}
        </span>
      )}
    </div>
  );
};

/**
 * The foot of the rail: which organization you are in, and a way out of it.
 *
 * The organization is the single most consequential piece of state in the app —
 * every id on screen belongs to one — and it used to be a badge buried two
 * levels inside an avatar menu. Here it is a named, always-visible row that
 * reads as what it is: a switcher.
 *
 * Renders from the profile book, not from a lok query, so it still says
 * something useful while signed out or offline.
 */
export const RailFooter = () => {
  const activeProfile = Arkitekt.useActiveProfile();
  // The launch path: the window is already open on this account, its token is
  // still being proven. The only sign the app gives that anything is pending —
  // there is no splash, no page skeleton and no island for it.
  const autoLoggingIn = Arkitekt.useIsAutoLoggingIn();
  const parkSession = Arkitekt.useDisconnect();
  const path = useConnectionPath();
  // Direct or relayed: asked when the mesh's machines are first known, and
  // again (at most every half minute) when the pointer comes to rest here.
  const directness = useMeshDirectness();
  const agent = useAgentEngage();
  const navigate = useNavigate();
  const tunnel = path.kind === "direct" ? undefined : path;
  const style = tunnel && PATH_STYLE[tunnel.kind];

  // Controlled so other surfaces can point the user here — Settings → Account
  // has a "Switch account" button rather than a second copy of the list.
  const [open, setOpen] = React.useState(false);
  const requests = useRailSwitcherRequests();
  const seen = React.useRef(requests);
  React.useEffect(() => {
    if (seen.current === requests) return;
    seen.current = requests;
    setOpen(true);
  }, [requests]);

  // The same pair the switcher's rows draw: the hub leads, because that is what
  // is being chosen between, and what places it follows in muted text.
  const name = activeProfile ? profileTitle(activeProfile) : "Not signed in";
  const detail = autoLoggingIn
    ? "Signing in…"
    : activeProfile
      ? profileDetail(activeProfile)
      : undefined;

  return (
    // `app-no-drag`: the rail around it is a window-drag region, which would
    // otherwise swallow every click on the switcher and the settings link.
    <div className="app-no-drag flex w-full min-w-0 shrink-0 px-2 pb-2">
      {/* When a tunnel carries the traffic the avatar wears its colour, and
          hovering folds a note out above the switcher — in place, growing
          upward, after a beat so a pointer passing by does not jolt the rail.
          Not while the menu is open: the menu is the thing being looked at. */}
      <div
        data-path={path.kind}
        className="group/path flex min-w-0 flex-1 flex-col rounded-lg"
        onMouseEnter={path.kind === "arkitekt-mesh" ? directness.check : undefined}
      >
        {tunnel && !open && (
          <div
            data-testid="rail-footer-path-note"
            className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 group-hover/path:grid-rows-[1fr] group-hover/path:delay-300"
          >
            <div className="min-h-0 overflow-hidden">
              <PathNote path={tunnel} directness={tunnel.kind === "arkitekt-mesh" ? directness : undefined} />
            </div>
          </div>
        )}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          className={cn(
            "group flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 text-left",
            "transition-colors hover:bg-background focus-visible:outline-none",
          )}
        >
          {activeProfile ? (
            // The ring spins around the real avatar rather than replacing it:
            // the account is known from the cached label, only its session is
            // pending, and swapping in a spinner would hide what we do know.
            <span className="relative shrink-0">
              <ProfileBrandAvatar
                profile={activeProfile}
                className={cn(
                  "h-6 w-6 text-[9px]",
                  style && ["ring-1 ring-offset-1 ring-offset-background", style.ring],
                )}
              />
              {style && (
                <span
                  aria-hidden
                  data-testid="rail-footer-path-badge"
                  className={cn(
                    "absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-border bg-popover shadow-sm",
                    style.glyph,
                  )}
                >
                  <style.Icon className="h-2 w-2" />
                </span>
              )}
              {autoLoggingIn && (
                <span
                  data-testid="rail-footer-signing-in"
                  aria-hidden
                  className="absolute -inset-0.5 animate-spin rounded-lg border border-transparent border-t-primary"
                />
              )}
            </span>
          ) : (
            <div className="h-6 w-6 shrink-0 rounded-md border border-dashed" />
          )}

          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-xs font-medium text-foreground">
              {name}
            </span>
            {tunnel && (
              <span className="sr-only">
                {`Connected through ${pathTitle(tunnel)}`}
                {tunnel.kind === "arkitekt-mesh" && directness.state === "relayed" ? `, ${directnessLine(directness)}` : ""}
              </span>
            )}
            {detail && (
              <span
                className={cn(
                  "truncate text-[10px] text-muted-foreground",
                  autoLoggingIn && "animate-pulse",
                )}
              >
                {detail}
              </span>
            )}
          </span>

          {/* The agent's state stays in sight; switching it is in the menu. */}
          {agent && (
            <>
              <AgentEngageIcon state={agent.state} />
              <span className="sr-only">{agent.label}</span>
            </>
          )}

          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="top"
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-64 border-border"
        >
          <DropdownMenuLabel className="py-1 text-xs font-normal text-muted-foreground">
            Switch organization
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Only organizations here: switching is the menu's whole job. */}
          <ProfileSwitcher />

          <DropdownMenuSeparator />

          {/* Whether apps you run may ask you something here (the agent). */}
          <AgentEngageItem />

          {/* Settings is a destination: appearance (light / dark) lives there
              too, not here. */}
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-xs"
            onSelect={() => navigate("/settings")}
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </DropdownMenuItem>

          {/* Adding an account hands off to an external browser for up to a
              minute, which a menu that closes on every click cannot host — so
              there is no "add" in here and no dialog reimplementing the sign-in
              screen. This parks the session instead: nothing is signed out, the
              credential is untouched, and the real sign-in screen comes back
              with every stored account on it. */}
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-xs text-muted-foreground focus:text-foreground"
            onSelect={() => void parkSession()}
          >
            <UsersRound className="h-3.5 w-3.5" />
            Manage accounts…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </div>
  );
};

export default RailFooter;
