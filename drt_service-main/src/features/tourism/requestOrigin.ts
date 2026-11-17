const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Permit configured browser-facing center origins, retaining the local center rule. */
export function allowCenterRequest(origin: string | null, host: string, protocol: string, configuredOrigins = ''): boolean {
  if (allowTourismRequest(origin, host, protocol)) return true;
  if (!origin) return false;
  try {
    const source = new URL(origin);
    const target = new URL(`${protocol}//${host}`);
    const clean = (url: URL) => ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      && url.pathname === '/' && !url.search && !url.hash;
    if (!clean(source) || !clean(target) || source.origin !== target.origin) return false;
    return configuredOrigins.split(',').some(value => {
      try { const allowed = new URL(value.trim()); return clean(allowed) && allowed.origin === source.origin; }
      catch { return false; }
    });
  } catch { return false; }
}

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
