import { RekuestBlokPreview, type PreviewedBlok } from "@/rekuest/components/preview/RekuestBlokPreview";

/**
 * What a blok looks like, on a blok's card: a small screen set INTO the card,
 * under its name, the way a data card holds its picture. A blok is an
 * interface, so this is the one thing its card shows that no other card has;
 * it is never the card's background, where it fought the text laid over it.
 */
export const BlokScreen = ({ blok, agents }: { blok: PreviewedBlok; agents?: ReadonlyMap<string, string> }) => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg border border-foreground/10 bg-background shadow-sm"
  >
    <RekuestBlokPreview blok={blok} agents={agents} fit="cover" className="absolute inset-0 bg-transparent" />
  </div>
);
