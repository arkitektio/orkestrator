import { useCheckBlokMutation, type EditBlokInput } from "@/rekuest/api/graphql";
import { useEffect, useRef, useState } from "react";
import type { ServerDiagnostic } from "./serverMarkers";

export type ServerCheck =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ok" }
  | { status: "warnings"; diagnostics: ServerDiagnostic[] }
  | { status: "refused"; error: unknown };

type Run<Input> = (input: Input) => Promise<ServerDiagnostic[]>;

/**
 * One check after the draft stops changing, and only the answer to the
 * latest draft counts: a slow answer to an older one is dropped. Plain, so it
 * can be driven by fake timers; `useServerCheck` is its React face.
 */
export const createCheckScheduler = <Input>(run: Run<Input>, onResult: (check: ServerCheck) => void, delay: number) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;

  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    generation += 1;
  };

  return {
    schedule: (input: Input | null) => {
      cancel();
      if (input === null) {
        onResult({ status: "idle" });
        return;
      }
      const mine = generation;
      timer = setTimeout(() => {
        timer = null;
        onResult({ status: "checking" });
        run(input).then(
          (diagnostics) => {
            if (mine !== generation) return;
            onResult(diagnostics.length ? { status: "warnings", diagnostics } : { status: "ok" });
          },
          (error: unknown) => {
            if (mine !== generation) return;
            onResult({ status: "refused", error });
          },
        );
      }, delay);
    },
    dispose: cancel,
  };
};

/**
 * The server's view of a draft, by `editBlok` with `dryRun`: every check it
 * runs on a save, nothing kept. `input` null (a draft that does not parse, a
 * blok not yet created) checks nothing.
 */
export const useServerCheck = (input: Omit<EditBlokInput, "dryRun"> | null, delay = 1000): ServerCheck => {
  const [check, setCheck] = useState<ServerCheck>({ status: "idle" });
  const [run] = useCheckBlokMutation({ fetchPolicy: "no-cache" });
  const scheduler = useRef<ReturnType<typeof createCheckScheduler<Omit<EditBlokInput, "dryRun">>> | null>(null);
  if (!scheduler.current) {
    scheduler.current = createCheckScheduler(
      async (variables) => {
        const { data } = await run({ variables: { input: { ...variables, dryRun: true } } });
        return data?.editBlok.diagnostics ?? [];
      },
      setCheck,
      delay,
    );
  }

  const key = input === null ? null : JSON.stringify(input);
  useEffect(() => {
    scheduler.current?.schedule(key === null ? null : (JSON.parse(key) as Omit<EditBlokInput, "dryRun">));
  }, [key]);
  useEffect(() => () => scheduler.current?.dispose(), []);

  return check;
};
