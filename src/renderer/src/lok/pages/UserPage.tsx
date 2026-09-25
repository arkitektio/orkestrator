import { PROFILE_SECTIONS } from "@/core/connection/profile/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { useLokResolve } from "@/core/datalayer/hooks/useResolve";
import { LokUser } from "@/core/linkers";
import { ProfileSections } from "@/core/connection/profile/ProfileSections";
import {
  useMyContextQuery,
  useUpdateUserProfileMutation,
  useUserQuery,
} from "../api/graphql";
import { BannerHeader, BrandBanner, EditablePortrait, Portrait } from "../components/BrandBanner";
import { useLokImageUpload } from "../hooks/useLokImageUpload";

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-0.5">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <div className="text-sm break-all">{children}</div>
  </div>
);

/**
 * A member's profile. The banner says who they are here, in their own colour
 * for this organization; the column below is their work as the modules see it
 * — each module plugs a section in through `app/profilesections.ts`.
 *
 * Everything is about THIS organization: a profile acts in exactly one, so the
 * member's other memberships are none of this page's business.
 */
const Page = asDetailQueryRoute(useUserQuery, ({ data }) => {
  const resolve = useLokResolve();
  const [update] = useUpdateUserProfileMutation();
  const { data: context } = useMyContextQuery();

  const user = data.user;
  const organization = context?.mycontext.organization;
  // Only your own portrait is yours to change.
  const isMe = context?.mycontext.user.id === user.id;
  const membership = user.memberships.find((m) => m.organization.id === organization?.id);
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  const avatarUpload = useLokImageUpload((key) =>
    update({
      variables: {
        input: {
          id: user.profile.id,
          avatar: key,
          // Required alongside the avatar; keep the name they already have.
          name: user.profile.name || user.username,
        },
      },
    }),
  );

  const avatar = user.profile.avatar?.presignedUrl
    ? resolve(user.profile.avatar.presignedUrl)
    : undefined;

  return (
    <LokUser.ModelPage
      object={user}
      actions={<LokUser.Actions object={user} />}
      pageActions={<LokUser.ObjectButton alwaysShow object={user} />}
      title={user.username}
      additionalSidebars={[
        <Sidebars.Tab key="about" label="About">
          <div className="flex flex-col gap-4 p-4">
            <Fact label="Username">{user.username}</Fact>
            {fullName && <Fact label="Name">{fullName}</Fact>}
            {user.profile.name && user.profile.name !== user.username && (
              <Fact label="Display name">{user.profile.name}</Fact>
            )}
            {user.email && <Fact label="Email">{user.email}</Fact>}
            <Fact label="User ID">
              <span className="font-mono text-xs">{user.id}</span>
            </Fact>
            {isMe && (
              <p className="text-xs text-muted-foreground">
                Drop an image on your portrait to change it.
              </p>
            )}
          </div>
        </Sidebars.Tab>,
        <Sidebars.Tab key="knowledge" label="Knowledge">
          {/* The host's Knowledge surface: kraph fills it, behind its own guard. */}
          <LokUser.Knowledge object={user} />
        </Sidebars.Tab>,
      ]}
    >
      <BannerHeader
        banner={
          // Their colour here, falling back to the organization's.
          <BrandBanner
            hue={membership?.brandHue ?? membership?.organization.brandHue}
            chroma={membership?.brandChroma ?? membership?.organization.brandChroma}
          />
        }
        portrait={
          isMe ? (
            <EditablePortrait
              src={avatar}
              fallback={user.username}
              upload={avatarUpload}
              label="Change your avatar"
            />
          ) : (
            <Portrait src={avatar} fallback={user.username} />
          )
        }
        title={
          <>
            {user.username}
            {isMe && <span className="ml-2 text-base font-normal text-muted-foreground">you</span>}
          </>
        }
      >
        {fullName && <p className="text-sm font-medium">{fullName}</p>}
        {organization && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {membership ? (
              <>
                <span>{organization.name}</span>
                {membership.roles.map((role) => (
                  <span
                    key={role.id}
                    className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 font-medium text-primary"
                  >
                    {role.identifier}
                  </span>
                ))}
              </>
            ) : (
              <span>Not a member of {organization.name}</span>
            )}
          </div>
        )}
      </BannerHeader>

      <div className="flex max-w-4xl flex-col gap-8 px-6 pb-10">
        {user.profile.bio && (
          <p className="whitespace-pre-line border-l-2 border-primary/30 pl-3 text-sm leading-relaxed text-muted-foreground">
            {user.profile.bio}
          </p>
        )}
        <ProfileSections ctx={{ sub: user.id, isMe }} registry={PROFILE_SECTIONS} />
      </div>
    </LokUser.ModelPage>
  );
});

export default Page;
