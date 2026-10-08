import type { ReactNode } from "react";

import { PageHelp } from "@/core/layout/help";

/**
 * The settings sections' instructions, by section slug (`sections.ts`), shown
 * in each section's Help tab. Each names only what its page really offers.
 */
export const SETTINGS_HELP: Record<string, ReactNode> = {
  account: (
    <PageHelp
      intro="The account this window is signed in with, and the ways to leave or change it."
      steps={[
        <>Press <b>Switch account</b> to use another login. Both stay signed in.</>,
        <>Press <b>Sign out</b> to end this session. The account stays in the switcher, so signing back in is quick.</>,
        <>Press <b>Remove this account</b> to forget the login on this computer.</>,
      ]}
      tips={[
        <>Removing an account only forgets it here. The account itself is not deleted.</>,
        <>If signing in fails, <b>Can’t connect?</b> leads to the connection checks.</>,
      ]}
    />
  ),
  general: (
    <PageHelp
      intro="Everyday behaviour of the app, and a few recent features you can switch off if they get in the way."
      steps={[
        <>Switch <b>Hover previews</b> off if the detail card that appears when hovering over items distracts you.</>,
        <>Switch <b>Menu prefetching</b> off if right-click menus misbehave. They then load when opened instead of on hover.</>,
        <>Switch <b>Live tasks in the sidebar</b> on to see running tasks at the bottom of the rail from every page.</>,
      ]}
      tips={[
        <>Changes are saved as you make them.</>,
      ]}
    />
  ),
  appearance: (
    <PageHelp
      intro="How the app looks: light or dark, its colours, how large content is drawn and how the sidebar sits over your desktop."
      steps={[
        <>Under <b>Colour</b>, choose light or dark mode and the brand colours the app is tinted with.</>,
        <>Switch <b>Scene theme sync</b> on to tint the app to the main layer’s colormap while a scene or image is open.</>,
        <>Under <b>Size</b>, zoom the page content in or out. The sidebar keeps its size.</>,
        <>Switch <b>Translucent sidebar</b> on to let the desktop show through the sidebar, and set how much.</>,
      ]}
    />
  ),
  renderer: (
    <PageHelp
      intro="How much memory 3D scenes may use on this computer. Orkestrator detects the graphics card when it first starts and picks limits from it."
      steps={[
        <><b>This computer</b> lists what was detected. Press <b>Detect again</b> after changing the graphics card or the memory.</>,
        <>Under <b>Graphics memory</b>, leave <b>Automatic</b> on, or switch it off and enter your own limit in MB.</>,
        <>Under <b>Image data cache</b>, do the same for the system memory that holds unpacked image data.</>,
      ]}
      tips={[
        <>Raise the graphics memory limit if a large scene stays blurry in places. Lower it if other applications run short.</>,
        <>A new graphics memory limit applies to scenes opened afterwards; a new cache limit after a restart.</>,
      ]}
    />
  ),
  telemetry: (
    <PageHelp
      intro="What Orkestrator learns about this computer, and what a bug report you file says about it. Nothing is sent by itself."
      steps={[
        <>Leave <b>Detect this computer's hardware</b> on to let Orkestrator size 3D scenes to your graphics card. Switch it off to forget what was detected.</>,
        <>Leave <b>Attach hardware details to bug reports</b> on to include those details in the text of a report. The list below the switch shows exactly what would be included.</>,
      ]}
      tips={[
        <>Both are on until you switch them off.</>,
        <>A bug report opens as a GitHub issue in your browser. You can edit its text before submitting, and it is public afterwards.</>,
      ]}
    />
  ),
  voice: (
    <PageHelp
      intro="Dictate into the command palette and text fields instead of typing. Speech is recognized on this computer."
      steps={[
        <>Switch <b>Enable voice input</b> on. The speech model downloads the first time it is needed.</>,
        <>Pick your <b>Microphone</b>, the <b>Speech model</b> and the <b>Language</b> you speak.</>,
        <>Set <b>Stop after silence (seconds)</b> to decide how long a pause ends listening. 0 keeps listening until you stop it.</>,
      ]}
      tips={[
        <>Voice input is off by default.</>,
      ]}
    />
  ),
  palette: (
    <PageHelp
      intro="The command palette (⌘K) finds pages, objects and actions by name. Here you decide which actions sit at its top, and the shortcut that opens it from anywhere on your computer."
      steps={[
        <>Type into the search field to find an action by title, description or id.</>,
        <>Press <b>Pin</b> next to an action to show it first in the palette, before anything is typed.</>,
        <>Press <b>Unpin</b> to remove it from the top again.</>,
        <>Enable the system-wide <b>Shortcut</b> to open the palette while another application is in front.</>,
      ]}
      tips={[
        <>Actions marked <b>Always</b> are pinned by the app and cannot be unpinned.</>,
        <>The system-wide shortcut is only available in the desktop app.</>,
      ]}
    />
  ),
  services: (
    <PageHelp
      intro="The services your deployment provides, and whether this computer can reach each of them. Start here when a part of the app says its service is unavailable."
      steps={[
        <>Read the service list to see which services are reachable and which are not.</>,
        <>Under <b>Connection doctor</b>, press <b>Run diagnostics</b> to check every address from this computer: name lookup, connection, certificate and answer.</>,
        <>Press <b>Inspect Configuration</b> to see the configuration this app received from the deployment.</>,
        <>Press <b>Report Status</b> to tell the deployment which services this computer can reach.</>,
      ]}
      tips={[
        <>A <b>Configuration issues</b> box means the deployment did not announce a service a module expects. That is for the administrator to fix.</>,
        <>The doctor changes nothing unless you ask it to.</>,
      ]}
    />
  ),
  mesh: (
    <PageHelp
      intro="A mesh is the private network of the organisation you are signed in to. When a deployment’s services are only reachable inside it, the app joins the mesh for you."
      steps={[
        <>Read the status to see whether the mesh is <b>Connected</b>, <b>Connecting</b>, <b>Awaiting approval</b> or <b>Not running</b>.</>,
        <>Use the switch to turn the mesh off or on for this computer.</>,
        <>Look through the machines to see which ones are online, and ping one to test the path to it.</>,
      ]}
      tips={[
        <>“Not needed” means every service is reached directly, so the mesh stays off.</>,
        <>If membership has lapsed, sign out of the profile and sign in again to rejoin.</>,
      ]}
    />
  ),
  developer: (
    <PageHelp
      intro="Application updates, and tools for looking under the hood when something goes wrong."
      steps={[
        <>Under <b>Application updates</b>, check for a new version and choose the <b>Update channel</b>.</>,
        <>Press <b>Open DevTools</b> to see console logs. Useful to attach to a bug report.</>,
        <>Toggle <b>Debug mode</b> to show extra diagnostic detail across the app.</>,
        <>Under <b>View as roles</b>, preview the app as a user with fewer roles.</>,
      ]}
      tips={[
        <><b>View as roles</b> only changes what this window shows, and only until restart. The server still decides what you may do.</>,
      ]}
    />
  ),
  reset: (
    <PageHelp
      intro="Erase everything Orkestrator stored on this computer and restart as if freshly installed. Use it as a last resort when the app is stuck in a broken state."
      steps={[
        <>Press <b>Reset Orkestrator…</b> and read what will be removed.</>,
        <>Type the confirmation word shown in the dialog and press <b>Erase and restart</b>. Every window closes and the app relaunches empty.</>,
      ]}
      tips={[
        <>This cannot be undone. It forgets every account, all settings and pinned tabs, cached data, mesh connections and downloaded voice models on this computer. Nothing on your servers is touched.</>,
      ]}
    />
  ),
};
