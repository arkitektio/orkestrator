import { ErrorBox } from '@/reaktion/edit/components/boxes/ErrorBox'
import { SolvedErrorBox } from '@/reaktion/edit/components/boxes/SolvedErrorBox'
import { useEditFlowStore } from '@/reaktion/edit/context'
import { AnimatePresence } from 'framer-motion'




export const ErrorOverlay = () => {
  const remainingErrors = useEditFlowStore((s) => s.remainingErrors);
  const solvedErrors = useEditFlowStore((s) => s.solvedErrors);


    return <AnimatePresence>
          <div className="absolute top-0 right-0 mr-3 mt-5 z-50 max-w-xs gap-1 flex flex-col min-w-[300px]">
            {remainingErrors.length !== 0 && (
              <ErrorBox errors={remainingErrors} />
            )}
            {solvedErrors.length !== 0 && (
              <SolvedErrorBox errors={solvedErrors} />
            )}
          </div>


        </AnimatePresence>

}
