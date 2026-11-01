import { TermKind } from "@/kraph/api/graphql";
import { WordPicker } from "./WordPicker";

export type LabelInputProps = {
  onClaim: (term: string) => Promise<void> | void;
  /** Words already on this datum; they are not offered again. */
  excludeKeys?: readonly string[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

/**
 * Labelling as one gesture: type a word, press Enter. `assertEntityExists`
 * creates a word the organization has not used before.
 */
export const LabelInput = ({
  onClaim,
  excludeKeys,
  disabled,
  placeholder = "What is this? Type a word…",
  className,
}: LabelInputProps) => (
  <WordPicker
    kind={TermKind.Entity}
    onPick={(word) => onClaim(word.key)}
    excludeKeys={excludeKeys}
    clearOnPick
    disabled={disabled}
    placeholder={placeholder}
    ariaLabel="Label this datum"
    newWordLabel={(typed) => `Claim as “${typed}”`}
    className={className}
  />
);

export default LabelInput;
