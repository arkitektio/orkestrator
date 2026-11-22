import { PROFILE_SECTIONS } from "@/core/connection/profile/registry";
import { LOK_HELP } from "../help";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { HomeSectionHeading, ModuleHome } from "@/core/layout/ModuleHome";
import { useLokResolve } from "@/core/datalayer/hooks/useResolve";
import { LokUser } from "@/core/linkers";
import { ProfileFeed } from "@/core/connection/profile/ProfileFeed";
import { ProfileSections } from "@/core/connection/profile/ProfileSections";
import {
  UserQuery,
  useMyContextQuery,
  useUpdateUserProfileMutation,
  useUserQuery,
} from "../api/graphql";
import { EditablePortrait, Portrait } from "../components/BrandBanner";
import { useLokImageUpload } from "../hooks/useLokImageUpload";

/** The sidebar's tab with who they are; opened first. */
const PROFILE_TAB = "Profile";

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-0.5">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <div className="text-sm break-all">{children}</div>
  </div>
);

type User = UserQuery["user"];

/**
 * Their portrait, sized for the header's tile. Yours can be replaced: click it,
 * or drop an image on it.
 */
const MemberPortrait = ({ user, isMe }: { user: User; isMe: boolean }) => {
  const resolve = useLokResolve();
  const [update] = useUpdateUserProfileMutation();
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
  const avatar = user.profile.avatar?.presignedUrl ? resolve(user.profile.avatar.presignedUrl) : undefined;
  const shape = "h-11 w-11 rounded-xl text-base shadow-none ring-0";
  return isMe ? (
    <EditablePortrait src={avatar} fallback={user.username} upload={avatarUpload} label="Change your avatar" shapeClassName={shape} />
  ) : (
    <Portrait src={avatar} fallback={user.username} className={shape} />
  );
};

/**
 * Who they are, for the sidebar: their bio, their roles here, their names and
 * how to reach them; then what the modules keep on them that is not a dated item of the feed
 * (agents, neuron models, your own auto list) — each module's
 * `profileSections`, compact rows.
 */
const ProfileSidebar = ({
  user,
  isMe,
  organization,
}: {
  user: User;
  isMe: boolean;
  organization?: { id: string; name: string };
}) => {
  // lok lists only their membership in the active organization.
  const membership = user.memberships[0];
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-6 p-4">
      {user.profile.bio && (
        <p className="whitespace-pre-line border-l-2 border-primary/30 pl-3 text-sm leading-relaxed text-muted-foreground">
          {user.profile.bio}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {organization && (
          <Fact label={organization.name}>
            {membership ? (
              membership.roles.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {membership.roles.map((role) => (
                    <span
                      key={role.id}
                      className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                    >
                      {role.identifier}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">Member, no roles</span>
              )
            ) : (
              <span className="text-muted-foreground">Not a member</span>
            )}
          </Fact>
        )}
        <Fact label="Username">{user.username}</Fact>
        {fullName && <Fact label="Name">{fullName}</Fact>}
        {user.profile.name && user.profile.name !== user.username && (
          <Fact label="Display name">{user.profile.name}</Fact>
        )}
        {user.email && <Fact label="Email">{user.email}</Fact>}
        <Fact label="User ID">
          <span className="font-mono text-xs">{user.id}</span>
        </Fact>
      </div>

      <ProfileSections ctx={{ sub: user.id, isMe }} registry={PROFILE_SECTIONS} />
    </div>
  );
};

/**
 * The header's line: their full name, then the organization they are in. Their
 * roles are the sidebar's, not the header's.
 */
const describeMember = (user: User, organization?: { id: string; name: string }): string => {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  // lok lists only their membership in the active organization.
  const member = user.memberships.length > 0;
  const here = organization && (member ? organization.name : `Not a member of ${organization.name}`);
  return [fullName, here].filter(Boolean).join(" · ");
};

/**
 * A member's profile: what they made, across every service, newest first —
 * one search field and a toggle per kind over one grid (`ProfileFeed`, each
 * module's `profileFeed` sources), under a header like a module home's: their
 * portrait as the tile, their name, one line on who they are here. The rest
 * of who they are sits in the sidebar's Profile tab, opened first.
 *
 * Everything is about THIS organization: a profile acts in exactly one, so the
 * member's other memberships are none of this page's business.
 */
const Page = asDetailQueryRoute(useUserQuery, ({ data }) => {
  const { data: context } = useMyContextQuery();

  const user = data.user;
  const organization = context?.mycontext.organization;
  const isMe = context?.mycontext.user.id === user.id;

  return (
    <LokUser.ModelPage
      help={LOK_HELP.user}
      object={user}
      actions={<LokUser.Actions object={user} />}
      pageActions={<LokUser.ObjectButton alwaysShow object={user} />}
      title={user.username}
      // Its own remembered tab: the profile opens on who they are, whatever
      // tab another model page was left on.
      sidebarKey="LokUserProfile"
      defaultSidebar={PROFILE_TAB}
      additionalSidebars={[
        <Sidebars.Tab key="profile" label={PROFILE_TAB}>
          <ProfileSidebar user={user} isMe={isMe} organization={organization} />
        </Sidebars.Tab>,
        <Sidebars.Tab key="knowledge" label="Knowledge">
          {/* The host's Knowledge surface: kraph fills it, behind its own guard. */}
          <LokUser.Knowledge object={user} />
        </Sidebars.Tab>,
      ]}
    >
      <ModuleHome
        moduleKey="lok"
        pages={false}
        title={
          <span className="flex items-baseline gap-2">
            {user.username}
            {isMe && <span className="text-sm font-normal text-muted-foreground">you</span>}
          </span>
        }
        description={describeMember(user, organization)}
        icon={<MemberPortrait user={user} isMe={isMe} />}
      >
        <section>
          <HomeSectionHeading>{isMe ? "Your work" : "Their work"}</HomeSectionHeading>
          <ProfileFeed sub={user.id} name={isMe ? "you" : user.username} />
        </section>
      </ModuleHome>
    </LokUser.ModelPage>
  );
});

export default Page;
