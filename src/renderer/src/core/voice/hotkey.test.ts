// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { attachVoiceHotkey, decideVoiceMode, describeHotkey, matchesVoiceHotkey } from "./hotkey";

afterEach(() => {
  document.body.innerHTML = "";
});

const key = (type: "keydown" | "keyup", init: KeyboardEventInit & { target?: Element }) => {
  const { target, ...rest } = init;
  const event = new KeyboardEvent(type, { bubbles: true, cancelable: true, ...rest });
  (target ?? window).dispatchEvent(event);
  return event;
};

describe("matchesVoiceHotkey", () => {
  it("needs ⌘ or Ctrl plus the configured code, and no Alt", () => {
    expect(matchesVoiceHotkey({ metaKey: true, ctrlKey: false, altKey: false, code: "KeyL" }, "KeyL")).toBe(true);
    expect(matchesVoiceHotkey({ metaKey: false, ctrlKey: true, altKey: false, code: "KeyL" }, "KeyL")).toBe(true);
    expect(matchesVoiceHotkey({ metaKey: false, ctrlKey: false, altKey: false, code: "KeyL" }, "KeyL")).toBe(false);
    expect(matchesVoiceHotkey({ metaKey: true, ctrlKey: false, altKey: true, code: "KeyL" }, "KeyL")).toBe(false);
    expect(matchesVoiceHotkey({ metaKey: true, ctrlKey: false, altKey: false, code: "KeyK" }, "KeyL")).toBe(false);
  });
});

describe("decideVoiceMode", () => {
  it("fills an editable element and otherwise opens the palette", () => {
    const input = document.createElement("input");
    const button = document.createElement("button");
    document.body.append(input, button);
    expect(decideVoiceMode(input)).toBe("fill");
    expect(decideVoiceMode(button)).toBe("palette");
    expect(decideVoiceMode(null)).toBe("palette");
    expect(decideVoiceMode(document.body)).toBe("palette");
  });
});

describe("describeHotkey", () => {
  it("names the modifier for the platform and strips the code prefix", () => {
    expect(describeHotkey("KeyL", "MacIntel")).toBe("⌘ L");
    expect(describeHotkey("KeyL", "Win32")).toBe("Ctrl L");
    expect(describeHotkey("Digit1", "Linux x86_64")).toBe("Ctrl 1");
    expect(describeHotkey("Space", "MacIntel")).toBe("⌘ Space");
  });
});

describe("attachVoiceHotkey", () => {
  it("reports a press with the mode of the focused element and swallows the key", () => {
    const onPress = vi.fn();
    const onRelease = vi.fn();
    const dispose = attachVoiceHotkey({ code: () => "KeyL", onPress, onRelease });
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();

    const event = key("keydown", { code: "KeyL", ctrlKey: true, target: input });
    expect(onPress).toHaveBeenCalledWith("fill", input);
    expect(event.defaultPrevented).toBe(true);

    input.blur();
    key("keyup", { code: "KeyL" });
    key("keydown", { code: "KeyL", metaKey: true });
    expect(onPress).toHaveBeenLastCalledWith("palette", document.body);
    dispose();
  });

  it("reports the release on the key going up, on the modifier going up, or on blur — once", () => {
    const onPress = vi.fn();
    const onRelease = vi.fn();
    const dispose = attachVoiceHotkey({ code: () => "KeyL", onPress, onRelease });

    key("keydown", { code: "KeyL", ctrlKey: true });
    key("keyup", { code: "KeyL", ctrlKey: true });
    expect(onRelease).toHaveBeenCalledTimes(1);
    key("keyup", { code: "ControlLeft", key: "Control" });
    expect(onRelease).toHaveBeenCalledTimes(1);

    key("keydown", { code: "KeyL", ctrlKey: true });
    key("keyup", { code: "ControlLeft", key: "Control" });
    expect(onRelease).toHaveBeenCalledTimes(2);

    key("keydown", { code: "KeyL", metaKey: true });
    window.dispatchEvent(new Event("blur"));
    expect(onRelease).toHaveBeenCalledTimes(3);

    // A stray keyup with nothing held is not a release.
    key("keyup", { code: "KeyL" });
    expect(onRelease).toHaveBeenCalledTimes(3);
    dispose();
  });

  it("ignores auto-repeat, already-handled events and the opt-out region", () => {
    const onPress = vi.fn();
    const dispose = attachVoiceHotkey({ code: () => "KeyL", onPress, onRelease: vi.fn() });

    key("keydown", { code: "KeyL", ctrlKey: true, repeat: true });
    expect(onPress).not.toHaveBeenCalled();

    const handled = new KeyboardEvent("keydown", { code: "KeyL", ctrlKey: true, cancelable: true, bubbles: true });
    handled.preventDefault();
    window.dispatchEvent(handled);
    expect(onPress).not.toHaveBeenCalled();

    const editor = document.createElement("div");
    editor.setAttribute("data-command-hotkey", "off");
    const inside = document.createElement("input");
    editor.append(inside);
    document.body.append(editor);
    key("keydown", { code: "KeyL", ctrlKey: true, target: inside });
    expect(onPress).not.toHaveBeenCalled();

    dispose();
  });

  it("reads the code live and stops listening after dispose", () => {
    const onPress = vi.fn();
    let code = "KeyL";
    const dispose = attachVoiceHotkey({ code: () => code, onPress, onRelease: vi.fn() });

    code = "KeyM";
    key("keydown", { code: "KeyL", ctrlKey: true });
    expect(onPress).not.toHaveBeenCalled();
    key("keydown", { code: "KeyM", ctrlKey: true });
    expect(onPress).toHaveBeenCalledTimes(1);

    dispose();
    key("keydown", { code: "KeyM", ctrlKey: true });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
