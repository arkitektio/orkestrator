import { LoadingPage } from "@/app/components/fallbacks/LoadingPage";
import { Sidebars } from "@/components/layout/Sidebars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import { Separator } from "@/components/ui/separator";
import { DragZone } from "@/components/upload/drag";
import { useLokUpload } from "@/datalayer/hooks/useLokUpload";
import { useResolve } from "@/datalayer/hooks/useResolve";
import { LokUser } from "@/linkers";
import { useRef } from "react";
import { useMeQuery, useUpdateUserProfileMutation } from "../api/graphql";

// (legacy) export type removed – not used

const Page = () => {
  const { data } = useMeQuery();

  if (!data) {
    return <LoadingPage />;
  }

  const uploadFile = useLokUpload();

  const resolve = useResolve();
  const [update] = useUpdateUserProfileMutation();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const createFile = async (_file: File, key: string) => {
    update({
      variables: {
        input: {
          id: data?.me.profile.id,
          avatar: key,
          name: data?.me.username,
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
    <LokUser.ModelPage
      object={data.me}
      actions={<LokUser.Actions object={data.me} />}
      pageActions={<LokUser.ObjectButton alwaysShow object={data.me} />}
      title={data?.me?.username}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <LokUser.Knowledge object={data.me} />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      {/* Profile Hero Section */}
      <div className="relative mb-10">
        <div className="h-32 w-full bg-gradient-to-r from-chart-5/15 via-chart-3/15 to-chart-1/15 dark:from-chart-5/10 dark:via-chart-3/10 dark:to-chart-1/10 border-b border-border/40" />
        <div className="pl-6 pr-6 -mt-14 flex flex-row gap-6 items-end max-w-3xl">
          <div className="relative group w-36 h-36 cursor-pointer" onClick={openFileDialog} role="button" aria-label="Change avatar" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFileDialog(); } }}>
            <div className="w-36 h-36 rounded-full ring-4 ring-background shadow-xl overflow-hidden bg-muted flex items-center justify-center text-4xl font-semibold select-none">
              {data.me.profile.avatar ? (
                <Image
                  src={resolve(data?.me?.profile?.avatar.presignedUrl)}
                  className="object-cover w-full h-full"
                />
              ) : (
                data.me.username[0]
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
              {data.me.username}
            </h1>
            {(data.me.firstName || data.me.lastName) && (
              <p className="text-base font-medium">
                {[data.me.firstName, data.me.lastName].filter(Boolean).join(" ")}
              </p>
            )}
            {data.me.profile?.name && data.me.profile.name !== data.me.username && (
              <p className="text-sm text-muted-foreground">Display name: {data.me.profile.name}</p>
            )}
            {data.me.email && (
              <p className="text-sm"><span className="text-muted-foreground">Email:</span> {data.me.email}</p>
            )}
            <p className="text-xs text-muted-foreground font-mono">User ID: {data.me.id}</p>
            {data.me.profile?.bio && (
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line border-l pl-3 border-border/40">
                {data.me.profile.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="pl-6 pr-6 space-y-8 max-w-3xl">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Username</p>
              <p className="font-medium">{data.me.username}</p>
            </div>
            {data.me.email && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                <p className="font-medium break-all">{data.me.email}</p>
              </div>
            )}
            {data.me.firstName && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">First Name</p>
                <p className="font-medium">{data.me.firstName}</p>
              </div>
            )}
            {data.me.lastName && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Last Name</p>
                <p className="font-medium">{data.me.lastName}</p>
              </div>
            )}
            {data.me.profile?.name && (
              <div className="md:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Display Name</p>
                <p className="font-medium">{data.me.profile.name}</p>
              </div>
            )}
            {data.me.profile?.bio && (
              <div className="md:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Bio</p>
                <p className="text-sm leading-relaxed whitespace-pre-line">{data.me.profile.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>


        {(data.me.memberships?.length || 0) > 0 && (
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>Memberships</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {data.me.memberships?.map(m => (
                <div key={m.id} className="space-y-1">
                  <p className="font-medium">{m.organization.name} <span className="text-muted-foreground font-normal">({m.organization.slug})</span></p>
                  {m.roles?.length ? (
                    <p className="text-muted-foreground">Roles: {m.roles.map(r => r.identifier).join(', ')}</p>
                  ) : (
                    <p className="text-muted-foreground italic">No roles</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Meta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <div className="grid gap-1">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Profile ID</span>
              <span className="font-mono text-xs">{data.me.profile.id}</span>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">Avatar can be changed by dragging a file onto the portrait above.</p>
          </CardContent>
        </Card>
      </div>
    </LokUser.ModelPage>
  );
}

export default Page;
