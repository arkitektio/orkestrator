import { PageHelp } from "@/core/layout/help";

/**
 * kraph's page instructions, one per page, shown in the page's Help tab
 * (`help={KRAPH_HELP.graphs}`). Each names only what its page really offers:
 * the button labels, menu entries and dialogs are the ones on screen.
 */
export const KRAPH_HELP = {
  home: (
    <PageHelp
      intro="The starting page of the knowledge graph module. A graph collects what you know about your samples: the things you track (entities), what was measured on them, and how they relate. This page shows every graph you have."
      steps={[
        <>If you have no graph yet, press <b>Create Your First Graph</b>, give it a name and a description, and confirm. You land on the new graph.</>,
        <>Click a graph card to open it and see its schema as a diagram.</>,
        <>Right-click a graph card for its actions, for example <b>Create Protocol Event Category</b> or <b>Delete Graph</b>.</>,
        <>Open the <b>Statistics</b> tab of the sidebar to see how many graphs exist.</>,
      ]}
      tips={[
        <>Once at least one graph exists the create button is gone from this page. Further graphs are created on the <b>Graphs</b> page.</>,
      ]}
    />
  ),
  graphs: (
    <PageHelp
      intro="All knowledge graphs. A graph is one way of organizing the knowledge extracted from your data: it declares which categories of things, events and relations it shows."
      steps={[
        <>Press <b>Create</b> to make a new graph. Fill in <b>Name</b> and <b>Description</b> and confirm; you are taken to the new graph.</>,
        <>Click a graph to open its schema diagram.</>,
        <>Right-click a graph and choose <b>Create Protocol Event Category</b> to add a kind of experimental step to it, or <b>Delete Graph</b> to remove it.</>,
      ]}
      tips={[
        <>In the create dialog, <b>Draw existing evidence</b> fills the new graph with everything already recorded under the words it declares. This can take a while on a large evidence base; left off, the content appears at the next rebuild.</>,
      ]}
    />
  ),
  graph: (
    <PageHelp
      intro="One graph, shown as a diagram of its schema: each box is a category (a kind of entity or event) and each arrow a kind of relation between them. This is where you shape what the graph can hold."
      steps={[
        <>Click an empty spot of the diagram and press <b>Entity</b> to add a new entity category to this graph.</>,
        <>Click the name on a box or on an arrow to open that category.</>,
        <>Tidy the diagram with <b>Stress</b>, <b>Force</b>, <b>Disco</b>, <b>Tree</b>, <b>Layered</b> or <b>Circle</b>, or drag the boxes yourself, then press <b>Save</b> to keep the positions.</>,
        <>Press <b>Queries</b> to see the saved table queries over this graph.</>,
        <>Press the knife icon in the header to change the graph{"’"}s name and description, and <b>Pin</b> to pin it.</>,
        <>Open the menu button at the right end of the header for <b>Create Protocol Event Category</b> and <b>Delete Graph</b>.</>,
      ]}
      tips={[
        <>The badge in the header tells whether the graph has caught up with what was recorded: <b>up to date</b>, a number <b>behind</b>, <b>rebuilding</b> or <b>needs backfill</b>. <b>schema stale</b> means it was drawn under an older schema; hover the badge for details.</>,
        <><b>Save</b> stores the positions of the boxes only.</>,
        <>The <b>Plots</b> tab of the sidebar lists scatter plots.</>,
      ]}
    />
  ),
  graphQueries: (
    <PageHelp
      intro="The saved table queries of one graph. A query walks the graph along paths you chose and returns the result as a table."
      steps={[
        <>Click a query to open its result table.</>,
        <>From an opened query, press <b>Builder</b> to change the paths it follows.</>,
      ]}
      tips={[
        <>A query marked <b>legacy</b> was written before the current query format.</>,
      ]}
    />
  ),
  graphQuery: (
    <PageHelp
      intro="The result of one saved graph query, as a table. Come here to read the numbers and to turn them into plots."
      steps={[
        <>Type into <b>Search...</b> to filter the rows, and use <b>Columns</b> to hide or show columns.</>,
        <>Page through the result with <b>Previous</b> and <b>Next</b>.</>,
        <>Press <b>Add Plot</b>, pick the <b>X-Axis Column</b>, <b>Y-Axis Column</b> and <b>ID Column</b>, and press <b>Create Plot</b> to add a scatter plot of this table.</>,
        <>Open the <b>Plots</b> tab of the sidebar and click a plot to open it.</>,
        <>Press <b>Builder</b> to change what the query returns, or <b>Graph</b> to go back to its graph.</>,
      ]}
      tips={[
        <>The search box filters on the first column the query declares as searchable. If the query has none, typing has no effect.</>,
      ]}
    />
  ),
  queryBuilder: (
    <PageHelp
      intro="The visual editor of a graph query. You trace paths through the schema diagram, from category to relation to category, and the query returns one table row per match."
      steps={[
        <>Press <b>New Path</b>, then click the category the path should start from.</>,
        <>Continue by clicking a highlighted relation, then the highlighted category at its other end, as often as needed. Press <b>Finish Path</b> when done, or <b>Cancel</b> to discard it.</>,
        <>Press <b>WHERE</b> next to a step of a path to restrict it, for example to a certain label.</>,
        <>On a category box that is part of a path, press the small button whose tooltip reads “Return columns for path …”, choose the properties that should become table columns and confirm with <b>Save Return Columns</b>.</>,
        <>Press <b>Run Query</b> to save the query and see the <b>Query Results</b>. <b>Open</b> there leads to the full table.</>,
        <>Remove a path with the cross next to its name, or start over with <b>Clear All</b>.</>,
      ]}
      tips={[
        <>The cross next to a step removes that step and everything after it in the path.</>,
        <>Tick <b>Use DISTINCT in RETURN clause</b> to drop duplicate rows.</>,
        <><b>Run Query</b> overwrites the saved query with the paths shown here.</>,
      ]}
    />
  ),
  scatterPlot: (
    <PageHelp
      intro="A scatter plot over the table of a graph query. Each point is one row; the panel on the left decides which columns are plotted."
      steps={[
        <>Change <b>X Column</b>, <b>Y Column</b> or the optional colour, size and shape columns, then press <b>Update Plot</b>.</>,
        <>Click a point to pin it. Pinned points are listed below the plot with their values.</>,
        <>Press <b>Enable Lasso Selection</b> and draw around a group of points to pin all of them at once.</>,
        <>Remove a single pin with its cross, or all of them with <b>Clear All</b>.</>,
        <>Press <b>Query</b> to go back to the table the plot is drawn from.</>,
      ]}
      tips={[
        <><b>Update Plot</b> replaces the plot with a new one, so links to the old plot stop working.</>,
        <><b>Delete Plot</b> asks once and cannot be undone.</>,
      ]}
    />
  ),
  terms: (
    <PageHelp
      intro="Your organization’s vocabulary. A term is a word such as “cell” or “treated with”; graphs declare the words they use, and every graph declaring the same word sees the same records."
      steps={[
        <>Click a term to see what it means and which graphs declare it.</>,
        <>Read the line under each word to see what kind of term it is.</>,
      ]}
      tips={[
        <>There is no create button for terms on this page. A term{"’"}s label, description and ontology link are edited on its own page.</>,
      ]}
    />
  ),
  term: (
    <PageHelp
      intro="One word of the vocabulary: its meaning, and the graphs that use it. All those graphs share the same records for this word."
      steps={[
        <>Press <b>Edit</b> to set the <b>Label</b>, <b>Description</b> and <b>PURL</b> (the link to a published ontology term), then <b>Save</b>.</>,
        <>Look under <b>Declared by</b> to see every graph that uses this word, and under which category.</>,
        <>Click the link below the description, if there is one, to open the published ontology term.</>,
      ]}
      tips={[
        <>The description you set here is inherited by every graph that declares the word.</>,
      ]}
    />
  ),
  structureKinds: (
    <PageHelp
      intro="The kinds of data objects the graph knows about, for example images or regions of interest. A structure is a piece of data that measurements are attached to and that points to the biological thing it shows."
      steps={[
        <>Click a kind to see every data object of that kind that has been recorded.</>,
        <>Drag a kind onto an entity category and choose <b>Create New Measurement Category</b> to declare that this kind of data can measure that kind of entity.</>,
      ]}
    />
  ),
  structureKind: (
    <PageHelp
      intro="One kind of data object and the list of all objects of that kind known to the graph."
      steps={[
        <>Type into <b>Search structures...</b> to narrow the list, and switch between <b>Newest first</b> and <b>Oldest first</b>.</>,
        <>Press <b>Open</b> in a row to see that data object and its measurements.</>,
        <>Press <b>Export CSV</b> to download the list, and <b>Columns</b> to choose which columns are shown.</>,
        <>Press <b>Edit</b> to give the kind a readable <b>Label</b>, a <b>Description</b> and a <b>PURL</b>.</>,
        <>Drag an image file from your computer onto the page to use it as the picture of this kind.</>,
      ]}
    />
  ),
  structure: (
    <PageHelp
      intro="One data object as the graph sees it: what it is, a link to the object itself, and every measurement recorded on it."
      steps={[
        <>Click the card under the title to open the original data object.</>,
        <>Read the table below for each measurement with its <b>Value</b> and <b>Unit</b>.</>,
        <>Click the kind in the title to see all data objects of the same kind.</>,
      ]}
      tips={[
        <>Dragging a structure onto an entity offers <b>Link Structure to Entity</b>, which records that this data object tells something about that entity.</>,
      ]}
    />
  ),
  entityCategories: (
    <PageHelp
      intro="The kinds of things you track, such as cells, animals or samples. Each entity category belongs to one graph and defines which properties its entities have."
      steps={[
        <>Press <b>Create</b> to add a category: pick the <b>Graph</b>, the word it stands for, a <b>Label</b> and a <b>Description</b>. You land on the new category.</>,
        <>Click a category to see its entities.</>,
        <>Right-click a category and choose <b>Create New Entity</b> to record one entity of that kind, or <b>Delete Entity Category</b> to remove it.</>,
      ]}
    />
  ),
  entityCategory: (
    <PageHelp
      intro="One kind of entity and the table of all entities of that kind, with one column per property."
      steps={[
        <>Press <b>Create</b> followed by the category name to record a new entity and fill in its properties, or <b>Quick+</b> to add an empty one in a single click.</>,
        <>Click a value in the table to change it. It is saved when you leave the field.</>,
        <>Press <b>Open</b> in a row to open the record of that entity; from there, <b>Drawn in</b> leads to the entity as a graph shows it. The arrow at the start of the row shows what it is connected to.</>,
        <>Type into <b>Search entities...</b> to narrow the table, and press <b>Export CSV</b> to download it.</>,
        <>Press <b>Schema Builder</b> to add or change the properties of this category.</>,
        <>Press <b>Edit</b> to change label and description, and drag an image file onto the page to set the picture.</>,
      ]}
      tips={[
        <>Some values cannot be typed in by hand; those cells do not react to a click.</>,
        <>The <b>Stats</b> tab of the sidebar shows how many entities the category holds.</>,
      ]}
    />
  ),
  schemaBuilder: (
    <PageHelp
      intro="The editor for the properties of an entity category. A property is one column of the entity table, for example a weight or a date, together with the rule that decides where its value comes from."
      steps={[
        <>Press <b>Add Property</b>, then give it a <b>Display Name</b>. The <b>Machine Key</b> is filled in from the name.</>,
        <>Pick the <b>Data Type</b> and write a <b>Description</b>.</>,
        <>Under <b>Derivation</b>, choose how the value is worked out from the measurements that were recorded.</>,
        <>Drag properties in the list on the left to change their order.</>,
        <>Press <b>Save Schema</b> to store everything and return, or <b>Cancel</b> to leave without saving.</>,
      ]}
      tips={[
        <>Saving replaces the whole list. A property removed with <b>Delete Property</b> is gone from the category after the next save.</>,
        <>Switch on <b>Searchable</b> or <b>Indexed</b> only for properties you search or sort by.</>,
      ]}
    />
  ),
  entity: (
    <PageHelp
      intro="One entity as a graph shows it: the categories it belongs to, its properties and everything it is connected to."
      steps={[
        <>Press the pencil next to a property, enter a value and press <b>Save</b> to record it by hand.</>,
        <>Read <b>Connections</b> for the measurements, relations and events this entity takes part in, and whether each is incoming or outgoing.</>,
        <>Open the <b>Evidence</b> tab of the sidebar to see the data objects that inform this entity and who confirmed or withdrew the record.</>,
        <>Open the menu button in the header and choose <b>Retract Claim</b> to withdraw your record of this entity, or <b>Attest</b> to confirm it.</>,
        <>Click a category under <b>Metadata</b> to see all entities of that kind.</>,
      ]}
      tips={[
        <>Nothing is deleted here. Retracting withdraws only your own record; what others recorded, and the data behind it, stays.</>,
        <>A pencil that is greyed out belongs to a property that cannot be set by hand.</>,
      ]}
    />
  ),
  instance: (
    <PageHelp
      intro="A single record at the level of the whole organization, before any graph draws it: what was claimed, by whom, and when. You land here when a record is opened without a graph in hand."
      steps={[
        <>Look under <b>Drawn in</b> and click a category to see this record as that graph shows it.</>,
        <>Press <b>Open graph</b> next to an entry to go to the graph itself.</>,
        <>Click the word under the title to open its term.</>,
        <>Open the <b>Evidence</b> tab of the sidebar for the history of who confirmed or withdrew the record.</>,
      ]}
      tips={[
        <>An empty <b>Drawn in</b> list is not an error: no graph declares this word yet, and the record stands all the same.</>,
      ]}
    />
  ),
  link: (
    <PageHelp
      intro="A single record that connects two things, for example a relation, a measurement or “same as”. The page shows its kind, who recorded it, and its two ends."
      steps={[
        <>Read <b>Source</b> and <b>Target</b> to see what the link connects.</>,
        <>Open the <b>Evidence</b> tab of the sidebar for the history of who confirmed or withdrew it.</>,
        <>Open the menu button in the header and choose <b>Retract</b> to record that the link no longer holds, or <b>Attest</b> to confirm it.</>,
      ]}
      tips={[
        <>Retracting does not delete the link. It adds a record saying it no longer holds.</>,
      ]}
    />
  ),
  relationCategories: (
    <PageHelp
      intro="The kinds of connections between entities, such as “part of” or “interacts with”."
      steps={[
        <>Press <b>Create</b>, pick the <b>Graph</b>, and give the relation a <b>Label</b> and a <b>Description</b>. You land on the new category.</>,
        <>Click a category to open it.</>,
      ]}
      tips={[
        <>Under <b>Advanced</b> in the create dialog you can restrict which entity categories the relation may connect.</>,
      ]}
    />
  ),
  relationCategory: (
    <PageHelp
      intro="One kind of relation between entities."
      steps={[
        <>Press <b>Edit</b> to change its <b>Label</b> and <b>Description</b>, then <b>Save</b>.</>,
        <>Drag an image file from your computer onto the page to use it as the picture of this category.</>,
        <>Read the list at the bottom for the graph queries that use this relation.</>,
      ]}
    />
  ),
  relation: (
    <PageHelp
      intro="One recorded relation between two entities. The page shows which relation category it belongs to."
      tips={[
        <>The badge reads <b>not declared in this graph</b> when no category for this relation exists in the graph it is viewed from.</>,
      ]}
    />
  ),
  structureRelationCategories: (
    <PageHelp
      intro="The kinds of connections between data objects, for example that one image was derived from another. Unlike relations between entities, these link the data itself."
      steps={[
        <>Press <b>Create</b>, pick the <b>Graph</b>, and give the relation a <b>Label</b> and a <b>Description</b>. You land on the new category.</>,
        <>Click a category to open it.</>,
      ]}
    />
  ),
  structureRelationCategory: (
    <PageHelp
      intro="One kind of relation between data objects."
      steps={[
        <>Press <b>Edit</b> to change its <b>Label</b> and <b>Description</b>, then <b>Save</b>.</>,
        <>Drag an image file from your computer onto the page to use it as the picture of this category.</>,
      ]}
    />
  ),
  structureRelation: (
    <PageHelp
      intro="One recorded relation between two data objects. The page names the relation and shows the two objects it connects."
    />
  ),
  metricKinds: (
    <PageHelp
      intro="The kinds of values that are measured in your experiments, such as an area or an intensity. A metric is always attached to the data object it was measured on."
      steps={[
        <>Click a metric kind to open it.</>,
      ]}
    />
  ),
  metricKind: (
    <PageHelp
      intro="One kind of measured value."
      steps={[
        <>Press <b>Edit</b> to set its <b>Label</b>, <b>Description</b> and <b>PURL</b>, then <b>Save</b>.</>,
        <>Drag an image file from your computer onto the page to attach a picture to this kind.</>,
      ]}
    />
  ),
  metric: (
    <PageHelp
      intro="One measured value: the kind of metric it is and the value that was recorded."
    />
  ),
  measurementCategories: (
    <PageHelp
      intro="The kinds of measurement a graph accepts: which kind of data object may measure which kind of entity."
      steps={[
        <>Click a measurement category to open it.</>,
        <>Right-click a category and choose <b>Delete Measurement Category</b> to remove it.</>,
      ]}
      tips={[
        <>A new measurement category is made by dragging a structure kind onto an entity category and choosing <b>Create New Measurement Category</b>.</>,
      ]}
    />
  ),
  measurementCategory: (
    <PageHelp
      intro="One kind of measurement, linking data objects to the entities they measure."
      steps={[
        <>Press <b>Edit</b> to change its <b>Label</b> and <b>Description</b>, then <b>Save</b>.</>,
        <>Drag an image file from your computer onto the page to use it as the picture of this category.</>,
        <>Read the list at the bottom for the graph queries that use this measurement.</>,
      ]}
    />
  ),
  naturalEventCategories: (
    <PageHelp
      intro="The kinds of events that happen on their own during an experiment, such as a cell division or a death. They are what you use to follow lineages."
      steps={[
        <>Press <b>Create</b>, pick the <b>Graph</b>, and give the event a <b>Label</b> and a <b>Description</b>. You land on the new category.</>,
        <>Click a category to see which roles take part in it.</>,
      ]}
      tips={[
        <>Events you carry out yourself, such as a treatment, belong to <b>Protocol Events</b> instead.</>,
      ]}
    />
  ),
  naturalEventCategory: (
    <PageHelp
      intro="One kind of natural event and the roles it involves: what goes in (Inputs) and what comes out (Outputs)."
      steps={[
        <>Read <b>Inputs</b> and <b>Outputs</b> to see which roles an event of this kind has and what each role accepts.</>,
        <>Drag an image file from your computer onto the page to use it as the picture of this category.</>,
      ]}
      tips={[
        <>The roles are fixed when the category is created and cannot be changed here.</>,
      ]}
    />
  ),
  protocolEventCategories: (
    <PageHelp
      intro="The kinds of steps you perform on your samples, such as a treatment, a staining or an imaging session. Recording them is what later lets you filter data by experimental condition."
      steps={[
        <>Click a category to see its roles and to record that the step was performed.</>,
        <>Right-click a category and choose <b>Delete Protocol Event Category</b> to remove it.</>,
      ]}
      tips={[
        <>A new category is created from a graph: right-click the graph and choose <b>Create Protocol Event Category</b>.</>,
      ]}
    />
  ),
  protocolEventCategory: (
    <PageHelp
      intro="One kind of protocol step and the roles it involves: what it is applied to and what it produces."
      steps={[
        <>Press <b>Perform</b> followed by the step name, type the id of the entity for each role and press <b>Create</b> to record that the step was carried out.</>,
        <>Read the role lists to see what the step takes as source and what it yields as target.</>,
        <>Drag an image file from your computer onto the page to use it as the picture of this category.</>,
      ]}
    />
  ),
  protocolEvent: (
    <PageHelp
      intro="One recorded protocol step: a single time a step was carried out."
      steps={[
        <>Click a category under the title to open the kind of step this was.</>,
      ]}
    />
  ),
};
