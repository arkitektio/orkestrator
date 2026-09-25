import {controlBlokComponents} from './control';
import {dataBlokComponents} from './data';
import {feedbackBlokComponents} from './feedback';
import {formBlokComponents} from './forms';
import {htmlBlokComponents} from './html';
import {iconBlokComponents} from './icons';
import {layoutBlokComponents} from './layout';
import {navigationBlokComponents} from './navigation';
import {overlayBlokComponents} from './overlays';
import {typographyBlokComponents} from './typography';

/**
 * The shadcn/HTML half of the catalog.
 *
 * These used to live in one 1090-line `Primitives.tsx`; they are now grouped
 * by family, and this array is what `catalog.tsx` registers.
 */
export const shadcnComposableComponents = [
  ...layoutBlokComponents,
  ...typographyBlokComponents,
  ...htmlBlokComponents,
  ...formBlokComponents,
  ...overlayBlokComponents,
  ...navigationBlokComponents,
  ...feedbackBlokComponents,
  ...dataBlokComponents,
  ...iconBlokComponents,
  ...controlBlokComponents,
];

export {
  controlBlokComponents,
  dataBlokComponents,
  feedbackBlokComponents,
  formBlokComponents,
  htmlBlokComponents,
  iconBlokComponents,
  layoutBlokComponents,
  navigationBlokComponents,
  overlayBlokComponents,
  typographyBlokComponents,
};
