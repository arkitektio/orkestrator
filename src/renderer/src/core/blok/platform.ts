import {configureBlokPlatform} from '@arkitektio/bsx/runtime';
import {describeError, toast} from '@/core/notify';
import {useTheme} from '@/core/settings/theme/ThemeProvider';
import {useKeepTabLive} from '@/core/tabs/keepLive';
import appTheme from '@/theme.css?raw';
import {defaultBlokCatalog} from './catalog';

/**
 * What the bloks get from this app (`@arkitektio/bsx` asks once, before the first
 * render): its toasts and error sentences, the hook that keeps a hidden tab's GPU
 * canvas alive, the light/dark switch, the Tailwind theme a blok's classes are
 * compiled against (so `bg-muted`, `dark:` and `glass:` mean what they mean in
 * the app), and the catalog every renderer draws from. Imported first by `main.tsx`.
 */
configureBlokPlatform({
  toast,
  describeError,
  useKeepLive: useKeepTabLive,
  useColorScheme: () => useTheme().resolvedTheme,
  tailwindTheme: appTheme,
  catalog: defaultBlokCatalog,
});
