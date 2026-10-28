import { escapeHtml, formatDate, headTags, renderGiscus, pageLinks } from "../shared.js";

export const id = "minimal";
export const name = "Minimal";
export const description = "Monospace, no ornamentation, dense list of dated entries. Fastest to load, popular with a technical/developer audience.";

export const preview = `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
<rect width="120" height="80" fill="#FFFFFF"/>
<rect x="16" y="12" width="60" height="4" fill="#111"/>
<rect x="16" y="26" width="88" height="1" fill="#111"/>
<rect x="16" y="34" width="14" height="3" fill="#999"/>
<rect x="34" y="34" width="50" height="3" fill="#111"/>
<rect x="16" y="42" width="14" height="3" fill="#999"/>
<rect x="34" y="42" width="60" height="3" fill="#111"/>
<rect x="16" y="50" width="14" height="3" fill="#999"/>
<rect x="34" y="50" width="40" height="3" fill="#111"/>
</svg>`;

export const css = `
:root {
  --bg: #FFFFFF; --ink: #111111; --ink-soft: #767676; --accent: #0050C8; --rule: #111111;
  --mono: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--mono); line-height: 1.55; font-size: 15px; }
.wrap { max-width: 680px; margin: 0 auto; padding: 3rem 1.4rem 5rem; }
header.site-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid var(--rule); padding-bottom: 0.9rem; margin-bottom: 2rem; }
.site-title a { color: var(--ink); text-decoration: none; font-weight: 700; }
.site-title a::before { content: "~/"; color: var(--ink-soft); }
nav.site-nav a { color: var(--ink-soft); text-decoration: none; margin-left: 1rem; }
nav.site-nav a:hover { color: var(--accent); }

.post-list { list-style: none; margin: 0; padding: 0; }
.post-list li { display: flex; gap: 1rem; padding: 0.55rem 0; border-bottom: 1px dashed #ddd; }
.post-list time { color: var(--ink-soft); flex: 0 0 auto; }
.post-list h2 { font-size: 1em; font-weight: 400; margin: 0; }
.post-list h2 a { color: var(--ink); text-decoration: none; }
.post-list h2 a:hover { color: var(--accent); text-decoration: underline; }
.post-list p { display: none; }

article.post h1.title { font-size: 1.4rem; margin: 0 0 0.3rem; }
article.post .meta { color: var(--ink-soft); margin-bottom: 1.8rem; }
article.post .meta::before { content: "// "; }
article.post p { margin: 1em 0; }
article.post h2, article.post h3 { margin-top: 1.8em; }
article.post a { color: var(--accent); }
article.post blockquote { margin: 1.2em 0; padding-left: 1rem; border-left: 2px solid var(--rule); color: var(--ink-soft); }
article.post pre { background: #111; color: #eee; padding: 0.9rem 1rem; overflow-x: auto; font-size: 0.85em; }
article.post code { font-size: 0.92em; }
article.post :not(pre) > code { background: #eee; padding: 0.05em 0.3em; }
article.post img { max-width: 100%; }
article.post hr { border: none; border-top: 1px dashed #ddd; margin: 2rem 0; }
footer.site-footer { margin-top: 3rem; padding-top: 1.2rem; border-top: 2px solid var(--rule); color: var(--ink-soft); font-size: 0.82em; }
footer.site-footer::before { content: "$ "; }
.comments { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px dashed #ddd; }
@media (max-width: 500px) {
  .post-list li { flex-direction: column; gap: 0.1rem; }
}
`;

function layout({ siteName, description, body, pages = [], math = false, comments = false }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${headTags({ siteName, description, math, comments })}
</head>
<body>
<div class="wrap">
  <header class="site-header">
    <div class="site-title"><a href="/">${escapeHtml(siteName)}</a></div>
    <nav class="site-nav"><a href="/">posts</a>${pageLinks(pages)}<a href="/feed.xml">rss</a></nav>
  </header>
  ${body}
  <footer class="site-footer">no backend, no build step</footer>
</div>
</body>
</html>`;
}

export function renderIndex({ siteName, description, posts, pages = [] }) {
  const items = posts
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map(
      (p) => `<li>
        <time datetime="${p.date}">${p.date}</time>
        <h2><a href="/posts/${p.slug}.html">${escapeHtml(p.title)}</a></h2>
      </li>`
    )
    .join("\n");
  const body = posts.length ? `<ul class="post-list">${items}</ul>` : `<p style="color:var(--ink-soft)">no posts yet.</p>`;
  return layout({ siteName, description, body, pages });
}

export function renderPost({ siteName, title, date, contentHtml, giscus, pages = [], math = false }) {
  const body = `<article class="post">
    <h1 class="title">${escapeHtml(title)}</h1>
    <div class="meta">${date}</div>
    ${contentHtml}
  </article>
  ${renderGiscus(giscus)}`;
  return layout({ siteName, body, pages, math, comments: !!giscus?.repo });
}

export function renderPage({ siteName, title, contentHtml, pages = [], math = false }) {
  const body = `<article class="post">
    <h1 class="title">${escapeHtml(title)}</h1>
    ${contentHtml}
  </article>`;
  return layout({ siteName, body, pages, math });
}
