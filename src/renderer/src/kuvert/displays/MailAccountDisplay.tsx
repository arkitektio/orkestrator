import { DisplayWidgetProps } from "@/core/smart/display/registry";
import { useGetMailAccountQuery } from "../api/graphql";
import MailAccountCard from "../components/cards/MailAccountCard";
import { MailAccount } from "../linkers";

/** `@kuvert/account` wherever another module shows one. */
export const MailAccountDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetMailAccountQuery({ variables: { id: props.id } });
  const account = data?.mailAccount;
  if (!account) return <span className="text-xs text-muted-foreground">Mailbox</span>;

  if (props.variant === "card") return <MailAccountCard item={account} />;
  return (
    <MailAccount.DetailLink object={account} className="truncate">
      {props.variant === "chip" ? account.emailAddress : account.name || account.emailAddress}
    </MailAccount.DetailLink>
  );
};
