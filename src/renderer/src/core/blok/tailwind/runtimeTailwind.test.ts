// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from 'vitest';

import {ensureBlokClasses, resetBlokTailwind} from './runtimeTailwind';

afterEach(resetBlokTailwind);

const sheet = () => document.head.querySelector('style[data-blok-tailwind]')?.textContent ?? '';

describe('runtime Tailwind for bloks', () => {
  it("compiles a blok's classes with the app's tokens and variants", async () => {
    await ensureBlokClasses(['bg-muted', 'glass:bg-transparent', 'grid-cols-[3fr_1fr]', 'dark:text-primary']);
    const css = sheet();
    // `@theme inline`: the utility reads the value the app defines, as in the build.
    expect(css).toMatch(/\.bg-muted\s*\{[^}]*var\(--muted\)/);
    expect(css).toContain('.rail-glass');
    expect(css).toMatch(/grid-template-columns:\s*3fr 1fr/);
    expect(css).toContain('.dark');
    // No second preflight: base styles are the build's.
    expect(css).not.toContain('box-sizing: border-box');
  });

  it('ignores what is no class, and compiles a class once', async () => {
    await ensureBlokClasses(['Loading', 'p-4']);
    expect(sheet()).toContain('.p-4');
    expect(sheet()).not.toContain('Loading');

    const before = sheet();
    const write = vi.spyOn(document.head.querySelector('style[data-blok-tailwind]')!, 'textContent', 'set');
    await ensureBlokClasses(['p-4']);
    expect(write).not.toHaveBeenCalled();
    expect(sheet()).toBe(before);
  });

  it('keeps what earlier calls compiled', async () => {
    await ensureBlokClasses(['p-4']);
    await ensureBlokClasses(['m-9']);
    expect(sheet()).toContain('.p-4');
    expect(sheet()).toContain('.m-9');
  });
});
