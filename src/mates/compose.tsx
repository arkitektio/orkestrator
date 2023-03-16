import { AdditionalMate, Mate } from "../rekuest/postman/mater/mater-context";
import { MateFinder } from "./types";

export type SingleMateFinder<T> = (
  type: T,
  isSelf: boolean
) => Mate[] | undefined;

export function composeMates(mateFunctions: MateFinder[]): MateFinder {
  console.log("Reducing mates", mateFunctions);
  return (type: string, isSelf: boolean) =>
    mateFunctions.reduce((acc, f) => {
      const mates = f(type, isSelf);
      if (mates) {
        acc.push(...mates);
      }
      return acc;
    }, [] as AdditionalMate[]);
}
