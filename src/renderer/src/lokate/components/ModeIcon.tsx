import { Bike, Car, Footprints, Route, type LucideIcon } from "lucide-react";
import { TripMode } from "../api/graphql";

export const MODE_ICONS: Record<TripMode, LucideIcon> = {
  [TripMode.Walk]: Footprints,
  [TripMode.Bike]: Bike,
  [TripMode.Vehicle]: Car,
  [TripMode.Unknown]: Route,
};

/** How a trip was travelled, as the phone classified it. */
export const ModeIcon = ({ mode, className }: { mode: TripMode; className?: string }) => {
  const Icon = MODE_ICONS[mode] ?? Route;
  return <Icon className={className} aria-hidden />;
};
