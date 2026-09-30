import { setRoleOverride, useRealRoles, useRoleOverride } from "@/core/connection/roles";
import { Button } from "@/core/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/ui/card";
import { Input } from "@/core/ui/input";
import { Eye } from "lucide-react";
import { useState } from "react";

/**
 * The developer "view as" switch: see the app as someone with other roles,
 * without a second account. Session-only and this window only — a restart is
 * always back on the real roles. It changes what the UI shows, never what
 * the backend allows.
 */
export const ViewAsRolesCard = () => {
  const { roles: real, known } = useRealRoles();
  const override = useRoleOverride();
  const [draft, setDraft] = useState("");

  const active = override ?? real;
  // Real roles first, then any extra ones added to the override.
  const offered = [...real, ...(override ?? []).filter((role) => !real.includes(role))];

  const toggle = (role: string) =>
    setRoleOverride(active.includes(role) ? active.filter((r) => r !== role) : [...active, role]);

  const add = () => {
    const role = draft.trim();
    if (!role) return;
    if (!active.includes(role)) setRoleOverride([...active, role]);
    setDraft("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          View as roles
        </CardTitle>
        <CardDescription>
          Hide or show what role-gated pages, actions and dialogs would for someone with these roles. Only this
          window, until restart; the server still decides what you may do.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!known && !override ? (
          <div className="text-sm text-muted-foreground">Your roles are not known yet.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {offered.map((role) => (
              <Button
                key={role}
                size="sm"
                variant={active.includes(role) ? "default" : "outline"}
                onClick={() => toggle(role)}
              >
                {role}
              </Button>
            ))}
            {offered.length === 0 && <span className="text-sm text-muted-foreground">You have no roles.</span>}
          </div>
        )}
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a role to try"
            className="h-8 max-w-xs"
          />
          <Button size="sm" variant="outline" type="submit" disabled={!draft.trim()}>
            Add
          </Button>
          <Button size="sm" variant="ghost" type="button" disabled={!override} onClick={() => setRoleOverride(null)}>
            Back to my roles
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ViewAsRolesCard;
