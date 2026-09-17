import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import { Separator } from "@/components/ui/separator";
import { DragZone } from "@/components/upload/drag";
import { useLokUpload } from "@/datalayer/hooks/useLokUpload";
import { useResolve } from "@/datalayer/hooks/useResolve";
import { LokOrganization, LokUser } from "@/linkers";
import { useRef } from "react";
import { useUpdateUserProfileMutation, useUserQuery } from "../api/graphql";

// (legacy) export type removed – not used

const Page = asDetailQueryRoute(useUserQuery, ({ data }) => {
  const uploadFile = useLokUpload();

  const resolve = useResolve();
  const [update] = useUpdateUserProfileMutation();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const createFile = async (_file: File, key: string) => {
    update({
      variables: {
        input: {
          id: data.user.profile.id,
          avatar: key,
          name: data.user.username,
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
      object={data.user}
      pageActions={<LokUser.ObjectButton object={data.user} />}
      title={data?.user?.username}
    >
      {/* Profile Hero Section */}
      <div className="relative mb-10">
        <div className="h-32 w-full bg-gradient-to-r from-chart-5/15 via-chart-3/15 to-chart-1/15 dark:from-chart-5/10 dark:via-chart-3/10 dark:to-chart-1/10 border-b border-border/40" />
        <div className="pl-6 pr-6 -mt-14 flex flex-row gap-6 items-end max-w-3xl">
          <div className="relative group w-36 h-36 cursor-pointer" onClick={openFileDialog} role="button" aria-label="Change avatar" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFileDialog(); } }}>
            <div className="w-36 h-36 rounded-full ring-4 ring-background shadow-xl overflow-hidden bg-muted flex items-center justify-center text-4xl font-semibold select-none">
              {data.user.profile.avatar ? (
                <Image
                  src={resolve(data?.user?.profile?.avatar.presignedUrl)}
                  className="object-cover w-full h-full"
                />
              ) : (
                data.user.username[0]
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
              {data.user.username}
            </h1>
            {(data.user.firstName || data.user.lastName) && (
              <p className="text-base font-medium">
                {[data.user.firstName, data.user.lastName].filter(Boolean).join(" ")}
              </p>
            )}
            {data.user.profile?.name && data.user.profile.name !== data.user.username && (
              <p className="text-sm text-muted-foreground">Display name: {data.user.profile.name}</p>
            )}
            {data.user.email && (
              <p className="text-sm"><span className="text-muted-foreground">Email:</span> {data.user.email}</p>
            )}
            <p className="text-xs text-muted-foreground font-mono">User ID: {data.user.id}</p>
            {data.user.profile?.bio && (
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line border-l pl-3 border-border/40">
                {data.user.profile.bio}
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
              <p className="font-medium">{data.user.username}</p>
            </div>
            {data.user.email && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                <p className="font-medium break-all">{data.user.email}</p>
              </div>
            )}
            {data.user.firstName && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">First Name</p>
                <p className="font-medium">{data.user.firstName}</p>
              </div>
            )}
            {data.user.lastName && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Last Name</p>
                <p className="font-medium">{data.user.lastName}</p>
              </div>
            )}
            {data.user.profile?.name && (
              <div className="md:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Display Name</p>
                <p className="font-medium">{data.user.profile.name}</p>
              </div>
            )}
            {data.user.profile?.bio && (
              <div className="md:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Bio</p>
                <p className="text-sm leading-relaxed whitespace-pre-line">{data.user.profile.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>


        {(data.user.memberships?.length || 0) > 0 && (
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>Memberships</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {data.user.memberships?.map(m => (
                <div key={m.id} className="space-y-1">
                  <LokOrganization.DetailLink object={m.organization}>
                    <p className="font-medium">{m.organization.name} <span className="text-muted-foreground font-normal">({m.organization.slug})</span></p>
                  </LokOrganization.DetailLink>
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
              <span className="font-mono text-xs">{data.user.profile.id}</span>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">Avatar can be changed by dragging a file onto the portrait above.</p>
          </CardContent>
        </Card>
      </div>
    </LokUser.ModelPage>
  );
});

export default Page;
