import { PageHelp } from "@/core/layout/help";

/**
 * dokuments' page instructions, one per page, shown in the page's Help tab
 * (`help={DOKUMENTS_HELP.home}`). Each names only what its page really offers:
 * the button labels, menu entries and dialogs are the ones on screen.
 */
export const DOKUMENTS_HELP = {
  home: (
    <PageHelp
      intro="Dokuments keeps files such as PDFs and scans, and the documents made from them: a document is a file split into pages, each with its recognized text. This page lists the files."
      steps={[
        <>Click a file to open it and see the documents made from it.</>,
        <>Right-click a file to open its context menu with the actions available for it.</>,
      ]}
    />
  ),
  file: (
    <PageHelp
      intro="One stored file: its name and type, where it is kept in storage, and the documents that were made from it."
      steps={[
        <>Press <b>Download</b> to save the file to your computer.</>,
        <>Under <b>Associated Documents</b>, click a title or <b>Open Document</b> to read the document made from this file, page by page.</>,
        <>Open the <b>Knowledge</b> tab in the sidebar to see what has been recorded about this file.</>,
      ]}
      tips={[
        <>“No documents created yet” means the file has not been processed into a document so far.</>,
        <>Bucket, Storage Key and Storage Path say where the file lies in storage; you rarely need them.</>,
      ]}
    />
  ),
  document: (
    <PageHelp
      intro="A document made from a file: its pages as thumbnails on the left, the selected page large on the right."
      steps={[
        <>Click a thumbnail under <b>Pages</b> to preview that page.</>,
        <>Press <b>OCR Overlay</b> to show or hide the recognized text: each line is outlined in colour on the page, with its text as a small label.</>,
        <>Press <b>View full page →</b> to open the selected page on its own.</>,
        <>Open the <b>Knowledge</b> tab in the sidebar to see what has been recorded about this document.</>,
      ]}
      tips={[
        <>OCR is text recognition: the text was read from the page image by software, so it can contain mistakes.</>,
        <>The first page is selected when the document opens.</>,
      ]}
    />
  ),
  page: (
    <PageHelp
      intro="A single page of a document: the text recognized on it, followed by the page image."
      steps={[
        <>Read the recognized text above the image.</>,
        <>Scroll down to see the page image in full.</>,
        <>Open the <b>Knowledge</b> tab in the sidebar to see what has been recorded about this page.</>,
      ]}
    />
  ),
};
