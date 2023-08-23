import { useEffect, useState } from "react";
import { Drop, Mate, MateFinder } from "../../mates/types";
import { DisplayMate } from "./DisplayMate";

export interface SelfMatesProps {
  overItems: Drop[];
  self: Drop;
  withSelf: boolean;
  progress: (x: number | undefined) => Promise<void>;
  mateFinder?: MateFinder;
  onDone?: () => Promise<void>;
  onError?: (error: Error) => Promise<void>;
}

export const Mates = ({
  overItems,
  self,
  withSelf,
  progress,
  onDone,
  onError,
  mateFinder,
}: SelfMatesProps) => {
  const [moreMates, setMoreMates] = useState<Mate[] | undefined>();
  const [focusIndex, setFocusIndex] = useState<number>();

  useEffect(() => {
    if (mateFinder) {
      mateFinder({
        partners: overItems,
        self: self,
        partnersIncludeSelf: withSelf,
        justSelf: overItems.every(
          (item) => item.id === self.id && item.identifier == self.identifier
        ),
      })
        .then((mates) => {
          console.log("got mates", mates);
          setMoreMates(mates);
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }, []);

  useEffect(() => {
    const listener = {
      handleEvent: (e: KeyboardEvent) => {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          setFocusIndex((i) =>
            i === undefined || i >= (moreMates?.length || 0) - 1 ? 0 : i + 1
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
  }, [moreMates]);

  return (
    <>
      {moreMates && moreMates.length > 0 && (
        <div className="flex flex-row flex-wrap gap-2 mt-2">
          {moreMates?.map((mate: any, index: any) =>
            mate ? (
              <DisplayMate
                key={index}
                mate={mate}
                self={self}
                progress={progress}
                focus={focusIndex ? focusIndex === index : undefined}
                clickable={true}
                onDone={onDone}
                onError={onError}
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
