import { describe, expect, it } from "vitest";
import { sceneEscapeAction } from "./escapeOrder";

describe("scene Escape order", () => {
  const none = { drawing: false, annotating: false, cropOn: false };

  it("leaves annotation first, then the crop", () => {
    expect(sceneEscapeAction({ drawing: true, annotating: true, cropOn: true })).toBe("drawer");
    expect(sceneEscapeAction({ ...none, annotating: true, cropOn: true })).toBe("leave-annotate");
    expect(sceneEscapeAction({ ...none, cropOn: true })).toBe("clear-crop");
  });

  it("leaves annotating with no crop on", () => {
    expect(sceneEscapeAction({ ...none, annotating: true })).toBe("leave-annotate");
  });

  it("leaves the key to the app when the scene has nothing to leave", () => {
    expect(sceneEscapeAction(none)).toBeNull();
  });
});
