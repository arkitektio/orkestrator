import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { isTypingTarget } from "../../platform/input/keyboardTarget";
import { SCENE_SHORTCUTS } from "./sceneShortcutDefs";

const Keycap = ({ children }: { children: string }) => (
  <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[0.6875rem] leading-none text-white">
    {children}
  </kbd>
);

/**
 * The scene's shortcuts, on `?`.
 *
 * Scene chrome rather than a registry dialog (`app/dialog.tsx`): it must die
 * with the scene it documents, and the dialog provider wraps its contents in
 * `<Guard.Rekuest>` — the wrong service to gate a mikro viewport on. So it uses
 * the same overlay-card idiom as every other panel in here.
 *
 * Matched on `e.key`, not `e.code`, unlike the navigation bindings: `?` is a
 * character, and which physical key produces it is the layout's business.
 */
export const SceneShortcuts = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target as { tagName?: string; isContentEditable?: boolean } | null)) {
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setOpen((wasOpen) => !wasOpen);
        return;
      }
      // Only claims Escape while open, so it never swallows the key from the
      // ROI drawer's cancel or from a dialog above the scene.
      if (e.key === "Escape") {
        setOpen((wasOpen) => {
          if (wasOpen) e.preventDefault();
          return false;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!open) return null;

  return (
    // z-50 clears the page's own title overlay at z-40; the backdrop is the
    // dismiss target, so a click anywhere outside the card closes it.
    <div
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={() => setOpen(false)}
    >
      <div
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-lg border border-black/10 bg-black/60 p-4 backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-white">Keyboard shortcuts</h2>
          <Button
            variant="outline"
            size="xs"
            className="h-7 w-7 bg-black p-0"
            onClick={() => setOpen(false)}
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {SCENE_SHORTCUTS.map((group) => (
            <div key={group.title} className="flex flex-col gap-1">
              <div className="text-xs font-semibold text-white/70">{group.title}</div>
              {group.shortcuts.map((shortcut) => (
                <div
                  key={shortcut.description}
                  className="flex items-center justify-between gap-4 py-0.5"
                >
                  <span className="text-xs text-muted-foreground">
                    {shortcut.description}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {shortcut.keys.map((key) => (
                      <Keycap key={key}>{key}</Keycap>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
