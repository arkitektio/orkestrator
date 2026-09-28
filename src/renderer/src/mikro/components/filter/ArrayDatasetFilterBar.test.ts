// @vitest-environment jsdom
// The graphql module this pulls in reaches `window` at import time.
import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORIGIN,
  arrayDatasetPropertyFilters,
} from "./ArrayDatasetFilterBar";

const atDefaults = () => arrayDatasetPropertyFilters(DEFAULT_ORIGIN, "any", "any");

describe("arrayDatasetPropertyFilters", () => {
  // The page's stated default: derived datasets (deconvolutions, segmentations,
  // projections) are hidden until asked for. A flipped sign here would silently
  // show ONLY derived datasets, which still looks like a working list.
  it("hides derived datasets by default", () => {
    expect(atDefaults()).toEqual({ notDerived: true });
  });

  it("asks for derived only, and for neither, on request", () => {
    expect(arrayDatasetPropertyFilters("derived", "any", "any")).toEqual({
      notDerived: false,
    });
    expect(arrayDatasetPropertyFilters("all", "any", "any")).toEqual({});
  });

  // "Don't care" must be an ABSENT field: the server reads a present `false` as
  // "only the ones without", which is a different question.
  it("omits the fields nothing was asked of", () => {
    const filters = atDefaults();
    expect("multiscale" in filters).toBe(false);
    expect("hasPhysicalSpace" in filters).toBe(false);
  });

  it("maps resolution and units, including their false sides", () => {
    expect(arrayDatasetPropertyFilters("all", "multiscale", "physical")).toEqual({
      multiscale: true,
      hasPhysicalSpace: true,
    });
    expect(arrayDatasetPropertyFilters("all", "single", "pixels")).toEqual({
      multiscale: false,
      hasPhysicalSpace: false,
    });
  });

  // A hand-edited URL (?origin=nonsense) must not become a filter.
  it("ignores keys it does not know", () => {
    expect(arrayDatasetPropertyFilters("bogus", "bogus", "bogus")).toEqual({});
  });
});
