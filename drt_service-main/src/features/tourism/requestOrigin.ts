const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Compare against the browser-facing Host, not Next.js's internal URL.
 * Localhost/IP aliases are allowed only with the same protocol and port. */
export function allowTourismRequest(origin: string | null, host: string, protocol: string): boolean {
  try {
    const target = new URL(`${protocol}//${host}`);
    if (!loopback.has(target.hostname) || target.username || target.password || target.pathname !== '/' || target.search || target.hash) return false;
    if (!origin) return true;
    const source = new URL(origin);
    return loopback.has(source.hostname) && !source.username && !source.password
      && source.pathname === '/' && !source.search && !source.hash
      && source.protocol === target.protocol && source.port === target.port;
  } catch { return false; }
}
