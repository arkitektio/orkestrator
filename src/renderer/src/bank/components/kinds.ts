import { TransactionKind as K } from "../api/graphql";

/**
 * Broker transaction kinds, grouped the way someone reads a depot: what was
 * traded, what it paid, money in and out, and what it cost.
 */
export const KIND_GROUPS = {
  trades: {
    label: "Trades",
    tone: "bg-info/15 text-info",
    kinds: [K.Buy, K.Sell, K.SavingsPlan, K.SwapIn, K.SwapOut, K.CurrencySwitchBuy, K.CurrencySwitchSell],
  },
  income: {
    label: "Income",
    tone: "bg-success/15 text-success",
    kinds: [
      K.Distribution,
      K.Interest,
      K.TaxReturn,
      K.PocketMoney,
      K.Reinvestment,
      K.ReinvestmentDistribution,
      K.ReinvestmentPocketMoney,
    ],
  },
  cash: {
    label: "Cash",
    tone: "bg-muted text-foreground",
    kinds: [K.Deposit, K.Withdrawal, K.CashTransferIn, K.CashTransferOut, K.TransferIn, K.TransferOut],
  },
  costs: {
    label: "Costs",
    tone: "bg-warning/15 text-warning",
    kinds: [K.Fee, K.Tax],
  },
} as const;

export type KindGroup = keyof typeof KIND_GROUPS;

export const groupOfKind = (kind: K): KindGroup | null => {
  for (const [group, { kinds }] of Object.entries(KIND_GROUPS)) {
    if ((kinds as readonly K[]).includes(kind)) return group as KindGroup;
  }
  return null;
};

/** `SAVINGS_PLAN` → "savings plan". */
export const kindLabel = (kind: K) => kind.toLowerCase().replace(/_/g, " ");
