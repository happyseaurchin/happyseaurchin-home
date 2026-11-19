/* How the plug service hosts a game here (ways:plug 8; lane plug.1, 27 Oct 2026), shared by scripts/plug-game.mjs, which
 * writes it, and scripts/smoke-games.mjs, which plays it in a browser before it is pushed.
 *
 *   hostedPage(html)          the page as handed in, with one line added at the top of its head: /games/bridge.js, the
 *                             storage it keeps inside its sandbox, standing in before anything else on the page runs
 *   framePage({ game, … })    /games/<game>: the frame it plays in, a sandboxed iframe (no allow-same-origin), so the
 *                             game runs in its own opaque origin and reads nothing this site keeps in the browser;
 *                             /games/frame.js keeps the game's own storage for it under games:<game>:
 * vercel.json gives /games/<game>/game the same sandbox as a header, with the beach and this site its only connections. */
export const SITE = 'https://happyseaurchin.com';
export const BRIDGE = '<script src="/games/bridge.js"></script>';
export const SANDBOX = 'allow-scripts allow-modals allow-forms allow-popups allow-popups-to-escape-sandbox allow-pointer-lock allow-top-navigation-by-user-activation';

export function hostedPage(html) {
  const head = /<head\b[^>]*>/i.exec(html);
  return head
    ? html.slice(0, head.index + head[0].length) + '\n' + BRIDGE + html.slice(head.index + head[0].length)
    : BRIDGE + '\n' + html;
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function framePage({ game, title, what, by }) {
  const t = esc(title || game), w = esc(what), b = esc(by);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${t} — a game on the beach</title>
<meta name="description" content="${w}">
<link rel="canonical" href="${SITE}/games/${game}">
<link rel="icon" href="/assets/torus.png" type="image/png">
<meta property="og:type" content="website">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${w}">
<meta property="og:url" content="${SITE}/games/${game}">
<meta name="twitter:card" content="summary">
<style>
  /* the frame of a game handed in at files:${game}${b ? ' by ' + b : ''} and plugged by the service (ways:plug 8): the game plays
     inside, sandboxed, in its own origin; this page keeps what the game keeps (games:${game}:) and nothing else */
  html, body { margin: 0; height: 100%; background: #f4f1ea; }
  @media (prefers-color-scheme: dark) { html, body { background: #101318; } }
  iframe { display: block; border: 0; width: 100%; height: 100%; height: 100dvh; }
  noscript p { font: 16px/1.5 system-ui, sans-serif; padding: 24px; }
</style>
</head>
<body>
<iframe id="game" title="${t}" sandbox="${SANDBOX}" allow="clipboard-write; web-share; fullscreen; autoplay; screen-wake-lock" referrerpolicy="no-referrer"></iframe>
<noscript><p>${t} is a game, and plays with JavaScript on. <a href="/games">The games played here</a>.</p></noscript>
<script src="/games/frame.js" data-game="${game}"></script>
</body>
</html>
`;
}
