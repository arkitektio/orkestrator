import { PageLayout } from "@/core/layout/PageLayout";
import { HomeEmpty, HomeSection, ModuleHome } from "@/core/layout/ModuleHome";
import { useDialog } from "@/core/dialogs/registry";
import { PageAction } from "@/core/ui/page-action";
import { PenSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { ThreadFilter, useListMailAccountsQuery, useListThreadsQuery } from "../api/graphql";
import ThreadCard from "../components/cards/ThreadCard";
import MailAccountList, { AddMailboxButton } from "../components/lists/MailAccountList";
import { KUVERT_HELP } from "../help";

const ALL_LINK = "text-[11px] font-normal normal-case tracking-normal hover:text-foreground";

/**
 * A few conversations of one smart mailbox, newest first, under a heading
 * that opens the whole mailbox. Nothing there draws nothing.
 */
const ThreadSection = ({
  title,
  to,
  filters,
  limit,
}: {
  title: string;
  to: string;
  filters: ThreadFilter;
  limit: number;
}) => {
  const { data } = useListThreadsQuery({
    variables: { filters, pagination: { offset: 0, limit } },
    fetchPolicy: "cache-and-network",
  });
  const threads = data?.threads ?? [];
  if (threads.length === 0) return null;

  return (
    <HomeSection
      title={
        <span className="flex w-full items-center justify-between">
          {title}
          <Link to={to} className={ALL_LINK}>
            All →
          </Link>
        </span>
      }
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-2">
        {threads.map((thread) => (
          <ThreadCard key={thread.id} item={thread} />
        ))}
      </div>
    </HomeSection>
  );
};

/**
 * Kuvert's front door: its pages, then what is unread and flagged across
 * every mailbox, and the mailboxes themselves. Reading happens in the
 * mailboxes, one tile away.
 */
const HomePage = () => {
  const { openSheet } = useDialog();
  const { data } = useListMailAccountsQuery();
  const noMailboxes = data?.mailAccounts.length === 0;

  return (
    <PageLayout
      title="Kuvert"
      help={KUVERT_HELP.home}
      pageActions={
        <PageAction
          size="sm"
          collapse="icon"
          icon={<PenSquare className="h-4 w-4" />}
          onClick={() => openSheet("kuvertcompose", {}, { size: "large" })}
        >
          New mail
        </PageAction>
      }
    >
      <ModuleHome
        moduleKey="kuvert"
        title="Kuvert"
        description="Your mail and the tasks it brings, across every mailbox."
      >
        {noMailboxes ? (
          <HomeEmpty title="No mailboxes yet">
            Add a mailbox to read and send its mail here. <AddMailboxButton />
          </HomeEmpty>
        ) : (
          <>
            <ThreadSection title="Unread" to="/kuvert/unread" filters={{ unread: true }} limit={8} />
            <ThreadSection title="Flagged" to="/kuvert/flagged" filters={{ flagged: true }} limit={6} />
            <MailAccountList />
          </>
        )}
      </ModuleHome>
    </PageLayout>
  );
};

export default HomePage;
