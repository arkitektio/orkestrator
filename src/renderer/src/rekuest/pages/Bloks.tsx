import { RekuestBlok } from "@/core/linkers";
import { PageAction } from "@/core/ui/page-action";
import { reportError } from "@/core/notify";
import { FilePlus2, Upload } from "lucide-react";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BLOK_FILE_EXTENSION, parseBlokFile } from "../components/editor/blokFile";
import BlokList from "../components/lists/BlokList";
import { REKUEST_HELP } from "../help";

/** The bloks people made or installed: theirs to edit, materialize and delete. */
const Page = () => {
  const navigate = useNavigate();
  const picker = useRef<HTMLInputElement>(null);
  // A blok file (or bare BSX) opens the editor on it as a NEW blok: nothing is saved until it is created there.
  const importFile = async (file: File) => {
    try {
      const parsed = parseBlokFile(await file.text());
      if (!parsed.ok) throw new Error(parsed.error);
      navigate("/rekuest/bloks/new", { state: { draft: parsed.draft } });
    } catch (error) {
      reportError(error, "Couldn't import the blok");
    }
  };
  return (
    <RekuestBlok.ListPage
      title={"Custom Bloks"}
      description="Bloks you made or installed: interfaces written in BSX that draw on your agents."
      help={REKUEST_HELP.customBloks}
      pageActions={
        <>
        <input
          ref={picker}
          type="file"
          accept={`${BLOK_FILE_EXTENSION},.json,.bsx,application/json`}
          aria-label="Blok file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // The same file can be picked again after a failed import.
            event.target.value = "";
            if (file) void importFile(file);
          }}
        />
        <PageAction size="sm" variant="ghost" icon={<Upload className="h-4 w-4" />} onClick={() => picker.current?.click()}>
          Import
        </PageAction>
        <PageAction alwaysShow size="sm" icon={<FilePlus2 className="h-4 w-4" />} onClick={() => navigate("/rekuest/bloks/new")}>
          New Blok
        </PageAction>
        </>
      }
    >
      <div className="p-3">
        <BlokList filters={{ provided: false }} />
      </div>
    </RekuestBlok.ListPage>
  );
};

export default Page;
