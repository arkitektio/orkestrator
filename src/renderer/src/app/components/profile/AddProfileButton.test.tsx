// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * While a grant waits on the browser, the button spins — and offers the two
 * things a waiting user needs: the approval page again, and a way out.
 */

const URL = "https://go.arkitekt.live/configure/abc";
const connect = vi.fn();

vi.mock("@/core/connection/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/host")>()),
  Arkitekt: {
    useConnect: () => connect,
    useAutoLoginError: () => undefined,
  },
}));
vi.mock("@/core/connection/arkitekt/fakts/discover", () => ({
  discover: vi.fn(async () => ({ base_url: "https://go.arkitekt.live/lok/f/" })),
}));
vi.mock("@/core/connection/arkitekt/fakts/popout", () => ({
  popOutWindowOpen: vi.fn(async () => ({ close: async () => {} })),
}));
vi.mock("@/core/connection/ui/doctor/ConnectionDoctor", () => ({
  ConnectionDoctorSheet: () => <div>doctor</div>,
}));

const { AddProfileButton } = await import("./AddProfileButton");
const { popOutWindowOpen } = await import("@/core/connection/arkitekt/fakts/popout");
const { sessionStep, resetConnectionProgress } = await import("@/core/connection/progress/store");

/**
 * A grant that has opened the browser and waits until its controller is
 * aborted — narrating its step the way the provider's `connect` does.
 */
const pendingGrant = () =>
  connect.mockImplementation(
    ({ controller, onVerificationUri }: { controller: AbortController; onVerificationUri: (uri: string) => void }) =>
      new Promise<void>((_resolve, reject) => {
        onVerificationUri(URL);
        sessionStep("approve");
        controller.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
  );

beforeEach(() => {
  resetConnectionProgress();
  connect.mockReset();
  vi.mocked(popOutWindowOpen).mockClear();
});

describe("AddProfileButton while waiting for the browser", () => {
  it("spins, and offers to open the approval page again", async () => {
    pendingGrant();
    render(<AddProfileButton presentation="hero" />);

    await userEvent.click(screen.getByRole("button", { name: /sign in with/i }));

    expect((await screen.findAllByText(/approve the sign-in in your browser/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/finding go\.arkitekt\.live/i)).toBeInTheDocument();
    const reopen = screen.getByRole("button", { name: /open again/i });
    await waitFor(() => expect(reopen).toBeEnabled());
    await userEvent.click(reopen);
    expect(popOutWindowOpen).toHaveBeenCalledWith(URL);
  });

  it("cancels the grant, quietly — a cancel is not an error", async () => {
    pendingGrant();
    render(<AddProfileButton presentation="hero" />);
    await userEvent.click(screen.getByRole("button", { name: /sign in with/i }));
    await screen.findByRole("button", { name: /cancel/i });

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(await screen.findByRole("button", { name: /sign in with/i })).toBeEnabled();
    expect(connect.mock.calls[0][0].controller.signal.aborted).toBe(true);
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/aborted/i)).not.toBeInTheDocument();
  });

  it("shows neither button when nothing is in progress", () => {
    render(<AddProfileButton presentation="hero" />);
    expect(screen.queryByRole("button", { name: /open again/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });
});
