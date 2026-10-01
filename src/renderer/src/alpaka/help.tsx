import { PageHelp } from "@/core/layout/help";

/**
 * alpaka's page instructions, one per page, shown in the page's Help tab
 * (`help={ALPAKA_HELP.home}`). Each names only what its page really offers:
 * the button labels, menu entries and dialogs are the ones on screen.
 */
export const ALPAKA_HELP = {
  home: (
    <PageHelp
      intro="Alpaka is where you chat with language models about your data. This page starts a new chat and lists the ones you had recently."
      steps={[
        <>Type a question into the box at the top and press Enter to start a new chat. Shift + Enter adds a new line instead.</>,
        <>Click the <b>Continue chat</b> card to go back to the chat you used last.</>,
        <>Type into <b>Filter chats</b> to narrow the list of recent chats by title or text.</>,
        <>Press <b>New</b> next to the filter to open an empty chat without a first question.</>,
        <>Use the <b>Models</b>, <b>Providers</b> and <b>Collections</b> tiles at the bottom to see what the chats can draw on.</>,
      ]}
      tips={[
        <>Your question is not sent right away: it is placed in the new chat’s message box, where you pick who answers before sending.</>,
        <>You can start a chat about any object in the app: right-click it and choose <b>Talk about structure</b>.</>,
        <>The filter, the <b>New</b> button and the <b>Continue chat</b> card only appear once you have at least one chat.</>,
      ]}
    />
  ),
  rooms: (
    <PageHelp
      intro="A room is one conversation: its messages, the objects attached to them and the replies. This page lists all rooms."
      steps={[
        <>Click a room card to open the conversation.</>,
        <>Right-click a room and choose <b>Delete Room</b> to remove it. You are asked to confirm.</>,
        <>Go to the Alpaka home page to start a new chat by typing a question.</>,
      ]}
      tips={[
        <><b>New</b> lists actions from connected apps that can create a room. It is empty when no app offers one; the home page is the usual way to start a chat.</>,
      ]}
    />
  ),
  room: (
    <PageHelp
      intro="One conversation. You write messages, attach objects to them, and a replyer (an app that answers messages, usually with a language model) writes back."
      steps={[
        <>Check the picker at the bottom left of the message box: it names the replyer that will answer. The first available one is chosen for you; click it to pick another, or <b>No replyer</b>.</>,
        <>Write your message and press Enter or <b>Send</b>. Shift + Enter adds a new line.</>,
        <>Drag an object from anywhere in the app onto the conversation and release it on <b>Drop to Add to Chat</b>. It is listed as <b>Attached</b> and goes out with your next message.</>,
        <>Press <b>Args</b> next to the picker to set the options of the chosen replyer, when it has any.</>,
        <>Hover a message and press the button that appears at its corner (<b>Re-run selected replyer on this message</b>) to get a new answer to it.</>,
        <>Watch the status line that appears while a reply is being prepared; its button cancels the reply.</>,
      ]}
      tips={[
        <>When the picker reads <b>No replyer</b>, your message is saved in the room but nothing answers it. That is also what you see when no connected app offers a replyer.</>,
        <>If the picker shows an <b>Install Replyer</b> list, choosing an entry installs that replyer. Open the picker again afterwards to select it.</>,
        <>The <b>Info</b> tab shows who opened the room, who takes part in it and how many messages it holds.</>,
      ]}
    />
  ),
  providers: (
    <PageHelp
      intro="A provider is a connection to a service that hosts language models, for example OpenAI or a local Ollama. Each provider brings its own list of models."
      steps={[
        <>Press <b>New Provider</b>, fill in <b>Name</b>, <b>Kind</b> and <b>Api Key</b>, and press <b>Create</b> to connect a service.</>,
        <>Click a provider to see the models it offers.</>,
        <>Right-click a provider and choose <b>Rescan Provider</b> to refresh its list of available models.</>,
        <>Right-click a provider and choose <b>Delete Provider</b> to remove the connection.</>,
      ]}
      tips={[
        <>The API key is stored on the server and is never shown again after you save it.</>,
      ]}
    />
  ),
  provider: (
    <PageHelp
      intro="One provider: the service it talks to and the language models it makes available."
      steps={[
        <>Click a model under <b>Available Models</b> to open its page.</>,
        <>Use <b>Previous</b> and <b>Next</b> to page through the models when there are more than eight.</>,
        <>Open the menu button at the right end of the page header and choose <b>Rescan Provider</b> to refresh the list of models.</>,
        <>Choose <b>Delete Provider</b> from the same menu to remove this provider.</>,
      ]}
      tips={[
        <>If the page says “This provider does not expose any models yet.”, try <b>Rescan Provider</b>.</>,
      ]}
    />
  ),
  llmModels: (
    <PageHelp
      intro="The language models that your providers make available. Each card shows the provider, the model’s name and what it can take in and put out."
      steps={[
        <>Click a model card to open its page.</>,
        <>Read the badges on a card to see what the model supports before you open it.</>,
        <>Go to Providers and use <b>Rescan Provider</b> if a model you expect is missing.</>,
      ]}
      tips={[
        <>The models come from your providers. Rescanning a provider refreshes its models.</>,
      ]}
    />
  ),
  llmModel: (
    <PageHelp
      intro="One language model: which provider it comes from, what it can do, and which collections use it to index their documents."
      steps={[
        <>Press <b>Chat</b> to try the model: write a message, press <b>Send</b> (or Ctrl + Enter) and read the answer under <b>Response</b>.</>,
        <>Press <b>Use For...</b>, pick a <b>Use Case</b> (Image Generation, Text Generation or Embeddings) and press <b>Set</b> to make this the default model for that job.</>,
        <>Click the provider card under <b>Provider</b> to open the provider, or a model under “Other models from this provider” to compare.</>,
        <>Click a collection under <b>Embedding Collections</b> to open a collection that is indexed with this model.</>,
      ]}
      tips={[
        <>The <b>Chat</b> dialog is a quick test. Nothing from it is saved as a room.</>,
      ]}
    />
  ),
  collections: (
    <PageHelp
      intro="A collection is a group of documents that can be searched by meaning rather than by exact words."
      steps={[
        <>Click a collection to open it and search its documents.</>,
        <>Read the badge on a card to see how many documents the collection holds.</>,
      ]}
      tips={[
        <><b>New</b> lists actions from connected apps that can create a collection. It is empty when no app offers one.</>,
        <>A card without a document count means the document store could not be reached.</>,
      ]}
    />
  ),
  collection: (
    <PageHelp
      intro="One collection of documents. Here you can test what a search by meaning returns from it."
      steps={[
        <>Type a phrase into <b>Search</b>. The matching documents appear below shortly after you stop typing.</>,
        <>Read a result: it shows the object the document describes when there is one, otherwise the document’s text.</>,
        <>Click the model name after “Embedded with” to open the model that indexes this collection.</>,
      ]}
      tips={[
        <>The search compares meaning, so a result does not have to contain your words.</>,
        <>“Document count unavailable” means the document store could not be reached.</>,
      ]}
    />
  ),
};
