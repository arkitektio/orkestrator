import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { ChoicesField } from "@/core/forms/ChoicesField";
import { IntField } from "@/core/forms/IntField";
import { ParagraphField } from "@/core/forms/ParagraphField";
import { StringField } from "@/core/forms/StringField";
import { SwitchField } from "@/core/forms/SwitchField";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { Switch } from "@/core/ui/switch";
import { BankProvider } from "@/bank/linkers";
import { ChevronLeft, ChevronRight, FileKey } from "lucide-react";
import { useRef, useState } from "react";
import { useForm, useFormContext, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  BankProviderFragment,
  ListBankProvidersDocument,
  Provider,
  ProviderCapability,
  ProviderKindFragment,
  useCreateEnableBankingProviderMutation,
  useCreateScalableProviderMutation,
  useGetBankProviderQuery,
  useProviderKindsQuery,
  useUpdateEnableBankingProviderMutation,
  useUpdateProviderMutation,
} from "../api/graphql";
import { providerIcon } from "../components/providerKind";
import { errorMessageOf } from "../errors";

type Values = {
  name: string;
  enabled: boolean;
  appId: string;
  privateKey: string;
  redirectUrls: string;
  consentDays: string | number;
  psuType: string;
  capabilities: ProviderCapability[];
  dailySyncLimit: string | number | null;
};

const PSU_OPTIONS = [
  { label: "Personal", value: "personal", description: "Private accounts" },
  { label: "Business", value: "business", description: "Company accounts" },
];

/** One URL per line, as the list the API takes. */
const urlsOf = (text: string) =>
  text
    .split(/\s+/)
    .map((url) => url.trim())
    .filter(Boolean);

/** An empty limit is "unlimited" (null); anything else a whole number. */
const limitOf = (value: Values["dailySyncLimit"]) =>
  value === null || value === "" || Number.isNaN(Number(value)) ? null : Math.max(0, Math.round(Number(value)));

/** What every kind takes, as the API wants it; null when a field was refused. */
const common = (form: ReturnType<typeof useForm<Values>>, data: Values) => {
  if (!data.name.trim()) {
    form.setError("name", { message: "Give the provider a name." });
    return null;
  }
  return { name: data.name.trim(), capabilities: data.capabilities, dailySyncLimit: limitOf(data.dailySyncLimit) };
};

/** The Enable Banking settings; `keyRequired` is false when a stored key may stay. */
const enableBanking = (form: ReturnType<typeof useForm<Values>>, data: Values, keyRequired: boolean) => {
  const consentDays = Math.round(Number(data.consentDays));
  if (!data.appId.trim()) {
    form.setError("appId", { message: "The application id from the Enable Banking control panel." });
    return null;
  }
  if (keyRequired && !data.privateKey.trim()) {
    form.setError("privateKey", { message: "Paste the application's private key, or load its .pem file." });
    return null;
  }
  if (!(consentDays > 0)) {
    form.setError("consentDays", { message: "A consent lasts at least one day." });
    return null;
  }
  return { appId: data.appId.trim(), consentDays, psuType: data.psuType, urls: urlsOf(data.redirectUrls) };
};

/** The private key: pasted, or read from the application's `.pem` file. */
const PrivateKeyField = ({ fingerprint }: { fingerprint?: string }) => {
  const form = useFormContext<Values>();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <ParagraphField
        name="privateKey"
        label="Private key"
        placeholder={"-----BEGIN PRIVATE KEY-----\n…"}
        description={
          fingerprint
            ? `Leave empty to keep the stored key (${fingerprint}). It is stored encrypted and never shown again.`
            : "The text of the application's .pem file. It is stored encrypted and never shown again."
        }
      />
      <input
        ref={input}
        type="file"
        accept=".pem,.key,text/plain"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) form.setValue("privateKey", await file.text(), { shouldDirty: true, shouldValidate: true });
        }}
      />
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => input.current?.click()}>
        <FileKey className="h-4 w-4" /> Load .pem file
      </Button>
    </div>
  );
};

/** What the kind can do, each switched on or off for this provider. */
const CapabilitiesField = ({ kind }: { kind: ProviderKindFragment }) => {
  const form = useFormContext<Values>();
  const enabled = useWatch({ control: form.control, name: "capabilities" });
  if (kind.capabilities.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Capabilities</span>
      {kind.capabilities.map((info) => (
        <label key={info.capability} className="flex items-center justify-between gap-4 text-sm">
          <span className="flex min-w-0 flex-col">
            <span>{info.label}</span>
            <span className="text-xs text-muted-foreground">{info.description}</span>
          </span>
          <Switch
            checked={enabled.includes(info.capability)}
            onCheckedChange={(on) =>
              form.setValue(
                "capabilities",
                on ? [...enabled, info.capability] : enabled.filter((c) => c !== info.capability),
                { shouldDirty: true },
              )
            }
          />
        </label>
      ))}
    </div>
  );
};

/** The fields of a provider of `kind`; the same for a new one and an existing one. */
const ProviderFields = ({ kind, fingerprint }: { kind: ProviderKindFragment; fingerprint?: string }) => (
  <>
    <StringField name="name" label="Name" description="What your organization calls it." />
    {kind.kind === Provider.Enablebanking && (
      <>
        <StringField
          name="appId"
          label="Application id"
          placeholder="00000000-0000-0000-0000-000000000000"
          description="From the application's page in the Enable Banking control panel."
        />
        <PrivateKeyField fingerprint={fingerprint} />
        <div className="grid grid-cols-2 gap-3">
          <IntField name="consentDays" label="Consent days" description="How long a new consent is requested for." />
          <ChoicesField name="psuType" label="Account holders" options={PSU_OPTIONS} />
        </div>
        <ParagraphField
          name="redirectUrls"
          label="Redirect URLs"
          placeholder="https://…/auth/callback/bank"
          description="One per line, the default first. Empty: those registered for the application at Enable Banking."
        />
      </>
    )}
    <CapabilitiesField kind={kind} />
    <IntField
      name="dailySyncLimit"
      label="Syncs per account per day"
      placeholder="unlimited"
      description="Empty for no limit."
    />
  </>
);

const NewProvider = ({ kind, onBack }: { kind: ProviderKindFragment; onBack?: () => void }) => {
  const navigate = useNavigate();
  const refetchQueries = [ListBankProvidersDocument];
  const [createEnableBanking, eb] = useCreateEnableBankingProviderMutation({ refetchQueries });
  const [createScalable, scalable] = useCreateScalableProviderMutation({ refetchQueries });
  const loading = eb.loading || scalable.loading;
  const options = { successMessage: `${kind.label} set up` };
  const submitEnableBanking = useGraphQLDialog(createEnableBanking, {
    ...options,
    onSuccess: (data) => data && navigate(BankProvider.linkBuilder(data.createEnableBankingProvider.id)),
  });
  const submitScalable = useGraphQLDialog(createScalable, {
    ...options,
    onSuccess: (data) => data && navigate(BankProvider.linkBuilder(data.createScalableProvider.id)),
  });

  const form = useForm<Values>({
    defaultValues: {
      name: kind.label,
      enabled: true,
      appId: "",
      privateKey: "",
      redirectUrls: "",
      consentDays: 90,
      psuType: "personal",
      capabilities: kind.capabilities.map((info) => info.capability),
      dailySyncLimit: kind.defaultDailySyncLimit ?? null,
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          const base = common(form, data);
          if (!base) return;
          if (kind.kind !== Provider.Enablebanking) return submitScalable({ variables: { input: base } });
          const settings = enableBanking(form, data, true);
          if (!settings) return;
          const { urls, ...rest } = settings;
          return submitEnableBanking({
            variables: {
              input: { ...base, ...rest, privateKey: data.privateKey, redirectUrls: urls.length ? urls : null },
            },
          });
        })}
        className="flex flex-col gap-4"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {onBack && (
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onBack} aria-label="Back">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            Set up {kind.label}
          </DialogTitle>
          <DialogDescription>{kind.description}</DialogDescription>
        </DialogHeader>
        <ProviderFields kind={kind} />
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? "Setting up..." : "Set up provider"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

/**
 * Set up a provider for the organization (admins): pick a kind the server can
 * run (`providerKinds`), then give it what that kind needs. `kind` skips the
 * choice.
 */
export const CreateProviderForm = (props: { kind?: Provider }) => {
  const { data, error, refetch } = useProviderKindsQuery();
  const [picked, setPicked] = useState<Provider | null>(props.kind ?? null);

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 text-sm">
        <span className="text-destructive">{errorMessageOf(error)}</span>
        <Button size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const kinds = data.providerKinds;
  const kind = kinds.find((k) => k.kind === picked) ?? (kinds.length === 1 ? kinds[0] : null);
  if (kind) {
    return <NewProvider key={kind.kind} kind={kind} onBack={kinds.length > 1 ? () => setPicked(null) : undefined} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Set up a provider</DialogTitle>
        <DialogDescription>
          A provider is how your organization reaches banks and brokers. Members link their accounts through it.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        {kinds.map((option) => {
          const Icon = providerIcon(option.kind);
          return (
            <button
              key={option.kind}
              type="button"
              onClick={() => setPicked(option.kind)}
              className="group flex items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
            >
              <Icon className="h-6 w-6 shrink-0 text-muted-foreground" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

const EditProvider = ({ provider }: { provider: BankProviderFragment }) => {
  const settings = provider.enableBanking;
  const [updateEnableBanking, eb] = useUpdateEnableBankingProviderMutation();
  const [updateProvider, any] = useUpdateProviderMutation();
  const loading = eb.loading || any.loading;
  const submitEnableBanking = useGraphQLDialog(updateEnableBanking, { successMessage: "Provider saved" });
  const submitProvider = useGraphQLDialog(updateProvider, { successMessage: "Provider saved" });

  const form = useForm<Values>({
    defaultValues: {
      name: provider.name,
      enabled: provider.enabled,
      appId: settings?.appId ?? "",
      privateKey: "",
      redirectUrls: settings?.redirectUrls.join("\n") ?? "",
      consentDays: settings?.consentDays ?? 90,
      psuType: settings?.psuType ?? "personal",
      capabilities: provider.capabilities,
      dailySyncLimit: provider.dailySyncLimit ?? null,
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          const base = common(form, data);
          if (!base) return;
          const input = { id: provider.id, enabled: data.enabled, ...base };
          if (!settings) return submitProvider({ variables: { input } });
          const next = enableBanking(form, data, false);
          if (!next) return;
          const { urls, ...rest } = next;
          return submitEnableBanking({
            variables: {
              input: {
                ...input,
                ...rest,
                // Omitted, not emptied: the stored key and the registered URLs stay.
                privateKey: data.privateKey.trim() ? data.privateKey : undefined,
                redirectUrls: urls.length ? urls : undefined,
              },
            },
          });
        })}
        className="flex flex-col gap-4"
      >
        <DialogHeader>
          <DialogTitle>Edit {provider.name}</DialogTitle>
          <DialogDescription>{provider.kindInfo.description}</DialogDescription>
        </DialogHeader>
        <SwitchField
          name="enabled"
          label="Enabled"
          description="A disabled provider starts no links and syncs nothing."
        />
        <ProviderFields kind={provider.kindInfo} fingerprint={settings?.keyFingerprint} />
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

/** Change a provider (admins): its name, settings, capabilities, or whether it is on. */
export const EditProviderForm = (props: { id: string }) => {
  const { data, error } = useGetBankProviderQuery({ variables: { id: props.id } });
  if (error) return <p className="text-sm text-destructive">{errorMessageOf(error)}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return <EditProvider provider={data.bankProvider} />;
};
