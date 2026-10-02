import { PageHelp } from "@/core/layout/help";

/**
 * fluss's page instructions, one per page, shown in the page's Help tab
 * (`help={FLUSS_HELP.workspace}`). Each names only what its page really offers:
 * the button labels, menu entries and dialogs are the ones on screen.
 */
export const FLUSS_HELP = {
  home: (
    <PageHelp
      intro="Fluss wires actions together into workflows. A workspace is where you design one workflow; each save becomes a flow (a version of it), and each execution of a flow is a run. This page shows all three."
      steps={[
        <>Press <b>New workspace</b>, give it a name and press <b>Create</b>. The new workspace opens with an empty canvas.</>,
        <>Click a workspace card to continue working on its workflow.</>,
        <>Look at <b>Running now</b> for the runs that are still executing, and click one to follow it.</>,
        <>Use the search field in the header to find workspaces, flows and runs by name.</>,
        <>Press <b>Sort</b> to order the lists by <b>Date created</b> or <b>Title</b>, or pick a date range next to it to show only what was created in that period.</>,
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
};
