import { PaneLink, SidePaneGroup, SidePaneNav } from "@/core/ui/sidepane";
import { Home, Image } from "lucide-react";

export const NavigationPane = (_props: {}) => {
  return (
    <SidePaneNav columns={1}>
      <SidePaneGroup title="Bloks">
        <PaneLink to="/blok">
          <Home />
          Dashboard
        </PaneLink>
        <PaneLink to="/blok/dashboards">
          <Image />
          Dashboards
        </PaneLink>
        <PaneLink to="/blok/bloks">
          <Image />
          Bloks
        </PaneLink>
      </SidePaneGroup>
    </SidePaneNav>
  );
};

export default NavigationPane;
