import { Landmark, LineChart } from "lucide-react";
import { Provider } from "../api/graphql";

/** The icon of a provider kind: a bank for PSD2 consents, a chart for a broker. */
export const providerIcon = (kind: Provider) => (kind === Provider.Scalable ? LineChart : Landmark);
