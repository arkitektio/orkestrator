// ── Agent Panel (projected from 3D → 2D, rendered outside Canvas) ────

import { useMemo } from "react";
import { useSpaceViewStore } from "../store";
import { SpaceGroupPlacement } from "../types";
import * as THREE from "three";
import { Card } from "@/core/components/ui/card";
import { RekuestAgent } from "@/core/linkers";
import { PatchFragment, StateFragment, useAgentQuery, useCheckoutAgentQuery } from "@/rekuest/api/graphql";
import { useWidgetRegistry } from "@/core/lib/ports/WidgetsContext";
import { AsyncBoundary } from "@/core/components/boundaries/AsyncBoundary";
import { useDebounce } from "@/core/hooks/use-debounce";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/core/components/ui/collapsible";

/**
 * Resolves a JSON Patch path to the matching state port and renders the
 * patch value using the correct return widget.
 *
 * Uses patch.interface to identify the state, then walks the path segments
 * through the port tree. Handles nested paths including array indices
 * (e.g. "/images/0" or "/model/nested_key/2").
 */
const PatchRenderWidget = ({
  patch,
  states,
}: {
  patch: PatchFragment;
  states: StateFragment[];
}) => {
  const { registry } = useWidgetRegistry();

  const resolved = useMemo(() => {
    const state = states.find((s) => s.interface === patch.interface);
    if (!state) return null;

    // Split path: "/images/0/name" → ["images", "0", "name"]
    const segments = patch.path.replace(/^\//, "").split("/");
    if (segments.length === 0 || segments[0] === "") return null;

    // First segment is always the top-level port key
    const portKey = segments[0];
    const topPort = state.definition.ports.find((p) => p.key === portKey);
    if (!topPort) return null;

    // Walk remaining segments to resolve the deepest port in the tree.
    // Numeric segments (array indices) step through a List's single child port
    // without consuming a named key. Named segments match a child port by key.
    let currentPort: any = topPort;
    const breadcrumbs: string[] = [topPort.label || topPort.key];

    for (let i = 1; i < segments.length; i++) {
      const seg = segments[i];
      const children = currentPort.children;
      if (!children || children.length === 0) break; // leaf reached

      if (/^\d+$/.test(seg)) {
        // Numeric index – step into List's single child port
        if (children.length === 1) {
          currentPort = children[0];
          breadcrumbs.push(`[${seg}]`);
        } else {
          break; // unexpected
        }
      } else {
        // Named key – step into Model/Union child port
        const child = children.find((c: any) => c.key === seg);
        if (child) {
          currentPort = child;
          breadcrumbs.push(child.label || child.key);
        } else {
          break; // can't resolve further
        }
      }
    }

    return { state, port: currentPort, breadcrumbs };
  }, [patch.path, patch.interface, states]);

  if (!resolved) {
    // Fallback: show raw JSON when path cannot be resolved
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground truncate">{patch.path}</span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
          patch.op === "replace" ? "bg-amber-500/20 text-amber-400" :
          patch.op === "add" ? "bg-emerald-500/20 text-emerald-400" :
          patch.op === "remove" ? "bg-rose-500/20 text-rose-400" :
          "bg-muted text-muted-foreground"
        }`}>
          {patch.op}
        </span>
        <span className="font-mono truncate">{JSON.stringify(patch.value)}</span>
      </div>
    );
  }

  const { state, port, breadcrumbs } = resolved;
  const Widget = registry.getReturnWidgetForPort(port);

  return (
    <div className="flex flex-col gap-1 rounded-md border p-2">
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="truncate">{state.definition.name}</span>
        <span>›</span>
        <span className="font-medium text-foreground truncate">
          {breadcrumbs.join(" › ")}
        </span>
        <span className={`ml-auto px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${
          patch.op === "replace" ? "bg-amber-500/20 text-amber-400" :
          patch.op === "add" ? "bg-emerald-500/20 text-emerald-400" :
          patch.op === "remove" ? "bg-rose-500/20 text-rose-400" :
          "bg-muted text-muted-foreground"
        }`}>
          {patch.op}
        </span>
      </div>
      <div className="rounded bg-background">
        <Widget
          port={port}
          widget={port.widget}
          value={patch.value}
        />
      </div>
    </div>
  );
};



const AgentCheckoutPanel = ({
  agentId,
}: {
  agentId: string;
}) => {

  const { data} = useAgentQuery({
    variables: {
      id: agentId,
    }
  })

  const { registry } = useWidgetRegistry();
  const timepoint = useSpaceViewStore((s) => s.selectedTimepoint);


  const debouncedTimepoint = useDebounce(timepoint, 200);


  const { data: revData, loading } = useCheckoutAgentQuery({
    variables: {
      agent: agentId,
      timestamp: debouncedTimepoint ? new Date(debouncedTimepoint).toISOString() : undefined,
      backwardPatchCount: 1
    },
  });


  return (
    <AsyncBoundary>
      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Revision</span>
            <span className="font-mono">
              {revData?.checkoutAgent.globalRevision}
            </span>
            {loading && <span className="text-yellow-500">loading…</span>}
          </div>
          {data?.agent?.states && revData?.checkoutAgent.backwardPatches.map((patch) => (
            <PatchRenderWidget
              key={patch.id}
              patch={patch}
              states={data.agent.states}
            />
          ))}
        </div>
        <Collapsible>
          <CollapsibleTrigger className="text-sm font-medium">
            View State
          </CollapsibleTrigger>
          <CollapsibleContent>
        <div className="grid gap-4">
          {data?.agent?.states.map((state) =>{

            const value =  revData?.checkoutAgent.values[state.interface];


            return <div key={state.id} className="space-y-2 rounded-lg border p-4">
              <h3 className="text-sm font-semibold">{state.definition.name}</h3>
              <Card className="grid grid-cols-1 gap-4 p-3 md:grid-cols-2">
                  {state.definition.ports.map((port, index) => {
                    const Widget = registry.getReturnWidgetForPort(port);

                    return (
                      <div className="flex flex-col gap-2" key={index}>
                        <label className="text-xs text-muted-foreground">{port.key}</label>
                        <Widget
                          key={index}
                          value={value?.[port.key] as never}
                          port={port}
                          widget={port.widget}
                          options={{minimal: true}}
                        />
                      </div>
                    );
                  })}
                </Card>
            </div>
})}
        </div>
        </CollapsibleContent>
        </Collapsible>
      </div>
    </AsyncBoundary>

  );
};















export const AgentPanel = ({ placements }: { placements: SpaceGroupPlacement[] }) => {


  const selectedId = useSpaceViewStore((s) => s.selectedPlacementId);
  const vpMatrix = useSpaceViewStore((s) => s.viewProjectionMatrix);
  const vpSize = useSpaceViewStore((s) => s.viewportSize);
  const selectPlacement = useSpaceViewStore((s) => s.selectPlacement);

  const selected = placements.find((p) => p.id === selectedId);



  const screenPos = useMemo(() => {
    if (!selected || !vpMatrix || !vpSize) return null;

    const mat = new THREE.Matrix4();
    const affine = selected.affineMatrix as number[][];
    if (affine && affine.length >= 4) {
      mat.set(
        affine[0][0], affine[0][1], affine[0][2], affine[0][3],
        affine[1][0], affine[1][1], affine[1][2], affine[1][3],
        affine[2][0], affine[2][1], affine[2][2], affine[2][3],
        affine[3][0], affine[3][1], affine[3][2], affine[3][3],
      );
    }

    const worldVec = new THREE.Vector3();
    worldVec.setFromMatrixPosition(mat);
    worldVec.applyMatrix4(vpMatrix);

    if (worldVec.z < -1 || worldVec.z > 1) return null;

    return {
      x: (worldVec.x * 0.5 + 0.5) * vpSize.width,
      y: (worldVec.y * -0.5 + 0.5) * vpSize.height,
    };
  }, [selected, vpMatrix, vpSize]);

  if (!selected || !screenPos) return null;

  return (
    <Card
      className="absolute z-20 shadow-2xl backdrop-blur-md p-3 flex flex-col gap-2 min-w-[200px] max-w-[300px] pointer-events-auto"
      style={{
        left: screenPos.x,
        top: screenPos.y,
        transform: "translate(-50%, -110%)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-sm">{selected.agentName}</div>
          <div className="text-[11px] text-muted-foreground">{selected.name}</div>
        </div>
        <button
          className="text-muted-foreground hover:text-foreground text-xs"
          onClick={() => selectPlacement(null)}
        >
          ✕
        </button>
      </div>


      <AgentCheckoutPanel agentId={selected.agentId} />



      <RekuestAgent.DetailLink
        object={{ id: selected.agentId }}
        className="text-xs text-primary hover:underline"
      >
        Open Agent →
      </RekuestAgent.DetailLink>
    </Card>
  );
};
