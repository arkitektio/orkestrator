import * as React from "react";

import { useBlokReady } from "@/core/blok/preview/snapshotMode";
import type { PreparedBlokNode } from "@/core/blok/renderer/runtime";

import { classCandidates, ensureBlokClasses } from "./runtimeTailwind";

/**
 * Styles a blok's own Tailwind classes (`runtimeTailwind.ts`), found two ways:
 *
 * - **in the payload**: every literal of a prop named like a class
 *   (`className`, `contentClassName`), on any node, so the classes of an
 *   overlay that portals to `body` are compiled as well;
 * - **in what it renders**: a class computed at render (a `className` bound to
 *   a path) shows on the blok's container, which alone is observed. Never the
 *   page: the app's own classes are the build's.
 *
 * A preview holds its capture until the payload's classes apply.
 */

const CLASS_PROP = /class/i;

export const payloadClasses = (nodes: ReadonlyMap<string, PreparedBlokNode>): string[] => {
  const found = new Set<string>();
  for (const { node } of nodes.values()) {
    for (const prop of node.props ?? []) {
      if (CLASS_PROP.test(prop.key) && typeof prop.static_value === "string") {
        classCandidates(prop.static_value).forEach((candidate) => found.add(candidate));
      }
    }
  }
  return [...found].sort();
};

const classesUnder = (element: Element, into: Set<string>) => {
  element.classList.forEach((name) => into.add(name));
  element.querySelectorAll("[class]").forEach((child) => child.classList.forEach((name) => into.add(name)));
};

export const useBlokTailwind = (
  nodes: ReadonlyMap<string, PreparedBlokNode>,
  container?: React.RefObject<HTMLElement | null>,
): void => {
  const classes = React.useMemo(() => payloadClasses(nodes), [nodes]);
  const key = classes.join(" ");
  const [applied, setApplied] = React.useState<string | null>(null);

  React.useEffect(() => {
    let current = true;
    void ensureBlokClasses(classes).then(() => {
      if (current) setApplied(key);
    });
    return () => {
      current = false;
    };
    // `key` stands for `classes`' contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useBlokReady(classes.length === 0 || applied === key ? "ready" : "pending");

  React.useEffect(() => {
    const root = container?.current;
    if (!root) return;
    const initial = new Set<string>();
    classesUnder(root, initial);
    void ensureBlokClasses(initial);

    const observer = new MutationObserver((records) => {
      const found = new Set<string>();
      for (const record of records) {
        if (record.type === "attributes" && record.target instanceof Element) {
          record.target.classList.forEach((name) => found.add(name));
        }
        record.addedNodes.forEach((added) => {
          if (added instanceof Element) classesUnder(added, found);
        });
      }
      if (found.size > 0) void ensureBlokClasses(found);
    });
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [container]);
};
