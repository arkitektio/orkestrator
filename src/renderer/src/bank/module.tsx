import { defineModule } from "@/core/modules/host/define";
import { BANK_ACTIONS } from "./actions";
import { BANK_DIALOGS } from "./dialogRegistry";
import { AccountDisplay } from "./displays/AccountDisplay";
import { TransactionDisplay } from "./displays/TransactionDisplay";
import { manifest } from "./manifest";
import { BANK_NAV_LINKS } from "./navLinks";
import { service } from "./service";

export const BANK_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    page: () => import("./BankModule"),
    nav: () => import("./panes/StandardPane"),
    navLinks: BANK_NAV_LINKS,
    displays: {
      "@bank/account": AccountDisplay,
      "@bank/transaction": TransactionDisplay,
    },
    dialogs: BANK_DIALOGS,
    actions: BANK_ACTIONS,
  },
});
