import { ArrowRight, TriangleAlert } from "lucide-react";
import type React from "react";

import type { CatalogRoute } from "@/core/command/sources/routeCatalog";
import { useModuleNav } from "@/core/modules/hooks/useModuleNav";
import { matchIcon } from "@/core/modules/moduleIcons";
import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { RetryButton } from "@/core/layout/fallbacks/statusActions";
import { DroppableNavLink } from "@/core/ui/link";
import { cn } from "@/core/util/utils";

/** A page with a line of description: a tile. */
const PageTile = ({ link }: { link: CatalogRoute }) => {
  const Icon = link.icon;
  return (
    <DroppableNavLink to={link.route} className="block h-full">
      <span className="group/page flex h-full items-start gap-3 rounded-xl border border-border/50 bg-muted/20 p-3 transition-colors hover:border-primary/30 hover:bg-muted/50">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover/page:bg-primary/15 [&_svg]:h-4 [&_svg]:w-4">
          {Icon && <Icon />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-sm font-medium leading-tight text-foreground">
            <span className="truncate">{link.label}</span>
            <ArrowRight className="h-3 w-3 shrink-0 -translate-x-1 opacity-0 transition-all group-hover/page:translate-x-0 group-hover/page:opacity-100" />
          </span>
          {link.description && (
            <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
              {link.description}
            </span>
          )}
        </span>
      </span>
    </DroppableNavLink>
  );
};

/** A page whose label says it all (the per-kind dataset pages): a pill. */
const PageChip = ({ link }: { link: CatalogRoute }) => {
  const Icon = link.icon;
  return (
    <DroppableNavLink to={link.route} className="block">
      <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/50 bg-muted/20 px-3 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted/50 hover:text-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
        {Icon && <Icon />}
        {link.label}
      </span>
    </DroppableNavLink>
  );
};

/**
 * A module's pages, as its home page lays them out: the same list, grouped the
 * same way, as the right-click card on the module's rail tile (`useModuleNav`),
 * so a page added to `navLinks` shows up in both. Roomier than the card —
 * tiles with their description, pills for a group that has none. The home
 * page itself is left out.
 */
export const ModulePageLinks = ({ moduleKey, className }: { moduleKey: string; className?: string }) => {
  const nav = useModuleNav(moduleKey);
  if (nav.groups.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {nav.groups.map(({ title, links }) => {
        const chips = links.every((link) => !link.description);
        return (
          <section key={title}>
            <HomeSectionHeading>{title}</HomeSectionHeading>
            {chips ? (
              <div className="flex flex-wrap gap-1.5">
                {links.map((link) => (
                  <PageChip key={link.route} link={link} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-2">
                {links.map((link) => (
                  <PageTile key={link.route} link={link} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

/** The small uppercase label over a block of a module's home page. */
export const HomeSectionHeading = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h2
    className={cn(
      "mb-2 flex items-center gap-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
      className,
    )}
  >
    {children}
  </h2>
);

/**
 * A titled block of a module's home page — recent items, pinned ones. Callers
 * render it only when there is something in it (a home page says nothing
 * about what is not there).
 */
export const HomeSection = ({
  title,
  className,
  children,
}: {
  title: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) => (
  <section className={className}>
    <HomeSectionHeading>{title}</HomeSectionHeading>
    {children}
  </section>
);

/**
 * What a module's home page shows under its pages while the module holds
 * nothing yet: a dashed box saying how to put something in. The pages stay
 * above it — they are where things will be once there are some.
 */
export const HomeEmpty = ({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) => (
  <div className="rounded-xl border border-dashed border-border/70 px-4 py-6">
    <p className="text-base font-medium">{title}</p>
    {/* A div, not a p: callers put buttons (a DialogButton) in here. */}
    {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
  </div>
);

/**
 * What a module's home page shows under its pages when the query behind its
 * recent items failed: the compact status page (a fallback for PART of a
 * page), so the pages above stay usable.
 */
export const HomeError = ({
  what,
  error,
  onRetry,
}: {
  /** What could not be loaded, e.g. "your graphs". */
  what: string;
  error: { message: string };
  onRetry: () => void;
}) => (
  <StatusPage
    variant="compact"
    icon={TriangleAlert}
    tone="destructive"
    title={`Could not load ${what}`}
    technical={error.message}
    actions={<RetryButton onRetry={onRetry} />}
  />
);

/** The module's name and one line on what it holds, with its rail icon. */
export const ModuleHomeHeader = ({
  moduleKey,
  title,
  description,
  icon,
}: {
  moduleKey: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Defaults to the module's rail icon. */
  icon?: React.ReactNode;
}) => (
  <header className="flex items-center gap-3">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:h-5 [&_svg]:w-5">
      {icon ?? matchIcon(moduleKey)}
    </span>
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  </header>
);

/**
 * A module's home page, every module the same: header, the module's pages,
 * then what is new or pinned (`children`). Full width and left-aligned, like
 * every other page.
 *
 * `lead` sits between the header and the pages, for the one thing a module's
 * home is mostly used for (alpaka's composer, a headline figure); most have
 * none.
 */
export const ModuleHome = ({
  moduleKey,
  title,
  description,
  icon,
  lead,
  className,
  children,
}: {
  moduleKey: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  lead?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) => (
  <div className={cn("flex w-full flex-col gap-8 p-3", className)}>
    <ModuleHomeHeader moduleKey={moduleKey} title={title} description={description} icon={icon} />
    {lead}
    <ModulePageLinks moduleKey={moduleKey} />
    {children}
  </div>
);
