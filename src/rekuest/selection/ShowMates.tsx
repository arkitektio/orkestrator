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

export interface ShowMatesProps<T extends Accept> {
  type: T;
  self: Partner;
  options?: MateOptions;
  progress: (x: number | undefined) => Promise<void>;
  additionalMates?:
    | ((type: T, isSelf: boolean) => AdditionalMate[] | undefined)
    | AdditionalMate[];
}

export const ShowMates = <T extends Accept>({
  type,
  self,
  options,
  progress,
  additionalMates,
}: ShowMatesProps<T>) => {
  const { reservations, calculateMates } = useMater();
  const [selfMates, setSelfMates] = useState<Mate[] | undefined>();
  const [moreMates, setMoreMates] = useState<Mate[] | undefined>();

  useEffect(() => {
    if (typeof additionalMates === "function") {
      setMoreMates(
        additionalMates(type, false)?.map((m) => ({ accepts: [type], ...m }))
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
      setSelfMates(calculateMates(type, self));
    }
  }, [reservations, type]);

  return (
    <>
      {selfMates && selfMates.length > 0 && (
        <div className="grid gap-2 grid-cols-1 @md:grid-cols-2 mt-2">
          {selfMates?.map((mate: any, index: any) =>
            mate ? (
              <DisplayMate
                key={index}
                mate={mate}
                progress={progress}
                self={self}
                options={options}
              />
            ) : (
              <>hmmm</>
            )
          )}
        </div>
      )}
      {moreMates && moreMates.length > 0 && (
        <div className="grid gap-2 grid-cols-1 @lg:grid-cols-2 mt-2">
          {moreMates?.map((mate: any, index: any) =>
            mate ? (
              <DisplayMate
                progress={progress}
                key={index}
                mate={mate}
                self={self}
                options={options}
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
