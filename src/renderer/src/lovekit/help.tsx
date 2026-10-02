import { PageHelp } from "@/core/layout/help";

/**
 * lovekit's page instructions, one per page, shown in the page's Help tab
 * (`help={LOVEKIT_HELP.home}`). Each names only what its page really offers:
 * the button labels, menu entries and dialogs are the ones on screen.
 */
export const LOVEKIT_HELP = {
  home: (
    <PageHelp
      intro="Lovekit carries live video streams. This start page has no content of its own yet."
      steps={[
        <>Open <b>Solo Broadcasts</b> from the module’s navigation to see the live video that is available.</>,
        <>Press ⌘K / Ctrl+K and type “Solo Broadcasts” to get there from anywhere.</>,
      ]}
    />
  ),
  soloBroadcasts: (
    <PageHelp
      intro="A solo broadcast is live video sent by one source to anyone who opens it. This page lists the latest broadcasts."
      steps={[
        <>Click a broadcast under <b>Latest Broadcasts</b> to open it and watch.</>,
        <>Press ⌘K / Ctrl+K and type “Solo Broadcasts” to come back to this list from anywhere.</>,
      ]}
      tips={[
        <>Broadcasts are listed by their number, not by a title.</>,
        <>A broadcast cannot be started from this page.</>,
      ]}
    />
  ),
  soloBroadcast: (
    <PageHelp
      intro="The live video of one broadcast. The page joins the broadcast by itself as soon as it opens."
      steps={[
        <>Wait a moment after opening the page; the video starts without pressing anything.</>,
        <>Use <b>Popout</b> in the page header’s ▾ menu to keep the video in a window of its own while you work elsewhere.</>,
      ]}
      tips={[
        <>“Waiting for broadcast...” means you are connected but the source is not sending video right now.</>,
      ]}
    />
  ),
  stream: (
    <PageHelp
      intro="One video stream. For now this page shows only the stream’s number."
      steps={[
        <>Open the <b>Knowledge</b> tab to see what has been recorded about this stream.</>,
        <>Open the menu button at the right end of the page header for the actions available on this stream.</>,
      ]}
      tips={[
        <>To watch live video, open a broadcast from <b>Solo Broadcasts</b> instead.</>,
      ]}
    />
  ),
};
