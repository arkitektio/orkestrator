import * as React from 'react';

export type ChildBuilder = (id: string, basePath?: string) => React.ReactNode;

export type ChildDescriptor = string | {id: string; basePath?: string};

/**
 * Renders a `children` prop — a list of child ids, optionally each with its own
 * `basePath`.
 *
 * Children are built through `buildChild`, which returns a real `<BlokNode/>`
 * element, so React context declared by the parent (a Radix `Tabs.Root`, a
 * `Select.Root`) reaches the child bloks normally. That is what lets the
 * catalog mirror shadcn's part-by-part composition without any extra runtime
 * plumbing.
 */
export const renderChildList = (
  childList: unknown,
  buildChild: ChildBuilder,
): React.ReactNode => {
  if (!Array.isArray(childList)) {
    return null;
  }

  return childList.map((item, index) => {
    if (typeof item === 'string') {
      return <React.Fragment key={`${item}-${index}`}>{buildChild(item)}</React.Fragment>;
    }

    if (item && typeof item === 'object' && 'id' in item) {
      const child = item as Extract<ChildDescriptor, {id: string}>;
      return (
        <React.Fragment key={`${child.id}-${index}`}>
          {buildChild(child.id, child.basePath)}
        </React.Fragment>
      );
    }

    return null;
  });
};

/** Renders a `children`/`content` prop that may be plain text instead of ids. */
export const renderContent = (
  content: unknown,
  buildChild: ChildBuilder,
): React.ReactNode => {
  if (typeof content === 'string' || typeof content === 'number') {
    return content;
  }

  if (Array.isArray(content)) {
    return renderChildList(content, buildChild);
  }

  if (content && typeof content === 'object' && 'id' in content) {
    const child = content as Extract<ChildDescriptor, {id: string}>;
    return buildChild(child.id, child.basePath);
  }

  return null;
};
