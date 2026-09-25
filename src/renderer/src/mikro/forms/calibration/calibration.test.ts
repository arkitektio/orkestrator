import { describe, expect, it } from "vitest";
import {
  IntrinsicAxis,
  buildCalibrationInput,
  hasBlockingIssue,
  prefillCalibration,
  validateCalibration,
} from "./calibration";

const axis = (
  name: string,
  order: number,
  type: string,
): IntrinsicAxis => ({ name, order, type });

// A (c, y, x) pixel grid — the case that forces the CHANNEL-unit question.
const CYX = [
  axis("c", 0, "CHANNEL"),
  axis("y", 1, "SPACE"),
  axis("x", 2, "SPACE"),
];

const draftOf = (rows: ReturnType<typeof prefillCalibration>, over = {}) => ({
  dataset: "ds-1",
  name: "physical",
  rows,
  ...over,
});

describe("prefillCalibration", () => {
  it("orders rows by the axis `order`, which becomes axes AND scale order", () => {
    const shuffled = [CYX[2], CYX[0], CYX[1]];
    expect(prefillCalibration(shuffled).map((r) => r.axis.name)).toEqual([
      "c",
      "y",
      "x",
    ]);
  });

  it("gives every axis a unit, including a channel axis", () => {
    // CalibratedAxisInput.unit is non-null on EVERY axis, so a (c,y,x) dataset
    // cannot be calibrated at all unless `c` gets one.
    const rows = prefillCalibration(CYX);
    expect(rows.every((row) => row.unit.length > 0)).toBe(true);
    expect(rows.find((r) => r.axis.name === "c")?.unit).toBe("dimensionless");
  });

  it("suggests a plausible unit per axis type", () => {
    const rows = prefillCalibration([axis("t", 0, "TIME"), axis("y", 1, "SPACE")]);
    expect(rows[0].unit).toBe("s");
    expect(rows[1].unit).toBe("µm");
  });

  it("does not mutate the caller's frozen axes array", () => {
    expect(() => prefillCalibration(Object.freeze([...CYX].reverse()))).not.toThrow();
  });
});

describe("buildCalibrationInput", () => {
  it("emits axes and scale in the same order, entry-for-entry", () => {
    const rows = prefillCalibration(CYX);
    rows[1].scale = 0.5;
    rows[2].scale = 0.25;

    const input = buildCalibrationInput(draftOf(rows));

    expect(input.axes.map((a) => a.name)).toEqual(["c", "y", "x"]);
    // scale[i] is the pixel size of axes[i] — the pairing is positional.
    expect(input.registrations[0].transform.scale).toEqual([1, 0.5, 0.25]);
  });

  it("states one scale registration from the dataset being calibrated", () => {
    // A calibration is a system plus its one edge, and `createCoordinateSystem`
    // is now where both are said. Anything else here — no registration, an
    // identity, a second edge — is a different object entirely. BY_DIMENSION is
    // the one authorable kind that lets the edge name its axes.
    const input = buildCalibrationInput(draftOf(prefillCalibration(CYX)));

    expect(input.registrations).toHaveLength(1);
    expect(input.registrations[0].dataset).toBe("ds-1");
    expect(input.registrations[0].transform.kind).toBe("BY_DIMENSION");
  });

  it("names the scale order on both ends of the edge", () => {
    // The edge is self-describing: inputAxes orders `scale`, and a calibration
    // renames nothing, so outputAxes is the same list.
    const input = buildCalibrationInput(draftOf(prefillCalibration(CYX)));

    expect(input.registrations[0].transform.inputAxes).toEqual(["c", "y", "x"]);
    expect(input.registrations[0].transform.outputAxes).toEqual(["c", "y", "x"]);
    expect(input.registrations[0].transform.inputAxes).toEqual(
      input.axes.map((a) => a.name),
    );
  });

  it("keeps the ordering under a shuffled input array", () => {
    const rows = prefillCalibration([CYX[2], CYX[0], CYX[1]]);
    rows.find((r) => r.axis.name === "y")!.scale = 0.5;
    rows.find((r) => r.axis.name === "x")!.scale = 0.25;

    const input = buildCalibrationInput(draftOf(rows));

    expect(input.axes.map((a) => a.name)).toEqual(["c", "y", "x"]);
    expect(input.registrations[0].transform.scale).toEqual([1, 0.5, 0.25]);
    expect(input.registrations[0].transform.inputAxes).toEqual(["c", "y", "x"]);
  });

  it("coerces the strings the inputs hand back", () => {
    const rows = prefillCalibration([axis("y", 0, "SPACE")]);
    rows[0].scale = "0.325";

    expect(
      buildCalibrationInput(draftOf(rows)).registrations[0].transform.scale,
    ).toEqual([0.325]);
  });

  it("defaults an empty name to `physical`", () => {
    const input = buildCalibrationInput(
      draftOf(prefillCalibration(CYX), { name: "  " }),
    );
    expect(input.name).toBe("physical");
  });

  it("trims units so a stray space cannot fail pint parsing", () => {
    const rows = prefillCalibration([axis("y", 0, "SPACE")]);
    rows[0].unit = " µm ";
    expect(buildCalibrationInput(draftOf(rows)).axes[0].unit).toBe("µm");
  });
});

describe("validateCalibration", () => {
  it("passes a well-formed calibration", () => {
    const rows = prefillCalibration(CYX);
    rows[1].scale = 0.325;
    rows[2].scale = 0.325;

    expect(hasBlockingIssue(validateCalibration(draftOf(rows)))).toBe(false);
  });

  it("blocks an axis with no unit, naming the axis", () => {
    const rows = prefillCalibration(CYX);
    rows[0].unit = "";

    const issues = validateCalibration(draftOf(rows));

    expect(hasBlockingIssue(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes('"c"'))).toBe(true);
  });

  it("blocks a zero pixel size", () => {
    const rows = prefillCalibration(CYX);
    rows[1].scale = 0;

    expect(hasBlockingIssue(validateCalibration(draftOf(rows)))).toBe(true);
  });

  it("blocks a non-numeric pixel size rather than sending null", () => {
    const rows = prefillCalibration(CYX);
    rows[1].scale = "";

    expect(hasBlockingIssue(validateCalibration(draftOf(rows)))).toBe(true);
  });

  it("warns on a negative pixel size without blocking it", () => {
    const rows = prefillCalibration(CYX);
    rows[1].scale = -0.5;

    const issues = validateCalibration(draftOf(rows));

    expect(hasBlockingIssue(issues)).toBe(false);
    expect(issues.some((i) => i.level === "warning")).toBe(true);
  });
});
