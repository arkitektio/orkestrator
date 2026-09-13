import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlpakaProvider } from "@/linkers";
import Anthropic from "@lobehub/icons-static-svg/icons/anthropic.svg";
import Aws from "@lobehub/icons-static-svg/icons/aws.svg";
import Azure from "@lobehub/icons-static-svg/icons/azure.svg";
import Google from "@lobehub/icons-static-svg/icons/google.svg";
import HuggingFace from "@lobehub/icons-static-svg/icons/huggingface.svg";
import Mistral from "@lobehub/icons-static-svg/icons/mistral.svg";
import Ollama from "@lobehub/icons-static-svg/icons/ollama.svg";
import OpenAI from "@lobehub/icons-static-svg/icons/openai.svg";
import Perplexity from "@lobehub/icons-static-svg/icons/perplexity.svg";
import { ArrowUpRight, Bot, Cloud, Cpu, Server } from "lucide-react";
import { ListProviderFragment, ProviderKind } from "../../api/graphql";

interface Props {
  item: ListProviderFragment;

}

const providerImageClassName = "h-9 w-9 brightness-0 invert";

export const ProviderKindIcon = (props: {
  kind: ProviderKind;
  className?: string;
}) => {
  switch (props.kind) {
    case ProviderKind.Anthropic:
      return (
        <img
          src={Anthropic}
          alt="Anthropic"
          className={cn(providerImageClassName, props.className)}
        />
      );
    case ProviderKind.Anyscale:
      return <Server className={cn("h-9 w-9 text-white", props.className)} />;
    case ProviderKind.Aws:
      return <img src={Aws} alt="AWS" className={cn(providerImageClassName, props.className)} />;
    case ProviderKind.Azure:
      return <img src={Azure} alt="Azure" className={cn(providerImageClassName, props.className)} />;
    case ProviderKind.Cohere:
      return <Bot className={cn("h-9 w-9 text-white", props.className)} />;
    case ProviderKind.Custom:
      return <Cpu className={cn("h-9 w-9 text-white", props.className)} />;
    case ProviderKind.Deepinfra:
      return <Cloud className={cn("h-9 w-9 text-white", props.className)} />;
    case ProviderKind.FireworksAi:
      return <Bot className={cn("h-9 w-9 text-white", props.className)} />;
    case ProviderKind.Google:
      return <img src={Google} alt="Google" className={cn(providerImageClassName, props.className)} />;
    case ProviderKind.Groq:
      return <Cpu className={cn("h-9 w-9 text-white", props.className)} />;
    case ProviderKind.Huggingface:
      return (
        <img
          src={HuggingFace}
          alt="Hugging Face"
          className={cn(providerImageClassName, props.className)}
        />
      );
    case ProviderKind.Mistral:
      return <img src={Mistral} alt="Mistral" className={cn(providerImageClassName, props.className)} />;
    case ProviderKind.Ollama:
      return <img src={Ollama} alt="Ollama" className={cn(providerImageClassName, props.className)} />;
    case ProviderKind.Openai:
      return <img src={OpenAI} alt="OpenAI" className={cn(providerImageClassName, props.className)} />;
    case ProviderKind.Palm:
      return <img src={Google} alt="PaLM" className={cn(providerImageClassName, props.className)} />;
    case ProviderKind.Perplexity:
      return (
        <img
          src={Perplexity}
          alt="Perplexity"
          className={cn(providerImageClassName, props.className)}
        />
      );
    case ProviderKind.Replicate:
      return <Bot className={cn("h-9 w-9 text-white", props.className)} />;
    case ProviderKind.TogetherAi:
      return <Cloud className={cn("h-9 w-9 text-white", props.className)} />;
    case ProviderKind.Unknown:
      return <Bot className={cn("h-9 w-9 text-white", props.className)} />;
    case ProviderKind.VertexAi:
      return <img src={Google} alt="Vertex AI" className={cn(providerImageClassName, props.className)} />;
    default:
      return <Bot className={cn("h-9 w-9 text-white", props.className)} />;
  }
};

export const getProviderGradient = (kind: ProviderKind): string => {
  switch (kind) {
    case ProviderKind.Anthropic:
      return "bg-gradient-to-br from-orange-500 to-red-600";
    case ProviderKind.Anyscale:
      return "bg-gradient-to-br from-purple-600 to-purple-800";
    case ProviderKind.Aws:
      return "bg-gradient-to-br from-orange-400 to-orange-600";
    case ProviderKind.Azure:
      return "bg-gradient-to-br from-blue-500 to-blue-700";
    case ProviderKind.Cohere:
      return "bg-gradient-to-br from-blue-500 to-blue-700";
    case ProviderKind.Custom:
      return "bg-gradient-to-br from-gray-500 to-gray-700";
    case ProviderKind.Deepinfra:
      return "bg-gradient-to-br from-indigo-500 to-indigo-700";
    case ProviderKind.FireworksAi:
      return "bg-gradient-to-br from-orange-500 to-red-600";
    case ProviderKind.Google:
      return "bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500";
    case ProviderKind.Groq:
      return "bg-gradient-to-br from-green-500 to-green-700";
    case ProviderKind.Huggingface:
      return "bg-gradient-to-br from-yellow-400 to-orange-500";
    case ProviderKind.Mistral:
      return "bg-gradient-to-br from-red-500 to-red-700";
    case ProviderKind.Ollama:
      return "bg-gradient-to-br from-slate-600 to-slate-800";
    case ProviderKind.Openai:
      return "bg-gradient-to-br from-green-400 to-blue-500";
    case ProviderKind.Palm:
      return "bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500";
    case ProviderKind.Perplexity:
      return "bg-gradient-to-br from-purple-500 to-pink-600";
    case ProviderKind.Replicate:
      return "bg-gradient-to-br from-yellow-400 to-orange-500";
    case ProviderKind.TogetherAi:
      return "bg-gradient-to-br from-teal-500 to-cyan-600";
    case ProviderKind.Unknown:
      return "bg-gradient-to-br from-gray-400 to-gray-600";
    case ProviderKind.VertexAi:
      return "bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500";
    default:
      return "bg-gradient-to-br from-gray-500 to-gray-700";
  }
};

export const getProviderKindDisplayName = (kind: ProviderKind): string => {
  switch (kind) {
    case ProviderKind.Anthropic:
      return "Anthropic";
    case ProviderKind.Anyscale:
      return "Anyscale";
    case ProviderKind.Aws:
      return "AWS";
    case ProviderKind.Azure:
      return "Azure";
    case ProviderKind.Cohere:
      return "Cohere";
    case ProviderKind.Custom:
      return "Custom";
    case ProviderKind.Deepinfra:
      return "DeepInfra";
    case ProviderKind.FireworksAi:
      return "Fireworks AI";
    case ProviderKind.Google:
      return "Google";
    case ProviderKind.Groq:
      return "Groq";
    case ProviderKind.Huggingface:
      return "Hugging Face";
    case ProviderKind.Mistral:
      return "Mistral";
    case ProviderKind.Ollama:
      return "Ollama";
    case ProviderKind.Openai:
      return "OpenAI";
    case ProviderKind.Palm:
      return "PaLM";
    case ProviderKind.Perplexity:
      return "Perplexity";
    case ProviderKind.Replicate:
      return "Replicate";
    case ProviderKind.TogetherAi:
      return "Together AI";
    case ProviderKind.Unknown:
      return "Unknown";
    case ProviderKind.VertexAi:
      return "Vertex AI";
    default:
      return kind;
  }
};

const TheCard = ({ item }: Props) => {
  const modelPreview = item.models.slice(0, 3);

  return (
    <AlpakaProvider.Smart object={item}>
      <Card className="h-full min-h-60 border-border/60 bg-card shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/60">
              <ProviderKindIcon kind={item.kind} className="h-8 w-8" />
            </div>
            <Badge
              variant="outline"
              className="rounded-full"
            >
              {getProviderKindDisplayName(item.kind)}
            </Badge>
          </div>

          <CardTitle className="mt-2 text-lg font-semibold text-foreground">
            <AlpakaProvider.DetailLink
              object={item}
              className="block truncate transition-colors hover:text-foreground/80"
            >
              {item.name}
            </AlpakaProvider.DetailLink>
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            {item.models.length} {item.models.length === 1 ? "model" : "models"} available
          </p>
        </CardHeader>

        <CardContent className="flex-1 pt-0">
          {modelPreview.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {modelPreview.map((model) => (
                <span
                  key={model.id}
                  className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground"
                >
                  {model.modelId}
                </span>
              ))}
              {item.models.length > modelPreview.length ? (
                <span className="rounded-full border border-dashed border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground">
                  +{item.models.length - modelPreview.length} more
                </span>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
              No models linked yet.
            </div>
          )}
        </CardContent>

        <CardFooter className="mt-auto justify-between border-t border-border/60 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>Open provider</span>
          <ArrowUpRight className="h-4 w-4" />
        </CardFooter>
      </Card>
    </AlpakaProvider.Smart>
  );
};

export default React.memo(TheCard);