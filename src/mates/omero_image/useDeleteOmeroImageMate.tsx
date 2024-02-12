import { withOmeroArk } from "@jhnnsrs/omero-ark";
import { useDeleteImageMutation } from "../../omero-ark/api/graphql";
import { buildDeleteMate } from "../generics/buildDeleteMate";

export const useDeleteOmeroImageMate = buildDeleteMate(
  withOmeroArk(useDeleteImageMutation)
);
