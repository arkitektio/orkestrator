import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { Badge } from "@/core/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Image } from "@/core/components/ui/image";
import { useResolve } from "@/core/datalayer/hooks/useResolve";
import { DokumentsDocument, DokumentsPage, LovekitStream } from "@/core/linkers";
import { Eye, FileTextIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageFragment, useGetDocumentQuery } from "../api/graphql";
import { OcrOverlay } from "../components/OcrOverlay";

export const DocumentPage = asDetailQueryRoute(
  useGetDocumentQuery,
  ({ data }) => {
    const document = data?.document;
    const resolve = useResolve();
    const [selectedPage, setSelectedPage] = useState<PageFragment | null>(null);
    const [showOcrOverlay, setShowOcrOverlay] = useState(true);
    const imageRef = useRef<HTMLImageElement>(null);

    // Auto-select first page when document loads
    useEffect(() => {
      if (document?.pages?.length > 0 && !selectedPage) {
        setSelectedPage(document.pages[0]);
      }
    }, [document?.pages, selectedPage]);

    if (!document) return null;

    return (
      <DokumentsDocument.ModelPage
        title={document.title || `Document ${document.id}`}
        object={document}
        pageActions={
          <>
            <DokumentsDocument.ObjectButton alwaysShow object={document} />
          </>
        }
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <LovekitStream.Knowledge object={document} />
            </Sidebars.Tab>
          </Sidebars>
        }
      >
        {/* Full-Screen Two-Column Layout */}
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-12rem)]">
          {/* Left Column - Page Thumbnails (2 cols) */}
          <div className="col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="w-4 h-4" />
                  Pages
                  <Badge variant="outline" className="text-xs">{document.pages.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 h-[calc(100%-4rem)] overflow-y-auto">
                {document.pages.length > 0 ? (
                  <div className="space-y-2">
                    {document.pages
                      .map((page) => (
                        <div
                          key={page.id}
                          onClick={() => setSelectedPage(page)}
                          className={`group block cursor-pointer ${selectedPage?.id === page.id ? 'ring-2 ring-primary' : ''
                            }`}
                        >
                          <Card className={`transition-all duration-200 hover:shadow-md ${selectedPage?.id === page.id ? 'bg-primary/5' : ''
                            }`}>
                            <CardContent className="p-2">
                              {/* Page Thumbnail */}
                              <div className="aspect-[3/4] bg-muted rounded-md overflow-hidden mb-2">
                                {page.image?.presignedUrl ? (
                                  <Image
                                    src={resolve(page.image.presignedUrl)}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                                    <FileTextIcon className="w-6 h-6 text-muted-foreground/50" />
                                  </div>
                                )}
                              </div>

                              {/* Page Info */}
                              <div className="text-center">
                                <div className={`text-xs font-medium transition-colors ${selectedPage?.id === page.id ? 'text-primary' : 'group-hover:text-primary'
                                  }`}>
                                  Page {page.index + 1}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileTextIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No pages found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Page Preview (10 cols) */}
          <div className="col-span-10">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {selectedPage ? `Page ${selectedPage.index + 1} Preview` : 'Select a page to preview'}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {selectedPage && (
                      <>
                        <button
                          onClick={() => setShowOcrOverlay(!showOcrOverlay)}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${showOcrOverlay
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                        >
                          OCR Overlay
                        </button>
                        <DokumentsPage.DetailLink
                          object={selectedPage}
                          className="text-sm hover:text-primary transition-colors"
                        >
                          View full page →
                        </DokumentsPage.DetailLink>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[calc(100%-4rem)] overflow-hidden">
                {selectedPage ? (
                  <div className="h-full flex flex-col">
                    {/* Large Preview Image with OCR Overlay */}
                    <div className="flex-1 bg-muted rounded-lg overflow-hidden relative">
                      {selectedPage!.image?.presignedUrl ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img
                            ref={imageRef}
                            src={resolve(selectedPage!.image!.presignedUrl)}
                            className="max-w-full max-h-full object-contain"
                            alt={`Page ${selectedPage!.index + 1}`}
                          />
                          <OcrOverlay
                            page={selectedPage!}
                            imageRef={imageRef}
                            show={showOcrOverlay}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                          <FileTextIcon className="w-16 h-16 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <FileTextIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Select a page to preview</p>
                      <p className="text-sm mt-1">
                        Click on any page thumbnail to view it here
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DokumentsDocument.ModelPage>
    );
  },
);


export default DocumentPage;
