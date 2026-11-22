// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Images, Zap } from "lucide-react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { ModuleProfileFeedSource } from "@/core/modules/registries";
import { ProfileFeed } from "./ProfileFeed";
import type { ProfileFeedQuery } from "./feed";

const Ready = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const Down = ({ fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => <>{fallback ?? null}</>;

type Item = { id: string; name: string; at: string };

const source = (
  id: `${string}.${string}`,
  label: string,
  items: Item[],
  Guard: ModuleProfileFeedSource["Guard"] = Ready,
  spy?: (query: ProfileFeedQuery) => void,
): ModuleProfileFeedSource => {
  // The same array every render, as the contract asks.
  const result = { items, loading: false };
  return {
    id,
    namespace: id.split(".")[0]!,
    Guard,
    kinds: [{ id, label, icon: id.startsWith("mikro") ? Images : Zap }],
    useItems: (query) => {
      spy?.(query);
      return result;
    },
    itemKey: (item: Item) => item.id,
    createdAt: (item: Item) => item.at,
    Card: ({ item }: { item: Item }) => <p data-testid="card">{item.name}</p>,
  };
};

const IMAGES = source("mikro.images", "Images", [
  { id: "1", name: "newest image", at: "2026-11-20T00:00:00Z" },
  { id: "2", name: "old image", at: "2026-10-01T00:00:00Z" },
]);
const EXPERIMENTS = source("elektro.experiments", "Experiments", [
  { id: "x", name: "middle experiment", at: "2026-11-01T00:00:00Z" },
]);

const renderFeed = (sources: ModuleProfileFeedSource[]) =>
  render(
    <MemoryRouter>
      <ProfileFeed sub="ada" name="ada" sources={sources} />
    </MemoryRouter>,
  );

const cards = () => screen.queryAllByTestId("card").map((card) => card.textContent);

describe("ProfileFeed", () => {
  it("merges every service's items newest first", async () => {
    renderFeed([IMAGES, EXPERIMENTS]);
    await screen.findByText("newest image");
    expect(cards()).toEqual(["newest image", "middle experiment", "old image"]);
  });

  it("asks each source for this member", async () => {
    const spy = vi.fn();
    renderFeed([source("mikro.images", "Images", [], Ready, spy)]);
    await screen.findByText("Nothing from ada yet");
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ sub: "ada", search: "", kinds: ["mikro.images"] }));
  });

  it("hides a type when its toggle is turned off", async () => {
    renderFeed([IMAGES, EXPERIMENTS]);
    await screen.findByText("newest image");
    await userEvent.click(screen.getByRole("button", { name: "Images" }));
    expect(await screen.findByText("middle experiment")).toBeTruthy();
    expect(cards()).toEqual(["middle experiment"]);
  });

  it("offers no toggle and no cards for a service that is not ready", async () => {
    renderFeed([IMAGES, source("elektro.experiments", "Experiments", [{ id: "x", name: "hidden", at: "2026-11-21T00:00:00Z" }], Down)]);
    await screen.findByText("newest image");
    expect(screen.queryByRole("button", { name: "Experiments" })).toBeNull();
    expect(screen.queryByText("hidden")).toBeNull();
  });
});
