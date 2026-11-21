// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BlokMaterializedPicker, boundAgents } from "./BlokMaterializedPicker";

vi.mock("@/core/dialogs/registry", () => ({ useDialog: () => ({ openDialog: vi.fn() }) }));
vi.mock("@/core/linkers", () => ({
  RekuestMaterializedBlok: { DetailLink: ({ children }: { children: React.ReactNode }) => <span>{children}</span> },
}));

const agent = (id: string, connected = true) => ({ id, name: `agent ${id}`, connected });
const materialized = (id: string, mappings: { key: string; agent: ReturnType<typeof agent> }[]) =>
  ({ id, name: `copy ${id}`, blok: { id: "b", name: "blok" }, agentMappings: mappings }) as never;

describe("BlokMaterializedPicker", () => {
  it("lists one agent once, however many keys it answers", () => {
    const one = agent("1");
    expect(boundAgents({ agentMappings: [{ key: "a", agent: one }, { key: "b", agent: one }] } as never)).toHaveLength(1);
  });

  it("switches between the demo and the blok's materializations", () => {
    const onShow = vi.fn();
    render(
      <BlokMaterializedPicker
        blokId="b"
        materialized={[materialized("m1", [{ key: "stage", agent: agent("1") }]), materialized("m2", [])]}
        shown="m1"
        onShow={onShow}
      />,
    );
    expect(screen.getByRole("button", { name: /copy m1/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /Demo values/ }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: /copy m2/ }));
    expect(onShow).toHaveBeenCalledWith("m2");
    fireEvent.click(screen.getByRole("button", { name: /Demo values/ }));
    expect(onShow).toHaveBeenCalledWith(null);
  });
});
