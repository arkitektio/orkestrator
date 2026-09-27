import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import React, { useState } from "react";
import { toast } from "@/core/notify";
import {
  ListMessagesDocument,
  ListThreadsDocument,
  MailboxTreeDocument,
  useListMailFoldersQuery,
  useListMessagesQuery,
  useMoveMessagesMutation,
} from "../api/graphql";
import { FOLDER_ICON } from "../components/folderIcon";
import { toastText } from "../errors";
import { sortFolders } from "../format";

/** Move mail to another folder of its mailbox. Mail from several mailboxes cannot move together. */
export const MoveMessagesForm = ({ messages }: { messages: string[] }) => {
  const { closeDialog } = useDialog();
  const [filter, setFilter] = useState("");
  const { data: selected } = useListMessagesQuery({
    variables: { filters: { ids: messages }, pagination: { limit: messages.length } },
  });
  const accounts = [...new Set(selected?.messages.map((m) => m.account.id))];
  const current = new Set(selected?.messages.map((m) => m.folder.id));
  const { data } = useListMailFoldersQuery({
    variables: { filters: { account: accounts[0] }, pagination: { limit: 500 } },
    skip: accounts.length !== 1,
  });
  const [move, { loading }] = useMoveMessagesMutation({
    refetchQueries: [ListThreadsDocument, ListMessagesDocument, MailboxTreeDocument],
  });

  const folders = sortFolders(data?.mailFolders ?? []).filter(
    (f) => f.selectable && f.existsOnServer && f.path.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-3">
      <DialogHeader>
        <DialogTitle>Move {messages.length === 1 ? "mail" : `${messages.length} mails`}</DialogTitle>
        {accounts.length > 1 && (
          <DialogDescription>These are in different mailboxes; move them one mailbox at a time.</DialogDescription>
        )}
      </DialogHeader>
      {accounts.length === 1 && (
        <>
          <Input autoFocus placeholder="Folder…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <div className="flex max-h-80 flex-col overflow-y-auto">
            {folders.map((folder) => (
              <Button
                key={folder.id}
                variant="ghost"
                className="justify-start gap-2"
                disabled={loading || (current.size === 1 && current.has(folder.id))}
                onClick={() =>
                  move({ variables: { input: { messages, folder: folder.id } } })
                    .then(() => {
                      toast.success(`Moved to ${folder.name}`);
                      closeDialog();
                    })
                    .catch((e) => toast.error(toastText(e)))
                }
              >
                {React.createElement(FOLDER_ICON[folder.role], { className: "h-4 w-4" })}
                <span className="truncate">{folder.path}</span>
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
