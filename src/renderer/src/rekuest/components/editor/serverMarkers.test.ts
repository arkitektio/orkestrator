import { describe, expect, it } from "vitest";
import { diagnosticMarkers, rangeForServerPath, refusalMarkers } from "./serverMarkers";

const source = '<Card>\n  <Button text="Go" onClick="@stage.move()" />\n</Card>';
const slice = (range: { start: number; end: number }) => source.slice(range.start, range.end);

describe("server markers", () => {
  it("places a diagnostic by node id and prop", () => {
    expect(slice(rangeForServerPath(source, "Card/Button[0]"))).toBe("Button");
    expect(slice(rangeForServerPath(source, "Card/Button[0].props.onClick"))).toBe("@stage.move()");
  });

  it("falls back to the root tag", () => {
    expect(slice(rangeForServerPath(source, null))).toBe("Card");
    expect(slice(rangeForServerPath(source, "somewhere/else"))).toBe("Card");
  });

  it("turns diagnostics into warnings", () => {
    expect(diagnosticMarkers([{ code: "unknown-op", message: "No such util", path: null }], source)).toEqual([
      { message: "No such util (unknown-op)", range: { start: 1, end: 5 }, severity: "warning" },
    ]);
  });

  it("puts a refusal at the line it names", () => {
    const [marker] = refusalMarkers(new Error("Failed to parse BSX/XML at line 2, column 3: mismatched tag"), source);
    expect(marker.severity).toBe("error");
    expect(source.slice(marker.range.start).startsWith("<Button")).toBe(true);
  });
});
