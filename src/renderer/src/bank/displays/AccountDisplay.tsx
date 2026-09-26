import { DisplayWidgetProps } from "@/core/smart/display/registry";
import { BankAccount } from "@/bank/linkers";
import { useGetBankAccountQuery } from "../api/graphql";
import AccountCard from "../components/cards/AccountCard";
import { Money } from "../components/Money";
import { formatIban } from "../format";

/** `@bank/account` wherever another module shows one. */
export const AccountDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetBankAccountQuery({ variables: { id: props.id } });
  const account = data?.bankAccount;
  if (!account) return <span className="text-xs text-muted-foreground">Account</span>;

  const name = account.name || account.product || formatIban(account.iban) || "Account";
  if (props.variant === "inline" || props.variant === "avatar") {
    return <BankAccount.DetailLink object={account}>{name}</BankAccount.DetailLink>;
  }
  if (props.variant === "chip") {
    return (
      <BankAccount.DetailLink object={account} className="inline-flex items-center gap-2 text-sm">
        <span className="truncate">{name}</span>
        {account.latestBalance && (
          <Money
            amount={account.latestBalance.amount}
            currency={account.latestBalance.currency}
            className="text-xs text-muted-foreground"
          />
        )}
      </BankAccount.DetailLink>
    );
  }
  return <AccountCard item={account} />;
};
