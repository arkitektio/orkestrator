// @vitest-environment jsdom
import * as React from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseBsx } from "@arkitektio/bsx/bsx/index";
import { installAppBlokCatalog } from "@/core/blok/testing";
import { ComponentContext } from "@/rekuest/api/graphql";
import { DraftBlokLogo, OwnBlokLogo } from "./OwnBlokLogo";

installAppBlokCatalog();

const SLOW = { timeout: 5000 };

const SOURCE =
  '<Blok kind="agent" context="panel"><logo title="Scope"><Circle cx="12" cy="12" r="7" stroke="brand" /></logo><Card /></Blok>';
const TREE = parseBsx(SOURCE).tree;

const useLogoBlokQuery = vi.fn(() => ({ data: { blok: { id: "panel", hash: "h1", componentTree: [TREE] } }, loading: false }));

vi.mock("@/rekuest/api/graphql", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/rekuest/api/graphql")>()),
  useLogoBlokQuery: () => useLogoBlokQuery(),
}));
vi.mock("@/rekuest/scene/RekuestSceneHost", () => ({
  RekuestSceneHost: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/rekuest/scene/RekuestAssetHost", () => ({
  RekuestAssetHost: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

afterEach(() => {
  cleanup();
  useLogoBlokQuery.mockClear();
});

describe("a blok's own logo", { timeout: 20000 }, () => {
  it("is its context's icon while it declares none, and fetches nothing", () => {
    const { container } = render(
      <OwnBlokLogo blok={{ id: "plain", hash: "h", context: ComponentContext.Panel, hasLogo: false }} className="h-4 w-4" />,
    );
    expect(container.querySelector("svg.lucide")).not.toBeNull();
    expect(useLogoBlokQuery).not.toHaveBeenCalled();
  });

  it("is its <logo>, drawn from its tree", async () => {
    const { container } = render(
      <OwnBlokLogo blok={{ id: "panel", hash: "h1", context: ComponentContext.Panel, hasLogo: true }} className="h-4 w-4" />,
    );
    await waitFor(() => expect(container.querySelector("svg[data-blok-svg] circle, span[data-logo-host] svg circle")).not.toBeNull(), SLOW);
    expect(container.querySelector("svg.lucide")).toBeNull();
  });

  it("is drawn live from a draft, and nothing without one", async () => {
    const drawn = render(<DraftBlokLogo tree={TREE} className="h-10 w-10" />);
    await waitFor(() => expect(drawn.container.querySelector("svg circle")).not.toBeNull(), SLOW);
    drawn.unmount();
    const none = render(<DraftBlokLogo tree={parseBsx('<Blok kind="agent" context="panel"><Card /></Blok>').tree} />);
    expect(none.container.innerHTML).toBe("");
  });
});
