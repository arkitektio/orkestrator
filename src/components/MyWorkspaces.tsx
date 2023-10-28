import React, { useState } from "react";
import { useDrop } from "react-dnd";
import { NativeTypes } from "react-dnd-html5-backend";
import { edges_to_flowedges, flowedges_to_edges, flownodes_to_nodes, noTypename, nodes_to_flownodes, notEmpty } from "../floating/utils";
import { FlowFragment, useImportFlowMutation, useMyWorkspacesQuery } from "../fluss/api/graphql";
import { WorkspaceCard } from "../fluss/components/cards/WorkspaceCard";
import { withFluss } from "../fluss/fluss";
import { FlowHomeFilterParams } from "../fluss/pages/FlowHome";
import { ListRender } from "../layout/SectionTitle";
import { FlussWorkspace } from "../linker";
import { useDeleteWorkspaceMate } from "../mates/workspace/useDeleteWorkspaceMate";
import { usePinWorkspaceMate } from "../mates/workspace/usePinWorkspaceMate";
import { useAlert } from "./alerter/alerter-context";
export type IMyGraphsProps = {} & FlowHomeFilterParams;


const hashFile = (file: File) => {
  return `${file.name}_${file.size}_${file.type}`;
};

export type UploadFuture = {
  hash: string;
  file: File;
  future: Promise<any>;
  controller: AbortController;
  progress?: number;
};
const MyWorkspaces: React.FC<IMyGraphsProps> = ({ limit, createdDay }) => {
  const variables = { limit: limit, offset: 0, createdDay: createdDay };
  const { data, loading, error, refetch } = withFluss(useMyWorkspacesQuery)({
    variables: variables,
  });

  const [importFlow] = withFluss(useImportFlowMutation)(
    {refetchQueries: ["MyWorkspaces"]}
  );


  const [uploadFutures, setUploadFutures] = useState<UploadFuture[]>([]);

  const deleteWorkspaceMate = useDeleteWorkspaceMate();
  const pinWorkspaceMate = usePinWorkspaceMate();

  const {alert} = useAlert();


  const uploadWorkflow = async (file: File) => {


    let upload = new Promise<string>((resolve, reject) => {
      var fr = new FileReader();  
      fr.onload = () => {
        resolve(fr.result as string )
      };
      fr.onerror = reject;
      fr.readAsText(file, "UTF-8");
    });

    let x = await upload;

    let y = JSON.parse(x) as FlowFragment;

    const flownodes = flownodes_to_nodes(nodes_to_flownodes(y.graph.nodes));
    const flowedges = flowedges_to_edges(edges_to_flowedges(y.graph.edges));
    

    //let image = await getImage();

    let graphInput =  {
      nodes: flownodes,
      edges: flowedges,
      globals: [],
      args: y.graph.args.filter(notEmpty).map(noTypename),
      returns: y.graph.returns.filter(notEmpty).map(noTypename),
    };

    return await importFlow({
      variables: {
        name: "Imported workspace for " + y.name || "Untitled",
        graph: graphInput,
      },
    })
  }

  const [{ isOver, canDrop, item }, drop] = useDrop(() => {
    return {
      accept: [NativeTypes.FILE],
      drop: (item, monitor) => {
        const files: File[] = (item as any).files;
        console.log("files", files);
        const futures: UploadFuture[] = files.map((file: File, index) => {
          let abortController = new AbortController();

          let hash = hashFile(file);

          return {
            hash: hash,
            file: file,
            controller: abortController,
            future: uploadWorkflow(file).then((x) =>
            setUploadFutures((futures) =>
              futures.filter((f) => f.hash !== hashFile(file))
            )
          )
          .catch((e) => {
            alert({message: "Error", subtitle: `This is not a valid workflow file.`})
            setUploadFutures((futures) =>
              futures.filter((f) => f.hash !== hashFile(file))
            );
          }),
          };
        });

        setUploadFutures(futures);
        return {};
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
        item: monitor.getItem(),
      }),
    };
  }, []);

  return (
    <>
    <ListRender
      array={data?.myworkspaces}
      loading={loading}
      title={
        <FlussWorkspace.ListLink className="flex-0">
          Workspaces
        </FlussWorkspace.ListLink>
      }
      refetch={refetch}
    >
      {(diagram, index) => (
        <WorkspaceCard
          key={index}
          workspace={diagram}
          mates={[deleteWorkspaceMate(diagram), pinWorkspaceMate(diagram)]}
        />
      )}
      
    </ListRender>
    {uploadFutures.map((future, index) => (
      <div
        key={index}
        className="rounded shadow-xl group text-white bg-center bg-cover relative group"
        // style={{
        //   background: `center bottom linear-gradient(to right, rgba(255,0,0,0.75), rgba(255,0,0,0.95)) ${
        //     future.progress && future.progress * 100
        //   }%, linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.95)) ${
        //     future.progress && (1 - future.progress) * 100
        //   }%`,
        // }}
        style={{
          background: `center bottom linear-gradient(to right, rgba(0,220,0,0.75) ${
            future.progress && Math.floor(future.progress * 100)
          }%, rgba(0,0,0,0.95) ${
            future.progress && Math.floor(future.progress * 100)
          }% ${
            future.progress && Math.floor((1 - future.progress) * 100)
          }%)`,
        }}
      >
        <div className="px-6 py-4">
          <div className="font-bold text-xl mb-2 cursor-pointer">
            {future.file.name}
          </div>
          <p className="text-white-700 text-base">
            {future.progress && Math.floor(future.progress * 100)}%
          </p>
        </div>
        <button
          type="button"
          className="hidden group-hover:block text-white-500 bg-red-500 rounded-md text px-2 absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 b"
          onClick={() => future.controller.abort()}
        >
          x
        </button>
      </div>
    ))}
    <div
      className={`${
        !canDrop && "hidden"
      } bg-slate-300 p-4 rounded shadow-xl group bg-center bg-cover animate-all`}
      ref={drop}
    >
      {isOver ? "Release to upload" : "Drag and drop a file here"}
    </div>
    </>
  );
};

export { MyWorkspaces as MyDiagrams };
