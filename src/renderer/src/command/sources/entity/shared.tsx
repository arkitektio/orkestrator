/** Server-side cap per entity type, so one noisy type cannot flood the list. */
export const PER_TYPE_LIMIT = 5;

/** Below this, a search matches most of the database and helps nobody. */
export const MIN_TERM_LENGTH = 2;

export const GroupHeading = ({ children }: { children: React.ReactNode }) => (
  <span className="font-light text-xs w-full items-center ml-2">{children}</span>
);
