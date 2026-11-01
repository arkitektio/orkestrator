import type { Structure } from "@/core/types";
import { Button } from "@/core/ui/button";
import { useKraph } from "@/kraph/api/funcs";
import { TermKind } from "@/kraph/api/graphql";
import { measureTerm } from "@/kraph/lib/measureTerm";
import { useRecentTerms } from "@/kraph/lib/recentTerms";
import { termTint } from "@/kraph/lib/terms";
import { X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { WordPicker, type PickedWord } from "./WordPicker";

/** An individual that already exists, offered as what is being measured. */
export type KnownThing = {
  id: string;
  label: string;
  color?: readonly number[] | null;
  /** The datum is already recorded as evidence for it. */
  informed?: boolean;
};

export type SaidMeasures = {
  measure: PickedWord;
  thing: { new: PickedWord } | { known: KnownThing };
};

/** How a finished sentence reads, for a confirmation. */
export const readMeasures = ({ measure, thing }: SaidMeasures) =>
  `Measures the ${measure.label || measure.key} of ${
    "new" in thing ? thing.new.label || thing.new.key : thing.known.label
  }`;

/** One row per word: a word can be recent under several measurement words. */
const uniqueWords = (words: readonly PickedWord[]) => {
  const seen = new Set<string>();
  return words.filter((word) => !seen.has(word.key) && !!seen.add(word.key));
};

/**
 * The write behind the composer. A new thing goes into the recents as a whole
 * sentence, so the menu can offer saying it again in one click.
 */
export const useSayMeasures = (structures: readonly Structure[]) => {
  const client = useKraph();
  const recents = useRecentTerms();
  const { record } = recents;
  const say = useCallback(
    async ({ measure, thing }: SaidMeasures) => {
      await measureTerm(
        client,
        structures,
        "new" in thing
          ? thing.new.key
          : { id: thing.known.id, informed: thing.known.informed },
        measure.key,
      );
      if ("new" in thing) record({ ...thing.new, measure });
    },
    [client, structures, record],
  );
  return { say, recents: recents.terms };
};

/**
 * "This measures the [intensity profile] of [a sample]": two choices, in reading
 * order, and the sentence is said when the second is made. The thing is either a
 * word (a new individual of it) or one of `known`.
 *
 * `onSay` resolves whether it worked; on a failure the first choice stays, so the
 * sentence can be finished again without starting over.
 */
export const MeasuresComposer = ({
  known = [],
  target,
  onSay,
  disabled,
  autoFocus,
}: {
  /** Individuals to offer before a new one. */
  known?: readonly KnownThing[];
  /** The thing, already decided (it was dropped here): only the word is left to choose. */
  target?: KnownThing;
  onSay: (said: SaidMeasures) => Promise<boolean>;
  disabled?: boolean;
  autoFocus?: boolean;
}) => {
  const { terms } = useRecentTerms();
  const [measure, setMeasure] = useState<PickedWord | null>(null);

  const recentMeasures = useMemo(
    () => uniqueWords(terms.flatMap((term) => (term.measure ? [term.measure] : []))),
    [terms],
  );
  const recentThings = useMemo(() => uniqueWords(terms), [terms]);

  const say = async (said: SaidMeasures) => {
    if (await onSay(said)) setMeasure(null);
    return undefined;
  };

  if (!measure) {
    return (
      <WordPicker
        kind={TermKind.Measurement}
        recents={recentMeasures}
        onPick={(word) => (target ? say({ measure: word, thing: { known: target } }) : setMeasure(word))}
        disabled={disabled}
        autoFocus={autoFocus}
        eager={!!target}
        placeholder="What does it measure? Intensity profile, …"
        ariaLabel="What it measures"
        newWordHeading="New word"
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-w-0 flex-row flex-wrap items-center gap-1 text-sm">
        <span className="text-muted-foreground">Measures the</span>
        <span className="flex min-w-0 items-center gap-1 rounded-md border px-1.5 font-medium">
          <span className="truncate">{measure.label || measure.key}</span>
          <button
            type="button"
            aria-label="Choose another word"
            disabled={disabled}
            onClick={() => setMeasure(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
        <span className="text-muted-foreground">of</span>
      </div>

      {known.length > 0 ? (
        <div className="flex flex-row flex-wrap gap-1" aria-label="Already known on this datum">
          {known.map((thing) => (
            <Button
              key={thing.id}
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => say({ measure, thing: { known: thing } })}
            >
              <span
                className="mr-1.5 h-2 w-2 rounded-full"
                style={{ background: termTint(thing.color) }}
                aria-hidden
              />
              this {thing.label}
            </Button>
          ))}
        </div>
      ) : null}

      <WordPicker
        kind={TermKind.Entity}
        recents={recentThings}
        onPick={(word) => say({ measure, thing: { new: word } })}
        disabled={disabled}
        autoFocus
        placeholder={known.length > 0 ? "Or a new one: a sample, …" : "Of what? A sample, an AIS, …"}
        ariaLabel="What it is measured of"
        newWordLabel={(typed) => `A new “${typed}”`}
      />
    </div>
  );
};
