// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes, useNavigate } from "react-router-dom";

vi.mock("@/app/Arkitekt", () => ({
  Arkitekt: { useActiveProfileId: () => "org-a" },
}));
vi.mock("@/constants", () => ({ baseName: "" }));
vi.mock("use-react-router-breadcrumbs", () => ({
  default: () => [{ breadcrumb: "Home" }, { breadcrumb: "5" }],
}));
// PageLayout's own dependencies are not what is under test here.
vi.mock("@/hooks/use-report", () => ({ useReport: () => vi.fn() }));
vi.mock("../navigation/BreadCrumbs", () => ({ default: () => <nav /> }));
vi.mock("../sidebars/help", () => ({ HelpSidebar: () => null }));
vi.mock("./Sidebars", () => ({ Sidebars: () => null }));

import { ActiveTabRouter } from "@/command/tabs/ActiveTabRouter";
import { TabOutlet } from "@/command/tabs/TabOutlet";
import { TabsProvider, useTabs } from "@/command/tabs/TabsProvider";
import { PageLayout } from "./PageLayout";

const Labels = () => <span data-testid="labels">{useTabs().tabs.map((t) => t.label).join(",")}</span>;

const DatasetPage = () => {
  const navigate = useNavigate();
  return (
    <PageLayout title="HeLa s3">
      <button onClick={() => navigate("/elsewhere")}>leave</button>
    </PageLayout>
  );
};

const routes = (
  <Routes>
    <Route path="/mikro/arraydatasets/:id" element={<DatasetPage />} />
    <Route path="*" element={<PageLayout title={undefined}>plain</PageLayout>} />
  </Routes>
);

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "#/mikro/arraydatasets/5";
});

describe("PageLayout names its tab", () => {
  it("reports its title, so an entity page is not titled by its id", () => {
    // The real component, end to end — `title` must actually reach the hook.
    render(
      <TabsProvider>
        <ActiveTabRouter>
          <Labels />
          <TabOutlet routes={routes} />
        </ActiveTabRouter>
      </TabsProvider>,
    );
    expect(screen.getByTestId("labels").textContent).toBe("HeLa s3");
  });

  it("lets the path name the tab again after navigating to a page without a title", () => {
    render(
      <TabsProvider>
        <ActiveTabRouter>
          <Labels />
          <TabOutlet routes={routes} />
        </ActiveTabRouter>
      </TabsProvider>,
    );
    act(() => screen.getByText("leave").click());
    expect(screen.getByTestId("labels").textContent).toBe("5");
  });
});
