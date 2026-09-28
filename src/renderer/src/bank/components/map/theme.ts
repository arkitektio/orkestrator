import { useEffect, useState } from "react";

/**
 * The app's colour tokens as `rgb()` strings for MapLibre paint properties,
 * which cannot read CSS variables and do not parse oklch. A token is resolved
 * by painting it onto a 1×1 canvas and reading the pixel back.
 */
export type MapThemeColors = {
  primary: string;
  primaryForeground: string;
  background: string;
  foreground: string;
  mutedForeground: string;
};

const TOKENS: Record<keyof MapThemeColors, string> = {
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  background: "--background",
  foreground: "--foreground",
  mutedForeground: "--muted-foreground",
};

const FALLBACK: MapThemeColors = {
  primary: "rgb(79, 70, 229)",
  primaryForeground: "rgb(255, 255, 255)",
  background: "rgb(255, 255, 255)",
  foreground: "rgb(10, 10, 10)",
  mutedForeground: "rgb(115, 115, 115)",
};

let canvas: HTMLCanvasElement | null = null;

const toRgb = (color: string): string | null => {
  canvas ??= document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || !color) return null;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#000";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
};

const resolve = (): MapThemeColors => {
  const style = getComputedStyle(document.documentElement);
  const colors = { ...FALLBACK };
  for (const key of Object.keys(TOKENS) as (keyof MapThemeColors)[]) {
    const value = style.getPropertyValue(TOKENS[key]).trim();
    // A var() token (`--popover: var(--card)`) comes back already substituted.
    colors[key] = toRgb(value) ?? FALLBACK[key];
  }
  return colors;
};

/** The theme tokens as rgb, kept in step with theme and brand-colour changes on `<html>`. */
export const useMapThemeColors = (): MapThemeColors => {
  const [colors, setColors] = useState<MapThemeColors>(() => (typeof document === "undefined" ? FALLBACK : resolve()));
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setColors((prev) => {
          const next = resolve();
          return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
        }),
      );
    };
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
    update();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  return colors;
};
