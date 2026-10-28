import { escapeHtml, formatDate, headTags, renderGiscus, pageLinks } from "../shared.js";

export const id = "sidebar";
export const name = "Sidebar";
export const description = "A persistent left sidebar with your name and post list, content on the right. Good if you want the full archive always visible.";

export const preview = `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
<rect width="120" height="80" fill="#F5F6F3"/>
<rect x="0" y="0" width="34" height="80" fill="#1F2A24"/>
<rect x="8" y="12" width="18" height="5" fill="#F5F6F3"/>
<rect x="8" y="26" width="18" height="2" fill="#7C8880"/>
<rect x="8" y="32" width="14" height="2" fill="#7C8880"/>
<rect x="8" y="38" width="16" height="2" fill="#7C8880"/>
<rect x="46" y="14" width="64" height="5" fill="#1F2A24"/>
<rect x="46" y="26" width="64" height="3" fill="#c7cbc4"/>
<rect x="46" y="32" width="64" height="3" fill="#c7cbc4"/>
<rect x="46" y="38" width="40" height="3" fill="#c7cbc4"/>
</svg>`;

export const css = `
:root {
  --paper: #F5F6F3; --panel: #1F2A24; --panel-ink: #EDEFEA; --ink: #1F2320; --ink-soft: #666f68;
  --accent: #3F6B52; --rule: #dcded8;
  --serif: Georgia, "Iowan Old Style", serif;
  --sans: -apple-system, "Segoe UI", Inter, system-ui, sans-serif;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--sans); line-height: 1.6; }
.shell { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
aside.sidebar { background: var(--panel); color: var(--panel-ink); padding: 2.4rem 1.6rem; }
aside.sidebar .site-title { font-size: 1.15rem; font-weight: 700; margin-bottom: 0.3rem; }
aside.sidebar .site-title a { color: var(--panel-ink); text-decoration: none; }
aside.sidebar .site-desc { font-size: 0.85rem; opacity: 0.7; margin-bottom: 2rem; }
aside.sidebar nav a { display: block; color: #C9CFC8; text-decoration: none; font-size: 0.9rem; padding: 0.35rem 0; }
aside.sidebar nav a:hover { color: #fff; }
main.content { padding: 3rem 2.5rem 5rem; max-width: 720px; }
.post-list { list-style: none; margin: 0; padding: 0; }
.post-list li { padding: 1.2rem 0; border-bottom: 1px solid var(--rule); }
.post-list li:first-child { padding-top: 0; }
.post-list time { font-size: 0.78rem; color: var(--ink-soft); display: block; margin-bottom: 0.25rem; }
.post-list h2 { margin: 0 0 0.25rem; font-size: 1.3rem; font-family: var(--serif); }
.post-list h2 a { color: var(--ink); text-decoration: none; }
.post-list h2 a:hover { color: var(--accent); }
.post-list p { margin: 0; color: var(--ink-soft); font-size: 0.95rem; }
article.post h1.title { font-family: var(--serif); font-size: 2rem; margin: 0 0 0.4rem; }
article.post .meta { font-size: 0.82rem; color: var(--ink-soft); margin-bottom: 2rem; }
article.post p { font-family: var(--serif); margin: 1.1em 0; font-size: 1.05rem; }
article.post h2, article.post h3 { margin-top: 1.8em; }
article.post a { color: var(--accent); }
article.post pre { background: #20261f; color: #eee; padding: 1rem; border-radius: 4px; overflow-x: auto; font-size: 0.85rem; }
article.post code { font-family: "SFMono-Regular", Consolas, Menlo, monospace; font-size: 0.88em; }
article.post :not(pre) > code { background: #e6e8e2; padding: 0.1em 0.35em; border-radius: 3px; }
article.post img { max-width: 100%; border-radius: 4px; }
.comments { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--rule); }
@media (max-width: 700px) {
  .shell { grid-template-columns: 1fr; }
  aside.sidebar { display: flex; align-items: center; justify-content: space-between; padding: 1.2rem 1.5rem; }
  aside.sidebar .site-desc { display: none; }
  aside.sidebar nav { display: flex; gap: 1rem; }
  main.content { padding: 2rem 1.4rem 4rem; }
}
`;

function layout({ siteName, description, body, pages = [], math = false, comments = false }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${headTags({ siteName, description, math, comments })}
</head>
<body>
<div class="shell">
  <aside class="sidebar">
    <div class="site-title"><a href="/">${escapeHtml(siteName)}</a></div>
    ${description ? `<div class="site-desc">${escapeHtml(description)}</div>` : ""}
    <nav><a href="/">Posts</a>${pageLinks(pages)}<a href="/feed.xml">RSS</a></nav>
  </aside>
  <main class="content">${body}</main>
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
        <time datetime="${p.date}">${formatDate(p.date)}</time>
        <h2><a href="/posts/${p.slug}.html">${escapeHtml(p.title)}</a></h2>
        ${p.excerpt ? `<p>${escapeHtml(p.excerpt)}</p>` : ""}
      </li>`
    )
    .join("\n");
  const body = posts.length ? `<ul class="post-list">${items}</ul>` : `<p style="color:var(--ink-soft)">No posts yet.</p>`;
  return layout({ siteName, description, body, pages });
}

export function renderPost({ siteName, title, date, contentHtml, giscus, pages = [], math = false }) {
  const body = `<article class="post">
    <h1 class="title">${escapeHtml(title)}</h1>
    <div class="meta"><time datetime="${date}">${formatDate(date)}</time></div>
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
