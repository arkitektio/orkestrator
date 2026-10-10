import { contractAuthFlow } from "@/core/authflow/contract";
import {
  AuthSessionDocument,
  CancelAuthDocument,
  CompleteAuthDocument,
  ListBankAccountsDocument,
  ListBankConnectionsDocument,
} from "./api/graphql";
import { toastText } from "./errors";

/** bank's side of the external-login contract (an `authFlow` builtin). */
export const BANK_AUTH_FLOW = contractAuthFlow({
  service: "bank",
  title: "Bank login",
  restartDialog: "banklink",
  describeError: toastText,
  documents: { complete: CompleteAuthDocument, read: AuthSessionDocument, cancel: CancelAuthDocument },
  refetchOnDone: [ListBankConnectionsDocument, ListBankAccountsDocument],
});
