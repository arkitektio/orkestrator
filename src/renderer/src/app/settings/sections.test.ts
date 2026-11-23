import { CONNECTION_STATUS_PATH } from "@/core/connection/statusPath";
import { describe, expect, it } from "vitest";
import { SETTINGS_HELP } from "./help";
import {
  DEFAULT_SECTION,
  MOVED_SECTIONS,
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

  it("routes the connection page where the footer's indicators link", () => {
    expect(sectionBySlug("connection")).toBeDefined();
    expect(settingsLink("connection")).toBe(CONNECTION_STATUS_PATH);
  });

  it("lands somewhere that exists", () => {
    expect(sectionBySlug(DEFAULT_SECTION)).toBeDefined();
    expect(settingsLink(DEFAULT_SECTION)).toBe("/settings/appearance");
  });

  it("sends a moved section's old link to where it is now", () => {
    for (const [from, to] of Object.entries(MOVED_SECTIONS)) {
      expect(sectionBySlug(from), from).toBeUndefined();
      expect(sectionBySlug(to), to).toBeDefined();
    }
  });

  it("has a help text for every section", () => {
    for (const section of SETTINGS_SECTIONS) expect(SETTINGS_HELP[section.slug], section.slug).toBeDefined();
  });

  it("leaves no group empty and no section groupless", () => {
    const groups = new Set(SETTINGS_GROUPS.map((g) => g.key));
    for (const section of SETTINGS_SECTIONS) expect(groups.has(section.group)).toBe(true);
    for (const group of SETTINGS_GROUPS) {
      expect(SETTINGS_SECTIONS.some((s) => s.group === group.key), group.key).toBe(true);
    }
  });
});
