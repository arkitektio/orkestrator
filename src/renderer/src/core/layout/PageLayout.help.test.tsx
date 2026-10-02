// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/core/connection/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/host")>()),
  Arkitekt: { useActiveProfileId: () => "org-a", useActiveProfile: () => null },
}));
vi.mock("@/core/constants", () => ({ baseName: "" }));
// PageLayout's own dependencies are not what is under test here.
vi.mock("@/core/debug/use-report", () => ({ useReport: () => vi.fn() }));
vi.mock("./BreadCrumbs", () => ({ default: () => <nav /> }));

import { ModelPageLayout } from "./ModelPageLayout";
import { PageHelp } from "./help";
import { PageLayout } from "./PageLayout";
import { Sidebars } from "./Sidebars";

const help = <PageHelp intro="What this page is." steps={["Press New."]} />;

const tabs = () => screen.getAllByRole("tab").map((tab) => tab.textContent);

const show = (page: React.ReactNode) => render(<MemoryRouter>{page}</MemoryRouter>);

beforeEach(() => {
  localStorage.clear();
});

describe("PageLayout shows a page's help", () => {
  it("in the fallback Help tab of a page without a rail", () => {
    show(<PageLayout title="Folders" help={help}>body</PageLayout>);
    expect(tabs()).toEqual(["Help"]);
    expect(screen.getByText("What this page is.")).toBeTruthy();
    expect(screen.getByText("Press New.")).toBeTruthy();
  });

  it("as a last tab of a page's own rail, which keeps its default tab", () => {
    show(
      <PageLayout
        title="Home"
        help={help}
        sidebars={
          <Sidebars sidebarKey="test">
            <Sidebars.Tab label="Statistics">stats</Sidebars.Tab>
          </Sidebars>
        }
      >
        body
      </PageLayout>,
    );
    expect(tabs()).toEqual(["Statistics", "Help"]);
    expect(screen.getByText("stats")).toBeTruthy();
  });

  it("in place of a Help tab the rail already places, without moving it", () => {
    show(
      <PageLayout
        title="Home"
        help={help}
        sidebars={
          <Sidebars sidebarKey="test">
            <Sidebars.Tab label="Help">nothing yet</Sidebars.Tab>
            <Sidebars.Tab label="Statistics">stats</Sidebars.Tab>
          </Sidebars>
        }
      >
        body
      </PageLayout>,
    );
    expect(tabs()).toEqual(["Help", "Statistics"]);
    expect(screen.queryByText("nothing yet")).toBeNull();
    expect(screen.getByText("What this page is.")).toBeTruthy();
  });

  it("adds no Help tab to a rail when the page has no help", () => {
    show(
      <PageLayout
        title="Home"
        sidebars={
          <Sidebars sidebarKey="test">
            <Sidebars.Tab label="Statistics">stats</Sidebars.Tab>
          </Sidebars>
        }
      >
        body
      </PageLayout>,
    );
    expect(tabs()).toEqual(["Statistics"]);
  });
});

describe("ModelPageLayout shows a page's help", () => {
  it("after the model's own tabs", () => {
    show(
      <ModelPageLayout
        identifier="@test/thing"
        object={{ id: "1" }}
        title="Thing"
        help={help}
        pageActions={<></>}
        additionalSidebars={<Sidebars.Tab label="Info">info</Sidebars.Tab>}
      >
        body
      </ModelPageLayout>,
    );
    expect(tabs()).toEqual(["Info", "Chat", "Help"]);
  });
});
