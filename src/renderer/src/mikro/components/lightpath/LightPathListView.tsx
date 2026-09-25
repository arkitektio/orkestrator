import { LightpathGraphFragment } from "@/mikro/api/graphql";
import { formatDisplay } from "@/lib/quantities";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, Zap, Filter, Search, Camera, Sun, Microscope, Square, CircleDot, ChevronRight } from "lucide-react";

type ElementType = LightpathGraphFragment['elements'][0];

// Type guards for different element types
const isDetectorElement = (element: ElementType): element is Extract<ElementType, { __typename: 'DetectorElement' }> =>
  element.__typename === 'DetectorElement';

const isLaserElement = (element: ElementType): element is Extract<ElementType, { __typename: 'LaserElement' }> =>
  element.__typename === 'LaserElement';

const isMirrorElement = (element: ElementType): element is Extract<ElementType, { __typename: 'MirrorElement' }> =>
  element.__typename === 'MirrorElement';

const isObjectiveElement = (element: ElementType): element is Extract<ElementType, { __typename: 'ObjectiveElement' }> =>
  element.__typename === 'ObjectiveElement';

const isBeamSplitterElement = (element: ElementType): element is Extract<ElementType, { __typename: 'BeamSplitterElement' }> =>
  element.__typename === 'BeamSplitterElement';

const isPinholeElement = (element: ElementType): element is Extract<ElementType, { __typename: 'PinholeElement' }> =>
  element.__typename === 'PinholeElement';

const isLensElement = (element: ElementType): element is Extract<ElementType, { __typename: 'LensElement' }> =>
  element.__typename === 'LensElement';

// Function to get element icon based on type
const getElementIcon = (element: ElementType) => {
  switch (element.__typename) {
    case 'DetectorElement':
      return <Eye className="h-4 w-4" />;
    case 'CCDElement':
      return <Camera className="h-4 w-4" />;
    case 'LaserElement':
      return <Zap className="h-4 w-4" />;
    case 'LampElement':
      return <Sun className="h-4 w-4" />;
    case 'FilterElement':
      return <Filter className="h-4 w-4" />;
    case 'MirrorElement':
      return <CircleDot className="h-4 w-4" />;
    case 'ObjectiveElement':
      return <Microscope className="h-4 w-4" />;
    case 'BeamSplitterElement':
      return <Square className="h-4 w-4" />;
    case 'PinholeElement':
      return <CircleDot className="h-4 w-4" />;
    case 'SampleElement':
      return <Search className="h-4 w-4" />;
    case 'LensElement':
      return <CircleDot className="h-4 w-4" />;
    case 'OtherSourceElement':
      return <Zap className="h-4 w-4" />;
    default:
      return <Square className="h-4 w-4" />;
  }
};

// Function to get element-specific details
const getElementDetails = (element: ElementType) => {
  const details: { label: string; value: string | number }[] = [];

  if (isDetectorElement(element) && element.nepdWPerSqrtHz !== null) {
    details.push({ label: "NEPD", value: `${element.nepdWPerSqrtHz} W/√Hz` });
  }

  if (isLaserElement(element) && element.nominalWavelength != null) {
    details.push({ label: "Wavelength", value: formatDisplay(element.nominalWavelength, "length") });
  }

  if (isObjectiveElement(element)) {
    if (element.magnification !== null) {
      details.push({ label: "Magnification", value: `${element.magnification}x` });
    }
    if (element.numericalAperture !== null && element.numericalAperture !== undefined) {
      details.push({ label: "NA", value: element.numericalAperture });
    }
    if (element.workingDistance != null) {
      details.push({ label: "WD", value: formatDisplay(element.workingDistance, "length") });
    }
  }

  if (isBeamSplitterElement(element)) {
    details.push({ label: "R/T", value: `${element.rFraction}/${element.tFraction}` });
  }

  if (isPinholeElement(element) && element.diameter != null) {
    details.push({ label: "Diameter", value: formatDisplay(element.diameter, "length") });
  }

  if (isLensElement(element)) {
    details.push({ label: "Focal Length", value: formatDisplay(element.focalLength, "length") });
  }

  if (isMirrorElement(element) && element.angleDeg !== null) {
    details.push({ label: "Angle", value: `${element.angleDeg}°` });
  }

  // Add manufacturer and model if available
  if (element.manufacturer) {
    details.push({ label: "Manufacturer", value: element.manufacturer });
  }
  if (element.model) {
    details.push({ label: "Model", value: element.model });
  }

  return details;
};

// Function to trace light path starting from detector and following edges in correct order
const traceLightPath = (graph: LightpathGraphFragment): ElementType[] => {
  const elements = graph.elements;
  const edges = graph.edges;

  // Find all detector elements (CCDElement, DetectorElement)
  const detectors = elements.filter(el =>
    el.__typename === 'DetectorElement' || el.__typename === 'CCDElement'
  );

  if (detectors.length === 0) {
    // If no detectors, just return unique elements by type
    return deduplicateByType(elements);
  }

  // Start with the first detector and build an ordered path
  const visited = new Set<string>();

  // Build a map for quick element lookup
  const elementMap = new Map<string, ElementType>();
  elements.forEach(el => elementMap.set(el.id, el));

  // Build adjacency maps for both directions
  const outgoingEdges = new Map<string, string[]>(); // element -> elements it points to
  const incomingEdges = new Map<string, string[]>(); // element -> elements that point to it

  edges.forEach(edge => {
    // Outgoing: source -> target
    if (!outgoingEdges.has(edge.sourceElementId)) {
      outgoingEdges.set(edge.sourceElementId, []);
    }
    outgoingEdges.get(edge.sourceElementId)!.push(edge.targetElementId);

    // Incoming: target <- source
    if (!incomingEdges.has(edge.targetElementId)) {
      incomingEdges.set(edge.targetElementId, []);
    }
    incomingEdges.get(edge.targetElementId)!.push(edge.sourceElementId);
  });

  const buildPath = (elementId: string, currentPath: ElementType[]) => {
    const element = elementMap.get(elementId);
    if (!element || visited.has(elementId)) return currentPath;

    visited.add(elementId);
    const newPath = [element, ...currentPath]; // Add to front since we're tracing backwards

    // Find elements that lead TO this element (trace backwards through the light path)
    const sourceIds = incomingEdges.get(elementId) || [];

    if (sourceIds.length === 0) {
      // This is a source element, we've reached the end
      return newPath;
    }

    // Continue tracing backwards from the first source
    // In a proper light path, there should typically be only one source per element
    return buildPath(sourceIds[0], newPath);
  };

  // Start from the first detector and trace backwards to build the complete path
  const detector = detectors[0];
  const completePath = buildPath(detector.id, []);

  // Add any unvisited elements (disconnected components) - deduplicate these too
  const unvisitedElements = elements.filter(el => !visited.has(el.id));
  const deduplicatedUnvisited = deduplicateByType(unvisitedElements);

  // Combine the ordered path with any remaining elements
  const combinedPath = [...completePath, ...deduplicatedUnvisited];

  // Final deduplication by type, preserving order
  return deduplicateByType(combinedPath);
};

// Helper function to deduplicate elements by their __typename, keeping the first occurrence
const deduplicateByType = (elements: ElementType[]): ElementType[] => {
  const seenTypes = new Set<string>();
  const deduplicatedElements: ElementType[] = [];

  elements.forEach(element => {
    if (!seenTypes.has(element.__typename)) {
      seenTypes.add(element.__typename);
      deduplicatedElements.push(element);
    }
  });

  return deduplicatedElements;
};

interface Props {
  graph: LightpathGraphFragment;
}

export const LightPathListView = ({ graph }: Props) => {
  const lightPath = traceLightPath(graph);

  if (lightPath.length === 0) {
    return (
      <div className="p-2 text-xs text-muted-foreground">
        No light path elements found
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 text-md  text-foreground mb-1">
        <span>Light Path </span>
      </div>
      <div className="flex items-center gap-1">
        {lightPath.map((element, index) => {
          const details = getElementDetails(element);

          return (
            <div key={element.id} className="flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-1.5 rounded border hover:bg-accent/50 transition-colors cursor-pointer">
                    {getElementIcon(element)}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {element.label}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {element.__typename.replace('Element', '')}
                      </Badge>
                    </div>

                    {details.length > 0 && (
                      <div className="space-y-1">
                        {details.map((detail, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{detail.label}:</span>
                            <span className="font-mono">{detail.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>

              {index < lightPath.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/50 mx-0.5" />
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider >
  );
};

export default LightPathListView;
