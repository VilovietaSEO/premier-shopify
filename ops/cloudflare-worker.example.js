const DEFAULT_OPS_ORIGIN = 'https://ops.example.com';

function shouldProxy(pathname) {
  return pathname === '/llms.txt' ||
    pathname === '/a/llms.txt' ||
    pathname.endsWith('/llms.txt') ||
    pathname.startsWith('/crm/') ||
    pathname.startsWith('/revio/');
}

export default {
  async fetch(request, env = {}) {
    const incoming = new URL(request.url);
    const opsOrigin = env.OPS_ORIGIN || DEFAULT_OPS_ORIGIN;

    if (!shouldProxy(incoming.pathname)) {
      return new Response('Not found', {
        status: 404,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
        },
      });
    }

    const target = new URL(`${incoming.pathname}${incoming.search}`, opsOrigin);
    const headers = new Headers(request.headers);
    headers.set('x-forwarded-host', incoming.host);
    headers.set('x-forwarded-proto', incoming.protocol.replace(':', ''));

    return fetch(new Request(target, {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual',
    }));
  },
};
