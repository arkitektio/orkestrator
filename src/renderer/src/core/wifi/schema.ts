import { z } from "zod";
import type { WifiProfile } from "../../../../main/wifi/protocol";

/**
 * What a Wi-Fi profile must hold before it is saved or sent to a device
 * (ported from pokket's `lib/ble/validation.ts`). WPA2/3-Personal takes a
 * passphrase of 8–63 characters; eduroam (WPA2-Enterprise, PEAP/TTLS) takes
 * an identity and password, and a CA to check the RADIUS server against
 * unless that check is knowingly skipped.
 */

const ssid = z.string().min(1, "Enter the network name").max(32, "A network name has at most 32 bytes");
const institution = z.object({ id: z.string(), name: z.string(), country: z.string().nullish() }).nullish();

export const StandardWifiProfileSchema = z.object({
  id: z.string().min(1),
  type: z.literal("standard"),
  ssid,
  password: z
    .string()
    .min(8, "A WPA password has at least 8 characters")
    .max(63, "A WPA password has at most 63 characters"),
});

export const EduroamWifiProfileSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("eduroam"),
    ssid,
    identity: z.string().min(1, "Enter your eduroam identity (usually your e-mail address)"),
    password: z.string().min(1, "Enter your eduroam password"),
    anonymousIdentity: z.string().optional(),
    skipCertValidation: z.boolean().optional(),
    caPem: z.string().optional(),
    institution,
  })
  .superRefine((profile, ctx) => {
    if (profile.skipCertValidation) return;
    if (!profile.caPem) {
      ctx.addIssue({
        code: "custom",
        path: ["caPem"],
        message: "Pick your institution to fetch its certificate, paste one, or skip the check",
      });
      return;
    }
    if (!profile.caPem.includes("-----BEGIN CERTIFICATE-----") || !profile.caPem.includes("-----END CERTIFICATE-----")) {
      ctx.addIssue({ code: "custom", path: ["caPem"], message: "Not a PEM certificate (BEGIN/END CERTIFICATE)" });
    }
  });

export const WifiProfileSchema = z.discriminatedUnion("type", [StandardWifiProfileSchema, EduroamWifiProfileSchema]);

/** The problems with a profile, as one readable line; null when it is complete. */
export const wifiProfileProblem = (profile: WifiProfile): string | null => {
  const result = WifiProfileSchema.safeParse(profile);
  return result.success ? null : result.error.issues.map((issue) => issue.message).join("; ");
};

/** The name a profile is listed by. */
export const wifiProfileLabel = (profile: WifiProfile): string =>
  profile.type === "eduroam" && profile.institution ? `${profile.ssid} · ${profile.institution.name}` : profile.ssid;

/** The profile with only the fields its type uses (switching type leaves the others behind). */
export const normalizeWifiProfile = (profile: WifiProfile): WifiProfile =>
  profile.type === "standard"
    ? { id: profile.id, type: "standard", ssid: profile.ssid, password: profile.password }
    : {
        id: profile.id,
        type: "eduroam",
        ssid: profile.ssid,
        password: profile.password,
        identity: profile.identity,
        anonymousIdentity: profile.anonymousIdentity || undefined,
        skipCertValidation: profile.skipCertValidation || undefined,
        caPem: profile.skipCertValidation ? undefined : profile.caPem,
        institution: profile.institution ?? null,
      };
