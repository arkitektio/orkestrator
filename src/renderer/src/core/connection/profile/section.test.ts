import { describe, expect, it } from "vitest";
import {
  createProfileSectionRegistry,
  resolveProfileSections,
  type ProfileSection,
} from "./section";

const Passthrough = ({ children }: { children: React.ReactNode }) => children;
const Empty = () => null;

const section = (id: ProfileSection["id"], priority: number, extra?: Partial<ProfileSection>) =>
  ({
    id,
    module: id.split(".")[0],
    title: id,
    priority,
    Guard: Passthrough,
    Component: Empty,
    ...extra,
  }) as ProfileSection;

describe("createProfileSectionRegistry", () => {
  it("rejects a duplicate id", () => {
    expect(() =>
      createProfileSectionRegistry([section("mikro.a", 1), section("mikro.a", 2)]),
    ).toThrow(/Duplicate profile section id: mikro.a/);
  });

  it("orders by priority, then id", () => {
    const registry = createProfileSectionRegistry([
      section("rekuest.b", 20),
      section("mikro.z", 10),
      section("elektro.a", 20),
    ]);
    expect(registry.sections.map((s) => s.id)).toEqual(["mikro.z", "elektro.a", "rekuest.b"]);
  });
});

describe("resolveProfileSections", () => {
  it("drops the sections whose applies says no", () => {
    const registry = createProfileSectionRegistry([
      section("mikro.always", 1),
      section("mikro.self", 2, { applies: (ctx) => ctx.isMe }),
    ]);
    expect(resolveProfileSections(registry, { sub: "1", isMe: false }).map((s) => s.id)).toEqual([
      "mikro.always",
    ]);
    expect(resolveProfileSections(registry, { sub: "1", isMe: true })).toHaveLength(2);
  });
});
