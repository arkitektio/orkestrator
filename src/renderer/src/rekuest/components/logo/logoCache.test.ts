// @vitest-environment jsdom
import {describe, expect, it} from 'vitest';
import {loadLogo, logoCacheKey, saveLogo, serializeDrawing, svgDataUrl, LOGO_RENDERER_VERSION} from './logoCache';

/**
 * jsdom has no IndexedDB, so these run the in-memory side of the cache and its
 * fallbacks: a store that cannot open is a miss, and a save still serves this
 * window.
 */
describe('the logo cache', () => {
  it('serves a drawing only for the hash it was drawn from', async () => {
    await saveLogo('blok-1', 'aaa', '<svg/>');

    expect(await loadLogo('blok-1', 'aaa')).toBe('<svg/>');
    expect(await loadLogo('blok-1', 'bbb')).toBeNull();
    expect(await loadLogo('blok-2', 'aaa')).toBeNull();
  });

  it('keeps one drawing per blok: a new hash replaces the old one', async () => {
    await saveLogo('blok-3', 'old', '<svg id="old"/>');
    await saveLogo('blok-3', 'new', '<svg id="new"/>');

    expect(await loadLogo('blok-3', 'new')).toBe('<svg id="new"/>');
    expect(await loadLogo('blok-3', 'old')).toBeNull();
  });

  it('keys a drawing by the renderer that drew it too', () => {
    expect(logoCacheKey('abc')).toBe(`abc:v${LOGO_RENDERER_VERSION}`);
  });

  it('keeps the svg a blok drew, but not one with a failed node in it', () => {
    const drawn = document.createElement('span');
    drawn.innerHTML = '<svg data-blok-svg="logo" viewBox="0 0 2 2"><circle r="1"></circle></svg>';
    const svg = serializeDrawing(drawn);
    expect(svg?.match(/xmlns=/g)).toHaveLength(1);
    // What an <img> decodes: well-formed XML in the SVG namespace.
    const parsed = new DOMParser().parseFromString(svg ?? '', 'image/svg+xml');
    expect(parsed.querySelector('parsererror')).toBeNull();
    expect(parsed.documentElement.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(svg).toContain('<circle r="1"');
    expect(svgDataUrl(svg ?? '')).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);

    const broken = document.createElement('span');
    broken.innerHTML = '<svg data-blok-svg="logo"><g data-blok-error="x"></g></svg>';
    expect(serializeDrawing(broken)).toBeNull();
    expect(serializeDrawing(document.createElement('span'))).toBeNull();
  });
});
