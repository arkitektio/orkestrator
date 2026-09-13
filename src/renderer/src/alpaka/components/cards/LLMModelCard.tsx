import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlpakaLLMModel } from "@/linkers";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { ListLlmModelFragment } from "../../api/graphql";
import {
  getProviderKindDisplayName,
  ProviderKindIcon,
} from "./ProviderCard";

interface Props {
  item: ListLlmModelFragment;

}

export const formatDisplayToken = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const TheCard = ({ item }: Props) => {
  const highlights = [
    ...item.features.slice(0, 2).map(formatDisplayToken),
    ...item.inputModalities.slice(0, 1).map((modality) => `${formatDisplayToken(modality)} in`),
    ...item.outputModalities.slice(0, 1).map((modality) => `${formatDisplayToken(modality)} out`),
  ].slice(0, 4);

  return (
    <AlpakaLLMModel.Smart object={item}>
      <Card className="h-full min-h-56 border-border/60 bg-card shadow-sm">
        <CardHeader className="gap-3 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-muted/60">
                <ProviderKindIcon kind={item.provider.kind} className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {item.provider.name}
                </p>
                <Badge variant="outline" className="mt-1 rounded-full text-[10px]">
                  {getProviderKindDisplayName(item.provider.kind)}
                </Badge>
              </div>
            </div>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </div>

          <CardTitle className="text-base font-semibold leading-tight">
            <AlpakaLLMModel.DetailLink
              object={item}
              className="line-clamp-2 transition-colors hover:text-foreground/80"
            >
              {item.llmString || item.modelId}
            </AlpakaLLMModel.DetailLink>
          </CardTitle>

          <p className="truncate text-sm text-muted-foreground">{item.modelId}</p>
        </CardHeader>

        <CardContent className="flex-1 space-y-3 pt-0">
          <div className="flex flex-wrap gap-2">
            {highlights.map((highlight) => (
              <Badge key={highlight} variant="secondary" className="rounded-full">
                {highlight}
              </Badge>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            {item.embedderFor.length > 0
              ? `Embedding ready for ${item.embedderFor.length} ${item.embedderFor.length === 1 ? "collection" : "collections"}`
              : "Available for Alpaka chat workflows"}
          </p>
        </CardContent>

        <CardFooter className="mt-auto justify-between border-t border-border/60 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>Open model</span>
          <ArrowUpRight className="h-4 w-4" />
        </CardFooter>
      </Card>
    </AlpakaLLMModel.Smart>
  );
};

export default React.memo(TheCard);