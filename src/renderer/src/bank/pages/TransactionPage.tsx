import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { PageAction } from "@/core/ui/page-action";
import { Switch } from "@/core/ui/switch";
import { Textarea } from "@/core/ui/textarea";
import { BankAccount, BankMerchant, BankPlace, BankTransaction } from "@/bank/linkers";
import { ListPlus, MapPin, Store, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/core/notify";
import {
  CategorySource,
  MerchantSource,
  TransactionStatus,
  useCategorizeTransactionsMutation,
  useGetTransactionQuery,
  useMarkTransferMutation,
  useSetTransactionNoteMutation,
} from "../api/graphql";
import { CategoryBadge } from "../components/CategoryBadge";
import { CategorySuggestions } from "../components/CategorySuggestions";
import { SimilarTransactions } from "../components/SimilarTransactions";
import { TradeBadge } from "../components/TradeBadge";
import { InfoList } from "../components/InfoList";
import { MerchantLogo } from "../components/MerchantLogo";
import { Money } from "../components/Money";
import { toastText } from "../errors";
import { formatDay, formatIban, formatMoney, toNumber } from "../format";

const TransactionPage = asDetailQueryRoute(useGetTransactionQuery, ({ data }) => {
  const tx = data.transaction;
  const { openDialog } = useDialog();
  const [note, setNote] = useState(tx.note ?? "");
  useEffect(() => setNote(tx.note ?? ""), [tx.note]);

  const [saveNote, { loading: savingNote }] = useSetTransactionNoteMutation();
  const [markTransfer, { loading: marking }] = useMarkTransferMutation();
  const [setCategory, { loading: categorizing }] = useCategorizeTransactionsMutation();
  const pick = (category: string) =>
    setCategory({ variables: { ids: [tx.id], category } }).catch((e) =>
      toast.error("Could not categorize: " + toastText(e)),
    );

  const categorize = () => openDialog("bankcategorize", { ids: [tx.id], category: tx.category?.id }, { size: "small" });
  const setMerchant = () =>
    openDialog(
      "bankassignmerchant",
      { ids: [tx.id], merchant: tx.merchant?.id, location: tx.merchantLocation?.id },
      { size: "small" },
    );
  const makeRule = () =>
    openDialog(
      "bankcreaterule",
      { pattern: tx.counterparty ?? tx.remittance ?? "", category: tx.category?.id },
      { size: "medium" },
    );

  return (
    <BankTransaction.ModelPage
      title={tx.counterparty || tx.remittance || "Transaction"}
      object={tx}
      pageActions={
        <>
          <PageAction size="sm" collapse="icon" icon={<Tag className="h-4 w-4" />} onClick={categorize}>
            Categorize
          </PageAction>
          <PageAction size="sm" collapse="icon" icon={<Store className="h-4 w-4" />} onClick={setMerchant} priority={-5}>
            Set merchant
          </PageAction>
          <PageAction size="sm" collapse="icon" icon={<ListPlus className="h-4 w-4" />} onClick={makeRule} priority={-10}>
            Make rule
          </PageAction>
        </>
      }
      additionalSidebars={
        <>
          <Sidebars.Tab label="Info">
            <InfoList
              rows={[
                ["Account", <BankAccount.DetailLink object={tx.account}>{tx.account.name || formatIban(tx.account.iban)}</BankAccount.DetailLink>],
                ["Counterparty", tx.merchant && tx.counterparty],
              ["Booked", tx.bookingDate && formatDay(tx.bookingDate)],
                ["Value date", tx.valueDate && formatDay(tx.valueDate)],
                ["Made", tx.transactionDate && formatDay(tx.transactionDate)],
                ["IBAN", tx.counterpartyIban && <span className="font-mono text-xs">{formatIban(tx.counterpartyIban)}</span>],
                ["Security", tx.isin && <span className="font-mono text-xs">{tx.isin}</span>],
                [
                  "Units",
                  tx.quantity && toNumber(tx.quantity).toLocaleString(undefined, { maximumFractionDigits: 6 }),
                ],
                [
                  "Per unit",
                  tx.quantity && toNumber(tx.quantity) !== 0 &&
                    formatMoney(Math.abs(toNumber(tx.amount) / toNumber(tx.quantity)), tx.currency),
                ],
                ["Reference", tx.entryReference && <span className="font-mono text-xs">{tx.entryReference}</span>],
              ]}
            />
          </Sidebars.Tab>
          <Sidebars.Tab label="Similar">
            <SimilarTransactions transaction={tx.id} category={tx.category} />
          </Sidebars.Tab>
        </>
      }
      defaultSidebar="Info"
    >
      <div className="p-6 flex max-w-2xl flex-col gap-6">
        <div>
          <Money amount={tx.amount} currency={tx.currency} signed className="text-4xl font-semibold" />
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            {formatDay(tx.bookingDate ?? tx.transactionDate)}
            <TradeBadge kind={tx.kind} />
            {tx.status !== TransactionStatus.Booked && (
              <Badge variant="outline" className="rounded-full text-[10px]">
                {tx.status.toLowerCase()}
              </Badge>
            )}
          </div>
        </div>

        {tx.remittance && <p className="whitespace-pre-wrap text-sm">{tx.remittance}</p>}

        <div className="flex items-center justify-between gap-4">
          {tx.merchant ? (
            <div className="flex min-w-0 items-center gap-3">
              <MerchantLogo merchant={tx.merchant} className="h-10 w-10" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">
                  Merchant
                  {tx.merchantSource === MerchantSource.Manual && " · set by hand"}
                  {tx.merchantSource === MerchantSource.Rule && " · set by a rule"}
                  {tx.merchantSource === MerchantSource.Auto && " · recognized"}
                </span>
                <BankMerchant.DetailLink object={tx.merchant} className="truncate font-medium hover:underline">
                  {tx.merchant.name}
                </BankMerchant.DetailLink>
                {tx.merchantLocation && (
                  <BankPlace.DetailLink
                    object={tx.merchantLocation}
                    className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-foreground"
                  >
                    <MapPin className="h-3 w-3 shrink-0" />
                    {[tx.merchantLocation.name, tx.merchantLocation.street, tx.merchantLocation.city]
                      .filter(Boolean)
                      .join(", ")}
                  </BankPlace.DetailLink>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Merchant</span>
              <span className="text-sm italic text-muted-foreground">Not recognized</span>
            </div>
          )}
          <Button size="sm" variant="outline" onClick={setMerchant}>
            {tx.merchant ? "Change" : "Set"}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              Category
              {tx.categorySource === CategorySource.Rule && " · set by a rule"}
              {tx.categorySource === CategorySource.Manual && " · set by hand"}
              {tx.categorySource === CategorySource.Semantic && " · guessed from similar transactions"}
              {tx.categorySource === CategorySource.Merchant && " · from the merchant"}
              {tx.categorySource === CategorySource.Import && " · imported"}
            </span>
            {tx.category ? (
              <CategoryBadge
                category={tx.category}
                guessed={tx.categorySource === CategorySource.Semantic}
                className="text-sm"
              />
            ) : (
              <span className="text-sm italic text-muted-foreground">Uncategorized</span>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={categorize}>
            Change
          </Button>
        </div>
        {tx.categorySource !== CategorySource.Manual && (
          <CategorySuggestions
            transaction={tx.id}
            exclude={tx.categorySource === CategorySource.Semantic ? null : tx.category?.id}
            onPick={pick}
            disabled={categorizing}
            className="-mt-4"
          />
        )}

        <label className="flex items-center justify-between gap-4">
          <span className="flex flex-col gap-1">
            <span className="text-sm">Transfer between own accounts</span>
            <span className="text-xs text-muted-foreground">
              Left out of spending stats.
              {!tx.isTransferManual && " Detected automatically."}
            </span>
          </span>
          <Switch
            checked={tx.isTransfer}
            disabled={marking}
            onCheckedChange={(checked) =>
              markTransfer({ variables: { input: { id: tx.id, isTransfer: checked } } }).catch((e: Error) =>
                toast.error(e.message),
              )
            }
          />
        </label>
        {tx.isTransferManual && (
          <button
            type="button"
            className="-mt-4 self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => markTransfer({ variables: { input: { id: tx.id, isTransfer: null } } })}
          >
            Detect automatically again
          </button>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Note</span>
          <Textarea
            value={note}
            placeholder="Add a note…"
            onChange={(e) => setNote(e.target.value)}
            className="min-h-20"
          />
          {note !== (tx.note ?? "") && (
            <Button
              size="sm"
              className="self-end"
              disabled={savingNote}
              onClick={() =>
                saveNote({ variables: { input: { id: tx.id, note: note.trim() || null } } })
                  .then(() => toast.success("Note saved"))
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              Save note
            </Button>
          )}
        </div>
      </div>
    </BankTransaction.ModelPage>
  );
});

export default TransactionPage;
