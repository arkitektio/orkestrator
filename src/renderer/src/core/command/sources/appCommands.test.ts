import { describe, expect, it } from "vitest";

import { matchesFilter } from "../filter";
import { APP_COMMANDS } from "./appCommands";

describe("APP_COMMANDS", () => {
  it("has unique ids", () => {
    const ids = APP_COMMANDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("finds every command by its own title", () => {
    APP_COMMANDS.forEach((command) => {
      expect(
        matchesFilter([command.title, command.description, ...(command.keywords ?? [])], command.title),
        `"${command.title}" cannot be found by typing its own name`,
      ).toBe(true);
    });
  });

  it("keeps Linux's lost menu items reachable", () => {
    // Linux runs frameless, which removes the application menu entirely — the
    // palette is the only remaining route to these. Deleting them breaks Linux,
    // so pin them.
    const ids = APP_COMMANDS.map((c) => c.id);
    expect(ids).toContain("reload-window");
    expect(ids).toContain("force-reload-window");
    expect(ids).toContain("open-devtools");
  });

  it("marks everything that needs the Electron bridge", () => {
    // A browser build has no `window.api`; an unmarked command would throw.
    const needsBridge = ["reload-window", "force-reload-window", "open-devtools", "zoom-in", "zoom-out"];
    needsBridge.forEach((id) => {
      expect(APP_COMMANDS.find((c) => c.id === id)?.electronOnly, id).toBe(true);
    });
  });
});
