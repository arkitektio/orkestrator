import { Mate, MateFinder } from "./types";

export type SingleMateFinder<T> = (
  type: T,
  isSelf: boolean
) => Mate[] | undefined;

export function composeMates(mateFunctions: MateFinder[]): MateFinder {
  return async (options) => {
    let allmates: Mate[] = [];
    console.log("Reducing mates", mateFunctions);

    for (const f of mateFunctions) {
      const mates = await f(options);
      console.log("Got mates", mates);
      if (mates) {
        allmates.push(...mates);
      }
    }

    console.log("Returning mates", allmates);

    return allmates;
  };
}
