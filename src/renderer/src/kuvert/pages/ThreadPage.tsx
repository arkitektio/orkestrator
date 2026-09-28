import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { useGetThreadQuery } from "../api/graphql";
import { ReplyButtons } from "../components/MessageView";
import { InlineReply } from "../components/split/InlineReply";
import { ThreadMessages, useMarkThreadRead } from "../components/split/ThreadReader";
import { ThreadTasks } from "../components/tasks/ThreadTasks";
import { MailThread } from "../linkers";

/** A conversation as a page of its own (double-click in a list, or a link). */
const ThreadPage = asDetailQueryRoute(useGetThreadQuery, ({ data }) => {
  const thread = data.thread;
  useMarkThreadRead(thread);
  const last = thread.messages[thread.messages.length - 1];

  return (
    <MailThread.ModelPage
      title={thread.subject || "(no subject)"}
      object={thread}
      pageActions={last && thread.account.canSend && <ReplyButtons message={last} />}
    >
      <div className="-m-3 min-h-full bg-muted/40">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-4">
          <ThreadTasks thread={thread} />
          <ThreadMessages key={thread.id} thread={thread} />
          {last && thread.account.canSend && <InlineReply key={last.id} message={last} />}
        </div>
      </div>
    </MailThread.ModelPage>
  );
});

export default ThreadPage;
