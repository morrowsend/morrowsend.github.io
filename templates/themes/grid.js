import { escapeHtml, formatDate, headTags, renderGiscus, pageLinks } from "../shared.js";

export const id = "grid";
export const name = "Grid";
export const description = "A banner header over a card grid of posts, portfolio-style. Good for visual variety or a mix of post types rather than a single reading list.";

export const preview = `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
<rect width="120" height="80" fill="#14151A"/>
<rect x="20" y="14" width="80" height="5" fill="#fff"/>
<rect x="20" y="24" width="50" height="2" fill="#8A8FA3"/>
<rect x="18" y="38" width="24" height="18" fill="#222430" stroke="#3C3F52"/>
<rect x="48" y="38" width="24" height="18" fill="#222430" stroke="#3C3F52"/>
<rect x="78" y="38" width="24" height="18" fill="#222430" stroke="#3C3F52"/>
<rect x="22" y="42" width="6" height="6" fill="#6C8CFF"/>
<rect x="52" y="42" width="6" height="6" fill="#FF9F6C"/>
<rect x="82" y="42" width="6" height="6" fill="#63D6A8"/>
</svg>`;

export const css = `
:root {
  --bg: #14151A; --panel: #1D1F27; --ink: #F1F2F6; --ink-soft: #9195A6; --rule: #2C2E3A;
  --accent: #6C8CFF;
  --sans: -apple-system, "Segoe UI", Inter, system-ui, sans-serif;
  --serif: Georgia, serif;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--sans); line-height: 1.6; }
.wrap { max-width: 920px; margin: 0 auto; padding: 0 1.5rem 5rem; }
header.banner { padding: 4rem 0 3rem; }
.eyebrow { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent); margin-bottom: 0.8rem; }
header.banner h1 { font-size: 2.4rem; margin: 0 0 0.6rem; letter-spacing: -0.01em; }
header.banner p.tag { color: var(--ink-soft); max-width: 46ch; margin: 0; }
nav.site-nav { margin-top: 1.6rem; }
nav.site-nav a { color: var(--ink-soft); text-decoration: none; font-size: 0.85rem; margin-right: 1.2rem; }
nav.site-nav a:hover { color: var(--ink); }
nav.site-nav.top { padding-top: 1.6rem; }

.post-grid { list-style: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.1rem; padding: 0; margin: 0; }
.post-grid li {
  background: var(--panel); border: 1px solid var(--rule); border-radius: 10px;
  padding: 1.3rem; display: flex; flex-direction: column;
}
.post-grid .swatch { width: 2rem; height: 2rem; border-radius: 6px; background: var(--accent); margin-bottom: 1rem; }
.post-grid time { font-size: 0.76rem; color: var(--ink-soft); margin-bottom: 0.4rem; display: block; }
.post-grid h2 { font-size: 1.1rem; margin: 0 0 0.5rem; }
.post-grid h2 a { color: var(--ink); text-decoration: none; }
.post-grid h2 a:hover { color: var(--accent); }
.post-grid p { color: var(--ink-soft); font-size: 0.88rem; margin: 0; flex: 1; }

.post-single { max-width: 680px; margin: 0 auto; }
.back-link { display: inline-block; color: var(--ink-soft); text-decoration: none; font-size: 0.85rem; margin: 2.5rem 0 1.5rem; }
.back-link:hover { color: var(--accent); }
article.post h1.title { font-size: 2rem; margin: 0 0 0.4rem; }
article.post .meta { font-size: 0.8rem; color: var(--ink-soft); margin-bottom: 2rem; }
article.post p { margin: 1.1em 0; color: #dcdde5; }
article.post h2, article.post h3 { margin-top: 1.8em; }
article.post a { color: var(--accent); }
article.post pre { background: #0F1015; padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.85rem; border: 1px solid var(--rule); }
article.post code { font-family: "SFMono-Regular", Consolas, Menlo, monospace; font-size: 0.88em; }
article.post :not(pre) > code { background: var(--panel); padding: 0.1em 0.35em; border-radius: 3px; }
article.post img { max-width: 100%; border-radius: 8px; }
.comments { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--rule); }
footer.site-footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--rule); font-size: 0.78rem; color: var(--ink-soft); }
`;

function head({ siteName, description, math = false, comments = false }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${headTags({ siteName, description, math, comments })}
</head>
<body>
<div class="wrap">`;
}
const foot = `<footer class="site-footer">Published with a static site, no backend required.</footer>
</div>
</body>
</html>`;

export function renderIndex({ siteName, description, posts, pages = [] }) {
  const cards = posts
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map(
      (p) => `<li>
        <div class="swatch"></div>
        <time datetime="${p.date}">${formatDate(p.date)}</time>
        <h2><a href="/posts/${p.slug}.html">${escapeHtml(p.title)}</a></h2>
        ${p.excerpt ? `<p>${escapeHtml(p.excerpt)}</p>` : ""}
      </li>`
    )
    .join("\n");
  const body = posts.length
    ? `<ul class="post-grid">${cards}</ul>`
    : `<p style="color:var(--ink-soft)">No posts yet.</p>`;
  return `${head({ siteName, description })}
  <header class="banner">
    <div class="eyebrow">Blog</div>
    <h1>${escapeHtml(siteName)}</h1>
    ${description ? `<p class="tag">${escapeHtml(description)}</p>` : ""}
    <nav class="site-nav">${pageLinks(pages)}<a href="/feed.xml">RSS</a></nav>
  </header>
  ${body}
  ${foot}`;
}

export function renderPost({ siteName, title, date, contentHtml, giscus, pages = [], math = false }) {
  const body = `<nav class="site-nav top"><a href="/">Home</a>${pageLinks(pages)}</nav>
  <a class="back-link" href="/">&larr; All posts</a>
  <article class="post post-single">
    <h1 class="title">${escapeHtml(title)}</h1>
    <div class="meta"><time datetime="${date}">${formatDate(date)}</time></div>
    ${contentHtml}
  </article>
  ${renderGiscus(giscus)}`;
  return `${head({ siteName, math, comments: !!giscus?.repo })}${body}${foot}`;
}

export function renderPage({ siteName, title, contentHtml, pages = [], math = false }) {
  const body = `<nav class="site-nav top"><a href="/">Home</a>${pageLinks(pages)}</nav>
  <article class="post post-single">
    <h1 class="title">${escapeHtml(title)}</h1>
    ${contentHtml}
  </article>`;
  return `${head({ siteName, math })}${body}${foot}`;
}
