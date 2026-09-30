import { CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { isoDate } from "../format";

/** The timeline route for the local day `iso` falls on. */
export const dayRoute = (iso: string) => `/lokate?day=${isoDate(new Date(iso))}`;

/** "Open day": the timeline of the day something happened on. */
export const DayLink = ({ at }: { at: string }) => (
  <Link to={dayRoute(at)} className="inline-flex items-center gap-1.5 text-sm hover:underline">
    <CalendarDays className="h-4 w-4" />
    Open day
  </Link>
);
