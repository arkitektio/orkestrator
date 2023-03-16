import { AdditionalMate, Mate } from "../rekuest/postman/mater/mater-context";

export type MateFinder = (
  type: string,
  isSelf: boolean
) => AdditionalMate[] | undefined;
