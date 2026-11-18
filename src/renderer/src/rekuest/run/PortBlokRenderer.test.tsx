// @vitest-environment jsdom
import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm, type FieldValues, type UseFormReturn } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";

const assign = vi.fn();

vi.mock("@/rekuest/components/useBlokViewer", () => ({ useBlokViewer: () => null }));
vi.mock("@/rekuest/components/useBlokPersistence", () => ({ useBlokPersistence: () => null, useBlokComponentStore: () => null }));
vi.mock("@/core/modules/hooks/useServiceReads", () => ({
  useServiceReads: () => ({ query: () => Promise.resolve({}), subscribe: () => () => undefined }),
}));
vi.mock("@/rekuest/api/hooks", () => ({ useRekuest: () => ({ subscribe: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) }) }));
vi.mock("@/rekuest/hooks/useAssign", () => ({ useAssign: () => ({ assign }) }));
vi.mock("@/rekuest/scene/RekuestSceneHost", () => ({ RekuestSceneHost: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/rekuest/scene/RekuestAssetHost", () => ({ RekuestAssetHost: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
// Each bound agent's state says whose it is, so the test sees which agent `self` reads.
vi.mock("@/rekuest/travel/context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/rekuest/travel/context")>()),
  useBlokTravelSource: () => null,
  useBoundState: ({ agentID, stateInterface }: { agentID: string; stateInterface: string }) => ({
    value: { stage: `${agentID}/${stateInterface}` },
    revision: 1,
    known: true,
  }),
}));

import { configurePortHost } from "@arkitektio/bsx/ports/host";
import { createWidgetRegistry } from "@arkitektio/bsx/ports/engine/defaultRegistry";
import { WidgetRegistryContext, type WidgetRegistryContextType } from "@arkitektio/bsx/ports/engine/WidgetsContext";
import { PortBlokWidget } from "@arkitektio/bsx/ports/widgets/custom/PortBlokWidget";
import { installAppBlokCatalog } from "@/core/blok/testing";
import { AssignWidgetKind, PortKind } from "../api/graphql";
import { PortBlokRenderer, PortBlokRunProvider } from "./PortBlokRenderer";

installAppBlokCatalog();

const frame = () => act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

const SOURCE = `<Blok kind="port" context="panel">
  <Input bind={port.value} placeholder="exposure" />
  <Text text={self.camera_state.stage} />
</Blok>`;

const port = { __typename: "ArgPort", key: "exposure", label: "Exposure", kind: PortKind.Float, nullable: false } as never;
const widget = { __typename: "BlokAssignWidget", kind: AssignWidgetKind.Blok, source: SOURCE, vocab: 2, fallback: null } as never;
const run = { binding: [], self: { id: "cam1", name: "Camera", connected: true } };

const Harness = ({ held }: { held: { form?: UseFormReturn } }) => {
  const form = useForm<FieldValues>({ defaultValues: { exposure: 5 } });
  held.form = form;
  const registry = React.useMemo(() => createWidgetRegistry() as unknown as WidgetRegistryContextType["registry"], []);
  return (
    <WidgetRegistryContext.Provider value={{ registry, setRegistry: () => undefined }}>
      <FormProvider {...form}>
        <PortBlokRunProvider value={run}>
          <PortBlokWidget port={port} widget={widget} path={["exposure"]} />
        </PortBlokRunProvider>
      </FormProvider>
    </WidgetRegistryContext.Provider>
  );
};

afterEach(cleanup);

describe("a port's own blok, drawn through the port host", () => {
  it("reads the state of the agent that would run the action, and writes its port and nothing else", async () => {
    configurePortHost({ PortBlokRenderer });
    const held: { form?: UseFormReturn } = {};
    const view = render(<Harness held={held} />);
    await frame();

    expect(screen.getByText("Exposure")).toBeTruthy();
    // `self` is the run's agent, read like an assign blok reads it.
    expect(view.container.textContent).toContain("cam1/camera_state");

    const input = screen.getByPlaceholderText("exposure") as HTMLInputElement;
    expect(input.value).toBe("5");
    fireEvent.change(input, { target: { value: "7" } });
    expect(held.form?.getValues("exposure")).toBe("7");
    expect(assign).not.toHaveBeenCalled();
  });
});
