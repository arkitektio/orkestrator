import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { TbPlugConnected } from "react-icons/tb";
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
  const { data, errors } = useMeQuery();

  if (errors) {
    return <> Couldn&apos;t request user data. </>;
  }

  if (!data) {
    return <> Checking Connection.</>;
  }

  if (!data.me.omeroUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4 p-4 md:flex">
        <TbPlugConnected size={48} />
        <p>You are not yet associated with an account on omero do this now :)</p>
        <EnsureMeForm />
      </div>
    );
  }

  return <>{children}</>;
};
