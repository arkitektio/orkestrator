import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet'
import { EyeOpenIcon, LetterCaseToggleIcon, QuestionMarkIcon } from '@radix-ui/react-icons'
import { ChevronRight, ChevronsLeft } from 'lucide-react'
import { useEditFlowStore, useEditTemporal } from '../context'

export const DefaultControls = () => {


  const { undo, redo, canUndo, canRedo } = useEditTemporal();
  const setShowEdgeLabels = useEditFlowStore((s) => s.setShowEdgeLabels);
  const setShowNodeErrors = useEditFlowStore((s) => s.setShowNodeErrors);
  const showEdgeLabels = useEditFlowStore((s) => s.showEdgeLabels);
  const showNodeErrors = useEditFlowStore((s) => s.showNodeErrors);


  return <div className="flex flex-row bg-card gap-2 rounded rounded-md overflow-hidden px-2 h-10 absolute top-2 left-2 z-10">
                <Button variant="outline" size="icon" onClick={() => undo()} disabled={!canUndo}>
                  <ChevronsLeft />
                </Button>
                <Button variant="outline" size="icon" onClick={() => redo()} disabled={!canRedo}>
                  <ChevronRight />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowEdgeLabels(!showEdgeLabels)}
                >
                  <LetterCaseToggleIcon />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNodeErrors(!showNodeErrors)}
                >
                  <QuestionMarkIcon />
                </Button>
                <Sheet>
                  <SheetTrigger>
                    <Button variant="outline" size="icon">
                      <EyeOpenIcon />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Debug Screen</SheetTitle>
                      <SheetDescription />
                    </SheetHeader>
                  </SheetContent>
                </Sheet>
              </div>

}
