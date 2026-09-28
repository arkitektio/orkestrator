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
import { AlertCircle } from "lucide-react";
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

  const form = useForm({
    defaultValues: {
      url: "",
    },
  });

  const onSubmit = (data: { url: string }) => {
    setIntrospectError(null);
    setFailedUrl(null);
    const controller = new AbortController();

    discover({ url: data.url, timeout: 2000, controller })
      .then((endpoint) => {
        connect({
          endpoint,
          controller,
        }).catch((e) => {
          setIntrospectError(e.message);
          setFailedUrl(data.url);
        });
      })
      .catch((e) => {
        setIntrospectError(e.message);
        setFailedUrl(data.url);
      });
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
              <Button className="w-full" type="submit" variant="secondary">
                Connect
              </Button>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
};
