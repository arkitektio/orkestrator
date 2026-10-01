import { PageHelp } from "@/core/layout/help";

/**
 * lokate's page instructions, one per page, shown in the page's Help tab
 * (`help={LOKATE_HELP.timeline}`). Each names only what its page really
 * offers: the button labels, menu entries and dialogs are the ones on screen.
 */
export const LOKATE_HELP = {
  timeline: (
    <PageHelp
      intro="One day of your location history: where you stayed and how you got from one stay to the next, listed in order next to a map of the path."
      steps={[
        <>Press <b>Previous day</b> or <b>Next day</b> to move one day, or click the date button between them to pick a day from a calendar.</>,
        <>Press <b>Today</b> to come back to the current day.</>,
        <>Move the pointer over a stay in the list to highlight its circle on the map.</>,
        <>Click the name of a stay to open that place, or its duration at the right to open the stay itself.</>,
        <>Click a trip (Walk, Bike, Drive) to see its path and speed.</>,
        <>Right-click a stay and choose <b>Save as place</b> to give that spot a name.</>,
      ]}
      tips={[
        <>A stay without a name is shown by its coordinates. Once you save it as a place, later stays there carry the name.</>,
        <>“Points were recorded, but no stays or trips yet” means your phone has not sorted that day into stays and trips so far. Check again later.</>,
        <>The line above the list sums up the day: distance travelled, number of stays and places.</>,
      ]}
    />
  ),
  places: (
    <PageHelp
      intro="Your named places, such as home or work, as a list and as pins on a map. Stays near a place are shown under its name."
      steps={[
        <>Press <b>Add place</b>, click the map to set the pin, type a <b>Name</b>, adjust the <b>Radius</b> and press <b>Add</b>.</>,
        <>Type into <b>Search places…</b> to narrow the list.</>,
        <>Move the pointer over a place in the list to highlight its pin on the map.</>,
        <>Click a place in the list, or its pin on the map, to open it.</>,
        <>Right-click a place and choose <b>Edit place</b> or <b>Delete place</b>.</>,
      ]}
      tips={[
        <>Places are shared with all your phones: one you add here shows up on them, and one you name on a phone shows up here.</>,
        <>The number after a place is how often you were there, followed by the date of your last visit.</>,
      ]}
    />
  ),
  place: (
    <PageHelp
      intro="One named place: where it is on the map and your latest visits to it."
      steps={[
        <>Press <b>Edit</b> to rename the place, drag its pin or change its radius, then press <b>Save</b>.</>,
        <>Click the duration at the right of a visit in the list to open that stay.</>,
        <>Open the <b>Info</b> tab to see how often you were here, when you last visited and how large the place is.</>,
        <>Press <b>Delete</b> to remove the place from here and from all your phones.</>,
      ]}
      tips={[
        <>The radius decides which stays count as this place: your phones match any stay inside the circle to it.</>,
        <>Deleting a place keeps the visits. They only lose the name.</>,
        <>If a phone changed the place more recently than you, the phone’s version is kept and you are told so.</>,
      ]}
    />
  ),
  visit: (
    <PageHelp
      intro="One stay: a period you spent in one spot, shown as a circle on the map."
      steps={[
        <>Press <b>Save as place</b> to name this spot. The button is only shown when the stay does not belong to a place yet.</>,
        <>Open the <b>Info</b> tab to see when the stay began and ended and how long it lasted.</>,
        <>Click the place name in the <b>Info</b> tab to open the place this stay belongs to.</>,
        <>Click <b>Open day</b> in the <b>Info</b> tab to see the whole day this stay was part of.</>,
      ]}
      tips={[
        <>“Phone” shows which of your phones recorded the stay, as a short code.</>,
      ]}
    />
  ),
  trip: (
    <PageHelp
      intro="One trip between two stays: the path your phone recorded, drawn on the map, and whether it was a walk, a bike ride or a drive."
      steps={[
        <>Follow the line on the map to see the route you took.</>,
        <>Open the <b>Info</b> tab to see when the trip started and ended, the distance and the average speed.</>,
        <>Click <b>Open day</b> in the <b>Info</b> tab to see the whole day this trip was part of.</>,
      ]}
      tips={[
        <>Your phone decides how a trip was travelled. One it could not tell is simply called “Trip”.</>,
      ]}
    />
  ),
  insights: (
    <PageHelp
      intro="A summary of a longer period: how far you travelled, how, and where you spent most of your time."
      steps={[
        <>Pick the period in the selector at the top: <b>Last 30 days</b>, <b>Last 12 weeks</b> or <b>Last 12 months</b>.</>,
        <>Read the totals above the chart: distance travelled, number of trips and number of stays.</>,
        <>Move the pointer over a bar in the chart to see how much of that distance was walked, cycled or driven.</>,
        <>Click a place under “Where you spent your time” to open it.</>,
      ]}
      tips={[
        <>The list shows the ten places you spent the most time at, with the total time and the number of visits.</>,
        <>“Deleted place” is a place you have removed since; the time spent there is still counted.</>,
      ]}
    />
  ),
  privacy: (
    <PageHelp
      intro="What is stored about you on this server: the phones that back up their location history here, and the way to delete that backup."
      steps={[
        <>Check the list under <b>Phones</b>: each line is one phone, with the date it first uploaded, its last upload and how many location points it has sent.</>,
        <>Press <b>Delete server copy</b> to remove everything stored here: all points, stays, trips and places from all your phones.</>,
        <>Type DELETE into the field and press <b>Delete everything</b> to confirm.</>,
      ]}
      tips={[
        <>Deleting the server copy does not touch your phones. They keep their own history.</>,
        <>Your phones will upload again unless you turn syncing off on them first.</>,
      ]}
    />
  ),
};
