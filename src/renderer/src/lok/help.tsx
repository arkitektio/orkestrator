import { PageHelp } from "@/core/layout/help";

/**
 * Team's (lok's) page instructions, one per page, shown in the page's Help tab
 * (`help={LOK_HELP.teamHome}`). Each names only what its page really offers:
 * the button labels, menu entries and dialogs are the ones on screen.
 */
export const LOK_HELP = {
  teamHome: (
    <PageHelp
      intro="Your organization and the people in it. The banner shows the organization's name, logo and member count; below it is one card per member, with you first."
      steps={[
        <>Click a member card to open that person’s profile and see their roles and recent work.</>,
        <>Right-click a member and choose <b>Notify + send message</b> to push a short message to their registered phones.</>,
        <>Press <b>Invite</b> to create an invite link: set <b>Expires in (days)</b>, tick the roles the newcomer should get and confirm with <b>Create Invite</b>.</>,
        <>Open the <b>Invites</b> tab of the sidebar and click a link to copy it, then send it to the person you are inviting.</>,
        <>Hover the organization’s logo and click <b>Change</b>, or drop an image on it, to replace the logo.</>,
      ]}
      tips={[
        <>The <b>Invite</b> button, the <b>Invites</b> tab and the <b>Add to organization</b> menu entry are only shown to administrators.</>,
        <>The line under each name lists that member’s roles in this organization.</>,
        <>The <b>Statistics</b> tab shows the total number of users.</>,
      ]}
    />
  ),
  overview: (
    <PageHelp
      intro="A start page for the Team module: a greeting, what other modules have to tell you (for example your latest mentions), and a handful of the apps registered in your organization."
      steps={[
        <>Click an app under <b>Recent Apps</b> to open it and see its releases.</>,
        <>Open the <b>Statistics</b> tab of the sidebar to see how many users your organization has.</>,
        <>Press <b>Record</b> in the header to open the Morse code recorder.</>,
      ]}
      tips={[
        <>Sections from other modules only appear when that module is available on your server.</>,
      ]}
    />
  ),
  record: (
    <PageHelp
      intro="A Morse code recorder: you tap the space bar and the page decodes the dots and dashes into text."
      steps={[
        <>Press <b>Start Recording</b>. The status line now waits for the start sequence.</>,
        <>Tap the space bar dot, dash, dot, dash (. - . -). The badge switches to “Recording Active”.</>,
        <>Tap your message: a short press is a dot, a longer press is a dash. Pause briefly to end a letter and a little longer to add a space. The result builds up under “Decoded Text”.</>,
        <>Press <b>Stop Recording</b> when you are done, or <b>Reset</b> to clear everything and start over.</>,
      ]}
      tips={[
        <>The exact timings for dots, dashes and gaps are listed under “Timing Guidelines” at the bottom of the card.</>,
        <>Nothing is decoded before the start sequence was recognized.</>,
      ]}
    />
  ),
  user: (
    <PageHelp
      intro="A member’s profile in this organization: who they are, which roles they hold here, and their recent work as the other modules see it."
      steps={[
        <>Read the badges next to the organization’s name to see the member’s roles.</>,
        <>Scroll down for the sections other modules add, such as <b>Latest images</b> or <b>Agents</b>.</>,
        <>Open the <b>About</b> tab of the sidebar for username, name, email and user ID.</>,
        <>Open the menu button at the right end of the header and choose <b>Notify + send message</b> to push a message to this person’s registered phones.</>,
        <>On your own profile, hover your portrait and click <b>Change</b>, or drop an image on it, to set a new avatar.</>,
      ]}
      tips={[
        <>Your own profile is marked “you” next to the name; only there can the portrait be changed.</>,
        <>A message can only be delivered to someone who has registered a phone.</>,
        <>Administrators also find <b>Add to organization</b> in the menu, which adds the user with the roles you pick.</>,
      ]}
    />
  ),
  users: (
    <PageHelp
      intro="Every user account on the server."
      steps={[
        <>Click a user to open their profile.</>,
        <>Right-click a user and choose <b>Add to organization</b>, pick the <b>Roles</b> and confirm with <b>Add</b> to make them a member of your organization.</>,
        <>Right-click a user and choose <b>Notify + send message</b>, write the <b>Message</b> and press <b>Send</b> to reach their registered phones.</>,
      ]}
      tips={[
        <>This page is only available to administrators.</>,
        <>The members of your own organization are on the Team start page (<b>Members</b>).</>,
      ]}
    />
  ),
  apps: (
    <PageHelp
      intro="The applications registered with your organization. An app is a program that connects to the platform, for example a microscope control or an analysis tool."
      steps={[
        <>Click an app to open it and see its releases.</>,
      ]}
      tips={[
        <>This page is only available to administrators.</>,
        <>Apps appear here once they have registered with the server; there is nothing to create by hand.</>,
      ]}
    />
  ),
  app: (
    <PageHelp
      intro="One application, with its logo and the releases (versions) of it that have registered with the server."
      steps={[
        <>Look through the list of versions to see which releases of this app exist.</>,
        <>Click a version to open that release and see the clients running it.</>,
      ]}
    />
  ),
  release: (
    <PageHelp
      intro="One version of an app. Under “Clients” you find every installation of this version: who runs it and on which device."
      steps={[
        <>Read each client card to see the user it runs as and the device it runs on.</>,
        <>Click a client to open it, for example to report a bug against it.</>,
      ]}
      tips={[
        <>The “Clients” list is hidden while no client of this version exists.</>,
      ]}
    />
  ),
  client: (
    <PageHelp
      intro="One client: a single installation of an app version, signed in as a particular user. The header shows the app, its version, the user, the device it runs on and its client ID."
      steps={[
        <>Click the device name to open the device this client runs on.</>,
        <>Press <b>Report Bug</b> in the header to file a problem with this app: fill in <b>Issue Title</b> and <b>Description</b>, then press <b>Create GitHub Issue</b> to open the pre-filled issue in your browser.</>,
        <>Press one of the source buttons next to it, when the app provides any, to open the app’s public source in your browser.</>,
        <>Check “Critical Failures” for tasks that failed badly on this client, and click one to open the task.</>,
      ]}
      tips={[
        <>The <b>Report Bug</b> button here is about this client’s app. The <b>Report Bug</b> entry in the header’s ▾ menu is about Orkestrator itself.</>,
        <><b>Create GitHub Issue</b> is disabled when the app did not declare where its issues go.</>,
        <>“Critical Failures” only appears when there are such tasks.</>,
      ]}
    />
  ),
  devices: (
    <PageHelp
      intro="The devices registered with your server: the computers and virtual machines that apps run on and that carry out tasks."
      steps={[
        <>Click a device to open it and see which agents run on it.</>,
        <>Open a device and use the pencil icon in its header to give it a readable name.</>,
      ]}
      tips={[
        <>This page is only available to administrators.</>,
        <>A device without a name is listed by its node ID.</>,
      ]}
    />
  ),
  device: (
    <PageHelp
      intro="One device: a computer or virtual machine that apps run on. The page lists what is running on it."
      steps={[
        <>Click the pencil icon in the header, change the <b>Name</b> and press <b>Update</b> to rename the device.</>,
        <>Look under “Agents running here” for the apps on this device that can currently take tasks.</>,
      ]}
      tips={[
        <>A note tells you when this is the device you are connected from right now.</>,
      ]}
    />
  ),
  instances: (
    <PageHelp
      intro="The service instances of your server. A service is a kind of backend (for example image storage); an instance is one running deployment of it that apps can be connected to."
      steps={[
        <>Click an instance to open it and see who may use it and which clients are connected.</>,
        <>Press <b>New Instance</b>, enter the <b>Service identifier</b> and confirm with <b>Change</b> to register a new instance of that service.</>,
      ]}
      tips={[
        <>This page is only available to administrators.</>,
      ]}
    />
  ),
  serviceInstance: (
    <PageHelp
      intro="One service instance: which service it provides, who is allowed or denied to use it, and which clients are connected to it."
      steps={[
        <>Read the lists “Allowed Users”, “Denied Users”, “Allowed Groups” and “Denied Groups” to see who can reach this instance.</>,
        <>Press <b>Update Service</b>, pick users and groups in the four fields and confirm with <b>Change</b> to adjust who has access.</>,
        <>Look at the diagram at the bottom: the instance sits in the middle, the clients using it around it.</>,
        <>Click a client in the diagram to open it.</>,
      ]}
      tips={[
        <>A list that has no entries is not shown.</>,
        <>Changing access needs the administrator role.</>,
      ]}
    />
  ),
  services: (
    <PageHelp
      intro="The kinds of services your server knows. Services are the backends apps talk to; each one can have one or more running instances."
      steps={[
        <>Click a service to open it and read its description.</>,
        <>Press <b>New Service</b>, enter the <b>Service identifier</b> and confirm with <b>Change</b> to register an instance of that service.</>,
      ]}
      tips={[
        <>This page is only available to administrators.</>,
        <>The running deployments are listed on the <b>Instances</b> page.</>,
      ]}
    />
  ),
  service: (
    <PageHelp
      intro="One kind of service, with its identifier, description and logo."
      steps={[
        <>Read the description to learn what this service provides.</>,
        <>Press <b>New Service</b> and confirm with <b>Change</b> to register a new instance of this service.</>,
      ]}
      tips={[
        <>Registering an instance needs the administrator role.</>,
      ]}
    />
  ),
  layers: (
    <PageHelp
      intro="Layers are connection layers between services and apps. A service defined in a layer can only be reached by apps that have access to that layer."
      steps={[
        <>Look through the list to see which layers exist.</>,
        <>Click a layer to open it.</>,
      ]}
    />
  ),
  layer: (
    <PageHelp
      intro="One layer, a connection layer between services and apps. The page shows only its name and logo."
      steps={[
        <>Open the <b>Chat</b> tab of the sidebar to start a conversation about this layer.</>,
      ]}
    />
  ),
  mandates: (
    <PageHelp
      intro="The apps allowed to act as you. A mandate is your approval for one exact app version to be started and signed in under your name, for example by an app installer on a lab computer."
      steps={[
        <>Read a card to see which app and version it covers, who starts it, and how many instances are running.</>,
        <>Click a mandate to open it and see what it is allowed to do.</>,
        <>Right-click a mandate, choose <b>Revoke mandate</b> and confirm with <b>Revoke</b> to sign out every app started under it and stop new ones.</>,
        <>Switch on <b>Revoked</b> in the header to also show the mandates you have withdrawn.</>,
      ]}
      tips={[
        <>“Live” means the app can be started; “Expired” stops new starts; “Revoked” means everything was signed out; “Not live” means the app cannot be started right now.</>,
        <>A revoked mandate cannot be restored. To run the app again it has to be approved again.</>,
        <>You do not create mandates here: installing an app from the App Store asks for one.</>,
      ]}
    />
  ),
  mandate: (
    <PageHelp
      intro="One mandate: your approval for an app version to run signed in as the person who granted it. The page shows who granted it, who may start the app, what it may do and which instances are running."
      steps={[
        <>Read the facts at the top: who granted it, which app starts it, any device or operator it is limited to, and when it expires.</>,
        <>Check “Allowed to” for the permissions the app has while acting for the grantor.</>,
        <>Hover a row under “Running as …” and press <b>Sign out</b> to stop that one instance.</>,
        <>Click an instance’s name to open that client.</>,
        <>Open the menu button at the right end of the header and choose <b>Revoke mandate</b> to withdraw the approval entirely.</>,
      ]}
      tips={[
        <>An instance you signed out can be started again while the mandate is live. Revoking is what stops it for good.</>,
        <>The “Running as …” list is hidden when no instance is signed in.</>,
      ]}
    />
  ),
  redeemTokens: (
    <PageHelp
      intro="Redeem tokens authorize a new app or device to access your account: whoever presents the token is linked to it."
      steps={[
        <>Press <b>New Token</b>. A random value is already filled in under <b>The token</b>; keep it or type your own, then confirm with <b>Change</b>.</>,
        <>You land on the new token’s page. Pass its value to the app or device you want to register.</>,
        <>Come back to this list to see which tokens were used: those are marked “Claimed”, with the app that claimed them.</>,
      ]}
      tips={[
        <>This page is only available to administrators.</>,
        <>Treat a token like a password: anyone who has it can register an app in your name.</>,
      ]}
    />
  ),
  redeemToken: (
    <PageHelp
      intro="One redeem token. The large text is the token value an app or device presents to register with the server."
      steps={[
        <>Copy the token value and enter it in the app or device you want to register.</>,
        <>Go back to the <b>Redeem Tokens</b> list afterwards to check that the token shows as “Claimed”.</>,
      ]}
      tips={[
        <>Treat the token like a password and share it only with the device it is meant for.</>,
      ]}
    />
  ),
};
