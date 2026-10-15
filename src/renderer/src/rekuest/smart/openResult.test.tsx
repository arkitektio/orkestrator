// @vitest-environment jsdom
import { CommandActionRow } from "@/core/smart/extensions/CommandActionRow";
import { smartRegistry } from "@/core/smart/registry";
import { Command, CommandList } from "@/core/ui/command";
import { TooltipProvider } from "@/core/ui/tooltip";
import { PortKind, TaskEventFragment, TaskEventKind } from "@/rekuest/api/graphql";
import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  OpenResultButtons,
  deliverResults,
  openableReturns,
  returnedStructures,
  openResultLabel,
  returnedStructure,
  runsDirectly,
  useOpenResult,
} from "./openResult";

const navigate = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));

const image = { key: "out", kind: PortKind.Structure, identifier: "@test/image" };
const mask = { key: "mask", kind: PortKind.Structure, identifier: "@test/image", label: "Mask" };

beforeAll(() => {
  // cmdk scrolls its selection into view; jsdom has no layout to do it in.
  Element.prototype.scrollIntoView = vi.fn();
  smartRegistry.register({ identifier: "@test/image", name: "Image", path: "test/images", datum: true });
});

const event = (kind: TaskEventKind, returns?: unknown) =>
  ({ kind, returns, task: { id: "1" } }) as TaskEventFragment;

describe("openableReturns", () => {
  it("keeps structures with a registered page only", () => {
    expect(
      openableReturns([
        image,
        { key: "n", kind: PortKind.Int, identifier: null },
        { key: "x", kind: PortKind.Structure, identifier: "@test/unknown" },
        { key: "y", kind: PortKind.Structure, identifier: null },
      ]),
    ).toEqual([image]);
    expect(openableReturns(undefined)).toEqual([]);
  });
});

describe("runsDirectly", () => {
  const one = { identifier: "@test/image", id: "1" };
  it("is true only when the selection fills every arg", () => {
    expect(runsDirectly([{ key: "a" }], { objects: [one] })).toBe(true);
    expect(runsDirectly([{ key: "a" }, { key: "b" }], { objects: [one] })).toBe(false);
    expect(runsDirectly([{ key: "a" }, { key: "b" }], { objects: [one], partners: [one] })).toBe(true);
    expect(runsDirectly([{ key: "a" }], { objects: [] })).toBe(false);
  });
});

describe("returnedStructure", () => {
  it("reads the wire form and a bare id", () => {
    expect(returnedStructure(image, { out: { __identifier: "@test/image", object: "7" } })).toEqual({
      identifier: "@test/image",
      id: "7",
    });
    expect(returnedStructure(image, { out: 7 })).toEqual({ identifier: "@test/image", id: "7" });
  });

  it("is null when the port came back empty", () => {
    expect(returnedStructure(image, { out: null })).toBeNull();
    expect(returnedStructure(image, {})).toBeNull();
    expect(returnedStructure(image, null)).toBeNull();
  });
});

describe("openResultLabel", () => {
  it("names the port only when the type is returned twice", () => {
    expect(openResultLabel(image, [image])).toBe("Run, then open Image");
    expect(openResultLabel(mask, [image, mask])).toBe("Run, then open Image (Mask)");
    expect(openResultLabel(image, [image, mask])).toBe("Run, then open Image (out)");
  });
});

describe("useOpenResult", () => {
  it("opens the last yield once the task completes, after the row heard it", () => {
    navigate.mockClear();
    const heard: TaskEventKind[] = [];
    const { result } = renderHook(() => useOpenResult());
    const onEvent = result.current(image, (e) => heard.push(e.kind));

    onEvent(event(TaskEventKind.Yield, { out: { object: "7" } }));
    expect(navigate).not.toHaveBeenCalled();
    onEvent(event(TaskEventKind.Completed));

    expect(heard).toEqual([TaskEventKind.Yield, TaskEventKind.Completed]);
    expect(navigate).toHaveBeenCalledWith("/test/images/7");
  });

  it("opens nothing for a failed task or an empty return", () => {
    navigate.mockClear();
    const { result } = renderHook(() => useOpenResult());

    const failed = result.current(image, () => {});
    failed(event(TaskEventKind.Yield, { out: { object: "7" } }));
    failed(event(TaskEventKind.Failed));

    result.current(image, () => {})(event(TaskEventKind.Completed));

    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("OpenResultButtons", () => {
  it("draws one arrow per openable return, and a click does not run the row", () => {
    const onSelect = vi.fn();
    const onRun = vi.fn();
    render(
      <TooltipProvider>
        <Command>
          <CommandList>
            <CommandActionRow
              title="Segment"
              onSelect={onSelect}
              buttons={
                <OpenResultButtons
                  returns={[image, mask, { key: "n", kind: PortKind.Int, identifier: null }]}
                  onRun={onRun}
                />
              }
            />
          </CommandList>
        </Command>
      </TooltipProvider>,
    );

    expect(screen.getAllByRole("button", { name: /^Run, then open/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Run, then open Image (Mask)" }));

    expect(onRun).toHaveBeenCalledWith(mask);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("returned structures and the result sink", () => {
  const lenses = { key: "crops", kind: PortKind.List, identifier: null };
  const count = { key: "n", kind: PortKind.Int };

  it("reads every structure a yield holds: a structure port's, each item of a list port's", () => {
    expect(
      returnedStructures([image, lenses, count], {
        out: { __identifier: "@test/image", object: "1" },
        crops: [
          { __identifier: "@mikro/arraylens", object: "7" },
          { __identifier: "@mikro/arraylens", object: 8 },
        ],
        n: 3,
      }),
    ).toEqual([
      { identifier: "@test/image", id: "1" },
      { identifier: "@mikro/arraylens", id: "7" },
      { identifier: "@mikro/arraylens", id: "8" },
    ]);
    expect(returnedStructures([image], { out: "5" })).toEqual([{ identifier: "@test/image", id: "5" }]);
    expect(returnedStructures([image], { out: null })).toEqual([]);
    expect(returnedStructures([image], null)).toEqual([]);
  });

  it("hands the sink the last yield's structures once, on completion, and passes every event on", () => {
    const sink = vi.fn();
    const onEvent = vi.fn();
    const wrapped = deliverResults(sink, [image], onEvent);

    wrapped(event(TaskEventKind.Progress));
    wrapped(event(TaskEventKind.Yield, { out: { __identifier: "@test/image", object: "1" } }));
    expect(sink).not.toHaveBeenCalled();
    wrapped(event(TaskEventKind.Completed));

    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledWith([{ identifier: "@test/image", id: "1" }]);
    expect(onEvent).toHaveBeenCalledTimes(3);
  });

  it("without a sink is the callback as it was, and a run that returns nothing tells the sink nothing", () => {
    const onEvent = vi.fn();
    expect(deliverResults(null, [image], onEvent)).toBe(onEvent);

    const sink = vi.fn();
    deliverResults(sink, [image], onEvent)(event(TaskEventKind.Completed));
    expect(sink).not.toHaveBeenCalled();
  });
});
