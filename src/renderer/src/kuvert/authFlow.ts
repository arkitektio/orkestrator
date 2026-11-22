import { contractAuthFlow } from "@/core/authflow/contract";
import {
  AuthSessionDocument,
  CancelAuthDocument,
  CompleteAuthDocument,
  ListMailAccountsDocument,
  MailboxTreeDocument,
  WatchAuthSessionDocument,
} from "./api/graphql";
import { toastText } from "./errors";

/** kuvert's side of the external-login contract (an `authFlow` builtin). */
export const KUVERT_AUTH_FLOW = contractAuthFlow({
  service: "kuvert",
  title: "Mailbox sign-in",
  restartDialog: "kuvertlink",
  describeError: toastText,
  documents: {
    complete: CompleteAuthDocument,
    read: AuthSessionDocument,
    cancel: CancelAuthDocument,
    watch: WatchAuthSessionDocument,
  },
  refetchOnDone: [ListMailAccountsDocument, MailboxTreeDocument],
});
