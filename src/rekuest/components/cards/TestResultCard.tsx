import { AiOutlineCheck, AiOutlineExclamation } from "react-icons/ai";
import { TestCase, TestResult } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListTestResultFragment } from "../../api/graphql";

interface TestResultCardPOrops {
  result: ListTestResultFragment;
  mates?: MateFinder[];
}

export const TestResultCard = ({ result, mates }: TestResultCardPOrops) => {
  return (
    <TestResult.Smart
      object={result.id}
      className="rounded-md rounded bg-back-500 border-gray-800 border-1 relative p-2"
      mates={mates}
    >
      <TestCase.DetailLink object={result.case.id} className="flex flex-row">
        {result.case.name}:
        <div className="flex flex-row ml-2">
          {result.passed ? (
            <AiOutlineCheck className="text-green-600 my-auto" />
          ) : (
            <AiOutlineExclamation className="text-red-600 my-auto" />
          )}
          <div className="text-red-600">{result.result}</div>
        </div>
      </TestCase.DetailLink>
    </TestResult.Smart>
  );
};
