import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { PageAction } from "@/components/ui/page-action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import { DragZone } from "@/components/upload/drag";
import { useLokUpload } from "@/datalayer/hooks/useLokUpload";
import { useResolve } from "@/datalayer/hooks/useResolve";
import { LokOrganization, LokUser } from "@/linkers";
import { useRef, useState } from "react";
import { useOrganizationQuery, useUpdateOrganizationMutation } from "../api/graphql";
import { CreateInviteDialog } from "../dialogs/CreateInviteDialog";

// (legacy) export type removed – not used

const Page = asDetailQueryRoute(useOrganizationQuery, ({ data }) => {
  const uploadFile = useLokUpload();
  const [createInviteOpen, setCreateInviteOpen] = useState(false);

  const resolve = useResolve();
  const [update] = useUpdateOrganizationMutation();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const createFile = async (_file: File, key: string) => {
    update({
      variables: {
        input: {
          id: data.organization.id,
          avatar: key,
          name: data.organization.name,
        },
      },
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const key = await uploadFile(file);
    await createFile(file, key);
    // reset value to allow re-upload of same file name
    e.target.value = "";
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <LokOrganization.ModelPage
      object={data.organization}
      pageActions={
        <>
          <LokOrganization.ObjectButton alwaysShow object={data.organization} />
          <PageAction alwaysShow onClick={() => setCreateInviteOpen(true)}>
            Create Invite
          </PageAction>
          {/* Not an action: the dialog the action opens. */}
          <PageAction.Slot collapse="hide">
            <CreateInviteDialog
              open={createInviteOpen}
              onOpenChange={setCreateInviteOpen}
              organizationId={data.organization.id}
              availableRoles={data.organization.roles}
            />
          </PageAction.Slot>
        </>
      }
      title={data?.organization?.name}
    >
      {/* Profile Hero Section */}
      <div className="relative mb-10">
        <div className="h-32 w-full bg-gradient-to-r from-chart-5/15 via-chart-3/15 to-chart-1/15 dark:from-chart-5/10 dark:via-chart-3/10 dark:to-chart-1/10 border-b border-border/40" />
        <div className="pl-6 pr-6 -mt-14 flex flex-row gap-6 items-end max-w-3xl">
          <div className="relative group w-36 h-36 cursor-pointer" onClick={openFileDialog} role="button" aria-label="Change avatar" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFileDialog(); } }}>
            <div className="w-36 h-36 rounded-full ring-4 ring-background shadow-xl overflow-hidden bg-muted flex items-center justify-center text-4xl font-semibold select-none">
              {data.organization.avatar ? (
                <Image
                  src={resolve(data?.organization?.avatar.presignedUrl)}
                  className="object-cover w-full h-full"
                />
              ) : (
                data.organization.name[0]
              )}
            </div>
            {/* Drag & Upload overlay */}
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 flex items-center justify-center text-xs text-white font-medium">
              Change
            </div>
            <div className="absolute inset-0 rounded-full overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
              <DragZone uploadFile={uploadFile} createFile={createFile} />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
          <div className="flex-1 pb-2 space-y-2 max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight">
              {data.organization.name}
            </h1>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="pl-6 pr-6 space-y-6 max-w-4xl pb-10">

        {/* Memberships Section */}
        {(data.organization.memberships?.length || 0) > 0 && (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Team Members</CardTitle>
              <CardDescription>
                {data.organization.memberships.length} {data.organization.memberships.length === 1 ? 'member' : 'members'} in this organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {data.organization.memberships?.map(m => (
                <div
                  key={m.id}
                  className="flex items-start gap-3 py-3 px-3 rounded-md hover:bg-muted/50 transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5 ring-1 ring-primary/10">
                    {m.user.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <LokUser.DetailLink object={m.user}>
                      <p className="font-medium hover:text-primary transition-colors">
                        {m.user.username}
                        <span className="text-muted-foreground font-normal text-xs ml-2">
                          #{m.user.id}
                        </span>
                      </p>
                    </LokUser.DetailLink>
                    {m.roles?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {m.roles.map(r => (
                          <span
                            key={r.identifier}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                          >
                            {r.identifier}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No roles assigned</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Invites Section */}
        {(data.organization.invites?.length || 0) > 0 && (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Active Invites</CardTitle>
              <CardDescription>
                Manage invitation links for new members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.organization.invites?.map(i => (
                <div
                  key={i.token}
                  className="py-3 px-4 rounded-md bg-muted/30 border border-border/50 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Invite URL
                      </p>
                      <p className="text-sm font-mono bg-background px-2 py-1.5 rounded border text-foreground break-all">
                        {i.inviteUrl}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 flex-shrink-0">
                      {i.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-border/30">
                    <p className="text-xs text-muted-foreground">
                      Token: <span className="font-mono">{i.token}</span>
                    </p>
                    {i.acceptedBy && (
                      <p className="text-xs text-muted-foreground">
                        Accepted by <span className="font-medium text-foreground">{i.acceptedBy.username}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

      </div>
    </LokOrganization.ModelPage>
  );
});

export default Page;
