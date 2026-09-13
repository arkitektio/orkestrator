import * as React from "react";
import ReactTimestamp from "react-timestamp";

/**
 * Memoized `react-timestamp`.
 *
 * The upstream component is a plain function component, so every card that
 * re-renders re-runs its date formatting even though `date` / `relative`
 * rarely change. Import `Timestamp` from here instead of "react-timestamp".
 */
export type TimestampProps = React.ComponentProps<typeof ReactTimestamp>;

const Timestamp = React.memo(ReactTimestamp) as React.NamedExoticComponent<TimestampProps>;
Timestamp.displayName = "Timestamp";

export default Timestamp;
