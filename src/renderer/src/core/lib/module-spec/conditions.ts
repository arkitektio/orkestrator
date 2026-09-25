/**
 * Condition language: when an action applies to the current selection.
 * Frozen core of manifest v1 — new condition types are additive, and a host
 * that meets a type it does not know treats the action as not applying.
 */

export type IdentifierActive = {
  type: "identifier";
  optional?: boolean;
  identifier: string;
};

export type MixtureActive = {
  type: "mixture";
  identifiers: string[];
};

export type PartnerIdentifierActive = {
  type: "pidentifier";
  identifier: string;
};

export type PartnerMixtureActive = {
  type: "pmixture";
  identifiers: string[];
};

export type ObjectHomogenous = {
  type: "homogenous";
};

export type PartnerHomogenous = {
  type: "phomogenous";
};

export type PartnerActive = {
  type: "partner";
  partner: string;
};

export type PartnerIsNull = {
  type: "nopartner";
};

export type HasPartner = {
  type: "haspartner";
};

export type OnRoute = {
  type: "onroute";
  route: string;
};

export type CommandSelect = {
  type: "command";
  command: boolean;
};

/**
 * At least one selected structure is a *datum* — something a scientist makes
 * claims about (see `SmartRegistry.isDatum`). The organization-scoped claims
 * (labelling, sameness) apply to every datum alike, so an action over them
 * would otherwise have to enumerate every datum identifier in the registry.
 */
export type DatumActive = {
  type: "datum";
};

/** The partner (right) side holds at least one datum. */
export type PartnerDatumActive = {
  type: "pdatum";
};

export type Condition =
  | IdentifierActive
  | PartnerActive
  | CommandSelect
  | PartnerIsNull
  | ObjectHomogenous
  | HasPartner
  | OnRoute
  | PartnerIdentifierActive
  | PartnerHomogenous
  | MixtureActive
  | PartnerMixtureActive
  | DatumActive
  | PartnerDatumActive;

