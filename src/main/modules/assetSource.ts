import net from 'net';

/**
 * Which URLs an asset may be fetched from.
 *
 * The request is made from an admin's machine, usually inside the lab's
 * network, to a URL an agent declared as the source of an asset. So a source is https, carries
 * no credentials, and an address that is private to this network is refused
 * until the admin, having seen the host, says to go ahead.
 */

export type SourceRefusal = 'not_https' | 'has_credentials' | 'private_host' | 'bad_url';

export class SourceRefused extends Error {
  constructor(
    readonly code: SourceRefusal,
    message: string,
  ) {
    super(message);
    this.name = 'SourceRefused';
  }
}

const PRIVATE_NAMES = /(^|\.)(localhost|local|internal|lan|home|intranet)$/i;

const ipv4IsPrivate = (address: string): boolean => {
  const [a, b] = address.split('.').map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    (a === 100 && b >= 64 && b <= 127)
  );
};

/** Whether an IP literal is loopback, link-local or in a private range. */
export const addressIsPrivate = (address: string): boolean => {
  if (net.isIPv4(address)) return ipv4IsPrivate(address);
  if (!net.isIPv6(address)) return false;
  const lower = address.toLowerCase();
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return ipv4IsPrivate(mapped[1]);
  return lower === '::1' || lower === '::' || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower);
};

/**
 * Parse and check a source URL. Returns it when it may be requested; throws
 * `SourceRefused` otherwise. `addresses` is what its host resolves to.
 */
export const checkSource = (
  raw: string,
  addresses: readonly string[],
  allowPrivate: boolean,
): URL => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SourceRefused('bad_url', `'${raw}' is not a URL.`);
  }
  if (url.protocol !== 'https:') {
    throw new SourceRefused('not_https', `An asset is fetched over https, not ${url.protocol.replace(':', '')}.`);
  }
  if (url.username || url.password) {
    throw new SourceRefused('has_credentials', 'An asset source may not carry a user name or password.');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const isPrivate =
    PRIVATE_NAMES.test(host) || addressIsPrivate(host) || addresses.some(addressIsPrivate) || !host.includes('.');
  if (isPrivate && !allowPrivate) {
    throw new SourceRefused('private_host', `${url.hostname} is an address inside this network.`);
  }
  return url;
};
