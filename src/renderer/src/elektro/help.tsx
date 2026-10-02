import { PageHelp } from "@/core/layout/help";

/**
 * elektro's page instructions, one per page, shown in the page's Help tab
 * (`help={ELEKTRO_HELP.experiments}`). Each names only what its page really
 * offers: the button labels, menu entries and dialogs are the ones on screen.
 */
export const ELEKTRO_HELP = {
  home: (
    <PageHelp
      intro="The starting point for electrophysiology and neuron modelling: your most recent datasets (recorded or simulated traces), neuron models and experiments (timelines that draw datasets together) on one page."
      steps={[
        <>Click any card to open that dataset, neuron model or experiment.</>,
        <>Open the search in the page header and type to narrow all three lists at once.</>,
        <>Press <b>Sort</b> to order the lists by <b>Date created</b> or <b>ID</b>, <b>Descending</b> or <b>Ascending</b>.</>,
        <>Pick a date range in the page header to show only what was created in that period.</>,
        <>Right-click a card for its actions, for example <b>Open on Timeline</b> on a dataset or <b>Create Workspace from Model</b> on a neuron model.</>,
      ]}
      tips={[
        <>Search, sorting and the date range are kept in the page address, so a shared link shows the same view.</>,
        <>While there are no neuron models and no experiments yet, the page shows a welcome screen instead of the lists.</>,
      ]}
    />
  ),
  experiments: (
    <PageHelp
      intro="An experiment is a timeline: it lays out layers such as traces, spike rasters, event tables and annotations over one shared time axis. This page lists all experiments."
      steps={[
        <>Click an experiment to open its timeline.</>,
        <>Right-click an experiment and choose <b>Add Layer</b> to add a trace, spikes, events or annotations to it without opening it.</>,
        <>Right-click an experiment and choose <b>Delete Experiment</b> to remove it. Its recordings are kept.</>,
        <>Press <b>New</b> to list the actions that can produce an experiment, and run one.</>,
      ]}
      tips={[
        <>The usual way to get an experiment is from a dataset: open the dataset and press <b>Create experiment</b>, or right-click it and choose <b>Open on Timeline</b>.</>,
        <>What <b>New</b> offers depends on the apps connected to your server. With none that create experiments, its list is empty.</>,
      ]}
    />
  ),
  experiment: (
    <PageHelp
      intro="One experiment drawn as a timeline. Each layer is a row or an overlay on the shared time axis: traces as lines, spikes as a raster, events and annotations as marks."
      steps={[
        <>Drag a box over the plot to zoom into it. Hold Shift and drag to pan, scroll to zoom at the cursor, and double-click (or press F) to fit the whole experiment again.</>,
        <>Open the <b>Layers</b> tab and press <b>Add layer</b>. In the dialog choose <b>Trace</b>, <b>Spikes</b>, <b>Events</b> or <b>Annotations</b>, pick the data and press <b>Add layer</b>.</>,
        <>In the <b>Layers</b> tab, use the eye on a layer card to hide or show it, hover the card for the arrows that change the drawing order, and open its options menu for <b>Delete layer</b>.</>,
        <>Use the controls at the bottom right of the plot to switch between stacked, shared and overlay rows, autoscale every row to what is on screen, fit the experiment, and step back and forward through your zooms.</>,
        <>Hold A (or press the pen in the same controls) to annotate: pick <b>Event</b>, <b>Events</b> or <b>Epoch</b> to mark times across all rows, or <b>Line</b>, <b>Path</b> or <b>Polygon</b> to draw over one trace row.</>,
        <>Open the <b>Annotations</b> tab and click a mark to jump to it. Hover a mark and press the bin to delete it.</>,
      ]}
      tips={[
        <>Deleting a layer only removes it from this experiment. The dataset it shows is kept.</>,
        <>Line, path and polygon need a visible trace to draw over; they are greyed out until one is shown.</>,
        <>The visible time window is written into the page address, so a shared link opens on the same stretch of time.</>,
      ]}
    />
  ),
  arrayDatasets: (
    <PageHelp
      intro="Array datasets are recorded or simulated signals: values over time, per channel. This page lists all of them; each card shows the dataset’s shape, its unit and, for a simulated one, the neuron model it came from."
      steps={[
        <>Click a dataset to open it and see it drawn on a timeline.</>,
        <>Hover a card for a short preview without leaving the list.</>,
        <>Right-click a dataset and choose <b>Open on Timeline</b> to go straight to the experiment that draws it. If none does yet, one is created for it.</>,
        <>Right-click a dataset and choose <b>Export to file</b> to save it to disk.</>,
      ]}
      tips={[
        <>The pages <b>Timeseries</b>, <b>Multichannel</b> and <b>Spectral</b> show the same datasets filtered by kind. Find them in the command palette (⌘K / Ctrl+K).</>,
      ]}
    />
  ),
  arrayDatasetSpec: (
    <PageHelp
      intro="The array datasets of one kind. The kind is read from a dataset’s axes: Timeseries has a time axis, Multichannel a channel axis, Spectral a frequency axis."
      steps={[
        <>Click a dataset to open it and see it drawn on a timeline.</>,
        <>Right-click a dataset and choose <b>Open on Timeline</b> to go straight to the experiment that draws it.</>,
        <>Open <b>Datasets</b> from the command palette (⌘K / Ctrl+K) to see every dataset regardless of kind.</>,
      ]}
      tips={[
        <>A dataset can be of several kinds at once, so it may appear on more than one of these pages.</>,
      ]}
    />
  ),
  arrayDataset: (
    <PageHelp
      intro="One array dataset, a recorded or simulated signal. A dataset is always viewed through an experiment, which places it on a timeline; this page shows the first experiment that draws it."
      steps={[
        <>If the page says the dataset is not drawn in any experiment yet, press <b>Create experiment</b>. The timeline appears in place.</>,
        <>Drag a box over the plot to zoom into it. Hold Shift and drag to pan, scroll to zoom at the cursor, and double-click to fit everything again.</>,
        <>When several experiments draw this dataset, choose another one in the selector above the plot. The <b>Create experiment</b> button next to it adds a further one.</>,
        <>Open the <b>Layers</b> tab to hide, reorder or add layers, and the <b>Annotations</b> tab to jump to marks. Both work as on an experiment page.</>,
        <>Open the <b>Info</b> tab for the shape, unit and kind of the dataset, the experiments that draw it and its history.</>,
      ]}
      tips={[
        <>When the dataset is timed onto a clock, as a simulated trace is onto the clock of its run, <b>Create experiment</b> opens a small menu: <b>Its own grid</b> shows this dataset alone, while a clock under <b>Registered clocks</b> lays out everything timed onto that clock.</>,
        <>A simulated dataset links to its neuron model under the title and in the <b>Info</b> tab.</>,
      ]}
    />
  ),
  files: (
    <PageHelp
      intro="Files are the raw files stored in elektro, for example the original recording a set of traces was read from. This page lists them with their size."
      steps={[
        <>Click a file to see its details and download it.</>,
        <>Right-click a file and choose <b>Export to file</b> to download it without opening it.</>,
        <>Press <b>Upload</b> to list the actions that can produce a file, and run one.</>,
      ]}
      tips={[
        <>What <b>Upload</b> offers depends on the apps connected to your server. With none that create files, its list is empty.</>,
      ]}
    />
  ),
  file: (
    <PageHelp
      intro="One stored file: its name, size, type and the storage bucket it lives in."
      steps={[
        <>Press <b>Download</b> to save the file to your computer.</>,
        <>Read <b>File Size</b> and <b>MIME Type</b> to check what you are about to download.</>,
        <>Open the <b>Knowledge</b> tab to see what has been recorded about this file.</>,
      ]}
    />
  ),
  neuronModels: (
    <PageHelp
      intro="A neuron model describes one or more cells for simulation: their branching sections, the ion channels on them and, optionally, a network of synapses and stimulators. This page lists all models."
      steps={[
        <>Click a model to open it in the 3D viewer.</>,
        <>Hover a card for a short preview without leaving the list.</>,
        <>Right-click a model and choose <b>Create Workspace from Model</b> to start a workspace that collects the versions you make of it.</>,
        <>Right-click a model and choose <b>Export to file</b> to save it to disk, or <b>Delete Neuron Model</b> to remove it.</>,
        <>Press <b>New</b> to list the actions that can produce a neuron model, and run one.</>,
      ]}
      tips={[
        <>What <b>New</b> offers depends on the apps connected to your server. With none that create models, its list is empty.</>,
        <>Editing never changes a model in place. Saving from the editor always creates a new model next to the original.</>,
      ]}
    />
  ),
  neuronModel: (
    <PageHelp
      intro="One neuron model, drawn from its sections (the unbranched pieces of a cell, such as a stretch of dendrite). The viewer shows the shape; the Info tab holds everything else."
      steps={[
        <>Drag to pan, right-drag (or Shift-drag) to orbit and scroll to zoom. Press F to frame the whole model, and ? for the full list of shortcuts.</>,
        <>Click a section to open a panel with its geometry, mechanisms and ions. Ctrl-click another section to open a second panel beside it; press Esc or <b>Close all</b> to dismiss them.</>,
        <>Press the <b>3D</b> button at the bottom right of the viewer to switch to the tree view, a diagram of how the sections connect. Press it again to return.</>,
        <>Open the <b>Layers</b> tab to colour the sections by compartment, depth, importance or one uniform colour, thicken thin branches with <b>radius scale</b>, and show or hide the network.</>,
        <>Press <b>Edit</b> to open the model in the editor, or <b>Export</b> to save it as a file.</>,
        <>Open the <b>Info</b> tab and press <b>Open on timeline</b> on a session to see the traces of that simulation run.</>,
      ]}
      tips={[
        <>The gear at the bottom right of the viewer holds <b>Save screenshot</b> and the switches for the scale bar, grid and camera behaviour.</>,
        <>The <b>Info</b> tab lists the model’s cells; click one to open it zoomed in on its own page.</>,
        <>Sessions only appear once the model has been simulated.</>,
      ]}
    />
  ),
  neuronModelEditor: (
    <PageHelp
      intro="The editor for a neuron model: build the cell by connecting sections, set their geometry and channels, and wire up synapses and stimulators. Your changes are saved as a new model; the original stays as it is."
      steps={[
        <>Click a section in the 3D view, or open its entry in the <b>Topology</b> tab, to select it and edit its <b>Name</b>, <b>Length</b>, <b>Diameter</b> and <b>Compartment</b>.</>,
        <>With a section selected, press the + at its tip to add a child branch at the end, or Shift-click the selected section to attach a child at that point.</>,
        <>Press <b>Rebranch</b> on a section and then click another section to make that one its new parent.</>,
        <>Open the <b>Biophysics</b> tab to set the mechanisms, ions and parameters of each compartment, the <b>Network</b> tab to add synapses, stimulators and connections, and the <b>Model</b> tab for the model-wide settings.</>,
        <>Press <b>Save as new model</b>. The new model is named after the original with “(Edited)” added, and opens straight away.</>,
      ]}
      tips={[
        <>The question mark at the top of the editor panel opens a guide that explains why the 3D layout rearranges itself as you edit.</>,
        <>A model with a structural problem, such as a branch whose parent was deleted, is not saved; the reason is shown as a message.</>,
        <>While a workspace is active (the last one you opened), the saved model is added to it.</>,
      ]}
    />
  ),
  neuronModelTree: (
    <PageHelp
      intro="The neuron model as a tree diagram: every section is a box, connected to the section it branches from. Use it to read the structure of a model without the 3D shape getting in the way."
      steps={[
        <>Drag to pan and scroll to zoom. The buttons at the top left zoom in, zoom out and fit the whole tree.</>,
        <>Hover <b>Importance</b> at the top right to preview a heatmap of how much each section contributes to the cell, and click it to keep the heatmap on.</>,
        <>Read the <b>Compartments</b> legend at the bottom left to see which colour stands for which compartment and how many sections each has.</>,
        <>Press <b>3D View</b> to go back to the viewer, or <b>Edit</b> to open the model in the editor.</>,
      ]}
      tips={[
        <><b>Importance</b> only appears for models that have a score to show. It is computed from geometry and channels, not from a simulation.</>,
      ]}
    />
  ),
  modelCollections: (
    <PageHelp
      intro="A model collection groups neuron models that belong together, so their differences can be compared. This page lists all collections."
      steps={[
        <>Click a collection to see its models and preview them.</>,
        <>Press <b>New</b> to list the actions that can produce a model collection, and run one.</>,
      ]}
      tips={[
        <>What <b>New</b> offers depends on the apps connected to your server. With none that create collections, its list is empty.</>,
      ]}
    />
  ),
  modelCollection: (
    <PageHelp
      intro="One model collection: its neuron models on the left, a 3D preview of the selected one on the right."
      steps={[
        <>Click a model under <b>Models</b> to select it. Its preview appears on the right.</>,
        <>Read the list that opens under the selected model: each entry is one change found when the model was compared, with the path of the changed value and both values, <b>A</b> and <b>B</b>.</>,
        <>Drag in the preview to pan, right-drag to orbit and scroll to zoom.</>,
        <>Click the small id at the right of a model row to open that model on its own page.</>,
        <>Open the <b>Knowledge</b> tab to see what has been recorded about the collection.</>,
      ]}
      tips={[
        <>“No comparisons for this model” means nothing has been compared for it in this collection.</>,
      ]}
    />
  ),
  modelWorkspaces: (
    <PageHelp
      intro="A workspace gathers the neuron models you are iterating on, so the versions you save from the editor stay together. This page lists all workspaces."
      steps={[
        <>Click a workspace to open it. It becomes the active workspace.</>,
        <>To start a new one, go to <b>Neuron models</b>, right-click a model and choose <b>Create Workspace from Model</b>.</>,
        <>Right-click a workspace and choose <b>Delete Model Workspace</b> to remove it.</>,
      ]}
      tips={[
        <>There is no New button here: a workspace always starts from a model.</>,
        <>Every model you save from the editor is added to the active workspace.</>,
      ]}
    />
  ),
  modelWorkspace: (
    <PageHelp
      intro="One workspace: the neuron models collected in it on the left, a 3D preview of the selected one on the right. Opening this page makes the workspace the active one."
      steps={[
        <>Click a model card to select it and preview it on the right.</>,
        <>Press <b>open</b> on a card to go to that model’s own page, and <b>Edit</b> there to change it.</>,
        <>Save from the editor with <b>Save as new model</b>. The new version appears in this workspace.</>,
        <>Drag in the preview to pan, right-drag to orbit and scroll to zoom.</>,
      ]}
      tips={[
        <>Models are listed under the group they were given in the workspace; those without one appear under “Ungrouped”.</>,
        <>The workspace stays active after you leave the page, until you open another one.</>,
      ]}
    />
  ),
  cell: (
    <PageHelp
      intro="One cell of a neuron model, zoomed in. The viewer frames this cell’s sections and keeps the rest of the model dimmed around it for context."
      steps={[
        <>Drag to pan, right-drag (or Shift-drag) to orbit and scroll to zoom. Press F to frame the view again.</>,
        <>Click a section in the viewer to open a panel with its geometry, mechanisms and ions.</>,
        <>Open the <b>Info</b> tab and click a name under <b>Sections</b> to open that section on its own page.</>,
        <>Open the <b>Layers</b> tab and, under <b>rest of the model</b>, choose <b>dim</b>, <b>hide</b> or <b>show</b> for everything that is not this cell.</>,
        <>Press <b>Open model</b> to go back to the whole model.</>,
      ]}
      tips={[
        <>Under <b>Recorded in</b>, the <b>Info</b> tab lists the simulation runs that recorded from this cell; <b>Open on timeline</b> shows their traces.</>,
        <>Hover a compartment in the <b>Info</b> tab to see the mechanisms it carries.</>,
      ]}
    />
  ),
  section: (
    <PageHelp
      intro="One section of a cell, zoomed in. A section is an unbranched piece of the cell, such as the soma or a stretch of dendrite, with its own length, diameter and channels."
      steps={[
        <>Drag to pan, right-drag (or Shift-drag) to orbit and scroll to zoom around the section.</>,
        <>Open the <b>Info</b> tab to read its <b>Geometry</b> and the <b>Mechanisms</b> it takes from its compartment.</>,
        <>Click the <b>Parent</b> link or a name under <b>Children</b> in the <b>Info</b> tab to walk along the tree to a neighbouring section.</>,
        <>Open the <b>Layers</b> tab and, under <b>rest of the model</b>, choose <b>dim</b>, <b>hide</b> or <b>show</b> for everything that is not this section.</>,
        <>Press <b>Open cell</b> to step back out to the cell this section belongs to.</>,
      ]}
      tips={[
        <>The numbers after “@” next to a parent or child say where along the parent the branch attaches: 0 is its start, 1 its end.</>,
        <>Under <b>Recorded in</b>, the <b>Info</b> tab lists the simulation runs that recorded from this section.</>,
      ]}
    />
  ),
  mechanism: (
    <PageHelp
      intro="A mechanism is a piece of membrane behaviour a model can use, typically an ion channel. This page shows its name and the parameters it exposes."
      steps={[
        <>Read the list of parameters: each shows its name and, in brackets, its kind.</>,
      ]}
      tips={[
        <>Mechanisms are provided by an environment. You reach this page from an environment’s list of mechanisms, which also shows each parameter’s description when you hover it.</>,
      ]}
    />
  ),
  environment: (
    <PageHelp
      intro="A model environment is the set of mechanisms (ion channels and similar) that a neuron model can be built from and simulated with. This page lists them with their parameters."
      steps={[
        <>Scroll the list to see every mechanism, its description and its parameters.</>,
        <>Hover a parameter to read its description.</>,
        <>Click a mechanism’s name to open it on its own page.</>,
      ]}
      tips={[
        <>You reach this page from the <b>Environment</b> link in a neuron model’s <b>Info</b> tab.</>,
      ]}
    />
  ),
};
