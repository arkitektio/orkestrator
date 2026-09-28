// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { AxisType, ColumnRole } from "@/mikro/api/graphql";

import {
  AXIS_TYPE_NOTES,
  COLUMN_ROLE_NOTES,
  axisTypeLabel,
  columnRoleLabel,
} from "./columnNotes";

describe("column notes", () => {
  it("has a non-empty note for every column role", () => {
    for (const role of Object.values(ColumnRole)) {
      expect(COLUMN_ROLE_NOTES[role]?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });

  it("has a non-empty note for every axis type", () => {
    for (const axisType of Object.values(AxisType)) {
      expect(AXIS_TYPE_NOTES[axisType]?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });

  it("reads enum members as words", () => {
    expect(columnRoleLabel(ColumnRole.TrackId)).toBe("track id");
    expect(columnRoleLabel(ColumnRole.Coordinate)).toBe("coordinate");
    expect(axisTypeLabel(AxisType.Microtime)).toBe("microtime");
    for (const role of Object.values(ColumnRole)) {
      expect(columnRoleLabel(role)).not.toContain("_");
    }
  });
});
