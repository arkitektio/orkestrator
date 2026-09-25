import { ChatBubbleIcon, DashIcon, HomeIcon } from "@radix-ui/react-icons";
import { Database, Podcast, ShoppingBasket, Users2, Workflow } from "lucide-react";
import { BsLightning } from "react-icons/bs";
import { GoWorkflow } from "react-icons/go";
import { MdStream } from "react-icons/md";
import { PiDatabaseLight, PiGraph } from "react-icons/pi";

/**
 * Module key to icon.
 *
 * Lifted out of `PrivateNavigationBar` so the command palette can label its
 * navigation rows with the same glyphs the rail uses — a module should look the
 * same wherever you reach it from.
 */
export const matchIcon = (key: string) => {
  switch (key) {
    case "rekuest":
      return <Podcast className="h-4 w-4" />;
    case "mikro":
      return <Database className="h-4 w-4" />;
    case "omeroark":
      return <PiDatabaseLight className="h-4 w-4" />;
    case "fluss":
      return <Workflow className="h-4 w-4" />;
    case "lok":
      return <Users2 className="h-4 w-4" />;
    case "settings":
      return <GoWorkflow className="h-4 w-4" />;
    case "kabinet":
      return <ShoppingBasket className="h-4 w-4" />;
    case "kraph":
      return <PiGraph className="h-4 w-4" />;
    case "alpaka":
      return <ChatBubbleIcon className="h-4 w-4" />;
    case "dokuments":
      return <DashIcon className="h-4 w-4" />;
    case "lovekit":
      return <MdStream className="h-4 w-4" />;
    case "elektro":
      return <BsLightning className="h-4 w-4" />;
    default:
      return <HomeIcon className="h-4 w-4" />;
  }
};

/** The same glyph, for a palette row. */
export const moduleIcon = (key: string, className = "h-4 w-4") => (
  <span
    className={`inline-flex items-center justify-center ${className} [&_svg]:h-4 [&_svg]:w-4`}
  >
    {matchIcon(key)}
  </span>
);
