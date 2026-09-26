import { ListRender } from "@/core/layout/ListRender";
import { SidebarLayout } from "@/core/layout/SidebarLayout";
import { DialogButton } from "@/core/ui/dialog-button";
import { FancyInput } from "@/core/ui/fancy-input";
import { PaneLink, SidePaneGroup, SidePaneNav } from "@/core/ui/sidepane";
import { useDebounce } from "@uidotdev/usehooks";
import { Flag, Inbox, Mailbox, MailOpen, Plus, Search, Send, SendHorizontal, TriangleAlert } from "lucide-react";
import * as React from "react";
import { FolderRole, MailAccountStatus, useListMessagesQuery, useMailboxTreeQuery } from "../api/graphql";
import MessageCard from "../components/cards/MessageCard";
import { FOLDER_ICON } from "../components/folderIcon";
import { sortFolders } from "../format";
import { MailAccount, MailFolder } from "../linkers";

/** An unread count at the end of a sidebar row, as Apple Mail shows it. */
const Count = ({ n }: { n?: number }) =>
  n ? <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">{n}</span> : null;

export const NavigationPane = () => {
  const { data } = useMailboxTreeQuery();
  const accounts = data?.mailAccounts;
  const inboxUnread = accounts
    ?.flatMap((a) => a.folders)
    .filter((f) => f.role === FolderRole.Inbox)
    .reduce((n, f) => n + f.unreadCount, 0);

  return (
    <SidePaneNav>
      <SidePaneGroup
        title="Favorites"
        action={
          <DialogButton
            name="kuvertlink"
            dialogProps={{}}
            options={{ size: "medium" }}
            variant="ghost"
            size="icon"
            title="Add mailbox"
          >
            <Plus className="h-3 w-3" />
          </DialogButton>
        }
      >
        <PaneLink to="/kuvert">
          <Inbox />
          All Inboxes
          <Count n={inboxUnread} />
        </PaneLink>
        <PaneLink to="/kuvert/unread">
          <MailOpen />
          Unread
        </PaneLink>
        <PaneLink to="/kuvert/flagged">
          <Flag />
          Flagged
        </PaneLink>
        <PaneLink to="/kuvert/sent">
          <Send />
          Sent
        </PaneLink>
      </SidePaneGroup>

      {accounts && accounts.length === 0 && (
        <DialogButton
          name="kuvertlink"
          dialogProps={{}}
          options={{ size: "medium" }}
          variant="outline"
          size="sm"
          className="mx-2 mb-3 w-[calc(100%-1rem)]"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add mailbox
        </DialogButton>
      )}

      {accounts?.map((account) => {
        const trouble = account.status === MailAccountStatus.NeedsReauth || !!account.lastErrorCode;
        return (
          <SidePaneGroup
            key={account.id}
            title={
              <MailAccount.DetailLink object={account} className="flex items-center gap-1.5">
                <span className="truncate">{account.name || account.emailAddress}</span>
                {trouble && <TriangleAlert className="h-3 w-3 shrink-0 text-destructive" aria-label="Needs attention" />}
              </MailAccount.DetailLink>
            }
            limit={10}
            moreTo={MailAccount.linkBuilder(account.id)}
          >
            {sortFolders(account.folders.filter((f) => f.selectable)).map((folder) => {
              const Icon = FOLDER_ICON[folder.role];
              return (
                <MailFolder.PaneLink object={folder} key={folder.id}>
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate">{folder.name}</span>
                  <Count n={folder.unreadCount} />
                </MailFolder.PaneLink>
              );
            })}
          </SidePaneGroup>
        );
      })}

      <SidePaneGroup title="More">
        <PaneLink to="/kuvert/search">
          <Search />
          Search
        </PaneLink>
        <PaneLink to="/kuvert/outbox">
          <SendHorizontal />
          Outbox
        </PaneLink>
        <PaneLink to="/kuvert/accounts">
          <Mailbox />
          Mailboxes
        </PaneLink>
      </SidePaneGroup>
    </SidePaneNav>
  );
};

/** Searching the rail searches mail: subject, sender, text and meaning. */
const SearchResults = ({ search }: { search: string }) => {
  const { data } = useListMessagesQuery({
    variables: { filters: { search }, pagination: { limit: 20 } },
  });
  return <ListRender array={data?.messages}>{(item) => <MessageCard item={item} key={item.id} />}</ListRender>;
};

const Pane: React.FunctionComponent = () => {
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 300);

  return (
    <SidebarLayout
      searchBar={
        <FancyInput
          placeholder="Search mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-grow h-full bg-background text-foreground w-full"
        />
      }
    >
      {debouncedSearch.trim() === "" ? <NavigationPane /> : <SearchResults search={debouncedSearch.trim()} />}
    </SidebarLayout>
  );
};

export default Pane;
