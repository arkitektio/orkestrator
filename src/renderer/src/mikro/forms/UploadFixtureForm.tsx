import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useDatalayerEndpoint } from "@/core/connection/arkitekt/host";
import { DialogError } from "@/core/dialogs/DialogError";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { MikroFixture } from "@/core/linkers";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { AxisType, CreateFixtureDocument, type CreateFixtureMutation, type CreateFixtureMutationVariables } from "@/mikro/api/graphql";
import { useMikro } from "@/mikro/api/funcs";
import { uploadKulisseBlob } from "@/mikro/components/scene/platform/sources/mediaUpload";

/**
 * The unit a CAD exporter wrote the vertices in. glTF says metres, and a
 * conforming exporter scales to them; many CAD tools write millimetres
 * anyway. The choice is the model's AXES' unit, so registering it into a
 * micrometre world converts by the units, with no factor stated twice.
 */
const UNITS = [
  { value: "meter", label: "m", hint: "glTF's own unit: what a conforming exporter writes" },
  { value: "millimeter", label: "mm", hint: "What most CAD tools work in, and often export unscaled" },
  { value: "micrometer", label: "µm", hint: "Drawn at the scale of the sample" },
] as const;

const stem = (fileName: string) => fileName.replace(/\.(glb|gltf)$/i, "");

const unitButton = (active: boolean) =>
  `rounded border px-3 py-1 text-sm transition-colors ${
    active ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent"
  }`;

/**
 * Upload a binary glTF as a fixture: the file goes to the datalayer as a
 * kulisse store (`uploadKulisseBlob`), whose finish reads the file's header
 * and box and refuses anything that is not a self-contained glTF 2.0 model;
 * then `createFixture` registers it in a space of its own whose x, y, z axes
 * carry the chosen unit.
 *
 * Opens the model's page on success, so there is no toast.
 */
export const UploadFixtureForm = (props: { folder?: string }) => {
  const client = useMikro();
  const datalayer = useDatalayerEndpoint();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<(typeof UNITS)[number]["value"]>("meter");

  const { submit, submitting } = useDialogSubmit(
    async () => {
      if (!file) throw new Error("Choose a .glb file to upload.");
      if (!datalayer) throw new Error("No datalayer is configured, so there is nowhere to upload the file to.");
      const store = await uploadKulisseBlob(client, datalayer, new Blob([file], { type: "model/gltf-binary" }), file.name);
      const result = await client.mutate<CreateFixtureMutation, CreateFixtureMutationVariables>({
        mutation: CreateFixtureDocument,
        variables: {
          input: {
            store,
            name: name.trim() || stem(file.name),
            axes: ["x", "y", "z"].map((axis) => ({ name: axis, type: AxisType.Space, unit })),
            ...(props.folder ? { folder: props.folder } : {}),
          },
        },
        refetchQueries: ["Children"],
      });
      const created = result.data?.createFixture;
      if (!created) throw new Error("The server answered with no model.");
      return created.id;
    },
    { errorTitle: "Couldn't upload the model", onSuccess: (id) => navigate(MikroFixture.linkBuilder(id)) },
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle>Upload a fixture</DialogTitle>
        <DialogDescription>
          A binary glTF (.glb) of hardware around the sample — a coverslip, a dish, a holder. Once registered, place
          it in a scene's world and add it as a layer.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fixture-file">File</Label>
        <Input
          id="fixture-file"
          type="file"
          accept=".glb,model/gltf-binary"
          onChange={(event) => {
            const picked = event.target.files?.[0] ?? null;
            setFile(picked);
            if (picked && !name) setName(stem(picked.name));
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fixture-name">Name</Label>
        <Input id="fixture-name" value={name} placeholder="Coverslip #1.5" onChange={(event) => setName(event.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Unit the file is in</Label>
        <div className="flex gap-2">
          {UNITS.map((option) => (
            <button key={option.value} type="button" title={option.hint} className={unitButton(unit === option.value)} onClick={() => setUnit(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {UNITS.find((option) => option.value === unit)?.hint}. The axes are x, y, z in the order the file stores
          them; glTF is +y up, so a model lying flat in the file needs a y↔z swap when it is placed.
        </p>
      </div>

      <DialogError />

      <DialogFooter>
        <Button type="submit" disabled={!file || submitting}>
          {submitting ? "Uploading…" : "Upload"}
        </Button>
      </DialogFooter>
    </form>
  );
};
