import { describe, expect, it } from "vitest";
import { diagnosticMarkers, rangeForServerPath, refusalMarkers } from "./serverMarkers";

const source = '<Html><Card>\n  <Button label="Gö" onClick={deps.stage.move()} />\n</Card></Html>';
const slice = (range: { start: number; end: number }) => source.slice(range.start, range.end);

describe("server markers", () => {
  it("places a diagnostic by node id and prop", () => {
    expect(slice(rangeForServerPath(source, "Html[0]/Card[0]/Button[0]"))).toBe("Button");
    expect(slice(rangeForServerPath(source, "Html[0]/Card[0]/Button[0].props.onClick"))).toBe("deps.stage.move()");
  });

  it("falls back to the root tag", () => {
    expect(slice(rangeForServerPath(source, null))).toBe("Html");
    expect(slice(rangeForServerPath(source, "somewhere/else"))).toBe("Html");
  });

  it("turns diagnostics into warnings", () => {
    expect(diagnosticMarkers([{ code: "unknown-op", message: "No such util", path: null }], source)).toEqual([
      { message: "No such util (unknown-op)", range: { start: 1, end: 5 }, severity: "warning", code: "unknown-op" },
    ]);
  });

  it("puts a refusal at the line it names", () => {
    const [marker] = refusalMarkers(new Error("Failed to parse BSX/XML at line 2, column 3: mismatched tag"), source);
    expect(marker.severity).toBe("error");
    expect(source.slice(marker.range.start).startsWith("<Button")).toBe(true);
  });

  it("counts the server's columns in code points", () => {
    const wide = '<Html><Card>\n  <Text text="😀" x />\n</Card></Html>';
    const [marker] = refusalMarkers(new Error("bsx.syntax at line 2, column 18"), wide);
    expect(wide.slice(marker.range.start).startsWith("x />")).toBe(true);
  });
});
