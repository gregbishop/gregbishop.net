// The site is static files. This runs in front of its terminal-capable routes
// (see run_worker_first in wrangler.jsonc) so a terminal gets colored text
// and a browser gets the page. `curl www.gregbishop.net` prints the home
// screen; `/posts` prints the post list, `/about` the bio, and `/melampus` the project.

const TEXT = { '/': '/index.txt', '/posts': '/posts.txt', '/posts/': '/posts.txt', '/about': '/about.txt', '/about/': '/about.txt', '/melampus': '/melampus.txt', '/melampus/': '/melampus.txt' };
const CLI = /\b(curl|wget|httpie|http-client|fetch|libcurl)\b/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const target = TEXT[url.pathname];
    if (!target) return env.ASSETS.fetch(request);

    const ua = request.headers.get('user-agent') || '';
    const accept = request.headers.get('accept') || '';
    const wantsText = CLI.test(ua) || (accept.includes('text/plain') && !accept.includes('text/html'));

    if (wantsText) {
      const res = await env.ASSETS.fetch(new Request(new URL(target, url.origin), { method: 'GET' }));
      if (res.ok) {
        return new Response(res.body, {
          status: 200,
          headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'public, max-age=300',
            'vary': 'user-agent, accept',
          },
        });
      }
    }
    return env.ASSETS.fetch(request);
  },
};
