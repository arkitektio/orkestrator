import { createList } from "@/core/layout/createList";
import { BankMerchant } from "@/bank/linkers";
import { useListMerchantsQuery } from "../../api/graphql";
import MerchantCard from "../cards/MerchantCard";

const MerchantList = createList({
  useHook: useListMerchantsQuery,
  dataKey: "merchants",
  ItemComponent: MerchantCard,
  title: "Merchants",
  emptyTitle: "No merchants",
  smart: BankMerchant,
  minItemWidth: 280,
});

export default MerchantList;
