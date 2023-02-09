import { useSettings } from "../../settings/settings-context";

export type ExperimentalFeatureProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export const ExperimentalFeature = (props: ExperimentalFeatureProps) => {
  const { settings } = useSettings();

  if (settings.experimental) {
    return <>{props.children}</>;
  } else {
    if (props.fallback !== undefined) return <>{props.fallback}</>;
    else return <></>;
  }
};
