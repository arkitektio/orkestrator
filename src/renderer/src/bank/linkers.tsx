import { smartOf } from "@/core/smart/fromManifest";
import { manifest } from "./manifest";

// Bank's smart objects (Smart cards, links, pages), built from the models its
// manifest declares.

export const BankConnection = smartOf(manifest, "@bank/connection");
export const BankAccount = smartOf(manifest, "@bank/account");
export const BankTransaction = smartOf(manifest, "@bank/transaction");
export const BankCategory = smartOf(manifest, "@bank/category");
export const BankRule = smartOf(manifest, "@bank/rule");
export const BankBudget = smartOf(manifest, "@bank/budget");
export const BankRecurring = smartOf(manifest, "@bank/recurring");
