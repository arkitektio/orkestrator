import { UpdateChecker } from "@/app/settings/components/UpdateChecker";
import { Card, CardContent } from "@/core/ui/card";
import { SettingsPage } from "../components/SettingsPage";

/** Which version runs here, and the next one: check, download, the update channel. */
export const UpdatesPage = () => (
  <SettingsPage slug="updates">
    <Card>
      <CardContent>
        <UpdateChecker />
      </CardContent>
    </Card>
  </SettingsPage>
);

export default UpdatesPage;
