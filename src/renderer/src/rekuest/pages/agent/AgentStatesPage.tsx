import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { AsyncBoundary } from "@/components/boundaries/AsyncBoundary";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RekuestAgent } from "@/linkers";
import {
  StateFragment,
  useAgentQuery,
  useCheckoutAgentQuery,
  useCheckoutQuery,
} from "@/rekuest/api/graphql";
import { useAgentStates } from "@/rekuest/hooks/useLiveState";
import { useWidgetRegistry } from "@/lib/ports/WidgetsContext";
import { useMemo, useState } from "react";

const AgentStateValueDisplay = ({
  state,
  value,
}: {
  state: StateFragment;
  value: Record<string, unknown>;
}) => {
  const { registry } = useWidgetRegistry();

  return (
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
            />
          </div>
        );
      })}
    </Card>
  );
};

const AgentLiveStateCard = ({
  state,
  liveValue,
  revision,
}: {
  state: StateFragment;
  liveValue?: Record<string, unknown>;
  revision: number | null;
}) => {
  const { data: checkoutData, error: checkoutError } = useCheckoutQuery({
    variables: { state: state.id },
  });

  const checkoutValue = checkoutData?.checkout?.value as Record<string, unknown> | undefined;
  const checkoutRevision = checkoutData?.checkout?.globalRevision ?? null;
  const displayValue = liveValue ?? checkoutValue ?? {};

  return (
    <AsyncBoundary>
      <div className="space-y-2 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{state.definition.name}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
            {(revision ?? checkoutRevision) != null && <span>Rev {revision ?? checkoutRevision}</span>}
          </div>
        </div>
        {checkoutError && (
          <div className="text-xs text-red-500">Error: {checkoutError.message}</div>
        )}
        <AgentStateValueDisplay state={state} value={displayValue} />
      </div>
    </AsyncBoundary>
  );
};

/** Checkout tab: fetches all agent state values at a selected global revision */
const AgentCheckoutTab = ({
  agentId,
  states,
}: {
  agentId: string;
  states: StateFragment[];
}) => {
  // First fetch to determine the latest revision (no revision argument = latest)
  const { data: latestData } = useCheckoutAgentQuery({
    variables: { agent: agentId },
  });

  const maxRevision = latestData?.checkoutAgent?.globalRevision ?? 0;
  const [selectedRevision, setSelectedRevision] = useState<number | null>(null);
  const effectiveRevision = selectedRevision ?? (maxRevision || null);

  const { data: revData, error, loading } = useCheckoutAgentQuery({
    variables: {
      agent: agentId,
      globalRevision: effectiveRevision ?? undefined,
    },
    skip: effectiveRevision === null,
  });


  return (
    <AsyncBoundary>
      <div className="space-y-4">
        <div className="flex flex-col gap-3">
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
        {error && <div className="text-xs text-red-500">Error: {error.message}</div>}
        <div className="grid gap-4">
          {states.map((state) =>{

            const value = useMemo(() => {
              if (!revData || revData.checkoutAgent.agentId !== agentId) return undefined;
              return revData.checkoutAgent.values[state.interface];
            }, [revData, state.id, agentId]);



            return <div key={state.id} className="space-y-2 rounded-lg border p-4">
              <h3 className="text-sm font-semibold">{state.definition.name}</h3>
              <AgentStateValueDisplay state={state} value={value ?? {}} />
            </div>
})}
        </div>
      </div>
    </AsyncBoundary>
  );
};

export const AgentStatesPage = asDetailQueryRoute(useAgentQuery, ({ data, id }) => {
  const { value: liveValues, revision } = useAgentStates({ agentID: id });

  return (
    <RekuestAgent.ModelPage
      title={`${data?.agent?.name} — States`}
      object={data.agent}
    >
      <div className="flex h-full flex-col gap-4 p-6">
        <Tabs defaultValue="live">
          <TabsList>
            <TabsTrigger value="live">Live</TabsTrigger>
            <TabsTrigger value="checkout">Checkout</TabsTrigger>
          </TabsList>
          <TabsContent value="live" className="mt-4">
            <div className="grid gap-4">
              {data.agent.states.map((state) => (
                <AgentLiveStateCard
                  key={state.id}
                  state={state}
                  liveValue={liveValues?.[state.id]}
                  revision={revision}
                />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="checkout" className="mt-4">
            <AgentCheckoutTab agentId={id} states={data.agent.states} />
          </TabsContent>
        </Tabs>
      </div>
    </RekuestAgent.ModelPage>
  );
});

export default AgentStatesPage;
