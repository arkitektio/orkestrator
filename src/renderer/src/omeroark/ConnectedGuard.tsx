import { Button } from "@/core/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/ui/card";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { useForm } from "react-hook-form";
import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { LoadingPage } from "@/core/layout/fallbacks/LoadingPage";
import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { PlugZap } from "lucide-react";
import { MeDocument, useDeleteMeMutation, useEnsureOmeroUserMutation, useMeQuery } from "./api/graphql";

interface OmeroConnectionForm {
  username: string;
  password: string;
  host: string;
  port: number;
}

export const DeleteMeButton = () => {

  const [deleteMe] = useDeleteMeMutation({
    refetchQueries: [{ query: MeDocument }],
  });


  return <Button variant="destructive" onClick={() => {
    deleteMe({
      variables: {
        input: {}
      }
    })
  }}>Disconnect Omero User</Button>
}

export const EnsureMeForm = () => {
  const [setMe, { loading }] = useEnsureOmeroUserMutation({
    refetchQueries: [{ query: MeDocument }],
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OmeroConnectionForm>({
    defaultValues: {
      username: "root",
      password: "omero",
      host: "omeroserver",
      port: 4064,
    },
  });

  const onSubmit = (data: OmeroConnectionForm) => {
    setMe({
      variables: {
        input: {
          username: data.username,
          password: data.password,
          host: data.host,
          port: data.port,
        },
      },
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Connect to OMERO</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              {...register("username", { required: "Username is required" })}
              placeholder="Enter username"
            />
            {errors.username && (
              <p className="text-sm text-red-500">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...register("password", { required: "Password is required" })}
              placeholder="Enter password"
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="host">Host</Label>
            <Input
              id="host"
              {...register("host", { required: "Host is required" })}
              placeholder="Enter host"
            />
            {errors.host && (
              <p className="text-sm text-red-500">{errors.host.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              type="number"
              {...register("port", {
                required: "Port is required",
                valueAsNumber: true,
                min: { value: 1, message: "Port must be greater than 0" },
                max: { value: 65535, message: "Port must be less than 65536" },
              })}
              placeholder="Enter port"
            />
            {errors.port && (
              <p className="text-sm text-red-500">{errors.port.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Connecting..." : "Connect to OMERO"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export const ConnectedGuard = ({ children }: { children: React.ReactNode }) => {
  const { data, error, refetch } = useMeQuery();

  if (error && !data) return <QueryError error={error} onRetry={() => refetch()} />;
  if (!data) return <LoadingPage />;

  if (!data.me.omeroUser) {
    return (
      <StatusPage
        icon={PlugZap}
        eyebrow="Not linked"
        title="Connect your OMERO account"
        description="You are not yet associated with an account on this OMERO server. Sign in to it once and the pages here open."
      >
        <div className="w-full text-left">
          <EnsureMeForm />
        </div>
      </StatusPage>
    );
  }

  return <>{children}</>;
};
