import { describe, expect, it } from "vitest";
import {
  DEFAULT_SECTION,
  SETTINGS_GROUPS,
  SETTINGS_SECTIONS,
  sectionBySlug,
  settingsLink,
} from "./sections";

describe("settings sections", () => {
  it("has one route per section, none twice", () => {
    const slugs = SETTINGS_SECTIONS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((slug) => /^[a-z]+$/.test(slug))).toBe(true);
  });

  it("lands somewhere that exists", () => {
    expect(sectionBySlug(DEFAULT_SECTION)).toBeDefined();
    expect(settingsLink(DEFAULT_SECTION)).toBe("/settings/general");
  });

  it("leaves no group empty and no section groupless", () => {
    const groups = new Set(SETTINGS_GROUPS.map((g) => g.key));
    for (const section of SETTINGS_SECTIONS) expect(groups.has(section.group)).toBe(true);
    for (const group of SETTINGS_GROUPS) {
      expect(SETTINGS_SECTIONS.some((s) => s.group === group.key), group.key).toBe(true);
    }
  });
});
