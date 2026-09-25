import { DESIGN_TOOLS } from "../../features/meshDesign/tools/registry";
/**
 * Every key the scene answers to, in one place.
 *
 * The bindings themselves each need their own logic and live with the component
 * that owns them, so this table cannot *drive* them — but it is the only thing
 * the shortcuts sheet reads, which at least means there is a single list to keep
 * honest rather than a help screen quietly drifting from the code.
 *
 * Adding a binding? Add it here in the same commit.
 */
export type SceneShortcut = {
  /** Rendered as separate keycaps. */
  keys: string[];
  description: string;
};

export type SceneShortcutGroup = {
  title: string;
  shortcuts: SceneShortcut[];
};

export const SCENE_SHORTCUTS: SceneShortcutGroup[] = [
  {
    title: "Navigate",
    shortcuts: [
      { keys: ["←", "→", "↑", "↓"], description: "Pan the view" },
      { keys: ["Shift", "↑"], description: "Zoom in" },
      { keys: ["Shift", "↓"], description: "Zoom out" },
      { keys: ["Shift", "←"], description: "Turn left (3D)" },
      { keys: ["Shift", "→"], description: "Turn right (3D)" },
      { keys: ["F"], description: "Frame the whole scene" },
      { keys: ["double-click"], description: "Center on that point (3D)" },
    ],
  },
  {
    title: "Move through the data",
    shortcuts: [
      { keys: ["Shift", "←"], description: "Previous Z slice (2D)" },
      { keys: ["Shift", "→"], description: "Next Z slice (2D)" },
      { keys: ["Shift", "scroll"], description: "Scrub through Z (2D)" },
      { keys: ["Shift", "1…0"], description: "Show or hide that channel" },
    ],
  },
  {
    title: "Tools",
    shortcuts: [
      { keys: ["A"], description: "Hold to annotate" },
      { keys: ["P"], description: "Hold to probe" },
      { keys: ["M"], description: "Hold to design meshes" },
      { keys: ["D"], description: "Draw a path from the probe" },
    ],
  },
  {
    title: "Mesh design",
    shortcuts: [
      // One entry per registered tool — a tool cannot exist half-documented.
      ...DESIGN_TOOLS.map((tool) => tool.shortcut),
      { keys: ["⌘", "Z"], description: "Undo the last sculpt (⇧ redoes)" },
      { keys: ["Esc"], description: "Cancel the stroke in progress" },
    ],
  },
  {
    title: "Help",
    shortcuts: [
      { keys: ["?"], description: "Show this list" },
      { keys: ["Esc"], description: "Close it again" },
    ],
  },
];
