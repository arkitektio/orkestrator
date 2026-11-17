import { usePathMarker } from "../OntologyGraphProvider";

export const PathMarker = (props: { nodeId: string }) => {


  const paths = usePathMarker(props.nodeId);

  return (<>
    {paths.map((path, index) => (
      <div key={index} className={`absolute top-0 left-0 right-0 bottom-0 z-20 pointer-events-none border-4 rounded-md ${path.optional ? 'border-warning' : 'border-info'}`}>
        {path.title} {path.nodes.map((n, index) => n == props.nodeId ? <strong key={index}>{index}</strong> : "")}
      </div>
    ))}
  </>);
}
