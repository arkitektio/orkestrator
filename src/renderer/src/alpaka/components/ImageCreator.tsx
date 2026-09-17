import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useGenerateImageMutation } from "../api/graphql";

export const ImageCreator = (props: {
  kind: string;
  prompt: string;
  onCreate: (image: File) => Promise<void>;
}) => {
  const [generateImage, { loading }] = useGenerateImageMutation();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Revoke the preview blob URL when it is replaced (regenerate) or the component
  // unmounts — otherwise each generated image's object URL leaks.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const createImage = async (prompt: string) => {
    const response = await generateImage({
      variables: {
        input: {
          description: prompt,
        },
      },
    });

    if (response.data?.generateImage.image) {
      const imageUrl = response.data.generateImage.image;
      //Base64 string to File
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], "generated_image.png", {
        type: "image/png",
      });
      setFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const onSave = async () => {
    if (file) {
      await props.onCreate(file);
    }
  };

  if (file && preview) {
    return (
      <Card className="@container">
        <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
          <img src={preview} className="rounded-md w-full h-auto aspect-square object-cover" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setFile(null)}>
              Discard
            </Button>
            <Button onClick={() => onSave()}>Save</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center p-6 min-h-[200px] gap-2">
        <div className="p-[1px] rounded-md bg-gradient-to-r from-chart-5 via-chart-4 to-chart-1 inline-flex">
          <Button
            onClick={() => createImage(props.prompt)}
            disabled={loading}
            variant="ghost"
            className="bg-background hover:bg-secondary/80"
          >
            <Sparkles
              className={`w-4 h-4 mr-2 text-chart-4 ${loading ? "animate-spin" : ""
                }`}
            />
            <span className="bg-gradient-to-r from-chart-5 via-chart-4 to-chart-1 bg-clip-text text-transparent font-semibold">
              {loading ? "Dreaming up..." : `Generate ${props.kind} Image`}
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};










