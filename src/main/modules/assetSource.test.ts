import {describe, expect, it} from 'vitest';
import {addressIsPrivate, checkSource, SourceRefused} from './assetSource';

const refusal = (url: string, addresses: string[] = ['93.184.216.34'], allowPrivate = false) => {
  try {
    checkSource(url, addresses, allowPrivate);
  } catch (error) {
    if (error instanceof SourceRefused) return error.code;
    throw error;
  }
  return 'allowed';
};

describe('checkSource', () => {
  it('allows a public https URL', () => {
    expect(refusal('https://vendor.example/models/stage-v2.glb')).toBe('allowed');
  });

  it('refuses anything but https, and credentials in the URL', () => {
    expect(refusal('http://vendor.example/stage.glb')).toBe('not_https');
    expect(refusal('file:///etc/passwd')).toBe('not_https');
    expect(refusal('https://user:secret@vendor.example/stage.glb')).toBe('has_credentials');
    expect(refusal('not a url')).toBe('bad_url');
  });

  it('refuses a host inside this network until the admin allows it', () => {
    expect(refusal('https://192.168.1.20/stage.glb', [])).toBe('private_host');
    expect(refusal('https://[::1]/stage.glb', [])).toBe('private_host');
    expect(refusal('https://nas.local/stage.glb')).toBe('private_host');
    expect(refusal('https://jhnnsrs-lab/stage.glb')).toBe('private_host');
    expect(refusal('https://models.example.org/stage.glb', ['10.0.0.7'])).toBe('private_host');
    expect(refusal('https://models.example.org/stage.glb', ['10.0.0.7'], true)).toBe('allowed');
  });

  it('knows the private ranges', () => {
    for (const address of ['10.1.2.3', '172.16.0.1', '172.31.255.1', '192.168.0.1', '127.0.0.1', '169.254.1.1', '100.64.0.1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1']) {
      expect(addressIsPrivate(address), address).toBe(true);
    }
    for (const address of ['8.8.8.8', '172.32.0.1', '100.128.0.1', '2606:4700::1111']) {
      expect(addressIsPrivate(address), address).toBe(false);
    }
  });
});
