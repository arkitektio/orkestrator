import { reportErrorAs } from "@/core/notify";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/ui/card";
import { CopyButton } from "@/core/ui/copy-button";
import { ErrorNote } from "@/core/ui/error-note";
import { Label } from "@/core/ui/label";
import { Switch } from "@/core/ui/switch";
import { Eye } from "lucide-react";
import { useEffect, useState } from "react";

type McpState = Awaited<ReturnType<Window["api"]["mcp"]["get"]>>;

/** What a person pastes into a terminal to connect Claude Code. */
const claudeCodeCommand = (url: string, token: string) =>
  `claude mcp add --transport http orkestrator ${url} --header "Authorization: Bearer ${token}"`;

/**
 * What goes into the Claude desktop app's `claude_desktop_config.json`: that
 * app only starts local servers as a child process, so it runs the stdio
 * bridge main wrote (`src/main/mcp/bridgeScript`). No token in it: the bridge
 * reads the current one itself.
 */
const claudeDesktopConfig = (desktop: NonNullable<McpState["desktop"]>) =>
  JSON.stringify({ mcpServers: { orkestrator: desktop } }, null, 2);

/**
 * EXPERIMENTAL, and probably not a good idea: the MCP server in main
 * (`src/main/mcp/McpService`). Main owns the switch (the server outlives any
 * window), so like the graphics checks it is read and written over IPC, not a
 * form field. Off by default, unlike the experiments above it.
 *
 * The token is never drawn, only copied: the server can picture this window.
 */
export const McpServerCard = () => {
  const [state, setState] = useState<McpState | null>(null);
  // Where the extension bundle was saved, when no app opened it.
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    window.api?.mcp
      ?.get()
      .then(setState)
      .catch(reportErrorAs("Couldn't read the assistant access setting"));
  }, []);

  // Desktop only: in the web build there is no server to switch on.
  if (!state) return null;

  const { url, token, desktop } = state;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Eye className="h-5 w-5" />
          Let an AI assistant look at this app
          <Badge variant="destructive">Experimental · probably not a good idea</Badge>
        </CardTitle>
        <CardDescription>
          Runs an MCP server on this computer, so an assistant such as Claude or Claude Code can see which
          tabs you have open, take a picture of the window or of the scene in it, and open a page
          for you. It cannot run or change anything. Any program on this computer that has the
          token can do the same, and an assistant reads whatever is on screen, so leave this off
          unless you are trying it out. Mail, bank and location pages are never shown to it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="mcp-enabled">Allow assistants on this computer</Label>
          <Switch
            id="mcp-enabled"
            checked={state.enabled}
            onCheckedChange={(enabled) =>
              window.api.mcp
                .setEnabled(enabled)
                .then(setState)
                .catch(reportErrorAs("Couldn't change assistant access"))
            }
          />
        </div>
        <ErrorNote error={state.error} title="The server is not running" />
        {state.running && url && token && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Listening at <code className="text-foreground">{url}</code>, for this computer only.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {desktop && (
                <Button
                  type="button"
                  size="sm"
                  title="Open this app as an extension in the Claude desktop app"
                  onClick={() =>
                    window.api.mcp
                      .installInClaude()
                      .then((result) => setSavedAt(result.opened ? null : result.path))
                      .catch(reportErrorAs("Couldn't prepare the Claude extension"))
                  }
                >
                  Install in Claude
                </Button>
              )}
              <CopyButton variant="outline" value={claudeCodeCommand(url, token)} title="Copy the command for Claude Code">
                Copy Claude Code command
              </CopyButton>
              {desktop && (
                <CopyButton
                  variant="outline"
                  value={claudeDesktopConfig(desktop)}
                  title="Copy the entry for the Claude desktop app's config"
                >
                  Copy Claude config
                </CopyButton>
              )}
              <CopyButton variant="outline" value={url} title="Copy the address">
                Copy address
              </CopyButton>
              <CopyButton variant="outline" value={token} title="Copy the token">
                Copy token
              </CopyButton>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                title="Assistants connected with the old token stop working"
                onClick={() =>
                  window.api.mcp
                    .rotateToken()
                    .then(setState)
                    .catch(reportErrorAs("Couldn't make a new token"))
                }
              >
                New token
              </Button>
            </div>
            {savedAt && (
              <p className="text-sm text-muted-foreground">
                No app opened the extension. It is saved as{" "}
                <code className="break-all text-foreground">{savedAt}</code>: with the Claude desktop
                app installed, open it from there under Settings → Extensions.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Install in Claude opens the Claude desktop app, which asks before it installs. Claude
              Code: paste the copied command into a terminal. The copied config is for adding the
              server to Claude's config file by hand. It only answers while Orkestrator is running
              with this switched on.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
