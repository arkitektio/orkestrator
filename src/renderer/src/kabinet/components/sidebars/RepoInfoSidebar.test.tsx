// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The smart wrappers need the whole provider stack; the rail only needs them
// to render their children.
vi.mock("@/core/linkers", () => ({
  KabinetFlavour: {
    Smart: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    DetailLink: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <a className={className}>{children}</a>
    ),
  },
}));

import { RepoInfoSidebar } from "./RepoInfoSidebar";

const flavour = (overrides: Partial<Parameters<typeof RepoInfoSidebar>[0]["repo"]["flavours"][number]> = {}) => ({
  id: "f1",
  name: "vanilla",
  release: { id: "r1", version: "0.1.0", app: { identifier: "arkitekt/app" } },
  selectors: [{ __typename: "CudaSelector" as const, cudaVersion: "12", cudaCores: 100 }],
  image: { imageString: "ghcr.io/arkitekt/app:0.1.0-vanilla", buildAt: "2026-09-01T00:00:00Z" },
  requirements: [
    { key: "mikro", service: "mikro", optional: false, description: "Images" },
    { key: "kraph", service: "kraph", optional: true, description: null },
  ],
  ...overrides,
});

const repo = (overrides: Partial<Parameters<typeof RepoInfoSidebar>[0]["repo"]> = {}) => ({
  id: "1",
  name: "app",
  branch: "main",
  user: "arkitekt",
  repo: "app",
  url: "https://github.com/arkitekt/app",
  issueUrl: "https://github.com/arkitekt/app/issues",
  addedAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-02T00:00:00Z",
  organization: { slug: "lab" },
  flavours: [flavour()],
  ...overrides,
});

describe("RepoInfoSidebar", () => {
  it("names branch, owner and organization", () => {
    render(<RepoInfoSidebar repo={repo()} />);
    expect(screen.getByText("main")).toBeInTheDocument();
    expect(screen.getByText("lab")).toBeInTheDocument();
  });

  it("calls a missing organization Global, like the file rail", () => {
    render(<RepoInfoSidebar repo={repo({ organization: { slug: "" } })} />);
    expect(screen.getByText("Global")).toBeInTheDocument();
  });

  it("links out to the repository and its issues", () => {
    render(<RepoInfoSidebar repo={repo()} />);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("https://github.com/arkitekt/app");
    expect(hrefs).toContain("https://github.com/arkitekt/app/issues");
  });

  it("lists each flavour with its image, selector and requirements", () => {
    render(<RepoInfoSidebar repo={repo()} />);
    expect(screen.getByText("ghcr.io/arkitekt/app:0.1.0-vanilla")).toBeInTheDocument();
    expect(screen.getByText("CUDA")).toBeInTheDocument();
    expect(screen.getByText("mikro")).toBeInTheDocument();
    // An optional requirement is marked, not hidden.
    expect(screen.getByText("kraph?")).toBeInTheDocument();
  });

  it("says so when the scan found no flavours", () => {
    render(<RepoInfoSidebar repo={repo({ flavours: [] })} />);
    expect(screen.getByText(/No flavours found/)).toBeInTheDocument();
  });
});
