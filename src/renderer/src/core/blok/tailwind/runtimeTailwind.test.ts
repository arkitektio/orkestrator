// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from 'vitest';

import {loadVocabulary} from '../spec/vocabulary';
import {ensureBlokClasses, resetBlokTailwind, runtimeVariants} from './runtimeTailwind';

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

  it("compiles the status roles and every custom variant the blok language publishes", async () => {
    const variants = loadVocabulary().theme.customVariants;
    await ensureBlokClasses([
      'bg-success-soft',
      'text-success-foreground',
      'border-warning/40',
      'text-info',
      'data-busy:opacity-60',
      'data-[busy]:opacity-60',
      'data-stale:grayscale',
      ...variants.filter(variant => variant !== 'dark').map(variant => `${variant}:underline`),
    ]);
    const css = sheet();
    expect(css).toMatch(/\.bg-success-soft\s*\{[^}]*var\(--success-soft\)/);
    expect(css).toMatch(/\.text-success-foreground\s*\{[^}]*var\(--success-foreground\)/);
    expect(css).toContain('.text-info');
    expect(css).toContain('data-busy\\:opacity-60');
    expect(css).toContain('data-\\[busy\\]\\:opacity-60');
    expect(css).toContain('[data-busy]');
    expect(css).toContain('[data-stale]');
    for (const variant of variants.filter(name => name !== 'dark')) {
      expect(css).toContain(`.${variant}\\:underline`);
    }
    expect(css).toContain('[data-state="open"]');
  });

  it('compiles every spectral role and its soft variant', async () => {
    const roles = loadVocabulary().theme.spectralRoles;
    await ensureBlokClasses([...roles.map(role => `bg-${role}`), ...roles.map(role => `text-${role}-soft`), 'border-spectrum-green/40']);
    const css = sheet();
    for (const role of roles) {
      expect(css).toMatch(new RegExp(`\\.bg-${role}\\s*\\{[^}]*var\\(--${role}\\)`));
      expect(css).toMatch(new RegExp(`\\.text-${role}-soft\\s*\\{[^}]*var\\(--${role}-soft\\)`));
    }
    expect(css).toContain('border-spectrum-green\\/40');
  });

  it("takes from shadcn only what the app's theme leaves out", () => {
    const rules = runtimeVariants();
    expect(rules).toContain('@custom-variant data-open');
    expect(rules).not.toContain('@custom-variant data-busy');
    expect(rules).not.toContain('@custom-variant dark');
  });
});
