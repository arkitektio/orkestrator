import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { ScrollArea } from "@/core/ui/scroll-area";
import { BankConnection } from "@/bank/linkers";
import { useDebounce } from "@uidotdev/usehooks";
import { ChevronLeft, ChevronRight, Landmark, LineChart, Loader2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ListBankConnectionsDocument,
  Provider,
  useBankInstitutionsQuery,
  useResumeLinkMutation,
  useStartBankLinkMutation,
  useStartScalableLinkMutation,
} from "../api/graphql";
import { AuthSessionFlow } from "../auth/AuthSessionFlow";
import { Connection } from "../auth/useAuthSession";

export { parseRedirect } from "../auth/redirect";

const BackTitle = ({ children, onBack }: { children: React.ReactNode; onBack?: () => void }) => (
  <DialogTitle className="flex items-center gap-2">
    {onBack && (
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onBack} aria-label="Back">
        <ChevronLeft className="h-4 w-4" />
      </Button>
    )}
    {children}
  </DialogTitle>
);

/** Enable Banking, step one: which bank. */
const BankPicker = (props: {
  country: string;
  search: string;
  onCountry: (country: string) => void;
  onSearch: (search: string) => void;
  onPick: (bank: string) => void;
  onBack?: () => void;
}) => {
  const debouncedCountry = useDebounce(props.country, 300);
  const { data, loading, error } = useBankInstitutionsQuery({
    variables: { country: debouncedCountry },
    skip: debouncedCountry.length !== 2,
  });
  const banks = useMemo(() => {
    const needle = props.search.trim().toLowerCase();
    return (data?.bankInstitutions ?? []).filter((bank) => !needle || bank.name.toLowerCase().includes(needle));
  }, [data, props.search]);

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <BackTitle onBack={props.onBack}>Link a bank</BackTitle>
        <DialogDescription>
          Pick your bank and give read-only consent on its site. Accounts sync while the consent lasts.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-[5rem_1fr] gap-2">
        <Input
          aria-label="Country"
          value={props.country}
          maxLength={2}
          onChange={(e) => props.onCountry(e.target.value.toUpperCase())}
          className="text-center font-mono uppercase"
        />
        <Input placeholder="Search banks..." value={props.search} onChange={(e) => props.onSearch(e.target.value)} />
      </div>
      <ScrollArea className="h-80 rounded-md border">
        {loading && (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
        {error && <div className="p-3 text-xs text-destructive">{error.message}</div>}
        {!loading && !error && banks.length === 0 && (
          <div className="p-3 text-xs text-muted-foreground">
            {props.country.length === 2 ? "No bank matches." : "Enter a two-letter country code."}
          </div>
        )}
        <div className="flex flex-col p-1">
          {banks.map((bank) => (
            <button
              key={bank.name}
              type="button"
              onClick={() => props.onPick(bank.name)}
              className="flex items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              {bank.logo ? (
                <img src={bank.logo} alt="" className="h-6 w-6 shrink-0 rounded bg-white object-contain" />
              ) : (
                <Landmark className="h-6 w-6 shrink-0 p-1 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate">{bank.name}</span>
              {bank.maximumConsentDays && (
                <span className="shrink-0 text-xs text-muted-foreground">{bank.maximumConsentDays} days</span>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

const PROVIDERS = [
  {
    provider: Provider.Enablebanking,
    icon: Landmark,
    title: "Bank account",
    description: "Current and savings accounts at 2,500+ European banks, through PSD2 consent.",
  },
  {
    provider: Provider.Scalable,
    icon: LineChart,
    title: "Scalable Capital",
    description: "Your broker: depot positions, trades and cash, through a Scalable login.",
  },
];

const ProviderPicker = ({ onPick }: { onPick: (provider: Provider) => void }) => (
  <div className="flex flex-col gap-4">
    <DialogHeader>
      <DialogTitle>Link an account</DialogTitle>
      <DialogDescription>Access is read-only. Nothing can be paid or traded from here.</DialogDescription>
    </DialogHeader>
    <div className="flex flex-col gap-2">
      {PROVIDERS.map(({ provider, icon: Icon, title, description }) => (
        <button
          key={provider}
          type="button"
          onClick={() => onPick(provider)}
          className="group flex items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
        >
          <Icon className="h-6 w-6 shrink-0 text-muted-foreground" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium">{title}</span>
            <span className="text-xs text-muted-foreground">{description}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </button>
      ))}
    </div>
  </div>
);

/**
 * Link something new, or continue a pending login.
 *
 * - `resume`: a PENDING connection's id; picks up its stored session
 *   (`resumeLink`), whichever provider it is.
 * - `provider` skips the provider choice, `bank` (+ `country`) the bank
 *   choice: how a relink opens.
 *
 * Every provider ends in the same `AuthSessionFlow`; the session says how it
 * finishes (a code to approve, or the bank's consent page).
 */
export const LinkBankForm = (props: { provider?: Provider; country?: string; bank?: string; resume?: string }) => {
  const { closeDialog } = useDialog();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<Provider | null>(
    props.provider ?? (props.bank ? Provider.Enablebanking : null),
  );
  const [country, setCountry] = useState((props.country ?? "AT").toUpperCase());
  const [search, setSearch] = useState(props.bank ?? "");
  const [bank, setBank] = useState<string | null>(null);
  // Bumped to remount the flow for a fresh session.
  const [round, setRound] = useState(0);

  const refetchQueries = [ListBankConnectionsDocument];
  const [startBank] = useStartBankLinkMutation({ refetchQueries });
  const [startScalable] = useStartScalableLinkMutation({ refetchQueries });
  const [resumeLink] = useResumeLinkMutation();

  const done = (connection: Connection) => {
    closeDialog();
    navigate(BankConnection.linkBuilder(connection.id));
  };

  const openResume = useCallback(
    async () => (await resumeLink({ variables: { connection: props.resume! } })).data?.resumeLink,
    [resumeLink, props.resume],
  );
  const openBank = useCallback(
    async () => (await startBank({ variables: { input: { aspspName: bank!, country } } })).data?.startBankLink,
    [startBank, bank, country],
  );
  const openScalable = useCallback(async () => (await startScalable()).data?.startScalableLink, [startScalable]);

  if (props.resume) {
    return (
      <AuthSessionFlow
        key={round}
        title="Continue login"
        open={openResume}
        // A resumed session that ran out cannot be resumed again: start over.
        restart={() => closeDialog()}
        onDone={done}
      />
    );
  }

  if (provider === Provider.Scalable) {
    return (
      <AuthSessionFlow
        key={round}
        title="Scalable Capital"
        open={openScalable}
        restart={() => setRound((r) => r + 1)}
        onDone={done}
        header={
          <DialogDescription>
            Read-only access to your broker and depot: positions, trades and cash movements.
          </DialogDescription>
        }
      />
    );
  }

  if (provider === Provider.Enablebanking) {
    if (bank) {
      return (
        <AuthSessionFlow
          key={round}
          title={bank}
          open={openBank}
          restart={() => setBank(null)}
          onDone={done}
          header={
            <DialogDescription>
              <button type="button" className="underline-offset-2 hover:underline" onClick={() => setBank(null)}>
                Pick another bank
              </button>
            </DialogDescription>
          }
        />
      );
    }
    return (
      <BankPicker
        country={country}
        search={search}
        onCountry={setCountry}
        onSearch={setSearch}
        onPick={(name) => {
          setBank(name);
          setRound((r) => r + 1);
        }}
        onBack={props.provider || props.bank ? undefined : () => setProvider(null)}
      />
    );
  }

  return <ProviderPicker onPick={setProvider} />;
};

