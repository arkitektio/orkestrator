import { BankCategory, BankMerchant, BankPlace } from "@/bank/linkers";
import { RankedCategoryFragment, RankedLocationFragment, RankedMerchantFragment } from "../../api/graphql";
import { toNumber } from "../../format";
import { CategoryBadge } from "../CategoryBadge";
import { MerchantLogo } from "../MerchantLogo";
import { RankedBars } from "./parts";

const spent = <T extends { currency: string; expense: string }>(rows: readonly T[], currency?: string) =>
  rows.filter((row) => (!currency || row.currency === currency) && toNumber(row.expense) > 0);

/** Merchants ranked by money spent, linking to each. */
export const RankedMerchants = ({ rows, currency }: { rows: readonly RankedMerchantFragment[]; currency?: string }) => (
  <RankedBars
    rows={spent(rows, currency).map((row) => ({
      key: row.merchant?.id ?? "none",
      label: row.merchant ? (
        <BankMerchant.DetailLink object={row.merchant} className="flex min-w-0 items-center gap-2 hover:underline">
          <MerchantLogo merchant={row.merchant} className="h-5 w-5" />
          <span className="truncate">{row.merchant.name}</span>
        </BankMerchant.DetailLink>
      ) : (
        <span className="text-xs italic text-muted-foreground">No merchant</span>
      ),
      amount: row.expense,
      currency: row.currency,
      share: row.share,
      color: row.merchant?.category?.color,
    }))}
  />
);

/** Categories ranked by money spent, linking to each. */
export const RankedCategories = ({ rows, currency }: { rows: readonly RankedCategoryFragment[]; currency?: string }) => (
  <RankedBars
    rows={spent(rows, currency).map((row) => ({
      key: row.category?.id ?? "none",
      label: row.category ? (
        <CategoryBadge category={row.category} className="text-sm" />
      ) : (
        <BankCategory.ListLink className="text-xs italic text-muted-foreground">Uncategorized</BankCategory.ListLink>
      ),
      amount: row.expense,
      currency: row.currency,
      share: row.share,
      color: row.category?.color,
    }))}
  />
);

/** Places ranked by money spent, linking to each. */
export const RankedLocations = ({ rows, currency }: { rows: readonly RankedLocationFragment[]; currency?: string }) => (
  <RankedBars
    rows={spent(rows, currency).map((row) => ({
      key: row.location?.id ?? "none",
      label: row.location ? (
        <BankPlace.DetailLink object={row.location} className="truncate hover:underline">
          {row.location.name}
          {row.location.city && <span className="text-muted-foreground"> · {row.location.city}</span>}
        </BankPlace.DetailLink>
      ) : (
        <span className="text-xs italic text-muted-foreground">No place</span>
      ),
      amount: row.expense,
      currency: row.currency,
      share: row.share,
    }))}
  />
);
