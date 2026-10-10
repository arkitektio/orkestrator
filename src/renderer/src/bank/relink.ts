import { Provider } from "./api/graphql";

export type RelinkTarget = {
  provider: Provider;
  bankProvider?: { id: string } | null;
  aspspCountry: string;
  aspspName: string;
};

/**
 * What the link dialog opens on to relink `target`: its own provider (one of
 * its kind when it lost it), and for a bank its country and name, pre-searched.
 */
export const relinkProps = (target: RelinkTarget) => ({
  provider: target.bankProvider?.id,
  kind: target.provider,
  ...(target.provider === Provider.Scalable ? {} : { country: target.aspspCountry, bank: target.aspspName }),
});
