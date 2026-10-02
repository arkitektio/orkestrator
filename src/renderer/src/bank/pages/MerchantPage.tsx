import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import { PageAction } from "@/core/ui/page-action";
import { cn } from "@/core/util/utils";
import { BankMerchant, BankPlace } from "@/bank/linkers";
import { GitMerge, MapPin, MapPinPlus, Pencil, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "@/core/notify";
import {
  MerchantFragment,
  MerchantLocationFragment,
  RuleDirection,
  useAddMerchantAliasMutation,
  useGeocodeMerchantLocationMutation,
  useGetMerchantQuery,
  useRemoveMerchantAliasMutation,
  useSimilarMerchantsQuery,
} from "../api/graphql";
import MerchantCard from "../components/cards/MerchantCard";
import { isLocated, placeAddress, SOURCE_LABEL } from "../components/cards/PlaceCard";
import { CategoryBadge } from "../components/CategoryBadge";
import { useTransactionFilterBar } from "../components/filter/TransactionFilterBar";
import { InfoList } from "@/core/ui/info-list";
import { MerchantInsightsTab } from "../components/insights/tabs/MerchantInsightsTab";
import ReviewTransactionList from "../components/lists/ReviewTransactionList";
import { LocationsMap } from "../components/map/LocationsMap";
import { MerchantLogo } from "../components/MerchantLogo";
import { Money } from "../components/Money";
import { toastText } from "../errors";
import { formatDay } from "../format";
import { BANK_HELP } from "../help";

/** One place of the merchant; unlocated ones can be looked up on OpenStreetMap. */
const PlaceRow = ({
  location,
  selected,
  onSelect,
}: {
  location: MerchantLocationFragment;
  selected: boolean;
  onSelect: () => void;
}) => {
  const [geocode, { loading }] = useGeocodeMerchantLocationMutation();
  const located = isLocated(location);
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-accent/50",
        selected && "border-primary bg-accent/50",
      )}
      onClick={onSelect}
    >
      <MapPin className={cn("h-4 w-4 shrink-0", located ? "text-foreground" : "text-muted-foreground/50")} />
      <div className="min-w-0 flex-1">
        <BankPlace.DetailLink
          object={location}
          className="block truncate font-medium hover:underline"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {location.name}
        </BankPlace.DetailLink>
        <div className="truncate text-xs text-muted-foreground">
          {placeAddress(location) || "No address"}
          {located && <> · {SOURCE_LABEL[location.source]}</>}
        </div>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {location.transactionCount} {location.transactionCount === 1 ? "visit" : "visits"}
        {location.lastVisit && <> · {formatDay(location.lastVisit)}</>}
      </span>
      {!located && (
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={(e) => {
            e.stopPropagation();
            geocode({ variables: { id: location.id } })
              .then((r) =>
                r.data?.geocodeMerchantLocation.latitude != null
                  ? toast.success(`Found ${location.name}`)
                  : toast.info(`No match for ${location.name}; add an address and try again`),
              )
              .catch((error) => toast.error("Could not look it up: " + toastText(error)));
          }}
        >
          {loading ? "Locating..." : "Locate"}
        </Button>
      )}
    </div>
  );
};

const SimilarMerchants = ({ id }: { id: string }) => {
  const { data } = useSimilarMerchantsQuery({ variables: { id } });
  const similar = data?.merchant.similarMerchants ?? [];
  if (!data) return <p className="p-3 text-xs text-muted-foreground">Loading…</p>;
  if (similar.length === 0) return <p className="p-3 text-xs text-muted-foreground">Nothing similar.</p>;
  return (
    <div className="flex flex-col gap-2 p-3">
      {similar.map((merchant) => (
        <MerchantCard key={merchant.id} item={merchant} />
      ))}
    </div>
  );
};

/** The texts that mean this merchant on a bank line; add or remove them in place. */
const Aliases = ({ merchant }: { merchant: MerchantFragment }) => {
  const [text, setText] = useState("");
  const [add, { loading }] = useAddMerchantAliasMutation();
  const [remove] = useRemoveMerchantAliasMutation({
    update: (cache, _result, { variables }) => {
      if (variables) cache.evict({ id: cache.identify({ __typename: "MerchantAlias", id: variables.id }) });
      cache.gc();
    },
  });
  const submit = () =>
    text.trim() &&
    add({ variables: { merchant: merchant.id, text: text.trim() } })
      .then(() => setText(""))
      .catch((e) => toast.error("Could not add the alias: " + toastText(e)));

  return (
    <div className="flex flex-col gap-1.5 px-3 pb-3">
      <span className="text-xs text-muted-foreground">Recognized by</span>
      <div className="flex flex-wrap gap-1">
        {merchant.aliases.map((alias) => (
          <Badge key={alias.id} variant="secondary" className="gap-1 pr-1 font-normal">
            {alias.pattern}
            <button
              type="button"
              aria-label={`Remove ${alias.pattern}`}
              className="rounded-sm opacity-60 hover:opacity-100"
              onClick={() =>
                remove({ variables: { id: alias.id } }).catch((e) => toast.error("Could not remove: " + toastText(e)))
              }
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <form
        className="flex gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add alias…" className="h-7 text-xs" />
        <Button type="submit" size="sm" variant="ghost" className="h-7" disabled={loading || !text.trim()}>
          Add
        </Button>
      </form>
    </div>
  );
};

const DIRECTION_LABEL: Record<RuleDirection, string> = {
  [RuleDirection.Any]: "",
  [RuleDirection.In]: " · money in",
  [RuleDirection.Out]: " · money out",
};

/** The rules that link bank lines to this merchant (read-only), first match wins. */
const Rules = ({ merchant }: { merchant: MerchantFragment }) => (
  <div className="flex flex-col gap-2 p-3">
    {[...merchant.rules]
      .sort((a, b) => a.priority - b.priority)
      .map((rule) => (
        <div key={rule.id} className={cn("rounded-md border p-2 text-xs", !rule.active && "opacity-50")}>
          <div className="font-mono">
            {rule.field.toLowerCase()} {rule.match.toLowerCase()} “{rule.pattern}”
          </div>
          <div className="text-muted-foreground">
            {rule.transactionCount} linked
            {DIRECTION_LABEL[rule.direction]}
            {rule.location && (
              <>
                {" · at "}
                <BankPlace.DetailLink object={rule.location} className="hover:underline">
                  {rule.location.name}
                </BankPlace.DetailLink>
              </>
            )}
            {!rule.active && " · inactive"}
          </div>
        </div>
      ))}
  </div>
);

const MerchantPage = asDetailQueryRoute(useGetMerchantQuery, ({ data }) => {
  const merchant = data.merchant;
  const { openDialog } = useDialog();
  const [place, setPlace] = useState<string | null>(null);
  const selected = merchant.locations.find((l) => l.id === place) ?? null;
  // Selecting a place narrows the transactions to it.
  const base = useMemo(
    () => (selected ? { locations: [selected.id] } : { merchants: [merchant.id] }),
    [merchant.id, selected?.id],
  );
  const { filters, ordering, actions } = useTransactionFilterBar(base);
  const located = merchant.locations.some(isLocated);

  return (
    <BankMerchant.ModelPage
      help={BANK_HELP.merchant}
      title={
        <span className="flex items-center gap-2">
          <MerchantLogo merchant={merchant} className="h-6 w-6" />
          {merchant.name}
        </span>
      }
      object={merchant}
      pageActions={
        <>
          {actions}
          <PageAction
            size="sm"
            collapse="icon"
            priority={-5}
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => openDialog("bankeditmerchant", { id: merchant.id }, { size: "medium" })}
          >
            Edit
          </PageAction>
          <PageAction
            size="sm"
            collapse="icon"
            priority={-10}
            icon={<MapPinPlus className="h-4 w-4" />}
            onClick={() => openDialog("bankplace", { merchant: merchant.id }, { size: "medium" })}
          >
            Add place
          </PageAction>
          <PageAction
            size="sm"
            collapse="icon"
            priority={-20}
            icon={<GitMerge className="h-4 w-4" />}
            onClick={() => openDialog("bankmergemerchant", { id: merchant.id }, { size: "small" })}
          >
            Merge into…
          </PageAction>
        </>
      }
      additionalSidebars={
        <>
          <Sidebars.Tab label="Info">
            <InfoList
              rows={[
                ["Category", merchant.category && <CategoryBadge category={merchant.category} />],
                [
                  "Website",
                  merchant.website && (
                    <a href={merchant.website} target="_blank" rel="noreferrer" className="truncate underline-offset-2 hover:underline">
                      {merchant.website.replace(/^https?:\/\//, "")}
                    </a>
                  ),
                ],
                ["Online only", merchant.online && "no physical stores"],
                ["First seen", merchant.firstSeen && formatDay(merchant.firstSeen)],
                ["Last seen", merchant.lastSeen && formatDay(merchant.lastSeen)],
                ["Key", <span className="font-mono text-xs">{merchant.key}</span>],
              ]}
            />
            <Aliases merchant={merchant} />
          </Sidebars.Tab>
          {merchant.rules.length > 0 && (
            <Sidebars.Tab label="Rules">
              <Rules merchant={merchant} />
            </Sidebars.Tab>
          )}
          <Sidebars.Tab label="Insights">
            <MerchantInsightsTab merchant={merchant.id} />
          </Sidebars.Tab>
          <Sidebars.Tab label="Similar">
            <SimilarMerchants id={merchant.id} />
          </Sidebars.Tab>
        </>
      }
      defaultSidebar="Info"
    >
      <div className="p-6 flex flex-col gap-6">
        <div className="flex flex-wrap items-baseline gap-6">
          {merchant.net.map((total) => (
            <Money key={total.currency} amount={total.amount} currency={total.currency} signed className="text-3xl font-semibold" />
          ))}
          <span className="text-sm text-muted-foreground">
            over {merchant.transactionCount} {merchant.transactionCount === 1 ? "transaction" : "transactions"}
          </span>
        </div>
        {merchant.description && <p className="whitespace-pre-wrap text-sm">{merchant.description}</p>}

        {located && (
          <LocationsMap
            locations={merchant.locations}
            color={merchant.category?.color}
            selected={place}
            onSelect={(id) => setPlace((current) => (current === id ? null : id))}
            className="h-72"
          />
        )}
        {merchant.locations.length > 0 && (
          <div className="flex flex-col gap-2">
            {merchant.locations.map((location) => (
              <PlaceRow
                key={location.id}
                location={location}
                selected={location.id === place}
                onSelect={() => setPlace((current) => (current === location.id ? null : location.id))}
              />
            ))}
          </div>
        )}

        <ReviewTransactionList
          filters={filters}
          ordering={ordering}
          defaultLimit={30}
          title={selected ? `At ${selected.name}` : "Transactions"}
        />
      </div>
    </BankMerchant.ModelPage>
  );
});

export default MerchantPage;
