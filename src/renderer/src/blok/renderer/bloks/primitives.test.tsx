// @vitest-environment jsdom
import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {z} from "zod";

import {
  BlokNode,
  BlokRuntimeProvider,
  BlokTreeProvider,
  createBlokCatalog,
  createBlokComponent,
  createBlokFunction,
  createBlokRuntimeStore,
  preflightBlokDocument,
  type BlokComponentNode,
  type BlokRuntimeStore,
} from "../../runtime";
import {shadcnComposableComponents} from "./Primitives";

afterEach(cleanup);

/** A component that always throws, to exercise per-node error isolation. */
const Exploder = createBlokComponent(
  {name: "Exploder", schema: z.object({})},
  () => {
    throw new Error("boom");
  },
);

const sideEffect = vi.fn();

const catalog = createBlokCatalog(
  "test-catalog",
  [...shadcnComposableComponents, Exploder],
  [
    createBlokFunction(
      {
        name: "shout",
        description: "Uppercases text.",
        purity: "pure",
        schema: z.object({text: z.string()}),
      },
      args => args.text.toUpperCase(),
    ),
    createBlokFunction(
      {
        name: "notify",
        description: "Records a side effect.",
        schema: z.record(z.string(), z.unknown()),
      },
      args => {
        sideEffect(args);
        return null;
      },
    ),
  ],
);

const renderBlok = (
  roots: unknown[],
  initialState?: unknown,
): {store: BlokRuntimeStore; errors: ReturnType<typeof preflightBlokDocument>["errors"]} => {
  const preflight = preflightBlokDocument(roots, catalog);
  const store = createBlokRuntimeStore({initialDataModel: initialState});
  store.getState().setInvokeFunction((name, args, options) =>
    catalog.invokeFunction(name, args, options),
  );

  render(
    <BlokRuntimeProvider store={store}>
      <BlokTreeProvider
        tree={{catalog, nodes: preflight.nodes, invalidNodes: preflight.invalidNodes}}
      >
        {preflight.rootIds.map(id => (
          <BlokNode key={id} id={id} />
        ))}
      </BlokTreeProvider>
    </BlokRuntimeProvider>,
  );

  return {store, errors: preflight.errors};
};

const text = (id: string, path: string): BlokComponentNode => ({
  id,
  component: "Text",
  props: [{key: "text", dynamic_value: {path}}],
});

describe("foreach", () => {
  it("scopes a named iteration to the bound path", () => {
    renderBlok(
      [
        {
          id: "loop",
          component: "foreach",
          props: [
            {key: "items", dynamic_value: {path: "rows"}},
            {key: "let", static_value: "row"},
          ],
          children: [text("row-name", "row/name")],
        },
      ],
      {rows: [{name: "alpha"}, {name: "beta"}]},
    );

    expect(screen.queryByText("alpha")).not.toBeNull();
    expect(screen.queryByText("beta")).not.toBeNull();
  });

  it("resolves relatively when the iteration has no name", () => {
    renderBlok(
      [
        {
          id: "loop",
          component: "foreach",
          props: [{key: "items", dynamic_value: {path: "rows"}}],
          children: [text("row-name", "name")],
        },
      ],
      {rows: [{name: "alpha"}, {name: "beta"}]},
    );

    expect(screen.queryByText("alpha")).not.toBeNull();
    expect(screen.queryByText("beta")).not.toBeNull();
  });

  it("iterates a source that has no addressable path", () => {
    // `items` comes from a util call, so there is no path to alias — the item
    // is handed down by value. This used to fall through to the unscoped path
    // and render nothing.
    renderBlok(
      [
        {
          id: "loop",
          component: "foreach",
          props: [
            {key: "items", static_value: '[{"name":"literal-a"},{"name":"literal-b"}]'},
            {key: "let", static_value: "row"},
          ],
          children: [text("row-name", "row/name")],
        },
      ],
      {},
    );

    expect(screen.queryByText("literal-a")).not.toBeNull();
    expect(screen.queryByText("literal-b")).not.toBeNull();
  });

  it("writes from inside a loop body through to the shared data model", () => {
    const {store} = renderBlok(
      [
        {
          id: "loop",
          component: "foreach",
          props: [
            {key: "items", dynamic_value: {path: "rows"}},
            {key: "let", static_value: "row"},
          ],
          children: [
            {
              id: "row-input",
              component: "Input",
              props: [{key: "bind", static_value: "row/name"}],
            },
          ],
        },
      ],
      {rows: [{name: "alpha"}, {name: "beta"}]},
    );

    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(2);
    expect((inputs[1] as HTMLInputElement).value).toBe("beta");

    fireEvent.change(inputs[1], {target: {value: "edited"}});

    // The write lands on the root store at the item's absolute path. Under the
    // old cloned-store scoping it was silently swallowed by the clone.
    expect(store.getState().runtimePathValues).toEqual({"rows/1/name": "edited"});
    expect(store.getState().dataModel).toEqual({
      rows: [{name: "alpha"}, {name: "edited"}],
    });
    expect((screen.getAllByRole("textbox")[1] as HTMLInputElement).value).toBe("edited");
  });
});

describe("Input", () => {
  it("is controlled by its binding and never mixes value with defaultValue", () => {
    const {store} = renderBlok(
      [
        {
          id: "field",
          component: "Input",
          props: [
            {key: "bind", static_value: "user/name"},
            {key: "defaultValue", static_value: "ignored"},
          ],
        },
      ],
      {user: {name: "Ada"}},
    );

    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).value).toBe("Ada");

    fireEvent.change(input, {target: {value: "Grace"}});
    expect(store.getState().dataModel).toEqual({user: {name: "Grace"}});
  });

  it("keeps its own state when unbound", () => {
    renderBlok([
      {
        id: "field",
        component: "Input",
        props: [{key: "defaultValue", static_value: "start"}],
      },
    ]);

    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).value).toBe("start");

    fireEvent.change(input, {target: {value: "typed"}});
    expect((input as HTMLInputElement).value).toBe("typed");
  });
});

describe("effectful functions", () => {
  it("is rejected by preflight in value position", () => {
    const {errors} = renderBlok([
      {
        id: "label",
        component: "Text",
        props: [{key: "text", util_call: {operation: "notify"}}],
      },
    ]);

    expect(errors.some(error => error.message.includes("side effects"))).toBe(true);
  });

  it("does not fire while rendering, and fires once per click from an action", () => {
    sideEffect.mockClear();

    renderBlok([
      {
        id: "button",
        component: "Button",
        props: [
          {key: "label", static_value: "Go"},
          {
            key: "onClick",
            util_call: {operation: "notify", arguments: [{key: "m", value_literal: "hi"}]},
          },
        ],
      },
    ]);

    // The old renderer invoked value-position util calls straight from a
    // render-phase `useMemo`, so a toast/log fired on every render.
    expect(sideEffect).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", {name: "Go"}));
    expect(sideEffect).toHaveBeenCalledTimes(1);
    expect(sideEffect).toHaveBeenCalledWith({m: "hi"});
  });
});

describe("pure functions", () => {
  it("computes a prop value during render", () => {
    renderBlok(
      [
        {
          id: "label",
          component: "Text",
          props: [
            {
              key: "text",
              util_call: {operation: "shout", arguments: [{key: "text", value_path: "name"}]},
            },
          ],
        },
      ],
      {name: "quiet"},
    );

    expect(screen.queryByText("QUIET")).not.toBeNull();
  });
});

describe("checks", () => {
  it("disables a button until every check passes", () => {
    const {store} = renderBlok(
      [
        {
          id: "button",
          component: "Button",
          props: [
            {key: "label", static_value: "Submit"},
            {
              key: "checks",
              static_value: [{path: "form/name", operator: "nonEmpty", message: "Name required."}],
            },
          ],
        },
      ],
      {form: {name: ""}},
    );

    const button = screen.getByRole("button", {name: "Submit"});
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute("title")).toBe("Name required.");

    act(() => {
      store.getState().setRuntimeValue("form/name", "Ada");
    });
    expect((screen.getByRole("button", {name: "Submit"}) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });
});

describe("node error isolation", () => {
  it("contains a throwing node and still renders its siblings", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    renderBlok(
      [
        {
          id: "root",
          component: "Column",
          children: [
            text("ok-before", "label"),
            {id: "bad", component: "Exploder"},
            text("ok-after", "label"),
          ],
        },
      ],
      {label: "survivor"},
    );

    expect(screen.getAllByText("survivor")).toHaveLength(2);
    expect(screen.queryByText(/failed to render/i)).not.toBeNull();

    consoleError.mockRestore();
  });

  it("renders an inline card for a node that failed preflight", () => {
    renderBlok([
      {
        id: "root",
        component: "Column",
        children: [{id: "bad", component: "NotInCatalog"}],
      },
    ]);

    expect(screen.queryByText(/Invalid component/i)).not.toBeNull();
    expect(screen.queryByText(/Component: bad/)).not.toBeNull();
  });
});
