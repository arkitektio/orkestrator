import { PageHelp } from "@/core/layout/help";

/**
 * rekuest's page instructions, one per page, shown in the page's Help tab
 * (`help={REKUEST_HELP.actions}`). Each names only what its page really offers:
 * the button labels, menu entries and dialogs are the ones on screen.
 */
export const REKUEST_HELP = {
  home: (
    <PageHelp
      intro="The starting point for running things. It shows every app connected to this server (an “agent”), the tasks that are running or just finished, and the actions those apps offer."
      steps={[
        <>Look at <b>Your Apps</b> to see which apps are connected. Press <b>Online</b> to hide the ones that are not reachable right now.</>,
        <>Type into <b>Search apps…</b>, or open <b>Filter</b> and pick <b>By app</b>, <b>By user</b> or <b>By device</b>, to narrow the grid. <b>Clear filters</b> brings everything back.</>,
        <>Click an app card to open the agent and see the actions it can run.</>,
        <>Right-click an app card for its actions, for example <b>Rename / Update Agent</b> or <b>Pin Agent</b>.</>,
        <>Scroll down to <b>Ongoing Tasks</b> and <b>Latest Tasks</b> and click a task to follow it.</>,
        <>Hover an action card at the bottom and press its play button to fill in the arguments and run it.</>,
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
      ]}
      tips={[
        <>The dot next to the name is green when the agent is online and red when it is offline, with the time it was last seen.</>,
        <>A <b>Blocked</b> badge means the agent has been blocked. <b>Unblock Agent</b> in the menu at the right end of the header lifts it.</>,
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
  agentTasks: (
    <PageHelp
      intro="Every task that ran on this agent, newest first, with filters to find the ones you care about."
      steps={[
        <>Click <b>Running</b> or <b>Done</b> next to <b>Status:</b> to keep unfinished or finished tasks. Click the chip again to drop it.</>,
        <>Click one or more chips next to <b>State:</b>, for example <b>Error</b> or <b>Lost</b>, to keep tasks in those states.</>,
        <>Use the date range in the header to keep tasks created in a period.</>,
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
      intro="The materialized bloks bound to this agent. A blok is a piece of interface an app provides; materialized means it has been connected to real agents and can be used."
      steps={[
        <>Click a materialized blok to open it and use its controls.</>,
        <>Click the <b>Materialized Bloks</b> heading to see the materialized bloks of all agents.</>,
        <>Right-click one and choose <b>Delete Materialized Blok</b> to remove it.</>,
      ]}
      tips={[
        <>An empty list means no blok has been materialized with this agent yet. Open a blok and press <b>Materialize Blok</b> to make one.</>,
      ]}
    />
  ),
  bloks: (
    <PageHelp
      intro="Bloks are pieces of user interface that apps provide: panels that show an agent’s state and offer its controls. They are the building blocks of dashboards."
      steps={[
        <>Click a blok to see a preview and where it is already in use.</>,
        <>Open a blok and press <b>Materialize Blok</b> to connect it to your agents.</>,
        <>Right-click a blok and choose <b>Delete Blok</b> to remove it.</>,
      ]}
      tips={[
        <>Bloks are registered by apps. An empty list means no connected app has provided one.</>,
      ]}
    />
  ),
  blok: (
    <PageHelp
      intro="One blok: a preview of its interface with demo values, what it depends on, and the materialized copies that are connected to real agents."
      steps={[
        <>Press <b>Materialize Blok</b>, choose an agent for each dependency and press <b>Submit</b> to make a working copy.</>,
        <>Click an entry in <b>Materialized Blok Index</b> to open a working copy.</>,
        <>Look at <b>Preview Workspace</b> to see what the blok looks like before connecting it.</>,
        <>Press <b>Delete Blok</b> to remove the blok. You are taken back to the list.</>,
      ]}
      tips={[
        <>The preview is filled with demo state, not with live values from an agent.</>,
        <>A <b>Diagnostics</b> box lists problems found in the blok’s definition.</>,
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
        <>Open the <b>Bloks</b> tab of the sidebar and drag a blok onto the dashboard. In <b>Materialize Blok</b>, choose the agents it should talk to and press <b>Submit</b>.</>,
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
      intro="A materialized blok is a blok that has been connected to real agents, so its controls act on your devices and its values are live. This page lists all of them."
      steps={[
        <>Click a materialized blok to open it and use it.</>,
        <>Right-click one and choose <b>Delete Materialized Blok</b> to remove it.</>,
        <>To make a new one, open a blok from the <b>Bloks</b> page and press <b>Materialize Blok</b>.</>,
      ]}
    />
  ),
  materializedBlok: (
    <PageHelp
      intro="A working interface panel: a blok connected to your agents. Its controls run actions on those agents and its values follow their state."
      steps={[
        <>Use the controls in the panel as you would on the device itself.</>,
        <>Open the <b>Bindings</b> tab of the sidebar to see which agent stands behind each part of the blok. Click an agent to open it.</>,
        <>Click the blok name in the <b>Bindings</b> tab to go back to the blok this was made from.</>,
        <>Press <b>Delete Materialized Blok</b> to remove it. You are taken back to the list.</>,
      ]}
      tips={[
        <>A yellow notice at the top names what stops the panel from working: a part that is <b>Not bound</b> to any agent, or a bound agent that is offline.</>,
        <>In the <b>Bindings</b> tab a green dot means the agent is connected, a grey one that it is offline.</>,
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
      intro="One run of an action, from start to finish. The band at the top says where it stands; the lane below it draws everything that happened over time."
      steps={[
        <>Click a mark or a bar on the lane to read that event or call below it, next to <b>Inputs</b> and the result.</>,
        <>Hold ⌘ or Ctrl and scroll over the lane to zoom in on a moment.</>,
        <>Press <b>Stage</b> to show or hide the large view above the lane. Depending on the task it offers <b>Flow</b>, <b>Space</b> and <b>Result</b>.</>,
        <>Press <b>Cancel</b> or <b>Interrupt</b> to stop a task that is still running, and <b>Pause</b> to hold it.</>,
        <>Press <b>Resume</b> on a paused task to let it continue. The arrow next to it offers <b>Step to next breakpoint</b>.</>,
        <>Press <b>Rerun</b> to run the task again with the same inputs. You are taken to the new task.</>,
      ]}
      tips={[
        <>The <b>Log</b> tab of the sidebar holds the complete record line by line; <b>Logs</b> in the header opens it as plain text that is easy to copy.</>,
        <>Rerunning a lost task can ask for confirmation first: it may have started before its agent disappeared, and so may already have acted on a device.</>,
        <>If a task failed for a reason that looks like a bug, <b>Report Bug</b> opens a report with the task attached.</>,
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
  schedules: (
    <PageHelp
      intro="A schedule runs an action on a clock: every few minutes, or at fixed times on a calendar. This page lists your schedules and where each one stands."
      steps={[
        <>Press <b>New schedule</b> and choose the action that should run.</>,
        <>Under <b>When</b>, pick <b>Every …</b> for a fixed interval or <b>On a calendar</b> for a cron line. The dialog says the timing back in words and previews the next runs.</>,
        <>Fill in <b>Arguments</b>, give it a <b>Name</b> and press <b>Create schedule</b>.</>,
        <>Right-click a schedule and choose <b>Run Now</b> to start its next run right away.</>,
        <>Right-click a schedule and choose <b>Pause / Resume</b>, <b>Edit Schedule</b> or <b>Delete Schedule</b>.</>,
      ]}
      tips={[
        <><b>Active</b> means it is waiting for its next run, <b>Paused</b> that it creates no runs, <b>Failing</b> that its last runs failed.</>,
        <>A schedule can also be made from an action: right-click the action and choose <b>Schedule…</b>.</>,
      ]}
    />
  ),
  schedule: (
    <PageHelp
      intro="One schedule: the action it runs, how often, with which arguments, and the runs it has produced so far."
      steps={[
        <>Press <b>Run now</b> to start the next run right away instead of waiting for its time.</>,
        <>Press <b>Pause</b> to stop it from creating runs, and <b>Resume</b> to start it again.</>,
        <>Press <b>Edit</b> to change when it runs and with which arguments.</>,
        <>Click a card under <b>Runs</b> to open that task and see how it went.</>,
        <>Click the action name above the title to open the action.</>,
      ]}
      tips={[
        <>A red line under the title is the error of the last failed run, with the number of failures in a row.</>,
        <>Editing keeps the action and the app it is pinned to. To change those, make a new schedule.</>,
      ]}
    />
  ),
  triggers: (
    <PageHelp
      intro="A trigger runs an action whenever a service signals that an object was created, updated or deleted, for example every time a new image arrives."
      steps={[
        <>Press <b>New trigger</b>, choose the signal to wait for under <b>When</b>, then pick the action to run.</>,
        <>Under <b>Hand it in as</b>, choose which argument of the action receives the signalled object.</>,
        <>Press <b>Add condition</b> under <b>Only if</b> to react only to objects that match, then press <b>Create trigger</b>.</>,
        <>Right-click a trigger and choose <b>Enable / Disable</b> to switch it on or off without deleting it.</>,
        <>Right-click a trigger and choose <b>Edit Trigger</b> or <b>Delete Trigger</b>.</>,
      ]}
      tips={[
        <>A trigger can also be made from an action (right-click it and choose <b>Run on Signal…</b>) or from a signal on the <b>Signals</b> page.</>,
        <>Deleting a trigger keeps the runs it already made.</>,
      ]}
    />
  ),
  trigger: (
    <PageHelp
      intro="One trigger. The sentence under the title spells out the rule: which signal it waits for, which conditions must hold, and which action it then runs."
      steps={[
        <>Press <b>Disable</b> to stop it from firing, and <b>Enable</b> to switch it back on.</>,
        <>Press <b>Edit</b> to change its conditions and the other arguments.</>,
        <>Click a card under <b>Runs</b> to open a task this trigger started.</>,
        <>Click the action name in the sentence to open the action.</>,
      ]}
      tips={[
        <><b>Failing</b> means the last firings created no run; the red line gives the reason.</>,
        <>Editing keeps the signal, the action and the argument that receives the object. To change those, make a new trigger.</>,
      ]}
    />
  ),
  signals: (
    <PageHelp
      intro="Signals are the announcements services make when an object is created, updated or deleted. This page shows them newest first, with the runs each one started. It is the feed triggers react to."
      steps={[
        <>Read a card to see which object changed, what happened to it and which service reported it.</>,
        <>Click the arrow link at the bottom of a card to open the task the signal started.</>,
        <>Hover a card and press the lightning button to make a trigger for signals like it.</>,
        <>Open the <b>Declared</b> tab of the sidebar to see every signal the services can send. Hover one and press its lightning button to make a trigger on it.</>,
      ]}
      tips={[
        <>A “from …” line on a card names the task that caused the change.</>,
        <>Nothing can be edited here; the page is for inspection.</>,
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
      ]}
      tips={[
        <>A number in brackets after the description is the key bound to this shortcut.</>,
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
      intro="A space is a 3D room in which your agents are placed, so a setup can be seen the way it stands in the lab."
      steps={[
        <>Press <b>Create</b>. The new space appears as “New Space” followed by a number.</>,
        <>Click a space to open its 3D scene.</>,
        <>Right-click a space and choose <b>Delete Space</b> to remove it.</>,
      ]}
    />
  ),
  space: (
    <PageHelp
      intro="The 3D scene of one space, with every agent placed in it shown as a model or a box."
      steps={[
        <>Drag in the scene to orbit, and scroll to move closer or further away.</>,
        <>Click a placement to open the interface panel of its agent next to it. Press <b>Close</b> on the panel to put it away.</>,
        <>Press <b>Edit</b> in the header to move placements or add new ones.</>,
        <>Open the menu button at the right end of the header and choose <b>Delete Space</b> to remove the space.</>,
      ]}
      tips={[
        <>The panel shows controls only when a materialized blok was chosen for the placement; otherwise it says there is no preview yet.</>,
      ]}
    />
  ),
  spaceEdit: (
    <PageHelp
      intro="The editor of a space. Here you place agents in the 3D scene and move them to where they stand."
      steps={[
        <>Drop an agent card onto the scene to add it. In <b>Create Placement</b>, optionally give it a <b>Role</b>, a <b>Materialized Blok</b> and a <b>3D Model</b>, then press <b>Create placement</b>.</>,
        <>Click a placement to select it, then drag the arrows that appear to move it.</>,
        <>Press <b>View</b> in the header to go back to the scene without the editing handles.</>,
      ]}
      tips={[
        <>Changes are saved automatically; there is no save button.</>,
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
