import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Icons } from "@/components/icons";
import { Sidebars } from "@/components/layout/Sidebars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DokumentsDocument, DokumentsFile, LovekitStream } from "@/linkers";
import {
  DatabaseIcon,
  DownloadIcon,
  FileIcon,
  FileTextIcon,
} from "lucide-react";
import { useGetFileQuery } from "../api/graphql";
import { Separator } from "@/components/ui/separator";

// Helper for getting clean file extension
const getFileExtension = (filename: string) => {
  return filename.split('.').pop()?.toUpperCase() || 'FILE';
};

// Helper for determining color based on extension
const getFileTypeColor = (filename: string) => {
  const extension = filename.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf': return 'bg-chart-1/10 text-chart-1 border-chart-1/20';
    case 'doc':
    case 'docx': return 'bg-chart-2/10 text-chart-2 border-chart-2/20';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif': return 'bg-chart-3/10 text-chart-3 border-chart-3/20';
    case 'mp4':
    case 'avi':
    case 'mov': return 'bg-chart-4/10 text-chart-4 border-chart-4/20';
    case 'txt': return 'bg-chart-5/10 text-chart-5 border-chart-5/20';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

export const FilePage = asDetailQueryRoute(
  useGetFileQuery,
  ({ data }) => {
    const file = data?.file;

    const handleDownload = () => {
      if (file?.store.presignedUrl) {
        const link = document.createElement('a');
        link.href = file.store.presignedUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };

    const fileExtension = getFileExtension(file?.name || '');
    const fileTypeColorClass = getFileTypeColor(file?.name || '');

    return (
      <DokumentsFile.ModelPage
        title={file?.name || 'Untitled File'}
        object={file}
        pageActions={
          <div className="flex flex-row gap-2">
            <Button onClick={handleDownload} variant="outline" size="sm" className="shadow-sm">
              <DownloadIcon className="w-4 h-4 mr-2" />
              Download
            </Button>
            <DokumentsFile.ObjectButton object={file} />
          </div>
        }
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <LovekitStream.Knowledge object={file} />
            </Sidebars.Tab>
          </Sidebars>
        }
      >
        {/* Enhanced File Header / Title Area */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl border shadow-sm ${fileTypeColorClass}`}>
              <FileIcon className="h-8 w-8" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
                {file?.name}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <DatabaseIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span>ID: {file?.id}</span>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs font-mono px-2.5 py-1">
              {fileExtension}
            </Badge>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Bucket</div>
                  <div className="text-xs font-mono bg-muted/40 px-2.5 py-1.5 rounded border border-border/30 select-all truncate">
                    {file?.store.bucket}
                  </div>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Storage Key</div>
                  <div className="text-xs font-mono bg-muted/40 px-2.5 py-1.5 rounded border border-border/30 select-all break-all">
                    {file?.store.key}
                  </div>
                </div>
              </div>

              {file?.store.path && (
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Storage Path</div>
                  <div className="text-xs font-mono bg-muted/40 px-2.5 py-1.5 rounded border border-border/30 select-all break-all">
                    {file?.store.path}
                  </div>
                </div>
              )}

          {/* Associated Documents */}
          {file?.documents && file.documents.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileTextIcon className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-bold tracking-tight">Associated Documents</h2>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold text-xs">
                  {file.documents.length}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {file.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="group flex flex-col justify-between p-4 border border-border rounded-xl hover:shadow-sm transition-all duration-200 bg-card hover:bg-muted/30 h-36"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors shrink-0">
                        <FileTextIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <DokumentsDocument.DetailLink
                          object={doc}
                          className="font-semibold text-sm hover:text-primary transition-colors block truncate text-foreground"
                        >
                          {doc.title}
                        </DokumentsDocument.DetailLink>
                        <span className="text-[10px] text-muted-foreground font-mono truncate block mt-1">
                          ID: {doc.id}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-end border-t border-border/40 pt-2 mt-2">
                      <DokumentsDocument.DetailLink object={doc}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 hover:bg-muted transition-colors text-xs text-muted-foreground hover:text-foreground"
                        >
                          Open Document
                          <Icons.externalLink className="w-3.5 h-3.5 ml-1.5 shrink-0" />
                        </Button>
                      </DokumentsDocument.DetailLink>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Card className="border border-dashed border-border/80 p-8 text-center bg-muted/5">
              <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <FileTextIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-sm mb-1 text-foreground">No documents created yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No documents have been created from this file yet. Upload and process this file to generate documents.
              </p>
            </Card>
          )}
        </div>
      </DokumentsFile.ModelPage>
    );
  },
);

export default FilePage;


