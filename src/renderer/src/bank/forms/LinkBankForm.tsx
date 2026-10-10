import { AuthFlow } from "@/core/authflow/AuthFlow";
import type { AuthSession } from "@/core/authflow/types";
import { ADMIN_ROLE, useHasRoles } from "@/core/connection/roles";
import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { ScrollArea } from "@/core/ui/scroll-area";
import { BankConnection } from "@/bank/linkers";
import { useDebounce } from "@uidotdev/usehooks";
import { ChevronLeft, ChevronRight, Landmark, Loader2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ListBankConnectionsDocument,
  ListBankProviderFragment,
  Provider,
  useBankInstitutionsQuery,
  useListBankProvidersQuery,
  useResumeAuthMutation,
  useStartLinkMutation,
} from "../api/graphql";
import { sessionOf } from "@/core/authflow/contract";
import { providerIcon } from "../components/providerKind";
import { errorMessageOf } from "../errors";

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

/** A provider with institutions (Enable Banking), step one: which bank. */
const BankPicker = (props: {
  provider: string;
  country: string;
  search: string;
  onCountry: (country: string) => void;
  onSearch: (search: string) => void;
  onPick: (bank: string) => void;
  onBack?: () => void;
}) => {
  const debouncedCountry = useDebounce(props.country, 300);
  const { data, loading, error } = useBankInstitutionsQuery({
    variables: { provider: props.provider, country: debouncedCountry },
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

/** Which of the organization's providers to link through. */
const ProviderPicker = ({
  providers,
  onPick,
}: {
  providers: ListBankProviderFragment[];
  onPick: (provider: ListBankProviderFragment) => void;
}) => (
  <div className="flex flex-col gap-4">
    <DialogHeader>
      <DialogTitle>Link an account</DialogTitle>
      <DialogDescription>Access is read-only. Nothing can be paid or traded from here.</DialogDescription>
    </DialogHeader>
    <div className="flex flex-col gap-2">
      {providers.map((provider) => {
        const Icon = providerIcon(provider.kind);
        return (
          <button
            key={provider.id}
            type="button"
            onClick={() => onPick(provider)}
            className="group flex items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
          >
            <Icon className="h-6 w-6 shrink-0 text-muted-foreground" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">{provider.name}</span>
              <span className="text-xs text-muted-foreground">{provider.kindInfo.description}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </button>
        );
      })}
    </div>
  </div>
);

/** Nothing to link through yet: an admin sets a provider up first. */
const NoProvider = ({ kind }: { kind?: Provider }) => {
  const { openDialog } = useDialog();
  const admin = useHasRoles(ADMIN_ROLE);
  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>No provider set up</DialogTitle>
        <DialogDescription>
          Banks and brokers are linked through a provider your organization sets up once, such as an Enable Banking
          application or Scalable Capital.{" "}
          {admin ? "Set one up, then link your accounts through it." : "Ask an admin of your organization to set one up."}
        </DialogDescription>
      </DialogHeader>
      {admin && (
        <Button className="self-start" onClick={() => openDialog("bankcreateprovider", { kind }, { size: "medium" })}>
          Set up a provider
        </Button>
      )}
    </div>
  );
};

/**
 * Link something new, or continue a pending login.
 *
 * - `resume`: the `state` of a login still to be finished (a connection's
 *   `pendingAuth`); picks it up again (`resumeAuth`), whichever provider it is.
 * - `provider` (a provider's id) skips the provider choice; `kind` narrows it
 *   to the providers of one kind. `bank` (+ `country`) pre-searches the bank:
 *   how a relink opens.
 *
 * A link goes through one of the providers the organization set up
 * (`bankProviders`); a single candidate is picked without asking. Every
 * provider ends in the host's `AuthFlow`; the session says how it
 * finishes (a code to approve, or the bank's consent page).
 */
export const LinkBankForm = (props: {
  provider?: string;
  kind?: Provider;
  country?: string;
  bank?: string;
  resume?: string;
}) => {
  const { closeDialog } = useDialog();
  const navigate = useNavigate();
  const [picked, setPicked] = useState<string | null>(props.provider ?? null);
  const [country, setCountry] = useState((props.country ?? "AT").toUpperCase());
  const [search, setSearch] = useState(props.bank ?? "");
  const [bank, setBank] = useState<string | null>(null);
  // Bumped to remount the flow for a fresh session.
  const [round, setRound] = useState(0);

  const providers = useListBankProvidersQuery({
    variables: { filters: { enabled: true } },
    fetchPolicy: "cache-and-network",
    skip: !!props.resume,
  });
  const [startLink] = useStartLinkMutation({ refetchQueries: [ListBankConnectionsDocument] });
  const [resumeAuth] = useResumeAuthMutation();

  const done = (session: AuthSession) => {
    closeDialog();
    if (session.result) navigate(BankConnection.linkBuilder(session.result.id));
  };

  const candidates = useMemo(
    () => (providers.data?.bankProviders ?? []).filter((p) => !props.kind || p.kind === props.kind),
    [providers.data, props.kind],
  );
  // The asked-for provider may be gone or disabled: then the choice is offered again.
  const provider = candidates.find((p) => p.id === picked) ?? (candidates.length === 1 ? candidates[0] : null);
  const providerId = provider?.id;
  const withBank = !!provider?.kindInfo.hasInstitutions;

  const openResume = useCallback(
    async () => {
      const session = (await resumeAuth({ variables: { state: props.resume! } })).data?.resumeAuth;
      return session && sessionOf(session);
    },
    [resumeAuth, props.resume],
  );
  const openLink = useCallback(
    async () => {
      const session = (
        await startLink({
          variables: { input: { provider: providerId!, ...(withBank ? { institution: bank, country } : {}) } },
        })
      ).data?.startLink;
      return session && sessionOf(session);
    },
    [startLink, providerId, withBank, bank, country],
  );

  if (props.resume) {
    return (
      <AuthFlow
        flow="bank"
        key={round}
        title="Continue login"
        open={openResume}
        // A resumed session that ran out cannot be resumed again: start over.
        restart={() => closeDialog()}
        onDone={done}
      />
    );
  }

  if (!providers.data) {
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Link an account</DialogTitle>
          {providers.error && (
            <DialogDescription className="text-destructive">{errorMessageOf(providers.error)}</DialogDescription>
          )}
        </DialogHeader>
        {providers.error ? (
          <Button className="self-start" size="sm" onClick={() => providers.refetch()}>
            Try again
          </Button>
        ) : (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>
    );
  }

  if (candidates.length === 0) return <NoProvider kind={props.kind} />;

  if (!provider) {
    return (
      <ProviderPicker
        providers={candidates}
        onPick={(next) => {
          setPicked(next.id);
          setBank(null);
          setRound((r) => r + 1);
        }}
      />
    );
  }

  const back = candidates.length > 1 ? () => setPicked(null) : undefined;

  if (withBank && !bank) {
    return (
      <BankPicker
        provider={provider.id}
        country={country}
        search={search}
        onCountry={setCountry}
        onSearch={setSearch}
        onPick={(name) => {
          setBank(name);
          setRound((r) => r + 1);
        }}
        onBack={back}
      />
    );
  }

  return (
    <AuthFlow
      flow="bank"
      key={round}
      title={bank ?? provider.name}
      open={openLink}
      restart={() => (withBank ? setBank(null) : setRound((r) => r + 1))}
      onDone={done}
      header={
        withBank ? (
          <DialogDescription>
            <button type="button" className="underline-offset-2 hover:underline" onClick={() => setBank(null)}>
              Pick another bank
            </button>
          </DialogDescription>
        ) : (
          <DialogDescription>{provider.kindInfo.description}</DialogDescription>
        )
      }
    />
  );
};
