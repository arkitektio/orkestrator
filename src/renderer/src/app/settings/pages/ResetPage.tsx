import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/core/components/ui/alert-dialog";
import { Button } from "@/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card";
import { Input } from "@/core/components/ui/input";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SettingsPage } from "../components/SettingsPage";

/** Typed to arm the button, so a stray click cannot erase a computer. */
const CONFIRM_WORD = "reset";

/**
 * Factory reset: main wipes the session's storage, relaunches, and empties
 * `userData` before anything reopens it (`src/main/modules/FactoryReset.ts`).
 * Every window goes with the app; nothing comes back from this.
 */
export const ResetPage = () => {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [resetting, setResetting] = useState(false);

  const reset = async () => {
    setResetting(true);
    try {
      await window.api.factoryReset();
    } catch (error) {
      setResetting(false);
      toast.error(`Factory reset failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <SettingsPage slug="reset">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Factory reset
          </CardTitle>
          <CardDescription>
            Orkestrator restarts as if freshly installed. On this computer it
            forgets every account and login, all settings and pinned tabs,
            cached data, mesh connections and downloaded voice models. Nothing
            on your servers is touched — logins stay valid there until they
            expire, and mesh devices stay listed until an admin removes them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => {
              setTyped("");
              setOpen(true);
            }}
          >
            <RotateCcw className="w-4 h-4" />
            Reset Orkestrator…
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={open} onOpenChange={(next) => !resetting && setOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Erase everything and restart?</AlertDialogTitle>
            <AlertDialogDescription>
              Every window closes and the app relaunches empty. This cannot be
              undone. Type <span className="font-mono font-semibold">{CONFIRM_WORD}</span> to
              confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            autoFocus
            value={typed}
            disabled={resetting}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && typed.trim().toLowerCase() === CONFIRM_WORD) {
                void reset();
              }
            }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            {/* A plain Button, not AlertDialogAction: that one closes the
                dialog before the reset has started. */}
            <Button
              variant="destructive"
              disabled={resetting || typed.trim().toLowerCase() !== CONFIRM_WORD}
              onClick={() => void reset()}
            >
              {resetting ? "Resetting…" : "Erase and restart"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsPage>
  );
};

export default ResetPage;
