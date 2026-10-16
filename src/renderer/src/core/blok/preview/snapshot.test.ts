// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from 'vitest';
import {captureSnapshot, placeSnapshot, sanitizeSnapshot, SNAPSHOT_ID_TOKEN} from './snapshot';

const parse = (html: string) => {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
};

describe('cleaning a snapshot', () => {
  it('drops everything that runs, loads or navigates', () => {
    const cleaned = sanitizeSnapshot(
      '<div onclick="steal()" class="p-2"><script>steal()</script><iframe src="https://x"></iframe>' +
        '<a href="javascript:steal()">link</a><img src="javascript:steal()"><img src="https://cdn/x.png">' +
        '<img src="data:image/webp;base64,AAAA"><form action="https://x"><button formaction="https://x">b</button></form>' +
        '<style>body{}</style><svg><set attributeName="href" to="javascript:x"></set></svg></div>',
    );
    const host = parse(cleaned ?? '');

    expect(host.querySelector('script, iframe, style, set')).toBeNull();
    expect(host.querySelector('div')?.getAttribute('onclick')).toBeNull();
    expect(host.querySelector('div')?.className).toBe('p-2');
    expect(host.querySelector('a')?.hasAttribute('href')).toBe(false);
    expect(Array.from(host.querySelectorAll('img')).map(image => image.getAttribute('src'))).toEqual([
      null,
      'https://cdn/x.png',
      'data:image/webp;base64,AAAA',
    ]);
    expect(host.querySelector('form')?.hasAttribute('action')).toBe(false);
    expect(host.querySelector('button')?.hasAttribute('formaction')).toBe(false);
  });

  it('moves every id and its references under the token, and places them under a prefix', () => {
    const cleaned =
      sanitizeSnapshot(
        '<svg><defs><linearGradient id="recharts1-grad"></linearGradient><clipPath id="clip"></clipPath></defs>' +
          '<rect fill="url(#recharts1-grad)" clip-path="url(\'#clip\')"></rect><use href="#clip"></use>' +
          '<rect fill="url(#elsewhere)"></rect></svg>',
      ) ?? '';
    expect(cleaned).not.toContain('recharts1-grad');

    const host = parse(placeSnapshot(cleaned, 'cardA'));
    const [first, second] = Array.from(host.querySelectorAll('rect'));
    const gradient = host.querySelector('linearGradient')?.id;
    expect(gradient?.startsWith('cardA-')).toBe(true);
    expect(first.getAttribute('fill')).toBe(`url(#${gradient})`);
    expect(first.getAttribute('clip-path')).toBe(`url(#${host.querySelector('clipPath')?.id})`);
    expect(host.querySelector('use')?.getAttribute('href')).toBe(`#${host.querySelector('clipPath')?.id}`);
    // A reference to nothing the snapshot declares is left as it is.
    expect(second.getAttribute('fill')).toBe('url(#elsewhere)');
    expect(host.innerHTML).not.toContain(SNAPSHOT_ID_TOKEN);
  });

  it('keeps nothing when nothing is left', () => {
    expect(sanitizeSnapshot('<script>x</script>')).toBeNull();
  });
});

describe('capturing a snapshot', () => {
  afterEach(() => vi.restoreAllMocks());

  it('bakes canvases into images and freezes what controls show', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback) {
      callback(new Blob(['x'], {type: 'image/webp'}));
    });
    const container = parse('<div><canvas class="absolute"></canvas><input type="text"><input type="checkbox"></div>');
    const [text, box] = Array.from(container.querySelectorAll('input'));
    text.value = 'typed';
    box.checked = true;

    const snapshot = await captureSnapshot(container);
    const host = parse(snapshot?.html ?? '');

    expect(host.querySelector('canvas')).toBeNull();
    expect(host.querySelector('img')?.getAttribute('src')).toMatch(/^data:image\/webp;base64,/);
    expect(host.querySelector('img')?.className).toBe('absolute');
    expect(host.querySelector('input[type=text]')?.getAttribute('value')).toBe('typed');
    expect(host.querySelector('input[type=checkbox]')?.hasAttribute('checked')).toBe(true);
  });

  it('keeps no drawing with a failed node in it, and none of nothing', async () => {
    expect(await captureSnapshot(parse('<div><div data-blok-error="x">failed</div></div>'))).toBeNull();
    expect(await captureSnapshot(document.createElement('div'))).toBeNull();
  });
});
