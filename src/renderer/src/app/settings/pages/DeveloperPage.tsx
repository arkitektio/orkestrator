import { Button } from "@/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card";
import { UpdateChecker } from "@/app/settings/components/UpdateChecker";
import { useDebug } from "@/core/providers/debug/DebugContext";
import { Bug } from "lucide-react";
import { SettingsPage } from "../components/SettingsPage";

export const DeveloperPage = () => {
  const { debug, setDebug } = useDebug();

  return (
    <SettingsPage slug="developer">
      <Card>
        <CardHeader>
          <CardTitle>Application updates</CardTitle>
          <CardDescription>Check for and manage application updates.</CardDescription>
        </CardHeader>
        <CardContent>
          <UpdateChecker />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            Developer tools
          </CardTitle>
          <CardDescription>
            Open Chrome DevTools to inspect the application, view console logs, and debug issues.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.api?.openDevTools()}
          >
            <Bug className="w-4 h-4" />
            Open DevTools
          </Button>
          <Button
            variant={debug ? "default" : "outline"}
            className="gap-2"
            onClick={() => setDebug(!debug)}
          >
            <Bug className="w-4 h-4" />
            Debug mode: {debug ? "On" : "Off"}
          </Button>
        </CardContent>
      </Card>
    </SettingsPage>
  );
};

export default DeveloperPage;
