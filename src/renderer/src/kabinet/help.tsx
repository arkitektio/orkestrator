import { PageHelp } from "@/core/layout/help";

/**
 * kabinet's page instructions, one per page, shown in the page's Help tab
 * (`help={KABINET_HELP.appStore}`). Each names only what its page really offers:
 * the button labels, menu entries and dialogs are the ones on screen.
 */
export const KABINET_HELP = {
  home: (
    <PageHelp
      intro="Kabinet is your organization’s app store. Apps come from GitHub repositories you add; this page shows the apps you installed and the newest apps in the App Store, and every Kabinet page is in the sidebar, under Overview."
      steps={[
        <>Open the <b>Overview</b> tab of the sidebar and click a page (<b>App Store</b>, <b>Repos</b>, <b>Releases</b>, <b>Pods</b>, …) to open it.</>,
        <>Press <b>App Store</b> to browse every app and pick one to install.</>,
        <>Press <b>Add Repo</b> and enter a GitHub repository as “user/repo” (or paste its URL). Kabinet reads the repository and lists the apps it declares.</>,
        <>Press <b>Rescan Repos</b> to read all repositories again and pick up releases published since.</>,
        <>Look at <b>Your apps</b> for the apps you installed, running ones first; click one to open its page, or <b>All pods</b> to see what runs on your engines and read the logs.</>,
        <>Under <b>Fresh in the App Store</b>, the newest app you do not have yet is shown large: press <b>Install</b> to get it or <b>Explore</b> to open its page. Press <b>Get</b> on a card below it to install that app, or <b>Open App Store</b> to browse and search every app.</>,
      ]}
      tips={[
        <>Adding a repository installs nothing on your machine. It only makes its apps available here.</>,
        <>The number next to <b>Repos</b> in the sidebar counts the repositories Kabinet knows.</>,
      ]}
    />
  ),
  appStore: (
    <PageHelp
      intro="Every app registered with your organization, with the actions and bloks it brings and the hardware it runs on, the bloks your repositories publish and the bloks made in your organization. Come here to find an app or a blok and install it."
      steps={[
        <>Type into the search field to find an app by its name, its identifier or one of its actions.</>,
        <>Narrow the list with the chips <b>GPU accelerated</b>, <b>Runs on CPU</b>, <b>Deployed</b> or <b>Bloks</b>, and reorder it with <b>Newest</b>, <b>Most actions</b> or <b>A–Z</b>.</>,
        <>Click an app tile to open its page with its actions, builds and versions.</>,
        <>Press <b>Get</b> on a tile to install the app’s latest release. The dialog lists what the app may do as you; confirm with <b>Authorize</b>.</>,
        <>The dialog then asks where to run it: choose a backend and press <b>Deploy</b> to actually start the app. An app you already authorized opens on this step.</>,
        <>Press <b>Bloks</b> to see the panels and scenes on offer. One from an app comes with it: <b>Get app</b> installs the app. One made in your organization is installed on its own: <b>Install</b> asks which agents it draws from.</>,
        <>A blok <b>From repositories</b> is published on GitHub. <b>Install</b> makes it a blok of your organization and then asks which agents it draws from. When its repository changes it, the tile says <b>Update</b>; once it is installed, <b>Materialize</b> binds it to agents again.</>,
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
      intro="You arrive here from an install link or an “Open in Arkitekt” badge. The page names the app’s published package and asks whether to import it into your Kabinet."
      steps={[
        <>Press <b>View on GitHub</b> to look at the app’s source before you decide.</>,
        <>Press <b>Import</b> to import it. You land on the app’s page, or in the app store when the package holds several apps.</>,
        <>If the import fails because the package is private, ask whoever published the app to make it public: Kabinet reads packages anonymously.</>,
      ]}
      tips={[
        <>Importing a package only lets Kabinet read its releases and offer them. Nothing is installed on your machine.</>,
        <>Importing one you already have reads it again and picks up new releases.</>,
      ]}
    />
  ),
  repos: (
    <PageHelp
      intro="The GitHub repositories Kabinet reads apps and bloks from. A repository publishes apps (in .arkitekt/deployments.yaml), bloks (in .arkitekt/bloks.yaml), or both."
      steps={[
        <>Press <b>Add Repo</b> and enter a repository as “user/repo”, or paste its GitHub URL. <b>Import from registry</b> adds a package published to a container registry instead.</>,
        <>Press the magnifier in the header and type to narrow the list; the search stays in the page’s address, so a narrowed list can be shared.</>,
        <>Click a repository to see the builds found in it.</>,
        <>Right-click a repository and choose <b>Rescan Repository</b> to read it again.</>,
        <>Press <b>Rescan Repos</b> to rescan all of them at once.</>,
      ]}
    />
  ),
  repo: (
    <PageHelp
      intro="One GitHub repository: the flavours found in it and the bloks it publishes. A flavour is one build of an app version for a particular kind of hardware, for example CUDA or plain CPU."
      steps={[
        <>Click a flavour card to see what it does, what it needs and where it runs.</>,
        <>Press <b>Rescan</b> after the repository published something new to pick up the new flavours and bloks.</>,
        <>Under <b>Bloks</b>, press <b>Install</b> on a blok to make it a blok of your organization, or <b>Update</b> when the repository changed one you installed.</>,
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
        <>Open <b>Bloks</b> (shown when the app brings any) to see its logo, the logos of its actions, its panels and scenes drawn against their demo state, and the files it brings. Pick a build at the top when there are several.</>,
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
        <>Open <b>Bloks</b> (shown when the app brings any) to see its logo, the logos of its actions, its panels and scenes drawn against their demo state, and the files it brings.</>,
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
      intro="One action that an app can provide, as its releases declare it: what it does, what it takes and returns, and the flavours (builds) that include it."
      steps={[
        <>Read the description to learn what the action does.</>,
        <>Read <b>Takes</b> and <b>Returns</b> for its inputs and outputs. A type ending in “?” may be left empty.</>,
        <>Click a card under <b>Flavours</b> to open a build that provides this action. From there you can install it.</>,
      ]}
      tips={[
        <>The <b>Info</b> tab of the sidebar shows the action’s hash; press the copy button next to it to copy it.</>,
      ]}
    />
  ),
  backend: (
    <PageHelp
      intro="A backend is a machine or container engine that runs deployed apps. This page lists what it is running and the resources it manages."
      steps={[
        <>Click a card under <b>Pods</b> to open a running app and read its logs.</>,
        <>Click a card under <b>Resources</b> to see what a resource hosts.</>,
        <>Open the menu at the right end of the page header and choose <b>Delete Backend</b> to remove a backend that is no longer in use.</>,
      ]}
      tips={[
        <>The line under the name says the kind of engine, who connected it and how its pods are doing. The <b>Info</b> tab of the sidebar adds its client.</>,
      ]}
    />
  ),
  pod: (
    <PageHelp
      intro="A pod is one running copy of an app on a backend. Come here to check that it started and to read what it logged."
      steps={[
        <>Read the line under the app name for the pod’s status and the backend it runs on.</>,
        <>Under <b>About</b>, read the backend, resource, release, flavour and deployment; click one to open it. The <b>Info</b> tab of the sidebar adds the pod’s ids.</>,
        <>Under <b>Runs as</b>, read the user the app is signed in as, and click the approval link to open the permission this pod runs under.</>,
        <>Read <b>Logs</b> to see what the app printed when its backend last read them; type in <b>Filter lines</b> to narrow them, or press the copy button to copy them.</>,
        <>Press <b>Refresh</b> (or right-click the pod and choose <b>Refresh logs</b>) to ask the backend for the newest logs; they appear when it has sent them.</>,
      ]}
    />
  ),
  pods: (
    <PageHelp
      intro="Every pod: the running copies of your deployed apps. Each card names the app and version, its status, and the backend it runs on."
      steps={[
        <>Press the magnifier in the header and type to narrow the list; the search stays in the page’s address, so a narrowed list can be shared.</>,
        <>Click a pod to open it and read its logs.</>,
        <>Right-click a pod and choose <b>Delete Agent</b> to remove it.</>,
      ]}
    />
  ),
  apps: (
    <PageHelp
      intro="Every app registered with your organization, one card per app with its newest version. Come here to find an app by its identifier; the App Store is where to browse."
      steps={[
        <>Press the magnifier in the header and type to narrow the list; the search stays in the page’s address, so a narrowed list can be shared.</>,
        <>Click an app card to open its page with its actions, builds and versions.</>,
        <>Press <b>Get</b> on a card to install the app’s newest release.</>,
        <>Press <b>Add Repo</b> if the app you are looking for is not listed yet.</>,
      ]}
      tips={[<>An app whose repository has not published a release yet is not listed.</>]}
    />
  ),
  deployments: (
    <PageHelp
      intro="Every deployment: one build of an app installed on one backend. Pods are started from a deployment."
      steps={[
        <>Press the magnifier in the header and type to narrow the list; the search stays in the page’s address, so a narrowed list can be shared.</>,
        <>Read the line under a deployment’s name for its flavour and the backend it is installed on; its status is at the top right.</>,
        <>Click a deployment to open it.</>,
      ]}
    />
  ),
  deployment: (
    <PageHelp
      intro="One deployment: which build of which app is installed on which backend, and who it runs as."
      steps={[
        <>Open the <b>Info</b> tab of the sidebar and click the app, the release, the flavour or the backend to open them.</>,
        <>Read <b>Runs as</b> for the release approval the deployment was installed under; click it to open the approval.</>,
        <>Press <b>Revoke mandate</b> to withdraw the permission it runs under.</>,
      ]}
    />
  ),
  bloks: (
    <PageHelp
      intro="The bloks your GitHub repositories publish on their own, in .arkitekt/bloks.yaml. Bloks an app brings come with the app and are shown in the App Store."
      steps={[
        <>Press the magnifier in the header and type to narrow the list; the search stays in the page’s address, so a narrowed list can be shared.</>,
        <>Press <b>Kind</b> in the header and pick <b>Panels</b> or <b>Scenes</b> to show only one kind.</>,
        <>Press <b>Install</b> on a blok to make it a blok of your organization; the dialog asks which agents it draws from.</>,
        <>When its repository has changed a blok you installed, its card says <b>Update</b>. <b>Materialize</b> binds an installed blok to agents again.</>,
        <>Press <b>Add Repo</b> to add a repository that publishes bloks.</>,
      ]}
    />
  ),
  resource: (
    <PageHelp
      intro="A resource is something a backend runs pods on. This page shows what it reports about itself and the pods it hosts."
      steps={[
        <>Read the line under the name for its backend and how its pods are doing; click the backend to open it.</>,
        <>Read <b>Qualifiers</b> for the properties the resource reports about itself.</>,
        <>Click a card under <b>Pods</b> to open a running app.</>,
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
        <>Read the line under the app name for its state: <b>Active</b>, <b>Release changed</b> or <b>Revoked</b>.</>,
        <>Press <b>Deploy</b> in the header to start the release on a backend. The button shows only on your own active approval.</>,
        <>Press <b>Revoke mandate</b>, or open the menu at the right end of the page header and choose <b>Revoke approval</b>, to withdraw the permission.</>,
        <>Click the app name to open the release this approval is for.</>,
      ]}
      tips={[
        <>The <b>Info</b> tab of the sidebar shows who approved, which deployer may start it, on which backends, and the release digest.</>,
        <><b>Release changed</b> means the release was published again with different permissions, requirements or images. Install it again to approve what it is now.</>,
        <>When revoking, leave <b>Also sign out the pods running under it now</b> switched on to stop running copies too.</>,
      ]}
    />
  ),
  approvals: (
    <PageHelp
      intro="The releases that people in your organization have allowed to run as them. Installing an app from the App Store creates an approval; revoking it takes the permission back."
      steps={[
        <>Press the magnifier in the header and type to narrow the list; the search stays in the page’s address, so a narrowed list can be shared.</>,
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
  backends: (
    <PageHelp
      intro="Every backend: the machines and container engines that run your deployed apps."
      steps={[
        <>Press the magnifier in the header and type to narrow the list; the search stays in the page’s address, so a narrowed list can be shared.</>,
        <>Click a backend to see the pods it runs and the resources it manages.</>,
      ]}
    />
  ),
  definitions: (
    <PageHelp
      intro="Every action the releases of your repositories declare, whether or not an agent runs it yet."
      steps={[
        <>Press the magnifier in the header and type to narrow the list; the search stays in the page’s address, so a narrowed list can be shared.</>,
        <>Click a definition to see what it takes and returns and which builds bring it.</>,
      ]}
    />
  ),
  flavours: (
    <PageHelp
      intro="Every flavour: the builds a release ships, one per kind of hardware. The words at the top right of a card say what it needs, for example CUDA."
      steps={[
        <>Press the magnifier in the header and type to narrow the list; the search stays in the page’s address, so a narrowed list can be shared.</>,
        <>Click a flavour to see its actions, its image and where it is deployed.</>,
      ]}
    />
  ),
  releases: (
    <PageHelp
      intro="Every release: each published version of each app."
      steps={[
        <>Press the magnifier in the header and type to narrow the list; the search stays in the page’s address, so a narrowed list can be shared.</>,
        <>Click a release to see its builds, what it asks for, and to install it.</>,
      ]}
      tips={[<>Right-click a release and choose <b>Install…</b> to install it without opening it.</>]}
    />
  ),
  resources: (
    <PageHelp
      intro="Every resource the backends report: what pods are scheduled onto. The last line of a card shows what the resource reports about itself."
      steps={[
        <>Press the magnifier in the header and type to narrow the list; the search stays in the page’s address, so a narrowed list can be shared.</>,
        <>Click a resource to see the pods it hosts.</>,
      ]}
    />
  ),
};
