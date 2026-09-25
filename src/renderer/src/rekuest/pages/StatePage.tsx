import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { AsyncBoundary } from "@/core/components/boundaries/AsyncBoundary";
import { Card } from "@/core/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { Slider } from "@/core/components/ui/slider";
import { RekuestState } from "@/core/linkers";
import {
  StateFragment,
  useCheckoutQuery,
  useGetStateQuery,
  useWatchStateSubscription,
} from "@/rekuest/api/graphql";
import { useWidgetRegistry } from "@/core/lib/ports/WidgetsContext";
import { useRef, useState } from "react";
import { applyPatch } from "fast-json-patch";


/** Display state value through the port widgets */
const StateValueDisplay = ({
  state,
  value,
  select,
  label,
}: {
  state: StateFragment;
  value: Record<string, unknown>;
  label?: boolean;
  select?: string[] | null | undefined;
}) => {
  const { registry } = useWidgetRegistry();

  const ports = select
    ? state.definition.ports.filter((p) => select.includes(p.key)) || []
    : state.definition.ports || [];

  return (
    <Card className="grid grid-cols-2 gap-4 p-3">
      {ports.map((port, index) => {
        const Widget = registry.getReturnWidgetForPort(port);
        return (
          <div className="flex-1 flex flex-col gap-2" key={index}>
            {label && <label>{port.key}</label>}
            <Widget
              key={index}
              value={value[port.key] as never}
              port={port}
              widget={port.widget}
            />
          </div>
        );
      })}
    </Card>
  );
};


/** Live mode: subscribes to watchState and applies patches in real time */
const LiveStateDisplay = ({
  state,
  select,
  label,
}: {
  state: StateFragment;
  label?: boolean;
  select?: string[] | null | undefined;
}) => {

  const [liveValue, setLiveValue] = useState<Record<string, unknown> | null>(null);
  const [revision, setRevision] = useState<number | null>(null);
  const valueRef = useRef<Record<string, unknown> | null>(null);



  // Subscribe to live patches
  useWatchStateSubscription({
    variables: { stateID: state.id },
    onData: ({ data: subData }) => {
      const event = subData.data?.watchState;
      if (!event) return;

      if (event.__typename === "StateSnapshotEvent") {
        // Full snapshot replaces the value
        valueRef.current = event.value;
        setLiveValue({ ...event.value });
        setRevision(event.globalRevision);
      } else if (event.__typename === "StatePatchEvent") {
        // Apply JSON patch to current value
        if (valueRef.current) {
          const result = applyPatch(
            valueRef.current,
            [{ op: event.op as "replace" | "add" | "remove", path: event.path, value: event.value }],
            false,
            false,
          );
          valueRef.current = result.newDocument;
          setLiveValue({ ...result.newDocument });
          setRevision(event.globalRevision);
        }
      }
    },
  });

  return (
    <AsyncBoundary>
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
        <span>Revision: {revision ?? "–"}</span>
      </div>
      {liveValue && (
        <StateValueDisplay
          state={state}
          value={liveValue}
          label={label}
          select={select}
        />
      )}
    </AsyncBoundary>
  );
};


/** Checkout mode: view state at a specific global revision */
const CheckoutStateDisplay = ({
  state,
  select,
  label,
}: {
  state: StateFragment;
  label?: boolean;
  select?: string[] | null | undefined;
}) => {
  // First get latest to know the max revision
  const { data: latestData } = useCheckoutQuery({
    variables: { state: state.id },
  });

  const maxRevision = latestData?.checkout?.globalRevision ?? 0;
  const [selectedRevision, setSelectedRevision] = useState<number | null>(null);

  // Derive default without effect
  const effectiveRevision = selectedRevision ?? (maxRevision || null);

  const { data: revData, error, loading } = useCheckoutQuery({
    variables: {
      state: state.id,
      globalRevision: effectiveRevision,
    },
    skip: effectiveRevision === null,
  });

  const displayValue =  revData?.checkout?.value ?? latestData?.checkout?.value

  return (
    <AsyncBoundary>
      {error && <div className="text-red-500">Error: {error.message}</div>}
      <div className="flex flex-col gap-3 mb-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Revision</span>
          <span className="font-mono">
            {effectiveRevision ?? "–"} / {maxRevision}
          </span>
          {loading && <span className="text-yellow-500">loading…</span>}
        </div>
        {maxRevision > 0 && (
          <Slider
            min={0}
            max={maxRevision}
            step={1}
            value={[effectiveRevision ?? maxRevision]}
            onValueChange={([v]) => setSelectedRevision(v)}
          />
        )}
      </div>
      {displayValue && (
        <StateValueDisplay
          state={state}
          value={displayValue}
          label={label}
          select={select}
        />
      )}
    </AsyncBoundary>
  );
};


export const StatePage = asDetailQueryRoute(
  useGetStateQuery,
  ({ data }) => {
    const allKeys = data.state.definition.ports.map((p) => p.key);

    return (
      <RekuestState.ModelPage
        title={data.state.definition.name}
        object={data.state}
      >
        <div className="p-6">
          <Tabs defaultValue="live">
            <TabsList>
              <TabsTrigger value="live">Live</TabsTrigger>
              <TabsTrigger value="checkout">Checkout</TabsTrigger>
            </TabsList>
            <TabsContent value="live" className="mt-4">
              <LiveStateDisplay
                state={data.state}
                label
                select={allKeys}
              />
            </TabsContent>
            <TabsContent value="checkout" className="mt-4">
              <CheckoutStateDisplay
                state={data.state}
                label
                select={allKeys}
              />
            </TabsContent>
          </Tabs>
        </div>
      </RekuestState.ModelPage>
    );
  },
);


export default StatePage;
