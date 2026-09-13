import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useResolve } from "@/datalayer/hooks/useResolve";
import { LokClient } from "@/linkers";
import { useClientQuery } from "../api/graphql";
import { clientAppVersion } from "../lib/clientLabels";

export const ClientAvatar = (props: { clientId: string }) => {
  const { data } = useClientQuery({
    variables: {
      clientId: props.clientId,
    },
  });

  const resolve = useResolve();
  const client = data?.client;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {client && (
          <LokClient.DetailLink object={client}>
            <Avatar className="h-10 w-10 cursor-pointer">
              <AvatarImage
                className="rounded-md"
                src={resolve(client.logo?.presignedUrl)}
                alt={client.name}
              />
              <AvatarFallback>{client.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
          </LokClient.DetailLink>
        )}
      </TooltipTrigger>

      <TooltipContent>{client?.name}</TooltipContent>
    </Tooltip>
  );
};


export const ClientImage = (props: { clientId: string, className?: string }) => {
  const { data } = useClientQuery({
    variables: {
      clientId: props.clientId,
    },
  });

  const resolve = useResolve();

  return (
    <img
      className={props.className}
      src={resolve(data?.client.logo?.presignedUrl)}
      alt={data?.client.name}
      loading="lazy"
    />
  );
};



export const JustClientName = (props: { clientId: string }) => {
  const { data } = useClientQuery({
    variables: {
      clientId: props.clientId,
    },
  });


  return <>{data?.client && clientAppVersion(data.client)}</>;
}
