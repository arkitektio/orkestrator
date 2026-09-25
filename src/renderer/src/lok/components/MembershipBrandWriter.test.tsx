// @vitest-environment jsdom
import { ApolloClient, InMemoryCache } from "@apollo/client";
import { MockLink, type MockedResponse } from "@apollo/client/testing";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The generated lok hooks take their client from `Arkitekt.useSelfService()`
 * rather than an ApolloProvider, so MockedProvider cannot supply it — mock the
 * Arkitekt module and hand it a real client over a MockLink instead.
 */
let client: ApolloClient<unknown>;

vi.mock("@/app/Arkitekt", () => ({
  Arkitekt: { useSelfService: () => ({ client }) },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import {
  MyContextDocument,
  UpdateMembershipColorsDocument,
} from "../api/graphql";
import { resetBrandTheme, setBrandBase } from "@/providers/settings/brandTheme";
import { MembershipBrandWriter } from "./MembershipBrandWriter";

const ORG = { __typename: "Organization", id: "org-1", name: "Org", slug: "org" };

const contextMock: MockedResponse = {
  request: { query: MyContextDocument },
  result: {
    data: {
      mycontext: {
        __typename: "Context",
        roles: [],
        scope: [],
        organization: { ...ORG, brandHue: 200, brandChroma: 0.1 },
        user: {
          __typename: "User",
          id: "user-1",
          username: "me",
          memberships: [
            {
              __typename: "Membership",
              id: "membership-1",
              brandHue: null,
              brandChroma: null,
              organization: { __typename: "Organization", id: "org-1" },
            },
          ],
        },
      },
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

const updateMock = (
  hue: number | null,
  chroma: number | null,
  outcome: "ok" | "error" = "ok",
): MockedResponse => ({
  request: {
    query: UpdateMembershipColorsDocument,
    variables: { input: { brandHue: hue, brandChroma: chroma } },
  },
  ...(outcome === "error"
    ? { error: new Error("nope") }
    : {
        result: {
          data: {
            updateMembershipColors: {
              __typename: "Membership",
              id: "membership-1",
              brandHue: hue,
              brandChroma: chroma,
              roles: [],
              organization: {
                ...ORG,
                brandHue: 200,
                brandChroma: 0.1,
                avatar: null,
              },
            },
          },
        },
      }),
});

const mount = (mocks: MockedResponse[]) => {
  const link = new MockLink(mocks);
  const sent: unknown[] = [];
  link.setOnError(() => {});
  client = new ApolloClient({ link, cache: new InMemoryCache() });
  const original = link.request.bind(link);
  vi.spyOn(link, "request").mockImplementation((operation, forward) => {
    if (operation.operationName === "UpdateMembershipColors") {
      sent.push(operation.variables);
    }
    return original(operation, forward);
  });
  return { sent };
};

const hue = () => document.documentElement.style.getPropertyValue("--brand-hue");

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  resetBrandTheme();
  setBrandBase({ hue: 267.256, chroma: 0.20962 });
});

afterEach(() => {
  vi.useRealTimers();
  resetBrandTheme();
  vi.restoreAllMocks();
});

describe("MembershipBrandWriter", () => {
  it("does not write anything before the user touches the controls", async () => {
    const { sent } = mount([contextMock]);
    render(<MembershipBrandWriter brand={null} />);

    await vi.advanceTimersByTimeAsync(2000);

    expect(sent).toEqual([]);
    // The local settings brand is still the one on screen.
    expect(hue()).toBe("267.256");
  });

  it("applies the edit immediately, before the mutation lands", async () => {
    mount([contextMock, updateMock(40, 0.3)]);
    render(<MembershipBrandWriter brand={{ hue: 40, chroma: 0.3 }} />);

    expect(hue()).toBe("40");
  });

  it("coalesces a burst of edits into a single write", async () => {
    const { sent } = mount([contextMock, updateMock(40, 0.3)]);
    const { rerender } = render(
      <MembershipBrandWriter brand={{ hue: 10, chroma: 0.3 }} />,
    );
    rerender(<MembershipBrandWriter brand={{ hue: 25, chroma: 0.3 }} />);
    rerender(<MembershipBrandWriter brand={{ hue: 40, chroma: 0.3 }} />);

    await vi.advanceTimersByTimeAsync(1000);

    expect(sent).toEqual([{ input: { brandHue: 40, brandChroma: 0.3 } }]);
  });

  it("still saves an edit that was pending when the page unmounted", async () => {
    const { sent } = mount([contextMock, updateMock(40, 0.3)]);
    const { unmount } = render(
      <MembershipBrandWriter brand={{ hue: 40, chroma: 0.3 }} />,
    );
    unmount();

    await vi.advanceTimersByTimeAsync(1000);

    expect(sent).toEqual([{ input: { brandHue: 40, brandChroma: 0.3 } }]);
  });

  it("rolls back to the confirmed brand when the write fails", async () => {
    mount([contextMock, updateMock(40, 0.3, "error")]);
    const { rerender } = render(<MembershipBrandWriter brand={null} />);

    // Let the context query settle so the confirmed brand is known.
    await vi.advanceTimersByTimeAsync(0);
    rerender(<MembershipBrandWriter brand={{ hue: 40, chroma: 0.3 }} />);
    expect(hue()).toBe("40");

    await vi.advanceTimersByTimeAsync(1000);

    // Back to the organization's brand, which is what is actually stored.
    expect(hue()).toBe("200");
  });
});
