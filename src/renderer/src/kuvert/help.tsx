import { PageHelp } from "@/core/layout/help";

/**
 * kuvert's page instructions, one per page, shown in the page's Help tab
 * (`help={KUVERT_HELP.accounts}`). Each names only what its page really offers:
 * the button labels, menu entries and dialogs are the ones on screen.
 */
export const KUVERT_HELP = {
  smartMailbox: (
    <PageHelp
      intro="A mailbox that gathers mail from all your accounts: All Inboxes, Unread, Flagged or Sent. Conversations are listed on the left, newest first; the one you select opens on the right."
      steps={[
        <>Click a conversation to read it on the right. Double-click it to open it as a page of its own.</>,
        <>Press <b>New mail</b> to write a mail. Pick the mailbox to send from under <b>From</b>, fill in <b>To</b> and <b>Subject</b>, then press <b>Send</b>.</>,
        <>Use the icons above the open conversation to file it: <b>Archive</b>, <b>Move to Trash</b>, <b>Move to Junk</b>, <b>Move to…</b>, <b>Categories</b>, <b>Flag</b> and <b>Mark as unread</b>.</>,
        <>Answer with <b>Reply</b>, <b>Reply all</b> or <b>Forward</b>, or type into the reply box under the conversation and press <b>Send</b>.</>,
        <>Right-click a conversation and choose <b>Add to task…</b> or <b>New task from conversation</b> to keep track of mail you still have to act on.</>,
      ]}
      tips={[
        <>The arrow keys (or j and k) walk the list, Enter opens the selected conversation as a page, and Delete moves it to Trash.</>,
        <>Opening a conversation marks it as read. A filled dot in the list means unread, a flag means flagged.</>,
        <>After you archive, move or delete mail, the notice that appears offers <b>Undo</b>: changes wait a moment before they reach the mail server.</>,
      ]}
    />
  ),
  accounts: (
    <PageHelp
      intro="Your mailboxes: the mail accounts linked here, whose mail you read and send from this app."
      steps={[
        <>Press <b>Add mailbox</b> and type the mail address. Google and Microsoft addresses sign in through your browser; any other address asks for its password and, under <b>Servers</b>, its mail servers.</>,
        <>Click a mailbox to open its settings: its name, folders, categories and sign-in.</>,
        <>Right-click a mailbox and choose <b>Sync now</b> to fetch new mail, or <b>New mail</b> to write from it.</>,
        <>Right-click a mailbox and choose <b>Share mailbox</b> to set who else in the organization sees it.</>,
        <>Right-click a mailbox and choose <b>Pause mailbox</b> to stop syncing and sending for a while, or <b>Remove mailbox</b> to unlink it.</>,
      ]}
      tips={[
        <>A red warning triangle on a mailbox means it needs attention, usually a new sign-in. Open it to see what is wrong.</>,
        <>A new mailbox is private until you share it. Removing one only drops the mail stored here; the mail on the server is untouched.</>,
      ]}
    />
  ),
  account: (
    <PageHelp
      intro="One mailbox and its settings: what it is called, which changes go back to the mail server, its folders, its categories and how it signs in."
      steps={[
        <>Press <b>Sync now</b> to fetch new mail, or <b>Compose</b> to write a mail from this mailbox.</>,
        <>Change <b>Name</b> or <b>Sender name</b> and press <b>Save</b>. The sender name is the one on mail you send.</>,
        <>Flip the switches under <b>Sync to the server</b> to choose what is pushed to the mail server: read state, flags, moves, deletes and categories. A switch saves the moment you flip it.</>,
        <>Under <b>Folders</b>, click a folder to open its mail, or use its switch to choose whether it is synced.</>,
        <>Under <b>Categories</b>, press <b>New category</b> to add a coloured label to sort this mailbox{"’"}s mail into.</>,
        <>Press <b>Share…</b> to set who sees the mailbox, and use <b>Sign-in and servers</b> to renew the sign-in or change the password and servers.</>,
      ]}
      tips={[
        <>Only the owner of a mailbox can change its settings; a mailbox shared with you is read-only here.</>,
        <>If something is wrong, a red banner at the top says what, with the button that fixes it, such as <b>Sign in again</b> or <b>Update password</b>.</>,
        <>When changes have not reached the server yet, a line at the top counts them, with <b>Push now</b> and <b>Review</b>. The Info tab shows the servers, the last sync and who the mailbox is shared with.</>,
      ]}
    />
  ),
  folder: (
    <PageHelp
      intro="The conversations in one folder of a mailbox, newest first. The one you select opens on the right."
      steps={[
        <>Click a conversation to read it. Double-click it to open it as a page of its own.</>,
        <>Switch between <b>All</b> and <b>Unread</b> to show only what you have not read yet.</>,
        <>Press <b>Sync</b> to fetch this folder{"’"}s new mail now.</>,
        <>Press <b>Compose</b> to write a mail from this folder{"’"}s mailbox.</>,
        <>Use the icons above the open conversation to <b>Archive</b> it, <b>Move to Trash</b>, <b>Move to…</b> another folder, <b>Flag</b> it or reply to it.</>,
      ]}
      tips={[
        <>A note above the list says when the folder is not synced; what it shows may then be old. Syncing is switched on per folder on the mailbox{"’"}s page.</>,
        <>“Still syncing” means the folder{"’"}s older mail is still being fetched.</>,
      ]}
    />
  ),
  thread: (
    <PageHelp
      intro="One conversation as a page of its own: all of its mails as cards, oldest first. The newest and any unread ones are open, older ones are folded to a line."
      steps={[
        <>Click the header of a mail to open it or fold it away.</>,
        <>Press <b>Reply</b>, <b>Reply all</b> or <b>Forward</b> in the page header to answer the newest mail in the full editor.</>,
        <>Type into the reply box at the bottom and press <b>Send</b> for a quick answer. <b>Open in the editor</b> continues there when you need Cc or attachments.</>,
        <>Press <b>Load images</b> on a mail whose remote images are blocked, if you want to see them.</>,
        <>Click an attachment below a mail to save it to your computer.</>,
        <>Right-click a mail for more: <b>Flag</b>, <b>Move to…</b>, <b>Categorize…</b>, <b>Find similar</b> or <b>Delete</b>.</>,
      ]}
      tips={[
        <>Opening the conversation marks its unread mail as read.</>,
        <>If the conversation is part of a task, the task shows as a chip above the mail; click it to open the task.</>,
        <>A small cloud next to a mail{"’"}s date means a change made here has not reached the mail server yet. A red one failed: click it for <b>Retry</b>, <b>Undo</b> or <b>Revert to server</b>.</>,
      ]}
    />
  ),
  message: (
    <PageHelp
      intro="A single mail on its own, for example one opened from a search result or a link."
      steps={[
        <>Press <b>Conversation</b> to see the mail together with its replies.</>,
        <>Press <b>Load images</b> if the mail{"’"}s remote images are blocked and you want to see them.</>,
        <>Click an attachment below the mail to save it to your computer.</>,
        <>Right-click the mail to <b>Reply</b>, <b>Forward</b>, <b>Flag</b>, <b>Archive</b>, <b>Move to…</b> or <b>Categorize…</b> it.</>,
        <>Open the Info tab to see the mailbox and folder the mail is in, when it was received and its size.</>,
      ]}
      tips={[
        <>Opening a mail marks it as read. Right-click it and choose <b>Mark unread</b> to keep it as a reminder.</>,
        <>Remote images are blocked at first because loading one tells the sender that you read the mail.</>,
      ]}
    />
  ),
  search: (
    <PageHelp
      intro="Search the mail of every mailbox you can see. Results are single mails, not conversations."
      steps={[
        <>Type into <b>Search mail…</b>. Results appear as you type.</>,
        <>Click a result to read it on the right. Double-click it to open it as a page.</>,
        <>Press <b>Whole conversation</b> under the subject of an open mail to see it with its replies.</>,
        <>Right-click a mail and choose <b>Find similar</b> to list the mail closest to it. Typing a new search leaves that list.</>,
      ]}
      tips={[
        <>Words match the subject, the sender and the text, and also by meaning: “flight booking” finds the airline{"’"}s mail. Exact matches come first.</>,
        <>If nothing is found, try other words, or fewer.</>,
      ]}
    />
  ),
  outbox: (
    <PageHelp
      intro="The mail sent from this app, newest first, and whether the mail server accepted it."
      steps={[
        <>Switch from <b>All</b> to <b>Failed</b> to see only the mail that could not be sent.</>,
        <>Click a mail to see what went out, to whom, and what the server answered.</>,
        <>Right-click a mail and choose <b>Edit as new</b> to start a new mail with the same recipients, subject and text, for example to correct a failed one and send it again.</>,
      ]}
      tips={[
        <>A spinner on a mail means it is still being sent. A red triangle means it failed; the reason is shown next to the recipients.</>,
      ]}
    />
  ),
  outgoing: (
    <PageHelp
      intro="One mail sent from this app: its recipients, its text and attachments, and what the mail server said about it."
      steps={[
        <>Read the <b>Not sent</b> notice, if there is one, to learn why the mail failed.</>,
        <>Check <b>Some recipients were refused</b> to see which addresses the server did not accept, and why.</>,
        <>Open the Info tab for the status, when it was sent, whether a copy was kept in Sent and the conversation it answered.</>,
        <>Open the menu at the right end of the page header and choose <b>Edit as new</b> to start a new mail with the same recipients, subject and text.</>,
      ]}
      tips={[
        <>The mail is shown here as plain text, without its formatting.</>,
      ]}
    />
  ),
  category: (
    <PageHelp
      intro="A category is a coloured label for the mail of one mailbox. This page lists the conversations in the category, from all of that mailbox's folders."
      steps={[
        <>Click a conversation to read it on the right.</>,
        <>Press <b>Edit</b> to rename the category, change its colour or change where it lives.</>,
        <>Open any mail, press the <b>Categories</b> tag icon above it and tick this category to put the mail in. Untick it to take the mail out.</>,
        <>Right-click a mail and choose <b>Categorize…</b> to set several categories at once.</>,
        <>Open the menu at the right end of the page header and choose <b>Delete category</b> to remove it. Its mail stays where it is.</>,
      ]}
      tips={[
        <>The line under the title says whether the category is kept on the mail server as a keyword, so other mail programs see it too, or “only here”.</>,
        <>Categories belong to a mailbox: everyone who sees the mailbox sees them.</>,
      ]}
    />
  ),
  changes: (
    <PageHelp
      intro="What you change here (reading, flagging, moving, deleting mail) waits a moment before it goes to the mail server, so that it can be undone. This page lists the changes still waiting and the ones that failed."
      steps={[
        <>Switch between <b>All</b>, <b>Pending</b> and <b>Failed</b> to narrow the list.</>,
        <>Pick a mailbox in the <b>Every mailbox</b> selector to see only its changes. It appears when you have more than one mailbox.</>,
        <>Hover a change and press the undo arrow, while it is still offered, to take the change back; the mail stays as the server has it.</>,
        <>Hover a failed change and press <b>Try again</b>, or press <b>Retry failed</b> to queue all failed ones again.</>,
        <>Press <b>Push now</b> to send the waiting changes right away instead of waiting.</>,
      ]}
      tips={[
        <>A red dot marks a failed change, with the reason next to it. Click the subject to open the mail it concerns.</>,
        <>The list refreshes by itself. “Everything is on the server” means nothing is waiting.</>,
      ]}
    />
  ),
  tasks: (
    <PageHelp
      intro="Tasks are to-dos, usually made from mail you have to act on. A task has a title, notes, a due date and the conversations it is about."
      steps={[
        <>Press <b>New task</b>, give it a <b>Title</b>, optionally a <b>List</b> and a <b>Due</b> date, and press <b>Create</b>.</>,
        <>Tick the round box in front of a task to mark it done.</>,
        <>Click a task to open it on the right. Change its title and notes in place, or use the icons above it: <b>Mark done</b>, <b>Dismiss</b>, <b>Snooze…</b>, <b>Pin to the top</b> and <b>Edit</b>.</>,
        <>Switch between <b>Active</b>, <b>Snoozed</b> and <b>Done</b> to see what is to do now, what waits and what is finished.</>,
        <>Use the list selector to show <b>All lists</b>, tasks on <b>No list</b> or one list, or choose <b>New list…</b> to create a list.</>,
      ]}
      tips={[
        <>To make a task from mail, right-click a conversation in any mailbox and choose <b>New task from conversation</b> or <b>Add to task…</b>.</>,
        <>A snoozed task is hidden from Active until its time comes. Pinned tasks stay at the top, and a due date in red is overdue.</>,
        <>The title and notes of an open task are saved when you click outside the field.</>,
      ]}
    />
  ),
  taskList: (
    <PageHelp
      intro="The tasks on one task list. A list is a coloured group for tasks that belong together."
      steps={[
        <>Press <b>New task</b> to add a task to this list.</>,
        <>Tick the round box in front of a task to mark it done.</>,
        <>Click a task to open it on the right, where you can change it, snooze it or pin it.</>,
        <>Switch between <b>Active</b>, <b>Snoozed</b> and <b>Done</b>.</>,
        <>Open the menu at the right end of the page header and choose <b>Edit list</b> to rename or recolour the list, or <b>Delete list</b>.</>,
      ]}
      tips={[
        <>Deleting a list does not delete its tasks; they stay, on no list.</>,
      ]}
    />
  ),
  task: (
    <PageHelp
      intro="One task as a page of its own: its title, notes, list, due date and the conversations it is about."
      steps={[
        <>Click the title or the <b>Notes</b> field and type to change them. They are saved when you click outside.</>,
        <>Pick a list in the selector under the title, and set a date and time next to <b>Due</b>.</>,
        <>Press <b>Mark done</b> when you are finished, or <b>Dismiss</b> to drop the task without doing it. <b>Open again</b> brings a finished task back.</>,
        <>Press <b>Snooze…</b> and choose <b>Tomorrow morning</b>, <b>Next week</b> or a time of your own to hide the task until then. <b>Wake now</b> brings it back early.</>,
        <>Click a conversation in the list to open it. Hover it and press the cross (<b>Take out of the task</b>) to remove it from the task.</>,
      ]}
      tips={[
        <>The badge “Sorted by an app” on a conversation means an app put it into this task, not a person; the percentage is how sure it was.</>,
        <>Finishing or deleting a task never touches the mail itself.</>,
      ]}
    />
  ),
};
