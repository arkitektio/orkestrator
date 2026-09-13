import { Button } from "@/components/ui/button";
import { useArkitektActions } from "@/lib/arkitekt/provider";
import { ArkitektLogo } from "../logos/ArkitektLogo";

export const ConnectingFallback = () => {
  const { cancelConnection } = useArkitektActions();

  return (
    <div className="flex flex-col w-full h-full bg-radial-[at_100%_100%] from-background to-backgroundpaired items-center justify-center px-4">
      <div className="flex flex-col items-center max-w-md space-y-6 ">
        {/* Logo */}
        <ArkitektLogo
          width={120}
          height={120}
          strokeColor="currentColor"
          cubeColor="var(--primary)"
          aColor="currentColor"
        />

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to Arkitekt</h1>
          <p className="text-sm text-muted-foreground">
            Connecting to server...
          </p>
        </div>


        <div className="text-sm text-muted-foreground">
          Authenticate to continue.
        </div>

        <Button
          onClick={cancelConnection}
          variant="outline"
          className="mt-4"
        >
          Cancel Connection
        </Button>

      </div>
    </div>
  );
};
