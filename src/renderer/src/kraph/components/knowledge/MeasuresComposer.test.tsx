// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const recentTerms = vi.fn();

vi.mock("@/kraph/lib/recentTerms", () => ({ useRecentTerms: () => recentTerms() }));
vi.mock("@/kraph/api/funcs", () => ({ useKraph: () => ({}) }));
vi.mock("@/kraph/api/graphql", () => ({
  TermKind: { Entity: "ENTITY", Measurement: "MEASUREMENT" },
}));
// A picker that picks the word it was told about, by which kind it is.
vi.mock("./WordPicker", () => ({
  WordPicker: ({
    kind,
    recents,
    onPick,
  }: {
    kind: string;
    recents: { key: string }[];
    onPick: (word: { key: string }) => void;
  }) => (
    <div data-testid={`picker-${kind}`} data-recents={recents.map((word) => word.key).join(",")}>
      <button onClick={() => onPick({ key: kind === "MEASUREMENT" ? "intensity profile" : "sample" })}>
        pick {kind}
      </button>
    </div>
  ),
}));

import { MeasuresComposer, readMeasures } from "./MeasuresComposer";

const pick = (kind: string) =>
  act(async () => {
    fireEvent.click(screen.getByText(`pick ${kind}`));
  });

beforeEach(() => {
  recentTerms.mockReturnValue({ terms: [], record: vi.fn() });
});

describe("MeasuresComposer", () => {
  it("asks for the two words in reading order, and says the sentence on the second", async () => {
    const onSay = vi.fn(async () => true);
    render(<MeasuresComposer onSay={onSay} />);
    expect(screen.queryByTestId("picker-ENTITY")).toBeNull();

    await pick("MEASUREMENT");
    expect(onSay).not.toHaveBeenCalled();
    expect(screen.getByText("intensity profile")).toBeInTheDocument();

    await pick("ENTITY");
    expect(onSay).toHaveBeenCalledWith({
      measure: { key: "intensity profile" },
      thing: { new: { key: "sample" } },
    });
  });

  it("starts over once it was said", async () => {
    render(<MeasuresComposer onSay={async () => true} />);
    await pick("MEASUREMENT");
    await pick("ENTITY");

    expect(screen.getByTestId("picker-MEASUREMENT")).toBeInTheDocument();
  });

  it("keeps the first word when saying it failed", async () => {
    render(<MeasuresComposer onSay={async () => false} />);
    await pick("MEASUREMENT");
    await pick("ENTITY");

    expect(screen.getByText("intensity profile")).toBeInTheDocument();
    expect(screen.getByTestId("picker-ENTITY")).toBeInTheDocument();
  });

  it("offers what is known on the datum, without minting a new one", async () => {
    const onSay = vi.fn(async () => true);
    const sample = { id: "i1", label: "sample", informed: true };
    render(<MeasuresComposer known={[sample]} onSay={onSay} />);
    await pick("MEASUREMENT");

    await act(async () => {
      fireEvent.click(screen.getByText("this sample"));
    });

    expect(onSay).toHaveBeenCalledWith({
      measure: { key: "intensity profile" },
      thing: { known: sample },
    });
  });

  it("needs only the word when the thing was already decided", async () => {
    const onSay = vi.fn(async () => true);
    const target = { id: "dropped", label: "sample 4" };
    render(<MeasuresComposer target={target} onSay={onSay} />);

    await pick("MEASUREMENT");

    expect(onSay).toHaveBeenCalledWith({
      measure: { key: "intensity profile" },
      thing: { known: target },
    });
  });

  it("offers each recent word once, on the side of the sentence it was said on", async () => {
    recentTerms.mockReturnValue({
      terms: [
        { key: "sample", measure: { key: "area" }, at: 2 },
        { key: "sample", measure: { key: "intensity profile" }, at: 1 },
        { key: "AIS", at: 0 },
      ],
      record: vi.fn(),
    });
    render(<MeasuresComposer onSay={async () => true} />);
    expect(screen.getByTestId("picker-MEASUREMENT").dataset.recents).toBe("area,intensity profile");

    await pick("MEASUREMENT");
    expect(screen.getByTestId("picker-ENTITY").dataset.recents).toBe("sample,AIS");
  });
});

describe("readMeasures", () => {
  it("reads the sentence, by label before key", () => {
    expect(
      readMeasures({
        measure: { key: "INTENSITY_PROFILE", label: "intensity profile" },
        thing: { new: { key: "sample" } },
      }),
    ).toBe("Measures the intensity profile of sample");
  });
});
