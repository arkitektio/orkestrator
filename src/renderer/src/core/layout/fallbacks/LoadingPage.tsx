import { PageLayout } from "@/core/layout/PageLayout";
import { Card } from "@/core/ui/card";

export const LoadingPage = () => {
  return (
    <div className="h-full w-full relative">
      <PageLayout title="Loading">
        <div className="items-center justify-center h-full w-full flex flex-col"></div>
      </PageLayout>
      <div className="absolute top-0 left-0 w-full h-full backdrop-blur-sm z-50">
        <div className="flex items-center justify-center h-full">
          <Card className="p-4">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </Card>
        </div>
      </div>
    </div>
  );
};
