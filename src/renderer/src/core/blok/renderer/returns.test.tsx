// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseBsx } from "../bsx/parse";
import BlokRenderer from "./BlokRenderer";
import { defaultBlokCatalog as catalog } from "./catalog";
import { returningInvokeFunction } from "./returns";

afterEach(cleanup);

/** A blok as an LLM writes it: a button per image, each answering with its image. */
const source = `<Column>
  <foreach items="@args.images" let="#img">
    <Button label="Pick" onClick="@utils.blok.answer(values={'image': img})" />
  </foreach>
</Column>`;

describe("a blok that answers a task", () => {
  it("hands blok.answer's values to the host", () => {
    const onReturn = vi.fn();
    const images = [
      { __identifier: "@mikro/image", object: "7" },
      { __identifier: "@mikro/image", object: "8" },
    ];
    render(
      <BlokRenderer
        catalog={catalog}
        uiComponents={[parseBsx(source).tree]}
        initialState={{ args: { images } }}
        invokeFunction={returningInvokeFunction(catalog, onReturn)}
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Pick" })[1]);
    expect(onReturn).toHaveBeenCalledWith({ image: images[1] });
  });

  it("answers nobody where nothing waits", () => {
    const onReturn = vi.fn();
    render(
      <BlokRenderer
        catalog={catalog}
        uiComponents={[parseBsx(source).tree]}
        initialState={{ args: { images: [{ __identifier: "@mikro/image", object: "7" }] } }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Pick" }));
    expect(onReturn).not.toHaveBeenCalled();
  });

  it("answers with a nested value: lens_chat.py's lens picker, verbatim", () => {
    const picker = `<Column>
  <Label text="@args.question" />
  <foreach items="@args.lenses" let="#lens">
    <Card>
      <Label text="@lens.label" />
      <Label text="@lens.detail" />
      <Button label="Use this lens" onClick="@utils.blok.answer(values={'lens': lens.ref})" />
    </Card>
  </foreach>
</Column>`;
    const lenses = [
      { ref: { __identifier: "@mikro/arraylens", object: "1" }, label: "Whole", detail: "the whole dataset" },
      { ref: { __identifier: "@mikro/arraylens", object: "3" }, label: "Crop around cell", detail: "a selection" },
    ];
    const onReturn = vi.fn();
    render(
      <BlokRenderer
        catalog={catalog}
        uiComponents={[parseBsx(picker).tree]}
        initialState={{ args: { question: "Which lens?", lenses } }}
        invokeFunction={returningInvokeFunction(catalog, onReturn)}
      />,
    );
    expect(screen.getByText("Crop around cell")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Use this lens" })[1]);
    expect(onReturn).toHaveBeenCalledWith({ lens: lenses[1].ref });
  });
});
