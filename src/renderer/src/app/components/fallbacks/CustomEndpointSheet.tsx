import { Arkitekt } from "@/core/connection/arkitekt/host";
import { StringField } from "@/core/forms/StringField";
import { Alert, AlertDescription } from "@/core/ui/alert";
import { Button } from "@/core/ui/button";
import { Form } from "@/core/ui/form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/core/ui/sheet";
import { ConnectionDoctor } from "@/core/connection/ui/doctor/ConnectionDoctor";
import { discover } from "@/core/connection/arkitekt/fakts/discover";
import { endpointToProbeTargets } from "@/core/connection/arkitekt/doctor/targets";
import { popOutWindowOpen } from "@/core/connection/arkitekt/fakts/popout";
import { endSession, startSession } from "@/core/connection/progress/store";
import { GrantProgress } from "@/core/connection/ui/progress/GrantProgress";
import { AlertCircle, Loader2 } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";

export const CustomEndpointSheet = () => {
  const connect = Arkitekt.useConnect();
  const [introspectError, setIntrospectError] = React.useState<string | null>(
    null,
  );
  // Kept so the doctor probes the address that actually failed, not whatever
  // is in the field by the time somebody clicks it.
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  /** The approval page, once the grant has opened it — so it can be opened again. */
  const [verificationUri, setVerificationUri] = React.useState<string | null>(null);
  const controllerRef = React.useRef<AbortController | null>(null);

  const form = useForm({
    defaultValues: {
      url: "",
    },
  });

  const onSubmit = async (data: { url: string }) => {
    setIntrospectError(null);
    setFailedUrl(null);
    setVerificationUri(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    startSession("granting", "discover", { endpointUrl: data.url });

    try {
      const endpoint = await discover({ url: data.url, timeout: 2000, controller });
      await connect({ endpoint, controller, onVerificationUri: setVerificationUri });
    } catch (e) {
      // Cancelled here: the user's choice, not a failure.
      if (!controller.signal.aborted) {
        setIntrospectError(e instanceof Error ? e.message : String(e));
        setFailedUrl(data.url);
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setBusy(false);
        setVerificationUri(null);
        endSession();
      }
    }
  };

  const reopen = () => {
    if (verificationUri) void popOutWindowOpen(verificationUri).catch(() => {});
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">Connect to Custom Coordination Server</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Connect to Custom Coordination Server</SheetTitle>
          <SheetDescription>
            Enter the address of your coordination server to connect.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {introspectError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Could not connect to the server: {introspectError}
              </AlertDescription>
            </Alert>
          )}
          {failedUrl && (
            <div className="rounded-md border border-border/60 p-3">
              <ConnectionDoctor
                context={{ kind: "discovery", endpointUrl: failedUrl }}
                buildTargets={() => endpointToProbeTargets(failedUrl)}
                originalError={introspectError ?? undefined}
                subject={failedUrl}
              />
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <StringField
                name="url"
                description="The coordination server URL (for example https://go.arkitekt.live or http://localhost:8000)"
              />
              <Button className="w-full" type="submit" variant="secondary" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? "Connecting…" : "Connect"}
              </Button>
            </form>
          </Form>
          {busy && (
            <GrantProgress
              onReopen={reopen}
              canReopen={!!verificationUri}
              onCancel={() => controllerRef.current?.abort()}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
