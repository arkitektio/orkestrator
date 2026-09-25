/**
 * Offset pagination, as every service's schema spells it. Each service
 * generates its own identical `OffsetPaginationInput`; host code and lists
 * that are not tied to one service use this one instead of borrowing a
 * stranger's generated type.
 */
export type OffsetPaginationInput = {
  limit?: number | null;
  offset?: number;
};
