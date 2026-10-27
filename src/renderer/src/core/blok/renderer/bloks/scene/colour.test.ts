import {describe, expect, it} from 'vitest';
import {FALLBACK_SCENE_RGB, resolveThemeColour, type ThemeColourReader} from './colour';

const reader = (variables: Readonly<Record<string, string>>, painted: string | null = 'rgb(1, 2, 3)'): ThemeColourReader & {asked: string[]} => {
  const asked: string[] = [];
  return {
    asked,
    variable: role => {
      asked.push(role);
      return variables[role] ?? '';
    },
    paint: css => (css.startsWith('oklch(') ? painted : null),
  };
};

describe('resolveThemeColour', () => {
  it('paints a theme role as rgb', () => {
    const theme = reader({info: ' oklch(0.6 0.1 240) '});
    expect(resolveThemeColour('info', theme)).toBe('rgb(1, 2, 3)');
    expect(theme.asked).toEqual(['info']);
  });

  it('resolves every kind of role the scene props take', () => {
    const theme = reader({brand: 'oklch(0.5 0.2 30)', 'chart-2': 'oklch(0.7 0.1 120)', destructive: 'oklch(0.6 0.2 25)'});
    for (const role of ['brand', 'chart-2', ' destructive']) expect(resolveThemeColour(role, theme)).toBe('rgb(1, 2, 3)');
  });

  it('resolves the spectral roles and their soft variants', () => {
    const theme = reader({'spectrum-green': 'oklch(0.64 0.15 145)', 'spectrum-red-soft': 'oklch(0.95 0.05 27)'});
    expect(resolveThemeColour('spectrum-green', theme)).toBe('rgb(1, 2, 3)');
    expect(resolveThemeColour('spectrum-red-soft', theme)).toBe('rgb(1, 2, 3)');
    expect(theme.asked).toEqual(['spectrum-green', 'spectrum-red-soft']);
  });

  it('falls back when the theme has no such variable or it cannot be painted', () => {
    expect(resolveThemeColour('success', reader({}))).toBe(FALLBACK_SCENE_RGB);
    expect(resolveThemeColour('success', reader({}), '#ff3b30')).toBe('#ff3b30');
    expect(resolveThemeColour('success', reader({success: 'oklch(0.6 0.1 150)'}, null))).toBe(FALLBACK_SCENE_RGB);
  });

  it('passes a value that is no role through as written', () => {
    const theme = reader({red: 'oklch(0.6 0.2 25)'});
    expect(resolveThemeColour('#ff0000', theme)).toBe('#ff0000');
    expect(resolveThemeColour('red', theme)).toBe('red');
    expect(theme.asked).toEqual([]);
  });
});
