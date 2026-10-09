import { AnimatePresence, motion } from "framer-motion";

import { currentTopic } from "./structureInput";
import { TalkingAbout, topicKey, type CallTopic } from "./TalkingAbout";

// The rail islands' entrance, so the call's chrome moves like the rest of
// the app's: up out of a blur, and back into it.
const RISE = {
  initial: { opacity: 0, y: 10, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(6px)" },
  transition: { type: "spring", bounce: 0, duration: 0.4 },
} as const;

/**
 * The call's dock, centred under the tiles: what the call is talking about
 * and, once this window is in the call, its buttons (`children`). They are
 * one group: a new topic swaps its pill in place, and the buttons glide to
 * wherever that leaves them (`layout`), as they do when joining brings them
 * in beside the pill.
 */
export const CallDock = ({ call, children }: { call: { about: readonly CallTopic[] }; children?: React.ReactNode }) => {
  const topic = currentTopic(call);

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 px-3 py-2" data-testid="call-dock">
      <AnimatePresence mode="popLayout">
        {topic && (
          <motion.div key={topicKey(topic)} layout="position" className="min-w-0 max-w-full" {...RISE}>
            <TalkingAbout topic={topic} earlier={call.about.length - 1} />
          </motion.div>
        )}
        {children && (
          <motion.div key="controls" layout="position" {...RISE}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
