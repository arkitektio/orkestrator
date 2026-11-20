import { Arkitekt } from "@/core/connection/arkitekt/host";
import { moduleRegistry } from "@/app/Arkitekt";
import { useActiveProfile } from "@/core/connection/arkitekt/hooks";
import { useRoles } from "@/core/connection/roles";
import { useSelf } from "@/core/connection/useSelf";
import { useCommandPalette } from "@/core/command/CommandPaletteProvider";
import { formatAccelerator } from "@/core/command/accelerator";
import { loadRecents, type RecentEntry } from "@/core/command/recents";
import { useOpenTarget } from "@/core/command/useOpenTarget";
import { NotificationCountProvider } from "@/core/dashboard/notificationCount";
import { HomeSection } from "@/core/layout/ModuleHome";
import { SlotSections } from "@/core/layout/PageSections";
import { matchIcon } from "@/core/modules/moduleIcons";
import { isModuleAllowed } from "@/core/modules/registries";
import { smartRegistry } from "@/core/smart/registry";
import { useTabTitle } from "@/core/tabs/useTabTitle";
import { Kbd } from "@/core/ui/kbd";
import { cn } from "@/core/util/utils";
import { Search, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

/** "Good morning" until noon, "Good afternoon" until six, then "Good evening". */
export const greetingAt = (hour: number): string =>
  hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

/** The module a recent belongs to: `@mikro/image` and `/mikro/images` are both mikro's. */
export const moduleOfRecent = (entry: RecentEntry): string =>
  entry.kind === "entity"
    ? (entry.identifier.match(/^@([^/]+)\//)?.[1] ?? "")
    : (entry.route.split("/").filter(Boolean)[0] ?? "");

/** How many recents the home page offers to go back to. */
const RECENTS_SHOWN = 8;

/**
 * The search, as the page's first control: it IS the ⌘K palette, so the home
 * page has no second search with other sources or other keys.
 */
const SearchField = () => {
  const { openPalette } = useCommandPalette();
  return (
    <button
      type="button"
      onClick={() => openPalette()}
      className="flex h-11 w-full max-w-xl items-center gap-2.5 rounded-xl border border-border/60 bg-background/60 px-3.5 text-left text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-foreground"
    >
      <Search className="h-4 w-4 shrink-0 opacity-70" />
      <span className="flex-1">Search, ask or do…</span>
      <Kbd>{formatAccelerator("CommandOrControl+K")}</Kbd>
    </button>
  );
};

/**
 * One line, and only while a service is down: which, and where to look. A
 * healthy deployment says nothing about its health.
 */
const ServiceTrouble = () => {
  const services = Arkitekt.useAvailableServices();
  const down = services.filter((service) => service.status === "invalid");
  if (down.length === 0) return null;
  // A service is named after its module where one carries its key.
  const names = down.map((service) => moduleRegistry[service.key]?.label || service.key);
  return (
    <Link
      to="/settings/services"
      className="flex w-fit items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-warning/20"
    >
      <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-warning" />
      <span>
        {names.join(", ")} {names.length === 1 ? "is" : "are"} not reachable.
      </span>
      <span className="text-muted-foreground">See what is wrong →</span>
    </Link>
  );
};

/**
 * What is waiting for the member: every module's `notifications` section
 * (messages, mentions, call invitations). The sections report how many rows
 * they show, so the block — heading and all — is there only when one has any.
 */
const NeedsYou = ({ userId }: { userId: string }) => {
  const [count, setCount] = useState(0);
  return (
    // Hidden, not unmounted: the sections have to be mounted to count.
    <HomeSection title="Needs you" className={cn(count === 0 && "hidden")}>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <NotificationCountProvider onTotal={setCount}>
          <SlotSections slot="notifications" identifier="@lok/user" object={{ id: userId }} />
        </NotificationCountProvider>
      </div>
    </HomeSection>
  );
};

/** Where the member was: the palette's recents, as tiles. */
const Continue = () => {
  const profileId = Arkitekt.useActiveProfileId();
  const openTarget = useOpenTarget();
  // Read once per visit: the list is the palette's (localStorage), and this
  // page mounts anew each time it is navigated to.
  const recents = useMemo(() => loadRecents(profileId).slice(0, RECENTS_SHOWN), [profileId]);
  if (recents.length === 0) return null;

  return (
    <HomeSection title="Continue">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-2">
        {recents.map((entry) => (
          <button
            key={entry.kind === "entity" ? `${entry.identifier}:${entry.id}` : entry.route}
            type="button"
            onClick={() =>
              openTarget(
                entry.kind === "entity"
                  ? { kind: "entity", identifier: entry.identifier, id: entry.id, label: entry.label }
                  : { kind: "route", route: entry.route, label: entry.label },
              )
            }
            className="flex min-w-0 items-center gap-2.5 rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/10"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/40 text-muted-foreground">
              {matchIcon(moduleOfRecent(entry))}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{entry.label}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {entry.kind === "entity" ? smartRegistry.getDisplayName(entry.identifier) : "Page"}
              </span>
            </span>
          </button>
        ))}
      </div>
    </HomeSection>
  );
};

/**
 * The modules that are up, as tiles: what the page falls back to while there
 * is nothing else on it (a fresh organization, a first sign-in).
 */
const Modules = ({ className }: { className?: string }) => {
  const availableModules = Arkitekt.useAvailableModules();
  const { roles } = useRoles();
  const modules = useMemo(
    () =>
      Object.keys(moduleRegistry)
        .filter((key) => isModuleAllowed(key, roles))
        .map((key) => availableModules.find((entry) => entry.key === key))
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .filter((entry) => entry.status === "ready" || entry.status === "checking"),
    [availableModules, roles],
  );
  if (modules.length === 0) return null;

  return (
    <HomeSection title="Start somewhere" className={className}>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2">
        {modules.map((entry) => (
          <Link
            key={entry.key}
            to={entry.route}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-background/40 px-3 py-4 text-center transition-colors",
              "hover:border-primary/40 hover:bg-primary/10",
              entry.status === "checking" && "opacity-70",
            )}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/40 text-foreground [&_svg]:h-5 [&_svg]:w-5">
              {matchIcon(entry.key)}
            </span>
            <span className="text-xs font-medium">
              {moduleRegistry[entry.key]?.label || entry.definition.label || entry.key}
            </span>
          </Link>
        ))}
      </div>
    </HomeSection>
  );
};

/**
 * The app's home page: what needs you, and where you were.
 *
 * One column, read top to bottom, and nothing on it that has nothing to say:
 * the greeting and the search; what is waiting for the member (every module's
 * `notifications` section); the palette's recents; then what each module has
 * for them (`home` sections, by `priority`: calls in progress, tasks, todos,
 * new data). The host draws no module's data itself — a module that is not
 * installed simply has no block here, and each block sits behind its guard.
 *
 * The module tiles are the empty state, not a fixture: they show only while
 * every block above them rendered nothing (`peer-empty`), since the rail
 * already carries the modules.
 */
export const HomePage = () => {
  useTabTitle("Home");
  const { userId, username } = useSelf();
  const organization = useActiveProfile()?.label.organizationName;

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="flex w-full flex-col gap-8 px-6 py-8">
        <header className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {greetingAt(new Date().getHours())}
              {username ? `, ${username}` : ""}
            </h1>
            {organization && <p className="mt-0.5 text-sm text-muted-foreground">{organization}</p>}
          </div>
          <SearchField />
          <ServiceTrouble />
        </header>

        {userId && <NeedsYou userId={userId} />}

        <div className="peer flex flex-col gap-8 empty:hidden">
          <Continue />
          {userId && <SlotSections slot="home" identifier="@lok/user" object={{ id: userId }} />}
        </div>
        <Modules className="hidden peer-empty:block" />
      </div>
    </div>
  );
};

export default HomePage;
