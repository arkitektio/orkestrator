import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { Spinner } from "@/core/ui/spinner";
import { Switch } from "@/core/ui/switch";
import { Textarea } from "@/core/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { Check, GraduationCap } from "lucide-react";
import { useState } from "react";
import type { EduroamInstitution, EduroamProfileRef, WifiProfile } from "../../../../main/wifi/protocol";
import { normalizeWifiProfile, wifiProfileProblem } from "./schema";
import { fetchEapConfig, useEduroamSearch } from "./useWifi";

type Props = {
  initial?: WifiProfile;
  /** Gets the complete, validated profile. */
  onSubmit: (profile: WifiProfile) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
};

const newId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();

const Field = ({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <Label>{label}</Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

/**
 * Picks an eduroam institution from the directory and reads its eap-config:
 * the CA and the outer identity a device needs.
 */
const InstitutionPicker = ({
  profile,
  onPicked,
}: {
  profile: WifiProfile;
  onPicked: (patch: Partial<WifiProfile>) => void;
}) => {
  const [query, setQuery] = useState("");
  const { results, loading, error } = useEduroamSearch(query);
  const [fetching, setFetching] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const pick = async (institution: EduroamInstitution, ref: EduroamProfileRef) => {
    setFetching(ref.id);
    setFetchError(null);
    try {
      const config = await fetchEapConfig(ref.eapconfigEndpoint);
      if (!config.caPems.length) throw new Error("The institution publishes no CA certificate; paste one or skip the check.");
      onPicked({
        institution: { id: institution.id, name: institution.name, country: institution.country },
        caPem: config.caPems[0],
        anonymousIdentity: profile.anonymousIdentity || config.anonymousIdentity || undefined,
        skipCertValidation: false,
      });
      setQuery("");
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e));
    } finally {
      setFetching(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {profile.institution && (
        <p className="flex items-center gap-1.5 text-sm">
          <Check className="size-4 text-emerald-600" />
          {profile.institution.name}
          {profile.institution.country && <span className="text-muted-foreground">({profile.institution.country})</span>}
        </p>
      )}
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={profile.institution ? "Search another institution…" : "Search your institution…"}
      />
      {loading && <Spinner />}
      {(error || fetchError) && <p className="text-xs text-destructive">{error ?? fetchError}</p>}
      {results.length > 0 && (
        <div className="flex max-h-56 flex-col overflow-y-auto rounded-md border">
          {results.flatMap((institution) =>
            institution.profiles.map((ref) => (
              <button
                key={`${institution.id}/${ref.id}`}
                type="button"
                disabled={!!fetching}
                onClick={() => void pick(institution, ref)}
                className="flex items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
              >
                {fetching === ref.id ? <Spinner /> : <GraduationCap className="size-4 text-muted-foreground" />}
                <span className="truncate">{institution.name}</span>
                {ref.name !== institution.name && <span className="truncate text-muted-foreground">· {ref.name}</span>}
                {institution.country && <span className="ml-auto text-xs text-muted-foreground">{institution.country}</span>}
              </button>
            )),
          )}
        </div>
      )}
    </div>
  );
};

/** A standard (WPA-Personal) or eduroam (WPA-Enterprise) Wi-Fi profile. */
export const WifiProfileForm = ({ initial, onSubmit, onCancel, submitLabel = "Save" }: Props) => {
  const [profile, setProfile] = useState<WifiProfile>(
    initial ?? { id: newId(), type: "standard", ssid: "", password: "" },
  );
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const patch = (p: Partial<WifiProfile>) => setProfile((current) => ({ ...current, ...p }));
  const problem = wifiProfileProblem(profile);
  const eduroam = profile.type === "eduroam";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (problem) return;
    setSaving(true);
    try {
      await onSubmit(normalizeWifiProfile(profile));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <ToggleGroup
        type="single"
        variant="outline"
        value={profile.type}
        onValueChange={(type) => {
          if (type === "eduroam") patch({ type, ssid: profile.ssid || "eduroam" });
          else if (type === "standard") patch({ type });
        }}
      >
        <ToggleGroupItem value="standard">Password (WPA)</ToggleGroupItem>
        <ToggleGroupItem value="eduroam">eduroam / Enterprise</ToggleGroupItem>
      </ToggleGroup>

      {eduroam && (
        <Field label="Institution" hint="Fills in the certificate and outer identity from the eduroam directory.">
          <InstitutionPicker profile={profile} onPicked={patch} />
        </Field>
      )}

      <Field label="Network name (SSID)">
        <Input value={profile.ssid} onChange={(e) => patch({ ssid: e.target.value })} autoComplete="off" />
      </Field>

      {eduroam && (
        <Field label="Identity" hint="Usually your e-mail address at the institution.">
          <Input value={profile.identity ?? ""} onChange={(e) => patch({ identity: e.target.value })} autoComplete="off" />
        </Field>
      )}

      <Field label="Password">
        <Input
          type="password"
          value={profile.password ?? ""}
          onChange={(e) => patch({ password: e.target.value })}
          autoComplete="new-password"
        />
      </Field>

      {eduroam && (
        <>
          <Field label="Outer identity" hint="Sent unencrypted before the tunnel is up, e.g. anonymous@uni.example. Optional.">
            <Input
              value={profile.anonymousIdentity ?? ""}
              onChange={(e) => patch({ anonymousIdentity: e.target.value || undefined })}
              autoComplete="off"
            />
          </Field>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Skip certificate check</Label>
              <p className="text-xs text-muted-foreground">
                The device then trusts any server claiming to be eduroam. Only for testing.
              </p>
            </div>
            <Switch
              checked={!!profile.skipCertValidation}
              onCheckedChange={(skipCertValidation) => patch({ skipCertValidation })}
            />
          </div>
          {!profile.skipCertValidation && (
            <Field label="CA certificate (PEM)">
              <Textarea
                value={profile.caPem ?? ""}
                onChange={(e) => patch({ caPem: e.target.value || undefined })}
                rows={4}
                className="font-mono text-xs"
                placeholder="-----BEGIN CERTIFICATE-----"
              />
            </Field>
          )}
        </>
      )}

      {touched && problem && <p className="text-sm text-destructive">{problem}</p>}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saving}>
          {saving && <Spinner />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};
