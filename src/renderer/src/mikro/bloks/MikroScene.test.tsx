// @vitest-environment jsdom
import { act, cleanup, screen } from "@testing-library/react";
import type * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as z from "zod";

import { shadcnExtras, shadcnHtml, shadcnUi } from "@arkitektio/bsx/shadcn";
import { renderBlokDocument } from "@arkitektio/bsx/renderer/bloks/testing";
import { createBlokCatalog } from "@arkitektio/bsx/renderer/runtime/index";

const handlers: { current: Record<string, ((payload: unknown) => void) | undefined> } = { current: {} };

// The scene itself is tested in `components/scene`: here, what the parts hand it and what they do with its events.
vi.mock("@/mikro/api/graphql", () => ({
  useGetSceneQuery: ({ skip }: { skip: boolean }) =>
    skip ? { data: undefined, loading: false } : { data: { scene: { id: "s1", name: "AIS", worldCoordinateSystem: { id: "w1" } } }, loading: false },
}));
vi.mock("@/mikro/components/scene/Scene", () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  return {
    Scene: {
      Provider: Pass,
      Viewport: ({ annotationCards }: { annotationCards?: boolean }) => (
        <div data-testid="viewport" data-cards={String(annotationCards)} />
      ),
      Dock: Pass,
      ZSlider: () => null,
      DimSliders: () => null,
      LayersSidebar: () => <div>the layer list</div>,
      AnnotationsSidebar: () => <div>the shapes</div>,
      ProbeSidebar: () => <div>the probe</div>,
    },
  };
});
vi.mock("@/mikro/components/scene/sceneHost", () => ({
  SceneHostGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSceneEvents: (given: Record<string, ((payload: unknown) => void) | undefined>) => {
    handlers.current = given;
  },
  useLiveScene: () => undefined,
  useSceneAnnotationCollections: () => [],
}));
vi.mock("@/mikro/lib/annotations/useLiveSceneAnnotations", () => ({ useLiveSceneAnnotations: () => undefined }));

import { MIKRO_BLOKS } from "./index";

const record = vi.fn();
const catalog = createBlokCatalog("mikro-scene-test", [...shadcnUi.components, ...shadcnHtml.components, ...shadcnExtras.components, ...MIKRO_BLOKS]);

/** A callback's one thing: a task call, whose arguments the test records. */
const recordAt = (path: string) => ({ agent_call: { dependency: "self", operation: "record", arguments: [{ key: "value", value_path: path }] } });
const render = (roots: unknown[]) => {
  const rendered = renderBlokDocument(catalog, roots);
  rendered.store.getState().setDispatchAction((action) => void record(action.arguments?.value));
  return rendered;
};
const scene = { key: "value", static_value: { object: "s1", __identifier: "@mikro/scene" } };
const view = { id: "view", component: "MikroSceneViewport", props: [] };

beforeEach(() => {
  record.mockClear();
  handlers.current = {};
});
afterEach(cleanup);

describe("MikroScene", () => {
  it("lays its parts out inside the scene, without the action card unless asked", async () => {
    renderBlokDocument(catalog, [
      {
        id: "scene",
        component: "MikroScene",
        props: [scene],
        children: [view, { id: "layers", component: "MikroSceneLayers", props: [] }],
      },
    ]);
    expect((await screen.findByTestId("viewport")).dataset.cards).toBe("false");
    expect(await screen.findByText("the layer list")).toBeTruthy();
  });

  it("runs the blok's action on a drawn shape, the event as event", async () => {
    render([
      {
        id: "scene",
        component: "MikroScene",
        props: [scene, { key: "onAnnotation", ...recordAt("event.annotation") }],
        children: [view],
      },
    ]);
    await screen.findByTestId("viewport");
    const annotation = { __identifier: "@mikro/annotation", object: "a1" };
    act(() => handlers.current.onAnnotation?.({ annotation, kind: "PATH", lens: null, descriptors: null }));
    expect(record).toHaveBeenCalledWith(annotation);
  });

  it("writes the selection to its binding before onSelect runs", async () => {
    render([
      {
        id: "scene",
        component: "MikroScene",
        props: [scene, { key: "bind", dynamic_value: { path: "form.selected" } }, { key: "onSelect", ...recordAt("form.selected") }],
        children: [view],
      },
    ]);
    await screen.findByTestId("viewport");
    const annotation = { __identifier: "@mikro/annotation", object: "a2" };
    const lens = { __identifier: "@mikro/arraylens", object: "l1" };
    act(() => handlers.current.onSelect?.({ annotation, annotations: [annotation], lens }));
    expect(record).toHaveBeenCalledWith({ annotation, lens });
  });

  it("writes a drawn shape to its binding, before onAnnotation runs", async () => {
    render([
      {
        id: "scene",
        component: "MikroScene",
        props: [scene, { key: "bind", dynamic_value: { path: "form.selected" } }, { key: "onAnnotation", ...recordAt("form.selected") }],
        children: [view],
      },
    ]);
    await screen.findByTestId("viewport");
    const annotation = { __identifier: "@mikro/annotation", object: "a3" };
    const lens = { __identifier: "@mikro/arraylens", object: "l2" };
    act(() => handlers.current.onAnnotation?.({ annotation, kind: "PATH", lens, descriptors: null }));
    expect(record).toHaveBeenCalledWith({ annotation, lens });
  });

  it("writes the scene's world space to bindWorld, for a picker of what the scene can show", async () => {
    render([
      {
        id: "scene",
        component: "MikroScene",
        props: [scene, { key: "bindWorld", dynamic_value: { path: "form.world" } }, { key: "onPick", ...recordAt("form.world") }],
        children: [view],
      },
    ]);
    await screen.findByTestId("viewport");
    act(() => handlers.current.onPick?.({ layer: "l1", world: null, voxel: [0, 0, 0], lens: null }));
    expect(record).toHaveBeenCalledWith({ object: "w1", __identifier: "@mikro/coordinatesystem" });
  });

  it("listens only for the events the blok declares", async () => {
    render([
      { id: "scene", component: "MikroScene", props: [scene, { key: "onPick", ...recordAt("event.voxel") }], children: [] },
    ]);
    await vi.waitFor(() => expect(handlers.current.onPick).toBeDefined());
    expect(handlers.current.onAnnotation).toBeUndefined();
    expect(handlers.current.onSelect).toBeUndefined();
    act(() => handlers.current.onPick?.({ layer: "l1", world: null, voxel: [1, 2, 3], lens: null }));
    expect(record).toHaveBeenCalledWith([1, 2, 3]);
  });

  it("says where a part belongs when it is placed outside a MikroScene", async () => {
    // The placement itself is refused by the server and the spec, from the
    // published catalog (`app/catalog/catalogExport.test.ts`); here, what is drawn.
    renderBlokDocument(catalog, [view]);
    expect(await screen.findByText("Place the viewport inside a MikroScene.")).toBeTruthy();
  });
});
