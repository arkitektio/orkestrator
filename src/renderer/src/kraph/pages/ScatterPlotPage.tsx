import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import { Button } from "@/core/components/ui/button";
import { PageAction } from "@/core/components/ui/page-action";
import { KraphGraphQuery, KraphScatterPlot } from "@/core/linkers";
import {
  useCreateScatterPlotMutation,
  useDeleteScatterPlotMutation,
  useGetScatterPlotQuery,
} from "../api/graphql";

import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import { Textarea } from "@/core/components/ui/textarea";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import ScatterPlot from "../components/charts/scatterplot/ScatterPlot";

const Page = asDetailQueryRoute(useGetScatterPlotQuery, ({ data }) => {
  const navigate = useNavigate();
  const [createScatterPlot] = useCreateScatterPlotMutation();
  const [deleteScatterPlot] = useDeleteScatterPlotMutation();

  // Get available column names from the table
  const columnNames = React.useMemo(() => {
    return data.scatterPlot.query.columns.map(c => c.key);
  }, [data.scatterPlot.query]);

  // Local state for parameters
  const [name, setName] = React.useState(data.scatterPlot.label);
  const [description, setDescription] = React.useState(
    data.scatterPlot.description || "",
  );
  const [xColumn, setXColumn] = React.useState(data.scatterPlot.xColumn);
  const [yColumn, setYColumn] = React.useState(data.scatterPlot.yColumn);
  const [idColumn, setIdColumn] = React.useState(data.scatterPlot.idColumn);
  const [colorColumn, setColorColumn] = React.useState(
    data.scatterPlot.colorColumn || "",
  );
  const [sizeColumn, setSizeColumn] = React.useState(
    data.scatterPlot.sizeColumn || "",
  );
  const [shapeColumn, setShapeColumn] = React.useState(
    data.scatterPlot.shapeColumn || "",
  );
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Reset local state when data changes
  React.useEffect(() => {
    setName(data.scatterPlot.label);
    setDescription(data.scatterPlot.description || "");
    setXColumn(data.scatterPlot.xColumn);
    setYColumn(data.scatterPlot.yColumn);
    setIdColumn(data.scatterPlot.idColumn);
    setColorColumn(data.scatterPlot.colorColumn || "");
    setSizeColumn(data.scatterPlot.sizeColumn || "");
    setShapeColumn(data.scatterPlot.shapeColumn || "");
  }, [data.scatterPlot]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      // Delete the old scatter plot
      await deleteScatterPlot({
        variables: {
          input: {
            id: Number(data.scatterPlot.id),
          },
        },
      });

      // Create a new one with updated parameters
      const result = await createScatterPlot({
        variables: {
          input: {
            name: name,
            description: description || null,
            graphQueryId: Number(data.scatterPlot.query.id),
            xColumn,
            yColumn,
            idColumn,
            colorColumn: colorColumn || null,
            sizeColumn: sizeColumn || null,
            shapeColumn: shapeColumn || null,
          },
        },
      });

      // Navigate to the new scatter plot
      if (result.data?.createScatterPlot) {
        navigate(`/kraph/scatterplots/${result.data.createScatterPlot.id}`);
      }
    } catch (error) {
      console.error("Failed to update scatter plot:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${data.scatterPlot.label}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setIsUpdating(true);
    try {
      await deleteScatterPlot({
        variables: {
          input: {
            id: Number(data.scatterPlot.id),
          },
        },
      });

      // Navigate back to scatter plots list
      // Up to the query the plot was over — there is no list of plots.
      navigate(KraphGraphQuery.linkBuilder(data.scatterPlot.query.id));
    } catch (error) {
      console.error("Failed to delete scatter plot:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const hasChanges =
    name !== data.scatterPlot.label ||
    description !== (data.scatterPlot.description || "") ||
    xColumn !== data.scatterPlot.xColumn ||
    yColumn !== data.scatterPlot.yColumn ||
    idColumn !== data.scatterPlot.idColumn ||
    colorColumn !== (data.scatterPlot.colorColumn || "") ||
    sizeColumn !== (data.scatterPlot.sizeColumn || "") ||
    shapeColumn !== (data.scatterPlot.shapeColumn || "");

  return (
    <KraphScatterPlot.ModelPage
      object={data.scatterPlot}
      title={data.scatterPlot.label}
      pageActions={
        <>
          <KraphGraphQuery.DetailLink object={data.scatterPlot.query}>
            <PageAction size="sm">Query</PageAction>
          </KraphGraphQuery.DetailLink>
        </>
      }
    >
      <div className="flex-initial grid md:grid-cols-12 gap-4 md:gap-8 xl:gap-20 md:items-center px-6 py-2">
        <div className="col-span-5">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            {data.scatterPlot.label}
          </h1>
          <p className="mt-3 text-xl text-muted-foreground">
            <KraphGraphQuery.DetailLink object={data.scatterPlot.query}>
              {data.scatterPlot.query.label}
            </KraphGraphQuery.DetailLink>
          </p>
        </div>
      </div>
      <div className="flex-grow flex gap-4 px-6">
        {/* Left column - Parameter controls */}
        <div className="w-80 flex-shrink-0 space-y-4 border-r pr-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Plot Parameters</h2>
            <p className="text-sm text-muted-foreground">
              Update scatter plot configuration
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter plot name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter plot description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="xColumn">X Column</Label>
              <Select value={xColumn} onValueChange={setXColumn}>
                <SelectTrigger id="xColumn">
                  <SelectValue placeholder="Select X column" />
                </SelectTrigger>
                <SelectContent>
                  {columnNames.map((colName) => (
                    <SelectItem key={colName} value={colName}>
                      {colName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yColumn">Y Column</Label>
              <Select value={yColumn} onValueChange={setYColumn}>
                <SelectTrigger id="yColumn">
                  <SelectValue placeholder="Select Y column" />
                </SelectTrigger>
                <SelectContent>
                  {columnNames.map((colName) => (
                    <SelectItem key={colName} value={colName}>
                      {colName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="idColumn">ID Column</Label>
              <Select value={idColumn} onValueChange={setIdColumn}>
                <SelectTrigger id="idColumn">
                  <SelectValue placeholder="Select ID column" />
                </SelectTrigger>
                <SelectContent>
                  {columnNames.map((colName) => (
                    <SelectItem key={colName} value={colName}>
                      {colName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="colorColumn">Color Column (Optional)</Label>
              <Select value={colorColumn} onValueChange={setColorColumn}>
                <SelectTrigger id="colorColumn">
                  <SelectValue placeholder="Select color column" />
                </SelectTrigger>
                <SelectContent>
                  {columnNames.map((colName) => (
                    <SelectItem key={colName} value={colName}>
                      {colName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sizeColumn">Size Column (Optional)</Label>
              <Select value={sizeColumn} onValueChange={setSizeColumn}>
                <SelectTrigger id="sizeColumn">
                  <SelectValue placeholder="Select size column" />
                </SelectTrigger>
                <SelectContent>
                  {columnNames.map((colName) => (
                    <SelectItem key={colName} value={colName}>
                      {colName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shapeColumn">Shape Column (Optional)</Label>
              <Select value={shapeColumn} onValueChange={setShapeColumn}>
                <SelectTrigger id="shapeColumn">
                  <SelectValue placeholder="Select shape column" />
                </SelectTrigger>
                <SelectContent>
                  {columnNames.map((colName) => (
                    <SelectItem key={colName} value={colName}>
                      {colName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleUpdate}
              disabled={!hasChanges || isUpdating}
              className="w-full"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Plot"
              )}
            </Button>

            <Button
              onClick={handleDelete}
              disabled={isUpdating}
              variant="destructive"
              className="w-full"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Plot"
              )}
            </Button>
          </div>
        </div>

        {/* Right column - Scatter plot */}
        <div className="flex-grow min-w-0">

          <ScatterPlot
            scatterPlot={data.scatterPlot}
            enableMultiselect
          />
        </div>
      </div>
    </KraphScatterPlot.ModelPage>
  );
});


export default Page;
