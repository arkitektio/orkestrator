import { PageHelp } from "@/core/layout/help";

/**
 * fluss's page instructions, one per page, shown in the page's Help tab
 * (`help={FLUSS_HELP.workspace}`). Each names only what its page really offers:
 * the button labels, menu entries and dialogs are the ones on screen.
 */
export const FLUSS_HELP = {
  home: (
    <PageHelp
      intro="Fluss wires actions together into workflows. A workspace is where you design one workflow; each save becomes a flow (a version of it), and each execution of a flow is a run. This page links every Fluss page, then shows what is running, your newest workspaces and the newest runs."
      steps={[
        <>Use the <b>Workspaces</b>, <b>Runs</b> and <b>Flows</b> tiles at the top to browse, search and sort everything of that kind.</>,
        <>Press <b>New workspace</b>, give it a name and press <b>Create</b>. The new workspace opens with an empty canvas.</>,
        <>Click a workspace card to continue working on its workflow.</>,
        <>Look at <b>Running now</b> for the runs that are still executing, and click one to follow it.</>,
      ]}
      tips={[
        <><b>Running now</b> only appears while something is running, and updates by itself every few seconds.</>,
        <>The <b>Statistics</b> tab of the sidebar counts your workspaces.</>,
      ]}
    />
  ),
  workspaces: (
    <PageHelp
      intro="All workspaces. A workspace holds one workflow and every version of it you have saved."
      steps={[
        <>Click a workspace to open its canvas and keep editing.</>,
        <>Click the flow named at the bottom of a card to open the latest saved version on its own.</>,
        <>Use the arrows on the preview at the top to flip through the most recent workspaces.</>,
      ]}
      tips={[
        <>New workspaces are created with <b>New workspace</b> on the Fluss dashboard.</>,
      ]}
    />
  ),
  workspace: (
    <PageHelp
      intro="The workflow editor. Nodes are actions; the lines between them carry the output of one action into the next. Build the workflow on the canvas, then save it as a new version."
      steps={[
        <>Click an empty spot on the canvas to open the <b>All Nodes</b> panel, type to search, and pick an action to place it there.</>,
        <>Drag from a node’s handle and let go over empty canvas. The panel that opens (<b>Add Target Node</b> or <b>Add Source Node</b>) offers only nodes that fit that connection.</>,
        <>Drag from one node’s handle to another’s to connect them. If the two do not fit directly, a panel suggests nodes to put in between.</>,
        <>Click a line to open <b>Transforms</b>: pick a node to insert into the line, or press the red cross (<b>Remove Edge</b>) to delete it.</>,
        <>Press <b>Save</b> at the bottom right to store the workflow as a new version.</>,
        <>Open the <b>Versions</b> tab of the sidebar and click an entry to look at an earlier version.</>,
      ]}
      tips={[
        <><b>Save</b> is hidden while the <b>Workflow is invalid</b> box at the top right lists problems. Click a problem to jump to the node it is about.</>,
        <>The <b>Undo</b> and <b>Redo</b> buttons at the bottom right also work as Ctrl/⌘+Z and Ctrl/⌘+Shift+Z. The two buttons next to them show or hide edge labels and node errors.</>,
        <>The editor needs the Rekuest service, because that is where the actions come from.</>,
      ]}
    />
  ),
  runs: (
    <PageHelp
      intro="Every run. A run is one execution of a flow, with the events its nodes produced along the way."
      steps={[
        <>Click a run to open it and watch or replay what happened.</>,
        <>Check the badge on a card: <b>Running</b> with a pulsing dot, or <b>Completed</b>.</>,
        <>Click the workspace name on a card to jump to the workflow that was run.</>,
      ]}
      tips={[
        <>The preview at the top shows the most recent runs on their flow.</>,
      ]}
    />
  ),
  run: (
    <PageHelp
      intro="One execution of a flow, drawn on the flow itself: each node shows the latest event it produced. Come here to follow a running workflow or to replay a finished one."
      steps={[
        <>Watch the nodes while the bar at the bottom reads <b>Live...</b>: the run is still going and the canvas updates as events arrive.</>,
        <>Drag the slider at the bottom of a completed run to step through it and see the state of each node at that moment.</>,
        <>Press the play button left of the slider to replay the run step by step; press it again to stop.</>,
        <>Hover the slider to see when the current step happened.</>,
      ]}
    />
  ),
  pythonFlows: (
    <PageHelp
      intro="Flows written as Python instead of drawn as a graph. Each row is one flow, shown by its newest version; every save of a flow is a new version."
      steps={[
        <>Press <b>New Python flow</b> to write one.</>,
        <>Search by title, or by what a flow is about, and narrow the list with <b>Drafts</b>, <b>Published</b> or <b>Archived</b>.</>,
        <>Click a flow to open its newest version in the editor.</>,
      ]}
      tips={[
        <><b>Irreversible</b> marks a flow that calls an action whose effect cannot be repeated safely.</>,
      ]}
    />
  ),
  newPythonFlow: (
    <PageHelp
      intro="Write a new Python flow. It is an async function, main, that calls the actions in its manifest by name. Its arguments and return values become the flow's ports."
      steps={[
        <>Give the flow a title in the field above the editor.</>,
        <>Press <b>Add action</b> in the <b>Manifest</b> tab, or start typing an action's name in the editor and accept a suggestion, to make an action callable.</>,
        <>Call it with <b>await</b>, e.g. <code>await segment(image)</code>. Problems are underlined as you type.</>,
        <>Press <b>Save</b> once the line above the editor reads <b>Checks out</b>.</>,
      ]}
      tips={[
        <>Your edits are kept in this browser until you save, even if the flow does not check out yet.</>,
        <>The <b>Ports</b> tab shows the arguments and returns the server read from <b>main</b>.</>,
      ]}
    />
  ),
  pythonFlow: (
    <PageHelp
      intro="One version of a Python flow. A version never changes: editing it and pressing Save as new version makes the next version of the same flow."
      steps={[
        <>Edit the source or the <b>Manifest</b>, then press <b>Save as new version</b> once it checks out.</>,
        <>Publish a version from the object menu (the button at the top right, or right-click) to make it runnable.</>,
        <>Press <b>Deploy and run</b> on a published version to pick an agent that runs Python flows; after that, <b>Run</b> opens the run form.</>,
        <>Open the <b>Versions</b> tab to move between the versions of this flow.</>,
      ]}
      tips={[
        <>Set an action's effect in the <b>Manifest</b> tab. A resumed run may call an <b>Irreversible</b> action again.</>,
        <>Only a draft can be deleted; archive a published version instead.</>,
      ]}
    />
  ),
  pythonRuns: (
    <PageHelp
      intro="Every run of a Python flow, newest first. A run is one execution of a published version, carried out as a task in Rekuest."
      steps={[
        <>Click a run to see it on its source.</>,
        <>Click <b>version</b> to open the version that ran, or <b>task</b> to open the task with its calls and log.</>,
        <>Narrow the list with <b>Running</b>, <b>Completed</b> or <b>Failed</b>.</>,
      ]}
    />
  ),
  pythonRun: (
    <PageHelp
      intro="One run of a Python flow, drawn on its source: each line that calls an action is marked with how that action's calls went."
      steps={[
        <>Hover a marked line to see how many calls it made and how they ended: blue is running, green done, red failed, grey not called yet.</>,
        <>Press <b>Open task</b> for the calls one by one and the run's printed output.</>,
      ]}
    />
  ),
};
