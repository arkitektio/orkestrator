// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const complete = vi.fn();
const host = vi.hoisted(() => ({ client: {} as object | undefined, profile: "p-1" }));

vi.mock("@/core/modules/registries", () => ({
  MODULE_AUTH_FLOWS: {
    bank: { service: "bank", title: "Bank login", complete: (...args: unknown[]) => complete(...args) },
  },
}));
vi.mock("@/core/modules/host/host", () => ({ useModuleHostVersion: () => 0 }));
vi.mock("@/core/modules/host/operations", () => ({ resolveServiceClient: () => host.client }));
vi.mock("@/core/connection/arkitekt/host", () => ({
  Arkitekt: {
    useStoreApi: () => ({ getState: () => ({}), getInitialState: () => ({}), subscribe: () => () => undefined }),
    useActiveProfileId: () => host.profile,
    useProfiles: () => [{ id: "p-2", label: { organizationName: "Other Lab" }, identity: { baseUrl: "https://other" } }],
  },
}));
vi.mock("@/core/dialogs/registry", () => ({ useDialog: () => ({ openDialog: vi.fn() }) }));
vi.mock("@/core/layout/fallbacks/statusActions", () => ({ BackButton: () => null, HomeButton: () => null }));
vi.mock("@/core/smart/registry", () => ({
  smartRegistry: { getModelPath: (identifier: string) => (identifier === "@bank/connection" ? "bank/connections" : undefined) },
}));

import { onAuthUpdate } from "./announce";
import { AuthCallbackPage } from "./AuthCallbackPage";
import { findPending, rememberPending } from "./pending";
import { RelayCallbackRedirect } from "./RelayCallbackRedirect";

const Where = () => <span data-testid="where">{useLocation().pathname}</span>;

const open = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="auth/callback/:namespace" element={<AuthCallbackPage />} />
        <Route path=":namespace/auth/callback" element={<RelayCallbackRedirect />} />
        {/* The module's own routes, which the relay form must outrank. */}
        <Route path="bank/*" element={<Where />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

const started = (profile: string | null = "p-1") =>
  rememberPending("s-1", { namespace: "bank", profile, expiresAt: Date.now() + 60_000 });

describe("AuthCallbackPage", () => {
  beforeEach(() => {
    localStorage.clear();
    host.client = {};
    host.profile = "p-1";
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("finishes a login this device started, tells whoever waits, and opens what was linked", async () => {
    started();
    const heard = vi.fn();
    const stop = onAuthUpdate("s-1", heard);
    complete.mockResolvedValue({ status: "DONE", result: { identifier: "@bank/connection", id: "4" } });
    open("/auth/callback/bank?code=c-1&state=s-1");

    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/bank/connections/4"));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(host.client, { state: "s-1", code: "c-1" });
    expect(heard).toHaveBeenCalledWith(expect.objectContaining({ status: "DONE" }));
    expect(findPending("s-1")).toBeNull();
    stop();
  });

  it("never finishes a login this device did not start", () => {
    complete.mockResolvedValue({ status: "DONE" });
    open("/auth/callback/bank?code=c-1&state=s-1");
    expect(screen.getByText("This login was not started here")).toBeTruthy();
    expect(screen.queryByText("Finish login")).toBeNull();
    expect(complete).not.toHaveBeenCalled();
  });

  it("takes the relay's form of the link, whichever module it names", async () => {
    started();
    complete.mockResolvedValue({ status: "DONE", result: { identifier: "@bank/connection", id: "4" } });
    open("/bank/auth/callback?code=c-1&state=s-1");
    await waitFor(() => expect(complete).toHaveBeenCalledWith(host.client, { state: "s-1", code: "c-1" }));
  });

  it("does not finish a login started in another profile", () => {
    started("p-2");
    open("/auth/callback/bank?code=c-1&state=s-1");
    expect(screen.getByText("This login was started in another profile")).toBeTruthy();
    expect(screen.getByText(/Other Lab/)).toBeTruthy();
    expect(complete).not.toHaveBeenCalled();
  });

  it("records the provider's refusal on the server and tells the waiting dialog", async () => {
    started();
    const heard = vi.fn();
    const stop = onAuthUpdate("s-1", heard);
    complete.mockResolvedValue({ status: "FAILED", errorCode: "LOGIN_REFUSED", errorMessage: "User said no" });
    open("/auth/callback/bank?state=s-1&error=access_denied&error_description=User+said+no");
    expect(screen.getByText("User said no")).toBeTruthy();
    expect(complete).toHaveBeenCalledWith(host.client, {
      state: "s-1",
      error: "access_denied",
      errorDescription: "User said no",
    });
    await waitFor(() => expect(heard).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "LOGIN_REFUSED" })));
    expect(findPending("s-1")).toBeNull();
    stop();
  });

  it("does not send a refusal for a login this device did not start", () => {
    const heard = vi.fn();
    const stop = onAuthUpdate("s-1", heard);
    open("/auth/callback/bank?state=s-1&error=access_denied");
    expect(screen.getByText("The provider stopped the login")).toBeTruthy();
    expect(heard).toHaveBeenCalledWith(expect.objectContaining({ status: "FAILED" }));
    expect(complete).not.toHaveBeenCalled();
    stop();
  });

  it("waits for the service, and says so", () => {
    started();
    host.client = undefined;
    open("/auth/callback/bank?code=c-1&state=s-1");
    expect(screen.getByText("Waiting for bank")).toBeTruthy();
    expect(complete).not.toHaveBeenCalled();
  });

  it("shows the server's error when the login cannot be finished", async () => {
    started();
    complete.mockRejectedValue(new Error("This login can no longer be finished."));
    open("/auth/callback/bank?code=c-1&state=s-1");
    await waitFor(() => expect(screen.getByText("This login can no longer be finished.")).toBeTruthy());
  });

  it("refuses a link without a code, and a namespace nobody handles", () => {
    open("/auth/callback/bank?state=s-1");
    expect(screen.getByText("This link has no login code in it")).toBeTruthy();
    cleanup();
    open("/auth/callback/nobody?code=c&state=s");
    expect(screen.getByText("Nothing here handles this login")).toBeTruthy();
  });
});
