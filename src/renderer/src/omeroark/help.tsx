import { PageHelp } from "@/core/layout/help";

/**
 * omeroark's page instructions, one per page, shown in the page's Help tab
 * (`help={OMEROARK_HELP.home}`). Each names only what its page really offers:
 * the button labels, menu entries and dialogs are the ones on screen.
 */
export const OMEROARK_HELP = {
  home: (
    <PageHelp
      intro="Omero Ark shows the data of your OMERO server inside this app. OMERO sorts images into datasets, and datasets into projects; this page lists your projects."
      steps={[
        <>Click a project to see the datasets it contains.</>,
        <>Press <b>Create</b>, type a <b>New Name</b> and press <b>Create</b> to make a new project on the OMERO server. You are taken to it right away.</>,
        <>Press <b>Disconnect Omero User</b> to remove your OMERO login from this app.</>,
      ]}
      tips={[
        <><b>Disconnect Omero User</b> acts at once, without asking. Afterwards the <b>Connect to OMERO</b> form is shown again and you have to enter your username, password, host and port.</>,
      ]}
    />
  ),
  projects: (
    <PageHelp
      intro="All OMERO projects you can see. A project is the top level in OMERO: it groups datasets, which in turn hold the images."
      steps={[
        <>Click a project to open it and see its datasets.</>,
        <>Go to the Omero Ark dashboard and press <b>Create</b> there to make a new project.</>,
      ]}
    />
  ),
  datasets: (
    <PageHelp
      intro="All OMERO datasets you can see, across projects. A dataset is a group of images, usually from one experiment."
      steps={[
        <>Click a dataset to open it and see its images.</>,
        <>Open a project and press <b>Create</b> there to make a new dataset inside that project.</>,
      ]}
    />
  ),
  project: (
    <PageHelp
      intro="One OMERO project: its tags and the datasets it contains."
      steps={[
        <>Click a dataset under <b>Contained Dataset</b> to open it.</>,
        <>Press <b>Create</b>, type a <b>New Name</b> and press <b>Create</b> to add a dataset to this project on the OMERO server.</>,
        <>Read the project’s tags under <b>Tags</b>.</>,
      ]}
      tips={[
        <>A dataset created here belongs to this project from the start.</>,
      ]}
    />
  ),
  dataset: (
    <PageHelp
      intro="One OMERO dataset: its tags and the images it contains."
      steps={[
        <>Click an image under <b>Contained Images</b> to open it.</>,
        <>Read the dataset’s tags under <b>Tags</b>.</>,
      ]}
      tips={[
        <>Images cannot be added to the dataset from this page.</>,
      ]}
    />
  ),
  image: (
    <PageHelp
      intro="One OMERO image: a preview picture fetched from the OMERO server, and the image’s tags."
      steps={[
        <>Look at the preview to check that this is the image you mean.</>,
        <>Read the image’s tags under <b>Tags</b>.</>,
        <>Open the <b>Knowledge</b> tab to see what has been recorded about this image.</>,
      ]}
      tips={[
        <>The preview is a small thumbnail, not the full image data.</>,
      ]}
    />
  ),
};
