import type { OffsetPaginationInput } from "@/rekuest/api/graphql";

/**
 * What a `ListRender` list asks for when its page names no pagination: the
 * first page it shows (`ListRender`'s own `limit` defaults to 20). Without
 * it the first request asks for the whole list.
 */
export const FIRST_PAGE: OffsetPaginationInput = { limit: 20, offset: 0 };
