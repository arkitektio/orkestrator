import { setSessionsEnabled, useSessionsEnabled } from "@/core/connection/realtime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/ui/card";
import { Label } from "@/core/ui/label";
import { Switch } from "@/core/ui/switch";
import { Radio } from "lucide-react";

/**
 * Whether live updates come over caller sessions (rekuest's on takt: one
 * socket per window, resumed after a drop) or the GraphQL subscriptions. A
 * kill switch, and the way to compare the two; applies from the next
 * connection (reconnect the server or reload the window).
 */
export const RealtimeSessionsCard = () => {
  const enabled = useSessionsEnabled();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5" />
          Live updates
        </CardTitle>
        <CardDescription>
          Follow tasks and states over one session per window, which picks up exactly where it
          left off after a dropped connection. Off, the GraphQL subscriptions are used instead.
          Takes effect after reloading the window.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <Switch id="realtime-sessions" checked={enabled} onCheckedChange={setSessionsEnabled} />
        <Label htmlFor="realtime-sessions">Use the session for tasks and states</Label>
      </CardContent>
    </Card>
  );
};
