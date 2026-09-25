// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { insertText, isEditableElement } from "./insertText";

/**
 * jsdom has no `execCommand`, so these exercise the fallback path — the one
 * that matters most, since it is the one that must keep controlled React
 * inputs in sync by hand.
 */
afterEach(() => {
  document.body.innerHTML = "";
});

describe("isEditableElement", () => {
  it("accepts text inputs, textareas and contenteditables", () => {
    const input = document.createElement("input");
    const search = document.createElement("input");
    search.type = "search";
    const textarea = document.createElement("textarea");
    const editable = document.createElement("div");
    editable.contentEditable = "true";
    document.body.append(input, search, textarea, editable);
    // jsdom does not compute `isContentEditable`; the attribute is what we can check.
    Object.defineProperty(editable, "isContentEditable", { value: true });

    expect(isEditableElement(input)).toBe(true);
    expect(isEditableElement(search)).toBe(true);
    expect(isEditableElement(textarea)).toBe(true);
    expect(isEditableElement(editable)).toBe(true);
  });

  it("rejects buttons, checkboxes, disabled and read-only fields, and nothing", () => {
    const button = document.createElement("button");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    const disabled = document.createElement("input");
    disabled.disabled = true;
    const readonly = document.createElement("textarea");
    readonly.readOnly = true;

    expect(isEditableElement(button)).toBe(false);
    expect(isEditableElement(checkbox)).toBe(false);
    expect(isEditableElement(disabled)).toBe(false);
    expect(isEditableElement(readonly)).toBe(false);
    expect(isEditableElement(null)).toBe(false);
  });
});

describe("insertText", () => {
  it("appends at the caret and fires input so a controlled component hears it", () => {
    const input = document.createElement("input");
    input.value = "open";
    document.body.append(input);
    input.focus();
    input.setSelectionRange(4, 4);
    const onInput = vi.fn();
    input.addEventListener("input", onInput);

    expect(insertText(input, "settings")).toBe(true);
    expect(input.value).toBe("open settings");
    expect(onInput).toHaveBeenCalledTimes(1);
    expect(input.selectionStart).toBe("open settings".length);
  });

  it("adds no separating space at the start of a field or after whitespace", () => {
    const input = document.createElement("input");
    document.body.append(input);
    insertText(input, "hello");
    expect(input.value).toBe("hello");

    input.value = "hello ";
    input.setSelectionRange(6, 6);
    insertText(input, "world");
    expect(input.value).toBe("hello world");
  });

  it("replaces a selection", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "one two three";
    document.body.append(textarea);
    textarea.focus();
    textarea.setSelectionRange(4, 7);
    insertText(textarea, "2");
    expect(textarea.value).toBe("one 2 three");
  });

  it("focuses the target first", () => {
    const input = document.createElement("input");
    const other = document.createElement("input");
    document.body.append(input, other);
    other.focus();
    insertText(input, "x");
    expect(document.activeElement).toBe(input);
  });

  it("refuses non-editable targets and empty text", () => {
    const button = document.createElement("button");
    const input = document.createElement("input");
    document.body.append(button, input);
    expect(insertText(button, "x")).toBe(false);
    expect(insertText(input, "")).toBe(false);
  });

  it("goes through the native setter so React's value tracker sees a change", () => {
    const input = document.createElement("input");
    document.body.append(input);
    const setter = vi.spyOn(HTMLInputElement.prototype, "value", "set");
    insertText(input, "hi");
    expect(setter).toHaveBeenCalledWith("hi");
    setter.mockRestore();
  });
});
