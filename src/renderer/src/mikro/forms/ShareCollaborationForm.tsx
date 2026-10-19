import { useServiceInstanceId } from "@/core/connection/arkitekt/host";
import { useOperation } from "@/core/modules/hooks/useOperation";
import { toast } from "@/core/notify";
import type { JSONObject } from "@/core/types";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/ui/select";
import { Switch } from "@/core/ui/switch";
import { Copy, Link2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useGetCollaborationQuery } from "../api/graphql";

export type ShareCollaborationFormProps = { collaboration: string };

/** A link lok made for a collaboration, as `lok.collaborationLinks` answers it. */
type Link = {
  id: string;
  inviteUrl: string;
  roles: string[];
  expiresAt?: string | null;
  uses: number;
  maxUses?: number | null;
  mesh: boolean;
  valid: boolean;
};

/** What a guest may do in the collaboration: the roles lok grants them, holding only inside it. */
const ACCESS = {
  view: { label: "Can view", roles: [] as string[] },
  annotate: { label: "Can view and annotate", roles: ["editor"] },
} as const;

const EXPIRY = { "7": "In 7 days", "30": "In 30 days", never: "Never" } as const;

const copy = (url: string) =>
  navigator.clipboard
    .writeText(url)
    .then(() => toast.success("Link copied"))
    .catch(() => toast.error("Could not copy the link"));

/**
 * Share a collaboration by link: lok makes an invite that grants it to whoever opens the link
 * and signs in (or signs up), with the roles chosen here, and nothing else of the organization.
 * The links made so far are listed with what they grant, and can be revoked: revoking also
 * takes the collaboration back from whoever accepted it.
 */
export const ShareCollaborationForm = ({ collaboration }: ShareCollaborationFormProps) => {
  const instance = useServiceInstanceId("mikro");
  const { data } = useGetCollaborationQuery({ variables: { id: collaboration } });
  const share = useOperation<Link>("lok.shareCollaboration");
  const listLinks = useOperation<Link[]>("lok.collaborationLinks");
  const revoke = useOperation("lok.revokeLink");

  const [access, setAccess] = useState<keyof typeof ACCESS>("view");
  const [expiry, setExpiry] = useState<keyof typeof EXPIRY>("30");
  const [maxUses, setMaxUses] = useState("");
  const [mesh, setMesh] = useState(true);
  const [links, setLinks] = useState<Link[]>();
  const [pending, setPending] = useState(false);

  const refresh = useCallback(() => {
    if (!instance) return;
    listLinks({ instance, collaboration })
      .then(setLinks)
      .catch((e: Error) => toast.error("Could not list the links: " + e.message));
  }, [instance, collaboration, listLinks]);

  useEffect(refresh, [refresh]);

  const create = async () => {
    if (!instance) return;
    setPending(true);
    try {
      const args: JSONObject = {
        instance,
        collaboration,
        roles: [...ACCESS[access].roles],
        expiresInDays: expiry === "never" ? null : Number(expiry),
        maxUses: maxUses ? Number(maxUses) : null,
        allowMesh: mesh,
      };
      const link = await share(args);
      await copy(link.inviteUrl);
      refresh();
    } catch (e) {
      toast.error("Could not make a link: " + (e as Error).message);
    } finally {
      setPending(false);
    }
  };

  const revokeLink = (link: Link) =>
    revoke({ id: link.id })
      .then(() => {
        toast.success("Link revoked, and the collaboration taken back from whoever accepted it");
        refresh();
      })
      .catch((e: Error) => toast.error("Could not revoke: " + e.message));

  if (!instance) {
    return <div className="text-sm text-muted-foreground">mikro is not connected: there is nothing to share yet.</div>;
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Share {data?.collaboration.name ?? "collaboration"}</DialogTitle>
        <DialogDescription>
          Whoever opens the link and signs in becomes a guest of your organization, and sees only what is in
          this collaboration.
        </DialogDescription>
      </DialogHeader>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label>Access</Label>
          <Select value={access} onValueChange={(value) => setAccess(value as keyof typeof ACCESS)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ACCESS).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Expires</Label>
          <Select value={expiry} onValueChange={(value) => setExpiry(value as keyof typeof EXPIRY)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EXPIRY).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Uses</Label>
          <Input type="number" min={1} placeholder="Unlimited" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <Switch id="share-mesh" checked={mesh} onCheckedChange={setMesh} />
          <Label htmlFor="share-mesh" title="Lets the guest's apps reach this hub over the organization's mesh">
            Connect over the mesh
          </Label>
        </div>
      </div>
      <Button className="mt-3 w-full gap-2" disabled={pending} onClick={() => void create()}>
        <Link2 className="h-4 w-4" />
        Create and copy link
      </Button>
      <div className="mt-4 flex flex-col gap-2">
        <div className="text-sm font-medium">Links</div>
        {links === undefined && <div className="text-sm text-muted-foreground">Loading…</div>}
        {links?.length === 0 && <div className="text-sm text-muted-foreground">No links yet.</div>}
        {links?.map((link) => (
          <div key={link.id} className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm">
            <Badge variant={link.valid ? "outline" : "secondary"}>{link.roles.length ? "annotate" : "view"}</Badge>
            <span className="truncate text-muted-foreground">
              {link.uses}
              {link.maxUses ? `/${link.maxUses}` : ""} used
              {link.expiresAt ? ` · until ${new Date(link.expiresAt).toLocaleDateString()}` : ""}
              {link.valid ? "" : " · no longer valid"}
            </span>
            <Button size="sm" variant="ghost" className="ml-auto" title="Copy link" onClick={() => void copy(link.inviteUrl)}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" title="Revoke" onClick={() => void revokeLink(link)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </>
  );
};
