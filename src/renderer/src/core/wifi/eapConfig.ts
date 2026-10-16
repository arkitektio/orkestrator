/**
 * Reading an eduroam CAT `eap-config` file (the EAPIdentityProviderList XML
 * every institution publishes) for what a device needs: the CA that signs the
 * RADIUS server's certificate and the outer (anonymous) identity. The CA is
 * base64 DER in the XML; it is wrapped as PEM here.
 */

export type EapConfig = {
  displayName: string | null;
  /** Every CA the institution lists, as PEM; the first is what a device is given. */
  caPems: string[];
  /** The outer identity to send unencrypted, e.g. `anonymous@uni.example`. */
  anonymousIdentity: string | null;
  /** IEEE EAP method types offered (25 PEAP, 21 TTLS, 13 TLS). */
  eapTypes: number[];
};

/** Elements by local name, in any namespace or none (CAT files use both). */
const byLocalName = (root: Document | Element, name: string): Element[] =>
  Array.from(root.getElementsByTagNameNS("*", name));

export const derToPem = (base64: string): string => {
  const body = base64.replace(/\s/g, "");
  if (body.startsWith("-----BEGIN")) return base64.trim();
  const lines = body.match(/.{1,64}/g) ?? [];
  return ["-----BEGIN CERTIFICATE-----", ...lines, "-----END CERTIFICATE-----"].join("\n");
};

export const parseEapConfig = (xml: string): EapConfig => {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("The institution's configuration is not valid XML.");
  const providers = byLocalName(doc, "EAPIdentityProvider");
  if (!providers.length) throw new Error("The institution's configuration names no identity provider.");
  const provider = providers[0];

  const caPems = byLocalName(provider, "CA")
    .filter((ca) => (ca.getAttribute("format") ?? "X.509") === "X.509" && ca.textContent?.trim())
    .map((ca) => derToPem(ca.textContent!));

  const outer = byLocalName(provider, "OuterIdentity")[0]?.textContent?.trim() || null;
  const displayName = byLocalName(provider, "DisplayName")[0]?.textContent?.trim() || null;
  const eapTypes = byLocalName(provider, "EAPMethod")
    .map((method) => Number(byLocalName(method, "Type")[0]?.textContent))
    .filter((type) => Number.isFinite(type));

  return { displayName, caPems, anonymousIdentity: outer, eapTypes: [...new Set(eapTypes)] };
};
