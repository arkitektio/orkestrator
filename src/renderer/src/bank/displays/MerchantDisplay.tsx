import { DisplayWidgetProps } from "@/core/smart/display/registry";
import { BankMerchant } from "@/bank/linkers";
import { useGetMerchantQuery } from "../api/graphql";
import MerchantCard from "../components/cards/MerchantCard";
import { MerchantLogo } from "../components/MerchantLogo";

/** `@bank/merchant` wherever another module shows one. */
export const MerchantDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetMerchantQuery({ variables: { id: props.id } });
  const merchant = data?.merchant;
  if (!merchant) return <span className="text-xs text-muted-foreground">Merchant</span>;

  if (props.variant === "inline" || props.variant === "avatar" || props.variant === "chip") {
    return (
      <BankMerchant.DetailLink object={merchant} className="inline-flex items-center gap-2">
        <MerchantLogo merchant={merchant} className="h-5 w-5" />
        <span className="truncate">{merchant.name}</span>
      </BankMerchant.DetailLink>
    );
  }
  return <MerchantCard item={merchant} />;
};
