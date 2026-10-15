// @vitest-environment jsdom
import {describe, expect, it} from 'vitest';
import {inlineDrawing, loadLogo, logoCacheKey, saveLogo, serializeDrawing, LOGO_RENDERER_VERSION} from './logoCache';

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
    // Well-formed XML in the SVG namespace, as `inlineDrawing` parses it back.
    const parsed = new DOMParser().parseFromString(svg ?? '', 'image/svg+xml');
    expect(parsed.querySelector('parsererror')).toBeNull();
    expect(parsed.documentElement.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(svg).toContain('<circle r="1"');

    const broken = document.createElement('span');
    broken.innerHTML = '<svg data-blok-svg="logo"><g data-blok-error="x"></g></svg>';
    expect(serializeDrawing(broken)).toBeNull();
    expect(serializeDrawing(document.createElement('span'))).toBeNull();
  });

  it('places a kept drawing inline under ids of its own', () => {
    const kept =
      '<svg xmlns="http://www.w3.org/2000/svg" data-blok-svg="logo" data-blok-prefix="svgr1">' +
      '<defs><linearGradient id="svgr1-sky"><stop offset="0" stop-color="var(--logo-brand)"/></linearGradient>' +
      '<clipPath id="svgr1-round"><circle r="1"/></clipPath></defs>' +
      '<g clip-path="url(#svgr1-round)"><rect fill="url(#svgr1-sky)" stroke="var(--logo-ink)" class="logo-anim logo-anim-spin"/></g></svg>';

    const placed = new DOMParser().parseFromString(inlineDrawing(kept, 'logoA') ?? '', 'image/svg+xml');
    expect(placed.querySelector('linearGradient')?.id).toBe('logoA-sky');
    expect(placed.querySelector('clipPath')?.id).toBe('logoA-round');
    expect(placed.querySelector('g')?.getAttribute('clip-path')).toBe('url(#logoA-round)');
    expect(placed.querySelector('rect')?.getAttribute('fill')).toBe('url(#logoA-sky)');
    expect(placed.querySelector('rect')?.getAttribute('stroke')).toBe('var(--logo-ink)');
    expect(placed.querySelector('rect')?.getAttribute('class')).toBe('logo-anim logo-anim-spin');
    expect(placed.documentElement.getAttribute('data-blok-prefix')).toBe('logoA');
  });

  it('places nothing a logo blok does not draw', () => {
    const svg = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" data-blok-svg="logo">${inner}</svg>`;
    expect(inlineDrawing(svg('<circle r="1"/>'), 'p')).not.toBeNull();
    expect(inlineDrawing(svg('<script>alert(1)</script>'), 'p')).toBeNull();
    expect(inlineDrawing(svg('<foreignObject><div/></foreignObject>'), 'p')).toBeNull();
    expect(inlineDrawing(svg('<circle r="1" onclick="alert(1)"/>'), 'p')).toBeNull();
    expect(inlineDrawing(svg('<image href="https://example.org/x.png"/>'), 'p')).toBeNull();
    expect(inlineDrawing('<div>not svg</div>', 'p')).toBeNull();
    expect(inlineDrawing('<svg', 'p')).toBeNull();
  });
});
