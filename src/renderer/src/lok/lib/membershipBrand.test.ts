import { describe, expect, it } from "vitest";
import type { ContextFragment } from "../api/graphql";
import { EMPTY_BRAND, resolveContextBrand } from "./membershipBrand";

type Brand = { brandHue?: number | null; brandChroma?: number | null };

const context = (
  organization: Brand & { id?: string },
  memberships: Array<Brand & { organizationId: string }> = [],
): ContextFragment =>
  ({
    roles: [],
    scope: [],
    organization: { id: "org-1", name: "Org", slug: "org", ...organization },
    user: {
      id: "user-1",
      username: "me",
      memberships: memberships.map((membership, index) => ({
        id: `membership-${index}`,
        brandHue: membership.brandHue,
        brandChroma: membership.brandChroma,
        organization: { id: membership.organizationId },
      })),
    },
  }) as ContextFragment;

describe("resolveContextBrand", () => {
  it("is empty without a context", () => {
    expect(resolveContextBrand(undefined)).toEqual(EMPTY_BRAND);
    expect(resolveContextBrand(null)).toEqual(EMPTY_BRAND);
  });

  it("falls back to the organization when there is no membership", () => {
    expect(resolveContextBrand(context({ brandHue: 200, brandChroma: 0.1 }))).toEqual({
      hue: 200,
      chroma: 0.1,
    });
  });

  it("lets the membership override the organization", () => {
    const resolved = resolveContextBrand(
      context({ brandHue: 200, brandChroma: 0.1 }, [
        { organizationId: "org-1", brandHue: 40, brandChroma: 0.3 },
      ]),
    );
    expect(resolved).toEqual({ hue: 40, chroma: 0.3 });
  });

  it("merges field by field — a hue-only override keeps the org chroma", () => {
    const resolved = resolveContextBrand(
      context({ brandHue: 200, brandChroma: 0.1 }, [
        { organizationId: "org-1", brandHue: 40, brandChroma: null },
      ]),
    );
    expect(resolved).toEqual({ hue: 40, chroma: 0.1 });
  });

  it("ignores memberships in other organizations", () => {
    const resolved = resolveContextBrand(
      context({ brandHue: 200, brandChroma: 0.1 }, [
        { organizationId: "org-2", brandHue: 40, brandChroma: 0.3 },
      ]),
    );
    expect(resolved).toEqual({ hue: 200, chroma: 0.1 });
  });

  it("is empty when neither side sets anything", () => {
    expect(
      resolveContextBrand(context({ brandHue: null, brandChroma: null })),
    ).toEqual(EMPTY_BRAND);
  });

  it("drops out-of-range values instead of clamping them", () => {
    const resolved = resolveContextBrand(
      context({ brandHue: 200, brandChroma: 0.1 }, [
        { organizationId: "org-1", brandHue: 400, brandChroma: 5 },
      ]),
    );
    expect(resolved).toEqual({ hue: 200, chroma: 0.1 });
  });

  it("keeps a zero chroma, which is a real achromatic brand", () => {
    const resolved = resolveContextBrand(
      context({ brandHue: 200, brandChroma: 0.1 }, [
        { organizationId: "org-1", brandChroma: 0 },
      ]),
    );
    expect(resolved).toEqual({ hue: 200, chroma: 0 });
  });
});
