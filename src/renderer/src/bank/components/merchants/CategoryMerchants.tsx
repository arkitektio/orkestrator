import { useListMerchantsQuery } from "../../api/graphql";
import MerchantCard from "../cards/MerchantCard";

/** The merchants whose transactions default to a category. */
export const CategoryMerchants = ({ category }: { category: string }) => {
  const { data } = useListMerchantsQuery({ variables: { filters: { category }, pagination: { limit: 50 } } });
  const merchants = data?.merchants ?? [];
  if (!data) return <p className="p-3 text-xs text-muted-foreground">Loading…</p>;
  if (merchants.length === 0)
    return <p className="p-3 text-xs text-muted-foreground">No merchant defaults to this category.</p>;
  return (
    <div className="flex flex-col gap-2 p-3">
      {merchants.map((merchant) => (
        <MerchantCard key={merchant.id} item={merchant} />
      ))}
    </div>
  );
};
