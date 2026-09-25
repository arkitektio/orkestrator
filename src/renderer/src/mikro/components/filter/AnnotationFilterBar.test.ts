// @vitest-environment jsdom
// The graphql module this pulls in reaches `window` at import time.
import { describe, expect, it } from "vitest";

import { AnnotationKindChoices } from "../../api/graphql";
import { annotationFilters } from "./AnnotationFilterBar";

describe("the annotation filter assembly", () => {
  it("asks for nothing when nothing is set", () => {
    // Not `{search: "", kind: null}`: an empty search is a substring every name
    // contains, and a null kind is a constraint the server would honour.
    expect(annotationFilters("", "any")).toEqual({});
  });

  it("never sends the 'any' sentinel as a kind", () => {
    expect(annotationFilters("", "any")).not.toHaveProperty("kind");
  });

  it("passes a chosen kind through as the server enum", () => {
    expect(annotationFilters("", AnnotationKindChoices.Rectangle)).toEqual({
      kind: AnnotationKindChoices.Rectangle,
    });
  });

  it("carries search alongside a kind", () => {
    expect(annotationFilters("nucleus", AnnotationKindChoices.Polygon)).toEqual({
      search: "nucleus",
      kind: AnnotationKindChoices.Polygon,
    });
  });
});
