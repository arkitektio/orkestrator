import { LineChart, PiggyBank, Wallet } from "lucide-react";
import { AccountKind } from "../api/graphql";

/** The glyph an account kind is drawn with, wherever accounts are listed. */
export const KIND_ICON = {
  [AccountKind.Cash]: Wallet,
  [AccountKind.Savings]: PiggyBank,
  [AccountKind.Depot]: LineChart,
};
