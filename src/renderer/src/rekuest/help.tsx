import { PageHelp } from "@/core/layout/help";

/**
 * rekuest's page instructions, one per page, shown in the page's Help tab
 * (`help={REKUEST_HELP.actions}`). Each names only what its page really offers:
 * the button labels, menu entries and dialogs are the ones on screen.
 */
export const REKUEST_HELP = {
  home: (
    <PageHelp
      intro="The starting point for running things. It shows the apps you connected to this server (your “agents”) first, then the tasks that are running and the last few that finished. Every Rekuest page is listed in the sidebar, under Overview."
      steps={[
        <>Look at <b>Your apps</b> to see which apps are connected. Only online apps are listed at first: press <b>Online</b> in the filter row above the grid to also see the ones that are not reachable right now.</>,
        <>Type into <b>Search apps…</b>, or open <b>Any app</b>, <b>Any device</b> or <b>Any supervisor</b> and pick one, to narrow the grid. A filter that narrows is tinted.</>,
        <>The grid starts with your own apps only. Open <b>Mine</b> and pick <b>Everyone</b> or one person to see theirs. Open <b>Apps</b> and pick <b>Webhooks</b> or <b>All types</b> to include webhook agents. <b>Clear filters</b> goes back to your own online apps. The filters are part of the page address, so a filtered home can be copied as a link.</>,
        <>Click an app card to open the agent and see the actions it can run.</>,
        <>Open the <b>Overview</b> tab of the sidebar to go to a Rekuest page: <b>Actions</b> is the catalog of everything your apps can do, <b>Tasks</b> every task you ran. The numbers next to <b>Actions</b> and <b>Org Tasks</b> count the whole organization.</>,
        <>Right-click an app card for its actions, for example <b>Rename / Update Agent</b> or <b>Pin Agent</b>.</>,
        <>Under <b>Bloks</b>, click a card to open that interface. Each card names the apps it runs on and how many of them are online.</>,
        <>Scroll down to <b>Ongoing tasks</b> for what is running now, and <b>Recently finished</b> for the last three that ended (failed ones included). Click a task to follow it; click either title for every task.</>,
      ]}
      tips={[
        <>No apps yet: start an Arkitekt app and log it into this server. It shows up here as soon as it connects.</>,
        <>Only online apps can run actions right now.</>,
        <>Right-clicking an object anywhere in the application lists, under <b>Run</b>, the actions that accept it.</>,
      ]}
    />
  ),
  actions: (
    <PageHelp
      intro="An action is something a connected app can do: acquire an image, segment it, move a stage. This page is the catalog of all of them, and the place to find one and run it."
      steps={[
        <>Type into <b>Search actions…</b> to find an action by name or by what it does.</>,
        <>Press <b>Runnable now</b> to keep only actions whose app is online.</>,
        <>Open <b>Works on</b>, choose <b>Takes</b> or <b>Returns</b> and pick a structure to see the actions that accept or produce that kind of data.</>,
        <>Open <b>Filter</b> to narrow by <b>Kind</b>, <b>Stateful</b>, <b>App</b> or <b>Protocol</b>, and use <b>Sort</b> and <b>Group</b> to change how the list reads.</>,
        <>Hover a card and press its play button, or right-click it and choose <b>Run Action</b>. Fill in the arguments and press <b>Do</b>.</>,
        <>Right-click an action and choose <b>Create Shortcut</b>, <b>Schedule…</b> or <b>Run on Signal…</b> to save it for later, run it on a clock, or run it when data changes.</>,
      ]}
      tips={[
        <>The dot on a card tells whether an app providing the action is online. “no app” means nothing implements it anymore.</>,
        <>The date range in the header keeps the actions used in that period. It is hidden when the window is narrow.</>,
        <>The <b>Manage</b> tab has <b>Clean up</b>, which deletes every action nothing references anymore. It cannot be undone.</>,
      ]}
    />
  ),
  action: (
    <PageHelp
      intro="Everything about one action: what it takes and returns, which apps provide it, how its tests went and every time it was run. The page describes the action; running it is done from its menu."
      steps={[
        <>Open the menu button at the right end of the header and choose <b>Run Action</b>. Fill in the arguments and press <b>Do</b>.</>,
        <>Read <b>Takes</b> and <b>Returns</b> to see what the action needs and what it gives back.</>,
        <>Check <b>Provided by</b> to see which apps implement it and whether they are online. Click an app to open its agent, or an interface name to open that implementation.</>,
        <>From the same menu, choose <b>Create Shortcut</b>, <b>Schedule…</b> or <b>Run on Signal…</b> to save, time or automate the action.</>,
        <>Open the <b>Usage</b> tab of the sidebar to see how often the action runs and how often it succeeds.</>,
        <>Scroll to the bottom for the runs of this action, newest first, and click one to open the task.</>,
      ]}
      tips={[
        <>If <b>Provided by</b> says nobody, no app implements the action anymore and it cannot be run.</>,
        <><b>Similar actions</b> only appears when the server found actions with a similar name and description.</>,
      ]}
    />
  ),
  agents: (
    <PageHelp
      intro="Agents are the apps that connected to this server and can run actions. This page lists all of them, online or not."
      steps={[
        <>Click an agent to see its actions and its recent tasks.</>,
        <>Right-click an agent and choose <b>Rename / Update Agent</b> to give it a name you recognize.</>,
        <>Right-click an agent and choose <b>Pin Agent</b> to pin or unpin it.</>,
        <>Right-click an agent you no longer need and choose <b>Delete Agent</b>.</>,
      ]}
      tips={[
        <>Running an action from an agent uses exactly that app’s implementation, instead of letting the server pick one.</>,
        <>The same menu also holds <b>Bounce Agent</b>, <b>Kick Agent</b>, <b>Block Agent</b> and <b>Unblock Agent</b>.</>,
        <><b>Filter</b> → <b>By supervisor</b> keeps the agents that name an app as their supervisor, for example the plugin engine that started them.</>,
      ]}
    />
  ),
  agent: (
    <PageHelp
      intro="One connected app: whether it is online, the actions it provides and the tasks it ran recently. Come here to run something on exactly this app."
      steps={[
        <>Click an entry under <b>Actions</b> to open its run dialog. The task is sent to this agent.</>,
        <>Click a task under <b>Recent Tasks</b> to follow it, or open the <b>Tasks</b> tab of the sidebar for the last ones.</>,
        <>Press <b>States</b>, <b>Tasks</b> or <b>Bloks</b> in the header for the agent’s live state values, its full task history and its interface panels.</>,
        <>Press <b>Pin</b> to pin the agent, and <b>Unpin</b> to undo it.</>,
        <>Press <b>Bounce</b> to send the agent a bounce request.</>,
        <>Press <b>Copy Python</b> to copy a Python declaration of this agent’s actions to the clipboard.</>,
        <>Right-click the agent and choose <b>Create Blok from Agent</b> to get a custom blok made from its states and actions, already bound to this agent; it opens in the editor for you to change. With several agents selected, the same makes one blok with a part for each of them.</>,
        <>In debug mode (Settings → Developer), the <b>Debug</b> tab lists the bloks drawn on this page. Pick one to see what it sends, receives, writes and logs, and what it holds now under <b>Live state</b>.</>,
      ]}
      tips={[
        <>The dot next to the name is green when the agent is online and red when it is offline, with the time it was last seen.</>,
        <>A <b>Blocked</b> badge means the agent has been blocked. <b>Unblock Agent</b> in the menu at the right end of the header lifts it.</>,
        <>A <b>Supervised by</b> badge names the app that controls the agent’s lifecycle, for example the plugin engine that started its container. Its actions on the agent (stop, start, restart, …) are under <b>Supervisor</b> in the menu at the right end of the header. The agent says this about itself; the supervisor checks before it acts.</>,
      ]}
    />
  ),
  agentSpace: (
    <PageHelp
      intro="A 3D view for this agent with a timeline of delegated tasks underneath."
      steps={[
        <>Drag in the scene to orbit around the object, and scroll to move closer or further away.</>,
        <>Read the timeline below the scene for tasks and the calls they made, when there are any.</>,
      ]}
    />
  ),
  states: (
    <PageHelp
      intro="Every state the agents of your organization publish, such as the position of a stage or the settings of a camera. The most recently changed come first."
      steps={[
        <>Click a state to see its values.</>,
        <>Click an agent's name to open the agent.</>,
      ]}
      tips={[<>A state whose agent is offline is shown faded: its values are the last ones it reported.</>]}
    />
  ),
  agentStates: (
    <PageHelp
      intro="The state an agent publishes about itself, for example the position of a stage or the settings of a camera. Each state is shown with its values."
      steps={[
        <>Stay on <b>Live</b> to watch the values change as the agent reports them.</>,
        <>Switch to <b>Checkout</b> to look at an earlier moment.</>,
        <>Drag the <b>Revision</b> slider to step back through the recorded revisions. All states of the agent are shown as they were at that revision.</>,
      ]}
      tips={[
        <>Every change of a state gets a revision number. <b>Rev</b> on a card is the revision you are looking at.</>,
      ]}
    />
  ),
  agentActions: (
    <PageHelp
      intro="Every action this agent provides: what you can run on it."
      steps={[
        <>Type in the search field under the title to find an action by its name, description or interface.</>,
        <>Press <b>Stateful</b> to keep the actions that work on the agent's state, <b>Own interface</b> to keep the ones that bring their own way of starting a run.</>,
        <>Press <b>Clear filters</b> to see every action again.</>,
        <>Click an action's name to open it; press <b>Play</b> on its card to run it.</>,
      ]}
    />
  ),
  agentTasks: (
    <PageHelp
      intro="Every task that ran on this agent, newest first, with filters to find the ones you care about."
      steps={[
        <>Press <b>Any action</b> under the title and type to find one of the agent's actions; pick it to keep only its tasks.</>,
        <>Press <b>Running or done</b> and pick <b>Running</b> or <b>Done</b> to keep unfinished or finished tasks.</>,
        <>Press <b>Any state</b> and pick one, for example <b>Error</b> or <b>Lost</b>, to keep tasks in that state.</>,
        <>Use the date range next to them to keep tasks created in a period.</>,
        <>Press <b>Clear filters</b> to see everything again.</>,
        <>Click a task to open it.</>,
      ]}
      tips={[
        <>The filters are kept in the page link, so a shared link shows the same selection.</>,
      ]}
    />
  ),
  agentBloks: (
    <PageHelp
      intro="The bloks that run on this agent: interfaces whose values follow it and whose controls act on it."
      steps={[
        <>Click a blok to open it and use its controls.</>,
        <>Click the <b>Bloks</b> heading to see the bloks of all agents.</>,
        <>Right-click one and choose <b>Delete Blok</b> to remove it; its template stays.</>,
      ]}
      tips={[
        <>An empty list means no blok runs on this agent yet. Open a template from <b>Blok Templates</b> and press <b>Install</b> to make one.</>,
        <>For a template its app provides, the agent keeps its own blok, in step with its registrations.</>,
      ]}
    />
  ),
  agentPanels: (
    <PageHelp
      intro="The panels of this agent: bloks whose controls act on it. Each opens on a page of its own below the agent."
      steps={[
        <>Click a panel to open it and use its controls.</>,
        <>On the page of a panel its app provides, press <b>Fork</b> to copy its template into one of your own.</>,
      ]}
      tips={[
        <>The same panels sit as buttons in the agent page's header.</>,
        <>An empty list means no panel runs on this agent yet.</>,
      ]}
    />
  ),
  customBloks: (
    <PageHelp
      intro="Templates are what bloks are made of: a piece of interface written in BSX, running on no agent. Installing one makes a blok that runs on your agents. This page lists the templates people made, installed from a repository or a file, or forked from an app."
      steps={[
        <>Click a template to see a preview and the bloks made from it.</>,
        <>Press <b>New Template</b> in the header to write one in BSX, or right-click a template and choose <b>Edit Template</b> to change it.</>,
        <>Open a template and press <b>Install</b>: name the blok, choose the agents it runs on and press <b>Install</b>. The new blok opens.</>,
        <>Press <b>Install from file…</b> in the header and choose or drop a blok file someone exported. You see what is in it; press <b>Install</b> to make it a template and go on to choose its agents, or <b>Open in editor</b> to look at it first.</>,
        <>Right-click a template and choose <b>Export Template…</b> to save it as a file, or <b>Delete Template</b> to remove it.</>,
      ]}
      tips={[
        <>Most of the time you work with bloks, not templates: they are on the <b>Bloks</b> page, and editing a blok edits its template.</>,
        <>The templates your apps bring along are on the <b>App-provided Templates</b> page.</>,
      ]}
    />
  ),
  blokEditor: (
    <PageHelp
      intro="Write a blok in BSX: tags for the components, attributes for their props. What you write is its template, shared by every blok made from it. The preview on the right follows as you type, running live on the blok you opened, or drawn against the demo."
      steps={[
        <>Type <b>&lt;</b> to see the components that fit where the cursor is; a part of its parent (a <b>SelectItem</b> in a <b>Select</b>) comes first. Accepting one fills in the props it needs.</>,
        <>Inside a tag, start typing to see its props; hover a tag or a prop to read what it does.</>,
        <>An attribute in quotes is a literal (<b>label=&quot;Go&quot;</b>); one in braces is an expression: <b>{"{agents.stage.position.x}"}</b> reads a state of an agent the blok is bound to, <b>{"{args.image}"}</b> what the blok is opened for, <b>{"{str.upper(x)}"}</b> calls a function. Text between tags fills the component's text prop: <b>&lt;Button&gt;Go&lt;/Button&gt;</b>.</>,
        <>A callback does exactly one thing: <b>{"onClick={agents.stage.move(x: event.value) into move}"}</b> calls an action and keeps its task as <b>move</b> (read <b>move.running</b>, <b>move.returns</b>); <b>{"queries.<name>.refetch()"}</b>, <b>ui.copy</b> and <b>task.answer</b> are the other things it may do.</>,
        <>Declare the agents it is bound to in the <b>Agents</b> tab: press <b>Add agent</b> and pick one, then open it and click the actions and states it should use from what that agent offers. Completion offers exactly those; hover one and press the copy button to copy how it is written (<b>agents.&lt;key&gt;.&lt;name&gt;</b>).</>,
        <>A green dot before an action or a state means the source uses it. A yellow row is something the source names but nothing declares: click it to declare it.</>,
        <>Press <b>Code</b>, <b>Split</b> or <b>Preview</b> at the top to show the source, the preview, or both; the choice is kept.</>,
        <>Open the <b>Chat</b> tab (shown when Alpaka is installed) to design the blok with an assistant: it reads the source as it stands in the editor and writes its changes into it, where you see them in the preview. Nothing it writes is saved until you press <b>Save</b>.</>,
        <>Press <b>Export</b> to save the draft as a file; <b>Install from file…</b> on the <b>Bloks</b> or <b>Blok Templates</b> page installs such a file.</>,
        <>Switch what the preview runs on with the select over it: <b>Demo values</b>, or one of the bloks made from this template. The line under the source says whether it would save, and why not.</>,
        <>Everything is inside one <b>&lt;Blok kind=&quot;custom&quot; context=&quot;panel&quot;&gt;</b> (or <b>context=&quot;scene&quot;</b>). Declare form state with <b>{'<local name="x" default={3} persist />'}</b> as the first children of the element it is for (a control binds it with <b>{"bind={x}"}</b>; <b>persist</b> keeps it on this device), and reads as children of the <b>&lt;Blok&gt;</b>: <b>{'<query name="q" service="mikro" document="...">'}</b> with <b>&lt;var key value /&gt;</b> children, read as <b>queries.&lt;name&gt;</b> (pass <b>then</b> as a variable to read the moment viewed while time-travelling).</>,
        <>Open the <b>Preview on</b> tab and click one of the bloks made from this template to run the draft on its agents while you type, with live values; click <b>Demo values</b> to go back. The line over the preview says which one is shown.</>,
        <>Opened from a blok (its <b>Edit</b> button), the preview starts on that blok, and a line over the editor says what a save reaches: the other bloks made from the template change too, unless held at a revision. A blok held at one is not changed by your save; press <b>Follow latest</b> there to let it take the new revision.</>,
        <>Fill the <b>Demo</b> tab with JSON to see the preview with values: <b>{"{deps, args, task, queries}"}</b>, as the blok reads them.</>,
        <>Give it a logo with a <b>&lt;logo title=&quot;…&quot;&gt;</b> at the top of the <b>&lt;Blok&gt;</b>, holding a drawing on a 24-unit grid: <b>{'<Circle cx="12" cy="12" r="7" />'}</b>, <b>{'<Path d="M12 5v14" />'}</b>. It stands for the blok in lists, pins and tabs instead of the panel icon; the <b>Details</b> tab shows it as you write it. It is a fixed drawing in the logo pens (<b>ink</b>, <b>brand</b>, <b>muted</b>, …).</>,
        <>Press <b>Create blok</b> or <b>Save</b>, say in a sentence what changed if you like, and press <b>Save revision</b>. Every save is a revision of its own.</>,
        <>A moment after you stop typing the server checks the draft too: the line under the editor says what it found, and its warnings are underlined.</>,
        <>If someone saved while you were editing, a yellow bar says so: press <b>Save on top</b> to save yours after theirs, or <b>Load it</b> to drop your changes and take theirs.</>,
        <>Open the <b>History</b> tab to see every revision, who made it and when. Hover one and press <b>Restore</b> to make it the latest again; that is a revision too, so nothing is lost.</>,
      ]}
      tips={[
        <>A red underline marks what will not save: BSX that does not parse, a prop the component does not have, or an agent the <b>Agents</b> tab does not declare.</>,
        <>Wrap what loads in <b>&lt;suspense&gt;</b> with a <b>&lt;fallback&gt;</b> and an <b>&lt;error&gt;</b>; without one each component shows its own skeleton.</>,
        <>A blok an app provides is made your own first (<b>Make it your own</b>): its template is forked, a blok of the copy is installed on the same agents, and that one opens in the editor. The copy reads the app&apos;s agent as <b>agents.&lt;app&gt;</b>, one it runs on.</>,
      ]}
    />
  ),
  providedBloks: (
    <PageHelp
      intro="The templates your apps provide: what their App Bloks are made of. Their agents keep each one in step with what they register, and install it themselves."
      steps={[
        <>Click a template to see a preview and which agents provide it.</>,
        <>Right-click a template and choose <b>Fork Template</b> to make a copy of your own you can change and install on other agents.</>,
      ]}
      tips={[
        <>A provided template carries its app’s name. It changes, and goes, with its agents’ registrations, so it can’t be changed, installed or deleted by hand.</>,
        <>To change an App Blok, open it and press <b>Edit</b>: it is made your own first.</>,
      ]}
    />
  ),
  blok: (
    <PageHelp
      intro="One blok template: what it looks like, drawn large with its demo values, and the bloks made from it, which run on real agents."
      steps={[
        <>Press <b>Install</b>, name the blok, choose an agent for each one it asks for and press <b>Install</b>. The new blok opens.</>,
        <>For a template an app provides, press <b>Fork Template</b> instead, give the copy a name and press <b>Fork</b>. The new template opens.</>,
        <>Look at the template itself at the top of the page to see what it looks like before installing it; a 3D scene can be turned and framed.</>,
        <>Click a card under <b>Bloks made from it</b> to open one.</>,
        <>Open the <b>Info</b> tab of the sidebar for its kind, module, revision and the agents it asks for.</>,
        <>Press <b>Export Template…</b> to save it as a file. The dialog says what goes in, and that which agents it runs on stays here.</>,
        <>Press <b>Delete Template</b> to remove a template. You are taken back to the list.</>,
      ]}
      tips={[
        <>The preview is filled with demo state, not with live values from an agent.</>,
        <>Templates are not pinned; pin the bloks made from them.</>,
        <>A yellow note above the template lists problems found in its definition.</>,
        <><b>Provided by</b> in the <b>Info</b> tab names the app whose agents provide the template, and <b>Its agents</b> lists them, with a green dot for the connected ones.</>,
      ]}
    />
  ),
  dashboards: (
    <PageHelp
      intro="Dashboards arrange bloks, the interface panels of your apps, on one screen so you can watch and control several devices together."
      steps={[
        <>Press <b>Create Dashboard</b>. It appears as “New Dashboard”.</>,
        <>Click the dashboard to open it and add panels.</>,
        <>Right-click a dashboard and choose <b>Delete Dashboard</b> to remove it.</>,
      ]}
    />
  ),
  dashboard: (
    <PageHelp
      intro="A dashboard holds panels, each a blok connected to your agents. Panels can sit side by side, stacked or in tabs."
      steps={[
        <>Open the <b>Bloks</b> tab of the sidebar and drag a blok onto the dashboard. In <b>Install Blok</b>, choose the agents it should run on and press <b>Install</b>.</>,
        <>Drop an agent card onto the dashboard instead to pick a blok for that agent. The agent is preselected in the dialog.</>,
        <>Drag a panel by its tab to move it next to, below or behind another panel.</>,
        <>Press <b>Edit</b>, then hover a tab and press its cross to close the panel. <b>Reset</b> discards the arrangement and reopens every panel, and <b>Done</b> leaves editing.</>,
        <>Press <b>Refresh</b> to reload the dashboard from the server.</>,
        <>Press <b>Delete Dashboard</b> to remove it. You are taken back to the list.</>,
      ]}
      tips={[
        <>The arrangement of the panels is remembered on this computer.</>,
      ]}
    />
  ),
  dependency: (
    <PageHelp
      intro="A dependency is something an action or a blok needs from another app, named by its key. This page shows that key as its title."
      steps={[
        <>Read the title to see which key the dependency is known by.</>,
        <>Use the <b>Chat</b> tab of the sidebar to discuss it with your team.</>,
      ]}
    />
  ),
  implementations: (
    <PageHelp
      intro="An implementation is one app’s version of an action. The same action can be provided by several apps; each of them is listed here, newest first."
      steps={[
        <>Read a card to see the action and, below it, the interface name the app registered it under.</>,
        <>Click an implementation to open it. From its page the action runs on exactly that app.</>,
        <>Right-click an implementation and choose <b>Create Shortcut</b> to save its action as a shortcut.</>,
      ]}
      tips={[
        <>To find something to run by what it does, the <b>Actions</b> page is the better start. Come here when you care which app does the work.</>,
      ]}
    />
  ),
  implementation: (
    <PageHelp
      intro="One app’s version of an action. Running it here sends the task to exactly this agent. An implementation that runs a flow shows the flow diagram instead of the form."
      steps={[
        <>Fill in <b>Arguments</b> and press the arrow button to run it. The result appears under <b>Outs</b>.</>,
        <>Press <b>Details</b> for everything known about the implementation: its agent, dependencies, effects and relationships.</>,
        <>Scroll to <b>Latest Tasks</b> for earlier runs of this implementation and click one to open it.</>,
        <>Press <b>Go to Action</b> to see the action in general, or <b>Go to Agent</b> to see the app that provides it.</>,
        <>Open the <b>Stats</b> tab of the sidebar for how many tasks it has run.</>,
      ]}
      tips={[
        <>The dot next to the agent name is green while the agent is online. An offline agent cannot run the task.</>,
        <>The form starts with the arguments of the latest run.</>,
      ]}
    />
  ),
  implementationDependencies: (
    <PageHelp
      intro="What this implementation needs from other agents to run: each dependency names the kind of app it needs and how many."
      steps={[<>Click a dependency to open it.</>]}
      tips={[
        <><b>auto</b> means a matching agent is picked for you when the task starts; <b>optional</b> means the task runs without one.</>,
      ]}
    />
  ),
  interfaces: (
    <PageHelp
      intro="An interface is a named contract a kind of data can fulfil, so an action can ask for “anything that behaves like this” instead of one exact type. This page lists the interfaces your apps have registered."
      steps={[
        <>Read the line under each name: it is the full identifier apps use for the interface.</>,
        <>Click an interface to open its page.</>,
      ]}
      tips={[
        <>Interfaces are registered by apps; there is nothing to create here.</>,
      ]}
    />
  ),
  interface: (
    <PageHelp
      intro="One interface: its key and the full identifier apps use to refer to it."
      steps={[
        <>Read the identifier below the title to see exactly which interface this is.</>,
        <>Open the <b>Knowledge</b> tab of the sidebar for what has been recorded about it.</>,
      ]}
    />
  ),
  materializedBloks: (
    <PageHelp
      intro="Bloks are interfaces running on your agents: their values are live and their controls act on your devices. This page lists the ones people installed."
      steps={[
        <>Click a blok to open it and use it.</>,
        <>Right-click one and choose <b>Edit</b> to change it in BSX, <b>Pin Blok</b> to keep it first, or <b>Delete Blok</b> to remove it.</>,
        <>Press <b>Install from file…</b> in the header and choose or drop a blok file someone exported to install it here.</>,
        <>Press <b>Templates</b> in the header to install another from a template, or to write a new one.</>,
      ]}
      tips={[
        <>The bloks your apps bring along are on the <b>App Bloks</b> page.</>,
        <>The ones you pinned come first, under <b>Pinned</b>, and show on the Rekuest home and in ⌘K.</>,
      ]}
    />
  ),
  providedMaterializedBloks: (
    <PageHelp
      intro="The bloks your apps bring along. Each agent keeps its own, in step with its registrations."
      steps={[
        <>Click a blok to open it and use it.</>,
        <>Open one and press <b>Edit</b> to change it: it is made your own first, a copy on the same agents, and that copy opens in the editor.</>,
        <>Open one and press <b>Install Again…</b> to make a copy of your own without editing it.</>,
      ]}
    />
  ),
  materializedBlok: (
    <PageHelp
      intro="A blok: a working interface running on your agents. Its controls run actions on those agents and its values follow their state."
      steps={[
        <>Use the controls in the panel as you would on the device itself.</>,
        <>Open the <b>Bindings</b> tab of the sidebar to see which agent stands behind each part of the blok. Click an agent to open it.</>,
        <>Click the name under <b>Made from the template</b> in the <b>Bindings</b> tab to open its template.</>,
        <>Press <b>Edit</b> to change it in BSX, with the draft running live on its agents as you type. Saving changes its template, so the other bloks made from it change too. One its app provides is made your own first.</>,
        <>Press <b>Export…</b> to save it as a file to install elsewhere. The dialog says what goes in, and that which agents it runs on stays here.</>,
        <>In debug mode (Settings → Developer), open the <b>Debug</b> tab to follow what the blok does. Pick a blok from the list at its top; under <b>Events</b>, <b>Out</b> lists the actions it calls, <b>In</b> the task events and agent states that come back, <b>State</b> every value it writes and <b>Logs</b> the tasks' log lines, newest first. Click a row to see its value; type in the filter to narrow the list. <b>Live state</b> shows everything the blok holds right now. Pause, clear or copy the record with the buttons at the top.</>,
        <>Press <b>History</b> in the header to see the panel as it was earlier. In the bar below it, drag the slider, press the arrows to go to the change before or after, or press play to let it run on from there. Click the time to jump to another one. Press <b>Go live</b> to return to the present.</>,
        <>Press <b>Revisions</b> in that bar to go through the past one recorded change of an agent at a time instead: the arrows go to the revision before or after, the slider runs over all revisions since the agent started, and typing a number into <b>Revision</b> and pressing Enter goes straight to it. With more than one agent, choose whose revisions to step through. Press <b>Time</b> to get the slider back.</>,
        <>Press <b>Reinstantiate</b> to choose again what the blok is opened for. The form starts from what it shows now; press <b>Open</b> to show the new items, or <b>Cancel</b> to keep them.</>,
        <>Press <b>Install Again…</b> to make another blok of the same template, with the current agents filled in. A template an app provides is forked first, so name the copy and press <b>Fork</b>. The new one opens; this one stays as it is.</>,
        <>Press the <b>Rev</b> button in the header to choose which revision of its template this shows: the latest, which follows every save, or one it stays at while the template changes on. It reads <b>Held at rev</b> while it stays at one.</>,
        <>Press <b>Pin</b> to pin it for yourself: it is listed first, and shows on the Rekuest home and in ⌘K. Press <b>Unpin</b> to undo it.</>,
        <>Press <b>Delete Blok</b> to remove it; its template stays. You are taken back to the list.</>,
      ]}
      tips={[
        <>While the bar says <b>PAST</b> the panel only shows what was: its controls run nothing.</>,
        <>A revision number counts within one run of an agent and starts again when the agent restarts. The other agents are shown as they were at the moment of the revision.</>,
        <>A button that needs an agent which is offline, or a part no agent is bound to, is grayed out: hover it to see why. The <b>Bindings</b> tab lists what is <b>Not bound</b>.</>,
        <>In the <b>Bindings</b> tab a green dot means the agent is connected, a grey one that it is offline.</>,
        <><b>Belongs to</b> in the <b>Bindings</b> tab names the agent that keeps this blok, for a template its app provides.</>,
      ]}
    />
  ),
  memoryShelve: (
    <PageHelp
      intro="A memory shelve is where an agent keeps objects in its own memory between tasks. This page lists the drawers of one shelve, each with its label and the id of the stored object."
      steps={[
        <>Read the list to see what the agent is currently holding.</>,
        <>Open the <b>Knowledge</b> tab of the sidebar for what has been recorded about the shelve.</>,
      ]}
    />
  ),
  orgTasks: (
    <PageHelp
      intro="Every task across your organization, newest first. Use it to see what the whole team is running, not only your own work."
      steps={[
        <>Click <b>Running</b> or <b>Done</b> next to <b>Status:</b> to keep unfinished or finished tasks. Click the chip again to drop it.</>,
        <>Click one or more chips next to <b>State:</b>, for example <b>Error</b>, <b>Lost</b> or <b>Paused</b>, to keep tasks in those states.</>,
        <>Use the date range in the header to keep tasks created in a period.</>,
        <>Press <b>Clear filters</b> to see everything again.</>,
        <>Click a task to open it, or right-click it and choose <b>Pause / Resume</b>.</>,
      ]}
      tips={[
        <><b>Lost</b> means the agent disappeared while the task ran, so how it ended is unknown.</>,
      ]}
    />
  ),
  tasks: (
    <PageHelp
      intro="A task is one run of an action: who ran it, with which inputs, on which app and how it ended. This page lists tasks, newest first."
      steps={[
        <>Click a task to see its progress, inputs and results.</>,
        <>Use the date range in the header to keep tasks created in a period.</>,
        <>Right-click a task and choose <b>Pause / Resume</b> to pause a running task or resume a paused one.</>,
        <>Click the agent name on a card to open the app that ran it.</>,
      ]}
      tips={[
        <>A card shows the progress and the last message while a task runs, and how long it took once it finished.</>,
        <>The list updates while tasks start and finish.</>,
      ]}
    />
  ),
  task: (
    <PageHelp
      intro="One run of an action, from start to finish. Switch in the header between Live, the run as it is now, and Timeline, everything that happened over time."
      steps={[
        <>The line under the header says where the task stands, the latest thing it said, how far it is and how long it has taken.</>,
        <><b>Live</b> shows the run as its action draws it, and nothing else, when the action has a view of its own: its panel, or its <b>Space</b>. Otherwise it shows the latest thing the task showed, and <b>Flow</b> or <b>Result</b> where the task has them.</>,
        <>When the task asks you something, the question waits until you answer it: on its card above the page, or inside the action's own view when that view draws it.</>,
        <><b>Timeline</b> holds the lane, <b>Inputs</b>, and every earlier question with its answer. Press <b>Show</b> on a question to see it as it was asked.</>,
        <>Click a mark or a bar on the lane to read that event or call below it, next to <b>Inputs</b> and the result.</>,
        <>Hold ⌘ or Ctrl and scroll over the lane to zoom in on a moment.</>,
        <>While the stage is shown, the lane lies over its lower part. Press <b>Timeline</b> at its top left to fold it away or bring it back.</>,
        <>On the Timeline, open the <b>More</b> menu and choose <b>Show the stage</b> or <b>Hide the stage</b> for the large view above the lane. Depending on the task it offers <b>Flow</b>, <b>Space</b> and <b>Result</b>.</>,
        <><b>Space</b> shows the space the task's apps stand in. Drag the slider under it, or click a mark on the lane, to see the devices as they stood at that moment; press <b>Go live</b> to follow a running task again.</>,
        <>Press <b>Cancel</b> to stop a task that is still running. <b>Pause</b> and <b>Interrupt</b> are in the <b>More</b> menu.</>,
        <>Press <b>Resume</b> on a paused task to let it continue. The <b>More</b> menu offers <b>Step to next breakpoint</b>.</>,
        <>Press <b>Rerun</b> to run the task again with the same inputs (in the <b>More</b> menu while the task still runs). You are taken to the new task.</>,
        <>In debug mode (Settings → Developer), the <b>Debug</b> tab lists the bloks drawn on this page. Pick one to see what it sends, receives, writes and logs, and what it holds now under <b>Live state</b>.</>,
      ]}
      tips={[
        <>The <b>Info</b> tab of the sidebar says what the task ran, who started it, where it ran and how long it took, with its ids to copy.</>,
        <>The <b>Log</b> tab of the sidebar holds the complete record line by line; <b>Logs</b> in the <b>More</b> menu opens it as plain text that is easy to copy.</>,
        <>The devices in <b>Space</b> are there to look at: nothing in them can be run from the task. They are shown where they are placed today.</>,
        <>Rerunning a lost task can ask for confirmation first: it may have started before its agent disappeared, and so may already have acted on a device.</>,
        <>If a task failed for a reason that looks like a bug, <b>Report Bug</b> in the <b>More</b> menu opens a report with the task attached.</>,
      ]}
    />
  ),
  taskLog: (
    <PageHelp
      intro="The raw event log of one task as plain text: time, kind, level and message of every event, plus any returned values."
      steps={[
        <>Select lines and copy them to share what happened, for example in a bug report.</>,
        <>Press <b>Rerun</b> to run the task again with the same inputs.</>,
        <>Press <b>Cancel</b> or <b>Interrupt</b> to stop the task while it is still running.</>,
      ]}
      tips={[
        <>The task page shows the same events on a time lane, which is easier to read for long tasks.</>,
      ]}
    />
  ),
  resolution: (
    <PageHelp
      intro="A resolution records which agents fulfil the dependencies of an implementation: when an action needs help from other apps, this is the plan of who provides what. The graph draws that plan."
      steps={[
        <>Read the graph from <b>Root</b> outwards: each dashed box is a dependency, and the cards inside are the implementations chosen for it.</>,
        <>Press <b>Vertical Layout</b> or <b>Horizontal Layout</b> to rearrange the graph.</>,
        <>Fill in <b>Arguments</b> on the left and press the arrow button to run the implementation with this resolution. The result appears under <b>Outs</b>.</>,
      ]}
    />
  ),
  automations: (
    <PageHelp
      intro="An automation runs an action by itself: on a clock (every few minutes, or at fixed times), or on a signal (whenever a service reports that an object was created, updated or deleted). This page lists them all, with what needs a look first."
      steps={[
        <>Read a row like a search result: its name, what sets it off underneath, and at the end where it stands (next run, last firing, paused or failed). The dot on its icon is its state.</>,
        <>Press <b>New automation</b>. Under <b>When</b>, choose <b>On a clock</b> and set the rhythm, or <b>On a signal</b> and pick the signal to wait for.</>,
        <>For a signal, press <b>Add condition</b> under <b>Only if</b> to react only to objects that match.</>,
        <>Under <b>Do</b>, choose the action and fill in its arguments. On a signal, one argument is filled with the signalled object.</>,
        <>Under <b>Where</b>, pin it to one app or leave it to any, then press <b>Create automation</b>.</>,
        <>Hover a row to pause or resume it, run a clock automation now, or open it to the side.</>,
      ]}
      tips={[
        <>Every choice in the dialog has a <b>Change</b> button, so the signal and the action can be picked again at any point.</>,
        <>Use <b>Clock</b> and <b>Signal</b> in the header to see one kind only, <b>Failing</b> to see what needs a look, and the search to find a rule by its words: its name, action, app, signal or wiregram.</>,
        <>Open <b>Limits</b> in the dialog to end a rule on a date or after a number of runs. A rule that reached its limit reads <b>ended</b>.</>,
        <>Press <b>Export…</b> to write rules down as a wiregram, a document another organization can import.</>,
        <>An automation can also be made from an action: right-click it and choose <b>Schedule…</b> or <b>Run on Signal…</b>.</>,
      ]}
    />
  ),
  schedule: (
    <PageHelp
      intro="One automation on a clock. The list under its name is the rule: when it runs, the action, its arguments and where. Below are the runs it has produced so far."
      steps={[
        <>Read <b>When</b> for the rhythm and <b>Next</b> for the coming times it will run.</>,
        <>Press <b>Run now</b> to start the next run right away instead of waiting for its time.</>,
        <>Press <b>Pause</b> to stop it from creating runs, and <b>Resume</b> to start it again.</>,
        <>Press <b>Edit</b> to change when it runs and with which arguments.</>,
        <>Under <b>Runs</b>, each row is one run: how it went, when and how long it took. Click the status to open the task.</>,
      ]}
      tips={[
        <>A red line under the name is the error of the last failed run, with the number of failures in a row.</>,
        <>Editing can change everything about it, the action and the app it is pinned to included. Press <b>Duplicate</b> to start a second rule from this one.</>,
        <><b>Until</b> appears when it has an end: a date, or a number of runs. Past it, the schedule reads <b>Ended</b> and runs no more.</>,
      ]}
    />
  ),
  trigger: (
    <PageHelp
      intro="One automation on a signal. The list under its name is the rule: the signal it waits for, the conditions that must hold, the action it then runs, with which arguments and where."
      steps={[
        <>Read <b>When</b> and <b>Only if</b> for what sets it off, <b>Do</b> and <b>With</b> for what it runs.</>,
        <>Press <b>Disable</b> to stop it from firing, and <b>Enable</b> to switch it back on.</>,
        <>Press <b>Edit</b> to change its conditions and the other arguments.</>,
        <>Under <b>Firings</b>, each row is a signal this trigger listened for: the object, whether it started a run, was rejected or failed, and why. Click a status to open the task.</>,
        <>Hover a firing and press <b>Fire again</b>, or press <b>Fire on a signal…</b> in the header, to run it on a stored signal by hand.</>,
      ]}
      tips={[
        <><b>Failing</b> means the last firings created no run; the red line gives the reason.</>,
        <>Editing can change everything about it, the signal and the action included. Press <b>Duplicate</b> to start a second rule from this one.</>,
      ]}
    />
  ),
  signals: (
    <PageHelp
      intro="Signals are the announcements services make when an object is created, updated or deleted. This page shows them newest first, with the runs each one started. It is the feed automations on a signal react to."
      steps={[
        <>Read a row to see which object changed, what happened to it, which service reported it and what it carried.</>,
        <>Follow an arrow to open a task the signal started; the name in brackets is the trigger that started it.</>,
        <>Hover a row and press <b>Run something on this</b> to make an automation for signals like it. Its values are offered as conditions.</>,
        <>Press <b>Fired something</b> to keep only signals that started a run, and <b>created</b>, <b>updated</b> or <b>deleted</b> to keep one kind. New signals appear by themselves.</>,
        <>Click a row's time to open the signal: everything it carried, and what each trigger did with it.</>,
        <>Open the <b>Declared</b> tab of the sidebar to see every signal the services can send. Hover one and press its lightning button to make an automation on it.</>,
      ]}
      tips={[
        <>A “from …” note names the task that caused the change.</>,
        <>The search looks at the structure, the object's id, the service and every value the signal carried.</>,
      ]}
    />
  ),
  signal: (
    <PageHelp
      intro="One signal: the object a service announced, what happened to it, when, and the values it carried. Below is what every trigger that listened for it did."
      steps={[
        <>Read the list for the structure, the service that sent it, and the task that caused the change, if one did.</>,
        <>Under <b>Firings</b>, each row is a trigger that met this signal: it fired a run, rejected the signal, or failed, with the reason.</>,
        <>Press <b>Run something on this</b> to make an automation for signals like it.</>,
        <>Press <b>Fire a trigger…</b> to run one of the triggers listening for it on this signal now.</>,
      ]}
      tips={[
        <><b>Matched</b> is when triggers were checked against it. Until then it is waiting.</>,
        <>No firings and a matched time means no trigger was listening.</>,
      ]}
    />
  ),
  firings: (
    <PageHelp
      intro="A firing is one trigger meeting one signal. This page is the log of all of them, newest first: which signals started a run, which were rejected, and which failed."
      steps={[
        <>Read a row for the object, the trigger, what became of it and why.</>,
        <>Use <b>Fired</b>, <b>Rejected</b> and <b>Failed</b> to keep one outcome, and <b>Fired by hand</b> to keep only replays.</>,
        <>Click a status to open the task a firing started, the trigger's name to open the trigger, or the time to open the firing itself.</>,
        <>Hover a row and press <b>Fire again</b> to run the same trigger on the same signal once more.</>,
      ]}
      tips={[
        <><b>Rejected</b> is not an error: the signal did not meet the conditions, came too soon after the last one for that object, or the trigger had reached its limit.</>,
        <><b>All firings</b> on a trigger's page opens this page narrowed to that trigger.</>,
      ]}
    />
  ),
  wiregrams: (
    <PageHelp
      intro="A wiregram is one document of automations: schedules and triggers, each naming the app and interface it runs. Importing it creates those rules here; this page lists what was imported."
      steps={[
        <>Press <b>Import…</b>, choose the file or paste the document, check the summary, and press <b>Import</b>.</>,
        <>Click a wiregram to see the rules it owns and the document itself.</>,
        <>To make one from your own rules, open <b>Automations</b> and press <b>Export…</b>.</>,
      ]}
      tips={[
        <>Importing a document whose key was imported before updates the rules of that import, and removes the ones it no longer lists.</>,
        <>An import is all or nothing: if one rule cannot be created, none are.</>,
      ]}
    />
  ),
  wiregram: (
    <PageHelp
      intro="One imported document and the automations it owns. The rules are ordinary schedules and triggers: open one to see its runs."
      steps={[
        <>Read <b>Automations</b> for the rules it created, each with where it stands.</>,
        <>Open the <b>Document</b> tab of the sidebar to read the document as it was imported.</>,
        <>Press <b>Download</b> to save the document as a file.</>,
        <>Press <b>Import again…</b> to change the document and bring its rules in line.</>,
      ]}
      tips={[
        <>Deleting a wiregram (right-click it) also deletes the schedules and triggers it owns.</>,
        <>Whether a rule is enabled is yours to decide: importing again keeps your switch.</>,
      ]}
    />
  ),
  services: (
    <PageHelp
      intro="The services of this server as the automation system knows them: which one sends which signals, and which structures it hosts."
      steps={[
        <>Read a row for the service's name, what it says it is, and how much it declares.</>,
        <>Use the search to find a service by its name or description.</>,
        <>Click a service to open what it declares.</>,
      ]}
      tips={[
        <>A service appears once it has declared a signal or a structure.</>,
      ]}
    />
  ),
  service: (
    <PageHelp
      intro="One service and what it declares: the signals it sends when its objects change, and the structures it hosts, each with the descriptors its objects carry."
      steps={[
        <>Under <b>Signals</b>, hover one and press its lightning button to make an automation on it. The names after the arrow are your triggers already waiting for it.</>,
        <>Under <b>Structures</b>, click one to see the actions that take or return it.</>,
        <>Read a structure's descriptors for what a trigger's conditions can test: the key, and what kind of value it holds.</>,
        <>Press <b>What it sent</b> to open the signal feed narrowed to this service.</>,
      ]}
      tips={[
        <>The search narrows both lists by identifier, label, description and descriptor key.</>,
      ]}
    />
  ),
  firing: (
    <PageHelp
      intro="One firing: one trigger meeting one signal. It says what became of it (a run, a rejection, a failure) and why."
      steps={[
        <>Read <b>Trigger</b> and <b>Signal</b> for the two sides, and <b>Run</b> for the task it started, if it did.</>,
        <>Press <b>Fire again</b> to run the same trigger on the same signal once more.</>,
      ]}
      tips={[
        <><b>By hand</b> marks a replay: someone fired it, rather than the signal arriving.</>,
        <>A fired firing without a run means the run is no longer kept.</>,
      ]}
    />
  ),
  shortcuts: (
    <PageHelp
      intro="A shortcut is a saved way to run an action: some arguments are already filled in, so running it takes one click. This page lists the shortcuts that exist."
      steps={[
        <>Click a shortcut to open it and run it.</>,
        <>Right-click a shortcut and choose <b>Delete Shortcut</b> to remove it.</>,
        <>To make a new one, right-click an action on the <b>Actions</b> page and choose <b>Create Shortcut</b>.</>,
      ]}
      tips={[
        <>Shortcuts that fit an object show up under <b>Shortcuts</b> when you right-click that object.</>,
        <>A shortcut an admin pinned for you shows under <b>Pinned</b> at the top of that menu, and you cannot unpin it.</>,
      ]}
    />
  ),
  shortcut: (
    <PageHelp
      intro="One shortcut: an action with part of its arguments saved. Only the arguments that were left open are asked for here."
      steps={[
        <>Fill in the remaining fields under <b>Arguments</b> and press the arrow button to run it.</>,
        <>Read the result under <b>Outs</b> once the task has returned.</>,
        <>Click the title to copy the hash of the underlying action to the clipboard.</>,
        <>Open the menu button at the right end of the header and choose <b>Delete Shortcut</b> to remove it.</>,
        <>As an admin, open the same menu and choose <b>Pin for…</b> to pin it at the top of menus. Narrow who by member, app, client or device; anything left empty matches everyone.</>,
      ]}
      tips={[
        <>A number in brackets after the description is the key bound to this shortcut.</>,
        <><b>Pinned for</b> lists each pin: the member (or every member) and the app, client or device it is limited to. An admin removes one with the cross.</>,
        <>An <b>Errors</b> box appears next to the result when the run failed.</>,
      ]}
    />
  ),
  toolboxes: (
    <PageHelp
      intro="A toolbox groups shortcuts that belong together, like the tools for one instrument or one analysis."
      steps={[
        <>Read the description on a card to see what a toolbox is for.</>,
        <>Click a toolbox to see the shortcuts inside it and run one.</>,
      ]}
    />
  ),
  toolbox: (
    <PageHelp
      intro="One toolbox with its description and the shortcuts it holds."
      steps={[
        <>Click a shortcut to open it and run it.</>,
        <>Right-click a shortcut and choose <b>Delete Shortcut</b> to remove it.</>,
        <>Open the <b>Knowledge</b> tab of the sidebar for what has been recorded about the toolbox.</>,
      ]}
    />
  ),
  spaces: (
    <PageHelp
      intro="A space is a room: where people left each device of the lab, the same for everyone. An action's 3D view places its devices in a room it names."
      steps={[
        <>Open a run of an action that draws the lab in 3D, right-click the scene, choose <b>Arrange devices</b> and move a device. The room is made then, and lists here.</>,
        <>Click a space to see which devices were moved in it, and where they stand.</>,
      ]}
    />
  ),
  space: (
    <PageHelp
      intro="One room: the devices people moved in it, and where they stand. A device nobody moved stands where its action's 3D view places it."
      steps={[
        <>Press <b>Reset</b> on a row to forget where that device was left: its action's 3D view places it again, for everyone.</>,
      ]}
    />
  ),
  state: (
    <PageHelp
      intro="One state an agent publishes about itself, with its values. Use it to watch a device live or to look up what it reported earlier."
      steps={[
        <>Stay on <b>Live</b> to watch the values change as the agent reports them.</>,
        <>Switch to <b>Checkout</b> and drag the <b>Revision</b> slider to see the values at an earlier revision.</>,
      ]}
      tips={[
        <>Every change gets a revision number, shown next to <b>Live</b>.</>,
        <>Live values only move while the agent is connected.</>,
      ]}
    />
  ),
  structurePackages: (
    <PageHelp
      intro="A structure package is a collection of data types and interfaces that belong together and can be used in actions. This page lists the packages your apps have registered."
      steps={[
        <>Click a package to see the types and interfaces in it.</>,
        <>From there, click a type to see which actions use it.</>,
      ]}
      tips={[
        <>Packages are registered by apps; there is nothing to create here.</>,
      ]}
    />
  ),
  structurePackage: (
    <PageHelp
      intro="One structure package and what it contains."
      steps={[
        <>Look under <b>Interfaces in this Package</b> and click one to open it.</>,
        <>Look under <b>Types in this Package</b> and click a type to see which actions use it.</>,
        <>Open the <b>Knowledge</b> tab of the sidebar for what has been recorded about the package.</>,
      ]}
    />
  ),
  structures: (
    <PageHelp
      intro="A structure is a kind of data that actions can take or return, such as an image or a table. This page lists the structures your apps have registered."
      steps={[
        <>Read the line under each name: it is the full identifier of that kind of data.</>,
        <>Click a structure to see which actions produce it and which accept it.</>,
      ]}
      tips={[
        <>To find actions for a kind of data directly, use <b>Works on</b> on the <b>Actions</b> page.</>,
      ]}
    />
  ),
  structure: (
    <PageHelp
      intro="One kind of data and where it is used. The line under the title is its full identifier."
      steps={[
        <>Look under <b>Used in Actions</b> for the actions that return this kind of data, and click one to open it.</>,
        <>Look under <b>Used as Input in Actions</b> for the actions that accept it.</>,
        <>Open the <b>Knowledge</b> tab of the sidebar for what has been recorded about the structure.</>,
      ]}
      tips={[
        <>A heading is left out when no action uses the structure that way.</>,
      ]}
    />
  ),
};
