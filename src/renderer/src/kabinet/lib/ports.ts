/** The parts of a port a one-line signature reads. */
export interface SignaturePort {
  key: string;
  label?: string | null;
  kind: string;
  identifier?: string | null;
  nullable: boolean;
}

/**
 * A port as one short word: a structure by the last part of its identifier
 * (`@mikro/image` → "image"), anything else by its kind ("int", "list"). A
 * port that may be empty ends in "?".
 */
export const portWord = (port: SignaturePort): string => {
  const base = port.identifier
    ? (port.identifier.split("/").pop() ?? port.identifier)
    : port.kind.toLowerCase();
  return port.nullable ? `${base}?` : base;
};

/** `image, int → table`; `→ table` when it takes nothing, `image →` when it returns nothing. */
export const signature = (
  args: readonly SignaturePort[],
  returns: readonly SignaturePort[],
): string => {
  const takes = args.map(portWord).join(", ");
  const gives = returns.map(portWord).join(", ");
  return `${takes} → ${gives}`.trim();
};
