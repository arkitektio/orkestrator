// @vitest-environment jsdom
import {describe, expect, it} from 'vitest';
import {loadPreview, previewCacheKey, savePreview, PREVIEW_RENDERER_VERSION} from './previewCache';

/** jsdom has no IndexedDB: these run the in-memory side, as `logoCache.test.ts` does. */
describe('the preview cache', () => {
  const snapshot = (html: string) => ({html, width: 800, height: 500});

  it('serves a preview only for the hash it was drawn from', async () => {
    await savePreview('blok-1', 'aaa', snapshot('<div>a</div>'));

    expect(await loadPreview('blok-1', 'aaa')).toEqual(snapshot('<div>a</div>'));
    expect(await loadPreview('blok-1', 'bbb')).toBeNull();
    expect(await loadPreview('blok-2', 'aaa')).toBeNull();
  });

  it('keeps one preview per blok: a new hash replaces the old one', async () => {
    await savePreview('blok-3', 'old', snapshot('<div>old</div>'));
    await savePreview('blok-3', 'new', snapshot('<div>new</div>'));

    expect(await loadPreview('blok-3', 'new')).toEqual(snapshot('<div>new</div>'));
    expect(await loadPreview('blok-3', 'old')).toBeNull();
  });

  it('keys a preview by the renderer that drew it too', () => {
    expect(previewCacheKey('abc')).toBe(`abc:v${PREVIEW_RENDERER_VERSION}`);
  });
});
