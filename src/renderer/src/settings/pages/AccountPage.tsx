import { Arkitekt } from "@/app/Arkitekt";
import { ProfileBrandAvatar } from "@/app/components/profile/ProfileBrandAvatar";
import { profileDetail, profileTitle } from "@/app/components/profile/profileLabels";
import { openRailSwitcher } from "@/app/components/navigation/railSwitcher";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronsUpDown, LogOut, Stethoscope, Trash2, User } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { settingsLink } from "../sections";
import { SettingsPage } from "../components/SettingsPage";

/**
 * What you do TO the account you are in — not which account you are in.
 *
 * The list of accounts lives in exactly one place, the switcher at the foot of
 * the rail, and this page points at it rather than keeping a second copy that
 * can disagree with it. What is left here is the three things that are NOT
 * switching, each of which costs something different and says so:
 *
 * - **Switch** leaves every credential alone. It is one click in the switcher.
 * - **Sign out** spends this session: the account stays in the list, but coming
 *   back needs a fresh approval in the browser.
 * - **Remove** forgets the login on this computer for good.
 */
export const AccountPage = () => {
  const activeProfile = Arkitekt.useActiveProfile();
  const profiles = Arkitekt.useProfiles();
  const signOutProfile = Arkitekt.useSignOutProfile();
  const removeProfile = Arkitekt.useRemoveProfile();
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
              ? "The account this window is using. Switching to another one leaves both signed in."
              : "Not signed in."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeProfile && (
            <div className="flex items-center gap-3">
              <ProfileBrandAvatar
                profile={activeProfile}
                className="h-9 w-9 rounded-full text-xs"
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {profileTitle(activeProfile)}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {profileDetail(activeProfile)}
                </div>
              </div>
            </div>
          )}

          {/* One list of accounts, in the rail. This opens it rather than
              repeating it. */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={openRailSwitcher}>
              <ChevronsUpDown className="w-4 h-4" />
              Switch account
            </Button>
            {/* Trouble reaching this account's deployment is a connection
                problem, and the doctor for it lives with the services. */}
            <Button variant="ghost" className="gap-2" asChild>
              <Link to={settingsLink("services")}>
                <Stethoscope className="w-4 h-4" />
                Can't connect?
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sign out</CardTitle>
          <CardDescription>
            Ends this session and leaves the account in the switcher. Signing
            back into it needs a fresh approval in your browser — switching
            between accounts does not.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!activeProfile}
            onClick={() => {
              if (!activeProfile) return;
              void signOutProfile(activeProfile.id).then(() => {
                toast.success(`Signed out of ${profileTitle(activeProfile)}.`);
              });
            }}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remove accounts</CardTitle>
          <CardDescription>
            Forgetting a login removes it from this computer only — it stays
            valid on the server until it expires. Nothing is revoked.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="destructive"
            className="gap-2"
            disabled={!activeProfile}
            onClick={() => {
              if (!activeProfile) return;
              const name = profileTitle(activeProfile);
              void removeProfile(activeProfile.id).then(() => {
                toast.success(`Removed ${name} from this computer.`);
              });
            }}
          >
            <Trash2 className="w-4 h-4" />
            Remove this account
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
            Remove all {profiles.length > 1 ? `${profiles.length} accounts` : "accounts"}
          </Button>
        </CardContent>
      </Card>
    </SettingsPage>
  );
};

export default AccountPage;
