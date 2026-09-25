import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/core/components/ui/collapsible";
import { useSettings } from "@/core/providers/settings/SettingsContext";
import { Activity, AlertCircle, ChevronDown, ChevronUp, Power, Wifi, WifiOff } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { AgentCodeDisplay } from "./AgentCodeDisplay";
import { useAgent } from "./AgentProvider";
import { useAgentState } from "./store";

export const AgentController = (_) => {
  const { settings, setSettings } = useSettings();
  const { disabled } = useAgent();
  const { assignments, errors, connected, lastCode, lastReason } = useAgentState(
    useShallow((state) => ({
      assignments: state.assignments,
      errors: state.errors,
      connected: state.connected,
      lastCode: state.lastCode,
      lastReason: state.lastReason,
    })),
  );

  const toggleAgent = () => {
    setSettings({ ...settings, startAgent: !settings.startAgent })
  }

  const toggleExpanded = () => {
    setSettings({ ...settings, agentExpanded: !settings.agentExpanded })
  }

  if (disabled) {
    return (
      <div className="w-full bg-foreground/5 p-4 rounded-t-lg border-t border-border">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="text-xs text-muted-foreground text-center">
            Agent support is currently disabled for this build.
          </div>
        </div>
      </div>
    )
  }

  if (!settings.startAgent) {
    return (
      <div className="w-full bg-foreground/5 p-4 rounded-t-lg border-t border-border">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="text-xs text-muted-foreground text-center">
            Enable the agent to allow this app to be controlled by other users.
          </div>
          <Button onClick={toggleAgent} variant="outline" size="sm" className="gap-2 w-full">
            <Power className="h-4 w-4" />
            Start Agent
          </Button>
        </div>
      </div>
    )
  }


  return (
    <Collapsible
      open={settings.agentExpanded}
      onOpenChange={toggleExpanded}
      className="w-full bg-sidebar/5 rounded-t-lg border-t border-border overflow-hidden"
    >
      <div className="p-3 border-b border-border/50 flex items-center justify-between bg-backgroundsimilar/50">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-transparent">
              {settings.agentExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
          <div className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Agent Status
          </div>
        </div>
        <Badge variant={connected ? "secondary" : "destructive"} className="gap-1 h-5 px-2">
          {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {connected ? "Online" : "Offline"}
        </Badge>
      </div>

      <CollapsibleContent>
        <div className="p-4 space-y-4">
          {!connected && (lastCode || lastReason) && (
            <Alert variant="destructive" className="py-2 text-xs [&>svg]:top-2.5 [&>svg]:left-3 pl-9 bg-red-900/70 border-red-900/20 text-white">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Error {lastCode && <span className="font-mono text-[10px] opacity-80">({lastCode})</span>}</AlertTitle>
              <AlertDescription>
                {lastCode && <AgentCodeDisplay code={lastCode} />}
                {lastReason && <div className="mt-1 text-[10px] opacity-80">{lastReason}</div>}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-background/50 p-2 rounded border border-border/50 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{assignments.length}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Assignments</span>
            </div>
            <div className="bg-background/50 p-2 rounded border border-border/50 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${errors.length > 0 ? 'text-destructive' : ''}`}>{errors.length}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Errors</span>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-destructive">Recent Errors</div>
              <div className="text-xs text-muted-foreground space-y-1 max-h-[100px] overflow-y-auto bg-background/50 p-2 rounded border border-border/50">
                {errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-red-500 break-all">
                    <span className="shrink-0">•</span>
                    <span>{e}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={toggleAgent} variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8">
            <Power className="h-3 w-3" />
            Stop Agent
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
