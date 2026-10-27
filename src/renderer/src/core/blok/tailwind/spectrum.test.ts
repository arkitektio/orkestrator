import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {loadVocabulary} from '../spec/vocabulary';

/**
 * The spectral roles are drawn exactly as the vocabulary's `theme.spectrum`
 * says: each token's formula is generated from its table and looked up in the
 * stylesheets (values in index.css `:root` and `.dark`, Tailwind colours and
 * nothing else in theme.css, pens beside the other `--logo-*` tokens).
 */

/** The declarations of the top-level rule `selector` that declares `token`. */
const block = (css: string, selector: string, token: string): string => {
  const rules = css.split(/\n(?=\S)/).filter(rule => rule.startsWith(`${selector} {`) && rule.includes(token));
  expect(rules, `${selector} declaring ${token} in index.css`).toHaveLength(1);
  return rules[0];
};

// Read from disk: the test setup stubs a `?raw` import of index.css.
const stylesheet = (name: string): string => readFileSync(new URL(`../../../${name}`, import.meta.url), 'utf-8');
const appIndex = stylesheet('index.css');
const appTheme = stylesheet('theme.css');

const fill = (template: string, values: Readonly<Record<string, number>>): string =>
  template.replace(/<(light|dark|hue)>/g, (_token, name: string) => String(values[name]));

describe('the spectral roles', () => {
  const {spectrum, spectralRoles, colourRoles, logoPens} = loadVocabulary().theme;
  const root = block(appIndex, ':root', '--spectrum-chroma');
  const dark = block(appIndex, '.dark', '--spectrum-violet');

  it('are the bands of the table, in its order', () => {
    expect(spectralRoles).toEqual(spectrum.bands.map(band => `spectrum-${band.band}`));
    expect(spectrum.bands).toHaveLength(7);
  });

  it('take their chroma from the brand', () => {
    expect(root).toContain(`${spectrum.chroma};`);
    expect(spectrum.chroma).toContain('var(--brand-chroma)');
  });

  it.each(spectrum.bands.map(band => [band.band, band] as const))('%s is drawn by its formula in light and dark', (_name, band) => {
    const values = {light: band.light, dark: band.dark, hue: band.hue};
    expect(root).toContain(`--spectrum-${band.band}: ${fill(spectrum.role.light, values)};`);
    expect(root).toContain(`--spectrum-${band.band}-soft: ${fill(spectrum.soft.light, values)};`);
    expect(dark).toContain(`--spectrum-${band.band}: ${fill(spectrum.role.dark, values)};`);
    expect(dark).toContain(`--spectrum-${band.band}-soft: ${fill(spectrum.soft.dark, values)};`);
    expect(appTheme).toContain(`--color-spectrum-${band.band}: var(--spectrum-${band.band});`);
    expect(appTheme).toContain(`--color-spectrum-${band.band}-soft: var(--spectrum-${band.band}-soft);`);
    for (const mode of [root, dark]) expect(mode).toContain(`--logo-spectrum-${band.band}: var(--spectrum-${band.band});`);
  });

  it('are colour roles (with -soft) and logo pens (without)', () => {
    for (const role of spectralRoles) {
      expect(colourRoles).toContain(role);
      expect(colourRoles).toContain(`${role}-soft`);
      expect(logoPens).toContain(role);
      expect(logoPens).not.toContain(`${role}-soft`);
    }
  });
});
