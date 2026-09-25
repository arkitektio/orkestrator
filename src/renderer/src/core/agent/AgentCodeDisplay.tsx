import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip";

export const AgentCodeDisplay = ({ code }: { code: number }) => {
  const getMessage = (code: number) => {
    switch (code) {
      case 1000:
        return "Normal Closure";
      case 1001:
        return "Going Away";
      case 1002:
        return "Protocol Error";
      case 1003:
        return "Unsupported Data";
      case 1005:
        return "No Status Recvd";
      case 1006:
        return "Abnormal Closure";
      case 1007:
        return "Invalid frame payload data";
      case 1008:
        return "Policy Violation";
      case 1009:
        return "Message too big";
      case 1010:
        return "Missing Extension";
      case 1011:
        return "Internal Error";
      case 1012:
        return "Service Restart";
      case 1013:
        return "Try Again Later";
      case 1014:
        return "Bad Gateway";
      case 1015:
        return "TLS Handshake";
      case 4000:
        return "Agent was disconnected by the server.";
      case 4001:
        return "Agent was disconnected by the client.";
      case 4002:
        return "Agent was kicked by the server.";
      case 4003:
        return "Agent was blocked by the server.";
      case 4004:
        return "Agent was not found.";
      case 4005:
        return "Agent was not authorized.";
      case 4006:
        return "Agent was not allowed.";
      case 4007:
        return "Agent was not supported.";
      case 4008:
        return "Agent was not implemented.";
      case 4009:
        return "Agent was not available.";
      case 4010:
        return "Agent was not ready.";
      case 4011:
        return "Agent was not busy.";
      default:
        return "Unknown error.";
    }
  };

  return (
    <Tooltip >
      <TooltipTrigger asChild><span>{getMessage(code)}</span></TooltipTrigger>
      <TooltipContent>
        <span className="font-mono font-bold">{code}</span>
      </TooltipContent>
    </Tooltip>
  );
};
