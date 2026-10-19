import { PageHelp } from "@/core/layout/help";

/**
 * lovekit's page instructions, one per page, shown in the page's Help tab
 * (`help={LOVEKIT_HELP.home}`). Each names only what its page really offers:
 * the button labels, menu entries and dialogs are the ones on screen.
 */
export const LOVEKIT_HELP = {
  home: (
    <PageHelp
      intro="Lovekit carries live video. This page links every Lovekit page and lists the latest streams and broadcasts."
      steps={[
        <>Use the <b>Streams</b>, <b>Solo Broadcasts</b> and <b>Calls</b> tiles at the top to open those pages.</>,
        <>Click a stream or broadcast below to open it.</>,
        <>Press ⌘K / Ctrl+K and type “Solo Broadcasts” to get there from anywhere.</>,
      ]}
    />
  ),
  soloBroadcasts: (
    <PageHelp
      intro="A solo broadcast is live video sent by one source to anyone who opens it. This page lists the latest broadcasts."
      steps={[
        <>Each card shows who is broadcasting, from which app, since when, and whether it carries video, sound or both. Click one to open it and watch.</>,
        <>Press ⌘K / Ctrl+K and type “Solo Broadcasts” to come back to this list from anywhere.</>,
      ]}
      tips={[
        <>A broadcast cannot be started from this page.</>,
      ]}
    />
  ),
  soloBroadcast: (
    <PageHelp
      intro="The live video of one broadcast. The page joins the broadcast by itself as soon as it opens."
      steps={[
        <>Wait a moment after opening the page; the video starts without pressing anything. <b>LIVE</b> in the corner means the streamer is sending; the eye counts who is watching, you included.</>,
        <>Sound starts muted: press <b>Unmute</b> at the bottom right of the video to hear it.</>,
        <>Open the <b>Info</b> tab for the streamer, the app they send from, when the broadcast started and its streams.</>,
        <>Use <b>Popout</b> in the page header’s ▾ menu to keep the video in a window of its own while you work elsewhere.</>,
      ]}
      tips={[
        <>“Waiting for … to send video” means you are connected but the streamer is not sending video right now.</>,
        <>If joining fails, press <b>Try again</b> in the player.</>,
      ]}
    />
  ),
  stream: (
    <PageHelp
      intro="One stream of a broadcast: whether it carries video or audio, who sends it and from which app."
      steps={[
        <>Open the <b>Knowledge</b> tab to see what has been recorded about this stream.</>,
        <>Open the menu button at the right end of the page header for the actions available on this stream.</>,
      ]}
      tips={[
        <>To watch live video, open a broadcast from <b>Solo Broadcasts</b> instead.</>,
      ]}
    />
  ),
  calls: (
    <PageHelp
      intro="The video calls your team has in progress. A call is about an object: start one from that object’s menu, and anyone in the organization can join."
      steps={[
        <>Right-click any object, or open its menu button, and choose <b>Call about this</b> to start or join the call about it, or <b>Call about this to the side</b> to keep the object on screen with the call under it.</>,
        <>Click a call under <b>In progress</b> to open it and press <b>Join call</b>.</>,
        <>When a teammate starts a call while your app is open, it shows up as a row in the rail: press <b>Join</b> to get in, or <b>Dismiss</b> to put it away.</>,
      ]}
      tips={[
        <>A call stays listed while someone is in it and disappears a couple of minutes after the last person leaves.</>,
      ]}
    />
  ),
  call: (
    <PageHelp
      intro="One call. Press Join call to connect with your camera and microphone; everyone in it is shown as a tile, and the About tab shows what the call is about."
      steps={[
        <>Press <b>Join call</b>. Use the buttons under the tiles to mute, stop your camera, invite people or leave.</>,
        <>Leave the page while you talk: the call follows you as a row in the rail with the same buttons, and clicking it brings you back.</>,
        <>Press <b>Invite people</b> to make teammates’ apps ring with a <b>Join</b> button; nobody needs an invitation to join, though: every call in progress is under <b>Join calls</b> on the home page.</>,
        <>Press <b>Open to the side</b> on the call’s row in the rail to keep the call in a split with the page you are working on.</>,
        <>Drag any object onto the call, or onto the call’s row in the rail, to turn the call to it: it shows under <b>Talking about</b> for everyone, and what the call was about before stays under <b>Earlier</b> in the <b>About</b> tab.</>,
        <>Click <b>Talking about</b>, under the tiles, to put what the call is talking about on screen to the right of it.</>,
      ]}
      tips={[
        <>Joining from a second device adds you a second time; the lobby counts your devices rather than listing you twice.</>,
        <>Voice input uses the microphone too; dictating while in a call may compete for it.</>,
      ]}
    />
  ),
};
