import React from "react";

/**
 * How many notifications each contributor to the Notifications widget is
 * showing, so the widget can say "No new notifications" once for all of
 * them. Contributors (a module's `notifications` slot section) report with
 * `useReportNotificationCount`; the widget reads the total.
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
