import { Arkitekt } from "@/app/Arkitekt";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogOut, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { SettingsPage } from "../components/SettingsPage";

/** Signing out and forgetting accounts; picking an organization stays in the rail's switcher. */
export const AccountPage = () => {
  const activeProfile = Arkitekt.useActiveProfile();
  const profiles = Arkitekt.useProfiles();
  const disconnect = Arkitekt.useDisconnect();
  const forgetAllProfiles = Arkitekt.useForgetAllProfiles();

  return (
    <SettingsPage slug="account">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Signed in
          </CardTitle>
          <CardDescription>
            {activeProfile
              ? `Signed in as ${activeProfile.label.username || "unknown user"} in ${activeProfile.label.organizationName || activeProfile.label.deploymentName || "an organization"}.`
              : "Not signed in."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {/* Parks rather than wipes: the login stays in the switcher. */}
          <Button
            variant="outline"
            className="gap-2"
            disabled={!activeProfile}
            onClick={() => void disconnect()}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
          <Button
            variant="destructive"
            className="gap-2"
            disabled={profiles.length === 0}
            onClick={() => {
              void forgetAllProfiles().then(() =>
                toast.success("Forgot every account on this computer."),
              );
            }}
          >
            <Trash2 className="w-4 h-4" />
            Forget all accounts
          </Button>
        </CardContent>
      </Card>
    </SettingsPage>
  );
};

export default AccountPage;
