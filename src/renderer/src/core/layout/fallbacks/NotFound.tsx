import { SearchX } from "lucide-react";
import { useParams } from "react-router-dom";
import { StatusPage, type StatusDetail } from "./StatusPage";
import { BackButton, HomeButton, ModuleHomeButton, useStatusContext } from "./statusActions";

/**
 * No route matches: the app's catch-all, and each module's own (which knows
 * the part of the path the module could not place).
 */
export const NotFound = () => {
  const { path, module, username } = useStatusContext();
  // From a module's catch-all, `*` holds what the module could not match.
  const unmatched = useParams()["*"];

  const details: StatusDetail[] = [{ label: "Requested", value: path, mono: true }];
  if (module) details.push({ label: "Module", value: module.label });
  if (module && unmatched) details.push({ label: "Unmatched", value: unmatched, mono: true });
  if (username) details.push({ label: "Signed in as", value: username });

  return (
    <StatusPage
      code={404}
      icon={SearchX}
      title={module ? `${module.label} has no page here` : "This page doesn't exist"}
      description="The address doesn't match any page. It may have moved, or the link may be incomplete."
      hints={[
        <>A link from an older version may point at a page that was renamed; start again from the sidebar.</>,
        <>A shared link only opens in the organization it was made in.</>,
      ]}
      actions={
        <>
          <BackButton />
          <ModuleHomeButton />
          <HomeButton />
        </>
      }
      details={details}
    />
  );
};

export default NotFound;
