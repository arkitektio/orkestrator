import { useMarkImage } from "@/kabinet/lib/marks/useMarkImage";
import { cn } from "@/core/util/utils";
import { useState } from "react";
import { hueFor, type AppIdentity } from "../appIdentity";
import { KabinetBlokLogo } from "./logo/KabinetBlokLogo";

const brandStop = (lightness: number, chroma: number, shift: number, alpha: number) =>
  `oklch(${lightness.toFixed(3)} calc(var(--brand-chroma) * ${chroma.toFixed(3)}) calc(var(--brand-hue) + ${shift.toFixed(1)}) / ${alpha})`;

/**
 * Soft two-stop gradient for an app, on the brand hue so it repaints with the
 * theme. `seed` (`hueFor`, 0–360) picks the app's step within it: lightness and
 * chroma vary per app, the hue only by a few degrees. Both stops stay dark
 * enough for the white initials in either mode.
 */
export const appGradient = (seed: number, alpha = 1) => {
  const t = (((seed % 360) + 360) % 360) / 360;
  const lightness = 0.46 + 0.12 * ((t * 3) % 1);
  const chroma = 0.55 + 0.45 * ((t * 7) % 1);
  const shift = (t - 0.5) * 24;
  return `linear-gradient(135deg, ${brandStop(lightness + 0.06, chroma, shift, alpha)}, ${brandStop(lightness - 0.1, chroma * 0.85, shift + 8, alpha)})`;
};

/**
 * An app's icon, in four tiers.
 *
 * First the LOGO blok the app brings (`KabinetBlokLogo`): what the app itself
 * says it looks like, drawn once and kept, so a grid of them renders no bloks.
 *
 * Most registered apps have no logo at all — `App` carries none, and the
 * release/flavour chain `logoFor` walks comes back null for all but a few — so
 * the fallback is what you actually see. A generated mark (`@/lib/marks`) gives
 * each of those a distinct, stable identity: its shape and colour from
 * `embedding` where the backend has indexed the app, and from the identifier's
 * hash where it has not.
 *
 * A real logo still wins. The initials remain as the last tier, for when there
 * is no WebGL to draw a mark with.
 *
 * `size` is the icon's rendered CSS size and drives both the resolution the
 * mark is rasterised at and whether it keeps its orbiting extras; pass it
 * whenever `className` changes the default `size-14`.
 *
 * This is the rasterised path, safe to mount per row. The one mark on a detail
 * page can use `AppMarkCanvas` instead and be live.
 */
export const AppIcon = ({
  app,
  className,
  size = 56,
}: {
  app: AppIdentity;
  className?: string;
  size?: number;
}) => {
  const [failed, setFailed] = useState(false);
  const initials = app.name
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("");

  const showBlok = !!app.logoBlok;
  const showLogo = !showBlok && !!app.logo && !failed;
  const { src: mark } = useMarkImage(
    showBlok || showLogo
      ? null
      : { name: app.name, identifier: app.identifier, embedding: app.embedding, size },
  );
  const hue = app.hue ?? hueFor(app.identifier);

  if (showBlok) {
    return (
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl",
          "size-14 text-lg",
          className,
        )}
      >
        <KabinetBlokLogo blok={app.logoBlok} className="size-full rounded-[inherit]" />
      </div>
    );
  }

  if (showLogo) {
    return (
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl",
          "shadow-sm ring-1 ring-border",
          "size-14 text-lg",
          className,
        )}
      >
        <img
          src={app.logo ?? undefined}
          alt=""
          className="size-full bg-background object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  // A grid's marks arrive over several frames as the offscreen queue drains, so
  // the tile holds the gradient and initials underneath and the mark crosses
  // over it. Swapping outright would pop each icon in turn as the page settles.
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl",
        "size-14 text-lg",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-[inherit]",
          "shadow-sm ring-1 ring-border transition-opacity duration-300",
          // A mark is a lit 3D object on transparency: it carries its own
          // colour and shading, so the tinted, ringed tile that frames a flat
          // logo only fights with it.
          mark ? "opacity-0" : "opacity-100",
        )}
        style={{ background: appGradient(hue) }}
      >
        <span className="font-semibold tracking-tight text-white drop-shadow-sm">
          {initials}
        </span>
      </div>
      {mark && (
        <img
          src={mark}
          alt=""
          className="relative size-full animate-in object-contain fade-in duration-300"
        />
      )}
    </div>
  );
};
