import { PaneLink, SidePaneGroup } from "@/core/ui/sidepane";
import { Outlet } from "react-router-dom";
import { SETTINGS_GROUPS, SETTINGS_SECTIONS, settingsLink } from "../sections";

/**
 * Settings as a settings app draws them: a fixed column of sections on the
 * left, the chosen section on the right. The column is the same nav the rail's
 * module cards use, laid out vertically, so it reads as the same chrome.
 */
export const SettingsNav = () => (
  <nav
    aria-label="Settings sections"
    className="flex w-52 shrink-0 flex-col overflow-y-auto border-r border-border bg-sidebar/40 p-3 text-xs"
  >
    <div className="px-2 pb-3 text-sm font-semibold">Settings</div>
    {SETTINGS_GROUPS.map((group) => (
      <SidePaneGroup key={group.key} title={group.title}>
        {SETTINGS_SECTIONS.filter((section) => section.group === group.key).map(
          ({ slug, label, icon: Icon }) => (
            <PaneLink key={slug} to={settingsLink(slug)}>
              <Icon />
              {label}
            </PaneLink>
          ),
        )}
      </SidePaneGroup>
    ))}
  </nav>
);

export const SettingsLayout = () => (
  <div className="flex h-full min-h-0 w-full flex-row">
    <SettingsNav />
    <div className="min-w-0 flex-1">
      <Outlet />
    </div>
  </div>
);

export default SettingsLayout;
