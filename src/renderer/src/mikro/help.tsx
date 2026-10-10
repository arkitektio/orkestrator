import { PageHelp } from "@/core/layout/help";

/**
 * mikro's page instructions, one per page, shown in the page's Help tab
 * (`help={MIKRO_HELP.folders}`). Each names only what its page really offers:
 * the button labels, menu entries and dialogs are the ones on screen.
 */
export const MIKRO_HELP = {
  home: (
    <PageHelp
      intro="Your data at a glance. Every dataset, table, mesh, network and annotation collection is one tile under Data, the parts cut out of them follow under Selections, then top-level folders, charts and files. This is the quickest place to bring new data in and to start a task on it."
      steps={[
        <>Press <b>Upload Files</b> and pick files, or drop files from your computer anywhere on the page, to upload them.</>,
        <>Use the search field to narrow every list at once by name.</>,
        <>Open <b>Sort</b> to order by <b>Date created</b> or <b>Name</b>, ascending or descending.</>,
        <>Set a date range in the header to see only what was created in that period.</>,
        <>Click a tile to open it in the viewer.</>,
        <>Select one or more tiles to start a task on them: each tile is the lens that selects all of its data, and the selection panel and the right-click menu list what can run on it.</>,
        <>Drag a dataset or table tile onto a folder to file it there. The small database icon on a tile opens the dataset’s own page.</>,
      ]}
      tips={[
        <>The <b>Statistics</b> tab of the sidebar summarizes how much data you have.</>,
        <>Derived datasets (masks, results) are listed under Data as well.</>,
      ]}
    />
  ),
  peerHome: (
    <PageHelp
      intro="The data of one other user: their datasets, tables and collections (each as the lens that selects all of it), folders and files, as far as you are allowed to see them."
      steps={[
        <>Set a date range in the header to see only what they created in that period.</>,
        <>Press <b>All Data</b> to list top-level folders only. The button then reads <b>No Parent</b>; press it again to see every folder.</>,
        <>Click any dataset, folder or file to open it.</>,
      ]}
      tips={[
        <>The <b>Statistics</b> tab of the sidebar summarizes this user’s data.</>,
      ]}
    />
  ),
  arrayDatasets: (
    <PageHelp
      intro="Every array dataset you can see: images, volumes, time series and other n-dimensional arrays with named axes."
      steps={[
        <>Type into the search field to find a dataset by name.</>,
        <>Open <b>Spec</b> to keep only one kind of data, and <b>Sort</b> to change the order.</>,
        <>Click a dataset to open it in the viewer.</>,
        <>Right-click a dataset and choose <b>Create Scene</b> to compose a view of it, <b>Calibrate…</b> to give its pixels physical units, or <b>Register Into…</b> to place it in a shared space.</>,
        <>Right-click and choose <b>Move to Folder</b> to file it away.</>,
      ]}
    />
  ),
  arrayDatasetSpec: (
    <PageHelp
      intro="Array datasets of one kind only. The kind is fixed by the page; everything else works like the full dataset list."
      steps={[
        <>Type into the search field to find a dataset by name.</>,
        <>Open <b>Sort</b> to change the order.</>,
        <>Click a dataset to open it, or right-click it for <b>Create Scene</b>, <b>Calibrate…</b>, <b>Register Into…</b> and <b>Move to Folder</b>.</>,
      ]}
      tips={[
        <>The other kinds are listed in the module’s navigation under “By kind”.</>,
      ]}
    />
  ),
  arrayDataset: (
    <PageHelp
      intro="One array dataset, as a container. You do not view or process a dataset directly: you open a lens of it. This page lists its lenses and holds what is true of the dataset as a whole."
      steps={[
        <>Click <b>Whole array</b> under <b>Lenses</b> to open all of the dataset in the viewer.</>,
        <>Click any other lens to open just that part.</>,
        <>Press <b>New lens</b> to cut out a part of the dataset: a range of planes, a region, a timepoint.</>,
        <>Use the folder button in the header (it shows the current folder, or <b>Unfiled</b>) to move the dataset.</>,
        <>Press <b>Dataset</b> in the header for what can be done to the dataset itself, such as deleting or calibrating it.</>,
      ]}
      tips={[
        <>To run a task on the data, open a lens and press <b>Run on lens</b> there.</>,
        <>Below the lenses the page shows what the dataset was derived from and what was derived from it.</>,
      ]}
    />
  ),
  coordinateSystems: (
    <PageHelp
      intro="Coordinate systems are the spaces your data lives in: a dataset’s own pixel grid, the calibrated physical space derived from it, and the shared world spaces that scenes are built over."
      steps={[
        <>Click a coordinate system to see what is registered into it and what it maps into.</>,
        <>Right-click one and choose <b>Create Scene</b> to view everything registered into it together.</>,
        <>Right-click one and choose <b>Register…</b> to place a dataset, a table or another space into it.</>,
        <>Drag an array dataset or a table dataset onto a coordinate system and choose <b>Register Dataset Here</b> or <b>Register Table Here</b>.</>,
      ]}
    />
  ),
  coordinateSystem: (
    <PageHelp
      intro="One coordinate system, drawn as a graph: the spaces that map into it and the spaces it maps into. Each connection is a registration or a calibration."
      steps={[
        <>Pan and zoom the graph to follow how this space connects to others.</>,
        <>On a space that holds no data of its own, press <b>Register…</b> to place a dataset, a table or another space into it.</>,
        <>On a dataset’s own space, press <b>Calibrate…</b> to give its pixels physical units.</>,
        <>Open the <b>Registrations</b> tab of the sidebar to see every connection as a table, one direction each.</>,
        <>Open the <b>Scenes</b> tab to find the scenes that use this space as their world.</>,
      ]}
      tips={[
        <>A red badge counts placements that are assumed rather than measured. Check those before trusting distances.</>,
        <>The <b>Provenance</b> tab shows how this space came to be.</>,
      ]}
    />
  ),
  tableDatasets: (
    <PageHelp
      intro="Table datasets hold measurements as rows and columns. Their coordinate columns say where each row sits in space, so a table can be shown next to the images it was measured on."
      steps={[
        <>Click a table to browse its rows.</>,
        <>Drag a table onto a coordinate system and choose <b>Register Table Here</b> to place it in that space.</>,
        <>Drag a table onto a folder and choose <b>Move Tables to Folder</b> to file it away.</>,
      ]}
    />
  ),
  tableDataset: (
    <PageHelp
      intro="The rows of one table dataset. Everything about the table itself (its columns, axes and where it came from) is in the Info tab of the sidebar."
      steps={[
        <>Type into <b>Search all columns...</b> to filter the rows.</>,
        <>Click the sort arrow in a column header to order by that column.</>,
        <>Open <b>Columns</b> to hide the columns you do not need.</>,
        <>Press <b>Export as CSV</b> to download the table with the columns currently shown.</>,
        <>Tick the checkboxes of some rows, then press <b>Export … selected</b> to download just those.</>,
      ]}
      tips={[
        <>Drag the edge of a column header to resize it; double-click the edge to fit the content.</>,
        <>The <b>Space</b> tab shows the coordinate system this table owns and what it is registered into.</>,
      ]}
    />
  ),
  sparseDatasets: (
    <PageHelp
      intro="Sparse datasets are large matrices stored by their non-zero cells only, for example cells against genes."
      steps={[
        <>Type into the search field to find a sparse dataset by name.</>,
        <>Open <b>Sort</b> to change the order.</>,
        <>Click a dataset to see its axes and stored layouts.</>,
      ]}
    />
  ),
  sparseDataset: (
    <PageHelp
      intro="The structure of one sparse matrix: its two axes and the layouts it is stored in. A matrix this size is mostly zeros, so the page shows its shape rather than its cells."
      steps={[
        <>Read <b>Axes</b> to see what the rows and columns enumerate and which table names them.</>,
        <>Read <b>Layouts</b> to see which axis each stored layout indexes.</>,
        <>Open the <b>Info</b> tab of the sidebar for the facts about the dataset.</>,
        <>Open the <b>Space</b> tab to see what the matrix was computed from.</>,
      ]}
    />
  ),
  annotations: (
    <PageHelp
      intro="Every shape drawn by hand in a scene: points, lines, rectangles and other regions of interest. An annotation belongs to its collection, so it survives when the scene is deleted."
      steps={[
        <>Type into the search field to find an annotation by name.</>,
        <>Open <b>Kind</b> to keep only one type of shape, and <b>Sort</b> to change the order.</>,
        <>Click an annotation to open the scene it was drawn in, centred on the shape.</>,
      ]}
      tips={[
        <>New annotations are drawn in a scene: hold <b>A</b> over the viewer and draw.</>,
      ]}
    />
  ),
  annotation: (
    <PageHelp
      intro="One annotation, opened in the scene it was drawn in. The viewer selects the shape and moves to it, so you see it in context."
      steps={[
        <>Drag the sliders at the right and bottom edge to move through Z and the other dimensions around the shape.</>,
        <>Open the <b>Info</b> tab of the sidebar for the facts about the shape: who drew it, its collection and the space it is written in.</>,
        <>Open the <b>Annotations</b> tab to see the other shapes of the same scene.</>,
      ]}
      tips={[
        <>An annotation whose collection was not made for a scene shows only its outline. Its drawing space is named in the <b>Info</b> tab.</>,
      ]}
    />
  ),
  folders: (
    <PageHelp
      intro="Folders organize your datasets, tables and files, like folders in a file system. This page lists the top-level folders; everything nested lives inside them."
      steps={[
        <>Press <b>New</b> to create a folder. It appears as “New Folder”.</>,
        <>Right-click the new folder and choose <b>Rename / Update Folder</b> to give it a real name.</>,
        <>Drag a folder onto another one and choose <b>Move to Folder</b> to nest it.</>,
        <>Click a folder to open it and see what is inside.</>,
      ]}
      tips={[
        <>Only folders without a parent show up here. A folder you moved into another one is found by opening its parent.</>,
      ]}
    />
  ),
  folder: (
    <PageHelp
      intro="The contents of one folder: its sub-folders, array datasets, table datasets and files. The Info tab of the sidebar holds everything about the folder itself."
      steps={[
        <>Drop files from your computer anywhere on the list to upload them straight into this folder.</>,
        <>Press <b>New Folder</b> to create a sub-folder.</>,
        <>Type into <b>Search</b> to narrow the list, and switch between <b>Grid view</b>, <b>List view</b> and <b>Table view</b> with the toggle next to it.</>,
        <>Drag a dataset, table or file onto a sub-folder and choose the <b>Move … to Folder</b> entry to file it away.</>,
        <>Right-click any item for its own actions, for example <b>Create Scene</b> on an array dataset.</>,
      ]}
      tips={[
        <>The small link above the title leads back to the parent folder.</>,
      ]}
    />
  ),
  files: (
    <PageHelp
      intro="Every raw file that was uploaded, exactly as it came in. Converters turn files into array datasets; the file itself is kept."
      steps={[
        <>Click a file to see its details and the datasets derived from it.</>,
        <>Right-click a file and choose <b>Move to Folder</b> to file it away.</>,
        <>Right-click a file and choose <b>Delete File</b> to remove it.</>,
      ]}
      tips={[
        <>To upload new files, use <b>Upload Files</b> on the Dashboard, or drop them onto the Dashboard or an open folder.</>,
      ]}
    />
  ),
  file: (
    <PageHelp
      intro="One uploaded file: its size, type and the array datasets that were converted out of it."
      steps={[
        <>Press <b>Download</b> to save the original file to your computer.</>,
        <>Use the folder button in the header (it shows the current folder, or <b>Unfiled</b>) to move the file.</>,
        <>Click a dataset under <b>Derived Datasets</b> to open what was made from this file.</>,
        <>Open the <b>Info</b> tab of the sidebar for the file’s history.</>,
      ]}
      tips={[
        <>“No datasets from this file” means nothing has been converted out of it yet.</>,
      ]}
    />
  ),
  scenes: (
    <PageHelp
      intro="Scenes are composed views: one or more datasets placed in a shared space and drawn as layers, so you can look at several images at once in their true positions."
      steps={[
        <>Click a scene to open it in the viewer.</>,
        <>Right-click a scene and choose <b>Add Layer</b> to bring more data into it.</>,
        <>Right-click a scene and choose <b>Align Layers…</b> to line its layers up by hand.</>,
      ]}
      tips={[
        <>New scenes are made from data: right-click an array dataset or a coordinate system and choose <b>Create Scene</b>.</>,
      ]}
    />
  ),
  scene: (
    <PageHelp
      intro="The viewer for one scene. Each layer draws one piece of data in the scene’s shared space; the sidebar controls how."
      steps={[
        <>Drag to move around, and press <b>F</b> to frame the whole scene.</>,
        <>Open the <b>Layers</b> tab of the sidebar to show or hide layers and change their contrast and channels.</>,
        <>Hold <b>A</b> and draw to annotate; the shapes are listed in the <b>Annotations</b> tab.</>,
        <>Hold <b>P</b> to probe the value under the cursor, and click to pin a probe point; the <b>Probe</b> tab of the sidebar shows the readings and compares the pinned points.</>,
        <>Open the menu button at the right end of the page header and choose <b>Add Layer</b> to bring more data in, or <b>Align Layers…</b> to line layers up.</>,
        <>Open the <b>Animations</b> tab to build a camera tour: a sequence of stops the camera travels between.</>,
      ]}
      tips={[
        <>Press <b>?</b> over the viewer for the full list of keyboard shortcuts.</>,
        <>In 2D, <b>Shift</b> + scroll moves through Z, and <b>Shift</b> + a number key shows or hides that channel.</>,
      ]}
    />
  ),
  sceneRegistration: (
    <PageHelp
      intro="Line up the layers of a scene by hand. You move one layer until it sits correctly on a reference layer, then save the result as a registration."
      steps={[
        <>In the <b>Registration</b> tab of the sidebar, press <b>Align</b> next to the layer you want to move. It is drawn over the others while you move it.</>,
        <>Under <b>Allow</b>, choose how freely the layer may move, then drag it in the viewer until it fits.</>,
        <>For a precise fit, pick a reference layer as <b>Fixed</b> under <b>Landmarks</b>, then click matching points on both layers to add pairs.</>,
        <>Switch to the <b>Layers</b> tab at any time to adjust contrast so both layers are easy to compare.</>,
        <>Press <b>Save</b> to keep the alignment, or <b>Discard</b> to leave without changing anything.</>,
      ]}
      tips={[
        <>The registration belongs to the shared space, so every scene built over it moves too.</>,
        <>Undo with <b>⌘Z</b>, redo with <b>⇧⌘Z</b>. On heavy scenes set <b>Preview</b> to <b>On release</b>.</>,
        <>Click the scene’s name at the top left to go back to the viewer.</>,
      ]}
    />
  ),
  charts: (
    <PageHelp
      intro="Charts lay data out along one axis, such as time or wavelength, and read values off it. Arrays are drawn as traces, table columns as series."
      steps={[
        <>Click a chart to open it.</>,
        <>Press <b>New</b> to make an empty chart over a new axis or an existing space.</>,
        <>Right-click a coordinate system and choose <b>Create Chart</b> to draw everything already laid along its axis.</>,
      ]}
      tips={[
        <>A chart owns none of its data: deleting one leaves the arrays, tables and the space untouched.</>,
      ]}
    />
  ),
  chart: (
    <PageHelp
      intro="A chart is data laid out along one axis. Each layer reads one source: a trace reads an array, a series reads a table column, an annotation layer shows drawn marks."
      steps={[
        <>Read <b>Laid out along</b> for the axis and its unit, and click the space below it to see what is registered into it.</>,
        <>Under <b>Layers</b>, click a source to open the data a layer reads.</>,
      ]}
      tips={[
        <>Where a layer sits along the axis comes from how its data is registered into the space, not from the chart.</>,
      ]}
    />
  ),
  lens: (
    <PageHelp
      intro="A lens is a selection of a container (an array dataset, a table, a sparse dataset, a mesh, a network or an annotation collection): the whole of it, or a part cut out of it. This page is the viewer for one lens, shows the scenes that draw it, and is where you hand it to a task."
      steps={[
        <>Press <b>Create scene</b> to draw this lens, if it is in no scene yet.</>,
        <>Pick a scene in the dropdown under the title, and press <b>Make default</b> to open this lens on it from now on.</>,
        <>Press <b>Run on lens</b> in the header to run a task on exactly this selection.</>,
        <>Click the pencil next to the title to name the lens.</>,
        <>Open the <b>Lenses</b> tab to switch to another lens of the same container, or press <b>New lens</b> there to cut a new one.</>,
        <>Click the name above the title to go to the dataset or table the lens was cut from. Mesh, network and annotation collections have no page of their own.</>,
      ]}
      tips={[
        <>Drag the sliders at the right and bottom edge to move through Z and the other dimensions; the <b>Layers</b> tab changes contrast, channels and visibility.</>,
        <>The <b>Info</b> tab shows the <b>Selection</b>, who created the lens and, for an array, what is <b>Derived from this lens</b>.</>,
        <>Only an array lens lists every scene that draws it; the other kinds list the scene they open on.</>,
      ]}
    />
  ),
};
