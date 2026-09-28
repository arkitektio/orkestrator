// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mikroQuery = vi.fn();
const rekuestQuery = vi.fn();
const kraphQuery = vi.fn();
const lokQuery = vi.fn();

// Guards render their children only when the service is ready. Drive that
// directly so the test can assert the thing that actually matters: a module
// that is NOT ready must never run its query.
const ready = { mikro: true, rekuest: true, kraph: true, lok: true };

// The palette loops over every module's `search` builtin, each inside its
// module's guard. Give it the real searches behind guards driven by `ready`.
vi.mock("@/core/modules/registries", async () => {
  const { MikroEntitySearch } = await import("@/mikro/search");
  const { RekuestEntitySearch } = await import("@/rekuest/search");
  const { KraphEntitySearch } = await import("@/kraph/search");
  const { LokEntitySearch } = await import("@/lok/search");
  const guard =
    (key: keyof typeof ready) =>
    ({ children }: { children: React.ReactNode }) =>
      ready[key] ? <>{children}</> : null;
  return {
    moduleSearches: () => [
      { namespace: "mikro", Guard: guard("mikro"), Search: MikroEntitySearch },
      { namespace: "rekuest", Guard: guard("rekuest"), Search: RekuestEntitySearch },
      { namespace: "kraph", Guard: guard("kraph"), Search: KraphEntitySearch },
      { namespace: "lok", Guard: guard("lok"), Search: LokEntitySearch },
    ],
  };
});

vi.mock("@/mikro/api/graphql", () => ({ useGlobalSearchQuery: (o: unknown) => mikroQuery(o) }));
vi.mock("@/rekuest/api/graphql", () => ({ useGlobalSearchQuery: (o: unknown) => rekuestQuery(o) }));
vi.mock("@/kraph/api/graphql", () => ({ useGlobalSearchQuery: (o: unknown) => kraphQuery(o) }));
vi.mock("@/lok/api/graphql", () => ({ useGlobalSearchQuery: (o: unknown) => lokQuery(o) }));

// The debounce would otherwise swallow the term for 250ms.
vi.mock("@uidotdev/usehooks", () => ({ useDebounce: (v: unknown) => v }));

vi.mock("./EntityRow", () => ({
  EntityRow: ({ label, identifier }: { label: string; identifier: string }) => (
    <div data-testid="row" data-identifier={identifier}>
      {label}
    </div>
  ),
}));

import { Command, CommandList } from "@/core/ui/command";
import { ApplicableEntitySearch } from "./ApplicableEntitySearch";

/** `CommandGroup` needs a cmdk `Command` ancestor, exactly as in the palette. */
const renderInPalette = (ui: React.ReactElement) =>
  render(
    <Command shouldFilter={false}>
      <CommandList>{ui}</CommandList>
    </Command>,
  );

beforeEach(() => {
  [mikroQuery, rekuestQuery, kraphQuery, lokQuery].forEach((m) => {
    m.mockReset();
    m.mockReturnValue({ data: undefined });
  });
  Object.keys(ready).forEach((k) => {
    ready[k as keyof typeof ready] = true;
  });
});

describe("ApplicableEntitySearch", () => {
  it("asks nobody until the term is worth a round trip", () => {
    // One character matches most of a database and helps nobody.
    renderInPalette(<ApplicableEntitySearch filter="a" objects={[]} />);
    expect(mikroQuery).not.toHaveBeenCalled();
    expect(lokQuery).not.toHaveBeenCalled();
  });

  it("asks nothing at all on an empty query", () => {
    renderInPalette(<ApplicableEntitySearch filter="" objects={[]} />);
    expect(mikroQuery).not.toHaveBeenCalled();
  });

  it("never runs a module's query when that module is not ready", () => {
    // The CLAUDE.md #1 invariant: the Apollo client only exists once the
    // service is ready, and the hook fires on mount — so the guard has to keep
    // the component from mounting at all, not merely hide its output.
    ready.mikro = false;
    ready.kraph = false;

    renderInPalette(<ApplicableEntitySearch filter="cell" objects={[]} />);

    expect(mikroQuery).not.toHaveBeenCalled();
    expect(kraphQuery).not.toHaveBeenCalled();
    expect(rekuestQuery).toHaveBeenCalled();
    expect(lokQuery).toHaveBeenCalled();
  });

  it("caps each entity type server-side", () => {
    renderInPalette(<ApplicableEntitySearch filter="cell" objects={[]} />);
    expect(mikroQuery.mock.calls[0][0].variables.pagination.limit).toBe(5);
  });

  it("groups results under the module they came from", () => {
    mikroQuery.mockReturnValue({
      data: {
        arrayDatasets: [{ id: "1", name: "Cells" }],
        files: [{ id: "2", name: "cells.tif" }],
        folders: [],
      },
    });

    renderInPalette(<ApplicableEntitySearch filter="cell" objects={[]} />);

    const rows = screen.getAllByTestId("row");
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.dataset.identifier)).toEqual([
      "@mikro/arraydataset",
      "@mikro/file",
    ]);
  });

  it("renders nothing for a module that returned no matches", () => {
    lokQuery.mockReturnValue({ data: { users: [], groups: [] } });
    renderInPalette(<ApplicableEntitySearch filter="cell" objects={[]} />);
    expect(screen.queryAllByTestId("row")).toHaveLength(0);
  });
});
