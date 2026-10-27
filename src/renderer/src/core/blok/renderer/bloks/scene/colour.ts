import * as React from 'react';
import {loadVocabulary} from '../../../spec/vocabulary';

/** What a role paints as when the theme cannot be read (no document, no such variable, no canvas). */
export const FALLBACK_SCENE_RGB = '#38bdf8';

/** How a theme colour is found: the role's CSS variable, and a painter that turns any CSS colour into rgb. */
export type ThemeColourReader = {
  /** The value of `--<role>` on the document, or an empty string. */
  variable: (role: string) => string;
  /** The CSS colour as `rgb(r, g, b)`, or null when it cannot be painted. */
  paint: (css: string) => string | null;
};

const isRole = (value: string): boolean => loadVocabulary().theme.colourRoles.includes(value);

/**
 * A scene colour: a colour role of the theme (`brand`, `info`, `chart-2`),
 * resolved against the viewer's theme. The theme speaks oklch, which three.js
 * cannot parse, so the role is painted and read back as rgb. A value that is
 * no role (the validator warns about it) is passed through as written.
 */
export const resolveThemeColour = (value: string, reader: ThemeColourReader, fallback: string = FALLBACK_SCENE_RGB): string => {
  const role = value.trim();
  if (!isRole(role)) return value;
  const css = reader.variable(role).trim();
  if (!css) return fallback;
  return reader.paint(css) ?? fallback;
};

/** The reader of the live document: its computed variables, painted once on a 1x1 canvas. */
export const documentThemeReader: ThemeColourReader = {
  variable: role =>
    typeof document === 'undefined' ? '' : getComputedStyle(document.documentElement).getPropertyValue(`--${role}`),
  paint: css => {
    if (typeof document === 'undefined') return null;
    try {
      const context = document.createElement('canvas').getContext('2d', {willReadFrequently: true});
      if (!context) return null;
      context.fillStyle = css;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
      return `rgb(${r}, ${g}, ${b})`;
    } catch {
      return null;
    }
  },
};

/** {@link resolveThemeColour} against the document; undefined stays undefined (the prop was not given). */
export const themeColour = (value: string | undefined | null, fallback?: string): string | undefined =>
  value ? resolveThemeColour(value, documentThemeReader, fallback) : undefined;

/** A scene colour prop resolved once per value. */
export const useThemeColour = (value: string | undefined | null, fallback?: string): string | undefined =>
  React.useMemo(() => themeColour(value, fallback), [value, fallback]);
