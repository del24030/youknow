const confirmation = 'You’re on the list. We’ll email you when early access opens.';
const retry = 'We couldn’t save your request. Please try again.';

function reply(request, message, status) {
  const spanish = new URL(request.url).searchParams.get('lang') === 'es';
  const translations = {
    [confirmation]: 'Ya estás en la lista. Te enviaremos un correo cuando abra el acceso anticipado.',
    [retry]: 'No pudimos guardar tu solicitud. Inténtalo de nuevo.',
    'Please enter a valid email address.': 'Ingresa una dirección de correo electrónico válida.',
  };
  if (spanish) message = translations[message];
  const title = spanish ? 'Acceso anticipado a Kall' : 'Kall early access';
  const back = spanish ? 'Volver a Kall' : 'Back to Kall';
  const home = spanish ? '/es/' : '/';
  const headers = { 'Cache-Control': 'no-store' };
  if (request.headers.get('Accept')?.includes('application/json')) {
    return Response.json({ message }, { status, headers });
  }
  headers['Content-Type'] = 'text/html; charset=utf-8';
  return new Response(
    `<!doctype html><html lang="${spanish ? 'es' : 'en'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><main><h1>${title}</h1><p>${message}</p><a href="${home}#early-access">${back}</a></main></html>`,
    { status, headers }
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/early-access') return env.ASSETS.fetch(request);
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return reply(request, retry, 403);
    if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) {
      return reply(request, 'Please enter a valid email address.', 415);
    }

    const reader = request.body?.getReader();
    const bytes = new Uint8Array(2048);
    let length = 0;
    if (reader) {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (length + value.length > bytes.length) {
          await reader.cancel();
          return reply(request, 'Please enter a valid email address.', 413);
        }
        bytes.set(value, length);
        length += value.length;
      }
    }
    const fields = new URLSearchParams(new TextDecoder().decode(bytes.subarray(0, length)));
    const email = (fields.get('email') ?? '').trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) {
      return reply(request, 'Please enter a valid email address.', 400);
    }

    try {
      await env.DB.prepare('INSERT INTO early_access_requests (email) VALUES (?) ON CONFLICT(email) DO NOTHING')
        .bind(email).run();
    } catch {
      return reply(request, retry, 503);
    }
    return reply(request, confirmation, 200);
  }
};
