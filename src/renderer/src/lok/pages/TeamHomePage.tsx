import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { LoadingPage } from "@/core/layout/fallbacks/LoadingPage";
import { LOK_HELP } from "../help";
import { PageLayout } from "@/core/layout/PageLayout";
import { Sidebars } from "@/core/layout/Sidebars";
import { HelpSidebar } from "@/core/layout/help";
import { HomeSectionHeading, ModuleHome, ModulePageList } from "@/core/layout/ModuleHome";
import { PageAction } from "@/core/ui/page-action";
import { Button } from "@/core/ui/button";
import { CARD_FRAME_GRID } from "@/core/ui/card-frame";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/core/ui/empty";
import { FilterClear, FilterPicker, FilterSearchField } from "@/core/ui/filter-bar";
import Timestamp from "@/core/ui/timestamp";
import { useLokResolve } from "@/core/datalayer/hooks/useResolve";
import { useMemo, useState } from "react";
import { ADMIN_ROLE, useHasRoles } from "@/core/connection/roles";
import { useDialog } from "@/core/dialogs/registry";
import { useCopyToClipboard } from "@/core/ui/copy-button";
import { reportErrorAs } from "@/core/notify";
import { Check, Copy, Link2, ShieldCheck, UserPlus, Users } from "lucide-react";
import {
  MembershipRequestFragment,
  OrganizationFragment,
  useCancelInviteMutation,
  useMembershipRequestsQuery,
  useMyContextQuery,
  useOrganizationQuery,
  useUpdateOrganizationMutation,
} from "../api/graphql";
import { EditablePortrait } from "../components/BrandBanner";
import { useLokImageUpload } from "../hooks/useLokImageUpload";
import MemberCard from "../components/cards/MemberCard";
import { CreateInviteDialog } from "../dialogs/CreateInviteDialog";
import { groupMembersByRole, orderRoles } from "../lib/teamRoles";

type Invite = OrganizationFragment["invites"][number];

/** An invite's link; a click copies it and the icon flips to a check. */
const InviteLink = ({ url }: { url: string }) => {
  const { copy, copied } = useCopyToClipboard();
  const Icon = copied ? Check : Copy;
  return (
    <button
      type="button"
      title={copied ? "Copied" : "Copy invite link"}
      onClick={() => void copy(url)}
      className="flex w-full min-w-0 items-center gap-2 rounded bg-background/60 px-2 py-1 text-left font-mono transition-colors hover:bg-background"
    >
      <span className="min-w-0 flex-1 truncate">{url}</span>
      <Icon className="size-3 shrink-0 text-muted-foreground" />
    </button>
  );
};

/** Every invite the organization made, accepted ones included: the sidebar's history. */
const InviteHistory = ({ invites }: { invites: Invite[] }) => {
  if (invites.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">No invites yet.</p>;
  }
  return (
    <div className="flex flex-col divide-y divide-border/40 p-2">
      {invites.map((invite) => (
        <div key={invite.token} className="space-y-1 px-2 py-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium uppercase tracking-wide text-muted-foreground">
              {invite.status}
            </span>
            {invite.acceptedBy && (
              <span className="text-muted-foreground">
                by <span className="text-foreground">{invite.acceptedBy.username}</span>
              </span>
            )}
          </div>
          <InviteLink url={invite.inviteUrl} />
        </div>
      ))}
    </div>
  );
};

/** One open request to join: who, why, when. A click answers it. */
const RequestRow = ({ request }: { request: MembershipRequestFragment }) => {
  const { openDialog } = useDialog();
  return (
    <button
      type="button"
      title="Answer this request"
      onClick={() =>
        openDialog(
          "answermembershiprequest",
          { id: request.id, username: request.user.username, reason: request.reason },
          { size: "small" },
        )
      }
      className="flex items-start gap-2 rounded-lg bg-muted/50 p-2 text-left transition-colors hover:bg-muted"
    >
      <UserPlus className="mt-0.5 size-3.5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2 text-xs">
          <span>
            <span className="font-medium">{request.user.username}</span> asks to join
          </span>
          <span className="shrink-0 text-muted-foreground">
            <Timestamp date={request.createdAt} relative />
          </span>
        </p>
        {request.reason && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{request.reason}</p>
        )}
      </div>
    </button>
  );
};

/** One open invite: the roles it grants, until when, its link, and a way to take it back. */
const InviteRow = ({ invite }: { invite: Invite }) => {
  const [cancel, { loading }] = useCancelInviteMutation();
  const roles = invite.roles.map((role) => role.identifier).join(" · ");
  return (
    <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2">
      <Link2 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 space-y-1.5 text-xs">
        <p className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate">
            <span className="font-medium">Open invite</span>
            {roles && <span className="text-muted-foreground"> · {roles}</span>}
          </span>
          <span className="shrink-0 text-muted-foreground">
            {invite.expiresAt ? (
              <>
                expires <Timestamp date={invite.expiresAt} relative />
              </>
            ) : (
              <>
                made <Timestamp date={invite.createdAt} relative />
              </>
            )}
          </span>
        </p>
        <div className="flex items-center gap-1">
          <InviteLink url={invite.inviteUrl} />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 shrink-0 px-2 text-xs text-muted-foreground"
            disabled={loading}
            onClick={() =>
              void cancel({ variables: { id: invite.id } }).catch(reportErrorAs("Couldn't cancel the invite"))
            }
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * What waits on an admin: people asking to join, then invites nobody took yet.
 * Nothing waiting draws nothing.
 */
const NeedsYou = ({ requests, invites }: { requests: MembershipRequestFragment[]; invites: Invite[] }) => {
  if (requests.length === 0 && invites.length === 0) return null;
  return (
    <section>
      <HomeSectionHeading>Needs you</HomeSectionHeading>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-2">
        {requests.map((request) => (
          <RequestRow key={request.id} request={request} />
        ))}
        {invites.map((invite) => (
          <InviteRow key={invite.token} invite={invite} />
        ))}
      </div>
    </section>
  );
};

/** The role a group is about: its name, how many hold it here, what it lets them do. */
const RoleHeading = ({
  role,
  count,
}: {
  role: OrganizationFragment["roles"][number] | null;
  count: number;
}) => (
  <div className="mb-2 flex min-w-0 items-baseline gap-2 px-0.5">
    <h3 className="flex shrink-0 items-center gap-1.5 text-sm font-medium">
      {role?.isAdminRole && <ShieldCheck className="size-3.5 self-center text-primary" />}
      {role?.identifier ?? "No role"}
    </h3>
    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{count}</span>
    {role?.description && (
      <span className="truncate text-xs text-muted-foreground" title={role.description}>
        {role.description}
      </span>
    )}
  </div>
);

/**
 * Team's start page — the organization this profile acts in, which is the
 * only one it has — laid out like the other modules' homes: its name and logo
 * as the header, what waits on an admin first, then its people grouped by
 * what they may do here. Each card opens that member's profile, where the
 * modules show their work.
 */
const TeamHomePage = () => {
  const { data: context } = useMyContextQuery();
  const organizationId = context?.mycontext.organization.id;
  const { data, error, refetch } = useOrganizationQuery({
    variables: { id: organizationId ?? "" },
    skip: !organizationId,
    fetchPolicy: "cache-and-network",
  });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  // Inviting, the invites themselves and the requests are for the organization's admins.
  const isAdmin = useHasRoles(ADMIN_ROLE);
  // Asked apart from the organization: a lok without membership requests
  // fails this query alone, and the page just has none to show.
  const { data: requested } = useMembershipRequestsQuery({
    variables: { id: organizationId ?? "" },
    skip: !organizationId || !isAdmin,
    fetchPolicy: "cache-and-network",
    errorPolicy: "ignore",
  });
  const resolve = useLokResolve();
  const [updateOrganization] = useUpdateOrganizationMutation();
  // Lands on `OrganizationProfile.avatar`, the one logo field lok keeps; lok
  // decides who may change it, and the upload hook says so when it refuses.
  const logoUpload = useLokImageUpload((key) =>
    updateOrganization({
      variables: { input: { id: organizationId ?? "", avatar: key } },
    }),
  );

  const organization = data?.organization;
  const me = context?.mycontext.user.id;

  const groups = useMemo(
    () =>
      organization
        ? groupMembersByRole(organization.memberships, organization.roles, {
            me,
            query: search,
            role: roleFilter,
          })
        : [],
    [organization, me, search, roleFilter],
  );
  const roleOptions = useMemo(
    () =>
      orderRoles(organization?.roles ?? []).map((role) => ({ value: role.id, label: role.identifier })),
    [organization],
  );

  if (error && !organization) {
    return <QueryError error={error} onRetry={() => refetch()} resource="organization" id={organizationId} />;
  }
  if (!organization) return <LoadingPage />;

  const memberCount = organization.memberships.length;
  const adminRoles = new Set(organization.roles.filter((role) => role.isAdminRole).map((role) => role.id));
  const adminCount = organization.memberships.filter((m) => m.roles.some((role) => adminRoles.has(role.id))).length;
  const filtering = search.trim() !== "" || roleFilter !== null;
  const clearFilters = () => {
    setSearch("");
    setRoleFilter(null);
  };

  // Answered requests stay on record in lok; only the open ones need someone.
  const openRequests = (requested?.organization?.membershipRequests ?? []).filter(
    (request) => request.status === "pending",
  );
  const openInvites = organization.invites.filter((invite) => !invite.acceptedBy && invite.valid);

  const logo = organization.profile.avatar ?? organization.avatar;
  const about = organization.description || organization.profile.bio;

  return (
    <PageLayout
      help={LOK_HELP.teamHome}
      title={organization.name}
      pageActions={
        isAdmin && (
          <>
            <PageAction alwaysShow icon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
              Invite
            </PageAction>
            {/* Not an action: the dialog the action opens. */}
            <PageAction.Slot collapse="hide">
              <CreateInviteDialog
                open={inviteOpen}
                onOpenChange={setInviteOpen}
                organizationId={organization.id}
                availableRoles={organization.roles}
              />
            </PageAction.Slot>
          </>
        )
      }
      sidebars={
        <Sidebars defaultTab="Overview">
          {/* Team's other pages live here, so the stage is the people. */}
          <Sidebars.Tab label="Overview">
            <ModulePageList moduleKey="lok" className="p-2" />
          </Sidebars.Tab>
          {isAdmin && (
            <Sidebars.Tab label="Invites">
              <InviteHistory invites={organization.invites} />
            </Sidebars.Tab>
          )}
          <Sidebars.Tab label="Help">
            <HelpSidebar />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <ModuleHome
        moduleKey="lok"
        pages={false}
        title={organization.name}
        description={
          <>
            {about || "Your organization: the people in it and what they may do here."}
            <span className="ml-2 font-mono text-xs">{organization.slug}</span>
          </>
        }
        // The organization's own logo in the module's tile; drop an image on it to change it.
        icon={
          <EditablePortrait
            src={logo ? resolve(logo.presignedUrl) : undefined}
            fallback={organization.name}
            upload={logoUpload}
            label="Change the organization's logo"
            shapeClassName="h-11 w-11 rounded-xl text-base shadow-none ring-0"
          />
        }
        lead={isAdmin ? <NeedsYou requests={openRequests} invites={openInvites} /> : undefined}
      >
        <section>
          <HomeSectionHeading className="justify-between">
            <span>People</span>
            <span className="font-normal normal-case tracking-normal">
              <span className="font-semibold text-foreground">{memberCount}</span>{" "}
              {memberCount === 1 ? "member" : "members"}
              {adminCount > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-foreground">{adminCount}</span>{" "}
                  {adminCount === 1 ? "admin" : "admins"}
                </>
              )}
            </span>
          </HomeSectionHeading>
          {/* The filter row belongs to the grid it narrows, not to the page. */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <FilterSearchField value={search} onChange={setSearch} placeholder="Search members…" />
            {roleOptions.length > 0 && (
              <FilterPicker
                icon={ShieldCheck}
                label="Roles"
                value={roleFilter}
                onChange={setRoleFilter}
                defaultLabel="Any role"
                options={roleOptions}
              />
            )}
            {filtering && <FilterClear onClear={clearFilters} />}
          </div>

          {groups.length === 0 ? (
            <Empty className="border py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>{filtering ? "No members match your filters" : "No members yet"}</EmptyTitle>
                <EmptyDescription>
                  {filtering
                    ? "Try a different search or clear the active filters."
                    : "Invite people to bring them into the organization."}
                </EmptyDescription>
              </EmptyHeader>
              {filtering && <FilterClear onClear={clearFilters} />}
            </Empty>
          ) : (
            <div className="flex flex-col gap-6">
              {groups.map((group) => (
                <div key={group.role?.id ?? "none"}>
                  <RoleHeading role={group.role} count={group.members.length} />
                  <div className={CARD_FRAME_GRID}>
                    {group.members.map((membership) => (
                      <MemberCard key={membership.id} membership={membership} isMe={membership.user.id === me} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </ModuleHome>
    </PageLayout>
  );
};

export default TeamHomePage;
