// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProfileSectionFrame, ProfileSections } from "./ProfileSections";
import { createProfileSectionRegistry, type ProfileSection } from "./section";

const Ready = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const Down = () => null;

const base = { module: "test", priority: 1 } as const;

describe("ProfileSections", () => {
  it("never mounts a section whose module guard is not ready", () => {
    const Component = vi.fn(() => <p>hidden</p>);
    const registry = createProfileSectionRegistry([
      { ...base, id: "test.down", title: "Down", Guard: Down, Component } as ProfileSection,
    ]);
    render(<ProfileSections ctx={{ sub: "u", isMe: false }} registry={registry} />);
    expect(Component).not.toHaveBeenCalled();
  });

  it("keeps the other sections when one throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const Boom = () => {
      throw new Error("boom");
    };
    const Fine = ({ sub }: { sub: string }) => (
      <ProfileSectionFrame>
        <p>rows of {sub}</p>
      </ProfileSectionFrame>
    );
    const registry = createProfileSectionRegistry([
      { ...base, id: "test.boom", title: "Boom", Guard: Ready, Component: Boom },
      { ...base, id: "test.fine", title: "Fine", Guard: Ready, Component: Fine },
    ]);
    render(
      <MemoryRouter>
        <ProfileSections ctx={{ sub: "u1", isMe: false }} registry={registry} />
      </MemoryRouter>,
    );
    expect(screen.getByText("rows of u1")).toBeTruthy();
    // The frame names the section from its descriptor.
    expect(screen.getByRole("heading", { name: "Fine" })).toBeTruthy();
  });
});
