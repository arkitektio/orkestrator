import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Timestamp from "@/components/ui/timestamp";
import { KabinetDefinition, KabinetFlavour, KabinetRelease } from "@/linkers";
import { Boxes, Container, GitBranch, KeyRound, Plug, Tag } from "lucide-react";
import React, { useMemo, useState } from "react";
import { appGradient } from "./AppIcon";
import { InstallMenu, SelectorBadges } from "./store/StoreParts";
import { StoreDefinition } from "./store/storeModel";
import { StoreFlavourFragment } from "../api/graphql";

/** The parts of a requirement these panels read. */
export interface TabRequirement {
  key: string;
  service: string;
  optional: boolean;
  description?: string | null;
}

/**
 * The panels an app, a release and a flavour all show.
 *
 * Each takes the rows it renders rather than a whole app, so the same panel
 * serves an app (every flavour of its latest release), a release (its own
 * flavours) and a flavour (just itself). The alternative — passing a `StoreApp`
 * — forced the release and flavour pages to fake one.
 */
export const Fact = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5 border-l px-4 first:border-l-0 first:pl-0">
    <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
      {label}
    </span>
    <span className="text-sm font-semibold tabular-nums">{value}</span>
  </div>
);

export const ActionsTab = ({
  definitions,
  empty = "No actions registered.",
}: {
  definitions: readonly StoreDefinition[];
  empty?: string;
}) => {
  const [search, setSearch] = useState("");
  const shown = definitions.filter((d) =>
    `${d.name} ${d.description ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  if (definitions.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {definitions.length > 6 && (
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Filter ${definitions.length} actions…`}
          className="max-w-sm rounded-full"
        />
      )}
      <div className="grid gap-2 md:grid-cols-2">
        {shown.map((definition) => (
          <KabinetDefinition.DetailLink
            key={definition.id}
            object={definition}
            className="group flex gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-foreground/20"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Boxes className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium group-hover:underline">
                  {definition.name}
                </span>
                <Badge variant="outline" className="lowercase">
                  {definition.kind}
                </Badge>
              </div>
              {definition.description && (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {definition.description}
                </p>
              )}
            </div>
          </KabinetDefinition.DetailLink>
        ))}
      </div>
    </div>
  );
};

export const FlavoursTab = ({ flavours }: { flavours: readonly StoreFlavourFragment[] }) => (
  <div className="grid gap-3 lg:grid-cols-2">
    {flavours.map((flavour) => (
      <div key={flavour.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <KabinetFlavour.DetailLink
              object={flavour}
              className="text-sm font-semibold hover:underline"
            >
              {flavour.name}
            </KabinetFlavour.DetailLink>
            <p className="text-xs text-muted-foreground">
              {flavour.definitions.length} actions · {flavour.deployments.length}{" "}
              deployments
            </p>
          </div>
          <InstallMenu flavours={[flavour]} />
        </div>
        <SelectorBadges flavour={flavour} />
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-2 truncate font-mono">
            <Container className="size-3.5 shrink-0" />
            <span className="truncate">{flavour.image.imageString}</span>
          </span>
          {flavour.image.buildAt && (
            <span className="flex items-center gap-2">
              <Tag className="size-3.5 shrink-0" />
              built <Timestamp date={flavour.image.buildAt} relative />
            </span>
          )}
          {flavour.repo && (
            <a
              href={flavour.repo.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 hover:text-foreground"
            >
              <GitBranch className="size-3.5 shrink-0" />
              {flavour.repo.user}/{flavour.repo.repo}
            </a>
          )}
        </div>
      </div>
    ))}
  </div>
);

export const VersionsTab = ({
  releases,
  hue,
}: {
  // Not `readonly`: `DetailLink` constrains its object to a JSON-ish shape.
  releases: { id: string; version: string; flavours: { name: string }[] }[];
  hue: number;
}) => (
  <ol className="relative flex flex-col gap-4 border-l pl-6">
    {releases.map((release, index) => (
      <li key={release.id} className="relative">
        <span
          className="absolute -left-[1.85rem] top-1 size-3 rounded-full border-2 border-background"
          style={{ background: index === 0 ? appGradient(hue) : "var(--muted-foreground)" }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <KabinetRelease.DetailLink
            object={release}
            className="font-mono text-sm font-semibold hover:underline"
          >
            v{release.version}
          </KabinetRelease.DetailLink>
          {index === 0 && <Badge>latest</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {release.flavours.map((f) => f.name).join(", ") || "no flavours"}
        </p>
      </li>
    ))}
  </ol>
);

export const AccessTab = ({
  flavours,
  scopes,
}: {
  flavours: readonly { requirements: readonly TabRequirement[] }[];
  scopes: readonly string[];
}) => {
  // One service listed once, however many flavours ask for it.
  const requirements = useMemo(() => {
    const seen = new Map<string, TabRequirement>();
    flavours.flatMap((f) => f.requirements).forEach((r) => seen.set(r.key, r));
    return [...seen.values()];
  }, [flavours]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="flex flex-col gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Plug className="size-4" /> Services it talks to
        </h4>
        {requirements.length === 0 && (
          <p className="text-xs text-muted-foreground">No service requirements.</p>
        )}
        {requirements.map((requirement) => (
          <div key={requirement.key} className="rounded-xl border bg-card p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{requirement.service}</span>
              {requirement.optional && <Badge variant="outline">optional</Badge>}
            </div>
            {requirement.description && (
              <p className="text-xs text-muted-foreground">{requirement.description}</p>
            )}
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="size-4" /> Requested scopes
        </h4>
        {scopes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No scopes requested.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {scopes.map((scope) => (
              <Badge key={scope} variant="secondary" className="font-mono">
                {scope}
              </Badge>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

