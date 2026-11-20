import React from "react";

/**
 * How many notifications each contributor to "Needs you" on the home page is
 * showing, so the block is drawn only when one of them shows any.
 * Contributors (a module's `notifications` slot section) report with
 * `useReportNotificationCount`; the home page reads the total.
 */
type Counts = { report: (key: string, count: number) => void };

const NotificationCountContext = React.createContext<Counts | null>(null);

export const NotificationCountProvider = ({
  children,
  onTotal,
}: {
  children: React.ReactNode;
  onTotal: (total: number) => void;
}) => {
  const counts = React.useRef(new Map<string, number>());
  const value = React.useMemo<Counts>(
    () => ({
      report: (key, count) => {
        counts.current.set(key, count);
        onTotal([...counts.current.values()].reduce((sum, n) => sum + n, 0));
      },
    }),
    [onTotal],
  );
  return <NotificationCountContext.Provider value={value}>{children}</NotificationCountContext.Provider>;
};

export const useReportNotificationCount = (key: string, count: number) => {
  const counts = React.useContext(NotificationCountContext);
  React.useEffect(() => {
    counts?.report(key, count);
    return () => counts?.report(key, 0);
  }, [counts, key, count]);
};
