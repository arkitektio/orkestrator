// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  DemandKind as KabinetDemandKind,
  PortKind as KabinetPortKind,
} from "@/kabinet/api/graphql";
import { DemandKind, PortKind } from "@/rekuest/api/graphql";

describe("kabinet enums", () => {
  it("share the rekuest values, which is what lets the demands be reused", () => {
    expect(KabinetDemandKind.Args).toBe(DemandKind.Args);
    expect(KabinetDemandKind.Returns).toBe(DemandKind.Returns);
    expect(KabinetPortKind.Structure).toBe(PortKind.Structure);
    expect(KabinetPortKind.List).toBe(PortKind.List);
  });
});
