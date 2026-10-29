// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Command, CommandList } from "@/core/ui/command";

vi.mock("@/core/connection/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/host")>()),
  Arkitekt: { useActiveProfileId: () => "org-a" },
}));

import { provideSmartRegistries } from "../hostRegistries";
import { CommandActionRow } from "./CommandActionRow";
import { PaletteSections } from "./PaletteSections";
import type { SmartContextSection, SmartSectionContext } from "./section";
import { createSmartSectionRegistry } from "./sectionRegistry";
import type { RelatedContext } from "./types";

type Routed = { id: string; route?: string };

const dataset = [{ identifier: "@mikro/arraydataset", id: "1" }];
const lens = [{ identifier: "@mikro/arraylens", id: "9" }];
const related: RelatedContext[] = [{ key: "wholeLens", label: "Whole array", objects: lens }];

/** Every mount's row: what it is and what it would run on. */
const Row = ({ item, context }: { item: string | Routed; context: SmartSectionContext }) => {
  const id = typeof item === "string" ? item : item.id;
  return <CommandActionRow value={id} title={`${id} on ${context.objects[0].identifier}`} />;
};

const repeatSection: SmartContextSection<string> = {
  id: "local.actions",
  module: "local",
  title: "Default",
  priority: 0,
  tier: "instant",
  palette: true,
  related: { mode: "repeat" },
  applies: () => true,
  useItems: (ctx) => ({
    items: ctx.objects[0].identifier === "@mikro/arraylens" ? ["rename", "open"] : ["open"],
    status: "ready",
  }),
  itemKey: (item) => item,
  Row,
};

/** What each mount asked for: the page's objects and every related one's. */
const asked: string[] = [];

const orSection: SmartContextSection<Routed> = {
  id: "rekuest.actions",
  module: "rekuest",
  title: "Run",
  priority: 40,
  tier: "remote",
  palette: true,
  related: { mode: "or", routeOf: (item) => item.route },
  applies: () => true,
  useItems: (ctx) => {
    const page = ctx.primary ?? ctx;
    asked.push(
      [page.objects[0].identifier, ...(ctx.related ?? []).map((r) => r.objects[0].identifier)].join("|"),
    );
    return {
      items: [
        { id: "segment", route: "@mikro/arraydataset" },
        { id: "measure", route: "@mikro/arraylens" },
        { id: "unrouted" },
      ],
      status: "ready",
    };
  },
  itemKey: (item) => item.id,
  Row,
};

const pageOnlySection: SmartContextSection<string> = {
  id: "kabinet.definitions",
  module: "kabinet",
  title: "Installable",
  priority: 50,
  tier: "remote",
  palette: true,
  applies: () => true,
  useItems: () => ({ items: ["install"], status: "ready" }),
  itemKey: (item) => item,
  Row,
};

const renderPalette = (withRelated?: RelatedContext[]) =>
  render(
    <Command>
      <CommandList>
        <PaletteSections objects={dataset} related={withRelated} />
      </CommandList>
    </Command>,
  );

describe("PaletteSections with related contexts", () => {
  beforeEach(() => {
    // cmdk scrolls the selected row into view; jsdom has no layout.
    Element.prototype.scrollIntoView ??= () => {};
    asked.length = 0;
    provideSmartRegistries({
      sections: createSmartSectionRegistry([repeatSection, orSection, pageOnlySection]),
    });
  });
  afterEach(() => {
    provideSmartRegistries({ sections: createSmartSectionRegistry([]) });
  });

  it("lists the page's own rows only, without related contexts", () => {
    renderPalette();
    expect(screen.getByText("open on @mikro/arraydataset")).toBeInTheDocument();
    expect(screen.queryByText(/on @mikro\/arraylens/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Whole array/)).not.toBeInTheDocument();
  });

  it("repeats an opted-in section for the related context, under its label, running on its objects", () => {
    renderPalette(related);
    expect(screen.getByText("Whole array · Default")).toBeInTheDocument();
    expect(screen.getByText("rename on @mikro/arraylens")).toBeInTheDocument();
    expect(screen.getByText("open on @mikro/arraylens")).toBeInTheDocument();
    expect(screen.getByText("open on @mikro/arraydataset")).toBeInTheDocument();
  });

  it("asks one identical question from every mount of an OR section and routes the rows", () => {
    renderPalette(related);
    expect(new Set(asked)).toEqual(new Set(["@mikro/arraydataset|@mikro/arraylens"]));
    expect(screen.getByText("segment on @mikro/arraydataset")).toBeInTheDocument();
    expect(screen.getByText("unrouted on @mikro/arraydataset")).toBeInTheDocument();
    expect(screen.getByText("measure on @mikro/arraylens")).toBeInTheDocument();
    expect(screen.queryByText("measure on @mikro/arraydataset")).not.toBeInTheDocument();
    expect(screen.queryByText("segment on @mikro/arraylens")).not.toBeInTheDocument();
    expect(screen.getByText("Whole array · Run")).toBeInTheDocument();
  });

  it("does not repeat a section that serves the page only", () => {
    renderPalette(related);
    expect(screen.getAllByText(/^install on/)).toHaveLength(1);
    expect(screen.queryByText("Whole array · Installable")).not.toBeInTheDocument();
  });

  it("scopes the related rows' cmdk values, so the same action is two rows", () => {
    const { container } = renderPalette(related);
    const values = [...container.querySelectorAll("[cmdk-item]")].map((node) =>
      node.getAttribute("data-value"),
    );
    expect(values).toContain("open");
    expect(values).toContain("wholeLens::open");
    expect(new Set(values).size).toBe(values.length);
  });
});
