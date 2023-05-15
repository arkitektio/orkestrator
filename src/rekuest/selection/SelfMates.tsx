import { useEffect, useState } from "react";
import {
  Accept,
  AdditionalMate,
  Mate,
  MateOptions,
  Partner,
  useMater,
} from "../postman/mater/mater-context";
import { DisplayMate } from "./DisplayMate";

export interface SelfMatesProps<T extends Accept> {
  type: T;
  self: Partner;
  options?: MateOptions;
  progress: (x: number | undefined) => Promise<void>;
  additionalMates?:
    | ((type: T, isSelf: boolean) => AdditionalMate[] | undefined)
    | AdditionalMate[];
}

export const SelfMates = <T extends Accept>({
  type,
  self,
  options,
  progress,
  additionalMates,
}: SelfMatesProps<T>) => {
  const { reservations, calculateSelfMates } = useMater();
  const [selfMates, setSelfMates] = useState<Mate[] | undefined>();
  const [moreMates, setMoreMates] = useState<Mate[] | undefined>();
  const [focusIndex, setFocusIndex] = useState<number>();

  useEffect(() => {
    if (typeof additionalMates === "function") {
      setMoreMates(
        additionalMates(type, true)?.map((m) => ({ accepts: [type], ...m }))
      );
    } else {
      setMoreMates(
        additionalMates &&
          additionalMates.map((m) => ({ accepts: [type], ...m }))
      );
    }
  }, [type]);

  useEffect(() => {
    if (type) {
      setSelfMates(calculateSelfMates(type, self));
    }
  }, [reservations, type]);

  useEffect(() => {
    const listener = {
      handleEvent: (e: KeyboardEvent) => {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          setFocusIndex((i) =>
            i === undefined ||
            i >= (moreMates?.length || 0) + (selfMates?.length || 0) - 1
              ? 0
              : i + 1
          );
        }
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          setFocusIndex((i) => (i === undefined || i <= 0 ? 0 : i - 1));
        }
      },
    };
    document.addEventListener("keydown", listener);

    return () => {
      document.removeEventListener("keydown", listener);
    };
  }, [moreMates, selfMates]);

  return (
    <>
      {selfMates && selfMates.length > 0 && (
        <div className="flex flex-row flex-wrap gap-2">
          {selfMates?.map((mate: any, index: any) =>
            mate ? (
              <DisplayMate
                key={index}
                mate={mate}
                self={self}
                progress={progress}
                options={options}
                focus={focusIndex === index}
              />
            ) : (
              <>hmmm</>
            )
          )}
        </div>
      )}
      {moreMates && moreMates.length > 0 && (
        <div className="flex flex-row flex-wrap gap-2 mt-2">
          {moreMates?.map((mate: any, index: any) =>
            mate ? (
              <DisplayMate
                key={index}
                mate={mate}
                self={self}
                progress={progress}
                options={options}
                focus={
                  focusIndex
                    ? focusIndex - (selfMates?.length || 0) === index
                    : undefined
                }
              />
            ) : (
              <>hmmm</>
            )
          )}
        </div>
      )}
    </>
  );
};
