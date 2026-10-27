// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseBsx } from "@/core/blok/bsx/parse";
import { printBsx } from "@/core/blok/bsx/print";
import type { BlokComponentNode } from "@/core/blok/renderer/runtime";
import basiks from "./basiks.fixture.json";
import { DefinitionLogo, KabinetBlokLogo } from "./KabinetBlokLogo";

/**
 * `basiks.fixture.json` is what kabinet serves for the basiks app, as v2 trees: its
 * logo and the action logo of `threshold_image` (`AgentLogo` and `ActionLogo` roots, painted with
 * the viewer's pens), each parsed from the BSX the app sent.
 * They must draw through the same logo cache rekuest's bloks do.
 */
type Tree = (typeof basiks)["logo"];
const trees: Record<string, Tree> = { "3:basiks_logo": basiks.logo, "3:basiks_threshold_image": basiks.actionLogo };

const useKabinetLogoTreeQuery = vi.fn(({ variables }: { variables: { id: string } }) => ({
  data: { flavourBlok: { id: variables.id, ...trees[variables.id] } },
}));

vi.mock("@/kabinet/api/graphql", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/kabinet/api/graphql")>()),
  useKabinetLogoTreeQuery: (options: { variables: { id: string } }) => useKabinetLogoTreeQuery(options),
}));

/** A first drawing settles before it is kept; a loaded test run takes longer than waitFor's default. */
const SLOW = { timeout: 5000 };
/** A kept drawing, placed inline. */
const KEPT = 'span[data-logo-host] > svg[data-blok-prefix^="logo"]';

afterEach(cleanup);

describe("a kabinet logo", { timeout: 20000 }, () => {
  it.each([["logo", basiks.logo], ["action logo", basiks.actionLogo]])("%s is a v2 tree that reads back from its BSX", (_, entry) => {
    const [root] = entry.componentTree as BlokComponentNode[];
    expect(parseBsx(printBsx(root)).tree).toEqual(root);
  });

  it("draws an app's LOGO from the tree kabinet parsed, and keeps it", async () => {
    const first = render(<KabinetBlokLogo blok={{ id: "3:basiks_logo", hash: basiks.logo.hash }} className="size-8" />);

    await waitFor(() => expect(first.container.querySelector(KEPT)).not.toBeNull(), SLOW);
    // The cache id is prefixed; the query asks for the blok by its own id.
    expect(useKabinetLogoTreeQuery).toHaveBeenCalledWith({ variables: { id: "3:basiks_logo" } });
    first.unmount();

    useKabinetLogoTreeQuery.mockClear();
    const again = render(<KabinetBlokLogo blok={{ id: "3:basiks_logo", hash: basiks.logo.hash }} className="size-8" />);
    await waitFor(() => expect(again.container.querySelector(KEPT)).not.toBeNull());
    expect(useKabinetLogoTreeQuery).not.toHaveBeenCalled();
  });

  it("draws an action by the ACTION_LOGO its definition names", async () => {
    const definition = { logo: { id: "3:basiks_threshold_image", hash: basiks.actionLogo.hash } };
    const drawn = render(<DefinitionLogo definition={definition} className="size-4" />);

    const svg = await waitFor(() => {
      const found = drawn.container.querySelector(KEPT);
      expect(found).not.toBeNull();
      return found as SVGSVGElement;
    }, SLOW);
    expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg.querySelectorAll("circle").length).toBeGreaterThan(0);
  });

  it("shows nothing for a definition no blok draws", () => {
    const none = render(<DefinitionLogo definition={{ logo: null }} />);
    expect(none.container.innerHTML).toBe("");
  });
});
