import { PageHelp } from "@/core/layout/help";

/**
 * lovekit's page instructions, one per page, shown in the page's Help tab
 * (`help={LOVEKIT_HELP.home}`). Each names only what its page really offers:
 * the button labels, menu entries and dialogs are the ones on screen.
 */
export const LOVEKIT_HELP = {
  home: (
    <PageHelp
      intro="Lovekit carries live video. This page links every Lovekit page and lists the streams the apps of your organization offer."
      steps={[
        <>Use the <b>Streams</b> and <b>Calls</b> tiles at the top to open those pages.</>,
        <>Click a stream below to open it and watch it. A green dot means it is live.</>,
        <>Press ⌘K / Ctrl+K and type “Streams” to get there from anywhere.</>,
      ]}
      tips={[
        <>A stream is offered by an app (a microscope, a camera): it is there as long as the app offers it, and live while the app sends it.</>,
      ]}
    />
  ),
  streams: (
    <PageHelp
      intro="Every stream the apps of your organization offer, live or not."
      steps={[
        <>Each card shows what the stream carries, who runs the app it comes from, and whether it is live. Click one to watch it.</>,
      ]}
      tips={[
        <>A stream cannot be started from this page: the app that offers it sends it.</>,
      ]}
    />
  ),
  stream: (
    <PageHelp
      intro="One stream, live. The page connects by itself as soon as it opens."
      steps={[
        <>Wait a moment after opening the page; the picture starts without pressing anything.</>,
        <>“Waiting for …” means you are connected but the app is not sending right now; “… is offline” means the app is not running.</>,
        <>Click the app under <b>Agent</b> to see every stream it offers.</>,
      ]}
      tips={[
        <>When the app restarts, the stream comes back by itself: it is the same stream.</>,
      ]}
    />
  ),
  agent: (
    <PageHelp
      intro="One app that offers streams, and all of them, live, side by side."
      steps={[
        <>Click a stream's name to open it on its own page.</>,
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
