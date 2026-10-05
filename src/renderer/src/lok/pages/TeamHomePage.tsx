import { LoadingPage } from "@/core/layout/fallbacks/LoadingPage";
import { LOK_HELP } from "../help";
import { PageLayout } from "@/core/layout/PageLayout";
import { Sidebars } from "@/core/layout/Sidebars";
import { HelpSidebar } from "@/core/layout/help";
import { PageAction } from "@/core/ui/page-action";
import { useLokResolve } from "@/core/datalayer/hooks/useResolve";
import { useState } from "react";
import { ADMIN_ROLE, useHasRoles } from "@/core/connection/roles";
import { toast } from "@/core/notify";
import { useDialog } from "@/core/dialogs/registry";
import {
  MembershipRequestFragment,
  OrganizationFragment,
  useMembershipRequestsQuery,
  useMyContextQuery,
  useOrganizationQuery,
  useUpdateOrganizationMutation,
} from "../api/graphql";
import { BannerHeader, BrandBanner, EditablePortrait } from "../components/BrandBanner";
import { useLokImageUpload } from "../hooks/useLokImageUpload";
import MemberCard from "../components/cards/MemberCard";
import { CreateInviteDialog } from "../dialogs/CreateInviteDialog";
import { HomePageStatisticsSidebar } from "../sidebars/HomePageStatisticsSidebar";

/** The organization's invites, compact: status, link, who took it. */
const Invites = ({ invites }: { invites: OrganizationFragment["invites"] }) => {
  if (invites.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">No open invites.</p>;
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
          <button
            type="button"
            title="Copy invite link"
            onClick={() =>
              navigator.clipboard
                .writeText(invite.inviteUrl)
                .then(() => toast.success("Invite link copied"))
            }
            className="block w-full truncate rounded bg-muted/50 px-2 py-1 text-left font-mono transition-colors hover:bg-muted"
          >
            {invite.inviteUrl}
          </button>
        </div>
      ))}
    </div>
  );
};

/** People outside the organization who asked to join; click one to answer. */
const Requests = ({ requests }: { requests: MembershipRequestFragment[] }) => {
  const { openDialog } = useDialog();
  if (requests.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">No open requests.</p>;
  }
  return (
    <div className="flex flex-col divide-y divide-border/40 p-2">
      {requests.map((request) => (
        <button
          key={request.id}
          type="button"
          title="Answer this request"
          onClick={() =>
            openDialog(
              "answermembershiprequest",
              { id: request.id, username: request.user.username, reason: request.reason },
              { size: "small" },
            )
          }
          className="space-y-1 rounded px-2 py-2.5 text-left text-xs transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{request.user.username}</span>
            <span className="text-muted-foreground">
              {new Date(request.createdAt).toLocaleDateString()}
            </span>
          </div>
          {request.reason && (
            <p className="line-clamp-3 text-muted-foreground">{request.reason}</p>
          )}
        </button>
      ))}
    </div>
  );
};

/**
 * Team's start page — the organization this profile acts in, which is the only
 * one it has: its banner, then its people. Each card opens that member's
 * profile, where the modules show their work.
 */
const TeamHomePage = () => {
  const { data: context } = useMyContextQuery();
  const organizationId = context?.mycontext.organization.id;
  const { data } = useOrganizationQuery({
    variables: { id: organizationId ?? "" },
    skip: !organizationId,
    fetchPolicy: "cache-and-network",
  });
  const [inviteOpen, setInviteOpen] = useState(false);
  // Inviting (and the invite links themselves) is for the organization's admins.
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
  if (!organization) return <LoadingPage />;

  const me = context?.mycontext.user.id;
  // You first, then everyone else by name.
  const memberships = [...organization.memberships].sort(
    (a, b) =>
      Number(b.user.id === me) - Number(a.user.id === me) ||
      a.user.username.localeCompare(b.user.username),
  );
  const openInvites = organization.invites.filter((invite) => !invite.acceptedBy).length;

  // Answered requests stay on record in lok; only the open ones need someone.
  const openRequests = (requested?.organization?.membershipRequests ?? []).filter(
    (request) => request.status === "pending",
  );

  const logo = organization.profile.avatar ?? organization.avatar;

  return (
    <PageLayout
      help={LOK_HELP.teamHome}
      title={organization.name}
      pageActions={
        isAdmin && (
          <>
            <PageAction alwaysShow onClick={() => setInviteOpen(true)}>
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
        <Sidebars>
          {isAdmin && (
            <Sidebars.Tab label="Invites">
              <Invites invites={organization.invites} />
            </Sidebars.Tab>
          )}
          {isAdmin && (
            <Sidebars.Tab label="Requests">
              <Requests requests={openRequests} />
            </Sidebars.Tab>
          )}
          <Sidebars.Tab label="Statistics">
            <HomePageStatisticsSidebar />
          </Sidebars.Tab>
          <Sidebars.Tab label="Help">
            <HelpSidebar />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <BannerHeader
        // The organization's own colour, not the viewer's personal override.
        banner={<BrandBanner hue={organization.brandHue} chroma={organization.brandChroma} />}
        portrait={
          <EditablePortrait
            src={logo ? resolve(logo.presignedUrl) : undefined}
            fallback={organization.name}
            upload={logoUpload}
            label="Change the organization's logo"
            shapeClassName="rounded-2xl"
          />
        }
        title={organization.name}
        aside={
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{memberships.length}</p>
              <p className="text-xs text-muted-foreground">
                {memberships.length === 1 ? "member" : "members"}
              </p>
            </div>
            {openInvites > 0 && (
              <div>
                <p className="text-2xl font-semibold tabular-nums">{openInvites}</p>
                <p className="text-xs text-muted-foreground">open invites</p>
              </div>
            )}
            {openRequests.length > 0 && (
              <div>
                <p className="text-2xl font-semibold tabular-nums">{openRequests.length}</p>
                <p className="text-xs text-muted-foreground">
                  {openRequests.length === 1 ? "request to join" : "requests to join"}
                </p>
              </div>
            )}
          </div>
        }
      >
        <p className="font-mono text-xs text-muted-foreground">{organization.slug}</p>
      </BannerHeader>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3 px-6 pb-10">
        {memberships.map((membership) => (
          <MemberCard
            key={membership.id}
            membership={membership}
            isMe={membership.user.id === me}
          />
        ))}
      </div>
    </PageLayout>
  );
};

export default TeamHomePage;
