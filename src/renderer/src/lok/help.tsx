import { PageHelp } from "@/core/layout/help";

/**
 * Team's (lok's) page instructions, one per page, shown in the page's Help tab
 * (`help={LOK_HELP.teamHome}`). Each names only what its page really offers:
 * the button labels, menu entries and dialogs are the ones on screen.
 */
export const LOK_HELP = {
  teamHome: (
    <PageHelp
      intro="Your organization and the people in it. The header shows its name and logo; an administrator first sees what waits on them, then everyone sees the members, grouped by their role here."
      steps={[
        <>Click a member card to open that person’s profile and see their roles and recent work.</>,
        <>Type in <b>Search members…</b> to find someone by name or role, or pick a role under <b>Any role</b> to see only its holders. <b>Clear filters</b> shows everyone again.</>,
        <>Right-click a member and choose <b>Notify + send message</b> to push a short message to their registered phones.</>,
        <>Press <b>Invite</b> to create an invite link: set <b>Expires in (days)</b>, tick the roles the newcomer should get and confirm with <b>Create Invite</b>.</>,
        <>Under <b>Needs you</b>, click an invite’s link to copy it and send it to the person you are inviting, or press <b>Cancel</b> to stop the link from working.</>,
        <>Under <b>Needs you</b>, click a request to join, pick their <b>Roles</b> and press <b>Approve</b>, or press <b>Decline</b>.</>,
        <>Hover the organization’s logo and click <b>Change</b>, or drop an image on it, to replace the logo.</>,
      ]}
      tips={[
        <>Each member is listed once, under their highest role (administrator roles first); the line at the foot of a card names all of their roles.</>,
        <>The <b>Invite</b> button, <b>Needs you</b>, the <b>Invites</b> tab and the <b>Add to organization</b> menu entry are only shown to administrators. <b>Needs you</b> is hidden when nothing is waiting.</>,
        <>The <b>Invites</b> tab of the sidebar keeps every invite, including the ones already accepted. The <b>Overview</b> tab lists Team’s other pages.</>,
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
      intro="A member’s profile in this organization: their portrait and name at the top, then what they made, across every service, newest first. The rest of who they are is in the sidebar’s Profile tab."
      steps={[
        <>Type in <b>Search their work…</b> to find something they made by name, in every service at once.</>,
        <>Click a type, such as <b>Images</b> or <b>Experiments</b>, to hide it or show it again; <b>Clear filters</b> brings everything back.</>,
        <>Click a card to open it, or right-click it for what you can do with it. Press <b>Show more</b> at the bottom for older work.</>,
        <>Open the <b>Profile</b> tab of the sidebar for their roles, bio, email and user ID, and for what the modules list for them there: their <b>Projects</b>, the <b>Todo lists</b> assigned to them and their <b>Agents</b>.</>,
        <>Open the menu button at the right end of the header and choose <b>Notify + send message</b> to push a message to this person’s registered phones.</>,
        <>On your own profile, hover your portrait next to your name and click <b>Change</b>, or drop an image on it, to set a new avatar.</>,
      ]}
      tips={[
        <>The search and the hidden types are part of the page’s address, so a filtered profile can be shared as a link.</>,
        <>Only services that can tell who made something take part, and a type only shows while its service is reachable.</>,
        <>A message can only be delivered to someone who has registered a phone.</>,
        <>Administrators also find <b>Add to organization</b> in the menu, which adds the user with the roles you pick.</>,
      ]}
    />
  ),
  users: (
    <PageHelp
      intro="Every user account on the server."
      steps={[
        <>Press the magnifier in the header and type to narrow the list; the search stays in the page’s address, so a narrowed list can be shared.</>,
        <>Click a user to open their profile.</>,
        <>Right-click a user and choose <b>Add to organization</b>, pick the <b>Roles</b> and confirm with <b>Add</b> to make them a member of your organization.</>,
        <>Right-click a user and choose <b>Notify + send message</b>, write the <b>Message</b> and press <b>Send</b> to reach their registered phones.</>,
      ]}
      tips={[
        <>This page is only available to administrators.</>,
        <>The members of your own organization are on the <b>Members</b> page of Team.</>,
      ]}
    />
  ),
  apps: (
    <PageHelp
      intro="The applications registered with your organization. An app is a program that connects to the platform, for example a microscope control or an analysis tool."
      steps={[
        <>Press the magnifier in the header and type to narrow the list; the search stays in the page’s address, so a narrowed list can be shared.</>,
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
      intro="One application: its logo and identifier, the releases (versions) of it that have registered with the server, and, for admins, what people reported from it."
      steps={[
        <>Look under <b>Releases</b> to see which versions of this app exist.</>,
        <>Click a version to open that release and see the clients running it.</>,
      ]}
      tips={[
        <>The <b>Info</b> tab of the sidebar shows its identifier (with a copy button) and how many releases it has.</>,
      ]}
    />
  ),
  release: (
    <PageHelp
      intro="One version of an app. Under “Clients” you find every installation of this version: who runs it and on which device."
      steps={[
        <>Read each client card to see the user it runs as and the device it runs on.</>,
        <>Click a client to open it, for example to report a bug against it.</>,
        <>Click the app’s name in the <b>Info</b> tab of the sidebar to open the app.</>,
      ]}
      tips={[
        <>The <b>Clients</b> section is hidden while no client of this version exists.</>,
      ]}
    />
  ),
  client: (
    <PageHelp
      intro="One client: a single installation of an app version, signed in as a particular user. The header shows the app and its version; the line under it, the user, the device and the kind of client; the Info tab of the sidebar has its client ID (with a copy button), role and whether it is public."
      steps={[
        <>Click the device in the <b>Info</b> tab of the sidebar to open the device this client runs on.</>,
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
        <>Narrow the list with the row over it: type a name into <b>Search devices…</b>, or pick a group under <b>Any group</b>. <b>Clear filters</b> undoes them; the filters stay in the page’s address, so a narrowed list can be shared.</>,
        <>Use the sort pill to order by name or show the newest first.</>,
        <>Each card says which groups the device is in and how many apps are registered on it; its ID is at the foot.</>,
        <>Click a device to open it and see which agents run on it.</>,
        <>Open a device and use the pencil icon in its header to give it a readable name.</>,
      ]}
      tips={[
        <>This page is only available to administrators.</>,
        <>A device without a name is listed as <i>Unnamed</i>.</>,
      ]}
    />
  ),
  device: (
    <PageHelp
      intro="One device: a computer or virtual machine that apps run on. The page lists what is running on it."
      steps={[
        <>Click the pencil icon in the header, change the <b>Name</b> and press <b>Update</b> to rename the device.</>,
        <>Read the line under the name for the groups it is in and how many apps are registered on it.</>,
        <>Look under <b>Apps</b> for the apps registered on this device, and under “Agents running here” for the ones that can currently take tasks.</>,
        <>Open the <b>Info</b> tab of the sidebar for its device ID; press the copy button next to it to copy it.</>,
      ]}
      tips={[
        <>The line under the name says when this is the device you are connected through right now.</>,
        <>A device without a name reads <i>Unnamed</i>.</>,
      ]}
    />
  ),
  instances: (
    <PageHelp
      intro="The service instances of your server. A service is a kind of backend (for example image storage); an instance is one running deployment of it that apps can be connected to."
      steps={[
        <>Press the magnifier in the header and type to narrow the list; the search stays in the page’s address, so a narrowed list can be shared.</>,
        <>Read a card for the service’s version and how many users it lets in or keeps out.</>,
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
      intro="One service instance: which service and version it provides, who is allowed or denied to use it, and how it is composed."
      steps={[
        <>Read <b>Allowed users</b>, <b>Denied users</b>, <b>Allowed groups</b> and <b>Denied groups</b> to see who can reach this instance.</>,
        <>Press <b>Update Service</b>, pick users and groups in the four fields and confirm with <b>Change</b> to adjust who has access.</>,
        <>Look at the diagram under <b>Composition</b>: the instance sits in the middle, the clients using it around it.</>,
        <>Click a client in the diagram to open it.</>,
      ]}
      tips={[
        <>A list that has no entries is not shown.</>,
        <>Changing access needs the administrator role.</>,
        <>The <b>Info</b> tab of the sidebar shows its service, version, mappings, aliases and ID.</>,
      ]}
    />
  ),
  services: (
    <PageHelp
      intro="The kinds of services your server knows. Services are the backends apps talk to; each one can have one or more running instances."
      steps={[
        <>Press the magnifier in the header and type to narrow the list; the search stays in the page’s address, so a narrowed list can be shared.</>,
        <>Click a service to open it and read its description.</>,
        <>Press <b>New Instance</b>, enter the <b>Service identifier</b> and confirm with <b>Change</b> to register an instance of that service.</>,
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
        <>Press <b>New Instance</b> and confirm with <b>Change</b> to register a new instance of this service.</>,
        <>Open the <b>Info</b> tab of the sidebar for its identifier; press the copy button to copy it.</>,
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
        <>Press the magnifier in the header and type to narrow the list; the search stays in the page’s address, so a narrowed list can be shared.</>,
        <>Click a layer to open it.</>,
      ]}
    />
  ),
  layer: (
    <PageHelp
      intro="One layer, a connection layer between services and apps: its name, logo and what it is for."
      steps={[
        <>Open the <b>Info</b> tab of the sidebar for its identifier; press the copy button to copy it.</>,
        <>Open the <b>Chat</b> tab of the sidebar to start a conversation about this layer.</>,
      ]}
    />
  ),
  provisionDevice: (
    <PageHelp
      intro="Sets up an Arkitekt device (an ESP32) over Bluetooth: it gets your Wi-Fi, the deployment's address and a key to sign in with, and then runs as you."
      steps={[
        <>Put the device in pairing mode (a new one starts in it; hold BOOT for 5 seconds on one already set up) and press <b>Scan</b>.</>,
        <>Press <b>Select</b> next to the device, check what it reports under <b>Inspect</b>, then press <b>Continue</b>.</>,
        <>Choose a Wi-Fi profile or press <b>New Wi-Fi profile</b>. For eduroam, search your institution to fill in its certificate.</>,
        <>Check the <b>Deployment</b> address, then press <b>Provision</b> and wait until the device reports “Registered”.</>,
      ]}
      tips={[
        <>Each device gets its own key, pinned to it, under one standing mandate for its app; both show up under Mandates, where you can revoke them.</>,
        <>Provisioning a device again gives it a new key and keeps it the same device and agent.</>,
        <>The device must reach the deployment address over its own Wi-Fi. Localhost or a VPN-only address will not work.</>,
        <>Wi-Fi passwords are saved encrypted with your system keychain; without one, they are not saved.</>,
      ]}
    />
  ),
  bugReports: (
    <PageHelp
      intro="What people reported with “Report a Bug” from inside an app. Admins see every report of the organization; everyone else sees the reports they filed themselves."
      steps={[
        <>Switch between <b>Open</b>, <b>Resolved</b> and <b>All</b> to choose which reports are listed.</>,
        <>Type in <b>Search reports</b> to find a report by its words.</>,
        <>Click a report’s title to open it and read what the app recorded.</>,
      ]}
      tips={[
        <>The same list, narrowed to one app, one version or one installation, is at the bottom of that app’s, release’s and client’s page.</>,
        <>Press <b>Show more</b> under the list to load older reports.</>,
      ]}
    />
  ),
  bugReport: (
    <PageHelp
      intro="One bug report: what the person wrote, the app and installation it came from, the screenshot, and what the app recorded before it was filed."
      steps={[
        <>Read “What happened”, then open the parts under “What the app recorded” (“Recent errors”, “Failed requests”, “Steps before the report”, “Console”) for the details.</>,
        <>Read the line under the title for who reported it and when; the <b>Info</b> tab of the sidebar shows the app, client, system and page it came from.</>,
        <>Press <b>Resolve</b> to close the report; add a <b>Note</b> if you want to say how it was dealt with.</>,
        <>Press <b>Forward to GitHub</b> to open a pre-filled issue in the tracker of the app the report came from. The report is then marked “Forwarded”.</>,
        <>Press <b>Reopen</b> on a resolved report to put it back among the open ones.</>,
      ]}
      tips={[
        <><b>Forward to GitHub</b> is disabled when the app did not declare where its issues go.</>,
        <>The screenshot does not travel with a forwarded issue; attach it there by hand if it is needed.</>,
        <><b>Resolve</b>, <b>Reopen</b> and <b>Forward to GitHub</b> are shown to admins only.</>,
      ]}
    />
  ),
  clients: (
    <PageHelp
      intro="Every app signed in to your organization: which app and version, whose account it uses, and the device it runs on."
      steps={[
        <>Press the magnifier in the header and type to narrow the list; the search stays in the page’s address, so a narrowed list can be shared.</>,
        <>Click a client to open it and see what it may do.</>,
      ]}
      tips={[<>This page is only available to administrators.</>]}
    />
  ),
  releases: (
    <PageHelp
      intro="The versions of your apps that registered with this server, each with the app it belongs to."
      steps={[<>Click a release to open it and see which clients run it.</>]}
      tips={[<>This page is only available to administrators.</>]}
    />
  ),
  collaborations: (
    <PageHelp
      intro="What guests of your organization are let in to. A collaboration is one key across every service: each service holds what you put in it there, and a guest sees nothing else."
      steps={[
        <>Press <b>New</b> to make an empty collaboration.</>,
        <>Put objects in it with <b>Add to Collaboration</b> on them, or a whole workflow with <b>Share workflow</b> on a task.</>,
        <>Open a collaboration and press <b>Share</b> to make a link that grants it.</>,
      ]}
      tips={[<>Deleting a collaboration takes it from everyone it was shared with; what the services hold under its key is not deleted.</>]}
    />
  ),
  collaboration: (
    <PageHelp
      intro="One collaboration: its name, its links, and what each service holds of it."
      steps={[
        <>Press <b>Share</b> to make a link: whoever opens it and signs in becomes a guest and sees only what is in it.</>,
        <>Press <b>Rename</b> to change its name or description, <b>Delete</b> to take it from everyone.</>,
      ]}
      tips={[<>Each service lists what it holds below; open one to take things out again.</>]}
    />
  ),
  mandates: (
    <PageHelp
      intro="The apps allowed to act as you. A mandate is your approval for one exact app version to be started and signed in under your name, for example by an app installer on a lab computer."
      steps={[
        <>Read a card to see which app and version it covers, who starts it, on which device, and how many instances are running; its state is the pill at the bottom right.</>,
        <>Click a mandate to open it and see what it is allowed to do.</>,
        <>Right-click a mandate, choose <b>Revoke mandate</b> and confirm with <b>Revoke</b> to sign out every app started under it and stop new ones.</>,
        <>Switch on <b>Revoked</b> in the header to also show the mandates you have withdrawn.</>,
      ]}
      tips={[
        <>“Live” means the app can be started; “Expired” stops new starts; “Revoked” means everything was signed out; “Not live” means the app cannot be started right now.</>,
        <>A revoked mandate cannot be restored. To run the app again it has to be approved again.</>,
        <>Mandates come from elsewhere: installing an app from the App Store asks for one, and <b>Provision device</b> issues one per device.</>,
      ]}
    />
  ),
  mandate: (
    <PageHelp
      intro="One mandate: your approval for an app version to run signed in as the person who granted it. The page shows who granted it, who may start the app, what it may do and which instances are running."
      steps={[
        <>Read the line under the title for who it signs the app in as, then the <b>Info</b> tab of the sidebar for who granted it, which app starts it, any device or operator it is limited to, and when it expires.</>,
        <>Check “Allowed to” for the permissions the app has while acting for the grantor.</>,
        <>Click an instance’s name to open that client.</>,
        <>Open the menu button at the right end of the header and choose <b>Revoke mandate</b> to withdraw the approval entirely.</>,
      ]}
      tips={[
        <>The “Running as …” list is hidden when no instance is signed in.</>,
      ]}
    />
  ),
};
