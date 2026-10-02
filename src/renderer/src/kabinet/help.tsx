import { PageHelp } from "@/core/layout/help";

/**
 * kabinet's page instructions, one per page, shown in the page's Help tab
 * (`help={KABINET_HELP.appStore}`). Each names only what its page really offers:
 * the button labels, menu entries and dialogs are the ones on screen.
 */
export const KABINET_HELP = {
  home: (
    <PageHelp
      intro="Kabinet is your organization’s app store. Apps come from GitHub repositories you add; this page shows the repositories, the newest actions they bring and the latest releases."
      steps={[
        <>Press <b>App Store</b> to browse every app and pick one to install.</>,
        <>Press <b>Add Repo</b> and enter a GitHub repository as “user/repo” (or paste its URL). Kabinet reads the repository and lists the apps it declares.</>,
        <>Press <b>Rescan Repos</b> to read all repositories again and pick up releases published since.</>,
        <>Press <b>Install</b> on a card under <b>Latest Releases</b> to allow that release to run as you.</>,
        <>Click a repository, action or release card to open its page.</>,
      ]}
      tips={[
        <>Adding a repository installs nothing on your machine. It only makes its apps available here.</>,
        <>The <b>Statistics</b> tab of the sidebar counts the repositories Kabinet knows.</>,
      ]}
    />
  ),
  appStore: (
    <PageHelp
      intro="Every app registered with your organization, with the actions it brings and the hardware it runs on. Come here to find an app and install it."
      steps={[
        <>Type into the search field to find an app by its name, its identifier or one of its actions.</>,
        <>Narrow the list with the chips <b>GPU accelerated</b>, <b>Runs on CPU</b> or <b>Deployed</b>, and reorder it with <b>Newest</b>, <b>Most actions</b> or <b>A–Z</b>.</>,
        <>Click an app tile to open its page with its actions, builds and versions.</>,
        <>Press <b>Get</b> on a tile to install the app’s latest release. The dialog lists what the app may do as you; confirm with <b>Authorize</b>.</>,
        <>The dialog then asks where to run it: choose a backend and press <b>Deploy</b> to actually start the app. An app you already authorized opens on this step.</>,
        <>Press <b>Add Repo</b> if the app you are looking for is not listed yet.</>,
      ]}
      tips={[
        <>Authorizing only gives permission. Nothing runs until you deploy the release to a backend.</>,
        <>A green “running” count on a tile means the app is already deployed somewhere.</>,
        <>If nothing matches, press <b>Reset filters</b> to see all apps again.</>,
      ]}
    />
  ),
  installRepo: (
    <PageHelp
      intro="You arrive here from an install link someone shared. The page names the GitHub repository the link points to and asks whether to add it to your Kabinet."
      steps={[
        <>Press <b>View on GitHub</b> to look at the repository before you decide.</>,
        <>Press <b>Add repo</b> to add it. You land on the repository’s page, where its apps are listed.</>,
        <>Press <b>Open repo</b> instead if the page says the repository is already tracked.</>,
      ]}
      tips={[
        <>Adding a repository only lets Kabinet read it and offer its apps. Nothing is installed on your machine.</>,
      ]}
    />
  ),
  repos: (
    <PageHelp
      intro="The GitHub repositories Kabinet reads apps from. Each repository publishes one or more apps."
      steps={[
        <>Press <b>Add Repo</b> and enter a repository as “user/repo”, or paste its GitHub URL.</>,
        <>Click a repository to see the builds found in it.</>,
        <>Right-click a repository and choose <b>Rescan Repository</b> to read it again.</>,
        <>Press <b>Rescan Repos</b> to rescan all of them at once.</>,
      ]}
    />
  ),
  repo: (
    <PageHelp
      intro="One GitHub repository and the flavours found in it. A flavour is one build of an app version for a particular kind of hardware, for example CUDA or plain CPU."
      steps={[
        <>Click a flavour card to see what it does, what it needs and where it runs.</>,
        <>Press <b>Rescan</b> after the repository published something new to pick up the new flavours.</>,
        <>Press <b>Copy install link</b> and send the link to a colleague. Opening it asks them to add this repository to their own Kabinet.</>,
        <>Press <b>Copy README badge</b> to get the same link as a badge for the repository’s README.</>,
        <>Press <b>Open Repo</b> or <b>Issues</b> to go to the repository on GitHub.</>,
      ]}
      tips={[
        <>The <b>Info</b> tab of the sidebar shows the branch, the owner, when the repository was last scanned, and for each flavour its image and the services it needs. A service marked with “?” is optional.</>,
      ]}
    />
  ),
  app: (
    <PageHelp
      intro="One app: what it can do, the builds it ships and every version that was released. Come here to judge an app before installing it."
      steps={[
        <>Read the <b>Actions</b> tab to see what the app adds. Click an action to open it.</>,
        <>Open <b>Flavours</b> to see the builds of the latest version and the hardware each one needs.</>,
        <>Open <b>Access</b> to check which services the app talks to and which permissions it requests.</>,
        <>Open <b>Versions</b> and click a version to look at an older release.</>,
        <>Press the <b>Install</b> button in the header (it names the latest version) to allow that version to run as you.</>,
      ]}
      tips={[
        <>The <b>Running</b> figure in the header counts the copies of this app that are deployed right now.</>,
      ]}
    />
  ),
  release: (
    <PageHelp
      intro="One version of an app. Installing a release gives it permission to run as you; deploying it starts it on a backend."
      steps={[
        <>Open <b>Access</b> first to see the services and permissions this version asks for.</>,
        <>Press the <b>Install</b> button in the header (it names the version), review the dialog and confirm with <b>Authorize</b>. The dialog then asks where to deploy it.</>,
        <>Press the <b>Deploy</b> button that appears next to it once the release is installed, choose a backend and confirm with <b>Deploy</b>.</>,
        <>Open <b>Approvals</b> to see who has allowed this release to run as them.</>,
        <>Click another version under <b>Versions</b> at the bottom to compare releases.</>,
      ]}
      tips={[
        <>The header button reads <b>Installed</b> once you have approved the release. Press it again to approve another deployer.</>,
        <>The menu at the right end of the page header offers the same <b>Install…</b> and <b>Deploy…</b> actions.</>,
        <>Every new version needs its own approval.</>,
      ]}
    />
  ),
  flavour: (
    <PageHelp
      intro="One build of an app version. The badges in the header say which hardware it needs, or “Any backend” when it runs anywhere."
      steps={[
        <>Read <b>Actions</b> to see what this build provides.</>,
        <>Open <b>Access</b> for the services it talks to and the permissions it requests.</>,
        <>Open <b>Source</b> for the container image it runs and the repository it was built from.</>,
        <>Open <b>Deployments</b> to see whether this build is running anywhere.</>,
        <>Press the <b>Install</b> button in the header (it names the version) to install the release this build belongs to.</>,
      ]}
      tips={[
        <>Hover a hardware badge to see whether it is required or only preferred.</>,
        <>Other builds of the same version are linked at the bottom of the page.</>,
      ]}
    />
  ),
  definition: (
    <PageHelp
      intro="One action that an app can provide, with its description and the flavours (builds) that include it."
      steps={[
        <>Read the description to learn what the action does.</>,
        <>Click a card under <b>Flavours</b> to open a build that provides this action. From there you can install it.</>,
      ]}
    />
  ),
  backend: (
    <PageHelp
      intro="A backend is a machine or container engine that runs deployed apps. This page lists what it is running and the resources it manages."
      steps={[
        <>Click a card under <b>Managed Pods</b> to open a running app and read its logs.</>,
        <>Click a card under <b>Managed Resources</b> to see what a resource hosts.</>,
        <>Open the menu at the right end of the page header and choose <b>Delete Backend</b> to remove a backend that is no longer in use.</>,
      ]}
    />
  ),
  pod: (
    <PageHelp
      intro="A pod is one running copy of an app on a backend. Come here to check that it started and to read what it logged."
      steps={[
        <>Read <b>Latest Logs</b> to see what the app printed most recently.</>,
        <>Check the badges under the title for the app, its version and the pod’s status, and <b>Quick Facts</b> for the backend and, under <b>Runs as</b>, the user the app is signed in as.</>,
        <>Click the approval link next to <b>Runs as</b> to open the permission this pod runs under.</>,
        <>Click the card under <b>Running On</b> to open the resource that hosts the pod.</>,
      ]}
    />
  ),
  pods: (
    <PageHelp
      intro="Every pod: the running copies of your deployed apps. A thin list, useful to see at a glance what is running and where."
      steps={[
        <>Click a pod to open it and read its logs.</>,
        <>Read the line under a pod’s name for its status and the backend it runs on.</>,
        <>Right-click a pod and choose <b>Delete Agent</b> to remove it.</>,
      ]}
    />
  ),
  resource: (
    <PageHelp
      intro="A resource is something a backend runs pods on. This page shows the pods it hosts and the properties it reports."
      steps={[
        <>Click a card under <b>Hosted Pods</b> to open a running app.</>,
        <>Read <b>Qualifiers</b> for the properties the resource reports about itself.</>,
      ]}
      tips={[
        <>The page refreshes itself every 15 seconds while it is visible.</>,
      ]}
    />
  ),
  approval: (
    <PageHelp
      intro="An approval is created when someone installs a release: it allows that release to run signed in as them. This page shows who approved, which deployer may start it and on which backends."
      steps={[
        <>Check the badge next to the app name: <b>Active</b>, <b>Release changed</b> or <b>Revoked</b>.</>,
        <>Press <b>Deploy</b> in the header to start the release on a backend. The button shows only on your own active approval.</>,
        <>Open the menu at the right end of the page header and choose <b>Revoke approval</b> to withdraw the permission.</>,
        <>Click the app name to open the release this approval is for.</>,
      ]}
      tips={[
        <><b>Release changed</b> means the release was published again with different permissions, requirements or images. Install it again to approve what it is now.</>,
        <>When revoking, leave <b>Also sign out the pods running under it now</b> switched on to stop running copies too.</>,
      ]}
    />
  ),
  approvals: (
    <PageHelp
      intro="The releases that people in your organization have allowed to run as them. Installing an app from the App Store creates an approval; revoking it takes the permission back."
      steps={[
        <>Click an approval to see who approved it, which deployer may start it and on which backends.</>,
        <>Right-click an approval and choose <b>Deploy…</b> to start its release on a backend.</>,
        <>Right-click an approval and choose <b>Revoke approval</b> to stop new deployments under it.</>,
        <>Switch on <b>Revoked</b> in the header to include approvals that were already revoked.</>,
      ]}
      tips={[
        <>The word at the top right of a card is its state: <b>Active</b>, <b>Release changed</b> or <b>Revoked</b>.</>,
      ]}
    />
  ),
};
