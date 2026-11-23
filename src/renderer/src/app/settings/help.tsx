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
  experiments: (
    <PageHelp
      intro="Recent features, on by default. Switch one off if it gets in the way: the app then works as it did before that feature landed."
      steps={[
        <>Switch <b>Menu prefetching</b> off if right-click menus misbehave. They then load when opened instead of on hover.</>,
        <>Switch <b>Annotation hover button</b> off to stop the button that follows the pointer over annotations in a scene.</>,
        <>Switch <b>Live tasks in the sidebar</b> off to see running tasks only on their own page.</>,
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
        <>Under <b>Menus</b>, choose how strongly the right-click menu lifts off the page.</>,
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
  reports: (
    <PageHelp
      intro="What a bug report you file carries, and who it goes to. There is no telemetry: nothing is sent by itself."
      steps={[
        <>Leave <b>Detect this computer's hardware</b> on to let Orkestrator size 3D scenes to your graphics card. Switch it off to forget what was detected.</>,
        <>Under “Bug reports”, switch each part a report may carry on or off: <b>Screenshot</b>, <b>Recent errors</b>, <b>Failed requests</b>, <b>Steps before the report</b>, <b>Console warnings and errors</b>, <b>Request variables</b> and <b>What the page loaded</b>.</>,
        <>Leave <b>Attach hardware details to bug reports</b> on to include those details in a report. The list below the switch shows exactly what would be included.</>,
      ]}
      tips={[
        <>Everything is on until you switch it off, except <b>What the page loaded</b>, which is off.</>,
        <>A bug report goes to the admins of your organization. Press <b>Debug yourself</b> in the report to see each part and change it for that one report.</>,
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
      intro="The command palette (⌘K) finds pages, objects and actions by name. Here you decide which actions sit at its top."
      steps={[
        <>Type into the search field to find an action by title, description or id.</>,
        <>Press <b>Pin</b> next to an action to show it first in the palette, before anything is typed.</>,
        <>Press <b>Unpin</b> to remove it from the top again.</>,
      ]}
      tips={[
        <>Actions marked <b>Always</b> are pinned by the app and cannot be unpinned.</>,
        <>The shortcut that opens the palette from any app is under <b>Keyboard shortcuts</b>.</>,
      ]}
    />
  ),
  shortcuts: (
    <PageHelp
      intro="Every keyboard shortcut in the app. Some you can change; the rest are listed so you know they are taken."
      steps={[
        <>Under <b>Yours to change</b>, click a shortcut and press the new combination. Esc cancels.</>,
        <>Press <b>Reset</b> to go back to the default, or <b>Turn off</b> to have no shortcut at all.</>,
        <>Under <b>Global shortcut</b>, set the combination that opens the quick bar while another application is in front.</>,
      ]}
      tips={[
        <>A combination another shortcut already uses is refused, with what uses it.</>,
        <>The dictation key is changed under <b>Voice input</b>.</>,
        <>The global shortcut is only available in the desktop app.</>,
      ]}
    />
  ),
  connection: (
    <PageHelp
      intro="Whether this window's live connections are up. Start here when the yellow sign next to the agent in the sidebar shows, or tasks stop updating."
      steps={[
        <>Read <b>Agent</b> to see whether apps you run can reach you here. Turn the switch on its card to engage or disengage.</>,
        <>Read <b>Live updates</b> to see whether tasks, their events, agents and states arrive in this window. While they do not, <b>Why</b> says what went wrong.</>,
        <>Press the copy button next to <b>Session</b> to copy its id for a bug report.</>,
      ]}
      tips={[
        <>Tasks keep running while live updates are down. Back within the <b>Catch-up window</b>, this window gets exactly what it missed.</>,
        <>Click the yellow sign next to the agent in the sidebar to come here.</>,
      ]}
    />
  ),
  hub: (
    <PageHelp
      intro="The hub this app is connected to, the services it grants, and how this computer reaches each one. Start here when a part of the app says its service is unavailable."
      steps={[
        <>Read the <b>Services</b> list: each row says how this computer reaches the service (encrypted or not, directly or through the mesh) and whether it answers.</>,
        <>Click a service to open its page, with its address, release, the hub's own word on it and its configuration.</>,
        <>On a service's page, press <b>Run diagnostics</b> under <b>Connection doctor</b> to check only that service's addresses.</>,
        <>Open <b>Optional services not granted</b> to see what this app could also use, but the hub does not grant.</>,
        <>Press <b>Inspect Configuration</b> to see the configuration this app received from the hub, or <b>Report Status</b> to tell the hub which services this computer can reach.</>,
      ]}
      tips={[
        <>A <b>Configuration issues</b> box means the hub did not grant a service a module expects. That is for the administrator to fix.</>,
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
  updates: (
    <PageHelp
      intro="Which version of Orkestrator runs on this computer, and getting the next one."
      steps={[
        <>Check for a new version, and choose the <b>Update channel</b> it comes from.</>,
      ]}
    />
  ),

  developer: (
    <PageHelp
      intro="Tools for looking under the hood when something goes wrong."
      steps={[
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
